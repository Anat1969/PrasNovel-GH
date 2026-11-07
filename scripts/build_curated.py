"""Build curated tables from the latest raw snapshots.

Tables: laureate, prize, affiliation, source, name_he (from Wikidata), edge (from Wikidata).
Nothing here edits official Nobel values: fields are copied, never "fixed".
Writes curated/prasnovel.db (SQLite) and a CSV per table for review in a spreadsheet.
"""
from __future__ import annotations

import json
import sqlite3
import sys

import pandas as pd

import pritzker_lib
from common import CURATED, DB_PATH, RAW, latest_raw_dir

FIELD_CODE = {
    "Physics": "physics",
    "Chemistry": "chemistry",
    "Physiology or Medicine": "medicine",
    "Economic Sciences": "economics",
    "Peace": "peace",
    "Literature": "literature",
}

TERMS_URL = "https://www.nobelprize.org/about/terms-of-use-for-api-nobelprize-org-and-data-nobelprize-org/"


def en(obj, *path):
    for key in path:
        if not isinstance(obj, dict):
            return None
        obj = obj.get(key)
    if isinstance(obj, dict):
        return obj.get("en")
    return obj


def clean_date(value):
    """Keep the official string. Partial dates ('1917-00-00') stay as given."""
    return value or None


def age_at_award(birth_date, award_date, award_year):
    if not birth_date or birth_date.startswith("0000"):
        return None
    by = int(birth_date[:4])
    if award_date and len(award_date) == 10 and birth_date[5:7] != "00" and birth_date[8:10] != "00":
        ay, am, ad = int(award_date[:4]), int(award_date[5:7]), int(award_date[8:10])
        bm, bd = int(birth_date[5:7]), int(birth_date[8:10])
        return ay - by - ((am, ad) < (bm, bd))
    return int(award_year) - by  # year-only approximation, flagged below


def build_nobel(snapshot):
    data = json.loads((snapshot / "laureates.json").read_text(encoding="utf-8"))
    laureates, prizes, affiliations = [], [], []
    for lr in data["laureates"]:
        is_org = "orgName" in lr
        place = lr.get("founded" if is_org else "birth", {}).get("place", {})
        birth_date = clean_date((lr.get("founded") if is_org else lr.get("birth", {})).get("date") if (lr.get("founded") or lr.get("birth")) else None)
        laureates.append({
            "nobel_id": lr["id"],
            "qid": (lr.get("wikidata") or {}).get("id"),
            "openalex_id": None,
            "name_en": en(lr, "orgName") if is_org else en(lr, "knownName"),
            "full_name_en": en(lr, "orgName") if is_org else en(lr, "fullName"),
            "gender": None if is_org else lr.get("gender"),
            "birth_date": birth_date,
            "birth_city": en(place, "cityNow") or en(place, "city"),
            "birth_country": en(place, "country"),
            "country_now": en(place, "countryNow"),
            "continent": en(place, "continent"),
            "birth_lat": (place.get("cityNow") or {}).get("latitude"),
            "birth_lon": (place.get("cityNow") or {}).get("longitude"),
            "death_date": clean_date((lr.get("death") or {}).get("date")),
            "is_org": int(is_org),
            "wikipedia_en": (lr.get("wikipedia") or {}).get("english"),
            "facts_url": f"https://www.nobelprize.org/laureate/{lr['id']}",
        })
        for p in lr["nobelPrizes"]:
            cat = en(p, "category")
            exact = bool(birth_date and not is_org and "-00" not in birth_date and p.get("dateAwarded"))
            prizes.append({
                "nobel_id": lr["id"],
                "year": int(p["awardYear"]),
                "field": FIELD_CODE.get(cat, cat),
                "category_en": cat,
                "motivation_en": en(p, "motivation"),
                "motivation_he": None,  # translation, filled later and flagged as such
                "portion": p.get("portion"),
                "sort_order": p.get("sortOrder"),
                "prize_status": p.get("prizeStatus"),
                "date_awarded": p.get("dateAwarded"),
                "age_at_award": None if is_org else age_at_award(birth_date, p.get("dateAwarded"), p["awardYear"]),
                "age_is_exact": int(exact),
            })
            for a in p.get("affiliations", []) or []:
                affiliations.append({
                    "nobel_id": lr["id"],
                    "year": int(p["awardYear"]),
                    "field": FIELD_CODE.get(cat, cat),
                    "institution": en(a, "name"),
                    "institution_now": en(a, "nameNow"),
                    "ror_id": None,
                    "city": en(a, "cityNow") or en(a, "city"),
                    "country": en(a, "country"),
                    "country_now": en(a, "countryNow"),
                    "continent": en(a, "continent"),
                })
    source = [{
        "url": data["endpoint"],
        "license": "CC0 (subject to Nobel Prize API terms of use)",
        "terms_url": TERMS_URL,
        "retrieved_at": snapshot.name,
    }]
    prize_df = pd.DataFrame(prizes)
    prize_df["age_at_award"] = prize_df["age_at_award"].astype("Int64")
    return pd.DataFrame(laureates), prize_df, pd.DataFrame(affiliations), source


def build_wikidata(laureate_df):
    """Hebrew names and mentor edges from the latest Wikidata snapshot, if one exists."""
    base = RAW / "wikidata"
    if not base.exists():
        return pd.DataFrame(), pd.DataFrame(), []
    snapshot = latest_raw_dir("wikidata")
    qid_to_nobel = dict(zip(laureate_df["qid"], laureate_df["nobel_id"]))

    entities = pd.DataFrame(json.loads((snapshot / "entities.json").read_text(encoding="utf-8"))["rows"])
    edges_raw = json.loads((snapshot / "mentors.json").read_text(encoding="utf-8"))["rows"]

    edges = []
    for row in edges_raw:
        src, dst = row["mentor"], row["student"]
        edges.append({
            "src": src,
            "src_label": row.get("mentor_label"),
            "src_label_he": row.get("mentor_label_he"),
            "src_nobel_id": qid_to_nobel.get(src),
            "dst": dst,
            "dst_label": row.get("student_label"),
            "dst_label_he": row.get("student_label_he"),
            "dst_nobel_id": qid_to_nobel.get(dst),
            "type": "mentor_of",
            "property": row["property"],
            "source_url": f"https://www.wikidata.org/wiki/{row['from']}#{row['property']}",
            "confidence": "wikidata_statement",
        })
    edge_df = pd.DataFrame(edges) if edges else pd.DataFrame()
    if not edge_df.empty:
        # Prefer rows that carry labels, then keep one row per (src, dst, type).
        edge_df["_n"] = edge_df[["src_label", "dst_label"]].notna().sum(axis=1)
        edge_df = (edge_df.sort_values(["_n", "property"], ascending=[False, True])
                   .drop_duplicates(subset=["src", "dst", "type"]).drop(columns="_n")
                   .sort_values(["src", "dst"]).reset_index(drop=True))
        name_by_qid = dict(zip(laureate_df["qid"], laureate_df["name_en"]))
        for side in ("src", "dst"):
            missing = edge_df[f"{side}_label"].isna()
            edge_df.loc[missing, f"{side}_label"] = edge_df.loc[missing, side].map(name_by_qid).fillna(edge_df.loc[missing, side])
    source = [{
        "url": "https://query.wikidata.org/sparql",
        "license": "CC0",
        "terms_url": "https://www.wikidata.org/wiki/Wikidata:Licensing",
        "retrieved_at": snapshot.name,
    }]
    return entities, edge_df, source


def build_wikidata_extra(laureate_df):
    """Degrees (P512) of the selected laureates and mentor links where both ends are laureates (all fields)."""
    try:
        snapshot = latest_raw_dir("wikidata")
    except FileNotFoundError:
        return {}
    qid_to_nobel = dict(zip(laureate_df["qid"], laureate_df["nobel_id"]))
    out = {}
    deg_path, link_path = snapshot / "degrees.json", snapshot / "laureate_links.json"
    if deg_path.exists():
        rows = json.loads(deg_path.read_text(encoding="utf-8"))["rows"]
        out["degree"] = pd.DataFrame([{
            "nobel_id": qid_to_nobel.get(r["qid"]), "qid": r["qid"], "degree": r["degree"],
            "degree_he": r.get("degree_he"), "degree_en": r.get("degree_en"),
            "by_en": r.get("by_en"), "by_he": r.get("by_he"), "year": r.get("year"),
            "source_url": f"https://www.wikidata.org/wiki/{r['qid']}#P512"} for r in rows]).drop_duplicates()
    if link_path.exists():
        rows = json.loads(link_path.read_text(encoding="utf-8"))["rows"]
        df = pd.DataFrame([{"mentor_qid": r["mentor"], "student_qid": r["student"], "property": r["property"]} for r in rows])
        if not df.empty:
            df = (df.sort_values("property").groupby(["mentor_qid", "student_qid"], as_index=False)
                  .agg(properties=("property", lambda s: "|".join(sorted(set(s))))))
            df["mentor_nobel_id"] = df.mentor_qid.map(qid_to_nobel)
            df["student_nobel_id"] = df.student_qid.map(qid_to_nobel)
            df["source_url"] = "https://www.wikidata.org/wiki/" + df.student_qid
            out["laureate_link"] = df[df.mentor_qid != df.student_qid].reset_index(drop=True)
    return out


def decide_link(link: dict) -> tuple[str, list[str]]:
    """Decide which OpenAlex author ids belong to a laureate.

    DOI anchors are papers checked against Crossref. An ORCID (from Wikidata) is trusted only when at
    least one DOI anchor points to the same author; otherwise it is a contradiction and is dropped.
    """
    from collections import Counter
    doi_ids = [e["author"] for e in link["evidence"] if e["kind"] == "doi" and e.get("author")]
    orcid_ids = [e["author"] for e in link["evidence"] if e["kind"] == "orcid" and e.get("author")]
    agreed_orcid = [a for a in orcid_ids if a in doi_ids]
    if orcid_ids and not agreed_orcid:
        return ("סתירה", sorted(set(doi_ids)))
    ids = sorted(set(doi_ids))
    if not ids:
        return ("לא קושר", [])
    strong = bool(agreed_orcid) or max(Counter(doi_ids).values()) >= 2
    return ("אומת" if strong else "הערכה", ids)


def build_openalex():
    """OpenAlex tables from the latest raw/openalex snapshot. Empty frames when no snapshot exists."""
    try:
        snap = latest_raw_dir("openalex")
    except FileNotFoundError:
        return {}
    load = lambda n: json.loads((snap / f"{n}.json").read_text(encoding="utf-8")) if (snap / f"{n}.json").exists() else {}
    links, authors, works, curves, cross, cfields, evid, fex = (load(n) for n in (
        "links", "authors", "works", "citing_by_year", "cross_citations", "citing_fields", "edge_evidence", "field_examples"))
    short = lambda s: (s or "").rsplit("/", 1)[-1]
    link_rows, ev_rows = [], []
    fetched = {l["nobel_id"]: set(l["authors"]) for l in links or []}  # ids the raw works/curves were fetched for
    for l in links or []:
        status, ids = decide_link(l)
        l["authors"] = ids  # downstream tables use only the decided ids
        link_rows.append({"nobel_id": l["nobel_id"], "openalex_ids": "|".join(ids), "status": status,
                          "split_profiles": len(ids) > 1, "retrieved_at": snap.name})
        for e in l["evidence"]:
            ev_rows.append({"nobel_id": l["nobel_id"], "kind": e["kind"], "ref": e["ref"], "author": e.get("author"),
                            "work": e.get("work"), "error": e.get("error")})
    linked = {l["nobel_id"] for l in links or [] if l["authors"]}
    keep = {l["nobel_id"]: set(l["authors"]) for l in links or []}
    stat_rows = []
    for nid, recs in (authors or {}).items():
        recs = [r for r in recs if r.get("id") and short(r["id"]) in keep.get(nid, set())]
        if nid not in linked:
            continue
        years = {}
        for r in recs:
            for c in r.get("counts_by_year", []):
                years[c["year"]] = years.get(c["year"], 0) + c.get("cited_by_count", 0)
        stat_rows.append({"nobel_id": nid, "works_count": sum(r.get("works_count", 0) for r in recs),
                          "cited_by_count": sum(r.get("cited_by_count", 0) for r in recs),
                          "h_index_max": max([r.get("summary_stats", {}).get("h_index") or 0 for r in recs] or [0]),
                          "topic": next((t["display_name"] for r in recs for t in r.get("topics", [])[:1]), None),
                          "cites_by_year": json.dumps(dict(sorted(years.items())))})
    work_rows = []
    for nid, w in (works or {}).items():
        if nid not in linked or keep[nid] != fetched.get(nid):
            continue  # fetched for a different author set: refetch instead of mixing
        for rank, r in enumerate(w.get("results", []), 1):
            work_rows.append({"nobel_id": nid, "rank": rank, "work_id": short(r["id"]), "doi": r.get("doi"),
                              "title": r.get("title"), "year": r.get("publication_year"), "cited_by": r.get("cited_by_count")})
    curve_rows = []
    for nid, g in (curves or {}).items():
        if nid not in linked or keep[nid] != fetched.get(nid):
            continue
        for b in g.get("group_by", []):
            if str(b.get("key", "")).isdigit():
                curve_rows.append({"nobel_id": nid, "year": int(b["key"]), "citing_works": b["count"]})
    owner = {a: l["nobel_id"] for l in links or [] for a in l["authors"]}
    cite_rows = []
    for cited, g in (cross or {}).items():
        if cited not in linked:
            continue
        agg = {}
        for b in g.get("group_by", []):
            n = owner.get(short(b.get("key")))
            if n and n != cited:
                agg[n] = max(agg.get(n, 0), b["count"])  # split profiles: take max, never sum the same works twice
        for citing, n in agg.items():
            cite_rows.append({"citing_nobel_id": citing, "cited_nobel_id": cited, "works": n})
    field_rows = []
    for nid, g in (cfields or {}).items():
        if nid not in linked or keep[nid] != fetched.get(nid):
            continue
        for b in g.get("group_by", []):
            if b.get("key") and b["key"] != "unknown":
                field_rows.append({"nobel_id": nid, "field_id": short(b["key"]), "field_en": b.get("key_display_name"), "citing_works": b["count"]})
    title_of = {(nid, short(r["id"])): r.get("title") for nid, w in (works or {}).items() for r in w.get("results", [])}
    ev_work_rows = []
    for key, r in (evid or {}).items():
        citing, cited = key.split(">")
        if citing not in linked or cited not in linked:
            continue
        for w in r.get("results", []):
            refs = [title_of[(cited, short(x))] for x in w.get("referenced_works", []) if (cited, short(x)) in title_of]
            ev_work_rows.append({"citing_nobel_id": citing, "cited_nobel_id": cited, "work_id": short(w["id"]), "title": w.get("title"),
                                 "year": w.get("publication_year"), "doi": w.get("doi"), "cited_by": w.get("cited_by_count"),
                                 "references": " || ".join(refs)})
    fname = {short(b["key"]): b.get("key_display_name") for g in (cfields or {}).values() for b in g.get("group_by", []) if b.get("key")}
    ex_rows = []
    for nid, by_field in (fex or {}).items():
        if nid not in linked or keep[nid] != fetched.get(nid):
            continue
        for fid, r in by_field.items():
            for rank, w in enumerate(r.get("results", []), 1):
                ex_rows.append({"nobel_id": nid, "field_id": fid, "field_en": fname.get(fid), "rank": rank, "work_id": short(w["id"]),
                                "title": w.get("title"), "year": w.get("publication_year"), "doi": w.get("doi"), "cited_by": w.get("cited_by_count"),
                                "topic": (w.get("primary_topic") or {}).get("display_name")})
    return {"openalex_citing_field": pd.DataFrame(field_rows), "openalex_field_example": pd.DataFrame(ex_rows), "cite_edge_work": pd.DataFrame(ev_work_rows),
            "openalex_link": pd.DataFrame(link_rows), "openalex_evidence": pd.DataFrame(ev_rows),
            "openalex_stats": pd.DataFrame(stat_rows), "openalex_work": pd.DataFrame(work_rows),
            "openalex_curve": pd.DataFrame(curve_rows), "cite_edge": pd.DataFrame(cite_rows)}


def main() -> int:
    snapshot = latest_raw_dir("nobel")
    laureate, prize, affiliation, source = build_nobel(snapshot)
    wd, edge, wd_source = build_wikidata(laureate)
    if not wd.empty:
        names = wd[["qid", "label_he"]].drop_duplicates("qid")
        laureate = laureate.merge(names.rename(columns={"label_he": "name_he"}), on="qid", how="left")
        wd_cols = wd.rename(columns={c: f"wd_{c}" for c in wd.columns if c != "qid"})
        wikidata_check = laureate[["nobel_id", "qid", "birth_date"]].merge(wd_cols, on="qid", how="left")
    else:
        laureate["name_he"] = None
        wikidata_check = pd.DataFrame()

    CURATED.mkdir(exist_ok=True)
    tables = {
        "laureate": laureate,
        "prize": prize,
        "affiliation": affiliation,
        "source": pd.DataFrame(source + wd_source),
        "edge": edge,
        "wikidata_check": wikidata_check,
        **build_openalex(),
        **build_wikidata_extra(laureate),
        **pritzker_lib.build(),
    }
    if DB_PATH.exists():
        DB_PATH.unlink()  # rebuilt from raw every time: idempotent
    with sqlite3.connect(DB_PATH) as con:
        for name, df in tables.items():
            if df.empty:
                continue
            df.to_sql(name, con, index=False)
            df.to_csv(CURATED / f"{name}.csv", index=False)
            print(f"{name}: {len(df)} rows")
    return 0


if __name__ == "__main__":
    sys.exit(main())
