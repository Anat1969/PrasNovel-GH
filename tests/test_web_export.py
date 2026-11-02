"""The static app reads only web/public/data.json. It must match curated data and keep the rules."""
import json

import pandas as pd
import pytest

from common import CONFIG, CURATED, ROOT

DATA = ROOT / "web" / "public" / "data.json"
pytestmark = pytest.mark.skipif(not DATA.exists(), reason="run scripts/export_web.py first")


@pytest.fixture(scope="module")
def data():
    return json.loads(DATA.read_text(encoding="utf-8"))


def test_counts_match_curated(data):
    assert len(data["people"]) == len(pd.read_csv(CURATED / "laureate.csv"))
    assert len(data["prizes"]) == len(pd.read_csv(CURATED / "prize.csv"))
    assert len(data["edges"]) == len(pd.read_csv(CURATED / "edge.csv"))


def test_selected_ids_and_qids_come_from_api(data):
    people = {p["id"]: p for p in data["people"]}
    sel = json.loads((CONFIG / "selection.json").read_text(encoding="utf-8"))["laureates"]
    assert [s["nobel_id"] for s in data["selected"]] == [s["nobel_id"] for s in sel]
    for s in data["selected"]:
        assert people[s["nobel_id"]]["qid"] == s["qid"]


def test_official_motivation_is_unchanged(data):
    prz = pd.read_csv(CURATED / "prize.csv", dtype={"nobel_id": str})
    official = {(r.nobel_id, int(r.year)): r.motivation_en for r in prz.itertuples()}
    for p in data["prizes"]:
        assert official[(p["id"], p["y"])] == p["m"]


def test_images_have_documented_license(data):
    for s in data["selected"]:
        img = s.get("image")
        if img:
            assert img["license"] and img["page_url"].startswith("https://commons.wikimedia.org/")
            assert img["artist"] is not None and img["caption_he"]
        else:
            assert s.get("image_gap") is None or isinstance(s["image_gap"], str)


def test_museum_haiku_are_three_lines(data):
    for s in data["selected"]:
        if s.get("museum"):
            assert len(s["museum"]["haiku"]) == 3
