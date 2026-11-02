"""Checks on the committed snapshot: counts, cross-IDs, selection criteria."""
import json

import pandas as pd
import pytest

from common import CONFIG, CURATED, latest_raw_dir
from quality_checks import SPEC_REFERENCE, classify_birth

pytestmark = pytest.mark.skipif(not (CURATED / "laureate.csv").exists(), reason="run the pipeline first")

NON_EU_US = lambda r: r.continent != "Europe" and r.country_now != "USA"


@pytest.fixture(scope="module")
def data():
    lau = pd.read_csv(CURATED / "laureate.csv", dtype=str)
    prz = pd.read_csv(CURATED / "prize.csv", dtype={"nobel_id": str})
    sel = json.loads((CONFIG / "selection.json").read_text(encoding="utf-8"))["laureates"]
    raw = json.loads((latest_raw_dir("nobel") / "laureates.json").read_text(encoding="utf-8"))
    return lau, prz, sel, raw


def test_curated_matches_raw_count(data):
    lau, prz, _, raw = data
    assert len(lau) == raw["meta"]["count"] == len(raw["laureates"])
    assert len(prz) == sum(len(x["nobelPrizes"]) for x in raw["laureates"])
    assert lau.nobel_id.is_unique


def test_counts_per_field_match_spec(data):
    _, prz, _, _ = data
    for field, (_, n_laureates) in SPEC_REFERENCE.items():
        assert (prz.field == field).sum() == n_laureates, field


def test_selection_ids_resolve_through_api_not_names(data):
    """nobel_id -> QID comes from the raw API record, never from a name lookup."""
    _, prz, sel, raw = data
    qid_by_id = {x["id"]: x["wikidata"]["id"] for x in raw["laureates"]}
    for s in sel:
        assert qid_by_id[s["nobel_id"]] == s["qid"]
        row = prz[(prz.nobel_id == s["nobel_id"]) & (prz.year == s["year"])]
        assert len(row) == 1 and row.iloc[0].field == s["field"]


def test_selection_follows_spec(data):
    lau, _, sel, _ = data
    lau = lau.set_index("nobel_id")
    df = pd.DataFrame(sel)
    assert len(df) == 36 and df.nobel_id.is_unique
    assert sorted(df.field.unique()) == ["chemistry", "economics", "literature", "medicine", "peace", "physics"]
    for field, g in df.groupby("field"):
        assert len(g) == 6, field
        rows = lau.loc[g.nobel_id]
        assert (rows.gender == "female").any(), f"{field}: no woman"
        assert any(NON_EU_US(r) for _, r in rows.iterrows()), f"{field}: no one outside Europe/USA"
        assert g.year.max() - g.year.min() >= 50, f"{field}: no early/late spread"


def test_edges_cross_ids_consistent(data):
    lau, _, _, _ = data
    path = CURATED / "edge.csv"
    if not path.exists():
        pytest.skip("no Wikidata snapshot")
    edge = pd.read_csv(path, dtype=str)
    qid_by_id = dict(zip(lau.nobel_id, lau.qid))
    for side in ("src", "dst"):
        linked = edge[edge[f"{side}_nobel_id"].notna()]
        assert (linked[f"{side}_nobel_id"].map(qid_by_id) == linked[side]).all()
    assert edge.source_url.str.startswith("https://www.wikidata.org/wiki/Q").all()


def test_birth_classifier():
    assert classify_birth("1900-01-02", "1900-01-02T00:00:00Z") == "match"
    assert classify_birth("1900-00-00", "1900-05-05T00:00:00Z") == "match_year"
    assert classify_birth("1900-01-02", "1901-01-02T00:00:00Z") == "mismatch"
    assert classify_birth(None, "1900") == "no_api_date"
