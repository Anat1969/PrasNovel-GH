// בדיקת קצה לדף "יצירות": לפחות 6 חדרים, ובכל חדר יצירות. גם בנייד (390): בלי גלילה אופקית, והדף נגלל.
// הרצה: cd web && npm run build && npx vite preview --port 4176, ואז מהשורש:
//   CREATIONS_JS=<AppOfApp-GH>/public/creations.js node tests/e2e_creations.cjs [http://localhost:4176/]
// creations.js נטען מעותק מקומי (הסביבה לא תמיד מגיעה ל-GitHub Pages), ו-ai-menu.js מדומה.
const { chromium } = require("playwright");
const base = process.argv[2] || process.env.BASE || "http://localhost:4176/";
const local = process.env.CREATIONS_JS || "/home/user/appofapp-gh/public/creations.js";
const fail = (m) => { console.error("נכשל:", m); process.exitCode = 1; };
(async () => {
  const b = await chromium.launch();
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const p = await b.newPage({ viewport: vp });
    await p.route("**/ai-menu.js", (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
    await p.route("**/creations.js", (r) => r.fulfill({ path: local, contentType: "application/javascript" }));
    await p.goto(`${base}#/creations`, { waitUntil: "networkidle" });
    await p.waitForSelector("app-creations .cr-room", { timeout: 20000 });
    const tab = await p.$('a.tab[aria-current="page"]');
    if (!tab || (await tab.textContent()) !== "יצירות") fail("הלשונית 'יצירות' לא מסומנת");
    const rooms = await p.$$eval("app-creations .cr-room", (els) => els.map((e) => e.querySelectorAll(".cr-card").length));
    if (rooms.length < 6) fail(`רק ${rooms.length} חדרים`);
    if (rooms.some((n) => n < 4 || n > 6)) fail(`מספר יצירות בחדר: ${rooms}`);
    const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight, ih: innerHeight }));
    if (m.sw > m.cw + 1) fail(`גלילה אופקית ב-${vp.width}: ${m.sw} > ${m.cw}`);
    if (m.sh <= m.ih) fail(`הדף לא נגלל ב-${vp.width}`);
    console.log(`${vp.width}: ${rooms.length} חדרים, ${rooms.reduce((a, n) => a + n, 0)} יצירות`);
    await p.close();
  }
  await b.close();
  if (!process.exitCode) console.log("עבר");
})().catch((e) => { console.error(e); process.exit(1); });
