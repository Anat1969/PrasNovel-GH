"""Insight cards: Markdown files with a YAML front matter (SPEC section 5, CLAUDE.md rule 2)."""
from __future__ import annotations

import re
from pathlib import Path

import yaml

LABELS = {"עובדה", "הערכה", "הנחה"}
STATUSES = {"טיוטה", "מאושר"}
MAX_QUOTE_WORDS = 15
REQUIRED_TEXT = {
    "idea_he": "חסר: הרעיון במשפט אחד",
    "method_he": "חסר: ההרגל או השיטה",
    "takeaway_he": "חסר: מה לוקחים לעבודה",
    "bias_note": "חסר: שדה הטיה",
}
URL = re.compile(r"^https?://\S+$")


def parse_card(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n?(.*)$", text, re.S)
    if not m:
        raise ValueError(f"{path.name}: missing front matter")
    meta = yaml.safe_load(m.group(1)) or {}
    meta["body"] = m.group(2).strip()
    meta["path"] = path
    return meta


def load_cards(folder: Path) -> list[dict]:
    return [parse_card(p) for p in sorted(folder.glob("*.md")) if not p.name.startswith("_")]


def quote_words(quote: str) -> int:
    return len(re.findall(r"\S+", quote or ""))


def validate_card(card: dict) -> list[str]:
    """Return problems. An empty list means the card is ready ('מאושר')."""
    problems = []
    for key, msg in REQUIRED_TEXT.items():
        if not str(card.get(key) or "").strip():
            problems.append(msg)
    if not URL.match(str(card.get("method_source") or "")):
        problems.append("חסר: מקור (URL) לשיטה")
    label = card.get("label")
    if label not in LABELS:
        problems.append("חסרה תווית: עובדה / הערכה / הנחה")
    quote = str(card.get("quote") or "").strip()
    if not quote:
        problems.append("חסר: ציטוט קצר")
    elif quote_words(quote) > MAX_QUOTE_WORDS:
        problems.append(f"ציטוט ארוך מ-{MAX_QUOTE_WORDS} מילים")
    if quote and not URL.match(str(card.get("quote_source") or "")):
        problems.append("חסר: קישור לציטוט")
    if card.get("status") not in STATUSES:
        problems.append("סטטוס לא תקין")
    elif card.get("status") != "מאושר":
        problems.append("ממתין לעריכה ואישור של ענת")
    return problems


def hard_errors(card: dict) -> list[str]:
    """Rule breaks that must fail the build even for drafts (copyright, labels)."""
    errors = []
    if quote_words(str(card.get("quote") or "")) > MAX_QUOTE_WORDS:
        errors.append("quote longer than 15 words")
    if card.get("label") not in LABELS | {None, ""}:
        errors.append("unknown label")
    if card.get("status") == "מאושר" and validate_card(card):
        errors.append("card marked approved but incomplete")
    return errors
