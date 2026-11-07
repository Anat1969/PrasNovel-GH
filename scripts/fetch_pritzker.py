"""Fetch the Pritzker Architecture Prize room into raw/pritzker/<stamp>/.

laureates.json: every item with P166 = Q133160 (Pritzker Architecture Prize) and its P585 year,
                type (P31), gender (P21), citizenship (P27), birth/death, Hebrew and English labels.
works.json:     for those items, works with P84 (architect) = laureate or their firm, with image (P18),
                sitelink count and coordinates. Used to pick one key work per laureate.
official.json:  only the years and names from the official laureates list (facts, not the site's text),
                used as the authority for years. The site's texts and images are copyrighted and are not stored.
images.json:    Commons metadata (licence, artist) for the chosen work images.
"""
from __future__ import annotations

import html
import re
import sys

from common import http_get, save_raw, utc_stamp

ENDPOINT = "https://query.wikidata.org/sparql"
PRIZE = "Q133160"
OFFICIAL = "https://www.pritzkerprize.com/laureates"

LAUREATES_Q = """
SELECT ?item ?year ?en ?he ?type ?gender ?birth ?death
       (GROUP_CONCAT(DISTINCT ?cHe; separator="|") AS ?countries_he)
       (GROUP_CONCAT(DISTINCT ?cEn; separator="|") AS ?countries_en)
       (SAMPLE(?pimg) AS ?portrait) (SAMPLE(?enwiki) AS ?enwiki) (SAMPLE(?hewiki) AS ?hewiki) WHERE {
  ?item p:P166 ?st . ?st ps:P166 wd:%s . OPTIONAL { ?st pq:P585 ?year }
  OPTIONAL { ?item rdfs:label ?en FILTER(LANG(?en) = "en") }
  OPTIONAL { ?item rdfs:label ?he FILTER(LANG(?he) = "he") }
  OPTIONAL { ?item wdt:P31 ?type }
  OPTIONAL { ?item wdt:P21 ?gender }
  OPTIONAL { ?item wdt:P569 ?birth } OPTIONAL { ?item wdt:P570 ?death }
  OPTIONAL { ?item wdt:P27 ?c . OPTIONAL { ?c rdfs:label ?cHe FILTER(LANG(?cHe) = "he") }
                                OPTIONAL { ?c rdfs:label ?cEn FILTER(LANG(?cEn) = "en") } }
  OPTIONAL { ?item wdt:P18 ?pimg }
  OPTIONAL { ?enwiki schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }
  OPTIONAL { ?hewiki schema:about ?item ; schema:isPartOf <https://he.wikipedia.org/> }
}
GROUP BY ?item ?year ?en ?he ?type ?gender ?birth ?death
"""

WORKS_Q = """
SELECT ?arch ?work ?en ?he ?img ?links ?coord ?inception ?placeHe ?placeEn WHERE {
  VALUES ?arch { %s }
  ?work wdt:P84 ?arch ; wdt:P18 ?img ; wikibase:sitelinks ?links .
  OPTIONAL { ?work rdfs:label ?en FILTER(LANG(?en) = "en") }
  OPTIONAL { ?work rdfs:label ?he FILTER(LANG(?he) = "he") }
  OPTIONAL { ?work wdt:P625 ?coord }
  OPTIONAL { ?work wdt:P571 ?inception }
  OPTIONAL { ?work wdt:P131 ?pl . OPTIONAL { ?pl rdfs:label ?placeHe FILTER(LANG(?placeHe) = "he") }
                                 OPTIONAL { ?pl rdfs:label ?placeEn FILTER(LANG(?placeEn) = "en") } }
}
"""


def sparql(q: str) -> list[dict]:
    r = http_get(ENDPOINT, params={"query": q, "format": "json"}, headers={"Accept": "application/sparql-results+json"})
    return r.json()["results"]["bindings"]


def official_list() -> list[dict]:
    """Years and names only, parsed from the official list page."""
    page = http_get(OFFICIAL).text
    text = re.sub(r"<script.*?</script>|<style.*?</style>", "", page, flags=re.S)
    lines = [html.unescape(x).replace("­", "").strip() for x in re.sub(r"<[^>]+>", "\n", text).split("\n")]
    lines = [x for x in lines if x]
    out = []
    for i, line in enumerate(lines):
        m = re.fullmatch(r"(\d{4}) Laureates?", line)
        if m and i:
            out.append({"year": int(m.group(1)), "name": lines[i - 1]})
    return out


def main() -> int:
    stamp = utc_stamp()
    laureates = sparql(LAUREATES_Q % PRIZE)
    save_raw("pritzker", "laureates", laureates, stamp)
    qids = sorted({b["item"]["value"].rsplit("/", 1)[-1] for b in laureates})
    works = sparql(WORKS_Q % " ".join(f"wd:{q}" for q in qids))
    save_raw("pritzker", "works", works, stamp)
    official = official_list()
    save_raw("pritzker", "official", {"url": OFFICIAL, "fetched": stamp, "entries": official}, stamp)
    print(f"pritzker: {len(qids)} items, {len(works)} work rows, {len(official)} official entries -> raw/pritzker/{stamp}")
    return 0 if official and laureates else 1


if __name__ == "__main__":
    sys.exit(main())
