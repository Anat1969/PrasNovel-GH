// מפיק PDF בגודל A4 לכל כתבת "הגילוי הבא", ותמונת תצוגה של הדף, מתוך הממשק הבנוי.
// הרצה: python3 -m http.server 4180 -d app, ואז node scripts/print_next.cjs
// הפלט: web/public/next/pdf/next-<field>.pdf ו-next-<field>.jpg, וגם next-all.pdf
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const base = process.env.BASE || "http://localhost:4180/index.html";
const out = path.join(__dirname, "..", "web", "public", "next", "pdf");
const FIELDS = ["physics", "chemistry", "medicine", "economics", "peace", "literature"];
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1000, height: 1300 }, deviceScaleFactor: 2 });
  for (const f of [...FIELDS, "all"]) {
    await p.emulateMedia({ media: "screen" });
    await p.goto(`${base}#/print?f=${f}`, { waitUntil: "networkidle" });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(800);
    const over = await p.$$eval(".a4", (els) => els.map((e) => e.scrollHeight - e.clientHeight));
    if (over.some((o) => o > 0)) throw new Error(`${f}: text overflows the A4 sheet ${over}`);
    const broken = await p.$$eval(".a4 img", (els) => els.filter((i) => !i.naturalWidth).length);
    if (broken) throw new Error(`${f}: ${broken} image(s) did not load`);
    if (f !== "all") await (await p.$(".a4")).screenshot({ path: path.join(out, `next-${f}.jpg`), type: "jpeg", quality: 88 });
    await p.emulateMedia({ media: "print" });
    await p.pdf({ path: path.join(out, `next-${f}.pdf`), format: "A4", printBackground: true, preferCSSPageSize: true });
    console.log(f, "ok");
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
