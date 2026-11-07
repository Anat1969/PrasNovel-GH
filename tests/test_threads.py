"""Evolution threads: every step is a real laureate of that category, in year order; numeric claims match the data."""
import json
import re

from common import CONFIG


def load(name):
    return json.loads((CONFIG / name).read_text(encoding="utf-8"))


def test_turing_threads_follow_the_areas():
    th, tu = load("threads.json")["turing"], {e["slug"]: e for e in load("turing.json")["entries"]}
    assert set(th) == {a["code"] for a in load("turing.json")["areas"]}
    for code, a in th.items():
        years = [tu[s["slug"]]["year"] for s in a["steps"]]
        assert all(tu[s["slug"]]["area"] == code for s in a["steps"]) and years == sorted(years), code
        assert a["insight"] and a["next"] and len(a["haiku"]) == 3


def test_pritzker_themes_cover_every_entry_once():
    th, pz = load("threads.json")["pritzker"], {e["slug"]: e["year"] for e in load("pritzker.json")["entries"]}
    assigned = [s for v in th["assign"].values() for s in v]
    assert sorted(assigned) == sorted(pz)
    for code, a in th["articles"].items():
        years = [pz[s["slug"]] for s in a["steps"]]
        assert all(s["slug"] in th["assign"][code] for s in a["steps"]) and years == sorted(years), code


def test_city_count_claim_matches_assignment():
    th, pz = load("threads.json")["pritzker"], {e["slug"]: e["year"] for e in load("pritzker.json")["entries"]}
    n, total, y0, y1 = map(int, re.search(r"(\d+) מתוך (\d+) הפרסים בשנים (\d{4})–(\d{4})", th["articles"]["city"]["insight"]).groups())
    last = [s for s, y in pz.items() if y0 <= y <= y1]
    assert total == len(last) and n == sum(s in th["assign"]["city"] for s in last)
