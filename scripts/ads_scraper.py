#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Atualizador de "anúncios ativos" das ofertas do dashboard Swipe FEG.

Para cada oferta da FEG DR ou FEG Brands de tráfego Meta que tenha bibliotecas de
anúncios (data.bibliotecas), abre cada link da Biblioteca de Anúncios do Meta
num Chromium headless (Playwright), lê o contador "X resultados" e SOMA os
anúncios ativos de todas as bibliotecas da oferta. Grava de volta no Supabase:

  data.numAdsAtivos   -> total atual (string, compatível com o app)
  data.adsUpdatedAt   -> timestamp ISO da última atualização
  data.adsHistory     -> [{d:"AAAA-MM-DD", n:<int>}, ...] 1 ponto/dia (p/ o gráfico)

Regras de segurança:
  - só faz UPDATE do próprio campo de ads (lê o data inteiro e reescreve);
  - se TODAS as bibliotecas de uma oferta falharem, NÃO sobrescreve (mantém o
    valor anterior) — para não perder dado bom por causa de um bloqueio pontual;
  - login como bot de baixo privilégio (mesma credencial da automação de notícias).

Só depende de Playwright; o resto é biblioteca padrão.

Env:
  SUPABASE_URL, SUPABASE_ANON_KEY (têm default)
  SUPABASE_BOT_EMAIL, SUPABASE_BOT_PASSWORD (obrigatórias p/ gravar)
  DRY_RUN=1        (não grava; só mostra o que leria)
  HISTORY_DAYS=60  (quantos pontos de histórico manter por oferta)
"""
import os, sys, re, json, time, urllib.request, urllib.error, uuid
from datetime import datetime, timedelta, timezone

from playwright.sync_api import sync_playwright

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://ppaajtzbhjixhyfidojd.supabase.co").rstrip("/")
ANON = os.environ.get(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwYWFqdHpiaGppeGh5Zmlkb2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMDkzNTcsImV4cCI6MjA5Njc4NTM1N30.uoC_3EHM_dfmkBHJYjPvlaC7DqkJziunz-tug0ItAJc",
)
BOT_EMAIL = os.environ.get("SUPABASE_BOT_EMAIL", "")
BOT_PASSWORD = os.environ.get("SUPABASE_BOT_PASSWORD", "")
DRY_RUN = os.environ.get("DRY_RUN", "") in ("1", "true", "yes")
HISTORY_DAYS = int(os.environ.get("HISTORY_DAYS", "60"))
MAX_OFFERS = max(1, int(os.environ.get("MAX_OFFERS", "200")))
MAX_ATTEMPTS = max(1, int(os.environ.get("MAX_ANALYSIS_ATTEMPTS", "6")))
LOCK_MINUTES = max(10, int(os.environ.get("ANALYSIS_LOCK_MINUTES", "90")))
ANALYSIS_VERSION = os.environ.get("ANALYSIS_VERSION", "1")
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

# regex do contador (PT/FR/EN/ES/DE/IT) — portado do repo de referência
COUNT_PATTERNS = [
    r"~?\s*([\d., \s]+)\s+r[eé]sultats?",
    r"~?\s*([\d., \s]+)\s+resultados?",
    r"(?:about\s+|~)?\s*([\d., \s]+)\s+results?",
    r"~?\s*([\d., \s]+)\s+ergebnisse",
    r"~?\s*([\d., \s]+)\s+risultati",
]
EMPTY_PATTERNS = re.compile(
    r"(no\s+ads\s+match|aucune?\s+annonce|nenhum\s+an[uú]ncio|"
    r"ning[uú]n\s+anuncio|nessun\s+annuncio|keine\s+anzeigen)",
    re.IGNORECASE,
)


def parse_count(text):
    for pattern in COUNT_PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            digits = re.sub(r"\D", "", m.group(1))
            if digits:
                return int(digits)
    return None


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


def fetch_offers(token):
    status, txt = sb("GET", "/rest/v1/offers?select=id,data", token=token)
    if status != 200:
        raise RuntimeError(f"erro ao ler ofertas: HTTP {status} {txt[:200]}")
    return json.loads(txt)


def eligible(row):
    """Oferta Meta da FEG DR/Brands, com pelo menos uma biblioteca."""
    d = row.get("data") or {}
    if d.get("kind", "oferta") not in ("oferta", "brandsgeneral", "brandsvalidated"):
        return None
    if d.get("tipoTrafego", "meta") != "meta":
        return None
    links = [b.get("link", "").strip() for b in (d.get("bibliotecas") or []) if b.get("link")]
    links = [l for l in links if l]
    if not links:
        return None
    status = str(d.get("analysisStatus") or "").lower()
    attempts = max(0, int(d.get("analysisAttempts") or 0))
    now = datetime.now(timezone.utc)
    next_retry = parse_iso(d.get("analysisNextRetryAt"))
    if next_retry and next_retry > now:
        return None
    started = parse_iso(d.get("analysisStartedAt"))
    if status == "processing" and started and started > now - timedelta(minutes=LOCK_MINUTES):
        return None
    if status == "failed" and attempts >= MAX_ATTEMPTS:
        return None
    return links


# =============================== scraping ==================================
def scrape_one(page, url, retries=2):
    last = None
    for attempt in range(retries + 1):
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
            try:
                page.wait_for_load_state("networkidle", timeout=20000)
            except Exception:
                pass
            page.wait_for_timeout(2500)
            text = page.locator("body").inner_text()
            count = parse_count(text)
            if count is not None:
                return count
            page.wait_for_timeout(5000)
            text = page.locator("body").inner_text()
            count = parse_count(text)
            if count is not None:
                return count
            if EMPTY_PATTERNS.search(text):
                return 0
            last = "contador não encontrado"
        except Exception as e:
            last = str(e)[:160]
        if attempt < retries:
            print(f"     tentativa {attempt+1} falhou: {last}", file=sys.stderr)
            time.sleep(3)
    print(f"     desisti: {last}", file=sys.stderr)
    return None


# =============================== histórico =================================
def update_history(data, total, now):
    today = now.strftime("%Y-%m-%d")
    hist = data.get("adsHistory")
    if not isinstance(hist, list):
        hist = []
    hist = [h for h in hist if isinstance(h, dict) and h.get("d")]
    # Cards de Brands anteriores à automação já têm total/data conferidos à mão.
    # Preserva essa leitura como ponto inicial para o gráfico não perder contexto.
    if not hist and data.get("adsLibraryCheckedAt") and data.get("numAdsAtivos") is not None:
        try:
            checked = datetime.strptime(str(data["adsLibraryCheckedAt"]).strip(), "%d/%m/%Y").strftime("%Y-%m-%d")
            previous = int(re.sub(r"\D", "", str(data["numAdsAtivos"])))
            if checked != today:
                hist.append({"d": checked, "n": previous})
        except (TypeError, ValueError):
            pass
    if hist and hist[-1].get("d") == today:
        hist[-1]["n"] = total            # mesma data -> atualiza o ponto do dia
    else:
        hist.append({"d": today, "n": total})
    if len(hist) > HISTORY_DAYS:
        hist = hist[-HISTORY_DAYS:]
    return hist


# =============================== main ======================================
def main():
    run_started = time.monotonic()
    now = datetime.now(timezone.utc)
    log("library_analysis_run_started", dry_run=DRY_RUN, version=ANALYSIS_VERSION)

    if not DRY_RUN and not (BOT_EMAIL and BOT_PASSWORD):
        print("ERRO: defina SUPABASE_BOT_EMAIL e SUPABASE_BOT_PASSWORD (ou DRY_RUN=1).", file=sys.stderr)
        sys.exit(2)

    token = bot_login() if not DRY_RUN else None
    if DRY_RUN:
        # em dry-run ainda precisamos ler; login opcional se as credenciais existirem
        token = bot_login() if (BOT_EMAIL and BOT_PASSWORD) else None
        if token is None:
            print("DRY_RUN sem credenciais: não consigo ler ofertas (RLS). Defina SUPABASE_BOT_* mesmo em dry-run.", file=sys.stderr)
            sys.exit(2)

    rows = fetch_offers(token)
    targets = []
    for row in rows:
        links = eligible(row)
        if links:
            targets.append((row, links))
    targets = targets[:MAX_OFFERS]
    log("library_analysis_scan", rows=len(rows), eligible=len(targets), max_offers=MAX_OFFERS)

    ok = fail = skipped = 0
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=[
            "--disable-blink-features=AutomationControlled", "--no-sandbox",
        ])
        ctx = browser.new_context(
            user_agent=("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                        "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"),
            viewport={"width": 1366, "height": 800}, locale="en-US",
        )
        page = ctx.new_page()

        for i, (row, links) in enumerate(targets, 1):
            data = row["data"]
            nome = data.get("nomeOferta", "?")
            attempts = 1 if str(data.get("analysisStatus") or "") == "completed" else max(0, int(data.get("analysisAttempts") or 0)) + 1
            data["analysisStatus"] = "processing"
            data["analysisAttempts"] = attempts
            data["analysisStartedAt"] = iso_now()
            data["analysisCompletedAt"] = ""
            data["analysisLastError"] = ""
            data["analysisNextRetryAt"] = ""
            data["analysisVersion"] = ANALYSIS_VERSION
            if not DRY_RUN:
                reserve_status, _ = sb("PATCH", f"/rest/v1/offers?id=eq.{row['id']}", token=token, body={"data": data}, prefer="return=minimal")
                if reserve_status not in (200, 204):
                    fail += 1
                    log("library_analysis_reservation_failed", offer_id=row["id"], http_status=reserve_status)
                    continue
            log("library_analysis_job_started", offer_id=row["id"], position=i, total=len(targets), name=nome[:80], libraries=len(links), attempt=attempts)
            counts, any_ok = [], False
            for j, link in enumerate(links, 1):
                c = scrape_one(page, link)
                if c is None:
                    print(f"   lib {j}: falhou")
                else:
                    any_ok = True
                    counts.append(c)
                    print(f"   lib {j}: {c} ads")
            if not any_ok:
                final = attempts >= MAX_ATTEMPTS
                delay_minutes = min(12 * 60, 20 * (2 ** max(0, attempts - 1)))
                data["analysisStatus"] = "failed" if final else "retry_scheduled"
                data["analysisLastError"] = "library_unavailable"
                data["analysisNextRetryAt"] = "" if final else (now + timedelta(minutes=delay_minutes)).isoformat().replace("+00:00", "Z")
                if not DRY_RUN:
                    sb("PATCH", f"/rest/v1/offers?id=eq.{row['id']}", token=token, body={"data": data}, prefer="return=minimal")
                log("library_analysis_job_failed", offer_id=row["id"], attempt=attempts, final=final, retry_in_minutes=0 if final else delay_minutes)
                fail += 1
                continue

            total = sum(counts)
            prev = data.get("numAdsAtivos")
            data["numAdsAtivos"] = str(total)
            data["adsUpdatedAt"] = now.isoformat()
            data["adsHistory"] = update_history(data, total, now)
            data["analysisStatus"] = "completed"
            data["analysisCompletedAt"] = iso_now()
            data["analysisLastError"] = ""
            data["analysisNextRetryAt"] = ""
            if data.get("kind") in ("brandsgeneral", "brandsvalidated"):
                data["adsLibraryCheckedAt"] = now.strftime("%d/%m/%Y")
                data["adsLibraryApprox"] = False
            print(f"   => total {total} ads (antes: {prev!r})")

            if DRY_RUN:
                skipped += 1
                continue
            status, txt = sb("PATCH", f"/rest/v1/offers?id=eq.{row['id']}",
                             token=token, body={"data": data}, prefer="return=minimal")
            if status in (200, 204):
                ok += 1
                log("library_analysis_job_completed", offer_id=row["id"], active_ads=total, libraries_succeeded=len(counts), attempts=attempts)
            else:
                print(f"   ERRO ao gravar: HTTP {status} {txt[:160]}", file=sys.stderr)
                fail += 1

        browser.close()

    log("library_analysis_run_completed", completed=ok, failed=fail, dry_run=skipped, duration_ms=round((time.monotonic() - run_started) * 1000))
    if targets and fail / len(targets) > 0.5:
        sys.exit(1)


if __name__ == "__main__":
    main()
