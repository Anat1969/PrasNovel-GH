import { useMemo, useRef, useState } from "react";
import { FIELD, FIELDS, FieldCode, Model, NOBEL_TO_OA, OA_FIELD_HE, nameHe } from "../lib/data";
import FieldGlyph from "../lib/FieldGlyph";
import Rich from "../lib/Rich";
import { href } from "../lib/route";
import { useSize } from "../lib/useSize";
import { Src, Tone } from "../lib/ui";

type Row = { id: string; name: string; field: FieldCode; total: number; out: number; top: [string, number][] };

export default function Cross({ m }: { m: Model }) {
  const [view, setView] = useState<"use" | "mentors">("use");
  const [hover, setHover] = useState<string | null>(null);
  const rows: Row[] = useMemo(() => m.selected.filter((s) => s.openalex.fields?.length).map((s) => {
    const f = s.openalex.fields!; const home = NOBEL_TO_OA[s.field];
    const total = f.reduce((a, x) => a + x[1], 0);
    const outside = f.filter((x) => !home.includes(x[0]));
    return { id: s.nobel_id, name: nameHe(m.byId.get(s.nobel_id)), field: s.field, total, out: outside.reduce((a, x) => a + x[1], 0) / total, top: outside.slice(0, 2) };
  }).sort((a, b) => b.out - a.out), [m]);
  const T = rows.reduce((a, r) => a + r.total, 0);
  const overall = rows.reduce((a, r) => a + r.out * r.total, 0) / Math.max(1, T);

  // מנחים ותלמידים בין תחומים
  const flows = useMemo(() => {
    const c = new Map<string, number>();
    for (const l of m.links) {
      const a = m.firstField.get(l.m), b = m.firstField.get(l.s);
      if (!a || !b) continue;
      c.set(`${a}>${b}`, (c.get(`${a}>${b}`) ?? 0) + 1);
    }
    return [...c.entries()].map(([k, n]) => { const [a, b] = k.split(">") as FieldCode[]; return { a, b, n }; });
  }, [m]);
  const crossLinks = m.links.filter((l) => m.firstField.get(l.m) !== m.firstField.get(l.s));
  const doubles = [...m.prizesOf.entries()].filter(([, ps]) => new Set(ps.map((p) => p.f)).size > 1);

  const box = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(box);

  return (
    <div className="focus-aside">
      <div className="screen" style={{ gridTemplateRows: "auto auto minmax(0,1fr)" }}>
        <div className="screen-head">
          <div>
            <Rich as="h1" className="insight-line">{`**${Math.round(overall * 100)}%** מהציטוטים לרעיונות הנבחרים מגיעים מחוץ לתחום הפרס.`}</Rich>
            <p className="explain">הפרס מסווג לתחום אחד. <mark className="insight">הרעיון עצמו נודד: לרפואה, להנדסה, לסביבה ולחברה.</mark></p>
          </div>
        </div>
        <div className="seg" role="group" aria-label="תצוגה">
          <button className="seg-btn" aria-pressed={view === "use"} onClick={() => setView("use")}>מי משתמש ברעיון</button>
          <button className="seg-btn" aria-pressed={view === "mentors"} onClick={() => setView("mentors")}>מנחים ותלמידים בין תחומים</button>
        </div>
        <div className="panel fill" ref={box}>
          {view === "use" ? (
            <div className="use-rows">
              <div className="use-head label"><span>זוכה</span><span>בתוך התחום · מחוצה לו</span><span>מחוץ לתחום</span><span>לאן בעיקר</span></div>
              {rows.map((r) => (
                <a key={r.id} className="use-row" href={href("people", { id: r.id })} style={{ ["--c" as string]: FIELD[r.field].color }}
                  data-dim={hover && hover !== r.field ? "1" : undefined}>
                  <span className="use-name"><FieldGlyph f={r.field} size={12} /> {r.name}</span>
                  <span className="use-bar" title={`${r.total.toLocaleString("en-US")} עבודות מצטטות`}>
                    <i className="in" style={{ width: `${(1 - r.out) * 100}%` }} /><i className="out" style={{ width: `${r.out * 100}%` }} />
                  </span>
                  <span className="num use-pct">{Math.round(r.out * 100)}%</span>
                  <span className="use-top">{r.top.map(([f]) => OA_FIELD_HE[f] ?? f).join(" · ")}</span>
                </a>
              ))}
              <div className="legend idea-legend" onMouseLeave={() => setHover(null)}>
                {FIELDS.filter((f) => rows.some((r) => r.field === f.code)).map((f) => (
                  <button key={f.code} className="chip" onMouseEnter={() => setHover(f.code)} onFocus={() => setHover(f.code)} aria-pressed={hover === f.code}
                    onClick={() => setHover(hover === f.code ? null : f.code)}>
                    <i className="dot" style={{ background: f.color }} />{f.he}
                  </button>
                ))}
                <span><i style={{ background: "var(--ink)", borderRadius: 0 }} />מחוץ לתחום הפרס</span>
                <span>לפי תחום המחקר של העבודות המצטטות (OpenAlex)</span>
              </div>
            </div>
          ) : (
            w > 0 && <Flows flows={flows} w={w} h={h} hover={hover} setHover={setHover} />
          )}
        </div>
      </div>
      <aside className="panel panel-pad scroll-in stack">
        <Tone kind="insight" title="למה זה חשוב [הערכה]">{"==הגבולות בין התחומים הם מנהליים, לא טבעיים.==\nרעיון בפיזיקה הופך לכלי ברפואה, ורעיון בכלכלה הופך למדיניות סביבתית."}</Tone>
        <div className="label">זכו בשני תחומים</div>
        {doubles.map(([id, ps]) => (
          <div key={id} className="dense-row"><strong>{nameHe(m.byId.get(id))}</strong>
            <span className="label" style={{ marginInlineStart: "auto" }}>{ps.map((p) => `${FIELD[p.f].he} ${p.y}`).join(" · ")}</span></div>
        ))}
        <div className="label">מנחה בתחום אחד, תלמיד בתחום אחר (<bdi className="num">{crossLinks.length}</bdi> מתוך <bdi className="num">{m.links.length}</bdi>)</div>
        <div>
          {crossLinks.slice(0, 40).map((l) => (
            <div key={l.m + l.s} className="dense-row cross-row">
              <span><span style={{ color: FIELD[m.firstField.get(l.m)!].color }}>●</span> {nameHe(m.byId.get(l.m))}</span>
              <span className="muted">←</span>
              <span><span style={{ color: FIELD[m.firstField.get(l.s)!].color }}>●</span> {nameHe(m.byId.get(l.s))}</span>
            </div>
          ))}
        </div>
        <Tone kind="problem" title="איך לקרוא">{"תחום עבודה מצטטת נקבע לפי הנושא הראשי שלה ב-OpenAlex.\nקשר מנחה הוא מה שתועד ב-Wikidata. היעדר קשר אינו היעדר השפעה."}</Tone>
        <Src href="https://docs.openalex.org/api-entities/topics">OpenAlex: נושאים ותחומים</Src>
      </aside>
    </div>
  );
}

/** זרימות: מנחים מימין (תחום המנחה), תלמידים משמאל (תחום התלמיד). רוחב הסרט: מספר הקשרים. */
function Flows({ flows, w, h, hover, setHover }: { flows: { a: FieldCode; b: FieldCode; n: number }[]; w: number; h: number;
  hover: string | null; setHover: (v: string | null) => void }) {
  const codes = FIELDS.map((f) => f.code).filter((c) => flows.some((x) => x.a === c || x.b === c));
  const tot = flows.reduce((a, x) => a + x.n, 0);
  const pad = 40, gap = 14, colW = 14;
  const usable = h - pad * 2 - gap * (codes.length - 1);
  const k = usable / Math.max(1, tot);
  const outSum = (c: string) => flows.filter((x) => x.a === c).reduce((a, x) => a + x.n, 0);
  const inSum = (c: string) => flows.filter((x) => x.b === c).reduce((a, x) => a + x.n, 0);
  const xR = w - 150, xL = 150;
  const yR = new Map<string, number>(), yL = new Map<string, number>();
  let y = pad; for (const c of codes) { yR.set(c, y); y += outSum(c) * k + gap; }
  y = pad; for (const c of codes) { yL.set(c, y); y += inSum(c) * k + gap; }
  const offR = new Map(codes.map((c) => [c, 0])), offL = new Map(codes.map((c) => [c, 0]));
  const sorted = [...flows].sort((p, q) => codes.indexOf(p.a) - codes.indexOf(q.a) || codes.indexOf(p.b) - codes.indexOf(q.b));
  return (
    <svg width={w} height={h} style={{ direction: "ltr" }} role="img" aria-label="זרימת מנחים ותלמידים בין תחומים">
      {sorted.map((f) => {
        const t = f.n * k;
        const y0 = yR.get(f.a)! + offR.get(f.a)!; offR.set(f.a, offR.get(f.a)! + t);
        const y1 = yL.get(f.b)! + offL.get(f.b)!; offL.set(f.b, offL.get(f.b)! + t);
        const cross = f.a !== f.b;
        const on = !hover || hover === f.a || hover === f.b;
        const mx = (xR + xL) / 2;
        const d = `M${xR - colW},${y0} C${mx},${y0} ${mx},${y1} ${xL + colW},${y1} L${xL + colW},${y1 + t} C${mx},${y1 + t} ${mx},${y0 + t} ${xR - colW},${y0 + t} Z`;
        return <path key={f.a + f.b} d={d} fill={FIELD[f.a].color} opacity={on ? (cross ? .75 : .16) : .05}>
          <title>{`${FIELD[f.a].he} ← ${FIELD[f.b].he}: ${f.n}`}</title></path>;
      })}
      {codes.map((c) => (
        <g key={c} onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(null)} style={{ cursor: "default" }}>
          <rect x={xR - colW} y={yR.get(c)} width={colW} height={Math.max(2, outSum(c) * k)} fill={FIELD[c as FieldCode].color} />
          <text x={xR + 6} y={yR.get(c)! + Math.max(2, outSum(c) * k) / 2} dy="0.35em" fontSize="13" fill="#1B1A17" fontFamily="var(--mono)">{outSum(c)}</text>
          <text x={xR + 40} y={yR.get(c)! + Math.max(2, outSum(c) * k) / 2} dy="0.35em" fontSize="13" fill="#1B1A17">{FIELD[c as FieldCode].he}</text>
          <rect x={xL} y={yL.get(c)} width={colW} height={Math.max(2, inSum(c) * k)} fill={FIELD[c as FieldCode].color} />
          <text x={xL - 6} y={yL.get(c)! + Math.max(2, inSum(c) * k) / 2} dy="0.35em" textAnchor="end" fontSize="13" fill="#1B1A17" fontFamily="var(--mono)">{inSum(c)}</text>
          <text x={xL - 40} y={yL.get(c)! + Math.max(2, inSum(c) * k) / 2} dy="0.35em" textAnchor="end" fontSize="13" fill="#1B1A17">{FIELD[c as FieldCode].he}</text>
        </g>
      ))}
      <text x={w - 10} y={22} textAnchor="end" fontSize="12" fill="#77756F">תחום המנחה</text>
      <text x={10} y={22} fontSize="12" fill="#77756F">תחום התלמיד</text>
      <text x={w / 2} y={h - 12} textAnchor="middle" fontSize="12" fill="#77756F">סרט מלא: חוצה תחומים. סרט שקוף: בתוך אותו תחום.</text>
    </svg>
  );
}
