#!/usr/bin/env python3
"""Captura PV, checkout e produto do lote de ofertas de 22/07/2026."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import urljoin

from playwright.sync_api import TimeoutError as PlaywrightTimeout
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "offers-july22"
CATALOG = ROOT / "scripts" / "offer_batch_july22_catalog.mjs"


def catalog():
    js = f"import {{offers}} from {json.dumps(CATALOG.as_uri())}; process.stdout.write(JSON.stringify(offers));"
    raw = subprocess.check_output(["node", "--input-type=module", "-e", js], text=True)
    return json.loads(raw)


def safe_goto(page, url: str) -> str:
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=45_000)
        page.wait_for_timeout(4_000)
        return page.url
    except PlaywrightTimeout:
        return page.url or url
    except Exception as exc:  # a captura visual do erro ainda é útil para auditoria
        print(f"  aviso ao abrir {url}: {exc}", flush=True)
        return page.url or url


def close_overlays(page):
    selectors = [
        "button:has-text('Accept')", "button:has-text('Accept all')",
        "button:has-text('I agree')", "button:has-text('Continue')",
        "button:has-text('Fechar')", "button:has-text('Close')",
        "[aria-label='Close']", "[aria-label='close']",
    ]
    for selector in selectors:
        try:
            loc = page.locator(selector).first
            if loc.is_visible(timeout=300):
                loc.click(timeout=1_000)
        except Exception:
            pass


def screenshot_page(page, path: Path):
    close_overlays(page)
    path.parent.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(path), type="jpeg", quality=82, full_page=False)


def product_screenshot(page, path: Path) -> bool:
    path.parent.mkdir(parents=True, exist_ok=True)
    candidates = page.locator("img")
    best = None
    best_score = -1.0
    try:
        count = min(candidates.count(), 160)
    except Exception:
        count = 0
    for index in range(count):
        loc = candidates.nth(index)
        try:
            info = loc.evaluate("""img => ({
              src: img.currentSrc || img.src || '', alt: img.alt || '',
              w: img.naturalWidth || 0, h: img.naturalHeight || 0,
              r: img.getBoundingClientRect().toJSON()
            })""")
            src = (info.get("src") or "").lower()
            alt = (info.get("alt") or "").lower()
            w, h = float(info.get("w") or 0), float(info.get("h") or 0)
            rw = float((info.get("r") or {}).get("width") or 0)
            rh = float((info.get("r") or {}).get("height") or 0)
            if min(w, h) < 120 or min(rw, rh) < 70:
                continue
            if any(token in src + " " + alt for token in ("logo", "icon", "avatar", "pixel", "badge", "star")):
                continue
            score = min(w * h, 2_000_000) + min(rw * rh, 500_000) * 2
            if any(token in src + " " + alt for token in ("product", "bottle", "pack", "supplement", "formula", "kit", "gumm")):
                score += 2_000_000
            if score > best_score:
                best, best_score = loc, score
        except Exception:
            continue
    if best is None:
        return False
    try:
        best.scroll_into_view_if_needed(timeout=3_000)
        page.wait_for_timeout(500)
        best.screenshot(path=str(path), type="jpeg", quality=88)
        return True
    except Exception:
        return False


def discover_checkout(page, base_url: str) -> str:
    try:
        urls = page.locator("a[href]").evaluate_all("els => els.map(a => a.href).filter(Boolean)")
    except Exception:
        urls = []
    try:
        html = page.content()
        urls += re.findall(r'https?://[^\"\'<>\\s]+', html)
    except Exception:
        pass
    wanted = ("checkout", "buygoods.com/secure", "mycartpanda.com", "/order", "/cart")
    for value in urls:
        full = urljoin(base_url, value)
        low = full.lower()
        if any(token in low for token in wanted) and "facebook.com" not in low:
            return full.replace("&amp;", "&")
    return ""


def main():
    only = set(sys.argv[1:])
    items = [item for item in catalog() if not only or item["slug"] in only]
    manifest_path = OUT / "manifest.json"
    try:
        manifest = json.loads(manifest_path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        manifest = {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 1050},
            locale="en-US",
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
        )
        page = context.new_page()
        for pos, item in enumerate(items, 1):
            slug = item["slug"]
            print(f"[{pos}/{len(items)}] {item['name']}", flush=True)
            folder = OUT / slug
            folder.mkdir(parents=True, exist_ok=True)
            primary = item["domains"][0]
            final_pv = safe_goto(page, primary["offer"])
            screenshot_page(page, folder / "pv.jpg")
            product_ok = product_screenshot(page, folder / "product.jpg")
            checkout = primary.get("checkout") or discover_checkout(page, final_pv)
            if checkout:
                final_checkout = safe_goto(page, checkout)
                screenshot_page(page, folder / "checkout.jpg")
                if not product_ok:
                    product_ok = product_screenshot(page, folder / "product.jpg")
            else:
                final_checkout = ""
                print("  checkout não localizado automaticamente", flush=True)
            if not product_ok:
                # Fallback visual: mantém uma imagem real da própria oferta no card.
                screenshot_page(page, folder / "product.jpg")
            manifest[slug] = {
                "pvFinalUrl": final_pv,
                "checkoutFinalUrl": final_checkout,
                "discoveredCheckout": checkout if not primary.get("checkout") else "",
                "pv": f"/assets/offers-july22/{slug}/pv.jpg",
                "checkout": f"/assets/offers-july22/{slug}/checkout.jpg" if checkout else "",
                "product": f"/assets/offers-july22/{slug}/product.jpg",
            }
        browser.close()
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"ok": True, "offers": len(items), "manifest": str(manifest_path)}), flush=True)


if __name__ == "__main__":
    main()
