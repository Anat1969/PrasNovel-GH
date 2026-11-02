"""Shared helpers: paths, raw storage, HTTP with retry."""
from __future__ import annotations

import datetime as dt
import json
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "raw"
CURATED = ROOT / "curated"
CONFIG = ROOT / "config"
INSIGHTS = ROOT / "insights"
DB_PATH = CURATED / "prasnovel.db"

USER_AGENT = "PrasNovel/0.1 (personal research tool; https://github.com/Anat1969/PrasNovel-GH)"


def utc_stamp() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def save_raw(source: str, name: str, payload, stamp: str) -> Path:
    """Write a raw payload once. Raw files are never edited afterwards."""
    folder = RAW / source / stamp
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{name}.json"
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    return path


def latest_raw_dir(source: str) -> Path:
    base = RAW / source
    dirs = sorted(p for p in base.iterdir() if p.is_dir()) if base.exists() else []
    if not dirs:
        raise FileNotFoundError(f"No raw snapshot for '{source}'. Run the fetch script first.")
    return dirs[-1]


def http_get(url: str, params: dict | None = None, headers: dict | None = None, tries: int = 5):
    h = {"User-Agent": USER_AGENT, **(headers or {})}
    delay = 2
    for attempt in range(tries):
        try:
            r = requests.get(url, params=params, headers=h, timeout=60)
            if r.status_code == 200:
                return r
            if r.status_code not in (429, 500, 502, 503, 504):
                r.raise_for_status()
        except requests.RequestException:
            if attempt == tries - 1:
                raise
        time.sleep(delay)
        delay *= 2
    raise RuntimeError(f"GET failed after {tries} tries: {url}")
