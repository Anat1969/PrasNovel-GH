"""Read-only access to curated tables and insight cards for the app."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from insights_lib import load_cards, validate_card  # noqa: E402

CURATED = ROOT / "curated"

FIELDS = {
    "physics": ("פיזיקה", "Physics"),
    "chemistry": ("כימיה", "Chemistry"),
    "medicine": ("רפואה", "Physiology or Medicine"),
    "economics": ("כלכלה", "Economic Sciences"),
    "peace": ("שלום", "Peace"),
    "literature": ("ספרות", "Literature"),
}
# Named palette tokens: one hue per field on a quiet base.
FIELD_COLOR = {
    "physics": "#2F5D8A",     # כחול-מעבדה
    "chemistry": "#2E7D6B",   # ירוק-מבחנה
    "medicine": "#A2453D",    # אדום-תא
    "economics": "#8A6A1F",   # זהב-מטבע
    "peace": "#5B4B8A",       # סגול-אמנה
    "literature": "#6B6B6B",  # אפור-דיו
}
CONTINENT_HE = {
    "Europe": "אירופה", "North America": "צפון אמריקה", "Asia": "אסיה", "Africa": "אפריקה",
    "Oceania": "אוקיאניה", "South America": "דרום אמריקה",
}


def load():
    lau = pd.read_csv(CURATED / "laureate.csv", dtype=str)
    prz = pd.read_csv(CURATED / "prize.csv", dtype={"nobel_id": str})
    aff = pd.read_csv(CURATED / "affiliation.csv", dtype={"nobel_id": str})
    edge = pd.read_csv(CURATED / "edge.csv", dtype=str) if (CURATED / "edge.csv").exists() else pd.DataFrame()
    sel = json.loads((ROOT / "config" / "selection.json").read_text(encoding="utf-8"))
    for c in ("birth_lat", "birth_lon"):
        lau[c] = pd.to_numeric(lau[c], errors="coerce")
    lau["is_org"] = lau["is_org"].astype(int)
    full = prz.merge(lau, on="nobel_id", how="left")
    cards = {c["nobel_id"]: {**c, "problems": validate_card(c)} for c in load_cards(ROOT / "insights")}
    return lau, prz, aff, edge, sel, full, cards
