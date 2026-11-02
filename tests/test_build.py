import shutil
from pathlib import Path

import build_curated as bc

FIX = Path(__file__).parent / "fixtures" / "laureates.json"


def build(tmp_path):
    snap = tmp_path / "20260101T000000Z"
    snap.mkdir()
    shutil.copy(FIX, snap / "laureates.json")
    return bc.build_nobel(snap)


def test_one_row_per_laureate_and_per_prize(tmp_path):
    laureate, prize, affiliation, source = build(tmp_path)
    assert list(laureate.nobel_id) == ["1", "2"]
    assert len(prize) == 3
    assert len(affiliation) == 1
    assert source[0]["retrieved_at"] == "20260101T000000Z"


def test_age_uses_exact_dates_when_available(tmp_path):
    _, prize, _, _ = build(tmp_path)
    by_year = prize.set_index("year")
    assert by_year.loc[1950, "age_at_award"] == 49  # one day before the birthday
    assert by_year.loc[1960, "age_at_award"] == 60  # on the birthday
    assert by_year.loc[1950, "age_is_exact"] == 1


def test_official_values_are_not_rewritten(tmp_path):
    laureate, _, affiliation, _ = build(tmp_path)
    org = laureate.set_index("nobel_id").loc["2"]
    assert org.is_org == 1 and org.birth_date == "1917-00-00"  # partial date kept as given
    person = laureate.set_index("nobel_id").loc["1"]
    assert person.birth_country == "Old Country" and person.country_now == "New Country"
    assert affiliation.iloc[0].institution == "Old Institute"  # historical name kept


def test_organisations_have_no_age(tmp_path):
    _, prize, _, _ = build(tmp_path)
    assert prize.set_index("nobel_id").loc["2", "age_at_award"] is None or \
        str(prize.set_index("nobel_id").loc["2", "age_at_award"]) == "<NA>"


def test_age_helper_partial_dates():
    assert bc.age_at_award("1917-00-00", "1944-12-10", "1944") == 27
    assert bc.age_at_award(None, "1944-12-10", "1944") is None
