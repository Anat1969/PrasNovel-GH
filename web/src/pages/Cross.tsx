import { useMemo, useState } from "react";
import { FIELD, FIELDS, FieldCode, Model, NOBEL_TO_OA, OA_FIELD_HE, nameHe } from "../lib/data";
import FieldGlyph from "../lib/FieldGlyph";
import IdeaPanel from "../lib/IdeaPanel";
import Rich from "../lib/Rich";
import { go } from "../lib/route";
import { SortHead, useSort } from "../lib/sort";
import { FieldChips, Src, Tone } from "../lib/ui";

type Row = { id: string; name: string; disc: string | null; field: FieldCode; total: number; out: number; top: [string, number][]; city: number; cityTop: [string, number][] };
/** תחומי מחקר שנוגעים לעיר ולתכנון (רמת field ב-OpenAlex). */
const CITY = ["Environmental Science", "Social Sciences", "Engineering", "Earth and Planetary Sciences", "Energy", "Decision Sciences"];
type Pick = { kind: "idea"; id: string; f?: string } | { kind: "cell"; a: FieldCode; b: FieldCode } | null;

export default function Cross({ m, params }: { m: Model; params: Record<string, string> }) {
  const [view, setView] = useState<"use" | "city" | "mentors">(params.v === "city" ? "city" : "use");
  const [fields, setFields] = useState<FieldCode[]>(() => (params.f ? (params.f.split(",") as FieldCode[]) : []));
  const [pick, setPick] = useState<Pick>(null);
  const rows: Row[] = useMemo(() => m.selected.filter((s) => s.openalex.fields?.length && (!fields.length || fields.includes(s.field))).map((s) => {
    const f = s.openalex.fields!; const home = NOBEL_TO_OA[s.field];
    const total = f.reduce((a, x) => a + x[1], 0);
    const outside = f.filter((x) => !home.includes(x[0]));
    const cityF = f.filter((x) => CITY.includes(x[0]));
    return { id: s.nobel_id, name: nameHe(m.byId.get(s.nobel_id)), disc: s.discovery, field: s.field, total, out: outside.reduce((a, x) => a + x[1], 0) / total, top: outside.slice(0, 2),
      city: cityF.reduce((a, x) => a + x[1], 0) / total, cityTop: cityF.slice(0, 2) };
  }), [m, fields, view]); // view: re-sort when the lens changes
  const { sorted, s, toggle } = useSort(rows, {
    name: (r: Row) => r.name, field: (r: Row) => FIELD[r.field].he, out: (r: Row) => (view === "city" ? r.city : r.out), total: (r: Row) => r.total,
  }, { key: "out", dir: "desc" });
  const T = rows.reduce((a, r) => a + r.total, 0);
  const overall = rows.reduce((a, r) => a + r.out * r.total, 0) / Math.max(1, T);
  const cityAll = rows.reduce((a, r) => a + r.city * r.total, 0) / Math.max(1, T);
  const cityLead = [...rows].sort((a, b) => b.city - a.city)[0];
  const isCity = view === "city";

  // מנחה ותלמיד לפי תחום (הפרס הראשון של כל אחד)
  const links = useMemo(() => m.links.filter((l) => {
    const a = m.firstField.get(l.m), b = m.firstField.get(l.s);
    return a && b && (!fields.length || fields.includes(a) || fields.includes(b));
  }), [m, fields]);
  const codes = FIELDS.map((f) => f.code);
  const cell = (a: FieldCode, b: FieldCode) => links.filter((l) => m.firstField.get(l.m) === a && m.firstField.get(l.s) === b);
  const cross = links.filter((l) => m.firstField.get(l.m) !== m.firstField.get(l.s));
  const top = codes.flatMap((a) => codes.filter((b) => b !== a).map((b) => ({ a, b, n: cell(a, b).length }))).sort((x, y) => y.n - x.n)[0];
  const max = Math.max(1, ...codes.flatMap((a) => codes.map((b) => cell(a, b).length)));
  const doubles = [...m.prizesOf.entries()].filter(([, ps]) => new Set(ps.map((p) => p.f)).size > 1);
  const setF = (f: FieldCode[]) => { setFields(f); setPick(null); go("cross", { f: f.join(",") || undefined }); };

  return (
    <div className="focus-aside">
      <div className="screen" style={{ gridTemplateRows: "auto minmax(0,1fr)" }}>
        <div className="screen-head">
          <div>
            {isCity
              ? <Rich as="h1" className="insight-line">{`**${Math.round(cityAll * 100)}%** מהשימוש ברעיונות הנבחרים הוא בתחומים שנוגעים לעיר.${cityLead ? ` בראש: **${cityLead.name}**.` : ""}`}</Rich>
              : view === "use"
              ? <Rich as="h1" className="insight-line">{`**${Math.round(overall * 100)}%** מהעבודות שמצטטות את הרעיונות הנבחרים הן מחוץ לתחום הפרס.`}</Rich>
              : <Rich as="h1" className="insight-line">{`**${cross.length}** מתוך **${links.length}** קשרי מנחה ותלמיד בין זוכים חוצים תחומים.`}</Rich>}
            <p className="explain">{isCity
              ? <>סביבה, חברה, הנדסה, כדור הארץ, אנרגיה ומדעי ההחלטה. <mark className="insight">אילו רעיונות של זוכי נובל כבר עובדים בשביל העיר.</mark> לחיצה על זוכה מציגה בצד את העבודות עצמן.</>
              : view === "use"
              ? <>הפרס מסווג לתחום אחד. <mark className="insight">הרעיון עצמו נודד: לרפואה, להנדסה, לסביבה ולחברה.</mark> לחיצה על זוכה מציגה בצד את העבודות שמשתמשות ברעיון.</>
              : <>שורה: התחום של המנחה. עמודה: התחום של התלמיד. {top && top.n > 0 && <mark className="insight">המעבר הנפוץ: מ{FIELD[top.a].he} ל{FIELD[top.b].he} ({top.n}).</mark>} לחיצה על תא מציגה בצד את הזוגות.</>}</p>
          </div>
          <div className="controls">
            <FieldChips value={fields} onChange={setF} />
            <div className="seg" role="group" aria-label="תצוגה">
              <button className="seg-btn" aria-pressed={view === "use"} onClick={() => { setView("use"); setPick(null); }}>מי משתמש ברעיון</button>
              <button className="seg-btn" aria-pressed={isCity} onClick={() => { setView("city"); setPick(null); }}>עיר ותכנון</button>
              <button className="seg-btn" aria-pressed={view === "mentors"} onClick={() => { setView("mentors"); setPick(null); }}>מנחים ותלמידים בין תחומים</button>
            </div>
          </div>
        </div>
        <div className="panel fill">
          {view !== "mentors" ? (
            <div className="use-rows">
              <div className="use-head">
                <SortHead k="name" s={s} toggle={toggle}>זוכה והגילוי</SortHead>
                <SortHead k="total" s={s} toggle={toggle}>{isCity ? "עיר ותכנון · שאר התחומים" : "בתוך התחום · מחוצה לו"}</SortHead>
                <SortHead k="out" s={s} toggle={toggle}>{isCity ? "עיר" : "מחוץ"}</SortHead>
                <SortHead k="field" s={s} toggle={toggle}>{isCity ? "באילו תחומים" : "לאן בעיקר"}</SortHead>
              </div>
              {sorted.map((r) => (
                <div key={r.id} role="button" tabIndex={0} className={`use-row${pick?.kind === "idea" && pick.id === r.id ? " on" : ""}`} style={{ ["--c" as string]: FIELD[r.field].color }}
                  onClick={() => setPick({ kind: "idea", id: r.id, f: (isCity ? r.cityTop : r.top)[0]?.[0] })} onKeyDown={(e) => { if (e.key === "Enter") setPick({ kind: "idea", id: r.id, f: (isCity ? r.cityTop : r.top)[0]?.[0] }); }}>
                  <span className="use-name"><FieldGlyph f={r.field} size={12} />
                    <span className="idea-n"><button className="lline-name" onClick={(e) => { e.stopPropagation(); go("people", { id: r.id }); }} title="לכרטיס הזוכה">{r.name}</button>
                      <span className="idea-disc">{r.disc}</span></span></span>
                  <span className="use-bar" title={`${r.total.toLocaleString("en-US")} עבודות מצטטות`}>
                    {isCity ? <><i className="city" style={{ width: `${r.city * 100}%` }} /><i className="rest" style={{ width: `${(1 - r.city) * 100}%` }} /></>
                      : <><i className="in" style={{ width: `${(1 - r.out) * 100}%` }} /><i className="out" style={{ width: `${r.out * 100}%` }} /></>}
                  </span>
                  <span className="num use-pct">{Math.round((isCity ? r.city : r.out) * 100)}%</span>
                  <span className="use-top">{(isCity ? r.cityTop : r.top).map(([f]) => OA_FIELD_HE[f] ?? f).join(" · ")}</span>
                </div>
              ))}
              <div className="legend panel-legend">
                {isCity ? <span><i style={{ background: "var(--bank)", borderRadius: 0 }} />תחומים שנוגעים לעיר ולתכנון</span> : null}
                <span><i style={{ background: "var(--ink)", borderRadius: 0 }} />מחוץ לתחום הפרס</span>
                <span><i style={{ background: "#2F5D8A", borderRadius: 0 }} />בתוך התחום (בצבע התחום)</span>
                <span>לפי תחום המחקר של העבודות המצטטות (OpenAlex)</span>
              </div>
            </div>
          ) : (
            <div className="matrix-wrap">
              <table className="matrix">
                <thead><tr><th className="m-corner"><span>מנחה ↓</span><span>תלמיד ←</span></th>
                  {codes.map((b) => <th key={b} style={{ color: FIELD[b].color }}>{FIELD[b].he}</th>)}</tr></thead>
                <tbody>
                  {codes.map((a) => (
                    <tr key={a}><th style={{ color: FIELD[a].color }}>{FIELD[a].he}</th>
                      {codes.map((b) => {
                        const n = cell(a, b).length; const same = a === b;
                        const on = pick?.kind === "cell" && pick.a === a && pick.b === b;
                        return (
                          <td key={b}>
                            <button className={`m-cell${same ? " same" : ""}${on ? " on" : ""}`} disabled={!n} onClick={() => setPick({ kind: "cell", a, b })}
                              style={{ ["--k" as string]: n / max, ["--ca" as string]: FIELD[a].color }} title={`${FIELD[a].he} ← ${FIELD[b].he}: ${n}`}>
                              <span className="num">{n || ""}</span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="legend panel-legend">
                <span>אלכסון (אפור): מנחה ותלמיד באותו תחום</span>
                <span>תא צבעוני: מעבר בין תחומים. עוצמת הצבע לפי מספר הזוגות</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <aside className="panel panel-pad scroll-in stack">
        {pick?.kind === "idea" ? <IdeaPanel m={m} id={pick.id} focusField={pick.f} onClose={() => setPick(null)} />
          : pick?.kind === "cell" ? <CellPanel m={m} a={pick.a} b={pick.b} pairs={cell(pick.a, pick.b)} onClose={() => setPick(null)} />
          : <>
            <Tone kind="insight" title="למה זה חשוב [הערכה]">{"==הגבולות בין התחומים הם מנהליים, לא טבעיים.==\nרעיון בפיזיקה הופך לכלי ברפואה, ורעיון בכלכלה הופך למדיניות סביבתית."}</Tone>
            <div className="label">זכו בשני תחומים</div>
            {doubles.map(([id, ps]) => (
              <div key={id} className="stack-tight">
                <strong>{nameHe(m.byId.get(id))}</strong>
                {ps.map((p) => <span key={p.y} className="dc-sub"><bdi className="num">{p.y}</bdi> {FIELD[p.f].he}: <strong>{p.d}</strong></span>)}
              </div>
            ))}
            <Tone kind="neutral" title="איך קוראים">{"לחיצה על זוכה: העבודות מתחומים אחרים שמשתמשות ברעיון.\nלחיצה על תא בטבלת המנחים: הזוגות עצמם."}</Tone>
            <Tone kind="problem" title="הטיה">{"תחום של עבודה מצטטת נקבע לפי הנושא הראשי שלה ב-OpenAlex.\nביוכימיה נחשבת בית גם לכימיה וגם לרפואה.\nקשר מנחה הוא מה שתועד ב-Wikidata. היעדר קשר אינו היעדר השפעה."}</Tone>
            <Src href="https://docs.openalex.org/api-entities/topics">OpenAlex: נושאים ותחומים</Src>
          </>}
      </aside>
    </div>
  );
}

/** הזוגות בתא: מי הנחה את מי, מה כל אחד גילה, ולמה המעבר מעניין. */
function CellPanel({ m, a, b, pairs, onClose }: { m: Model; a: FieldCode; b: FieldCode; pairs: { m: string; s: string }[]; onClose: () => void }) {
  const first = (id: string) => [...(m.prizesOf.get(id) ?? [])].sort((x, y) => x.y - y.y)[0];
  return (
    <div className="stack rise" key={a + b}>
      <div className="aside-ops"><span className="label">מנחה ב{FIELD[a].he}, תלמיד ב{FIELD[b].he}</span><button className="press icon-btn" onClick={onClose} aria-label="סגירה">×</button></div>
      <Rich as="p">{a === b ? `**${pairs.length}** זוגות באותו תחום: מסורת שעוברת מדור לדור.` : `**${pairs.length}** זוגות שבהם שיטה מ${FIELD[a].he} הגיעה ל${FIELD[b].he}.`}</Rich>
      {pairs.map((l) => {
        const pm = first(l.m), ps = first(l.s);
        return (
          <div key={l.m + l.s} className="pair">
            <div className="pair-side" style={{ ["--c" as string]: FIELD[pm.f].color }}>
              <span className="label">מנחה · <bdi className="num">{pm.y}</bdi></span>
              <button className="lline-name" onClick={() => m.selIds.has(l.m) && go("people", { id: l.m })}>{nameHe(m.byId.get(l.m))}</button>
              <strong className="pair-disc">{pm.d}</strong>
            </div>
            <span className="pair-arrow" aria-hidden="true">←</span>
            <div className="pair-side" style={{ ["--c" as string]: FIELD[ps.f].color }}>
              <span className="label">תלמיד · <bdi className="num">{ps.y}</bdi></span>
              <button className="lline-name" onClick={() => m.selIds.has(l.s) && go("people", { id: l.s })}>{nameHe(m.byId.get(l.s))}</button>
              <strong className="pair-disc">{ps.d}</strong>
            </div>
          </div>
        );
      })}
      {a !== b && <p className="src">{m.mentor_why}</p>}
    </div>
  );
}
