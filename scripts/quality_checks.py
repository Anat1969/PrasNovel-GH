"""Quality checks against the SPEC. Writes docs/QUALITY_REPORT.md.

1. Counts per field vs reference values in docs/SPEC.md section 7 (reference itself still to be verified on NobelPrize.org).
2. Cross-source: birth date in the Nobel API vs Wikidata. Gaps are reported, never fixed.
3. Cross-IDs: every selected laureate resolves nobel_id <-> QID through the API itself.
4. Insight cards: label, source and bias field present.
"""
from __future__ import annotations

import json
import sys

import pandas as pd

from common import CONFIG, CURATED, INSIGHTS, ROOT, latest_raw_dir
from insights_lib import load_cards, validate_card

# docs/SPEC.md section 7. Marked there as "to verify against the official source".
SPEC_REFERENCE = {
    "physics": (120, 231), "chemistry": (118, 202), "medicine": (117, 235),
    "literature": (119, 123), "peace": (107, 144), "economics": (58, 101),
}


def classify_birth(api: str | None, wd: str | None) -> str:
    if not api or pd.isna(api):
        return "no_api_date"
    if not wd or pd.isna(wd):
        return "no_wikidata_date"
    wd_dates = [d[:10] for d in wd.split("|")]
    if api in wd_dates:
        return "match"
    if api.endswith("-00-00"):
        return "match_year" if any(d[:4] == api[:4] for d in wd_dates) else "mismatch"
    return "mismatch"


def main() -> int:
    laureate = pd.read_csv(CURATED / "laureate.csv", dtype=str)
    prize = pd.read_csv(CURATED / "prize.csv", dtype={"nobel_id": str})
    prizes_raw = json.loads((latest_raw_dir("nobel") / "nobelPrizes.json").read_text(encoding="utf-8"))["nobelPrizes"]
    lines = ["# דוח איכות נתונים", "",
             f"נוצר אוטומטית על ידי `scripts/quality_checks.py` מתמונת מצב `{latest_raw_dir('nobel').name}`.", ""]
    failures = 0

    # 1. counts
    awarded = {}
    for p in prizes_raw:
        if p.get("laureates"):
            code = {"Physics": "physics", "Chemistry": "chemistry", "Physiology or Medicine": "medicine",
                    "Economic Sciences": "economics", "Peace": "peace", "Literature": "literature"}[p["category"]["en"]]
            awarded[code] = awarded.get(code, 0) + 1
    lines += ["## 1. ספירות לפי תחום", "",
              "פרסים = שנים שבהן הוענק פרס בתחום. זוכים = צמדי זוכה-פרס (מי שזכה פעמיים נספר פעמיים).", "",
              "| תחום | פרסים ב-API | פרסים ב-SPEC | זוכים ב-API | זוכים ב-SPEC | מצב |", "|---|---|---|---|---|---|"]
    for field, (ref_p, ref_l) in SPEC_REFERENCE.items():
        n_p = awarded.get(field, 0)
        n_l = int((prize["field"] == field).sum())
        status = "תואם" if (n_p, n_l) == (ref_p, ref_l) else "פער, לבדוק"
        lines.append(f"| {field} | {n_p} | {ref_p} | {n_l} | {ref_l} | {status} |")
    lines += ["", f"סך הכול: **{len(laureate)}** זוכים ייחודיים (מתוכם **{int(laureate.is_org.astype(int).sum())}** ארגונים), "
              f"**{len(prize)}** צמדי זוכה-פרס, **{sum(awarded.values())}** פרסים שהוענקו.",
              "ה-SPEC כתב \"1,036 הזוכים\": זה מספר הצמדים, לא מספר הזוכים הייחודיים.",
              "ערכי ה-SPEC עצמם עדיין לא אומתו מול עמודי העובדות של NobelPrize.org. לא אומת.", ""]

    # 2. birth dates
    wd = pd.read_csv(CURATED / "wikidata_check.csv", dtype=str) if (CURATED / "wikidata_check.csv").exists() else pd.DataFrame()
    if not wd.empty:
        wd["status"] = [classify_birth(a, b) for a, b in zip(wd["birth_date"], wd["wd_birth_dates"])]
        counts = wd["status"].value_counts()
        lines += ["## 2. תאריך לידה: API מול Wikidata", "", "| מצב | מספר |", "|---|---|"]
        for k in ("match", "match_year", "mismatch", "no_api_date", "no_wikidata_date"):
            lines.append(f"| {k} | {int(counts.get(k, 0))} |")
        mism = wd[wd.status == "mismatch"].merge(laureate[["nobel_id", "name_en"]], on="nobel_id")
        lines += ["", "פערים מסומנים ולא מתוקנים (סעיף 5 ב-CLAUDE.md). הרשימה המלאה:", "",
                  "| nobel_id | שם | API | Wikidata |", "|---|---|---|---|"]
        for _, r in mism.iterrows():
            lines.append(f"| {r.nobel_id} | {r.name_en} | {r.birth_date} | {r.wd_birth_dates.replace('|', ', ')} |")
        lines.append("")

    # 3. selection ids
    sel = json.loads((CONFIG / "selection.json").read_text(encoding="utf-8"))["laureates"]
    by_id = laureate.set_index("nobel_id")
    bad = [s for s in sel if s["nobel_id"] not in by_id.index or by_id.loc[s["nobel_id"], "qid"] != s["qid"]]
    failures += len(bad)
    lines += ["## 3. מזהים צולבים לנבחרים", "",
              f"נבחרים: **{len(sel)}**. התאמת nobel_id ↔ QID מול ה-API: **{len(sel) - len(bad)}** תקינים, **{len(bad)}** שגויים.",
              "OpenAlex: עוד לא נמשך. מאמרי הפרס דורשים אימות ידני לפני שיוך (SPEC סעיף 4.3).", ""]

    # 4. insight cards
    cards = load_cards(INSIGHTS)
    problems = {c["path"].name: validate_card(c) for c in cards}
    ready = [n for n, p in problems.items() if not p]
    lines += ["## 4. כרטיסי תובנה", "",
              f"כרטיסים: **{len(cards)}**. מוכנים: **{len(ready)}**. בטיוטה: **{len(cards) - len(ready)}**.", ""]
    for name, p in sorted(problems.items()):
        if p:
            lines.append(f"- `{name}`: {'; '.join(p)}")
    lines.append("")

    out = ROOT / "docs" / "QUALITY_REPORT.md"
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)}; hard failures: {failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
