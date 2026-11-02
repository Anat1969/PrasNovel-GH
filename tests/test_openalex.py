"""OpenAlex links: no name-only matching, contradictions surfaced, links plausible against the official record."""
import json

import pandas as pd
import pytest

from build_curated import decide_link
from common import CONFIG, CURATED

ANCHORS = json.loads((CONFIG / "openalex_anchors.json").read_text(encoding="utf-8"))
SEL = json.loads((CONFIG / "selection.json").read_text(encoding="utf-8"))["laureates"]


def ev(kind, author, ref="x"):
    return {"kind": kind, "ref": ref, "author": author}


def test_every_selected_laureate_has_anchor_or_reason():
    linked, skipped = set(ANCHORS["laureates"]), set(ANCHORS["not_relevant"])
    assert not linked & skipped
    assert {s["nobel_id"] for s in SEL} == linked | skipped
    for nid, a in ANCHORS["laureates"].items():
        assert a.get("doi"), f"{nid}: every link needs at least one Crossref-checked DOI anchor"


def test_decide_link_rules():
    assert decide_link({"evidence": [ev("doi", "A1"), ev("doi", "A1")]}) == ("אומת", ["A1"])
    assert decide_link({"evidence": [ev("doi", "A1")]}) == ("הערכה", ["A1"])
    assert decide_link({"evidence": [ev("orcid", "A9"), ev("doi", "A9")]}) == ("אומת", ["A9"])
    # ORCID pointing elsewhere than the anchor paper: contradiction, ORCID dropped
    assert decide_link({"evidence": [ev("orcid", "A9"), ev("doi", None)]}) == ("סתירה", [])
    assert decide_link({"evidence": [ev("orcid", "A9"), ev("doi", "A1")]}) == ("סתירה", ["A1"])
    assert decide_link({"evidence": [ev("doi", None)]}) == ("לא קושר", [])


needs_snapshot = pytest.mark.skipif(not (CURATED / "openalex_link.csv").exists(), reason="no OpenAlex snapshot built")


@needs_snapshot
def test_linked_ids_come_from_anchor_papers():
    link = pd.read_csv(CURATED / "openalex_link.csv", dtype=str)
    evid = pd.read_csv(CURATED / "openalex_evidence.csv", dtype=str)
    for r in link.dropna(subset=["openalex_ids"]).itertuples():
        doi_authors = set(evid[(evid.nobel_id == r.nobel_id) & (evid.kind == "doi")].author.dropna())
        assert set(r.openalex_ids.split("|")) <= doi_authors, r.nobel_id


@needs_snapshot
def test_linked_profile_lived_in_the_laureates_time():
    """Catches a wrong profile (e.g. a modern namesake): some top work must fall in the laureate's working life."""
    lau = pd.read_csv(CURATED / "laureate.csv", dtype=str).set_index("nobel_id")
    works = pd.read_csv(CURATED / "openalex_work.csv", dtype={"nobel_id": str})
    link = pd.read_csv(CURATED / "openalex_link.csv", dtype=str)
    year = {s["nobel_id"]: s["year"] for s in SEL}
    for nid in link.dropna(subset=["openalex_ids"]).nobel_id:
        born = int(str(lau.loc[nid, "birth_date"])[:4])
        ys = works[works.nobel_id == nid].year.dropna().astype(int)
        assert ((ys >= born + 15) & (ys <= year[nid] + 40)).any(), f"{nid}: no work between {born + 15} and {year[nid] + 40}"


@needs_snapshot
def test_citation_edges_only_between_linked_laureates():
    link = pd.read_csv(CURATED / "openalex_link.csv", dtype=str).dropna(subset=["openalex_ids"])
    cites = pd.read_csv(CURATED / "cite_edge.csv", dtype=str)
    ok = set(link.nobel_id)
    assert set(cites.citing_nobel_id) <= ok and set(cites.cited_nobel_id) <= ok
    assert (cites.citing_nobel_id != cites.cited_nobel_id).all()


@needs_snapshot
def test_citation_evidence_backs_every_edge():
    """Every laureate-to-laureate citation shown has at least one citing work stored as evidence."""
    cites = pd.read_csv(CURATED / "cite_edge.csv", dtype=str)
    ev = pd.read_csv(CURATED / "cite_edge_work.csv", dtype=str)
    for r in cites.itertuples():
        assert ((ev.citing_nobel_id == r.citing_nobel_id) & (ev.cited_nobel_id == r.cited_nobel_id)).any(), (r.citing_nobel_id, r.cited_nobel_id)


def test_laureate_links_join_two_laureates_by_qid():
    path = CURATED / "laureate_link.csv"
    if not path.exists():
        pytest.skip("no Wikidata links built")
    links = pd.read_csv(path, dtype=str)
    lau = pd.read_csv(CURATED / "laureate.csv", dtype=str)
    q2n = dict(zip(lau.qid, lau.nobel_id))
    assert (links.mentor_qid != links.student_qid).all()
    assert (links.mentor_qid.map(q2n) == links.mentor_nobel_id).all()
    assert (links.student_qid.map(q2n) == links.student_nobel_id).all()


def test_degrees_come_from_education_statements():
    path = CURATED / "degree.csv"
    if not path.exists():
        pytest.skip("no degrees built")
    deg = pd.read_csv(path, dtype=str)
    assert deg.by_en.notna().all(), "a degree without an institution came from bare P512, which mixes honorary degrees"
