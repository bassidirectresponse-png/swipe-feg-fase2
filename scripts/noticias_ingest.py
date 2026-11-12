#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ingestão diária de "Notícias" para o dashboard Swipe FEG.

Busca notícias dos mesmos nichos de Ofertas/Radar TikTok em feeds RSS de
saúde (ScienceDaily, CNN Health, NBC News), monta linhas kind:"noticia", deduplica
por URL contra o que já existe no Supabase e insere via REST.

Regra de ouro: SÓ INSERT (nunca delete/update). Deduplica por URL normalizada.

Somente biblioteca padrão do Python (roda em qualquer runner do GitHub Actions).
Autenticação: login do bot (baixo privilégio). A chave anon é pública.

Variáveis de ambiente:
  SUPABASE_URL           (default: projeto do Swipe FEG)
  SUPABASE_ANON_KEY      (default: anon pública)
  SUPABASE_BOT_ACCESS_TOKEN (sessão temporária emitida pelo workflow OIDC)
  NEWS_INGEST_OIDC_TOKEN (autoriza somente a inserção de notícias no endpoint)
  SUPABASE_BOT_EMAIL/PASSWORD (alternativa manual)
  DRY_RUN=1              (não grava; só mostra o que faria)
  MAX_PER_NICHE=6        (limite de notícias por nicho por execução)
  MAX_AGE_DAYS=45        (descarta itens mais antigos que isso, se a data existir)
"""
import os, sys, json, re, urllib.request, urllib.error
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://pkvzwtstidtobpdngxnd.supabase.co").rstrip("/")
ANON = os.environ.get(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrdnp3dHN0aWR0b2JwZG5neG5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4MTM1MTUsImV4cCI6MjEwMTM4OTUxNX0.UvV333OkHrp5Yvxn3vyxnkF_KXMBTu-82qFx-Jocc-0",
)
BOT_EMAIL = os.environ.get("SUPABASE_BOT_EMAIL", "")
BOT_PASSWORD = os.environ.get("SUPABASE_BOT_PASSWORD", "")
BOT_ACCESS_TOKEN = os.environ.get("SUPABASE_BOT_ACCESS_TOKEN", "").strip()
NEWS_INGEST_OIDC_TOKEN = os.environ.get("NEWS_INGEST_OIDC_TOKEN", "").strip()
NEWS_INGEST_URL = os.environ.get("NEWS_INGEST_URL", "https://swipe.fegsys.com/.netlify/functions/github-news-ingest")
DRY_RUN = os.environ.get("DRY_RUN", "") in ("1", "true", "yes")
MAX_PER_NICHE = int(os.environ.get("MAX_PER_NICHE", "8"))
MAX_AGE_DAYS = int(os.environ.get("MAX_AGE_DAYS", "14"))
UA = "Mozilla/5.0 (compatible; SwipeFEG-Noticias/1.0; +https://github.com/bassidirectresponse-png/swipe-feg-fase2)"

# Shared closed taxonomy: collect only niche-specific feeds, never general news pools.
sys.path.insert(0, os.path.dirname(__file__))
from niche_taxonomy import GROUPS, TOPICS as TOPIC_TERMS, classify, VERSION
NICHE_FEEDS = {g['name']: [(f['url'], f['source']) for f in g['feeds']] for g in GROUPS}
POOL_FEEDS = []

def classify_topic(niche, item):
    result = classify(item['title'] + '. ' + item['summary'])
    return result['subnicho'] if result and result['nicho'] == niche else None

# =============================== helpers HTTP ================================
def http_get(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def sb_request(method, path, token=None, body=None, prefer=None):
    url = f"{SUPABASE_URL}{path}"
    headers = {"apikey": ANON, "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if prefer:
        headers["Prefer"] = prefer
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")

def bot_login():
    status, txt = sb_request(
        "POST", "/auth/v1/token?grant_type=password",
        body={"email": BOT_EMAIL, "password": BOT_PASSWORD},
    )
    if status != 200:
        raise RuntimeError(f"login do bot falhou: HTTP {status} {txt[:200]}")
    return json.loads(txt)["access_token"]

# =============================== parsing RSS ================================
def _tag(el):
    return el.tag.split("}")[-1].lower()

def strip_html(s):
    s = re.sub(r"<[^>]+>", " ", s or "")
    s = re.sub(r"&[a-z#0-9]+;", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def one_sentence(s, limit=220):
    s = strip_html(s)
    if not s:
        return ""
    m = re.split(r"(?<=[.!?])\s", s)
    out = m[0] if m else s
    if len(out) > limit:
        out = out[:limit].rsplit(" ", 1)[0] + "…"
    return out

def parse_date(s):
    if not s:
        return None
    s = s.strip()
    try:
        dt = parsedate_to_datetime(s)  # RFC822 (RSS pubDate)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        pass
    for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(s, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            continue
    return None

def parse_feed(raw):
    """Retorna lista de dicts {title, link, date(datetime|None), summary}."""
    items = []
    try:
        root = ET.fromstring(raw)
    except ET.ParseError:
        return items
    entries = [e for e in root.iter() if _tag(e) in ("item", "entry")]
    for e in entries:
        title = link = summary = ""
        date = None
        for c in e:
            t = _tag(c)
            if t == "title" and not title:
                title = (c.text or "").strip()
            elif t == "link":
                href = c.get("href")
                if href:
                    link = href
                elif c.text and c.text.strip():
                    link = c.text.strip()
            elif t in ("description", "summary", "content") and not summary:
                summary = c.text or ""
            elif t in ("pubdate", "published", "updated", "date") and date is None:
                date = parse_date(c.text)
        if title and link:
            items.append({"title": strip_html(title), "link": link.strip(),
                          "date": date, "summary": strip_html(summary)[:3000]})
    return items

# =============================== dedup / URL =================================
def norm_url(u):
    u = (u or "").strip().lower()
    u = re.split(r"[?#]", u, 1)[0]
    return u.rstrip("/")

def fetch_existing_urls(token):
    status, txt = sb_request("GET", "/rest/v1/offers?select=data&data->>kind=eq.noticia", token=token)
    if status != 200:
        raise RuntimeError(f"Não foi possível verificar duplicados: HTTP {status}")
    urls = set()
    for row in json.loads(txt):
        link = (row.get("data") or {}).get("link")
        if link:
            urls.add(norm_url(link))
    return urls

# =============================== construção ================================
def recent_enough(dt):
    if dt is None:
        return True  # sem data: aceita (feeds são reverse-chron)
    return datetime.now(timezone.utc) - timedelta(days=MAX_AGE_DAYS) <= dt <= datetime.now(timezone.utc) + timedelta(hours=24)

def make_row(nicho, subnicho, it, fonte, categoria):
    dt = it["date"]
    return {
        "kind": "noticia",
        "taxonomyVersion": VERSION,
        "taxonomyStatus": "classified",
        "nicho": nicho,
        "subnicho": subnicho,
        "nome": it["title"][:300],
        "link": it["link"],
        "fonte": fonte,
        "dataPub": dt.strftime("%Y-%m-%d") if dt else "",
        "publishedAt": dt.isoformat() if dt else "",
        "engajamento": "",
        "resumo": it["summary"],
        "categoria": categoria,
        "topic": "portais-rss",
        "fetchedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    }

def collect():
    """Coleta candidatos por nicho a partir dos feeds dedicados + pools."""
    by_niche = {n: [] for n in NICHE_FEEDS}

    urls = list(dict.fromkeys(url for feeds in NICHE_FEEDS.values() for url, _ in feeds))
    def fetch_feed(url):
        try: return parse_feed(http_get(url))
        except Exception as error:
            print(f"[aviso] feed indisponível {url}: {error}", file=sys.stderr)
            return None
    with ThreadPoolExecutor(max_workers=6) as pool:
        fetched = dict(zip(urls, pool.map(fetch_feed, urls)))
    if urls and all(items is None for items in fetched.values()):
        raise RuntimeError("Nenhuma fonte de notícias respondeu; acervo existente preservado")

    # 1) feeds dedicados: ainda exigimos evidência textual do nicho/tema.
    for nicho, feeds in NICHE_FEEDS.items():
        for url, fonte in feeds:
            try:
                items = fetched[url] or []
            except Exception as e:
                print(f"[aviso] feed falhou ({fonte} {url}): {e}", file=sys.stderr)
                continue
            for it in items:
                topic = classify_topic(nicho, it)
                if topic and recent_enough(it["date"]):
                    by_niche[nicho].append(make_row(nicho, topic, it, fonte, "portal"))

    return by_niche

def dedup_and_limit(by_niche, existing):
    seen = set(existing)
    final = []
    per_niche_counts = {}
    for nicho, rows in by_niche.items():
        kept = 0
        for r in rows:
            if kept >= MAX_PER_NICHE:
                break
            key = norm_url(r["link"])
            if not key or key in seen:
                continue
            seen.add(key)
            final.append(r)
            kept += 1
        per_niche_counts[nicho] = kept
    return final, per_niche_counts

def insert_rows(token, rows):
    if not NEWS_INGEST_OIDC_TOKEN:
        raise RuntimeError("NEWS_INGEST_OIDC_TOKEN é obrigatório para inserir notícias")
    total = 0
    for i in range(0, len(rows), 25):
        chunk = rows[i:i + 25]
        payload = [{"data": r} for r in chunk]
        req = urllib.request.Request(NEWS_INGEST_URL,
            data=json.dumps({"rows": payload}).encode(), method="POST",
            headers={"Authorization": f"Bearer {NEWS_INGEST_OIDC_TOKEN}", "Content-Type": "application/json", "User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                status = response.status
        except urllib.error.HTTPError as error:
            raise RuntimeError(f"INSERT falhou: HTTP {error.code} {error.read().decode('utf-8', 'replace')[:200]}") from error
        if status != 201:
            raise RuntimeError(f"INSERT falhou: HTTP {status}")
        total += len(chunk)
    return total

# =============================== main ================================
def main():
    print(f"== Notícias · ingestão RSS · {datetime.now(timezone.utc).isoformat()} ==")
    by_niche = collect()
    total_cand = sum(len(v) for v in by_niche.values())
    print(f"candidatos coletados: {total_cand}")

    token = None
    existing = set()
    if not DRY_RUN:
        if not (BOT_ACCESS_TOKEN or (BOT_EMAIL and BOT_PASSWORD)):
            print("ERRO: defina SUPABASE_BOT_ACCESS_TOKEN ou credenciais do bot (ou use DRY_RUN=1).", file=sys.stderr)
            sys.exit(2)
        token = BOT_ACCESS_TOKEN or bot_login()
        existing = fetch_existing_urls(token)
        print(f"notícias já no banco: {len(existing)}")

    final, counts = dedup_and_limit(by_niche, existing)
    print("novas por nicho:", json.dumps(counts, ensure_ascii=False))
    print(f"total a inserir: {len(final)}")

    # amostra legível
    for r in final[:12]:
        print(f"  · [{r['nicho']}] {r['fonte']}: {r['nome'][:80]}")

    if DRY_RUN:
        print("DRY_RUN — nada foi gravado.")
        return
    if not final:
        print("Nada novo para inserir (tudo já existia).")
        return
    n = insert_rows(token, final)
    print(f"OK — {n} notícias inseridas (HTTP 201).")

if __name__ == "__main__":
    main()
