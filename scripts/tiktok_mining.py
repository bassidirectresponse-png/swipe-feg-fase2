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
  MAX_PER_NICHE=40   MAX_AGE_DAYS=45   PER_KEYWORD=30

Uso:
  python scripts/tiktok_mining.py --dry     # só busca e imprime, não grava
  python scripts/tiktok_mining.py           # busca e grava no Supabase
"""
import os, sys, json, time, io, urllib.request, urllib.parse, urllib.error

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://ppaajtzbhjixhyfidojd.supabase.co").rstrip("/")
ANON = os.environ.get("SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwYWFqdHpiaGppeGh5Zmlkb2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMDkzNTcsImV4cCI6MjA5Njc4NTM1N30.uoC_3EHM_dfmkBHJYjPvlaC7DqkJziunz-tug0ItAJc")
BOT_EMAIL = os.environ.get("SUPABASE_BOT_EMAIL", "")
BOT_PASSWORD = os.environ.get("SUPABASE_BOT_PASSWORD", "")
PROVIDER = os.environ.get("PROVIDER", "tikwm").lower()
MAX_PER_NICHE = int(os.environ.get("MAX_PER_NICHE", "40"))
MAX_AGE_DAYS = int(os.environ.get("MAX_AGE_DAYS", "45"))
PER_KEYWORD = int(os.environ.get("PER_KEYWORD", "30"))
HISTORY_CAP = 60
BUCKET = "criativos"        # reusa o bucket existente (bot já tem permissão), prefixo tiktok/
NOW = int(time.time())

# nicho do app -> termos de busca (hashtags/palavras-chave)
NICHES = {
    "Emagrecimento":       ["weightloss", "ozempic", "mounjaro", "glp1", "semaglutide"],
    "Diabetes / Glicose":  ["blood sugar", "type 2 diabetes", "a1c", "glucose control"],
    "Disfunção Erétil":    ["erectile dysfunction", "mens vitality", "testosterone boost"],
    "Memória":             ["brain fog", "memory loss", "nootropics", "brain health"],
    "Neuropatia":          ["neuropathy", "nerve pain", "peripheral neuropathy"],
    "Próstata":            ["prostate health", "enlarged prostate"],
    "Visão":               ["eye health", "vision loss", "macular degeneration"],
    "Audição":             ["tinnitus", "ringing in ears", "hearing loss"],
}


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


def fetch_apify(keywords, per_kw):
    """Uma execução do ator por nicho (todas as keywords de uma vez)."""
    if not APIFY_TOKEN:
        raise SystemExit("PROVIDER=apify precisa de APIFY_TOKEN")
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
    url = f"https://api.apify.com/v2/acts/{APIFY_ACTOR}/run-sync-get-dataset-items?token={APIFY_TOKEN}"
    try:
        req = urllib.request.Request(url, data=json.dumps(inp).encode(),
                                     headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=300) as r:
            out = json.loads(r.read().decode("utf-8", "replace"))
            return out if isinstance(out, list) else []
    except urllib.error.HTTPError as e:
        print(f"      ! apify HTTP {e.code}: {e.read().decode()[:180]}", file=sys.stderr)
        return []
    except Exception as e:
        print(f"      ! apify falhou: {str(e)[:120]}", file=sys.stderr)
        return []


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
    tags = [(t.get("name") if isinstance(t, dict) else str(t)) for t in (v.get("hashtags") or [])][:12]
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
    st, txt = sb("POST", "/auth/v1/token?grant_type=password",
                 body={"email": BOT_EMAIL, "password": BOT_PASSWORD})
    if st != 200:
        raise RuntimeError(f"login do bot falhou: HTTP {st} {txt[:160]}")
    return json.loads(txt)["access_token"]


def load_existing(token):
    """videoId -> {id, data} dos tiktoks já salvos."""
    st, txt = sb("GET", "/rest/v1/offers?select=id,data&data->>kind=eq.tiktok", token=token)
    if st != 200:
        print(f"aviso: leitura de existentes HTTP {st} {txt[:120]}", file=sys.stderr)
        return {}
    out = {}
    for row in json.loads(txt):
        d = row.get("data") or {}
        vid = d.get("videoId")
        if vid: out[str(vid)] = {"id": row["id"], "data": d}
    return out


def rehost_thumb(token, video_id, thumb_url):
    """Baixa a capa do TikTok e sobe pro Storage (estável + CSP-friendly)."""
    if not thumb_url: return ""
    try:
        img = http_bytes(thumb_url)
    except Exception:
        return ""
    path = f"/storage/v1/object/{BUCKET}/tiktok/{video_id}.jpg"
    st, msg = sb("POST", path, token=token, raw=img, ctype="image/jpeg",
                 extra={"x-upsert": "true"})
    pub = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/tiktok/{video_id}.jpg"
    if st in (200, 201, 409):
        return pub
    print(f"      ! rehost thumb {video_id}: HTTP {st} {msg[:100]}", file=sys.stderr)
    return ""


def hosted_url(video_id):
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/tiktok/{video_id}.jpg"


# =============================== Coleta ====================================
def collect():
    seen = {}       # videoId -> record (dedup global, 1º nicho ganha)
    per_niche = {n: [] for n in NICHES}
    for nicho, terms in NICHES.items():
        got = {}
        for prov, v in fetch_niche(terms, PER_KEYWORD):
            rec = normalize(prov, v, nicho)
            if not rec or not rec["videoId"]:
                continue
            if too_old(rec["dataPub"]) or rec["isAd"]:
                continue
            vid = rec["videoId"]
            if vid in seen:                # já num nicho -> não duplica
                continue
            if vid not in got or rec["views"] > got[vid]["views"]:
                got[vid] = rec
        ranked = sorted(got.values(), key=lambda r: r["views"], reverse=True)[:MAX_PER_NICHE]
        for r in ranked:
            seen[r["videoId"]] = r
        per_niche[nicho] = ranked
        print(f"  {nicho:22} {len(ranked):>3} vídeos "
              f"(viral {sum(r['faixa']=='viral' for r in ranked)}, "
              f"high {sum(r['faixa']=='high' for r in ranked)}, "
              f"mid {sum(r['faixa']=='mid' for r in ranked)}, "
              f"low {sum(r['faixa']=='low' for r in ranked)})")
    return per_niche


def main():
    dry = "--dry" in sys.argv
    print(f"TikTok mining — provider={PROVIDER}  dry={dry}\n")
    per_niche = collect()
    total = sum(len(v) for v in per_niche.values())
    print(f"\nTotal coletado: {total} vídeos em {len(per_niche)} nichos")

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
    if not (BOT_EMAIL and BOT_PASSWORD):
        print("ERRO: defina SUPABASE_BOT_EMAIL e SUPABASE_BOT_PASSWORD.", file=sys.stderr); sys.exit(2)

    token = bot_login()
    existing = load_existing(token)
    ins = upd = 0
    for nicho, arr in per_niche.items():
        for r in arr:
            vid = r["videoId"]
            prev = existing.get(vid, {}).get("data") or {}
            # thumb: preferir Storage (permanente); se o bot não puder subir,
            # cai pro CDN do TikTok (renovado a cada rodada; liberado no CSP).
            prev_thumb = prev.get("thumb") or ""
            if "/storage/v1/object/public/" in prev_thumb:
                r["thumb"] = prev_thumb
            else:
                hosted = rehost_thumb(token, vid, r["thumbOrig"])
                r["thumb"] = hosted or r["thumbOrig"]
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
                st, _ = sb("POST", "/rest/v1/offers", token=token,
                           body={"data": r}, prefer="return=minimal")
                ins += 1 if st in (200, 201, 204) else 0
    print(f"\nGravado: {ins} novos, {upd} atualizados")


if __name__ == "__main__":
    main()
