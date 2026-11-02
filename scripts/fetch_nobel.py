"""Fetch all laureates and prizes from the Nobel Prize API v2.1 into raw/nobel/<stamp>/.

Only v2.1 is used (v1 is frozen and uses different short names).
Output is stored untouched. Re-running creates a new snapshot; nothing is overwritten.
"""
from __future__ import annotations

import sys

from common import http_get, save_raw, utc_stamp

BASE = "https://api.nobelprize.org/2.1"
PAGE = 100


def fetch_all(endpoint: str, key: str) -> dict:
    items, offset, meta = [], 0, None
    while True:
        r = http_get(f"{BASE}/{endpoint}", params={"offset": offset, "limit": PAGE})
        data = r.json()
        meta = data.get("meta", {})
        batch = data.get(key, [])
        items.extend(batch)
        offset += PAGE
        total = meta.get("count", 0)
        if not batch or offset >= total:
            break
    if len(items) != meta.get("count"):
        raise RuntimeError(f"{endpoint}: got {len(items)} items, API meta.count={meta.get('count')}")
    return {"endpoint": f"{BASE}/{endpoint}", "meta": meta, key: items}


def main() -> int:
    stamp = utc_stamp()
    for endpoint, key in (("laureates", "laureates"), ("nobelPrizes", "nobelPrizes")):
        payload = fetch_all(endpoint, key)
        path = save_raw("nobel", endpoint, payload, stamp)
        print(f"{endpoint}: {len(payload[key])} records -> {path.relative_to(path.parents[3])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
