"""Fetch Wikidata enrichment into raw/wikidata/<stamp>/.

entities.json: for every laureate QID from the Nobel API: Hebrew label, birth date (P569), birth place (P19).
mentors.json:  doctoral advisor/student (P184/P185) and student of/student (P1066/P802) for the selected laureates.
QIDs come only from the Nobel API (wikidata.id). No name matching.
"""
from __future__ import annotations

import json
import sys

import pandas as pd

from common import CONFIG, CURATED, http_get, save_raw, utc_stamp

ENDPOINT = "https://query.wikidata.org/sparql"
CHUNK = 150

ENTITY_Q = """
SELECT ?item ?label_he ?label_en
       (GROUP_CONCAT(DISTINCT STR(?birth); separator="|") AS ?birth_dates)
       (SAMPLE(?bp) AS ?birth_place) (SAMPLE(?bpl) AS ?birth_place_he)
WHERE {
  VALUES ?item { %s }
  OPTIONAL { ?item rdfs:label ?label_he FILTER(LANG(?label_he) = "he") }
  OPTIONAL { ?item rdfs:label ?label_en FILTER(LANG(?label_en) = "en") }
  OPTIONAL { ?item wdt:P569 ?birth }
  OPTIONAL { ?item wdt:P19 ?bp . OPTIONAL { ?bp rdfs:label ?bpl FILTER(LANG(?bpl) = "he") } }
}
GROUP BY ?item ?label_he ?label_en
"""

# Each branch returns (mentor, student, from-item, property).
MENTOR_Q = """
SELECT DISTINCT ?mentor ?student ?from ?property
       ?mentor_label ?student_label ?mentor_label_he ?student_label_he WHERE {
  VALUES ?s { %s }
  {
    ?s wdt:P184 ?mentor . BIND(?s AS ?student) BIND(?s AS ?from) BIND("P184" AS ?property)
  } UNION {
    ?s wdt:P1066 ?mentor . BIND(?s AS ?student) BIND(?s AS ?from) BIND("P1066" AS ?property)
  } UNION {
    ?s wdt:P185 ?student . BIND(?s AS ?mentor) BIND(?s AS ?from) BIND("P185" AS ?property)
  } UNION {
    ?s wdt:P802 ?student . BIND(?s AS ?mentor) BIND(?s AS ?from) BIND("P802" AS ?property)
  } UNION {
    ?student wdt:P184 ?s . BIND(?s AS ?mentor) BIND(?student AS ?from) BIND("P184" AS ?property)
  } UNION {
    ?student wdt:P1066 ?s . BIND(?s AS ?mentor) BIND(?student AS ?from) BIND("P1066" AS ?property)
  }
  OPTIONAL { ?mentor rdfs:label ?mentor_label FILTER(LANG(?mentor_label) = "en") }
  OPTIONAL { ?student rdfs:label ?student_label FILTER(LANG(?student_label) = "en") }
  OPTIONAL { ?mentor rdfs:label ?mentor_label_he FILTER(LANG(?mentor_label_he) = "he") }
  OPTIONAL { ?student rdfs:label ?student_label_he FILTER(LANG(?student_label_he) = "he") }
}
"""


def qid(uri: str | None):
    return uri.rsplit("/", 1)[-1] if uri else None


def run(query: str):
    r = http_get(ENDPOINT, params={"query": query, "format": "json"},
                 headers={"Accept": "application/sparql-results+json"})
    rows = []
    for b in r.json()["results"]["bindings"]:
        row = {k: v["value"] for k, v in b.items()}
        for k in ("item", "mentor", "student", "from", "birth_place"):
            if k in row:
                row[k] = qid(row[k])
        rows.append(row)
    return rows


def main() -> int:
    laureates = pd.read_csv(CURATED / "laureate.csv", dtype=str)
    qids = sorted(laureates["qid"].dropna().unique())
    selection = json.loads((CONFIG / "selection.json").read_text(encoding="utf-8"))["laureates"]
    selected = [s["qid"] for s in selection]

    stamp = utc_stamp()
    entities = []
    for i in range(0, len(qids), CHUNK):
        values = " ".join(f"wd:{q}" for q in qids[i:i + CHUNK])
        entities.extend(run(ENTITY_Q % values))
    for e in entities:
        e["qid"] = e.pop("item")
    save_raw("wikidata", "entities", {"query": ENTITY_Q, "rows": entities}, stamp)

    values = " ".join(f"wd:{q}" for q in selected)
    mentors = run(MENTOR_Q % values)
    save_raw("wikidata", "mentors", {"query": MENTOR_Q, "selected": selected, "rows": mentors}, stamp)
    print(f"entities: {len(entities)} rows, mentors: {len(mentors)} rows, snapshot {stamp}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
