// הכתבות כקובץ פתוח: articles.json, שהמגזין "חוט" (MaAmarim-GH) קורא. הכתבה נשארת כאן, ושם אין עותק.
// נבנה בכל build מתוך public/data.json (ראו vite.config.ts), כך שאין קובץ לעדכן ביד.
// שלושה סוגים: "הגילוי הבא" (שש כתבות, [הנחה]), וחוטי האבולוציה של פריצקר ושל טיורינג ([הערכה], והגילוי הבא בהם [הנחה]).
// כל כתבה היא רצף של בלוקים, באותה צורה שהמגזין כבר קורא מאמירות: p, h, pull, insight, haiku.
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

const URL_ = "https://prasnovel-gh.vercel.app";
const FIELD: Record<string, string> = { physics: "פיזיקה", chemistry: "כימיה", medicine: "רפואה", economics: "כלכלה", peace: "שלום", literature: "ספרות" };
type Block = { p: string } | { h: string } | { pull: string; cite: string } | { insight: string } | { haiku: string[]; note: string };
type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function articlesFeed() {
  const d = JSON.parse(readFileSync(fileURLToPath(new URL("./public/data.json", import.meta.url)), "utf8")) as Any;
  const out: Any[] = [];

  for (const [f, a] of Object.entries((d.next?.articles ?? {}) as Record<string, Any>)) {
    const im = a.implications ?? {};
    const body: Block[] = [
      { p: a.hook }, { h: "העדשה" }, { p: a.lens }, { h: "לעומק" }, { p: a.deep },
      { pull: a.metaphor, cite: "הדימוי" },
      { h: "מה זה אומר" }, { p: `**עכשיו.** ${im.now}` }, { p: `**בקרוב.** ${im.short}` }, { p: `**בהמשך.** ${im.long}` },
      { h: "בעיר" }, { p: String(im.personal ?? "").replace(/^לעיר:\s*/, "") }, ...(a.action ?? []).map((x: string) => ({ p: x })),
      { insight: a.insight }, { haiku: a.haiku, note: "הייקו מקורי" },
    ];
    out.push({ id: `next-${f}`, url: `${URL_}/#/next?f=${f}`, zone: "הגילוי הבא", kicker: `הגילוי הבא · ${FIELD[f] ?? f} · [הנחה]`, title: a.title, sub: a.subtitle, image: `${URL_}/next/${f}.jpg`, credit: null, body, notes: [d.next.status] });
  }

  for (const [room, key, name] of [["pritzker", "t", "פריצקר"], ["turing", "a", "טיורינג"]] as const) {
    const R = d[room] ?? {}, by = new Map<string, Any>((R.entries ?? []).map((e: Any) => [e.slug, e]));
    for (const [code, a] of Object.entries((R.articles ?? {}) as Record<string, Any>)) {
      const steps = (a.steps ?? []).map((s: Any) => ({ s, e: by.get(s.slug) }));
      const img = [...steps].reverse().map(({ e }: Any) => e?.work?.img ?? e?.people?.find((p: Any) => p.img)?.img).find(Boolean);
      const body: Block[] = [
        { p: a.hook }, { h: "הצעדים" },
        ...steps.map(({ s, e }: Any) => ({ p: e ? `**${e.he}, ${e.y}.** ${s.step}` : s.step })),
        { insight: `==${a.insight}== [הערכה]` },
        { h: "הגילוי הבא" }, { p: `${a.next} [הנחה]` },
        { h: "בעיר" }, { p: a.city },
        { haiku: a.haiku, note: "הייקו מקורי" },
      ];
      out.push({ id: `${room}-${code}`, url: `${URL_}/#/${room}?${key}=${code}&art=1`, zone: name, kicker: `${name} · אבולוציה של רעיון`, title: a.title, sub: a.sub, image: img ? `${URL_}/${img}` : null, credit: null, body, notes: [`${name}: קריאת החוט היא פרשנות מאושרת [הערכה], והגילוי הבא הוא [הנחה].`, ...(typeof R.source === "string" ? [R.source] : [])] });
    }
  }
  return { app: { id: "pras", name: "גמד על כתפי ענקים", url: URL_, repo: "Anat1969/PrasNovel-GH" }, articles: out };
}
