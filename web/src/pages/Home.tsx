import { useMemo, useState } from "react";
import Globe, { GlobePoint } from "../lib/Globe";
import { CONT_HE, FIELD, FIELDS, FieldCode, Model, nameHe } from "../lib/data";
import Rich from "../lib/Rich";
import { go, href } from "../lib/route";
import { stats } from "../lib/stats";
import { ERAS, EraChips, ShapeToggle, Src, Tone } from "../lib/ui";

export default function Home({ m }: { m: Model }) {
  const s = useMemo(() => stats(m), [m]);
  const [hl, setHl] = useState<FieldCode | null>(null);
  const [pin, setPin] = useState<FieldCode | null>(null);
  const [era, setEra] = useState<string | null>(null);
  const [flat, setFlat] = useState(false);
  const range = ERAS.find((e) => e.id === era);
  const points: GlobePoint[] = useMemo(() => m.people.filter((p) => p.lat != null && p.lon != null)
    .filter((p) => !pin || (m.prizesOf.get(p.id) ?? []).some((x) => x.f === pin))
    .filter((p) => !range || (m.prizesOf.get(p.id) ?? []).some((x) => x.y >= range.from && x.y <= range.to)).map((p) => {
    const f = pin ?? m.firstField.get(p.id)!;
    const dim = !pin && hl && f !== hl;
    return { id: p.id, lat: p.lat!, lon: p.lon!, color: dim ? "rgba(27,26,23,.12)" : FIELD[f].color, big: m.selIds.has(p.id) && !dim,
      label: `${nameHe(p)} · ${FIELD[f].he} ${m.firstYear.get(p.id)}` };
  }), [m, hl, pin, range]);
  const phys = [s.ageMed("physics", 1901, 1950), s.ageMed("physics", 2001, 2100)].map(Math.round);
  const eu = s.contShare[0];
  const h = m.home;
  const span = s.lastYear - s.firstYear + 1;
  const counts = Object.fromEntries(FIELDS.map((f) => [f.code, m.prizes.filter((p) => p.f === f.code).length]));

  const map = [
    { page: "people", label: "הזוכים הנבחרים", num: `${m.selected.length}`, line: "התרומה, מה שנתנה, ותמונת עבודה לכל אחד" },
    { page: "time", label: "ציר זמן", num: `${phys[0]}→${phys[1]}`, line: "גיל הזכייה החציוני בפיזיקה, לפני 1950 ואחרי 2000" },
    { page: "net", label: "רשת המנחים", num: `${m.edges.length}`, line: `קשרי מנחה ותלמיד, ${s.laureateEdges} מהם בין זוכים` },
    { page: "world", label: "גלובוס", num: `${eu.share.toFixed(0)}%`, line: `מהפרסים לאנשים: נולדו ב${CONT_HE[eu.c] ?? eu.c}` },
  ];

  return (
    <div className="home">
      <section className="home-text">
        <div className="rise">
          <div className="label">פרס נובל · <bdi className="num">{s.firstYear}</bdi>–<bdi className="num">{s.lastYear}</bdi></div>
          <Rich as="h1" className="home-h1">{`**${m.people.length.toLocaleString("en")}** ענקים. **${m.selected.length}** כתפיים לעמוד עליהן.`}</Rich>
          <p className="explain lines">
            <Rich>{`${span} שנות פרס, ${m.prizes.length.toLocaleString("en")} הענקות, שישה תחומים.`}</Rich>
            <Rich>{`${m.selected.length} זוכים נבחרו להעמקה: ==ללמוד מהם, בלי להפוך אותם לנוסחה.==`}</Rich>
          </p>
          {/* סרטון הדגמה: הכפתור נטען מ-demo.js (תיק האפליקציות) רק כשיש לאפליקציה סרטון ב-aoa_apps */}
          <div className="home-demo" data-aoa-demo="" aria-label="סרטון הדגמה" />
        </div>
        <div className="home-tones rise" style={{ animationDelay: ".1s" }}>
          <Tone kind="problem" title="בעיה">{`המדגם מוטה: רק **${s.womenShare.toFixed(1)}%** מהפרסים לאנשים הוענקו לנשים.\nאין פרס לאדריכלות ולתכנון ערים.`}</Tone>
          <Tone kind="solution" title="פתרון">{"עובדה ממקור רשמי, פער בין מקורות מסומן.\nכל תובנה מתויגת: **עובדה**, **הערכה** או **הנחה**."}</Tone>
          <Tone kind="insight" title="תובנה">{h?.insight ?? "==הכתפיים הן רשת, לא אדם אחד.=="}</Tone>
        </div>
        <nav className="home-map" aria-label="מפת התוכן">
          {map.map((c, i) => (
            <a key={c.page} className="press map-card rise" style={{ animationDelay: `${.15 + i * .06}s` }} href={href(c.page)}>
              <span className="label">{c.label}</span>
              <span className="map-num num">{c.num}</span>
              <span className="map-line">{c.line}</span>
            </a>
          ))}
        </nav>
        {h && (
          <div className="home-museum rise" style={{ animationDelay: ".4s" }}>
            <figure className="m-quote">
              <blockquote className="quote">"{h.quote_he}"</blockquote>
              <div className="lat" dir="ltr" style={{ margin: 0 }}>"{h.quote_en}"</div>
              <figcaption><Src href={h.quote_url}>{h.quote_by}</Src> <span className="label">תרגום</span></figcaption>
            </figure>
            <div>
              <div className="haiku">{h.haiku.map((l) => <span key={l}>{l}</span>)}</div>
              <div className="src" style={{ marginTop: 4 }}>{h.haiku_note} הייקו: טיוטת Claude.</div>
            </div>
          </div>
        )}
        <div className="src">{h?.inspiration}. נתונים: Nobel Prize API v2.1 ו-Wikidata, CC0.</div>
      </section>
      <section className="panel home-globe rise" style={{ animationDelay: ".05s" }} aria-label="גלובוס">
        <div className="globe-head">
          <span className="label">מקום הלידה של כל זוכה, לפי גבולות היום · <bdi className="num">{points.length}</bdi> על המפה</span>
          <ShapeToggle flat={flat} onChange={setFlat} />
        </div>
        <EraChips value={era} onChange={setEra} />
        <div className="fill"><Globe flat={flat} points={points} onPick={(id) => go(m.selIds.has(id) ? "people" : "world", { id })} /></div>
        <div className="legend globe-legend" onMouseLeave={() => setHl(null)}>
          <button className="chip" aria-pressed={!pin} onClick={() => setPin(null)}>הכול</button>
          {FIELDS.map((f) => (
            <button key={f.code} className="chip" aria-pressed={pin === f.code} onMouseEnter={() => setHl(f.code)} onFocus={() => setHl(f.code)}
              onClick={() => setPin(pin === f.code ? null : f.code)} title="לחיצה מבודדת את התחום">
              <i className="dot" style={{ background: f.color }} />{f.he} <bdi className="num" style={{ fontWeight: 400 }}>{counts[f.code]}</bdi>
            </button>
          ))}
          <span><i className="ring" />הנבחרים</span>
        </div>
      </section>
    </div>
  );
}
