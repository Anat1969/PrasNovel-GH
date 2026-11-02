import { useMemo, useState } from "react";
import { FIELD, FieldCode, median, Model, nameHe, Prize } from "../lib/data";
import LaureateLine from "../lib/Laureate";
import Rich from "../lib/Rich";
import { go, href } from "../lib/route";
import { ERAS, FieldChips, Src, Tone } from "../lib/ui";

/** שושלות מנחה־תלמיד בתוך התחום: המסלולים הארוכים ביותר, כל אחד מתחיל במנחה אחר. */
function chains(m: Model, field: FieldCode, k = 2) {
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
  const [field, setField] = useState<FieldCode>(() => ((params.f && FIELD[params.f as FieldCode]) ? params.f as FieldCode : "physics"));
  const [pick, setPick] = useState<Prize | null>(null);
  const F = FIELD[field];
  const prizes = useMemo(() => m.prizes.filter((p) => p.f === field).sort((a, b) => a.y - b.y), [m, field]);
  const first = prizes[0], last = prizes[prizes.length - 1];
  const eras = ERAS.map((e, i) => {
    const ps = prizes.filter((p) => p.y >= e.from && p.y <= e.to);
    const sel = ps.filter((p) => m.selIds.has(p.id));
    const others = ps.filter((p) => !m.selIds.has(p.id));
    // לצד הנבחרים: דוגמאות מפוזרות לאורך התקופה, כדי לראות את הרצף
    const step = Math.max(1, Math.floor(others.length / 3));
    const sample = others.filter((_, j) => j % step === 0).slice(0, 3);
    return { ...e, n: ps.length, women: ps.filter((p) => m.byId.get(p.id)?.g === "female").length,
      age: median(ps.map((p) => p.age).filter((a): a is number => a != null)), story: m.evolution?.[field]?.[i] ?? "", sel, sample };
  });
  const { pick: ch, edges } = useMemo(() => chains(m, field), [m, field]);
  const selOf = (id: string) => m.selected.find((s) => s.nobel_id === id);
  const setF = (f: FieldCode[]) => { const v = f[f.length - 1] ?? field; setField(v); setPick(null); go("fields", { f: v }); };

  const Card = ({ p, big }: { p: Prize; big?: boolean }) => {
    const s = selOf(p.id);
    return (
      <button className={`evo-card${s ? " sel" : ""}${big ? " big" : ""}${pick === p ? " on" : ""}`} onClick={() => setPick(p)} title="לחיצה: פירוט בצד">
        {s?.image && <img src={s.image.thumb_url} alt="" loading="lazy" />}
        <span className="evo-card-txt">
          <span className="num evo-y">{p.y}</span>
          <strong className="evo-d">{p.d}</strong>
          <span className="evo-n">{nameHe(m.byId.get(p.id))}</span>
        </span>
      </button>
    );
  };

  return (
    <div className="focus-aside">
      <div className="screen" style={{ gridTemplateRows: "auto auto minmax(0,1fr) auto" }}>
        <div className="screen-head">
          <div>
            <h1 className="insight-line">ב{F.he}: מ<strong>{first?.d}</strong> (<bdi className="num">{first?.y}</bdi>) אל <strong>{last?.d}</strong> (<bdi className="num">{last?.y}</bdi>).</h1>
            <p className="explain">כל עמודה היא רבע מאה: מה התחום שאל אז, והגילויים שענו. <mark className="insight">כך רואים איך רעיון אחד פותח את הבא.</mark></p>
          </div>
          <div className="controls"><FieldChips value={[field]} onChange={setF} /></div>
        </div>
        <div className="evo-ends">
          {first && <div className="evo-end"><span className="evo-end-tag">הזוכה הראשון</span><Card p={first} big /></div>}
          {last && <div className="evo-end"><span className="evo-end-tag">הזוכה האחרון</span><Card p={last} big /></div>}
        </div>
        <div className="panel fill evo" style={{ ["--c" as string]: F.color }}>
          {eras.map((e) => (
            <section key={e.id} className="evo-col">
              <header className="evo-head">
                <span className="num evo-years">{e.he}</span>
                <span className="label">{e.n ? <><bdi className="num">{e.n}</bdi> פרסים · <bdi className="num">{e.women}</bdi> נשים{!isNaN(e.age) ? <> · גיל <bdi className="num">{Math.round(e.age)}</bdi></> : null}</> : "הפרס עוד לא הוענק בתחום"}</span>
              </header>
              {e.story && <Rich as="p" className="evo-story">{e.story.replace(/^([^:]+):/, "**$1:**")}</Rich>}
              <div className="evo-sel">
                {e.sel.map((p) => <Card key={p.id + p.y} p={p} />)}
                {e.sample.map((p) => <Card key={p.id + p.y} p={p} />)}
              </div>
            </section>
          ))}
        </div>
        <details className="evo-chains">
          <summary>שושלות של מנחה ותלמיד שזכו שניהם ב{F.he} (<bdi className="num">{edges}</bdi> קשרים)</summary>
          {ch.length ? ch.map((c) => (
            <div key={c[0]} className="chain-row">
              {c.map((id, i) => (
                <span key={id} className="chain-step">
                  {i > 0 && <span className="chain-arrow" aria-hidden="true">←</span>}
                  <button className="chain-name" onClick={() => setPick(m.prizesOf.get(id)!.find((p) => p.f === field) ?? m.prizesOf.get(id)![0])}>
                    {nameHe(m.byId.get(id))} <bdi className="num">{m.prizesOf.get(id)!.find((p) => p.f === field)?.y}</bdi>
                  </button>
                </span>
              ))}
            </div>
          )) : <p className="src">אין ב-Wikidata שושלת של שלושה זוכים ומעלה בתחום הזה.</p>}
        </details>
      </div>
      <aside className="panel panel-pad scroll-in stack">
        {pick ? (
          <div className="stack rise" key={pick.id + pick.y}>
            <div className="aside-ops"><span className="label">הגילוי שנבחר</span><button className="press icon-btn" onClick={() => setPick(null)} aria-label="סגירה">×</button></div>
            {selOf(pick.id)?.image && <img className="aside-img" src={selOf(pick.id)!.image!.thumb_url} alt={selOf(pick.id)!.image!.caption_he} />}
            <LaureateLine m={m} p={pick} onName={m.selIds.has(pick.id) ? () => go("people", { id: pick.id }) : undefined} />
            {selOf(pick.id)?.museum?.contribution && <p className="dc-lead">{selOf(pick.id)!.museum!.contribution}</p>}
            {selOf(pick.id)?.museum?.takeaway && <p><mark className="insight">{selOf(pick.id)!.museum!.takeaway}</mark></p>}
            <Influence m={m} id={pick.id} onPick={setPick} />
          </div>
        ) : (
          <>
            <div className="label">איך רעיון פותח את הבא</div>
            {eras.filter((e) => e.story).map((e) => (
              <div key={e.id} className="evo-story-aside"><span className="num">{e.he}</span><Rich as="p">{e.story.replace(/^([^:]+):/, "**$1:**")}</Rich></div>
            ))}
            <Tone kind="problem" title="איך לקרוא">{"הסיכום לכל תקופה הוא **פרשנות** [הערכה], טיוטת Claude לעריכה.\nהגילויים מנוסחים מתוך נימוק הוועדה."}</Tone>
            <Src href="https://www.nobelprize.org/prizes/lists/all-nobel-prizes/">NobelPrize.org</Src>
          </>
        )}
      </aside>
    </div>
  );
}

/** מי הנחה והושפע: קשרי מנחה ותלמיד וציטוטים, עם הגילוי של כל צד. */
function Influence({ m, id, onPick }: { m: Model; id: string; onPick: (p: Prize) => void }) {
  const up = m.links.filter((l) => l.s === id).map((l) => l.m);
  const down = m.links.filter((l) => l.m === id).map((l) => l.s);
  const p1 = (x: string) => [...(m.prizesOf.get(x) ?? [])].sort((a, b) => a.y - b.y)[0];
  if (!up.length && !down.length) return null;
  return (
    <div className="stack-tight">
      {up.length > 0 && <div className="label">למד/ה אצל</div>}
      {up.map((x) => <button key={x} className="infl" onClick={() => onPick(p1(x))}><strong>{nameHe(m.byId.get(x))}</strong> <bdi className="num">{p1(x).y}</bdi> · {p1(x).d}</button>)}
      {down.length > 0 && <div className="label">הנחה את</div>}
      {down.map((x) => <button key={x} className="infl" onClick={() => onPick(p1(x))}><strong>{nameHe(m.byId.get(x))}</strong> <bdi className="num">{p1(x).y}</bdi> · {p1(x).d}</button>)}
      <a className="src" href={href("cross")}>מעברים בין תחומים</a>
    </div>
  );
}
