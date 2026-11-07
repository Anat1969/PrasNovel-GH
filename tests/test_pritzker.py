"""Pritzker room: years and identities are checked by QID and year, never by name alone."""
import json
from collections import Counter

import pandas as pd
import pytest

from common import CONFIG, CURATED, RAW, ROOT, latest_raw_dir

pytestmark = pytest.mark.skipif(not (RAW / "pritzker").exists(), reason="no Pritzker snapshot")


def cfg():
    return json.loads((CONFIG / "pritzker.json").read_text(encoding="utf-8"))


def test_entries_cover_the_official_list_year_by_year():
    official = json.loads((latest_raw_dir("pritzker") / "official.json").read_text(encoding="utf-8"))["entries"]
    assert Counter(o["year"] for o in official) == Counter(e["year"] for e in cfg()["entries"])


def test_every_laureate_qid_holds_the_prize_in_that_year():
    lau = pd.read_csv(CURATED / "pritzker_laureate.csv")
    assert len(lau) == sum(len(e["qids"]) for e in cfg()["entries"])
    bad = lau[~lau.year_ok.astype(bool)]
    assert bad.empty, bad[["slug", "year", "wd_years"]].to_string()


def test_key_work_is_recorded_with_the_laureate_as_architect():
    ent = pd.read_csv(CURATED / "pritzker_entry.csv")
    chosen = ent[ent.work_qid.notna()]
    assert chosen.work_by_laureate.astype(bool).all(), chosen[~chosen.work_by_laureate.astype(bool)].slug.tolist()


def test_every_entry_has_hebrew_text_and_draft_label():
    c = cfg()
    assert c["label"] in {"עובדה", "הערכה", "הנחה"} and c["bias_note"]
    for e in c["entries"]:
        assert e["name_he"] and e["idea_he"] and e["city_he"], e["slug"]
    data = json.loads((ROOT / "web" / "public" / "data.json").read_text(encoding="utf-8"))["pritzker"]
    assert [e["slug"] for e in data["entries"] if e["work"] and not e["work"]["he"]] == []  # Hebrew from Wikidata or config


def test_images_are_local_and_free():
    data = json.loads((ROOT / "web" / "public" / "data.json").read_text(encoding="utf-8"))["pritzker"]
    for e in data["entries"]:
        w = e["work"]
        if w and w["img"]:
            assert (ROOT / "web" / "public" / w["img"]).exists(), e["slug"]
            assert w["lic"] and w["page"], e["slug"]
