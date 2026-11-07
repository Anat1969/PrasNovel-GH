"""Fetch the Turing Award room into raw/turing/<stamp>/.

laureates.json: every item with P166 = Q185667 (Turing Award) and its P585 year, plus the people listed in
                config/turing.json that Wikidata does not (yet) record as laureates. Gender, citizenship, birth,
                death, portrait (P18), Hebrew/English labels, Wikipedia pages.
wikipedia.json: the laureates table of the English Wikipedia article "Turing Award" (CC BY-SA), reduced to
                year -> linked article titles -> QID (via pageprops). This is the second source: identity is
                compared by QID, never by name. The ACM site blocks automated access, so it is not used.
images.json:    Commons licence metadata for the portraits; free licences only, 400px copy in web/public/turing/.

Wikimedia rate-limits the cloud sandbox (429), so this script runs in GitHub Actions (fetch-turing.yml).
Each part saves what it got; a part that fails is retried on the next run.
"""
from __future__ import annotations

import json
import re
import sys
import time
import urllib.parse

from common import CONFIG, ROOT, http_get, save_raw, utc_stamp

ENDPOINT = "https://query.wikidata.org/sparql"
PRIZE = "Q185667"
OUT = ROOT / "web" / "public" / "turing"
FREE = re.compile(r"^(cc0|public domain|pd|cc by(-sa)? \d|fal\b|free art licen[cs]e)", re.I)

PEOPLE_Q = """
SELECT ?item ?year ?en ?he ?gender ?birth ?death ?img
       (GROUP_CONCAT(DISTINCT ?cHe; separator="|") AS ?countries_he)
       (SAMPLE(?enwiki) AS ?enwiki) (SAMPLE(?hewiki) AS ?hewiki) WHERE {
  { ?item p:P166 ?st . ?st ps:P166 wd:%s . OPTIONAL { ?st pq:P585 ?year } }
  UNION { VALUES ?item { %s } }
  OPTIONAL { ?item rdfs:label ?en FILTER(LANG(?en) = "en") }
  OPTIONAL { ?item rdfs:label ?he FILTER(LANG(?he) = "he") }
  OPTIONAL { ?item wdt:P21 ?gender } OPTIONAL { ?item wdt:P569 ?birth } OPTIONAL { ?item wdt:P570 ?death }
  OPTIONAL { ?item wdt:P18 ?img }
  OPTIONAL { ?item wdt:P27 ?c . ?c rdfs:label ?cHe FILTER(LANG(?cHe) = "he") }
  OPTIONAL { ?enwiki schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }
  OPTIONAL { ?hewiki schema:about ?item ; schema:isPartOf <https://he.wikipedia.org/> }
}
GROUP BY ?item ?year ?en ?he ?gender ?birth ?death ?img
"""


def wikipedia_list() -> dict:
    """Year -> QIDs of the people in that year's rows of the laureates table ({{sortname|First|Last}} cells)."""
    api = "https://en.wikipedia.org/w/api.php"
    wt = http_get("https://en.wikipedia.org/w/index.php", params={"title": "Turing Award", "action": "raw"}, tries=3).text
    rows: dict[int, list[str]] = {}
    year = None
    for line in wt.split("\n"):
        m = re.match(r'^!scope="row(?:group)?"(?:\s*rowspan=\d+)?\s*\|\s*(\d{4})', line)
        if m:
            year = int(m.group(1))
            continue
        s = re.match(r"^\|\s*\{\{sortname\|([^}]*)\}\}", line)
        if year and s:
            parts = s.group(1).split("|")
            pos = [x for x in parts if "=" not in x]
            named = dict(x.split("=", 1) for x in parts if "=" in x)
            title = pos[2] if len(pos) > 2 and pos[2] else f"{pos[0]} {pos[1]}".strip()
            if named.get("dab"):
                title += f" ({named['dab']})"
            rows.setdefault(year, []).append(title)
    titles = sorted({t for v in rows.values() for t in v})
    qid = {}
    for i in range(0, len(titles), 40):
        chunk = titles[i:i + 40]
        r = http_get(api, params={"action": "query", "titles": "|".join(chunk), "prop": "pageprops",
                                  "ppprop": "wikibase_item", "redirects": 1, "format": "json", "formatversion": 2}, tries=3).json()["query"]
        step = {x["from"]: x["to"] for x in r.get("normalized", []) + r.get("redirects", [])}
        found = {p["title"]: p.get("pageprops", {}).get("wikibase_item") for p in r["pages"]}
        for t in chunk:
            u = t
            for _ in range(3):
                u = step.get(u, u)
            qid[t] = found.get(u)
        time.sleep(1)
    return {"page": "https://en.wikipedia.org/wiki/Turing_Award", "rows": {y: [{"title": t, "qid": qid.get(t)} for t in v] for y, v in rows.items()}}


def portraits(people: list[dict], stamp: str) -> dict:
    OUT.mkdir(parents=True, exist_ok=True)
    meta = {}
    for b in people:
        q = b["item"]["value"].rsplit("/", 1)[-1]
        if q in meta or "img" not in b:
            continue
        title = "File:" + urllib.parse.unquote(b["img"]["value"].rsplit("/", 1)[-1])
        try:
            page = next(iter(http_get("https://commons.wikimedia.org/w/api.php", params={
                "action": "query", "titles": title, "prop": "imageinfo", "iiprop": "url|extmetadata",
                "iiurlwidth": 400, "format": "json"}, tries=3).json()["query"]["pages"].values()))
        except Exception as err:
            print(q, "metadata later:", err)
            continue
        ii = page.get("imageinfo", [{}])[0]
        md = {k: re.sub(r"<[^>]+>", "", str(v.get("value", ""))).strip() for k, v in ii.get("extmetadata", {}).items()}
        lic = md.get("LicenseShortName", "")
        rec = {"file": title, "page_url": ii.get("descriptionurl"), "thumb": ii.get("thumburl"), "license": lic,
               "artist": md.get("Artist"), "free": bool(FREE.match(lic))}
        dest = OUT / f"{q}.jpg"
        if rec["free"] and rec["thumb"] and not dest.exists():
            try:
                dest.write_bytes(http_get(rec["thumb"].split("?")[0], tries=3).content)
            except Exception as err:
                print(q, "download later:", err)
            time.sleep(2)
        if dest.exists() and rec["free"]:
            rec["local"] = f"turing/{q}.jpg"
        meta[q] = rec
    return meta


def main() -> int:
    stamp = utc_stamp()
    cfg = json.loads((CONFIG / "turing.json").read_text(encoding="utf-8"))
    extra = " ".join(f"wd:{q}" for e in cfg["entries"] for q in e["qids"])
    people = http_get(ENDPOINT, params={"query": PEOPLE_Q % (PRIZE, extra), "format": "json"},
                      headers={"Accept": "application/sparql-results+json"}).json()["results"]["bindings"]
    save_raw("turing", "laureates", people, stamp)
    print("wikidata:", len(people), "rows")
    try:
        wp = wikipedia_list()
        save_raw("turing", "wikipedia", wp, stamp)
        print("wikipedia:", len(wp["rows"]), "years")
    except Exception as err:
        print("wikipedia later:", err)
    if "--no-images" not in sys.argv:
        save_raw("turing", "images", portraits(people, stamp), stamp)
    return 0


if __name__ == "__main__":
    sys.exit(main())
