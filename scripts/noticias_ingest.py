#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ingestão diária de "Notícias 24 Horas" para o dashboard Swipe FEG.

Busca notícias por nicho em feeds RSS de veículos de qualidade (ScienceDaily,
CNN Health, NBC News, TMZ, Page Six), monta linhas kind:"noticia", deduplica
por URL contra o que já existe no Supabase e insere via REST.

Regra de ouro: SÓ INSERT (nunca delete/update). Deduplica por URL normalizada.

Somente biblioteca padrão do Python (roda em qualquer runner do GitHub Actions).
Autenticação: login do bot (baixo privilégio). A chave anon é pública.

Variáveis de ambiente:
  SUPABASE_URL           (default: projeto do Swipe FEG)
  SUPABASE_ANON_KEY      (default: anon pública)
  SUPABASE_BOT_EMAIL     (obrigatória para gravar)
  SUPABASE_BOT_PASSWORD  (obrigatória para gravar)
  DRY_RUN=1              (não grava; só mostra o que faria)
  MAX_PER_NICHE=6        (limite de notícias por nicho por execução)
  MAX_AGE_DAYS=45        (descarta itens mais antigos que isso, se a data existir)
"""
import os, sys, json, re, urllib.request, urllib.error
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
import xml.etree.ElementTree as ET

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://ppaajtzbhjixhyfidojd.supabase.co").rstrip("/")
ANON = os.environ.get(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwYWFqdHpiaGppeGh5Zmlkb2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMDkzNTcsImV4cCI6MjA5Njc4NTM1N30.uoC_3EHM_dfmkBHJYjPvlaC7DqkJziunz-tug0ItAJc",
)
BOT_EMAIL = os.environ.get("SUPABASE_BOT_EMAIL", "")
BOT_PASSWORD = os.environ.get("SUPABASE_BOT_PASSWORD", "")
DRY_RUN = os.environ.get("DRY_RUN", "") in ("1", "true", "yes")
MAX_PER_NICHE = int(os.environ.get("MAX_PER_NICHE", "8"))
MAX_AGE_DAYS = int(os.environ.get("MAX_AGE_DAYS", "14"))
UA = "Mozilla/5.0 (compatible; SwipeFEG-Noticias/1.0; +https://github.com/bassidirectresponse-png/swipe-feg-fase2)"

# --- feeds dedicados por nicho (já on-topic; não precisa filtrar por palavra) ---
SD = "https://www.sciencedaily.com/rss"
NICHE_FEEDS = {
    "Emagrecimento": [
        (f"{SD}/health_medicine/obesity.xml", "ScienceDaily"),
        (f"{SD}/health_medicine/diet_and_weight_loss.xml", "ScienceDaily"),
        (f"{SD}/health_medicine/nutrition.xml", "ScienceDaily"),
    ],
    "Memória": [
        (f"{SD}/mind_brain/dementia.xml", "ScienceDaily"),
        (f"{SD}/mind_brain/memory.xml", "ScienceDaily"),
        (f"{SD}/mind_brain/intelligence.xml", "ScienceDaily"),
    ],
    "Neuropatia": [
        (f"{SD}/health_medicine/neuropathy.xml", "ScienceDaily"),
        (f"{SD}/health_medicine/nervous_system.xml", "ScienceDaily"),
    ],
    "Disfunção Erétil": [
        (f"{SD}/health_medicine/erectile_dysfunction.xml", "ScienceDaily"),
        (f"{SD}/health_medicine/sexual_health.xml", "ScienceDaily"),
    ],
    "Diabetes / Glicose": [
        (f"{SD}/health_medicine/diabetes.xml", "ScienceDaily"),
    ],
}

# --- pools cross-nicho (grandes veículos): roteados por palavra-chave ---
POOL_FEEDS = [
    ("http://rss.cnn.com/rss/cnn_health.rss", "CNN Health"),
    ("https://feeds.nbcnews.com/nbcnews/public/health", "NBC News"),
    ("https://www.tmz.com/rss.xml", "TMZ"),
    ("https://pagesix.com/feed/", "Page Six"),
]
NICHE_KEYWORDS = {
    "Emagrecimento": ["weight loss", "ozempic", "wegovy", "glp-1", "glp1", "semaglutide",
                      "obesity", "obese", "dieting", "weight-loss", "mounjaro", "zepbound", "slimming"],
    "Memória": ["memory", "dementia", "alzheimer", "cognitive decline", "cognition", "brain fog"],
    "Neuropatia": ["neuropathy", "nerve pain", "peripheral neuropathy", "nerve damage", "neuropathic"],
    "Disfunção Erétil": ["erectile", "impotence", "testosterone", "libido", "viagra", "ed drug", "men's sexual"],
    "Diabetes / Glicose": ["diabetes", "diabetic", "blood sugar", "blood glucose", "insulin resistance", "a1c", "prediabetes"],
}

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
                          "date": date, "summary": one_sentence(summary)})
    return items

# =============================== dedup / URL =================================
def norm_url(u):
    u = (u or "").strip().lower()
    u = re.split(r"[?#]", u, 1)[0]
    return u.rstrip("/")

def fetch_existing_urls(token):
    status, txt = sb_request("GET", "/rest/v1/offers?select=data&data->>kind=eq.noticia", token=token)
    if status != 200:
        print(f"[aviso] não consegui ler existentes (HTTP {status}); seguindo sem dedup remoto", file=sys.stderr)
        return set()
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
    return dt >= datetime.now(timezone.utc) - timedelta(days=MAX_AGE_DAYS)

def make_row(nicho, it, fonte, categoria):
    dt = it["date"]
    return {
        "kind": "noticia",
        "nicho": nicho,
        "nome": it["title"][:300],
        "link": it["link"],
        "fonte": fonte,
        "dataPub": dt.strftime("%Y-%m-%d") if dt else "",
        "engajamento": "",
        "resumo": it["summary"],
        "categoria": categoria,
        "topic": "portais-rss",
        "fetchedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    }

def collect():
    """Coleta candidatos por nicho a partir dos feeds dedicados + pools."""
    by_niche = {n: [] for n in NICHE_FEEDS}

    # 1) feeds dedicados
    for nicho, feeds in NICHE_FEEDS.items():
        for url, fonte in feeds:
            try:
                items = parse_feed(http_get(url))
            except Exception as e:
                print(f"[aviso] feed falhou ({fonte} {url}): {e}", file=sys.stderr)
                continue
            for it in items:
                if recent_enough(it["date"]):
                    by_niche[nicho].append(make_row(nicho, it, fonte, "portal"))

    # 2) pools cross-nicho, roteados por palavra-chave
    for url, fonte in POOL_FEEDS:
        try:
            items = parse_feed(http_get(url))
        except Exception as e:
            print(f"[aviso] pool falhou ({fonte} {url}): {e}", file=sys.stderr)
            continue
        celeb = fonte in ("TMZ", "Page Six")
        for it in items:
            if not recent_enough(it["date"]):
                continue
            hay = (it["title"] + " " + it["summary"]).lower()
            for nicho, kws in NICHE_KEYWORDS.items():
                if any(k in hay for k in kws):
                    cat = "celebridade" if celeb else "portal"
                    by_niche.setdefault(nicho, []).append(make_row(nicho, it, fonte, cat))
                    break
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
    total = 0
    for i in range(0, len(rows), 25):
        chunk = rows[i:i + 25]
        payload = [{"data": r} for r in chunk]
        status, txt = sb_request("POST", "/rest/v1/offers", token=token,
                                 body=payload, prefer="return=minimal")
        if status not in (200, 201):
            raise RuntimeError(f"INSERT falhou: HTTP {status} {txt[:200]}")
        total += len(chunk)
    return total

# =============================== main ================================
def main():
    print(f"== Notícias 24h · ingestão RSS · {datetime.now(timezone.utc).isoformat()} ==")
    by_niche = collect()
    total_cand = sum(len(v) for v in by_niche.values())
    print(f"candidatos coletados: {total_cand}")

    token = None
    existing = set()
    if not DRY_RUN:
        if not (BOT_EMAIL and BOT_PASSWORD):
            print("ERRO: defina SUPABASE_BOT_EMAIL e SUPABASE_BOT_PASSWORD (ou use DRY_RUN=1).", file=sys.stderr)
            sys.exit(2)
        token = bot_login()
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
