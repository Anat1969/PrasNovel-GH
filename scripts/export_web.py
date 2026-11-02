"""Export curated tables to web/public/data.json for the static app.

The app reads only this file. Nothing here changes official values; it only reshapes them.
"""
from __future__ import annotations

import json
import sys

import pandas as pd

from common import CONFIG, CURATED, INSIGHTS, ROOT, latest_raw_dir
from insights_lib import load_cards, validate_card
from quality_checks import SPEC_REFERENCE, classify_birth

OUT = ROOT / "web" / "public" / "data.json"


def none(v):
    return None if pd.isna(v) else v


def main() -> int:
    lau = pd.read_csv(CURATED / "laureate.csv", dtype=str)
    prz = pd.read_csv(CURATED / "prize.csv", dtype={"nobel_id": str})
    aff = pd.read_csv(CURATED / "affiliation.csv", dtype={"nobel_id": str})
    edge = pd.read_csv(CURATED / "edge.csv", dtype=str)
    wd = pd.read_csv(CURATED / "wikidata_check.csv", dtype=str)
    sel = json.loads((CONFIG / "selection.json").read_text(encoding="utf-8"))
    museum_path = CONFIG / "museum.json"
    museum = json.loads(museum_path.read_text(encoding="utf-8")) if museum_path.exists() else {}
    images_path = CONFIG / "images.json"
    images = json.loads(images_path.read_text(encoding="utf-8")) if images_path.exists() else {}
    cards = {c["nobel_id"]: c for c in load_cards(INSIGHTS)}
    anchors_path = CONFIG / "openalex_anchors.json"
    anchors = json.loads(anchors_path.read_text(encoding="utf-8")) if anchors_path.exists() else {}
    oa = {n: pd.read_csv(CURATED / f"{n}.csv", dtype={"nobel_id": str, "citing_nobel_id": str, "cited_nobel_id": str})
          for n in ("openalex_link", "openalex_stats", "openalex_work", "openalex_curve", "openalex_evidence", "cite_edge")
          if (CURATED / f"{n}.csv").exists()}

    def openalex(nid):
        if nid in (anchors.get("not_relevant") or {}):
            return {"status": "לא רלוונטי", "why": anchors["not_relevant"][nid]}
        link = oa.get("openalex_link")
        row = link[link.nobel_id == nid] if link is not None else pd.DataFrame()
        if row.empty:
            return {"status": "לא נאסף", "why": "OpenAlex עוד לא נאסף לזוכה זה."}
        r = row.iloc[0]
        out = {"status": r.status, "ids": [] if pd.isna(r.openalex_ids) else str(r.openalex_ids).split("|"),
               "split": bool(r.split_profiles), "snapshot": r.retrieved_at}
        if r.status == "סתירה":
            out["why"] = "ה-ORCID שב-Wikidata מוביל ב-OpenAlex לפרופיל של חוקר אחר, ומאמר העוגן לא אישר אותו. לא מציגים נתונים עד שהסתירה תיפתר."
        elif r.status == "לא קושר":
            out["why"] = "אף מאמר עוגן לא הוביל למחבר ב-OpenAlex."
        ev = oa.get("openalex_evidence")
        if ev is not None:
            out["evidence"] = [{"kind": e.kind, "ref": e.ref, "ok": not pd.isna(e.author)} for e in ev[ev.nobel_id == nid].itertuples()]
        st = oa.get("openalex_stats")
        if st is not None and not st[st.nobel_id == nid].empty:
            s = st[st.nobel_id == nid].iloc[0]
            out.update({"works": int(s.works_count), "cited": int(s.cited_by_count), "h": int(s.h_index_max),
                        "topic": none(s.topic), "recent": {int(k): v for k, v in json.loads(s.cites_by_year).items()}})
        w = oa.get("openalex_work")
        if w is not None:
            out["top"] = [{"title": x.title, "y": None if pd.isna(x.year) else int(x.year), "c": int(x.cited_by), "doi": none(x.doi)}
                          for x in w[w.nobel_id == nid].sort_values("rank").head(5).itertuples()]
        cv = oa.get("openalex_curve")
        if cv is not None:
            ys = w[w.nobel_id == nid].year.dropna() if w is not None else pd.Series(dtype=float)
            first = int(ys.min()) if len(ys) else 0  # earliest of the works whose citations the curve counts
            # OpenAlex has citing works dated before the cited paper existed; those are data errors, not history.
            out["curve"] = [[int(x.year), int(x.citing_works)] for x in cv[cv.nobel_id == nid].sort_values("year").itertuples()
                            if first <= int(x.year) <= 2025]  # 2026 is a partial year in the snapshot
            out["curve_dropped"] = int(cv[(cv.nobel_id == nid) & (cv.year < first)].citing_works.sum())
        return out

    people = []
    for r in lau.itertuples():
        people.append({
            "id": r.nobel_id, "qid": none(r.qid), "en": r.name_en, "he": none(r.name_he),
            "g": none(r.gender), "org": int(r.is_org), "born": none(r.birth_date),
            "city": none(r.birth_city), "country": none(r.country_now), "cont": none(r.continent),
            "lat": None if pd.isna(r.birth_lat) else round(float(r.birth_lat), 3),
            "lon": None if pd.isna(r.birth_lon) else round(float(r.birth_lon), 3),
        })
    prizes = [{
        "id": r.nobel_id, "y": int(r.year), "f": r.field,
        "age": None if pd.isna(r.age_at_award) else int(r.age_at_award),
        "p": r.portion, "m": r.motivation_en,
    } for r in prz.itertuples()]

    selected = []
    for s in sel["laureates"]:
        c = cards.get(s["nobel_id"], {})
        a = aff[(aff.nobel_id == s["nobel_id"]) & (aff.year == s["year"])]
        problems = validate_card(c) if c else ["אין קובץ כרטיס"]
        selected.append({
            **s,
            "motivation_he": c.get("motivation_he"),
            "card": {k: c.get(k) for k in ("idea_he", "method_he", "method_source", "quote", "quote_source",
                                          "takeaway_he", "label", "bias_note", "urban_example_he")},
            "card_status": "מאושר" if not problems else "טיוטה",
            "card_file": str(c["path"].relative_to(ROOT)) if c else None,
            "affiliations": [{"name": x.institution, "city": none(x.city), "country": none(x.country_now)}
                             for x in a.itertuples()],
            "museum": museum.get("laureates", {}).get(s["nobel_id"]),
            "image": (images.get("images") or {}).get(s["nobel_id"]),
            "image_gap": (images.get("gaps") or {}).get(s["nobel_id"]),
            "openalex": openalex(s["nobel_id"]),
        })

    edges = [{
        "s": e.src, "t": e.dst, "sl": none(e.src_label), "tl": none(e.dst_label),
        "sh": none(e.src_label_he), "th": none(e.dst_label_he),
        "sn": none(e.src_nobel_id), "tn": none(e.dst_nobel_id), "prop": e.property, "url": e.source_url,
    } for e in edge.itertuples()]

    birth = wd.assign(status=[classify_birth(a, b) for a, b in zip(wd.birth_date, wd.wd_birth_dates)])
    mismatches = birth[birth.status == "mismatch"].merge(lau[["nobel_id", "name_en"]], on="nobel_id")
    prizes_raw = json.loads((latest_raw_dir("nobel") / "nobelPrizes.json").read_text(encoding="utf-8"))["nobelPrizes"]
    code = {"Physics": "physics", "Chemistry": "chemistry", "Physiology or Medicine": "medicine",
            "Economic Sciences": "economics", "Peace": "peace", "Literature": "literature"}
    awarded = {}
    for p in prizes_raw:
        if p.get("laureates"):
            awarded[code[p["category"]["en"]]] = awarded.get(code[p["category"]["en"]], 0) + 1

    top_inst = (aff.groupby("institution_now").nobel_id.nunique().sort_values(ascending=False).head(10))
    data = {
        "meta": {
            "nobel_snapshot": latest_raw_dir("nobel").name,
            "wikidata_snapshot": latest_raw_dir("wikidata").name,
            "selection_status": sel["status"],
            "images_note": images.get("note"),
            "openalex_snapshot": next(iter(oa["openalex_link"].retrieved_at), None) if "openalex_link" in oa else None,
        },
        "people": people,
        "prizes": prizes,
        "selected": selected,
        "edges": edges,
        "home": museum.get("home"),
        "cites": [{"s": r.citing_nobel_id, "t": r.cited_nobel_id, "n": int(r.works)} for r in oa["cite_edge"].itertuples()]
                 if "cite_edge" in oa else [],
        "quality": {
            "fields": [{"f": f, "api_prizes": awarded.get(f, 0), "spec_prizes": rp,
                        "api_laureates": int((prz.field == f).sum()), "spec_laureates": rl}
                       for f, (rp, rl) in SPEC_REFERENCE.items()],
            "birth": birth.status.value_counts().to_dict(),
            "mismatches": [{"id": m.nobel_id, "en": m.name_en, "api": m.birth_date, "wd": m.wd_birth_dates}
                           for m in mismatches.itertuples()],
            "top_institutions": [{"name": k, "n": int(v)} for k, v in top_inst.items()],
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
