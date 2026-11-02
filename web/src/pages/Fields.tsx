import { useMemo, useState } from "react";
import { FIELD, FIELDS, FieldCode, median, Model, nameHe } from "../lib/data";
import FieldGlyph from "../lib/FieldGlyph";
import Rich from "../lib/Rich";
import { go, href } from "../lib/route";
import { ERAS, Src, Tone } from "../lib/ui";

/** שושלות מנחה־תלמיד בתוך התחום: המסלולים הארוכים ביותר, כל אחד מתחיל במנחה אחר. */
function chains(m: Model, field: FieldCode, k = 3) {
  const edges = m.links.filter((l) => m.firstField.get(l.m) === field && m.firstField.get(l.s) === field);
  const out = new Map<string, string[]>();
  for (const e of edges) out.set(e.m, [...(out.get(e.m) ?? []), e.s]);
  const best: string[][] = [];
  for (const start of out.keys()) {
    let top: string[] = [];
    const dfs = (n: string, path: string[]) => {
      if (path.length > top.length) top = path;
      for (const c of out.get(n) ?? []) if (!path.includes(c) && path.length < 9) dfs(c, [...path, c]);
    };
    dfs(start, [start]);
    if (top.length >= 3) best.push(top);
  }
  best.sort((a, b) => b.length - a.length);
  const used = new Set<string>(); const pick: string[][] = [];
  for (const c of best) { if (c.some((x) => used.has(x))) continue; pick.push(c); c.forEach((x) => used.add(x)); if (pick.length >= k) break; }
  return { pick, edges: edges.length };
}

export default function Fields({ m, params }: { m: Model; params: Record<string, string> }) {
  const [field, setField] = useState<FieldCode>(() => (FIELDS.some((f) => f.code === params.f) ? params.f as FieldCode : "physics"));
  const F = FIELD[field];
  const prizes = m.prizes.filter((p) => p.f === field);
  const eras = ERAS.map((e, i) => {
    const ps = prizes.filter((p) => p.y >= e.from && p.y <= e.to);
    const people = ps.map((p) => m.byId.get(p.id)).filter(Boolean);
    return { ...e, n: ps.length, women: people.filter((p) => p!.g === "female").length,
      age: median(ps.map((p) => p.age).filter((a): a is number => a != null)), terms: m.terms?.[field]?.[i]?.terms ?? [],
      sel: m.selected.filter((s) => s.field === field && s.year >= e.from && s.year <= e.to) };
  });
  const { pick, edges } = useMemo(() => chains(m, field), [m, field]);
  const first = eras.find((e) => e.terms.length)?.terms[0];
  const last = [...eras].reverse().find((e) => e.terms.length)?.terms[0];
  const sel = m.selected.filter((s) => s.field === field).sort((a, b) => a.year - b.year);
  const yearOf = (id: string) => m.prizesOf.get(id)?.find((p) => p.f === field)?.y ?? m.firstYear.get(id);

  return (
    <div className="focus-aside">
      <div className="screen" style={{ gridTemplateRows: "auto minmax(0,1fr) auto" }}>
        <div className="screen-head">
          <div>
            {first && last ? (
              <h1 className="insight-line">ב{F.he}, שפת הוועדה עברה מ־<bdi dir="ltr"><strong>{first}</strong></bdi> אל <bdi dir="ltr"><strong>{last}</strong></bdi>.</h1>
            ) : <Rich as="h1" className="insight-line">{`${F.he}: **${prizes.length}** פרסים.`}</Rich>}
            <p className="explain">כל עמודה היא רבע מאה: כמה פרסים, המילים הבולטות בנימוקים, והזוכים הנבחרים. <mark className="insight">כך רואים איך רעיון אחד פותח את הבא.</mark></p>
          </div>
          <div className="chips" role="group" aria-label="תחום">
            {FIELDS.map((f) => (
              <button key={f.code} className="chip" aria-pressed={field === f.code} onClick={() => { setField(f.code); go("fields", { f: f.code }); }}>
                <i className="dot" style={{ background: f.color }} />{f.he}
              </button>
            ))}
          </div>
        </div>
        <div className="panel fill evo" style={{ ["--c" as string]: F.color }}>
          {eras.map((e) => (
            <section key={e.id} className="evo-col">
              <header className="evo-head">
                <span className="num evo-years">{e.he}</span>
                <span className="label"><bdi className="num">{e.n}</bdi> פרסים · <bdi className="num">{e.women}</bdi> נשים{!isNaN(e.age) ? <> · גיל <bdi className="num">{Math.round(e.age)}</bdi></> : null}</span>
              </header>
              <div className="evo-terms" dir="ltr" title="המילים הבולטות בנימוקי הוועדה בתקופה">
                {e.terms.slice(0, 6).map((t, i) => <span key={t} style={{ fontSize: `${17 - i * 1.6}px`, opacity: 1 - i * .1 }}>{t}</span>)}
                {!e.terms.length && <span className="src" dir="rtl">{e.n === 0 ? (prizes.length && Math.min(...prizes.map((p) => p.y)) > e.to ? "הפרס עוד לא הוענק בתחום" : "לא הוענקו פרסים") : "מעט מדי נימוקים"}</span>}
              </div>
              <div className="evo-sel">
                {e.sel.map((s) => (
                  <a key={s.nobel_id} className="evo-card" href={href("people", { id: s.nobel_id })}>
                    <span className="num">{s.year}</span>
                    <strong>{nameHe(m.byId.get(s.nobel_id))}</strong>
                    {s.museum?.contribution && <span>{s.museum.contribution}</span>}
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="panel panel-pad evo-chains">
          <div className="label">מרעיון לרעיון: שושלות של מנחה ותלמיד שזכו שניהם ב{F.he} (<bdi className="num">{edges}</bdi> קשרים)</div>
          {pick.length ? pick.map((c) => (
            <div key={c[0]} className="chain-row">
              {c.map((id, i) => (
                <span key={id} className="chain-step">
                  {i > 0 && <span className="chain-arrow" aria-hidden="true">←</span>}
                  <a href={m.selIds.has(id) ? href("people", { id }) : href("world", { id })} className={m.selIds.has(id) ? "chain-name sel" : "chain-name"}>
                    {nameHe(m.byId.get(id))} <bdi className="num">{yearOf(id)}</bdi>
                  </a>
                </span>
              ))}
            </div>
          )) : <p className="src">אין ב-Wikidata שושלת של שלושה זוכים ומעלה בתחום הזה.</p>}
        </div>
      </div>
      <aside className="panel panel-pad scroll-in stack">
        <div className="label"><FieldGlyph f={field} size={14} /> הנבחרים ב{F.he}, לפי הסדר</div>
        <ol className="thread">
          {sel.map((s) => (
            <li key={s.nobel_id}>
              <a href={href("people", { id: s.nobel_id })}><bdi className="num">{s.year}</bdi> <strong>{nameHe(m.byId.get(s.nobel_id))}</strong></a>
              {s.museum?.contribution && <p>{s.museum.contribution}</p>}
              {s.museum?.takeaway && <p className="thread-take"><mark className="insight">{s.museum.takeaway}</mark></p>}
            </li>
          ))}
        </ol>
        <Tone kind="problem" title="איך לקרוא">{"המילים הן **שפת הוועדה**, לא בהכרח שפת המדע.\nשושלת ב-Wikidata היא קשר מתועד, לא כל ההשפעה."}</Tone>
        <p className="src">התרומה ומה שנתנה: טיוטת Claude. המילים: חישוב tf-idf על נימוקי הוועדה לפי תקופה.</p>
        <Src href="https://www.nobelprize.org/prizes/lists/all-nobel-prizes/">NobelPrize.org</Src>
        <Src href="https://www.wikidata.org/wiki/Property:P184">Wikidata P184, P185, P1066, P802</Src>
      </aside>
    </div>
  );
}
