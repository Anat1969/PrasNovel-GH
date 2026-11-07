"""Turing room: every person is confirmed by QID and year in Wikidata or in the Wikipedia list, never by name alone."""
import json
from collections import defaultdict

import pandas as pd
import pytest

from common import CONFIG, CURATED, RAW, ROOT

pytestmark = pytest.mark.skipif(not (CURATED / "turing_laureate.csv").exists(), reason="no Turing build")


def cfg():
    return json.loads((CONFIG / "turing.json").read_text(encoding="utf-8"))


def wikipedia():
    dirs = sorted(d for d in (RAW / "turing").iterdir() if (d / "wikipedia.json").exists())
    return json.loads((dirs[-1] / "wikipedia.json").read_text(encoding="utf-8")) if dirs else None


def test_years_are_continuous_and_areas_valid():
    c = cfg()
    years = [e["year"] for e in c["entries"]]
    assert years == list(range(years[0], years[-1] + 1))
    codes = {a["code"] for a in c["areas"]}
    assert all(e["area"] in codes for e in c["entries"])
    for w in c["ai_waves"]:
        assert any(e["area"] == "ai" and w["from"] <= e["year"] <= w["to"] for e in c["entries"]), w


def test_every_person_is_confirmed_by_qid_and_year():
    lau = pd.read_csv(CURATED / "turing_laureate.csv")
    ok = lau.wd_year_ok.astype(bool) | (lau.wp_year_ok.fillna(False).astype(bool))
    assert ok.all(), lau[~ok][["year", "qid", "name_en"]].to_string()


def test_wikipedia_list_matches_config_by_qid():
    wp = wikipedia()
    if wp is None:
        pytest.skip("Wikipedia list not fetched yet (runs in GitHub Actions)")
    theirs = {int(y): sorted(p["qid"] for p in v) for y, v in wp["rows"].items()}
    ours = {e["year"]: sorted(e["qids"]) for e in cfg()["entries"]}
    assert theirs == ours


def test_nobel_bridge_is_by_qid():
    lau = pd.read_csv(CURATED / "turing_laureate.csv", dtype={"nobel_id": "string"})
    nobel = pd.read_csv(CURATED / "laureate.csv", dtype={"nobel_id": "string"})
    for r in lau.dropna(subset=["nobel_id"]).itertuples():
        assert (nobel[nobel.nobel_id == r.nobel_id].qid == r.qid).all()


def test_text_and_images():
    data = json.loads((ROOT / "web" / "public" / "data.json").read_text(encoding="utf-8"))["turing"]
    for e in data["entries"]:
        assert e["he"] and e["idea"] and e["city"], e["slug"]
        for p in e["people"]:
            if p["img"]:
                assert (ROOT / "web" / "public" / p["img"]).exists() and p["lic"] and p["page"], p["qid"]
