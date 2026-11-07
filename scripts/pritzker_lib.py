"""Pritzker room: curated tables from raw/pritzker + config/pritzker.json, and the web export block.

pritzker_entry:    one row per official list entry (year + names): the chosen key work, its image and licence.
pritzker_laureate: one row per person: Wikidata facts (gender, citizenship, birth, death, labels).
Years come from Wikidata P166/P585 and are checked against the official list; any mismatch is kept and flagged.
"""
from __future__ import annotations

import json

import pandas as pd

from common import CONFIG, CURATED, RAW, latest_raw_dir

GENDER = {"Q6581097": "m", "Q6581072": "f"}


def _v(b: dict, k: str) -> str:
    return b.get(k, {}).get("value", "")


def build() -> dict[str, pd.DataFrame]:
    if not (RAW / "pritzker").exists() or not (CONFIG / "pritzker.json").exists():
        return {}
    cfg = json.loads((CONFIG / "pritzker.json").read_text(encoding="utf-8"))
    raw = latest_raw_dir("pritzker")
    lau = json.loads((raw / "laureates.json").read_text(encoding="utf-8"))
    works = json.loads((raw / "works.json").read_text(encoding="utf-8"))
    official = json.loads((raw / "official.json").read_text(encoding="utf-8"))["entries"]
    # images.json may sit in an older or newer snapshot (it is fetched in GitHub Actions)
    images = {}
    for d in sorted((RAW / "pritzker").iterdir()):
        if (d / "images.json").exists():
            images.update(json.loads((d / "images.json").read_text(encoding="utf-8")))

    facts: dict[str, dict] = {}
    for b in lau:
        q = _v(b, "item").rsplit("/", 1)[-1]
        f = facts.setdefault(q, {"qid": q, "years": set(), "types": set()})
        if _v(b, "year"):
            f["years"].add(int(_v(b, "year")[:4]))
        f["types"].add(_v(b, "type").rsplit("/", 1)[-1])
        f.update({"name_en": _v(b, "en"), "name_he_wd": _v(b, "he") or None,
                  "gender": GENDER.get(_v(b, "gender").rsplit("/", 1)[-1]),
                  "countries_he": _v(b, "countries_he") or None, "countries_en": _v(b, "countries_en") or None,
                  "birth": _v(b, "birth")[:10] or None, "death": _v(b, "death")[:10] or None,
                  "enwiki": _v(b, "enwiki") or None, "hewiki": _v(b, "hewiki") or None})
    work = {}
    for b in works:
        w = _v(b, "work").rsplit("/", 1)[-1]
        rec = work.setdefault(w, {"archs": set(), "en": _v(b, "en"), "he": _v(b, "he") or None,
                                  "place_en": _v(b, "placeEn") or None, "place_he": _v(b, "placeHe") or None,
                                  "inception": _v(b, "inception")[:4] or None, "coord": _v(b, "coord") or None})
        rec["archs"].add(_v(b, "arch").rsplit("/", 1)[-1])

    off_years = {}
    for o in official:
        off_years.setdefault(o["year"], []).append(o["name"])

    entries, people = [], []
    for e in cfg["entries"]:
        y = e["year"]
        names = off_years.get(y, [])
        wk = work.get(e["work"] or "", {})
        img = images.get(e["slug"], {})
        entries.append({
            "slug": e["slug"], "year": y, "official_names": " | ".join(names) or None,
            "firm_qid": e.get("firm"), "work_qid": e.get("work"),
            "work_en": wk.get("en"), "work_he": wk.get("he"), "work_place_en": wk.get("place_en"),
            "work_place_he": wk.get("place_he"), "work_year": wk.get("inception"),
            "work_by_laureate": bool(wk) and bool(wk["archs"] & set(e["qids"] + ([e["firm"]] if e.get("firm") else []))),
            "image": img.get("local"), "image_license": img.get("license"), "image_artist": img.get("artist"),
            "image_page": img.get("page_url"),
        })
        for q in e["qids"]:
            f = facts.get(q, {})
            people.append({"slug": e["slug"], "year": y, "qid": q, "name_en": f.get("name_en"),
                           "name_he_wd": f.get("name_he_wd"), "gender": f.get("gender"),
                           "countries_he": f.get("countries_he"), "countries_en": f.get("countries_en"),
                           "birth": f.get("birth"), "death": f.get("death"),
                           "wd_years": "|".join(str(x) for x in sorted(f.get("years", []))) or None,
                           "year_ok": y in f.get("years", set()), "enwiki": f.get("enwiki"), "hewiki": f.get("hewiki")})
    return {"pritzker_entry": pd.DataFrame(entries), "pritzker_laureate": pd.DataFrame(people)}


def export() -> dict | None:
    """The 'pritzker' block of data.json: curated facts + Anat's (draft) text from config."""
    if not (CURATED / "pritzker_entry.csv").exists():
        return None
    cfg = json.loads((CONFIG / "pritzker.json").read_text(encoding="utf-8"))
    ent = pd.read_csv(CURATED / "pritzker_entry.csv").astype(object).where(lambda d: d.notna(), None)
    ppl = pd.read_csv(CURATED / "pritzker_laureate.csv").astype(object).where(lambda d: d.notna(), None)
    text = {e["slug"]: e for e in cfg["entries"]}
    out = []
    for r in ent.to_dict("records"):
        t = text[r["slug"]]
        ps = [p for p in ppl.to_dict("records") if p["slug"] == r["slug"]]
        out.append({
            "slug": r["slug"], "y": int(r["year"]), "he": t["name_he"], "en": r["official_names"],
            "idea": t["idea_he"], "city": t["city_he"],
            "people": [{"qid": p["qid"], "en": p["name_en"], "g": p["gender"], "c": p["countries_he"],
                        "b": p["birth"], "d": p["death"], "wiki": p["hewiki"] or p["enwiki"]} for p in ps],
            "work": None if not r["work_qid"] else {
                "qid": r["work_qid"], "en": r["work_en"], "he": t.get("work_he") or r["work_he"],
                "place": t.get("place_he") or r["work_place_he"] or r["work_place_en"],
                "y": r["work_year"], "img": r["image"], "lic": r["image_license"], "by": r["image_artist"], "page": r["image_page"]},
        })
    return {"status": cfg["status"], "label": cfg["label"], "bias": cfg["bias_note"], "source": cfg["source_url"],
            "snapshot": latest_raw_dir("pritzker").name, "entries": out}
