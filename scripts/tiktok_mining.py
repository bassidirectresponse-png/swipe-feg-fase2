#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mineração diária de vídeos do TikTok por nicho — Swipe FEG.

Para cada nicho (mapa NICHES) busca vídeos por palavras-chave/hashtags, extrai
métricas (views, likes, comentários, shares, saves, duração, data, autor, som,
hashtags), calcula engajamento e faixa (VIRAL/HIGH/MID/LOW) e grava no Supabase
como kind:"tiktok". Vídeos já existentes têm as métricas ATUALIZADAS e ganham um
ponto no histórico de views (pra acompanhar o crescimento ao longo dos dias).

Fonte de dados = adaptador plugável (env PROVIDER):
  - "tikwm"       -> grátis, sem key (default; ótimo p/ começar)
  - "ensembledata"-> produção (precisa ENSEMBLE_TOKEN)   [pronto p/ ligar]
  - "apify"       -> produção (precisa APIFY_TOKEN)        [pronto p/ ligar]

Grava com o bot de baixo privilégio (mesmos secrets das outras automações).

Env:
  SUPABASE_URL, SUPABASE_ANON_KEY (default embutido)
  SUPABASE_BOT_EMAIL, SUPABASE_BOT_PASSWORD (obrigatórias, exceto --dry)
  PROVIDER=tikwm
  ENSEMBLE_TOKEN / APIFY_TOKEN (conforme o provedor)
  MAX_PER_NICHE=50   MAX_AGE_DAYS=45   PER_KEYWORD=20  (teto de 50 por nicho)

Uso:
  python scripts/tiktok_mining.py --dry     # só busca e imprime, não grava
  python scripts/tiktok_mining.py           # busca e grava no Supabase
"""
import os, sys, json, time, io, urllib.request, urllib.parse, urllib.error
from concurrent.futures import ThreadPoolExecutor

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://pkvzwtstidtobpdngxnd.supabase.co").rstrip("/")
ANON = os.environ.get("SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrdnp3dHN0aWR0b2JwZG5neG5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4MTM1MTUsImV4cCI6MjEwMTM4OTUxNX0.UvV333OkHrp5Yvxn3vyxnkF_KXMBTu-82qFx-Jocc-0")
BOT_EMAIL = os.environ.get("SUPABASE_BOT_EMAIL", "")
BOT_PASSWORD = os.environ.get("SUPABASE_BOT_PASSWORD", "")
BOT_ACCESS_TOKEN = os.environ.get("SUPABASE_BOT_ACCESS_TOKEN", "")
PROVIDER = os.environ.get("PROVIDER", "tikwm").lower()
# Volume/custo é configurável pelo workflow. O padrão busca margem suficiente
# para filtrar e deduplicar antes de guardar até 50 vídeos por nicho.
MAX_PER_NICHE = int(os.environ.get("MAX_PER_NICHE", "50"))
MAX_AGE_DAYS = int(os.environ.get("MAX_AGE_DAYS", "45"))
PER_KEYWORD = int(os.environ.get("PER_KEYWORD", "20"))
HISTORY_CAP = 60
RADAR_GENERATION = os.environ.get("RADAR_GENERATION", "offers-topics-2026-10-05")
BUCKET = "criativos"        # reusa o bucket existente (bot já tem permissão), prefixo tiktok/
NOW = int(time.time())

# Taxonomia por nicho:
#   queries -> o que buscar no TikTok (inclui os fármacos/ângulos de DR)
#   must    -> termos que PRECISAM aparecer na legenda/hashtags p/ o vídeo
#              contar como do nicho (filtro de relevância; corta o viral que
#              só "encostou" no termo). Use termos distintivos (substring).
NICHES = {
    "Emagrecimento": {
        "queries": ["weight loss", "ozempic", "mounjaro", "wegovy", "glp-1 weight loss",
                    "semaglutide", "tirzepatide", "weight loss journey", "belly fat"],
        "must": ["weight loss", "weightloss", "lose weight", "losing weight", "lost weight",
                 "fat loss", "fatloss", "belly fat", "body fat", "ozempic", "mounjaro",
                 "wegovy", "zepbound", "glp-1", "glp1", "semaglutide", "tirzepatide",
                 "slim down", "obesity", "overweight", "calorie deficit", "metabolism",
                 "weightlossjourney", "skinny"],
    },
    "Diabetes / Glicose": {
        "queries": ["blood sugar", "type 2 diabetes", "a1c", "insulin resistance",
                    "glucose control", "prediabetes", "diabetic"],
        "must": ["blood sugar", "bloodsugar", "type 2 diabetes", "type 1 diabetes",
                 "diabetic", "diabetes", "a1c", "insulin", "glucose", "prediabetes",
                 "prediabetic", "hyperglycemia", "metformin", "glycemic", "sugar spike"],
    },
    "Disfunção Erétil": {
        "queries": ["erectile dysfunction", "low testosterone", "male enhancement",
                    "testosterone boost", "libido", "mens health"],
        "must": ["erectile", "erection", "testosterone", "low t", "libido", "impotence",
                 "male enhancement", "mens health", "men's health", "virility", "stamina in bed",
                 "sexual health", "sperm", "semen", "blood flow"],
    },
    "Memória": {
        "queries": ["memory loss", "brain fog", "dementia", "alzheimer",
                    "cognitive decline", "memory improvement", "forgetfulness"],
        "must": ["memory", "memory loss", "memoryloss", "forget", "forgetful", "forgetting",
                 "dementia", "alzheimer", "cognitive", "cognition", "brain fog", "brainfog",
                 "recall", "nootropic", "mental clarity", "brain health"],
    },
    "Neuropatia": {
        "queries": ["neuropathy", "nerve pain", "peripheral neuropathy",
                    "diabetic neuropathy", "tingling feet", "nerve damage"],
        "must": ["neuropathy", "neuropathic", "nerve pain", "nerve damage",
                 "peripheral neuropathy", "tingling", "numbness", "burning feet",
                 "pins and needles", "sciatica"],
    },
    "Próstata": {
        "queries": ["enlarged prostate", "prostate health", "bph", "prostate problems",
                    "frequent urination", "prostatitis"],
        "must": ["prostate", "prostatitis", "bph", "enlarged prostate", "frequent urination",
                 "urinary", "bladder", "nocturia", "pee at night"],
    },
    "Visão": {
        "queries": ["vision loss", "eye health", "macular degeneration",
                    "blurry vision", "eyesight", "glaucoma"],
        "must": ["vision", "eyesight", "eye health", "macular", "glaucoma", "cataract",
                 "blurry vision", "blurred vision", "retina", "optic nerve", "eye floaters"],
    },
    "Audição": {
        "queries": ["tinnitus", "ringing in ears", "hearing loss", "ear ringing"],
        "must": ["tinnitus", "ringing in ears", "ringing ears", "ears ringing", "hearing loss",
                 "hearing", "ear ringing", "hearing aid", "hard of hearing"],
    },
}

# As divisões são as mesmas de Ofertas Brands, incluindo Pet. Uma execução por divisão
# consulta seus assuntos específicos; cada vídeo recebe também um subnicho.
BRAND_NICHES = {
    "Saúde masculina": {"queries": ["testosterone health", "male libido", "prostate health", "mens health"], "must": ["testosterone", "libido", "prostate", "men's health", "mens health", "male health"], "topics": {"Testosterona": ["testosterone", "low t"], "Libido": ["libido", "sex drive"], "Próstata": ["prostate", "bph"]}},
    "Saúde feminina": {"queries": ["menopause health", "female hormones", "womens health"], "must": ["menopause", "perimenopause", "female hormones", "hormonal health", "women's health", "womens health"], "topics": {"Menopausa": ["menopause", "perimenopause"], "Hormônios": ["hormone", "hormonal"]}},
    "Saúde Cardiovascular": {"queries": ["heart health", "blood pressure health", "cholesterol health"], "must": ["heart health", "cardiovascular", "blood pressure", "cholesterol"], "topics": {"Coração": ["heart", "cardiovascular"], "Pressão arterial": ["blood pressure", "hypertension"], "Colesterol": ["cholesterol"]}},
    "Saúde íntima / libido": {"queries": ["sexual wellness", "libido health", "intimate health"], "must": ["sexual wellness", "sexual health", "libido", "intimate health"], "topics": {"Libido": ["libido", "sex drive"], "Saúde sexual": ["sexual health", "sexual wellness"], "Saúde íntima": ["intimate health", "intimate wellness"]}},
    "Sono/ Beleza": {"queries": ["sleep health", "skin health", "beauty wellness"], "must": ["sleep", "insomnia", "skin health", "beauty wellness", "skin care"], "topics": {"Sono": ["sleep", "insomnia"], "Pele": ["skin", "skincare"], "Beleza": ["beauty"]}},
    "Saúde Geral/Nutrição": {"queries": ["nutrition tips", "gut health", "supplements", "collagen benefits"], "must": ["nutrition", "nutritional", "supplement", "gut health", "vitamin", "immune", "joint", "collagen"], "topics": {"Nutrição": ["nutrition", "vitamin", "supplement"], "Intestino": ["gut", "digestive"], "Imunidade": ["immune", "immunity"], "Articulações": ["joint", "collagen"]}},
    "Pet": {"queries": ["dog joint health", "dog skin health", "pet nutrition", "dog collagen"], "must": ["dog", "dogs", "pet", "pets", "cat", "cats"], "topics": {"Articulações": ["joint", "mobility", "arthritis"], "Pele e pelagem": ["skin", "coat", "itch"], "Nutrição": ["nutrition", "food", "diet"], "Colágeno": ["collagen"]}},
}


def topic_of(rec, cfg):
    hay = ((rec.get("caption") or "") + " " + " ".join(rec.get("hashtags") or [])).lower()
    for topic, terms in cfg.get("topics", {}).items():
        if any(term in hay for term in terms):
            return topic
    return "Geral"


def brand_signal(author):
    """Sinal conservador de perfil comercial; não equivale a marca verificada."""
    bio = str(author.get("signature") or author.get("bio") or "").lower()
    return bool(author.get("isBusinessAccount") or any(term in bio for term in
        ("official store", "shop our", "our products", "supplement brand", "shop now")))


# =============================== HTTP ======================================
def http_json(url, headers=None, timeout=40):
    req = urllib.request.Request(url, headers=headers or {"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def http_bytes(url, timeout=40):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


# =============================== Providers =================================
def fetch_tikwm(keyword, count):
    """Grátis, sem key. Retorna lista de dicts crus do tikwm."""
    url = "https://www.tikwm.com/api/feed/search?" + urllib.parse.urlencode(
        {"keywords": keyword, "count": count, "cursor": 0})
    try:
        d = http_json(url)
    except Exception as e:
        print(f"      ! tikwm falhou p/ '{keyword}': {str(e)[:80]}", file=sys.stderr)
        return []
    if d.get("code") != 0:
        print(f"      ! tikwm code={d.get('code')} msg={d.get('msg')} ('{keyword}')", file=sys.stderr)
        return []
    return (d.get("data") or {}).get("videos") or []


def norm_tikwm(v, nicho):
    au = v.get("author") or {}
    mu = v.get("music_info") or {}
    vid = str(v.get("video_id") or "")
    caption = (v.get("title") or "").strip()
    hashtags = [w[1:] for w in caption.split() if w.startswith("#")][:12]
    views = int(v.get("play_count") or 0)
    likes = int(v.get("digg_count") or 0)
    coments = int(v.get("comment_count") or 0)
    shares = int(v.get("share_count") or 0)
    saves = int(v.get("collect_count") or 0)
    eng = round((likes + coments + shares) / views, 4) if views else 0.0
    return {
        "kind": "tiktok", "nicho": nicho, "videoId": vid,
        "nome": caption[:90] or f"@{au.get('unique_id','')}",
        "caption": caption,
        "autor": au.get("unique_id") or "", "autorNome": au.get("nickname") or "",
        "perfilMarca": brand_signal(au),
        "url": f"https://www.tiktok.com/@{au.get('unique_id','')}/video/{vid}",
        "thumb": v.get("cover") or v.get("origin_cover") or "",   # rehospedado depois
        "thumbOrig": v.get("cover") or v.get("origin_cover") or "",
        "views": views, "likes": likes, "comentarios": coments,
        "shares": shares, "saves": saves, "engajamento": eng,
        "duracao": int(v.get("duration") or 0),
        "dataPub": int(v.get("create_time") or 0),
        "regiao": v.get("region") or "",
        "som": (mu.get("title") or ""), "somAutor": (mu.get("author") or ""),
        "hashtags": hashtags,
        "faixa": faixa(views),
        "isAd": bool(v.get("is_ad")),
        "fetchedAt": NOW,
    }


# ----------------------------- Apify (pago) --------------------------------
APIFY_TOKEN = os.environ.get("APIFY_TOKEN", "")
APIFY_ACTOR = os.environ.get("APIFY_ACTOR", "clockworks~tiktok-scraper")
APIFY_SORT = os.environ.get("APIFY_SORT", "MOST_RELEVANT")   # MOST_RELEVANT|MOST_LIKED|LATEST
APIFY_DATE = os.environ.get("APIFY_DATE", "ALL_TIME")        # ALL_TIME|PAST_24_HOURS|PAST_WEEK|PAST_MONTH...
APIFY_RUN_MAX_SECONDS = int(os.environ.get("APIFY_RUN_MAX_SECONDS", "900"))
REHOST_THUMBS = os.environ.get("REHOST_THUMBS", "0").lower() in ("1", "true", "yes")


def apify_json(method, url, payload=None, retries=3):
    """Repete apenas leituras e respostas 429; não duplica runs após POST incerto."""
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Authorization": f"Bearer {APIFY_TOKEN}"}
    if data is not None:
        headers["Content-Type"] = "application/json"
    for attempt in range(retries):
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=80 if method == "GET" else 35) as response:
                return json.loads(response.read().decode("utf-8", "replace"))
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", "replace")[:160]
            retryable = error.code == 429 or method == "GET" and error.code in (500, 502, 503, 504)
            if retryable and attempt + 1 < retries:
                time.sleep(min(20, 2 ** attempt * 3))
                continue
            raise RuntimeError(f"Apify HTTP {error.code}: {detail}") from error
        except (urllib.error.URLError, TimeoutError) as error:
            if method == "GET" and attempt + 1 < retries:
                time.sleep(min(20, 2 ** attempt * 3))
                continue
            raise RuntimeError(f"Apify indisponível: {str(error)[:120]}") from error


def fetch_apify(keywords, per_kw):
    """Inicia um run assíncrono por nicho, acompanha e lê o dataset final."""
    if not APIFY_TOKEN:
        raise RuntimeError("PROVIDER=apify precisa de APIFY_TOKEN")
    inp = {
        "searchQueries": list(keywords),
        "searchSection": "/video",
        "resultsPerPage": per_kw,
        "videoSearchSorting": APIFY_SORT,
        "videoSearchDateFilter": APIFY_DATE,
        "shouldDownloadVideos": False,
        "shouldDownloadCovers": False,
        "shouldDownloadSubtitles": False,
        "shouldDownloadAvatars": False,
        "shouldDownloadSlideshowImages": False,
    }
    actor = urllib.parse.quote(APIFY_ACTOR, safe="~")
    base = "https://api.apify.com/v2"
    response = apify_json("POST", f"{base}/actors/{actor}/runs?timeout={APIFY_RUN_MAX_SECONDS}", inp)
    run = response.get("data") or {}
    run_id = run.get("id")
    if not run_id:
        raise RuntimeError("Apify não retornou o ID do run")
    print(f"      Apify run {run_id} iniciado", flush=True)
    deadline = time.monotonic() + APIFY_RUN_MAX_SECONDS + 90
    while True:
        if time.monotonic() > deadline:
            raise RuntimeError(f"Apify run {run_id} excedeu o limite de acompanhamento")
        state = (apify_json("GET", f"{base}/actor-runs/{run_id}?waitForFinish=60").get("data") or {})
        status = state.get("status")
        if status == "SUCCEEDED":
            dataset_id = state.get("defaultDatasetId") or run.get("defaultDatasetId")
            if not dataset_id:
                raise RuntimeError(f"Apify run {run_id} terminou sem dataset")
            out = apify_json("GET", f"{base}/datasets/{dataset_id}/items?clean=true&limit=500")
            if not isinstance(out, list):
                raise RuntimeError(f"Apify run {run_id} retornou dataset inválido")
            print(f"      Apify run {run_id}: {len(out)} itens", flush=True)
            return out
        if status in ("FAILED", "TIMED-OUT", "ABORTED"):
            raise RuntimeError(f"Apify run {run_id}: {status} — {str(state.get('statusMessage') or '')[:120]}")
        time.sleep(5)


def _iso_to_unix(iso):
    if not iso:
        return 0
    try:
        import datetime as _dt
        return int(_dt.datetime.fromisoformat(str(iso).replace("Z", "+00:00")).timestamp())
    except Exception:
        return 0


def norm_apify(v, nicho):
    au = v.get("authorMeta") or {}
    mu = v.get("musicMeta") or {}
    vm = v.get("videoMeta") or {}
    vid = str(v.get("id") or "")
    caption = (v.get("text") or "").strip()
    tags = [n for n in ((t.get("name") if isinstance(t, dict) else t) for t in (v.get("hashtags") or [])) if n][:12]
    views = int(v.get("playCount") or 0)
    likes = int(v.get("diggCount") or 0)
    coments = int(v.get("commentCount") or 0)
    shares = int(v.get("shareCount") or 0)
    saves = int(v.get("collectCount") or 0)
    eng = round((likes + coments + shares) / views, 4) if views else 0.0
    cover = vm.get("coverUrl") or vm.get("originCoverUrl") or ""
    name = au.get("name") or ""
    return {
        "kind": "tiktok", "nicho": nicho, "videoId": vid,
        "nome": caption[:90] or f"@{name}",
        "caption": caption,
        "autor": name, "autorNome": au.get("nickName") or "",
        "perfilMarca": brand_signal(au),
        "seguidores": int(au.get("fans") or 0),
        "url": v.get("webVideoUrl") or f"https://www.tiktok.com/@{name}/video/{vid}",
        "thumb": cover, "thumbOrig": cover,
        "views": views, "likes": likes, "comentarios": coments,
        "shares": shares, "saves": saves, "engajamento": eng,
        "duracao": int(vm.get("duration") or 0),
        "dataPub": _iso_to_unix(v.get("createTimeISO")),
        "regiao": au.get("region") or "",
        "som": mu.get("musicName") or "", "somAutor": mu.get("musicAuthor") or "",
        "hashtags": tags,
        "faixa": faixa(views),
        "isAd": bool(v.get("isAd") or v.get("isSponsored") or v.get("isAdvertisement")),
        "fetchedAt": NOW,
    }


def fetch_niche(keywords, per_kw):
    """Retorna [(provider, raw), ...] para todas as keywords de um nicho."""
    if PROVIDER == "tikwm":
        out = []
        for kw in keywords:
            for v in fetch_tikwm(kw, per_kw):
                out.append(("tikwm", v))
            time.sleep(1.1)                # respeita rate limit do tikwm
        return out
    if PROVIDER == "apify":
        return [("apify", v) for v in fetch_apify(keywords, per_kw)]
    raise SystemExit(f"PROVIDER desconhecido: {PROVIDER}")


def normalize(raw_provider, v, nicho):
    if raw_provider == "tikwm":
        return norm_tikwm(v, nicho)
    if raw_provider == "apify":
        return norm_apify(v, nicho)
    return None


# =============================== Regras ====================================
def faixa(views):
    if views >= 1_000_000: return "viral"
    if views >= 100_000:   return "high"
    if views >= 10_000:    return "mid"
    return "low"


def too_old(create_time):
    return create_time and (NOW - create_time) > MAX_AGE_DAYS * 86400


def relevant(rec, must):
    """True se a legenda/hashtags do vídeo contêm algum termo do nicho."""
    if not must:
        return True
    tags = " ".join(str(h) for h in (rec.get("hashtags") or []) if h)
    hay = ((rec.get("caption") or "") + " " + tags).lower()
    return any(term in hay for term in must)


# =============================== Supabase ==================================
def sb(method, path, token=None, body=None, prefer=None, raw=None, ctype="application/json", extra=None):
    headers = {"apikey": ANON, "Content-Type": ctype}
    if token: headers["Authorization"] = f"Bearer {token}"
    if prefer: headers["Prefer"] = prefer
    if extra: headers.update(extra)
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(f"{SUPABASE_URL}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def bot_login():
    if BOT_ACCESS_TOKEN:
        return BOT_ACCESS_TOKEN
    st, txt = sb("POST", "/auth/v1/token?grant_type=password",
                 body={"email": BOT_EMAIL, "password": BOT_PASSWORD})
    if st != 200:
        raise RuntimeError(f"login do bot falhou: HTTP {st} {txt[:160]}")
    return json.loads(txt)["access_token"]


def insert_new_via_github(rows):
    """Novos vídeos só entram pela função OIDC restrita a este workflow."""
    request_url = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL", "")
    request_token = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN", "")
    if not request_url or not request_token:
        raise RuntimeError("identidade OIDC do GitHub ausente; nenhum vídeo novo foi inserido")
    separator = "&" if "?" in request_url else "?"
    oidc = http_json(request_url + separator + "audience=swipe-feg-netlify-automation",
                     headers={"Authorization": f"bearer {request_token}"}).get("value")
    if not oidc:
        raise RuntimeError("identidade OIDC do GitHub não foi emitida")
    req = urllib.request.Request(
        "https://benchmarkinggrupofeg.site/.netlify/functions/github-tiktok-ingest",
        data=json.dumps(rows).encode("utf-8"), method="POST",
        headers={"Authorization": f"Bearer {oidc}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=35) as response:
            result = json.loads(response.read().decode("utf-8", "replace"))
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"ingestão de novos vídeos recusada: HTTP {error.code}") from error
    if not result.get("ok") or result.get("inserted") != len(rows):
        raise RuntimeError("ingestão de novos vídeos não foi confirmada")
    return result["inserted"]


def reset_radar_via_github():
    """Limpa somente offers.data.kind=tiktok, via identidade deste workflow."""
    request_url = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL", "")
    request_token = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN", "")
    if not request_url or not request_token:
        raise RuntimeError("identidade OIDC do GitHub ausente; Radar não foi limpo")
    separator = "&" if "?" in request_url else "?"
    oidc = http_json(request_url + separator + "audience=swipe-feg-netlify-automation",
                     headers={"Authorization": f"bearer {request_token}"}).get("value")
    if not oidc:
        raise RuntimeError("identidade OIDC do GitHub não foi emitida")
    req = urllib.request.Request(
        "https://benchmarkinggrupofeg.site/.netlify/functions/github-tiktok-ingest",
        data=json.dumps({"action": "reset", "confirm": "DELETE_ALL_TIKTOK"}).encode("utf-8"),
        method="POST", headers={"Authorization": f"Bearer {oidc}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=35) as response:
        result = json.loads(response.read().decode("utf-8", "replace"))
    if not result.get("ok") or not result.get("reset") or result.get("scope") != "kind=tiktok":
        raise RuntimeError("limpeza do Radar não foi confirmada")
    print("Radar TikTok limpo: somente registros kind=tiktok removidos")


def load_existing(token):
    """videoId -> {id, data} da geração atual, sem truncar na página 1000."""
    out = {}
    offset = 0
    while True:
        path = ("/rest/v1/offers?select=id,data&data->>kind=eq.tiktok"
                f"&data->>radarGeneration=eq.{urllib.parse.quote(RADAR_GENERATION)}"
                f"&order=created_at.asc&limit=1000&offset={offset}")
        st, txt = sb("GET", path, token=token)
        if st != 200:
            raise RuntimeError(f"leitura dos vídeos atuais falhou: HTTP {st} {txt[:120]}")
        rows = json.loads(txt)
        for row in rows:
            d = row.get("data") or {}
            vid = d.get("videoId")
            if vid: out[str(vid)] = {"id": row["id"], "data": d}
        if len(rows) < 1000:
            break
        offset += 1000
    return out


def rehost_thumb(token, video_id, thumb_url):
    """Baixa a capa do TikTok e sobe pro Storage (estável + CSP-friendly)."""
    if not thumb_url: return ""
    try:
        img = http_bytes(thumb_url)
    except Exception:
        return ""
    path = f"/storage/v1/object/{BUCKET}/tiktok/{video_id}.jpg"
    try:
        st, msg = sb("POST", path, token=token, raw=img, ctype="image/jpeg",
                     extra={"x-upsert": "true"})
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        print(f"      ! rehost thumb {video_id}: {str(error)[:100]}", file=sys.stderr)
        return ""
    pub = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/tiktok/{video_id}.jpg"
    if st in (200, 201, 409):
        return pub
    print(f"      ! rehost thumb {video_id}: HTTP {st} {msg[:100]}", file=sys.stderr)
    return ""


def hosted_url(video_id):
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/tiktok/{video_id}.jpg"


# =============================== Coleta ====================================
def collect(niches=None, failures=None):
    niches = niches or BRAND_NICHES
    failures = failures if failures is not None else {}
    seen = {}       # videoId -> record (dedup global, 1º nicho ganha)
    per_niche = {n: [] for n in niches}
    # Uma execução por divisão do Apify cabe em ondas; a classificação
    # continua na ordem fixa dos nichos para a deduplicação ser reproduzível.
    prefetched = {}
    if PROVIDER == "apify" and len(niches) > 1:
        with ThreadPoolExecutor(max_workers=min(3, len(niches))) as pool:
            jobs = {n: pool.submit(fetch_niche, cfg["queries"] if isinstance(cfg, dict) else cfg, PER_KEYWORD)
                    for n, cfg in niches.items()}
            for nicho, job in jobs.items():
                try:
                    prefetched[nicho] = job.result()
                except Exception as error:
                    failures[nicho] = str(error)[:180]
                    prefetched[nicho] = []
    for nicho, cfg in niches.items():
        queries = cfg["queries"] if isinstance(cfg, dict) else cfg
        must = cfg.get("must", []) if isinstance(cfg, dict) else []
        got = {}
        off = 0                            # descartados por não serem do nicho
        if nicho in prefetched:
            source = prefetched[nicho]
        else:
            try:
                source = fetch_niche(queries, PER_KEYWORD)
            except Exception as error:
                failures[nicho] = str(error)[:180]
                source = []
        for prov, v in source:
            rec = normalize(prov, v, nicho)
            if not rec or not rec["videoId"]:
                continue
            rec["radarGeneration"] = RADAR_GENERATION
            if too_old(rec["dataPub"]) or rec["isAd"]:
                continue
            if not relevant(rec, must):    # filtro de relevância por nicho
                off += 1
                continue
            rec["subnicho"] = topic_of(rec, cfg) if isinstance(cfg, dict) else "Geral"
            vid = rec["videoId"]
            if vid in seen:                # já num nicho -> não duplica
                continue
            if vid not in got or rec["views"] > got[vid]["views"]:
                got[vid] = rec
        ranked = sorted(got.values(), key=lambda r: r["views"], reverse=True)[:MAX_PER_NICHE]
        for r in ranked:
            seen[r["videoId"]] = r
        per_niche[nicho] = ranked
        if not ranked and nicho not in failures:
            failures[nicho] = "nenhum vídeo orgânico relevante após os filtros"
        print(f"  {nicho:22} {len(ranked):>3} vídeos "
              f"(viral {sum(r['faixa']=='viral' for r in ranked)}, "
              f"high {sum(r['faixa']=='high' for r in ranked)}, "
              f"mid {sum(r['faixa']=='mid' for r in ranked)}, "
              f"low {sum(r['faixa']=='low' for r in ranked)})"
              f"  · fora do nicho: {off}")
    return per_niche


def main():
    if "--list-taxonomy" in sys.argv:
        print(json.dumps({"legacy": list(NICHES), "brands_prepared": BRAND_NICHES, "provider_calls": 0}, ensure_ascii=False, indent=2))
        return
    if "--reset" in sys.argv:
        reset_radar_via_github()
        return
    dry = "--dry" in sys.argv
    # Não há caminho de produção para a taxonomia legada: o Radar segue Ofertas.
    active_niches = BRAND_NICHES
    print(f"TikTok mining — provider={PROVIDER}  dry={dry}\n")
    failures = {}
    per_niche = collect(active_niches, failures=failures)
    total = sum(len(v) for v in per_niche.values())
    print(f"\nTotal coletado: {total} vídeos em {len(per_niche)} nichos")
    if failures:
        for nicho, reason in failures.items():
            print(f"::warning::Radar TikTok {nicho}: {reason}", file=sys.stderr)
    if not total:
        raise RuntimeError("Radar não foi atualizado: nenhum nicho retornou vídeos relevantes")

    # amostra
    print("\nAmostras (top por nicho):")
    for nicho, arr in per_niche.items():
        if not arr: continue
        r = arr[0]
        print(f"  [{nicho}] {r['nome'][:44]!r} — {r['views']:,} views · "
              f"{r['likes']:,} likes · {r['comentarios']:,} coment · eng {r['engajamento']:.1%} · @{r['autor']}")

    if dry:
        print("\n(--dry: nada gravado)")
        return
    if not BOT_ACCESS_TOKEN and not (BOT_EMAIL and BOT_PASSWORD):
        print("ERRO: sessão temporária do bot ausente.", file=sys.stderr); sys.exit(2)

    token = bot_login()
    existing = load_existing(token)
    ins = upd = 0
    new_rows = []
    for nicho, arr in per_niche.items():
        for r in arr:
            vid = r["videoId"]
            prev = existing.get(vid, {}).get("data") or {}
            # A capa não bloqueia a gravação dos vídeos. O CDN é renovado a
            # cada coleta; rehost no Storage é opcional e falha de forma segura.
            prev_thumb = prev.get("thumb") or ""
            if "/storage/v1/object/public/" in prev_thumb:
                r["thumb"] = prev_thumb
            elif REHOST_THUMBS:
                hosted = rehost_thumb(token, vid, r["thumbOrig"])
                r["thumb"] = hosted or r["thumbOrig"]
            else:
                r["thumb"] = r["thumbOrig"]
            # histórico de views (crescimento ao longo dos dias)
            hist = prev.get("viewsHistory") or []
            hist.append({"d": NOW, "v": r["views"]})
            if len(hist) > HISTORY_CAP: hist = hist[-HISTORY_CAP:]
            r["viewsHistory"] = hist
            if vid in existing:
                st, _ = sb("PATCH", f"/rest/v1/offers?id=eq.{existing[vid]['id']}",
                           token=token, body={"data": r}, prefer="return=minimal")
                upd += 1 if st in (200, 204) else 0
            else:
                new_rows.append(r)
    if new_rows:
        ins = insert_new_via_github(new_rows)
    print(f"\nGravado: {ins} novos, {upd} atualizados")


if __name__ == "__main__":
    main()
