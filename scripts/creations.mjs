// מפיק את web/public/creations.json מתוך הנתונים של האפליקציה (תקן "יצירות", AppOfApp-GH/docs/creations-standard.md).
// הרצה: node scripts/creations.mjs   (אחרי python scripts/export_web.py, כי המקור הוא web/public/data.json)
// כל טקסט נלקח מהנתונים שהממשק כבר מציג: ציטוט הפתיחה, נימוקי הוועדה (בתרגום), כרטיסי התובנה, ההייקו,
// המעברים מרעיון לרעיון, כתבות "הגילוי הבא" ו"לעיר". התמונות הן עותקים מקומיים מ-Commons ב-web/public/next, עם הקרדיט.
// ייצוא לתמונות: CREATIONS_JS=<AppOfApp-GH>/public/creations.js node <AppOfApp-GH>/tools/creations-render.cjs "http://localhost:4176/#/creations" public/creations.json public/creations   (מתוך web/)
import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUB = join(ROOT, "web", "public");
const D = JSON.parse(readFileSync(join(PUB, "data.json"), "utf8"));

const FIELD_HE = { physics: "פיזיקה", chemistry: "כימיה", medicine: "רפואה", economics: "כלכלה", peace: "שלום", literature: "ספרות" };
const person = new Map(D.people.map((p) => [p.id, p]));
const sel = new Map(D.selected.map((s) => [s.nobel_id, s]));
const nameHe = (id) => { const p = person.get(id); if (!p) throw new Error(`no person ${id}`); return p.he || p.en; };
const prize = (id, y) => { const p = D.prizes.find((x) => x.id === id && x.y === y); if (!p) throw new Error(`no prize ${id}/${y}`); return p; };
const S = (id) => { const s = sel.get(id); if (!s) throw new Error(`not selected ${id}`); return s; };
const words = (s) => String(s ?? "").replace(/[*=]/g, "").split(/\s+/).filter(Boolean).length;

// תמונה מקומית של כתבת "הגילוי הבא" בתחום, והקרדיט שלה מ-Commons
const img = (field) => `next/${field}.jpg`;
const credit = (field) => {
  const a = D.next.articles[field];
  const im = S(a.image_from).image;
  return `${im.caption_he}. ${im.artist ?? "לא ידוע"}, ${im.license}, Wikimedia Commons`;
};

// ציטוט: הנימוק הרשמי של ועדת נובל, בתרגום שהאפליקציה כבר מציגה
const motive = (id, y, kicker) => {
  const p = prize(id, y);
  return { style: "quote", quote: p.mh, who: nameHe(id), cite: `נימוק ועדת נובל ל${FIELD_HE[p.f]}, ${y}. תרגום לעברית, לא נוסח רשמי`, kicker };
};
const haikuOf = (id, kicker) => { const s = S(id); return { style: "haiku", lines: s.museum.haiku, text: s.museum.note, kicker }; };

// ממה למה: מעבר מאושר מרעיון לרעיון. ההסבר המלא אם הוא קצר, אחרת המשפט המודגש שבו.
const transition = (field, fromId, toId) => {
  const t = D.transitions[field].find((x) => x.from.id === fromId && x.to.id === toId);
  if (!t) throw new Error(`no transition ${field} ${fromId}>${toId}`);
  const a = prize(t.from.id, t.from.y), b = prize(t.to.id, t.to.y);
  const sentences = t.how.match(/[^.!?]+[.!?]?/g).map((x) => x.trim()).filter(Boolean);
  const text = words(t.how) <= 24 ? t.how : (sentences.find((x) => x.includes("**")) ?? sentences[sentences.length - 1]);
  return {
    style: "fromto", title: t.title,
    fromLabel: `${nameHe(t.from.id)} · ${t.from.y}`, from: a.d,
    toLabel: `${nameHe(t.to.id)} · ${t.to.y}`, to: b.d,
    text, kicker: t.evidence?.length ? "מעבר מתועד: ציטוט או קשר מנחה בנתונים" : "מעבר מרעיון לרעיון: פרשנות מאושרת",
  };
};

// כתבת "הגילוי הבא": מאמר (פותח בפסקת המבט הרחב, כדי שהאות הגדולה לא תיפול על "ב-2025"), תובנה והייקו. התחזית היא הנחה, וזה כתוב ביצירה.
const nextEssay = (field, withImage) => {
  const a = D.next.articles[field];
  return { style: "essay", title: a.title, text: a.subtitle, body: [a.lens, a.hook, a.deep], image: withImage ? img(field) : undefined, credit: withImage ? credit(field) : undefined, kicker: `הגילוי הבא ב${FIELD_HE[field]} · התחזית היא [הנחה]` };
};
const nextInsight = (field) => { const a = D.next.articles[field]; return { style: "insight", title: a.insight, text: a.metaphor, kicker: `הגילוי הבא ב${FIELD_HE[field]}` }; };
const nextHaiku = (field) => { const a = D.next.articles[field]; return { style: "haiku", lines: a.haiku, text: a.subtitle, kicker: `הגילוי הבא ב${FIELD_HE[field]}` }; };
const laureateKicker = (id) => { const s = S(id); return `${nameHe(id)} · ${FIELD_HE[s.field]} ${s.year}`; };

const topics = [];
const room = (id, zone, title, sub, creations) => topics.push({ id, zone, title, sub, creations: creations.map((c) => ({ id: c.style, ...c })) });

// 1. ידע: הדימוי שעליו בנויה האפליקציה
const H = D.home;
const [qWho, ...qCite] = H.quote_by.split(", ");
room("shoulders", "ידע", "על כתפי ענקים", "הדימוי שעליו בנויה האפליקציה: ציטוט, הייקו והמספרים של הבחירה.", [
  { style: "quote", quote: H.quote_he, who: "אייזק ניוטון", cite: `${qWho}, ${qCite.join(", ")}`, kicker: "ציטוט הפתיחה" },
  { style: "haiku", lines: H.haiku, text: H.haiku_note, kicker: "גמד על כתפי ענקים" },
  { style: "insight", title: H.insight, text: D.mentor_why.split(". ")[0] + ".", kicker: "רשת המנחים" },
  { style: "gradient", title: `**${D.people.length.toLocaleString("en-US")}** ענקים, **${D.selected.length}** כתפיים`, text: "בכל תחום שישה זוכים: ארבעה לפי גיוון, ושניים לפי השפעה על התחום כולו.", kicker: "הבחירה" },
]);

// 2. הבנה: פיזיקה, מהמנה של איינשטיין אל המודל של בוהר
{
  const b = S("27");
  room("quanta", "הבנה", "מנות של אור, קפיצות באטום", "איך רעיון המנות עבר מהאור אל האטום, ומה הוא פותח היום במעגל החשמלי.", [
    transition("physics", "26", "27"),
    motive("27", 1922, laureateKicker("27")),
    haikuOf("27", laureateKicker("27")),
    nextInsight("physics"),
    { style: "post", title: b.card.idea_he, text: [b.museum.contribution, b.card.takeaway_he].join("\n"), image: img("physics"), credit: credit("physics"), tags: ["נובל", "פיזיקה", "בוהר"], kicker: laureateKicker("27") },
    nextEssay("physics", false),
  ]);
}

// 3. הבנה: כימיה, מהקשר הכימי אל החלל המתוכנן
{
  const y = S("1055");
  room("molecules", "הבנה", "אדריכלות של מולקולות", "מהזווית שבין שני אטומים אל גביש שהחלל בתוכו הוא המוצר.", [
    transition("chemistry", "217", "1055"),
    motive("1055", 2025, laureateKicker("1055")),
    haikuOf("1055", laureateKicker("1055")),
    nextInsight("chemistry"),
    { style: "gradient", title: y.card.takeaway_he, text: `לעיר: ${y.card.urban_example_he}`, kicker: laureateKicker("1055") },
    nextEssay("chemistry", true),
  ]);
}

// 4. ידע: רפואה, השינוי הקטן שהוביל לחיסוני mRNA
{
  const k = S("1024");
  room("mrna", "ידע", "שינוי קטן באות אחת", "קטלין קריקו ודרו וייסמן: איך שינוי של אות אחת ב-RNA פתח את הדרך לחיסונים.", [
    { style: "gradient", title: k.discovery, text: k.museum.contribution, kicker: laureateKicker("1024") },
    motive("1024", 2023, laureateKicker("1024")),
    haikuOf("1024", laureateKicker("1024")),
    transition("medicine", "390", "1024"),
    { style: "insight", title: `==${k.card.idea_he}==`, text: `מה לוקחים לעבודה: ${k.card.takeaway_he}`, kicker: laureateKicker("1024") },
    { style: "post", title: k.card.idea_he, text: [k.museum.contribution, `לעיר: ${k.card.urban_example_he}`].join("\n"), image: img("medicine"), credit: credit("medicine"), tags: ["נובל", "רפואה", "mRNA"], kicker: laureateKicker("1024") },
  ]);
}

// 5. ידע: ספרות, המשורר שתרגם את עצמו
{
  const t = S("583");
  room("translate", "ידע", "המשורר שתרגם את עצמו", "טאגור, הזוכה הראשון מחוץ לאירופה, ומה הקול האישי שווה כשמכונה כותבת.", [
    { style: "post", title: t.card.idea_he, text: [t.museum.contribution, `לעיר: ${t.card.urban_example_he}`].join("\n"), image: img("literature"), credit: credit("literature"), pos: "50% 4%", tags: ["נובל", "ספרות", "טאגור"], kicker: laureateKicker("583") },
    motive("583", 1913, laureateKicker("583")),
    haikuOf("583", laureateKicker("583")),
    transition("literature", "579", "583"),
    nextInsight("literature"),
    nextEssay("literature", false),
  ]);
}

// 6. יישום: כלכלה, קהילה שמנהלת משאב משותף
{
  const o = S("846"), a = D.next.articles.economics;
  room("commons", "יישום", "קהילה שמנהלת משאב משותף", "אוסטרום הראתה דרך שלישית בין שוק למדינה. מה עושים עם זה בשכונה, מחר בבוקר.", [
    { style: "veil", title: o.card.idea_he, text: `לעיר: ${o.card.urban_example_he}`, image: img("economics"), credit: credit("economics"), kicker: laureateKicker("846") },
    transition("economics", "679", "846"),
    motive("846", 2009, laureateKicker("846")),
    haikuOf("846", laureateKicker("846")),
    nextInsight("economics"),
    { style: "post", title: "מה עושים מחר בבוקר", text: [...a.action, `לאוסטרום: ${o.card.urban_example_he}`].join("\n"), image: img("economics"), credit: credit("economics"), tags: ["נובל", "כלכלה", "עיר"], kicker: "הגילוי הבא בכלכלה" },
  ]);
}

// 7. יישום: שלום, הדורות שעוד לא נולדו
{
  const k = S("524"), m = S("783"), a = D.next.articles.peace;
  room("generations", "יישום", "שלום עם הדורות הבאים", "מהצעדה של קינג ומהעצים של מאטאיי אל סעיף חדש בכל החלטה תכנונית.", [
    { style: "poster", title: k.card.idea_he, text: k.museum.contribution, image: img("peace"), credit: credit("peace"), pos: "50% 40%", kicker: laureateKicker("524") },
    motive("524", 1964, laureateKicker("524")),
    { style: "gradient", title: m.card.idea_he, text: `לעיר: ${m.card.urban_example_he}`, kicker: laureateKicker("783") },
    nextHaiku("peace"),
    { style: "post", title: "מה עושים מחר בבוקר", text: [...a.action, a.implications.personal].join("\n"), tags: ["נובל", "שלום", "תכנון"], kicker: "הגילוי הבא בשלום" },
    nextEssay("peace", false),
  ]);
}

// 8. יישום: מהמעבדה אל הרחוב, מתוך מסך "לעיר"
{
  const city = D.selected.filter((s) => s.card.urban_example_he);
  const r = S("1"), pick = ["6", "37", "719", "583", "496"].map(S);
  room("street", "יישום", "מהמעבדה אל הרחוב", "כל רעיון גדול נבדק כאן בקנה מידה של רחוב. היישום הוא הצעה לעבודה, לא טענה על הזוכה.", [
    { style: "fromto", title: "מהמעבדה אל הרחוב", fromLabel: laureateKicker("1"), from: r.card.idea_he, toLabel: "לעיר", to: r.card.urban_example_he, text: r.card.takeaway_he, kicker: "לעיר" },
    { style: "gradient", title: `**${city.length}** רעיונות, שאלה אחת`, text: "מה העיר לוקחת מזה? מהגילוי בשולחן המעבדה אל הרחוב, השכונה והתוכנית.", kicker: "לעיר" },
    { style: "insight", title: "==המדד קובע מה רואים.==", text: `${nameHe("719")}: ${S("719").card.urban_example_he}`, kicker: laureateKicker("719") },
    { style: "post", title: "חמישה רעיונות לרחוב", text: pick.map((s) => `${nameHe(s.nobel_id)}: ${s.card.urban_example_he}`).join("\n"), tags: ["נובל", "עיר", "תכנון"], kicker: "לעיר" },
  ]);
}

// סימון: אילו כרטיסי תובנה עדיין טיוטה
const drafts = D.selected.filter((s) => s.card_status !== "מאושר").length;

// שומרים את ה-png ואת חדר התערוכה מהריצה הקודמת
const out = join(PUB, "creations.json");
const prev = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : null;
for (const t of topics) {
  const pt = prev?.topics?.find((x) => x.id === t.id);
  if (pt?.room) t.room = pt.room;
  for (const c of t.creations) {
    for (const k of Object.keys(c)) if (c[k] === undefined) delete c[k];
    const pc = pt?.creations?.find((x) => x.id === c.id);
    if (pc?.png) c.png = pc.png;
  }
}

// בדיקות תקן: 6 חדרים לפחות, שלב מכל סוג, 4 עד 6 יצירות, בלי עיצוב חוזר בחדר, אורך כותרת והסבר
const warn = [];
const zones = new Set(topics.map((t) => t.zone));
if (topics.length < 6) warn.push("פחות מ-6 חדרים");
for (const z of ["ידע", "הבנה", "יישום"]) if (!zones.has(z)) warn.push(`חסר שלב ${z}`);
const styles = new Set();
for (const t of topics) {
  if (t.creations.length < 4 || t.creations.length > 6) warn.push(`${t.id}: ${t.creations.length} יצירות`);
  const st = t.creations.map((c) => c.style);
  if (new Set(st).size !== st.length) warn.push(`${t.id}: עיצוב חוזר`);
  for (const c of t.creations) {
    styles.add(c.style);
    if (c.title && words(c.title) > 8) warn.push(`${t.id}/${c.id}: כותרת ${words(c.title)} מילים`);
    if (c.style === "haiku" && c.lines.length !== 3) warn.push(`${t.id}/${c.id}: הייקו בלי 3 שורות`);
    if (c.style === "post" && c.text.split("\n").length > 6) warn.push(`${t.id}/${c.id}: פוסט ארוך`);
    if (["insight", "fromto", "gradient", "veil"].includes(c.style) && words(c.text) > 24) warn.push(`${t.id}/${c.id}: הסבר ${words(c.text)} מילים`);
    for (const f of [c.image]) if (f && !existsSync(join(PUB, f))) warn.push(`${t.id}/${c.id}: אין קובץ ${f}`);
  }
}
if (styles.size < 7) warn.push(`רק ${styles.size} עיצובים`);

const data = {
  app: {
    id: "prasnovel", name: "גמד על כתפי ענקים", url: "https://prasnovel-gh.vercel.app", repo: "Anat1969/PrasNovel-GH",
    note: `העובדות מנתוני הנובל הרשמיים. הרעיונות והיישום לעיר מכרטיסי התובנה (${drafts} מתוך ${D.selected.length} עדיין טיוטה לאישור). התחזיות בכתבות "הגילוי הבא" הן [הנחה].`,
    palette: {
      a: "#1B1A17", b: "#A32D2D", c: "#B08A2E", s: "#2E7D4F", accent: "#9A7419", marker: "#FFE45C",
      paper: "#FFFFFF", paper2: "#F6F2EA", ink: "#1B1A17", "b-wash": "#FCEBEB", "s-wash": "#E6F3EB",
      serif: '"Frank Ruhl Libre", "IBM Plex Sans Hebrew", serif',
    },
  },
  topics,
};
writeFileSync(out, JSON.stringify(data, null, 2) + "\n");
console.log(`${topics.length} חדרים, ${topics.reduce((n, t) => n + t.creations.length, 0)} יצירות, ${styles.size} עיצובים`);
if (warn.length) { console.log("אזהרות:\n" + warn.join("\n")); process.exitCode = 1; }
