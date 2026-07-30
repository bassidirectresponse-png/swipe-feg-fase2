#!/usr/bin/env python3
"""Captura PV, checkout e produto do lote consolidado de 29/07/2026."""

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = spec_from_file_location("capture_base", ROOT / "scripts" / "capture_offer_batch_july22.py")
base = module_from_spec(spec)
spec.loader.exec_module(base)
base.OUT = ROOT / "assets" / "offers-july29"
base.CATALOG = ROOT / "scripts" / "offer_batch_july29_catalog.mjs"

if __name__ == "__main__":
    base.main()
