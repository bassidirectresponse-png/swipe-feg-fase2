#!/usr/bin/env python3
"""Confere o total atual de anúncios das bibliotecas do lote de ofertas."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

from ads_scraper import scrape_one


ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "scripts" / "offer_batch_july22_catalog.mjs"


def catalog():
    code = (
        f'import {{offers}} from {json.dumps(CATALOG.as_uri())}; '
        "process.stdout.write(JSON.stringify(offers));"
    )
    return json.loads(
        subprocess.check_output(["node", "--input-type=module", "-e", code], text=True)
    )


def main():
    only = set(sys.argv[1:])
    items = [item for item in catalog() if not only or item["slug"] in only]
    result = {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
        )
        context = browser.new_context(
            locale="en-US",
            viewport={"width": 1366, "height": 800},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/138.0.0.0 Safari/537.36"
            ),
        )
        page = context.new_page()
        for item in items:
            counts = []
            print(f"{item['name']}:", flush=True)
            for library in item.get("libraries", []):
                count = scrape_one(page, library["link"])
                print(f"  {library.get('label') or library.get('name') or 'Biblioteca'}: {count}", flush=True)
                if count is not None:
                    counts.append(count)
            result[item["slug"]] = sum(counts) if counts else None
        browser.close()
    print(json.dumps(result, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
