#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Transcrição automática dos vídeos MP4 dos criativos do Swipe FEG.

Para cada card cujo data.video seja um vídeo hospedado no Supabase Storage e
que ainda NÃO tenha transcrição, baixa o arquivo, roda o Whisper
(faster-whisper, local, sem API key) e grava texto, segmentos e palavras com
timestamps. A transcrição então aparece automaticamente ao lado do vídeo no
app e acompanha o player.

Só depende de faster-whisper (que decodifica o áudio internamente via PyAV).
Escreve com o bot de baixo privilégio (mesmos secrets das outras automações).

Env:
  SUPABASE_URL, SUPABASE_ANON_KEY (têm default)
  SUPABASE_BOT_EMAIL, SUPABASE_BOT_PASSWORD (obrigatórias)
  WHISPER_MODEL=small   (tiny/base/small/medium/large-v3 — maior = + preciso, + lento)
  MAX_VIDEOS=200        (limite por execução; a execução retoma do checkpoint)
  MAX_RUN_MINUTES=300   (encerra com segurança antes do limite do runner)
  MAX_RETRIES=4         (tentativas antes de manter o item como erro)
  TRANSCRIBE_KINDS=criativo (separado por vírgula; padrão: criativo)
  LANG=""               (força idioma, ex.: "pt"/"en"; vazio = detecta sozinho)

Uso local de teste (sem tocar no Supabase):
  python scripts/transcrever.py --file caminho/do/video.mp4
"""
import os, sys, json, tempfile, time, urllib.request, urllib.error

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://ppaajtzbhjixhyfidojd.supabase.co").rstrip("/")
ANON = os.environ.get(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwYWFqdHpiaGppeGh5Zmlkb2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMDkzNTcsImV4cCI6MjA5Njc4NTM1N30.uoC_3EHM_dfmkBHJYjPvlaC7DqkJziunz-tug0ItAJc",
)
BOT_EMAIL = os.environ.get("SUPABASE_BOT_EMAIL", "")
BOT_PASSWORD = os.environ.get("SUPABASE_BOT_PASSWORD", "")
WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "small")
MAX_VIDEOS = max(1, int(os.environ.get("MAX_VIDEOS", "200")))
MAX_RUN_MINUTES = max(5, int(os.environ.get("MAX_RUN_MINUTES", "300")))
MAX_RETRIES = max(1, int(os.environ.get("MAX_RETRIES", "4")))
TRANSCRIBE_KINDS = {
    value.strip() for value in os.environ.get("TRANSCRIBE_KINDS", "criativo").split(",")
    if value.strip()
}
FORCE_LANG = os.environ.get("LANG_FORCE", "") or None
STORAGE_MARK = "/storage/v1/object/public/criativos/"
VIDEO_EXT = (".mp4", ".webm", ".mov", ".m4v", ".ogg")


# =============================== Supabase (REST) ============================
def sb(method, path, token=None, body=None, prefer=None):
    headers = {"apikey": ANON, "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if prefer:
        headers["Prefer"] = prefer
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{SUPABASE_URL}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def bot_login():
    status, txt = sb("POST", "/auth/v1/token?grant_type=password",
                     body={"email": BOT_EMAIL, "password": BOT_PASSWORD})
    if status != 200:
        raise RuntimeError(f"login do bot falhou: HTTP {status} {txt[:200]}")
    return json.loads(txt)["access_token"]


def patch_data(token, oid, data):
    return sb("PATCH", f"/rest/v1/offers?id=eq.{oid}", token=token,
              body={"data": data}, prefer="return=minimal")


def fetch_pending(token):
    status, txt = sb("GET", "/rest/v1/offers?select=id,created_at,data", token=token)
    if status != 200:
        raise RuntimeError(f"erro ao ler ofertas: HTTP {status} {txt[:200]}")
    out = []
    for row in json.loads(txt):
        d = row.get("data") or {}
        if d.get("kind") not in TRANSCRIBE_KINDS:
            continue
        v = (d.get("video") or "").strip()
        if STORAGE_MARK not in v or not v.lower().split("?")[0].endswith(VIDEO_EXT):
            continue
        # Texto pronto e vídeo sem fala já concluído não voltam para a fila.
        if (d.get("transcricao") or "").strip() or d.get("transcricaoStatus") == "done":
            continue
        attempts = max(0, int(d.get("transcricaoTentativas") or 0))
        if d.get("transcricaoStatus") == "error" and attempts >= MAX_RETRIES:
            continue
        out.append((attempts, row.get("created_at") or "", row["id"], d, v))
    # Um arquivo que falhou não bloqueia os demais. Novos/nunca tentados vêm primeiro.
    out.sort(key=lambda item: (item[0], item[1], item[2]))
    return out


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "SwipeFEG-Transcricao/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as f:
        while True:
            chunk = r.read(1 << 16)
            if not chunk:
                break
            f.write(chunk)


# =============================== Whisper ==================================
def load_model():
    from faster_whisper import WhisperModel
    print(f"carregando modelo Whisper '{WHISPER_MODEL}' (CPU, int8)…")
    return WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")


def transcribe(model, path):
    raw_segments, info = model.transcribe(
        path, beam_size=3, vad_filter=True, word_timestamps=True,
        language=FORCE_LANG,
    )
    parts, segments, words = [], [], []
    for segment in raw_segments:
        value = (segment.text or "").strip()
        if value:
            parts.append(value)
            segments.append({
                "text": value,
                "start": max(0.0, float(segment.start or 0)),
                "end": max(0.0, float(segment.end or 0)),
            })
        for word in (segment.words or []):
            token = (word.word or "").strip()
            if not token:
                continue
            start = max(0.0, float(word.start or 0))
            end = max(start, float(word.end or start))
            words.append({"word": token, "start": start, "end": end})
    text = " ".join(parts).strip()
    return text, getattr(info, "language", None), segments, words


# =============================== main ======================================
def main():
    # modo local de teste: --file video.mp4
    if len(sys.argv) >= 3 and sys.argv[1] == "--file":
        model = load_model()
        text, lang, _segments, _words = transcribe(model, sys.argv[2])
        print(f"\n[idioma detectado: {lang}]\n")
        print(text)
        return

    if not (BOT_EMAIL and BOT_PASSWORD):
        print("ERRO: defina SUPABASE_BOT_EMAIL e SUPABASE_BOT_PASSWORD.", file=sys.stderr)
        sys.exit(2)

    token = bot_login()
    pending = fetch_pending(token)
    print(f"vídeos aguardando transcrição: {len(pending)}")
    if not pending:
        print("nada a fazer.")
        return

    pending = pending[:MAX_VIDEOS]
    model = load_model()   # só baixa/carrega o modelo se houver trabalho
    ok = fail = deferred = 0
    deadline = time.monotonic() + MAX_RUN_MINUTES * 60
    for i, (_attempts, _created_at, oid, data, url) in enumerate(pending, 1):
        if time.monotonic() >= deadline:
            deferred = len(pending) - i + 1
            print(f"\nlimite seguro alcançado; {deferred} vídeo(s) ficam para a próxima execução")
            break
        nome = data.get("nome", "?")
        print(f"\n[{i}/{len(pending)}] {nome[:44]}")
        attempts = max(0, int(data.get("transcricaoTentativas") or 0)) + 1
        data["transcricaoStatus"] = "processing"
        data["transcricaoTentativas"] = attempts
        data["transcricaoUltimaTentativa"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        status, resp = patch_data(token, oid, data)
        if status not in (200, 204):
            fail += 1
            print(f"   ERRO ao reservar: HTTP {status} {resp[:160]}", file=sys.stderr)
            continue
        try:
            with tempfile.NamedTemporaryFile(suffix=".mp4", delete=True) as tmp:
                download(url, tmp.name)
                text, lang, segments, words = transcribe(model, tmp.name)
            if not text:
                text = "[Sem fala detectada no vídeo]"
                print("   vídeo sem fala detectada; marcando como concluído")
            data["transcricao"] = text
            data["transcricaoStatus"] = "done"
            data["transcricaoLang"] = lang or ""
            data["transcricaoSegments"] = segments
            data["transcricaoWords"] = words
            data["transcricaoError"] = ""
            data["transcricaoConcluidaEm"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            status, resp = patch_data(token, oid, data)
            if status in (200, 204):
                ok += 1
                print(f"   ✓ gravado ({len(text)} caracteres, {len(words)} palavras, idioma {lang})")
            else:
                fail += 1
                print(f"   ERRO ao gravar: HTTP {status} {resp[:160]}", file=sys.stderr)
        except Exception as e:
            fail += 1
            message = str(e)[:300]
            data["transcricaoStatus"] = "error" if attempts >= MAX_RETRIES else "pending"
            data["transcricaoError"] = message
            patch_data(token, oid, data)
            print(f"   FALHA ({attempts}/{MAX_RETRIES}): {message[:200]}", file=sys.stderr)

    print(f"\nFim: {ok} transcritos, {fail} falhas, {deferred} adiados")
    if fail and not ok:
        sys.exit(1)


if __name__ == "__main__":
    main()
