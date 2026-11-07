"""Turing room: curated table from raw/turing + config/turing.json, and the web export block.

turing_laureate: one row per person in config/turing.json: Wikidata facts, whether Wikidata records the award
                 in that year (wd_year_ok), whether the Wikipedia list has that QID in that year (wp_year_ok),
                 the portrait and its licence, and the Nobel prizes of the same QID (bridge to the Nobel rooms).
"""
from __future__ import annotations

import json

import pandas as pd

from common import CONFIG, CURATED, RAW

GENDER = {"Q6581097": "m", "Q6581072": "f"}


def _v(b: dict, k: str) -> str:
    return b.get(k, {}).get("value", "")


def _latest_with(name: str):
    dirs = sorted(d for d in (RAW / "turing").iterdir() if (d / name).exists()) if (RAW / "turing").exists() else []
    return json.loads((dirs[-1] / name).read_text(encoding="utf-8")) if dirs else None


def build(nobel_laureate: pd.DataFrame | None = None) -> dict[str, pd.DataFrame]:
    if not (CONFIG / "turing.json").exists() or _latest_with("laureates.json") is None:
        return {}
    cfg = json.loads((CONFIG / "turing.json").read_text(encoding="utf-8"))
    lau = _latest_with("laureates.json")
    wp = _latest_with("wikipedia.json")
    images = {}
    for d in sorted((RAW / "turing").iterdir()):
        if (d / "images.json").exists():
            images.update(json.loads((d / "images.json").read_text(encoding="utf-8")))
    facts: dict[str, dict] = {}
    for b in lau:
        q = _v(b, "item").rsplit("/", 1)[-1]
        f = facts.setdefault(q, {"years": set()})
        if _v(b, "year"):
            f["years"].add(int(_v(b, "year")[:4]))
        f.update({k: f.get(k) or val for k, val in {
            "name_en": _v(b, "en"), "name_he_wd": _v(b, "he") or None, "gender": GENDER.get(_v(b, "gender").rsplit("/", 1)[-1]),
            "countries_he": _v(b, "countries_he") or None, "birth": _v(b, "birth")[:10] or None, "death": _v(b, "death")[:10] or None,
            "enwiki": _v(b, "enwiki") or None, "hewiki": _v(b, "hewiki") or None}.items()})
    wp_years: dict[str, set] = {}
    if wp:
        for y, people in wp["rows"].items():
            for p in people:
                if p["qid"]:
                    wp_years.setdefault(p["qid"], set()).add(int(y))
    nobel = {}
    if nobel_laureate is not None and not nobel_laureate.empty:
        for r in nobel_laureate.dropna(subset=["qid"]).itertuples():
            nobel[r.qid] = r.nobel_id
    rows = []
    for e in cfg["entries"]:
        for q in e["qids"]:
            f = facts.get(q, {"years": set()})
            img = images.get(q, {})
            rows.append({"slug": e["slug"], "year": e["year"], "area": e["area"], "qid": q,
                         "name_en": f.get("name_en"), "name_he_wd": f.get("name_he_wd"), "gender": f.get("gender"),
                         "countries_he": f.get("countries_he"), "birth": f.get("birth"), "death": f.get("death"),
                         "enwiki": f.get("enwiki"), "hewiki": f.get("hewiki"),
                         "wd_year_ok": e["year"] in f["years"],
                         "wp_year_ok": (e["year"] in wp_years.get(q, set())) if wp else None,
                         "image": img.get("local"), "image_license": img.get("license"), "image_artist": img.get("artist"),
                         "image_page": img.get("page_url"), "nobel_id": nobel.get(q)})
    return {"turing_laureate": pd.DataFrame(rows)}


def export(prizes: list[dict] | None = None) -> dict | None:
    if not (CURATED / "turing_laureate.csv").exists():
        return None
    cfg = json.loads((CONFIG / "turing.json").read_text(encoding="utf-8"))
    ppl = pd.read_csv(CURATED / "turing_laureate.csv", dtype={"nobel_id": "string"}).astype(object).where(lambda d: d.notna(), None)
    nobel_prize = {}
    for p in prizes or []:
        nobel_prize.setdefault(p["id"], []).append({"y": p["y"], "f": p["f"]})
    wp = _latest_with("wikipedia.json")
    out = []
    for e in cfg["entries"]:
        ps = [p for p in ppl.to_dict("records") if p["slug"] == e["slug"]]
        out.append({"slug": e["slug"], "y": e["year"], "he": e["name_he"], "area": e["area"], "idea": e["idea_he"], "city": e["city_he"],
                    "people": [{"qid": p["qid"], "en": p["name_en"], "g": p["gender"], "c": p["countries_he"], "b": p["birth"], "d": p["death"],
                                "wiki": p["hewiki"] or p["enwiki"], "img": p["image"], "lic": p["image_license"], "by": p["image_artist"],
                                "page": p["image_page"], "wd": bool(p["wd_year_ok"]),
                                "nobel": [{"id": p["nobel_id"], **x} for x in nobel_prize.get(p["nobel_id"], [])] if p["nobel_id"] else []}
                               for p in ps]})
    return {"status": cfg["status"], "label": cfg["label"], "bias": cfg["bias_note"], "source": cfg["source_url"],
            "areas": cfg["areas"], "ai_waves": cfg["ai_waves"], "checked_wikipedia": bool(wp), "entries": out}
