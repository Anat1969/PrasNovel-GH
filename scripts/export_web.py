"""Export curated tables to web/public/data.json for the static app.

The app reads only this file. Nothing here changes official values; it only reshapes them.
"""
from __future__ import annotations

import json
import sys

import pandas as pd

import pritzker_lib
from common import CONFIG, CURATED, INSIGHTS, ROOT, latest_raw_dir
from insights_lib import load_cards, validate_card
from quality_checks import SPEC_REFERENCE, classify_birth

OUT = ROOT / "web" / "public" / "data.json"


def none(v):
    return None if pd.isna(v) else v


STOP = set("""a an and the of for in on to by with his her their its as at from into that which who whom whose this these those
their them they he she it be been being is are was were has have had through also both all other such use used new
recognition discoveries discovery work works contributions contribution concerning services rendered extraordinary
especially particular respect field fields theory theories studies study development developments investigations
method methods outstanding fundamental important regarding research upon named him after between having thereby
service forms connection importance efforts effort role cause prominent life principles pioneering origin made led
towards toward particularly great early many together well first based related demonstrated whereby given within
contributed contributing achievements achievement significant leading lasting devoted long struggle activity activities
work done own pioneer ideas approach area areas analyses analysis""".split())


def era_terms(prz, k=6):
    """Most distinctive words in the official motivations, per field and quarter century (tf-idf style)."""
    import math
    import re
    eras = [(1901, 1925), (1926, 1950), (1951, 1975), (1976, 2000), (2001, 2100)]
    out = {}
    for f, g in prz.groupby("field"):
        docs = []
        for a, b in eras:
            words = re.findall(r"[a-z][a-z\-]{2,}", " ".join(g[(g.year >= a) & (g.year <= b)].motivation_en.fillna("")).lower())
            docs.append([w for w in words if w not in STOP])
        df = {}
        for d in docs:
            for w in set(d):
                df[w] = df.get(w, 0) + 1
        out[f] = []
        for (a, b), d in zip(eras, docs):
            tf = {}
            for w in d:
                tf[w] = tf.get(w, 0) + 1
            score = sorted(((c * math.log(1 + len(eras) / df[w]), w) for w, c in tf.items() if c >= 2), reverse=True)
            out[f].append({"from": a, "to": b, "terms": [w for _, w in score[:k]]})
    return out


def transitions(llink, cites):
    """Idea-to-idea transitions per field, each tagged with the evidence found in the data (citation, mentor, lineage) or none."""
    path = CONFIG / "transitions.json"
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))["fields"]
    out_edges = {}
    if llink is not None and not llink.empty:
        for r in llink.itertuples():
            out_edges.setdefault(r.mentor_nobel_id, set()).add(r.student_nobel_id)
    cite_pairs = set()
    if cites is not None:
        cite_pairs = {(r.citing_nobel_id, r.cited_nobel_id) for r in cites.itertuples()}

    def lineage(a, b, depth=4):
        frontier, seen = {a}, {a}
        for _ in range(depth):
            frontier = {s for n in frontier for s in out_edges.get(n, ()) if s not in seen}
            if b in frontier:
                return True
            seen |= frontier
        return False

    res = {}
    for f, items in data.items():
        res[f] = []
        for it in items:
            a, b = it["from"][0], it["to"][0]
            ev = []
            if (b, a) in cite_pairs:
                ev.append("ציטוט: העבודות של המאוחר מצטטות את הקודם")
            if b in out_edges.get(a, ()) or a in out_edges.get(b, ()):
                ev.append("מנחה ותלמיד")
            elif lineage(a, b):
                ev.append("שושלת מנחים")
            res[f].append({"from": {"id": a, "y": it["from"][1]}, "to": {"id": b, "y": it["to"][1]},
                           "title": it["title"], "how": it["how"], "evidence": ev})
    return res


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
          for n in ("openalex_link", "openalex_stats", "openalex_work", "openalex_curve", "openalex_evidence", "cite_edge",
                    "openalex_citing_field", "cite_edge_work", "openalex_field_example")
          if (CURATED / f"{n}.csv").exists()}
    conn_path = CONFIG / "connections.json"
    conn = json.loads(conn_path.read_text(encoding="utf-8")) if conn_path.exists() else {}
    deg = pd.read_csv(CURATED / "degree.csv", dtype={"nobel_id": str}) if (CURATED / "degree.csv").exists() else pd.DataFrame()
    llink = pd.read_csv(CURATED / "laureate_link.csv", dtype=str) if (CURATED / "laureate_link.csv").exists() else pd.DataFrame()

    RANK = [("doctor", 3), ("doctorate", 3), ("master", 2), ("licentiate", 2), ("bachelor", 1)]

    def degree(nid):
        if deg.empty:
            return None
        rows = deg[deg.nobel_id == nid].copy()
        if rows.empty:
            return None
        rows["rank"] = [max([r for k, r in RANK if k in str(e).lower()] or [0]) for e in rows.degree_en]
        rows = rows[rows["rank"] > 0].sort_values(["rank", "year"], ascending=[False, True])
        if rows.empty:
            return None
        r = rows.iloc[0]
        return {"he": none(r.degree_he), "en": none(r.degree_en), "by_he": none(r.by_he), "by_en": none(r.by_en),
                "year": None if pd.isna(r.year) else int(r.year), "url": r.source_url}

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
        cf = oa.get("openalex_citing_field")
        if cf is not None:
            rows = cf[cf.nobel_id == nid].sort_values("citing_works", ascending=False)
            out["fields"] = [[x.field_en, int(x.citing_works)] for x in rows.itertuples()]
        fx = oa.get("openalex_field_example")
        if fx is not None:
            ex = {}
            for x in fx[fx.nobel_id == nid].sort_values("rank").itertuples():
                ex.setdefault(x.field_en, []).append({"title": x.title, "y": None if pd.isna(x.year) else int(x.year),
                                                      "doi": none(x.doi), "c": None if pd.isna(x.cited_by) else int(x.cited_by), "topic": none(x.topic)})
            out["examples"] = ex
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
    mh_path = CONFIG / "motivations_he.json"
    mh = json.loads(mh_path.read_text(encoding="utf-8"))["prizes"] if mh_path.exists() else {}
    prizes = [{
        "id": r.nobel_id, "y": int(r.year), "f": r.field,
        "age": None if pd.isna(r.age_at_award) else int(r.age_at_award),
        "p": r.portion, "m": r.motivation_en,
        "mh": (mh.get(f"{r.nobel_id}-{r.year}-{r.field}") or {}).get("he"),
        "d": (mh.get(f"{r.nobel_id}-{r.year}-{r.field}") or {}).get("discovery"),
    } for r in prz.itertuples()]

    selected = []
    for s in sel["laureates"]:
        c = cards.get(s["nobel_id"], {})
        a = aff[(aff.nobel_id == s["nobel_id"]) & (aff.year == s["year"])]
        problems = validate_card(c) if c else ["אין קובץ כרטיס"]
        selected.append({
            **s,
            "motivation_he": (mh.get(f"{s['nobel_id']}-{s['year']}-{s['field']}") or {}).get("he") or c.get("motivation_he"),
            "discovery": (mh.get(f"{s['nobel_id']}-{s['year']}-{s['field']}") or {}).get("discovery"),
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
            "degree": degree(s["nobel_id"]),
            "proposal": bool(s.get("proposal")),
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
            "selection_criteria": sel.get("criteria"),
            "transitions_approved": (json.loads((CONFIG / "transitions.json").read_text(encoding="utf-8")).get("approved")
                                     if (CONFIG / "transitions.json").exists() else None),
            "why_these": sel.get("why_these"),
            "images_note": images.get("note"),
            "openalex_snapshot": next(iter(oa["openalex_link"].retrieved_at), None) if "openalex_link" in oa else None,
        },
        "people": people,
        "prizes": prizes,
        "selected": selected,
        "edges": edges,
        "home": museum.get("home"),
        "cites": [{"s": r.citing_nobel_id, "t": r.cited_nobel_id, "n": int(r.works),
                   "ev": [{"title": w.title, "y": None if pd.isna(w.year) else int(w.year), "doi": none(w.doi), "refs": none(w.references)}
                          for w in oa["cite_edge_work"][(oa["cite_edge_work"].citing_nobel_id == r.citing_nobel_id)
                                                        & (oa["cite_edge_work"].cited_nobel_id == r.cited_nobel_id)].head(4).itertuples()]
                   if "cite_edge_work" in oa else [],
                   **(conn.get("cites", {}).get(f"{r.citing_nobel_id}>{r.cited_nobel_id}") or {})}
                  for r in oa["cite_edge"].itertuples()] if "cite_edge" in oa else [],
        "links": [{"m": r.mentor_nobel_id, "s": r.student_nobel_id, "p": r.properties} for r in llink.itertuples()] if not llink.empty else [],
        "mentor_why": conn.get("mentor_why"),
        "mentor_props": conn.get("mentor_props"),
        "terms": era_terms(prz),
        "transitions": transitions(llink, oa.get("cite_edge")),
        "pritzker": pritzker_lib.export(),
        "next": json.loads((CONFIG / "next.json").read_text(encoding="utf-8")) if (CONFIG / "next.json").exists() else None,
        "evolution": json.loads((CONFIG / "evolution.json").read_text(encoding="utf-8"))["eras"] if (CONFIG / "evolution.json").exists() else {},
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
