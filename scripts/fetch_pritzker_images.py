"""Fetch the image of each Pritzker key work from Wikimedia Commons, with its licence.

Reads config/pritzker.json (the chosen work QID per entry) and the latest raw/pritzker works.json (P18).
Saves raw/pritzker/<stamp>/images.json (Commons extmetadata) and a 640px copy in web/public/pritzker/<slug>.jpg,
so the room does not depend on Commons at view time (Commons rate-limits with 429).
Only free licences are kept (CC0, public domain, CC BY, CC BY-SA). Anything else is skipped and shown as a gap.
"""
from __future__ import annotations

import json
import re
import sys
import time
import urllib.parse

from common import CONFIG, ROOT, http_get, latest_raw_dir, save_raw

OUT = ROOT / "web" / "public" / "pritzker"
FREE = re.compile(r"^(cc0|public domain|pd|cc by(-sa)? \d)", re.I)


def main() -> int:
    cfg = json.loads((CONFIG / "pritzker.json").read_text(encoding="utf-8"))
    raw = latest_raw_dir("pritzker")
    works = json.loads((raw / "works.json").read_text(encoding="utf-8"))
    img_of = {}
    for b in works:
        w = b["work"]["value"].rsplit("/", 1)[-1]
        img_of.setdefault(w, urllib.parse.unquote(b["img"]["value"].rsplit("/", 1)[-1]))
    OUT.mkdir(parents=True, exist_ok=True)
    meta = {}
    for e in cfg["entries"]:
        w = e.get("work")
        if not w or w not in img_of:
            continue
        title = "File:" + img_of[w]
        try:
            r = http_get("https://commons.wikimedia.org/w/api.php", params={
                "action": "query", "titles": title, "prop": "imageinfo", "iiprop": "url|extmetadata",
                "iiurlwidth": 640, "format": "json"}, tries=3)
        except Exception as err:  # rate limit: this entry waits for the next run
            print(e["year"], e["slug"], "metadata later:", err)
            continue
        page = next(iter(r.json()["query"]["pages"].values()))
        ii = page.get("imageinfo", [{}])[0]
        md = {k: re.sub(r"<[^>]+>", "", str(v.get("value", ""))).strip() for k, v in ii.get("extmetadata", {}).items()}
        lic = md.get("LicenseShortName", "")
        rec = {"work": w, "file": title, "page_url": ii.get("descriptionurl"), "thumb": ii.get("thumburl"),
               "license": lic, "license_url": md.get("LicenseUrl"), "artist": md.get("Artist"), "free": bool(FREE.match(lic))}
        if rec["free"] and rec["thumb"]:
            dest = OUT / f"{e['slug']}.jpg"
            if not dest.exists():
                try:
                    dest.write_bytes(http_get(rec["thumb"].split("?")[0], tries=3).content)
                except Exception as err:  # rate limit: leave it for the next run
                    print("  download later:", err)
                time.sleep(3)
            if dest.exists():
                rec["local"] = f"pritzker/{e['slug']}.jpg"
        meta[e["slug"]] = rec
        print(e["year"], e["slug"], lic, "ok" if rec.get("local") else "SKIP")
    save_raw("pritzker", "images", meta, raw.name)
    return 0


if __name__ == "__main__":
    sys.exit(main())
