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
import os, sys, json, tempfile, time, urllib.request, urllib.error, uuid
from datetime import datetime, timedelta, timezone

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
LOCK_MINUTES = max(15, int(os.environ.get("TRANSCRIPTION_LOCK_MINUTES", "180")))
JOB_VERSION = os.environ.get("TRANSCRIPTION_VERSION", "1")
RUN_ID = os.environ.get("GITHUB_RUN_ID") or str(uuid.uuid4())


def iso_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_iso(value):
    try:
        return datetime.fromisoformat(str(value or "").replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def log(event, **fields):
    print(json.dumps({"event": event, "at": iso_now(), "run_id": RUN_ID, **fields}, ensure_ascii=False), flush=True)


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
        # Texto válido e vídeo sem fala já concluído não voltam para a fila.
        canonical = str(d.get("transcriptionStatus") or d.get("transcricaoStatus") or "").lower()
        text_ready = bool((d.get("transcricao") or "").strip())
        invalid = bool(d.get("transcriptionInvalid") or d.get("transcriptionIncomplete")) or canonical in ("invalid", "incomplete")
        stored_version = str(d.get("transcriptionVersion") or "")
        outdated = bool(stored_version and stored_version != JOB_VERSION)
        if (text_ready or canonical in ("completed", "done")) and not invalid and not outdated:
            continue
        attempts = max(0, int(d.get("transcriptionAttempts") or d.get("transcricaoTentativas") or 0))
        if canonical in ("failed", "error") and attempts >= MAX_RETRIES:
            continue
        now = datetime.now(timezone.utc)
        retry_at = parse_iso(d.get("transcriptionNextRetryAt"))
        if retry_at and retry_at > now:
            continue
        started_at = parse_iso(d.get("transcriptionStartedAt"))
        if canonical in ("processing", "working") and started_at and started_at > now - timedelta(minutes=LOCK_MINUTES):
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
    run_started = time.monotonic()
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
    log("transcription_scan", eligible=len(pending), kinds=sorted(TRANSCRIBE_KINDS), max_videos=MAX_VIDEOS, provider="faster-whisper")
    if not pending:
        log("transcription_run_completed", completed=0, failed=0, deferred=0, duration_ms=round((time.monotonic() - run_started) * 1000))
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
        log("transcription_job_started", creative_id=oid, position=i, total=len(pending), name=nome[:80], attempt=_attempts + 1)
        attempts = max(0, int(data.get("transcriptionAttempts") or data.get("transcricaoTentativas") or 0)) + 1
        data["transcricaoStatus"] = "processing"
        data["transcricaoTentativas"] = attempts
        data["transcricaoUltimaTentativa"] = iso_now()
        data["transcriptionStatus"] = "processing"
        data["transcriptionAttempts"] = attempts
        data["transcriptionStartedAt"] = iso_now()
        data["transcriptionCompletedAt"] = ""
        data["transcriptionLastError"] = ""
        data["transcriptionNextRetryAt"] = ""
        data["transcriptionProvider"] = "faster-whisper"
        data["transcriptionVersion"] = JOB_VERSION
        status, resp = patch_data(token, oid, data)
        if status not in (200, 204):
            fail += 1
            log("transcription_reservation_failed", creative_id=oid, http_status=status)
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
            data["transcricaoConcluidaEm"] = iso_now()
            data["transcriptionStatus"] = "completed"
            data["transcriptionCompletedAt"] = iso_now()
            data["transcriptionLastError"] = ""
            data["transcriptionNextRetryAt"] = ""
            data["transcriptionInvalid"] = False
            data["transcriptionIncomplete"] = False
            status, resp = patch_data(token, oid, data)
            if status in (200, 204):
                ok += 1
                log("transcription_job_completed", creative_id=oid, attempts=attempts, characters=len(text), words=len(words), language=lang or "")
            else:
                fail += 1
                log("transcription_save_failed", creative_id=oid, http_status=status)
        except Exception as e:
            fail += 1
            final = attempts >= MAX_RETRIES
            delay_minutes = min(12 * 60, 15 * (2 ** max(0, attempts - 1)))
            data["transcricaoStatus"] = "error" if final else "pending"
            data["transcricaoError"] = "Falha temporária; nova tentativa será feita automaticamente." if not final else "Não foi possível concluir após várias tentativas."
            data["transcriptionStatus"] = "failed" if final else "retry_scheduled"
            data["transcriptionLastError"] = "transcription_provider_error"
            data["transcriptionNextRetryAt"] = "" if final else (datetime.now(timezone.utc) + timedelta(minutes=delay_minutes)).isoformat().replace("+00:00", "Z")
            patch_data(token, oid, data)
            log("transcription_job_failed", creative_id=oid, attempts=attempts, final=final, retry_in_minutes=0 if final else delay_minutes, error_type=type(e).__name__)

    log("transcription_run_completed", completed=ok, failed=fail, deferred=deferred, duration_ms=round((time.monotonic() - run_started) * 1000))
    if fail and not ok:
        sys.exit(1)


if __name__ == "__main__":
    main()
