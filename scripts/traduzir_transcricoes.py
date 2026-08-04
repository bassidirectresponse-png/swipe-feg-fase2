#!/usr/bin/env python3
"""Traduz para PT-BR as transcrições do Swipe de Criativos.

Mantém o texto original em ``transcricao`` e grava a tradução separadamente
em ``transcricaoPt``. A rotina é retomável, limitada e usa o mesmo serviço de
tradução do Transcritor, sem expor credenciais do provedor no GitHub Actions.
"""
import copy
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from runtime_config import supabase_public_config

SUPABASE_URL, ANON = supabase_public_config()
BOT_EMAIL = os.environ.get("SUPABASE_BOT_EMAIL", "")
BOT_PASSWORD = os.environ.get("SUPABASE_BOT_PASSWORD", "")
TRANSLATE_URL = os.environ.get("TRANSLATE_URL", "https://benchmarkinggrupofeg.site/.netlify/functions/translate-transcript")
MAX_TRANSLATIONS = max(1, int(os.environ.get("MAX_TRANSLATIONS", "80")))
TRANSLATE_KINDS = {
    value.strip() for value in os.environ.get("TRANSLATE_KINDS", "criativo,megabrain").split(",")
    if value.strip()
}
LOCK_MINUTES = max(10, int(os.environ.get("TRANSLATION_LOCK_MINUTES", "45")))
CHUNK_SIZE = 6000


def iso_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_iso(value):
    try:
        return datetime.fromisoformat(str(value or "").replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def request(method, url, body=None, token=None, timeout=60, extra_headers=None):
    headers = {"Content-Type": "application/json", "apikey": ANON}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if extra_headers:
        headers.update(extra_headers)
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
    rows, page_size, start = [], 1000, 0
    query = urllib.parse.urlencode({
        "select": "id,created_at,data",
        "order": "id.asc",
        "data->>kind": f"in.({','.join(sorted(TRANSLATE_KINDS))})",
    })
    while True:
        status, raw = request(
            "GET", f"{SUPABASE_URL}/rest/v1/offers?{query}", token=token,
            extra_headers={"Range-Unit": "items", "Range": f"{start}-{start + page_size - 1}"},
        )
        if status not in (200, 206):
            raise RuntimeError(f"leitura dos cards falhou: HTTP {status}")
        page = json.loads(raw)
        rows.extend(page)
        if len(page) < page_size:
            break
        start += page_size
    cards = []
    for row in rows:
        data = row.get("data") or {}
        if data.get("kind") not in TRANSLATE_KINDS:
            continue
        if not str(data.get("transcricao") or "").strip() or str(data.get("transcricaoPt") or "").strip():
            continue
        status_pt = str(data.get("transcricaoPtStatus") or "").lower()
        if status_pt in ("working", "processing"):
            started = parse_iso(data.get("transcricaoPtIniciadaEm"))
            if started and started > datetime.now(timezone.utc) - timedelta(minutes=LOCK_MINUTES):
                continue
        retry_at = str(data.get("transcricaoPtProximaTentativa") or "")
        if retry_at and retry_at > iso_now():
            continue
        cards.append(row)
    cards.sort(key=lambda row: (row.get("created_at") or "", row["id"]))
    return cards[:MAX_TRANSLATIONS]


def patch(token, card_id, before, data):
    changed = {
        key: data.get(key) if key in data else None
        for key in set(before) | set(data)
        if before.get(key) != data.get(key)
    }
    status, _ = request("POST", f"{SUPABASE_URL}/rest/v1/rpc/swipe_merge_offer_data",
                        {"p_id": card_id, "p_patch": changed}, token=token)
    if status in (400, 404):
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
    missing = [name for name, value in (
        ("SUPABASE_URL", SUPABASE_URL),
        ("SUPABASE_ANON_KEY", ANON),
        ("SUPABASE_BOT_EMAIL", BOT_EMAIL),
        ("SUPABASE_BOT_PASSWORD", BOT_PASSWORD),
    ) if not value]
    if missing:
        raise RuntimeError(f"variáveis obrigatórias ausentes: {', '.join(missing)}")
    token = login()
    cards = fetch_cards(token)
    print(json.dumps({"event": "translation_scan", "eligible": len(cards), "at": iso_now()}), flush=True)
    completed = failed = 0
    for index, card in enumerate(cards, 1):
        data = card["data"]
        card_id = card["id"]
        try:
            before_working = copy.deepcopy(data)
            data["transcricaoPtStatus"] = "working"
            data["transcricaoPtIniciadaEm"] = iso_now()
            data["transcricaoPtProximaTentativa"] = ""
            patch(token, card_id, before_working, data)
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
            before_completed = copy.deepcopy(data)
            data.update({
                "transcricaoPt": translated,
                "transcricaoPtLang": "pt-BR",
                "transcricaoPtStatus": "done",
                "transcricaoPtError": "",
                "transcricaoPtConcluidaEm": iso_now(),
                "transcricaoPtProximaTentativa": "",
                "transcricaoPtVersion": "1",
            })
            patch(token, card_id, before_completed, data)
            completed += 1
            print(json.dumps({"event": "translation_completed", "id": card_id, "position": index,
                              "total": len(cards), "characters": len(translated)}, ensure_ascii=False), flush=True)
        except Exception as error:
            failed += 1
            before_failure = copy.deepcopy(data)
            data.update({
                "transcricaoPtStatus": "retry_scheduled",
                "transcricaoPtError": "Falha temporária; uma nova tentativa será feita automaticamente.",
                "transcricaoPtProximaTentativa": (datetime.now(timezone.utc) + timedelta(hours=6)).isoformat().replace("+00:00", "Z"),
            })
            try:
                patch(token, card_id, before_failure, data)
            except Exception:
                pass
            print(json.dumps({"event": "translation_failed", "id": card_id,
                              "error_type": type(error).__name__}), flush=True)
    print(json.dumps({"event": "translation_run_completed", "completed": completed, "failed": failed,
                      "at": iso_now()}), flush=True)


if __name__ == "__main__":
    main()
