#!/usr/bin/env python3
"""Enfileira engenharia reversa visual para anúncios já transcritos.

Percorre TODOS os cards ``criativo`` e ``megabrain`` por páginas de 1.000,
seleciona somente vídeos com duração comprovada de até 10 minutos, produz
contact sheets com ffmpeg e envia a análise multimodal ao worker persistente
da aplicação. VSLs nunca entram nesta fila.
"""
import base64
import copy
import json
import mimetypes
import os
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from runtime_config import supabase_public_config

SUPABASE_URL, ANON = supabase_public_config()
BOT_EMAIL = os.environ.get("SUPABASE_BOT_EMAIL", "").strip()
BOT_PASSWORD = os.environ.get("SUPABASE_BOT_PASSWORD", "")
BOT_ACCESS_TOKEN = os.environ.get("SUPABASE_BOT_ACCESS_TOKEN", "").strip()
APP_URL = os.environ.get("APP_URL", "https://benchmarkinggrupofeg.site").strip().rstrip("/")
ANALYSIS_URL = os.environ.get("AD_ANALYSIS_URL", f"{APP_URL}/.netlify/functions/ad-analysis-job")
KINDS = {value.strip() for value in os.environ.get("AD_ANALYSIS_KINDS", "criativo,megabrain").split(",") if value.strip()}
MAX_ANALYSES = max(1, int(os.environ.get("MAX_AD_ANALYSES", "20")))
MAX_DURATION = 600.0
LOCK_MINUTES = max(15, int(os.environ.get("AD_ANALYSIS_LOCK_MINUTES", "45")))
PROMPT_VERSION = "2026-08-04.2"


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_iso(value):
    try:
        return datetime.fromisoformat(str(value or "").replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def request(method, url, body=None, token=None, timeout=90, extra_headers=None):
    headers = {"Content-Type": "application/json"}
    if SUPABASE_URL and url.startswith(SUPABASE_URL):
        headers["apikey"] = ANON
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if extra_headers:
        headers.update(extra_headers)
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()


def login():
    if BOT_ACCESS_TOKEN:
        return BOT_ACCESS_TOKEN
    status, raw = request("POST", f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
                          {"email": BOT_EMAIL, "password": BOT_PASSWORD})
    if status != 200:
        raise RuntimeError(f"login do bot falhou: HTTP {status}")
    return json.loads(raw.decode("utf-8"))["access_token"]


def normalize_video_url(value):
    """Aceita somente mídia reproduzível; páginas/links de anúncio ficam fora."""
    value = str(value or "").strip()
    if not value:
        return ""
    lowered = value.lower()
    if value.startswith("/.netlify/functions/fegsys-drive-media"):
        return value
    if "/storage/v1/object/" in lowered or "/.netlify/blobs/" in lowered:
        return value
    parsed = urllib.parse.urlparse(value)
    if parsed.scheme in ("http", "https") and parsed.path.lower().endswith((".mp4", ".webm", ".ogg", ".ogv", ".m4v", ".mov")):
        return value
    match = None
    if "drive.google.com" in lowered:
        import re
        match = re.search(r"/file/d/([\w-]+)", value) or re.search(r"[?&]id=([\w-]+)", value)
    if match:
        return f"https://drive.google.com/uc?export=download&id={match.group(1)}"
    return ""


def video_url(data):
    for key in ("video", "videoVsl", "videoCriativo", "linkDrive", "link"):
        value = normalize_video_url(data.get(key))
        if value:
            return value
    return ""


def fetch_candidates(token):
    rows, page_size, offset = [], 1000, 0
    query = urllib.parse.urlencode({
        "select": "id,created_at,data",
        "order": "id.asc",
        "data->>kind": f"in.({','.join(sorted(KINDS))})",
    })
    while True:
        status, raw = request(
            "GET", f"{SUPABASE_URL}/rest/v1/offers?{query}", token=token,
            extra_headers={"Range-Unit": "items", "Range": f"{offset}-{offset + page_size - 1}"},
        )
        if status not in (200, 206):
            raise RuntimeError(f"leitura dos cards falhou: HTTP {status}")
        page = json.loads(raw.decode("utf-8"))
        rows.extend(page)
        if len(page) < page_size:
            break
        offset += page_size

    eligible, long_videos = [], []
    stale_before = datetime.now(timezone.utc) - timedelta(minutes=LOCK_MINUTES)
    for row in rows:
        data = row.get("data") or {}
        if data.get("kind") not in KINDS or not str(data.get("transcricao") or "").strip():
            continue
        if not video_url(data):
            continue
        status = str(data.get("adAnalysisStatus") or "").lower()
        version = str(data.get("adAnalysisPromptVersion") or "")
        if status == "complete" and version == PROMPT_VERSION and str(data.get("adVisualAnalysis") or "").strip():
            continue
        if status in ("queued", "working"):
            started = parse_iso(data.get("adAnalysisQueuedAt") or data.get("adAnalysisUpdatedAt"))
            if started and started > stale_before:
                continue
        duration = float(data.get("adAnalysisDuration") or data.get("transcriptionDurationSeconds") or 0)
        if duration > MAX_DURATION:
            if status != "not_applicable" or version != PROMPT_VERSION:
                long_videos.append(row)
            continue
        eligible.append(row)
    eligible.sort(key=lambda row: (
        0 if not (row.get("data") or {}).get("adVisualAnalysis") else 1,
        str((row.get("data") or {}).get("adAnalysisUpdatedAt") or row.get("created_at") or ""),
        row["id"],
    ))
    return eligible[:MAX_ANALYSES], long_videos


def merge(token, card_id, before, after):
    patch = {key: after.get(key) if key in after else None for key in set(before) | set(after)
             if before.get(key) != after.get(key)}
    status, _ = request("POST", f"{SUPABASE_URL}/rest/v1/rpc/swipe_merge_offer_data",
                        {"p_id": card_id, "p_patch": patch}, token=token)
    if status in (400, 404):
        status, _ = request("PATCH", f"{SUPABASE_URL}/rest/v1/offers?id=eq.{card_id}",
                            {"data": after}, token=token)
    if status not in (200, 204):
        raise RuntimeError(f"gravação do card falhou: HTTP {status}")


def download_media(url, path, token):
    resolved = f"{APP_URL}{url}" if url.startswith("/") else url
    headers = {"User-Agent": "SwipeFEG-AdAnalysis/1.0"}
    if resolved.startswith(APP_URL):
        headers["Authorization"] = f"Bearer {token}"
        headers["Origin"] = APP_URL
    req = urllib.request.Request(resolved, headers=headers)
    with urllib.request.urlopen(req, timeout=180) as response, open(path, "wb") as output:
        while True:
            chunk = response.read(1 << 20)
            if not chunk:
                break
            output.write(chunk)


def probe_duration(path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path],
        check=True, capture_output=True, text=True, timeout=60,
    )
    return float(result.stdout.strip())


def contact_sheets(path, duration, directory):
    sheets = []
    thirds = [(0.0, duration / 3), (duration / 3, duration * 2 / 3), (duration * 2 / 3, duration)]
    for index, (start, end) in enumerate(thirds, 1):
        span = max(1.0, end - start)
        output = os.path.join(directory, f"sheet-{index}.jpg")
        vf = f"fps=12/{span:.3f},scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2:black,tile=4x3"
        subprocess.run(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", f"{start:.3f}", "-t", f"{span:.3f}",
             "-i", path, "-vf", vf, "-frames:v", "1", "-q:v", "6", "-y", output],
            check=True, timeout=180,
        )
        with open(output, "rb") as image:
            sheets.append({
                "mediaType": mimetypes.guess_type(output)[0] or "image/jpeg",
                "data": base64.b64encode(image.read()).decode("ascii"),
                "label": f"Linha do tempo visual {index}/3",
            })
    return sheets


def enqueue(token, card, duration, sheets):
    data = card["data"]
    body = {
        "cardId": card["id"], "name": data.get("nome") or data.get("nomeOriginal") or "NÃO INFORMADO",
        "niche": data.get("nicho") or "NÃO INFORMADO", "country": data.get("pais") or "NÃO INFORMADO",
        "language": data.get("transcricaoLang") or "NÃO INFORMADO", "platform": data.get("plataforma") or "NÃO INFORMADO",
        "duration": duration, "transcript": data.get("transcricao"),
        "segments": data.get("transcricaoSegments") if isinstance(data.get("transcricaoSegments"), list) else [],
        "contactSheets": sheets,
    }
    status, raw = request("POST", ANALYSIS_URL, body, token=token, timeout=60,
                          extra_headers={"Origin": APP_URL})
    result = json.loads(raw.decode("utf-8", "replace") or "{}")
    if status != 202 or not result.get("id"):
        raise RuntimeError(f"worker recusou a análise: HTTP {status}")
    return result["id"]


def main():
    missing = [name for name, value in (("SUPABASE_URL", SUPABASE_URL), ("SUPABASE_ANON_KEY", ANON),
                                        ("AUTENTICAÇÃO_DO_BOT", BOT_ACCESS_TOKEN or (BOT_EMAIL and BOT_PASSWORD))) if not value]
    if missing:
        raise RuntimeError(f"variáveis obrigatórias ausentes: {', '.join(missing)}")
    token = login()
    cards, long_videos = fetch_candidates(token)
    for card in long_videos:
        before = copy.deepcopy(card["data"])
        after = copy.deepcopy(before)
        after.update({
            "adAnalysisStatus": "not_applicable",
            "adAnalysisReason": "Vídeo acima de 10 minutos; reservado ao Dissecador de VSL.",
            "adAnalysisUpdatedAt": now_iso(), "adAnalysisPromptVersion": PROMPT_VERSION,
        })
        merge(token, card["id"], before, after)
    print(json.dumps({"event": "ad_analysis_scan", "eligible": len(cards),
                      "long_videos_excluded": len(long_videos), "at": now_iso()}), flush=True)
    queued = skipped = failed = 0
    for card in cards:
        data = card["data"]
        before = copy.deepcopy(data)
        try:
            with tempfile.TemporaryDirectory(prefix="swipe-ad-analysis-") as directory:
                path = os.path.join(directory, "creative-video")
                download_media(video_url(data), path, token)
                duration = probe_duration(path)
                if duration <= 0 or duration > MAX_DURATION:
                    data.update({
                        "adAnalysisStatus": "not_applicable", "adAnalysisDuration": round(duration, 3),
                        "adAnalysisReason": "Vídeo acima de 10 minutos; reservado ao Dissecador de VSL.",
                        "adAnalysisUpdatedAt": now_iso(), "adAnalysisPromptVersion": PROMPT_VERSION,
                    })
                    merge(token, card["id"], before, data)
                    skipped += 1
                    continue
                sheets = contact_sheets(path, duration, directory)
                job_id = enqueue(token, card, duration, sheets)
            data.update({
                "adAnalysisStatus": "queued", "adAnalysisJobId": job_id,
                "adAnalysisQueuedAt": now_iso(), "adAnalysisUpdatedAt": now_iso(),
                "adAnalysisDuration": round(duration, 3), "adAnalysisPromptVersion": PROMPT_VERSION,
                "adAnalysisError": "",
            })
            merge(token, card["id"], before, data)
            queued += 1
            print(json.dumps({"event": "ad_analysis_queued", "id": card["id"], "job": job_id,
                              "duration": round(duration, 2)}, ensure_ascii=False), flush=True)
            time.sleep(.4)
        except Exception as error:
            failed += 1
            retry_data = copy.deepcopy(before)
            retry_data.update({
                "adAnalysisStatus": "retry_scheduled", "adAnalysisUpdatedAt": now_iso(),
                "adAnalysisError": "Falha temporária; a automação tentará novamente.",
            })
            try:
                merge(token, card["id"], before, retry_data)
            except Exception:
                pass
            print(json.dumps({"event": "ad_analysis_failed", "id": card["id"],
                              "error_type": type(error).__name__}), flush=True)
    print(json.dumps({"event": "ad_analysis_run_completed", "queued": queued, "skipped": skipped,
                      "failed": failed, "at": now_iso()}), flush=True)


if __name__ == "__main__":
    main()
