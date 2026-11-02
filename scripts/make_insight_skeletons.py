"""Create one insight-card skeleton per selected laureate in insights/.

Never overwrites an existing card: cards are written by hand after creation.
Pre-filled fields are facts from the Nobel API (CC0) and a translation marked as such.
"""
from __future__ import annotations

import json
import sys

import pandas as pd
import yaml

from common import CONFIG, CURATED, INSIGHTS

# Own translation of the official motivation. Marked as translation in the card.
MOTIVATION_HE = {
    "1": "על השירות יוצא הדופן בגילוי הקרניים המופלאות שנקראו לימים על שמו",
    "6": "על השירות יוצא הדופן במחקר המשותף על תופעות הקרינה שגילה פרופסור אנרי בקרל",
    "37": "על עבודתו על פיזור האור ועל גילוי האפקט הקרוי על שמו",
    "962": "על שיטתם ליצירת פולסים אופטיים קצרים במיוחד ובעוצמה גבוהה",
    "160": "על השירות יוצא הדופן בגילוי חוקי הדינמיקה הכימית והלחץ האוסמוטי בתמיסות",
    "230": "על קביעת המבנה של חומרים ביוכימיים חשובים בטכניקות של קרני רנטגן",
    "292": "על מחקריו על מצבי המעבר בתגובות כימיות באמצעות ספקטרוסקופיה של פמטו־שנייה",
    "1055": "על פיתוח מסגרות מתכתיות־אורגניות (MOF)",
    "299": "על עבודתם על מבנה מערכת העצבים",
    "428": "על גילוי היסודות הגנטיים הניידים",
    "918": "על תגליותיה בנוגע לטיפול חדש נגד מלריה",
    "1024": "על תגליותיהם בנוגע לשינויים בבסיסים נוקלאוזידיים, שאפשרו פיתוח חיסוני mRNA יעילים נגד קורונה",
    "678": "על פיתוח ויישום מודלים דינמיים לניתוח תהליכים כלכליים",
    "719": "על תרומתו לכלכלת הרווחה",
    "846": "על ניתוח הממשל הכלכלי, ובמיוחד של משאבים משותפים",
    "1034": "על קידום ההבנה שלנו את תוצאות הנשים בשוק העבודה",
    "462": "על מאמציו ההומניטריים לעזור לחיילים פצועים וליצור הבנה בינלאומית",
    "496": "על מאמצם המתמיד להחיות את אידיאל השלום ולהצית מחדש את רוח השלום באומתם ובאנושות כולה",
    "783": "על תרומתה לפיתוח בר־קיימא, לדמוקרטיה ולשלום",
    "809": "על מאמציהם ליצור פיתוח כלכלי וחברתי מלמטה",
}


def main() -> int:
    sel = json.loads((CONFIG / "selection.json").read_text(encoding="utf-8"))["laureates"]
    lau = pd.read_csv(CURATED / "laureate.csv", dtype=str).set_index("nobel_id")
    prz = pd.read_csv(CURATED / "prize.csv", dtype={"nobel_id": str})
    INSIGHTS.mkdir(exist_ok=True)
    created = 0
    for s in sel:
        l = lau.loc[s["nobel_id"]]
        p = prz[(prz.nobel_id == s["nobel_id"]) & (prz.year == s["year"])].iloc[0]
        slug = f"{s['year']}-{s['field']}-{s['nobel_id']}"
        path = INSIGHTS / f"{slug}.md"
        if path.exists():
            continue
        meta = {
            "nobel_id": s["nobel_id"],
            "qid": s["qid"],
            "name_he": l.get("name_he"),
            "name_en": l["name_en"],
            "field": s["field"],
            "year": s["year"],
            "status": "טיוטה",
            "motivation_en": p.motivation_en,
            "motivation_he": MOTIVATION_HE.get(s["nobel_id"]),
            "motivation_he_note": "תרגום של Claude לנימוק הרשמי. לא נוסח רשמי.",
            "facts_url": l["facts_url"],
            "idea_he": "",
            "method_he": "",
            "method_source": "",
            "quote": "",
            "quote_source": "",
            "takeaway_he": "",
            "label": "",
            "bias_note": "",
            "urban_example_he": "",
        }
        front = yaml.safe_dump(meta, allow_unicode=True, sort_keys=False, width=1000)
        body = (
            "## הערות עבודה\n\n"
            f"למה נבחר/ה [הנחה]: {s['why_he']}\n\n"
            "שאלות מנחות:\n"
            "1. מה הרעיון, במשפט אחד ובמילים שלי?\n"
            "2. איזה הרגל או שיטת עבודה אפשרו אותו? מה המקור?\n"
            "3. איזה ציטוט קצר (עד 15 מילים) מההרצאה מבטא אותו? קישור.\n"
            "4. מה אני לוקחת לעבודה, ובאיזו תווית?\n"
            "5. למה הדפוס הזה עלול להיות ארטיפקט של הבחירה (ועדה, תקופה, מגדר, מוסד)?\n"
            "6. דוגמה מהעיר: איפה זה פוגש תכנון באשדוד או בעיר אחרת?\n"
        )
        path.write_text(f"---\n{front}---\n\n{body}", encoding="utf-8")
        created += 1
    print(f"created {created} skeletons, {len(sel) - created} already existed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
