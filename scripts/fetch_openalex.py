"""Fetch OpenAlex data for the selected laureates into raw/openalex/<stamp>/.

Linking (no name-only matching):
  1. ORCID from config/openalex_anchors.json (taken from Wikidata P496) -> /authors/orcid:<id>.
  2. Anchor DOIs (each checked against Crossref) -> /works/doi:<doi>. Inside that verified paper's
     author list, the author whose name contains the laureate's family name is taken.
  All author ids found this way form the laureate's profile set (OpenAlex sometimes splits one person
  into several profiles). Status: "אומת" for ORCID or two agreeing anchors, "הערכה" for one anchor.

Then, per laureate: author records, top works, citing works by publication year (the life curve of
the idea), and which other selected laureates cite their top works.

OpenAlex is free. If OPENALEX_API_KEY is set in the environment it is sent; otherwise requests use the
shared free budget. No key is stored in the repository.
"""
from __future__ import annotations

import json
import os
import sys
import time
import unicodedata

from common import CONFIG, http_get, save_raw, utc_stamp

API = "https://api.openalex.org"
TOP_WORKS = 8
CITE_WORKS = 25


def fold(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", s or "") if not unicodedata.combining(c)).lower()


def get(path: str, params: dict | None = None):
    p = dict(params or {})
    key = os.environ.get("OPENALEX_API_KEY")
    if key:
        p["api_key"] = key
    try:
        r = http_get(API + path, params=p)
    except Exception as e:  # recorded, never silently fixed
        return {"_error": str(e)}
    time.sleep(0.15)
    return r.json()


def short(oid: str) -> str:
    return oid.rsplit("/", 1)[-1] if oid else oid


def resolve(nid: str, a: dict) -> dict:
    out = {"nobel_id": nid, "family": a["family"], "orcid": a.get("orcid"), "evidence": []}
    if a.get("orcid"):
        r = get(f"/authors/orcid:{a['orcid']}", {"select": "id,display_name,orcid"})
        if r.get("id"):
            out["evidence"].append({"kind": "orcid", "ref": a["orcid"], "author": short(r["id"]), "name": r.get("display_name")})
        else:
            out["evidence"].append({"kind": "orcid", "ref": a["orcid"], "author": None, "error": r.get("_error") or r.get("error")})
    fam = fold(a["family"])
    for doi in a.get("doi", []):
        w = get(f"/works/doi:{doi}", {"select": "id,doi,title,publication_year,cited_by_count,authorships"})
        if not w.get("id"):
            out["evidence"].append({"kind": "doi", "ref": doi, "author": None, "error": w.get("_error") or "not in OpenAlex"})
            continue
        hits = []
        for au in w.get("authorships", []):
            names = [au.get("author", {}).get("display_name", ""), au.get("raw_author_name", "")]
            if any(fam in fold(n) for n in names) and au.get("author", {}).get("id"):
                hits.append((short(au["author"]["id"]), au["author"].get("display_name")))
        out["evidence"].append({
            "kind": "doi", "ref": doi, "work": short(w["id"]), "title": w.get("title"), "year": w.get("publication_year"),
            "cited_by": w.get("cited_by_count"),
            "author": hits[0][0] if len(hits) == 1 else None,
            "name": hits[0][1] if len(hits) == 1 else None,
            "error": None if len(hits) == 1 else f"{len(hits)} matching authors in list",
        })
    ids = [e["author"] for e in out["evidence"] if e.get("author")]
    out["authors"] = sorted(set(ids))
    has_orcid = any(e["kind"] == "orcid" and e.get("author") for e in out["evidence"])
    from collections import Counter
    agree = max(Counter(ids).values()) if ids else 0
    out["status"] = "אומת" if (has_orcid or agree >= 2) else ("הערכה" if ids else "לא קושר")
    out["split_profiles"] = len(out["authors"]) > 1
    return out


def main() -> int:
    anchors = json.loads((CONFIG / "openalex_anchors.json").read_text(encoding="utf-8"))
    stamp = utc_stamp()
    links = [resolve(nid, a) for nid, a in anchors["laureates"].items()]
    save_raw("openalex", "links", links, stamp)
    if all(not l["authors"] for l in links):
        print("No authors resolved (budget or network). Raw links saved; stopping.")
        return 1

    authors, works, curves = {}, {}, {}
    for l in links:
        if not l["authors"]:
            continue
        ids = "|".join(l["authors"])
        authors[l["nobel_id"]] = [get(f"/authors/{a}", {"select": "id,display_name,works_count,cited_by_count,summary_stats,counts_by_year,topics"}) for a in l["authors"]]
        top = get("/works", {"filter": f"authorships.author.id:{ids}", "sort": "cited_by_count:desc", "per-page": CITE_WORKS,
                             "select": "id,doi,title,publication_year,cited_by_count"})
        works[l["nobel_id"]] = top
        wids = [short(w["id"]) for w in top.get("results", [])]
        if wids:
            curves[l["nobel_id"]] = get("/works", {"filter": "cites:" + "|".join(wids[:CITE_WORKS]), "group_by": "publication_year"})
    save_raw("openalex", "authors", authors, stamp)
    save_raw("openalex", "works", works, stamp)
    save_raw("openalex", "citing_by_year", curves, stamp)

    # Which other selected laureates cite the top works of each laureate.
    by_author = {a: l["nobel_id"] for l in links for a in l["authors"]}
    cites = {}
    for nid, top in works.items():
        wids = [short(w["id"]) for w in top.get("results", [])][:CITE_WORKS]
        others = [a for a, n in by_author.items() if n != nid]
        if not wids or not others:
            continue
        r = get("/works", {"filter": "cites:" + "|".join(wids) + ",authorships.author.id:" + "|".join(others),
                           "group_by": "authorships.author.id", "per-page": 200})
        cites[nid] = r
    save_raw("openalex", "cross_citations", cites, stamp)

    # Which scientific fields cite each laureate's top works (OpenAlex topic hierarchy: field level).
    fields = {}
    for nid, top in works.items():
        wids = [short(w["id"]) for w in top.get("results", [])][:CITE_WORKS]
        if wids:
            fields[nid] = get("/works", {"filter": "cites:" + "|".join(wids), "group_by": "primary_topic.field.id"})
    save_raw("openalex", "citing_fields", fields, stamp)

    # Evidence for each laureate-to-laureate citation: the citing works and which top works they reference.
    evidence = {}
    for cited, r in cites.items():
        wids = [short(w["id"]) for w in works[cited].get("results", [])][:CITE_WORKS]
        for b in r.get("group_by", []):
            citing = by_author.get(short(b.get("key")))
            if not citing or citing == cited or f"{citing}>{cited}" in evidence:
                continue
            ids = "|".join(a for a, n in by_author.items() if n == citing)
            evidence[f"{citing}>{cited}"] = get("/works", {
                "filter": "cites:" + "|".join(wids) + ",authorships.author.id:" + ids,
                "sort": "cited_by_count:desc", "per-page": 10,
                "select": "id,doi,title,publication_year,cited_by_count,referenced_works"})
    save_raw("openalex", "edge_evidence", evidence, stamp)
    ok = sum(1 for l in links if l["authors"])
    print(f"openalex {stamp}: {ok}/{len(links)} laureates linked")
    return 0


if __name__ == "__main__":
    sys.exit(main())
