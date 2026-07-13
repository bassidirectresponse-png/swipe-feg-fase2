#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ingestão do vault MEGABRAIN (Obsidian) para o Supabase — base do "Feguinho Copy Chief".

Lê os .md do vault (bassi.brain), classifica cada arquivo (skill, framework, template,
ads-validado, análise-master, vsl...), quebra os arquivos de ads validados em UMA linha
por criativo (com nº de vendas), e grava na tabela `conhecimento`. Full-refresh: apaga o
que existe e reinsere — mantém sincronizado com o vault a cada rodada.

Env:
  VAULT_DIR              caminho da pasta bassi.brain (obrigatório)
  SUPABASE_URL, SUPABASE_ANON_KEY (default embutido)
  SUPABASE_BOT_EMAIL, SUPABASE_BOT_PASSWORD (obrigatórias, exceto --dry)

Uso:
  VAULT_DIR=.../bassi.brain python scripts/ingest_vault.py --dry   # só parseia e imprime
  VAULT_DIR=.../bassi.brain python scripts/ingest_vault.py         # parseia e grava
"""
import os, re, sys, glob, json, urllib.request, urllib.error

VAULT = os.environ.get("VAULT_DIR", "").rstrip("/")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://ppaajtzbhjixhyfidojd.supabase.co").rstrip("/")
ANON = os.environ.get("SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwYWFqdHpiaGppeGh5Zmlkb2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMDkzNTcsImV4cCI6MjA5Njc4NTM1N30.uoC_3EHM_dfmkBHJYjPvlaC7DqkJziunz-tug0ItAJc")
BOT_EMAIL = os.environ.get("SUPABASE_BOT_EMAIL", "")
BOT_PASSWORD = os.environ.get("SUPABASE_BOT_PASSWORD", "")


# =============================== classificação ==============================
def classify(rel):
    p = "/" + rel.lower()
    nicho = ""
    m = re.search(r"/(?:criativos|vsl)/([a-z0-9-]+)/", p)
    if m:
        nicho = m.group(1)
    if "dissecador-de-ads" in p or "dissecador-de-vsl" in p:
        return "skill-dissecador", nicho
    if "ads-validados" in p and "_analise-master" not in p and "_indice" not in p:
        return "ads-validado", nicho
    if "_analise-master" in p:
        return "analise-master", nicho
    if "/09-skills/" in p:
        return "skill", nicho
    if "/04-frameworks/" in p:
        return "framework", nicho
    if "/06-templates/" in p:
        return "template", nicho
    if "/vsl/" in p:
        return "vsl", nicho
    return "outro", nicho


def vendas_of(title):
    m = re.search(r"[—-]\s*([\d.]+)\s*vendas", title, re.I)
    return int(m.group(1).replace(".", "")) if m else None


def produto_of(rel):
    m = re.search(r"ads-validados/([a-z0-9-]+)-ads-validados", rel.lower())
    return m.group(1) if m else ""


def rows_for(path, rel):
    txt = open(path, encoding="utf-8", errors="replace").read()
    tipo, nicho = classify(rel)
    if tipo == "ads-validado":
        prod = produto_of(rel)
        parts = re.split(r"(?m)^(##\s+.*)$", txt)   # [pre, h2, body, h2, body, ...]
        out = []
        for i in range(1, len(parts), 2):
            title = parts[i].lstrip("# ").strip()
            body = parts[i + 1] if i + 1 < len(parts) else ""
            out.append({"tipo": "ads-validado", "nicho": nicho, "produto": prod,
                        "titulo": title, "vendas": vendas_of(title), "fonte": rel,
                        "conteudo": (parts[i] + body).strip()})
        if out:
            return out
    title = os.path.basename(rel)[:-3] if rel.endswith(".md") else os.path.basename(rel)
    return [{"tipo": tipo, "nicho": nicho, "produto": produto_of(rel),
             "titulo": title, "vendas": None, "fonte": rel, "conteudo": txt.strip()}]


def collect():
    files = [f for f in glob.glob(VAULT + "/**/*.md", recursive=True)
             if "/.obsidian/" not in f and "/.claude/" not in f]
    rows = []
    for f in sorted(files):
        rel = os.path.relpath(f, VAULT)
        try:
            rows.extend(rows_for(f, rel))
        except Exception as e:
            print(f"  ! falhou em {rel}: {str(e)[:100]}", file=sys.stderr)
    return [r for r in rows if (r["conteudo"] or "").strip()]


# =============================== Supabase ==================================
def sb(method, path, token=None, body=None, prefer=None):
    headers = {"apikey": ANON, "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if prefer:
        headers["Prefer"] = prefer
    data = json.dumps(body).encode() if body is not None else None
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


# =============================== main ======================================
def main():
    if not VAULT or not os.path.isdir(VAULT):
        print("ERRO: defina VAULT_DIR apontando para a pasta bassi.brain.", file=sys.stderr); sys.exit(2)
    dry = "--dry" in sys.argv
    rows = collect()

    from collections import Counter
    por_tipo = Counter(r["tipo"] for r in rows)
    por_nicho = Counter(r["nicho"] or "(genérico)" for r in rows)
    chars = sum(len(r["conteudo"]) for r in rows)
    print(f"== Ingestão do vault ==  ({len(rows)} blocos)")
    print("por tipo:  ", dict(por_tipo))
    print("por nicho: ", dict(por_nicho))
    print(f"~tokens estimados na base: {chars//4:,} (≈ {chars:,} chars)")
    ads = [r for r in rows if r["tipo"] == "ads-validado"]
    print(f"\nads validados: {len(ads)} copies")
    for r in sorted(ads, key=lambda x: -(x["vendas"] or 0))[:8]:
        print(f"  · [{r['nicho']}/{r['produto']}] {r['titulo'][:48]} — {r['vendas']} vendas")

    if dry:
        print("\n(--dry: nada gravado)")
        return
    if not (BOT_EMAIL and BOT_PASSWORD):
        print("ERRO: defina SUPABASE_BOT_EMAIL e SUPABASE_BOT_PASSWORD.", file=sys.stderr); sys.exit(2)

    token = bot_login()
    # full-refresh: apaga tudo e reinsere
    st, txt = sb("DELETE", "/rest/v1/conhecimento?id=not.is.null", token=token, prefer="return=minimal")
    if st not in (200, 204):
        print(f"aviso: limpeza retornou HTTP {st} {txt[:120]}", file=sys.stderr)
    ins = 0
    for i in range(0, len(rows), 50):
        chunk = rows[i:i + 50]
        st, txt = sb("POST", "/rest/v1/conhecimento", token=token, body=chunk, prefer="return=minimal")
        if st in (200, 201, 204):
            ins += len(chunk)
        else:
            print(f"ERRO insert lote {i}: HTTP {st} {txt[:160]}", file=sys.stderr)
    print(f"\nGravado: {ins}/{len(rows)} blocos na tabela `conhecimento`.")


if __name__ == "__main__":
    main()
