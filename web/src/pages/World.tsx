import { useEffect, useMemo, useState } from "react";
import LaureateLine from "../lib/Laureate";
import { SortHead, useSort } from "../lib/sort";
import Globe, { GlobePoint } from "../lib/Globe";
import { CONT_HE, FIELD, FieldCode, Model, nameHe } from "../lib/data";
import Rich from "../lib/Rich";
import { go, href } from "../lib/route";
import YearBar from "../lib/YearBar";
import { FieldChips, Icon, Name, ShapeToggle, Src, Tone, useReducedMotion } from "../lib/ui";

export default function World({ m, params }: { m: Model; params: Record<string, string> }) {
  const reduced = useReducedMotion();
  const years = m.prizes.map((p) => p.y);
  const minY = Math.min(...years), maxY = Math.max(...years);
  const [year, setYear] = useState(maxY);
  const [playing, setPlaying] = useState(false);
  const [fields, setFields] = useState<FieldCode[]>(() => (params.f ? (params.f.split(",") as FieldCode[]) : []));
  const focus = params.id ?? null;
  const [flat, setFlat] = useState(params.v === "map");
  const [window10, setWindow10] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (reduced) { setYear(maxY); setPlaying(false); return; }
    const t = setInterval(() => setYear((y) => { if (y >= maxY) { setPlaying(false); return maxY; } return y + 1; }), 110);
    return () => clearInterval(t);
  }, [playing, maxY, reduced]);

  const visible = useMemo(() => m.people.filter((p) => p.lat != null && !p.org
    && (m.prizesOf.get(p.id) ?? []).some((x) => (window10 ? x.y > year - 10 && x.y <= year : x.y <= year) && (!fields.length || fields.includes(x.f)))), [m, year, fields, window10]);
  const colorOf = (id: string) => FIELD[fields.length === 1 ? fields[0] : m.firstField.get(id)!].color;
  const points: GlobePoint[] = visible.map((p) => ({ id: p.id, lat: p.lat!, lon: p.lon!, color: colorOf(p.id),
    big: m.selIds.has(p.id), label: `${nameHe(p)} · ${p.city ?? ""}` }));
  const cont = new Map<string, number>();
  for (const p of visible) if (p.cont) cont.set(p.cont, (cont.get(p.cont) ?? 0) + 1);
  const shares = [...cont.entries()].sort((a, b) => b[1] - a[1]);
  const total = visible.length || 1;
  const top = shares[0];
  const fp = focus ? m.byId.get(focus) : undefined;
  const { sorted: inst, s: si, toggle: ti } = useSort(m.quality.top_institutions, { name: (r: { name: string; n: number }) => r.name, n: (r: { name: string; n: number }) => r.n }, { key: "n", dir: "desc" });
  const setF = (f: FieldCode[]) => { setFields(f); go("world", { id: focus ?? undefined, f: f.join(",") || undefined }); };

  return (
    <div className="focus-aside">
      <div className="screen" style={{ gridTemplateRows: "auto auto minmax(0,1fr)" }}>
        <div className="screen-head">
          <div>
            <Rich as="h1" className="insight-line">{top ? `**${Math.round((top[1] / total) * 100)}%** מהזוכים ${window10 ? `בעשור ${year - 9}–${year}` : `עד ${year}`} נולדו ב${CONT_HE[top[0]] ?? top[0]}.` : "אין זוכים בבחירה."}</Rich>
            <p className="explain">מקום הלידה לפי גבולות היום. <mark className="insight">הפעלה מראה איך המפה מתרחבת עם השנים.</mark></p>
          </div>
          <FieldChips value={fields} onChange={setF} />
        </div>
        <YearBar min={minY} max={maxY} value={year} onChange={(y) => { setPlaying(false); setYear(y); }} playing={playing}
          onPlay={() => { if (!playing && year >= maxY) setYear(minY); setPlaying(!playing); }} onReset={() => { setPlaying(false); setYear(maxY); }} />
        <div className="panel fill world-globe">
          <div className="world-tools">
            <ShapeToggle flat={flat} onChange={setFlat} />
            <div className="seg" role="group" aria-label="טווח השנים">
              <button className="seg-btn" aria-pressed={!window10} onClick={() => setWindow10(false)}>מצטבר</button>
              <button className="seg-btn" aria-pressed={window10} onClick={() => setWindow10(true)}>עשור בלבד</button>
            </div>
          </div>
          <div className="clock num">{year}</div>
          <div className="clock-sub label">{window10 ? <>עשור <bdi className="num">{year - 9}–{year}</bdi> · </> : null}<bdi className="num">{visible.length}</bdi> זוכים על {flat ? "המפה" : "הגלובוס"}</div>
          <Globe flat={flat} points={points} focus={focus} spin={!focus} onPick={(id) => go("world", { id, f: fields.join(",") || undefined })} />
          <div className="legend chart-legend">
            {(fields.length ? fields : (["physics", "chemistry", "medicine", "economics", "peace", "literature"] as FieldCode[])).map((f) =>
              <span key={f}><i style={{ background: FIELD[f].color }} />{FIELD[f].he}</span>)}
            <span><i className="ring" />נבחר</span><span>צבע: תחום הפרס הראשון</span>
          </div>
        </div>
      </div>
      <aside className="panel panel-pad scroll-in stack">
        {fp ? (
          <div className="rise stack" key={fp.id}>
            <div className="detail-ops">
              <a className="press icon-btn" href={href("world", { f: fields.join(",") || undefined })} aria-label="סגירה" title="סגירה">{Icon.close}</a>
            </div>
            <h2 className="detail-name"><Name he={fp.he} en={fp.en} /></h2>
            <dl className="facts">
              <dt>נולד/ה</dt><dd>{[fp.city, fp.country].filter(Boolean).join(", ")}{fp.born ? <> · <bdi className="num">{fp.born.slice(0, 4)}</bdi></> : null}</dd>

            </dl>
            {(m.prizesOf.get(fp.id) ?? []).map((x) => <LaureateLine key={x.y} m={m} p={x} onName={m.selIds.has(fp.id) ? () => go("people", { id: fp.id }) : undefined} />)}
            <Src href={`https://www.nobelprize.org/laureate/${fp.id}`}>NobelPrize.org</Src>
            {m.selIds.has(fp.id) && <a className="press btn" href={href("people", { id: fp.id })}>לכרטיס המלא</a>}
          </div>
        ) : <Tone kind="neutral" title="איך קוראים">{"גרירה מסובבת את הגלובוס.\nלחיצה על נקודה פותחת את הזוכה כאן."}</Tone>}
        <div className="label">לפי יבשת הלידה, עד <bdi className="num">{year}</bdi></div>
        <div className="bars">
          {shares.map(([c, n]) => (
            <div key={c} className="bar-row">
              <span>{CONT_HE[c] ?? c}</span>
              <span className="bar"><i style={{ width: `${(n / total) * 100}%` }} /></span>
              <span className="num">{Math.round((n / total) * 100)}%</span>
            </div>
          ))}
        </div>
        <div className="label">עשרת המוסדות עם הכי הרבה זוכים, ביום הזכייה</div>
        <div className="sort-row"><SortHead k="name" s={si} toggle={ti}>מוסד</SortHead><SortHead k="n" s={si} toggle={ti}>זוכים</SortHead></div>
        <div>{inst.map((t) => (
          <div key={t.name} className="dense-row"><span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} dir="ltr">{t.name}</span><span className="num" style={{ marginInlineStart: "auto" }}>{t.n}</span></div>
        ))}</div>
        <Tone kind="problem" title="הטיה">{"מקום לידה אינו מקום העבודה.\nהמוסד הוא השיוך ביום הזכייה, לא המקום שבו נעשתה התגלית."}</Tone>
      </aside>
    </div>
  );
}
