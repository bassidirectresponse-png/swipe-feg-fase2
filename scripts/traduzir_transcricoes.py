#!/usr/bin/env python3
"""Traduz para PT-BR as transcrições do Swipe de Criativos.

Mantém o texto original em ``transcricao`` e grava a tradução separadamente
em ``transcricaoPt``. A rotina é retomável, limitada e usa o mesmo serviço de
tradução do Transcritor, sem expor credenciais do provedor no GitHub Actions.
"""
import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://ppaajtzbhjixhyfidojd.supabase.co").rstrip("/")
ANON = os.environ.get(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwYWFqdHpiaGppeGh5Zmlkb2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMDkzNTcsImV4cCI6MjA5Njc4NTM1N30.uoC_3EHM_dfmkBHJYjPvlaC7DqkJziunz-tug0ItAJc",
)
BOT_EMAIL = os.environ.get("SUPABASE_BOT_EMAIL", "")
BOT_PASSWORD = os.environ.get("SUPABASE_BOT_PASSWORD", "")
TRANSLATE_URL = os.environ.get("TRANSLATE_URL", "https://benchmarkinggrupofeg.site/.netlify/functions/translate-transcript")
MAX_TRANSLATIONS = max(1, int(os.environ.get("MAX_TRANSLATIONS", "80")))
CHUNK_SIZE = 6000


def iso_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def request(method, url, body=None, token=None, timeout=60):
    headers = {"Content-Type": "application/json", "apikey": ANON}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.status, response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", "replace")


def login():
    status, raw = request("POST", f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
                          {"email": BOT_EMAIL, "password": BOT_PASSWORD})
    if status != 200:
        raise RuntimeError(f"login do bot falhou: HTTP {status}")
    return json.loads(raw)["access_token"]


def fetch_cards(token):
    status, raw = request("GET", f"{SUPABASE_URL}/rest/v1/offers?select=id,created_at,data", token=token)
    if status != 200:
        raise RuntimeError(f"leitura dos cards falhou: HTTP {status}")
    cards = []
    for row in json.loads(raw):
        data = row.get("data") or {}
        if data.get("kind") != "criativo":
            continue
        if not str(data.get("transcricao") or "").strip() or str(data.get("transcricaoPt") or "").strip():
            continue
        status_pt = str(data.get("transcricaoPtStatus") or "").lower()
        if status_pt in ("working", "processing"):
            continue
        retry_at = str(data.get("transcricaoPtProximaTentativa") or "")
        if retry_at and retry_at > iso_now():
            continue
        cards.append(row)
    cards.sort(key=lambda row: (row.get("created_at") or "", row["id"]))
    return cards[:MAX_TRANSLATIONS]


def patch(token, card_id, data):
    status, _ = request("PATCH", f"{SUPABASE_URL}/rest/v1/offers?id=eq.{card_id}",
                        {"data": data}, token=token)
    if status not in (200, 204):
        raise RuntimeError(f"gravação falhou: HTTP {status}")


def chunks(value):
    text = str(value or "").strip()
    output = []
    while text:
        if len(text) <= CHUNK_SIZE:
            output.append(text)
            break
        end = CHUNK_SIZE
        floor = int(CHUNK_SIZE * .58)
        window = text[floor:end]
        cuts = [window.rfind("\n\n"), window.rfind(". "), window.rfind("! "), window.rfind("? ")]
        best = max(cuts)
        if best >= 0:
            end = floor + best + 2
        output.append(text[:end].strip())
        text = text[end:].strip()
    return [part for part in output if part]


def translate_part(token, text, language, part, total):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
        "Origin": "https://benchmarkinggrupofeg.site",
    }
    payload = json.dumps({"text": text, "language": language, "part": part, "total": total}).encode("utf-8")
    for attempt in range(2):
        req = urllib.request.Request(TRANSLATE_URL, data=payload, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=120) as response:
                result = json.loads(response.read().decode("utf-8", "replace"))
                value = str(result.get("translation") or "").strip()
                if value:
                    return value
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError):
            if attempt == 0:
                time.sleep(2)
    raise RuntimeError("serviço de tradução temporariamente indisponível")


def main():
    if not (BOT_EMAIL and BOT_PASSWORD):
        raise RuntimeError("credenciais do bot não configuradas")
    token = login()
    cards = fetch_cards(token)
    print(json.dumps({"event": "translation_scan", "eligible": len(cards), "at": iso_now()}), flush=True)
    completed = failed = 0
    for index, card in enumerate(cards, 1):
        data = card["data"]
        card_id = card["id"]
        try:
            data["transcricaoPtStatus"] = "working"
            patch(token, card_id, data)
            original = str(data["transcricao"]).strip()
            language = str(data.get("transcricaoLang") or "")
            if language.lower().startswith(("pt", "portugu")):
                translated = original
            else:
                parts = chunks(original)
                translated = "\n\n".join(
                    translate_part(token, value, language, part_index, len(parts))
                    for part_index, value in enumerate(parts, 1)
                ).strip()
            if not translated:
                raise RuntimeError("tradução vazia")
            data.update({
                "transcricaoPt": translated,
                "transcricaoPtLang": "pt-BR",
                "transcricaoPtStatus": "done",
                "transcricaoPtError": "",
                "transcricaoPtConcluidaEm": iso_now(),
                "transcricaoPtVersion": "1",
            })
            patch(token, card_id, data)
            completed += 1
            print(json.dumps({"event": "translation_completed", "id": card_id, "position": index,
                              "total": len(cards), "characters": len(translated)}, ensure_ascii=False), flush=True)
        except Exception as error:
            failed += 1
            data.update({
                "transcricaoPtStatus": "retry_scheduled",
                "transcricaoPtError": "Falha temporária; uma nova tentativa será feita automaticamente.",
                "transcricaoPtProximaTentativa": (datetime.now(timezone.utc) + timedelta(hours=6)).isoformat().replace("+00:00", "Z"),
            })
            try:
                patch(token, card_id, data)
            except Exception:
                pass
            print(json.dumps({"event": "translation_failed", "id": card_id,
                              "error_type": type(error).__name__}), flush=True)
    print(json.dumps({"event": "translation_run_completed", "completed": completed, "failed": failed,
                      "at": iso_now()}), flush=True)


if __name__ == "__main__":
    main()
