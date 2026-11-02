# גמד על כתפי ענקים — PrasNovel

כלי אישי ללמידה מהצלחתם של זוכי פרס נובל: איסוף שלד עובדתי ממקורות פתוחים, ומעליו שכבת זיקוק אנושית שמייצרת תובנות ליישום.

- בעלת הפרויקט: ענת (אדריכלית העיר אשדוד)
- מסמך דרישות: [docs/SPEC.md](docs/SPEC.md)
- הנחיות לעבודה עם Claude Code: [CLAUDE.md](CLAUDE.md)

## מצב נוכחי: שלב 1 (MVP) בנוי, ממתין לזיקוק של ענת
- **איסוף:** כל 1,028 הזוכים ו-688 הפרסים מ-Nobel Prize API v2.1, עם תמונת מצב גולמית ב-`raw/`.
- **העשרה:** שמות בעברית (1,025 מתוך 1,028) ותאריכי לידה מ-Wikidata. 96 קשרי מנחה/תלמיד סביב 20 הנבחרים.
- **בחירה:** 20 זוכים ב-`config/selection.json`. זו הצעה, ממתינה לאישור.
- **תובנות:** 20 שלדי כרטיסים ב-`insights/`, עם נימוק רשמי ותרגום מסומן. השדות האישיים ריקים בכוונה.
- **איכות:** `docs/QUALITY_REPORT.md`. הספירות תואמות את ה-SPEC בכל התחומים. 15 פערי תאריך לידה מסומנים ולא תוקנו.
- **ממשק:** Streamlit בעברית, מימין לשמאל: בית, עשרים הזוכים, ציר זמן, ארבע עדשות ואיכות הנתונים.

## הרצה מקומית
```
pip install -r requirements.txt
make build      # בונה curated, שלדי כרטיסים ודוח איכות מה-raw הקיים
make test       # בדיקות
make app        # פותח את הממשק בדפדפן
make fetch      # משיכה חדשה מהמקורות (יוצר תמונת מצב חדשה ב-raw)
```

## עבודה על כרטיס תובנה
1. פותחים קובץ ב-`insights/`, למשל `2009-economics-846.md`.
2. ממלאים את השדות לפי השאלות המנחות. ציטוט עד 15 מילים, עם קישור.
3. כשהכרטיס גמור, משנים `status: טיוטה` ל-`status: מאושר`. בדיקה אוטומטית נכשלת אם כרטיס מאושר חסר.

## מבנה
```
raw/        JSON גולמי עם חותמת זמן (נובל, Wikidata). לא עורכים.
curated/    טבלאות CSV (laureate, prize, affiliation, edge, source, wikidata_check)
config/     selection.json: 20 הנבחרים
scripts/    fetch_nobel, fetch_wikidata, build_curated, make_insight_skeletons, quality_checks
insights/   כרטיסי תובנה (Markdown + YAML)
app/        ממשק Streamlit
tests/      בדיקות pytest
docs/       SPEC ודוח איכות
```
