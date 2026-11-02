import { useEffect, useMemo, useRef, useState } from "react";
import { scaleLinear } from "d3-scale";
import { line, curveMonotoneX } from "d3-shape";
import { FIELD, FIELDS, FieldCode, median, Model, nameHe, Prize } from "../lib/data";
import LaureateLine from "../lib/Laureate";
import Rich from "../lib/Rich";
import { go } from "../lib/route";
import { SortHead, useSort } from "../lib/sort";
import { useSize } from "../lib/useSize";
import YearBar from "../lib/YearBar";
import { FieldChips, Src, Tone, useReducedMotion } from "../lib/ui";

type Pt = Prize & { sel: boolean; name: string; g: string | null };

function rolling(pts: Pt[], from: number, to: number, half = 7) {
  const out: [number, number][] = [];
  for (let y = from; y <= to; y++) {
    const w = pts.filter((p) => Math.abs(p.y - y) <= half).map((p) => p.age!);
    if (w.length >= 5) out.push([y, median(w)]);
  }
  return out;
}

export default function Time({ m, params }: { m: Model; params: Record<string, string> }) {
  const reduced = useReducedMotion();
  const [fields, setFields] = useState<FieldCode[]>(() => (params.f ? (params.f.split(",") as FieldCode[]) : []));
  const all: Pt[] = useMemo(() => m.prizes.filter((p) => p.age != null && !m.byId.get(p.id)?.org).map((p) => ({
    ...p, sel: m.selIds.has(p.id), name: nameHe(m.byId.get(p.id)), g: m.byId.get(p.id)?.g ?? null,
  })), [m]);
  const minY = Math.min(...all.map((p) => p.y)), maxY = Math.max(...all.map((p) => p.y));
  const [year, setYear] = useState(maxY);
  const [playing, setPlaying] = useState(false);
  const [hover, setHover] = useState<Pt | null>(null);
  const [pick, setPick] = useState<Pt | null>(null);
  const [view, setView] = useState<"chart" | "list">("chart");
  const pts = useMemo(() => all.filter((p) => !fields.length || fields.includes(p.f)), [all, fields]);
  const trend = useMemo(() => rolling(pts, minY, maxY), [pts, minY, maxY]);

  useEffect(() => {
    if (!playing) return;
    if (reduced) { setYear(maxY); setPlaying(false); return; }
    const t = setInterval(() => setYear((y) => { if (y >= maxY) { setPlaying(false); return maxY; } return y + 1; }), 85);
    return () => clearInterval(t);
  }, [playing, maxY, reduced]);

  const box = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(box);
  const M = { t: 40, r: 16, b: 30, l: 44 };
  const x = scaleLinear().domain([minY - 1, maxY + 1]).range([M.l, Math.max(M.l + 10, w - M.r)]);
  const yS = scaleLinear().domain([15, 100]).range([Math.max(M.t + 10, h - M.b), M.t]);
  const shown = pts.filter((p) => p.y <= year);
  const path = line<[number, number]>().x((d) => x(d[0])).y((d) => yS(d[1])).curve(curveMonotoneX)(trend.filter((d) => d[0] <= year)) ?? "";

  const early = median(pts.filter((p) => p.y <= 1950).map((p) => p.age!));
  const late = median(pts.filter((p) => p.y > 2000).map((p) => p.age!));
  const scope = fields.length === 1 ? `ב${FIELD[fields[0]].he}` : fields.length ? "בתחומים שנבחרו" : "בכל התחומים";
  const setF = (f: FieldCode[]) => { setFields(f); setPick(null); go("time", { f: f.join(",") || undefined }); };

  // תובנות גיל
  const youngest = [...shown].sort((a, b) => a.age! - b.age!)[0];
  const oldest = [...shown].sort((a, b) => b.age! - a.age!)[0];
  const women = shown.filter((p) => p.g === "female"), men = shown.filter((p) => p.g === "male");
  const mw = median(women.map((p) => p.age!)), mm = median(men.map((p) => p.age!));

  const { sorted, s, toggle } = useSort(shown, {
    year: (p) => p.y, age: (p) => p.age, name: (p) => p.name, field: (p) => FIELD[p.f].he,
  }, { key: "year", dir: "asc" });

  const multiples = FIELDS.map((f) => {
    const fp = all.filter((p) => p.f === f.code);
    const dec: [number, number][] = [];
    for (let d = 1900; d <= maxY; d += 10) { const v = fp.filter((p) => p.y >= d && p.y < d + 10).map((p) => p.age!); if (v.length >= 2) dec.push([d + 5, median(v)]); }
    return { f, dec, a: median(fp.filter((p) => p.y <= 1950).map((p) => p.age!)), b: median(fp.filter((p) => p.y > 2000).map((p) => p.age!)) };
  });
  const sx = scaleLinear().domain([1900, maxY]).range([4, 136]);
  const sy = scaleLinear().domain([35, 80]).range([40, 4]);

  return (
    <div className="focus-aside">
      <div className="screen" style={{ gridTemplateRows: "auto auto minmax(0,1fr)" }}>
        <div className="screen-head">
          <div>
            <Rich as="h1" className="insight-line">{`גיל הזכייה ${scope}: **${Math.round(early)}** עד 1950, **${Math.round(late)}** מאז 2001.`}</Rich>
            <p className="explain">כל נקודה היא פרס לאדם. הקו הוא חציון נע של <bdi className="num">15</bdi> שנה. <mark className="insight">ההכרה מגיעה מאוחר יותר ויותר.</mark></p>
          </div>
          <div className="controls">
            <FieldChips value={fields} onChange={setF} />
            <div className="seg" role="group" aria-label="תצוגה">
              <button className="seg-btn" aria-pressed={view === "chart"} onClick={() => setView("chart")}>גרף</button>
              <button className="seg-btn" aria-pressed={view === "list"} onClick={() => setView("list")}>הזוכים והגילוי</button>
            </div>
          </div>
        </div>
        <YearBar min={minY} max={maxY} value={year} onChange={(y) => { setPlaying(false); setYear(y); }} playing={playing}
          onPlay={() => { if (!playing && year >= maxY) setYear(minY); setPlaying(!playing); }} onReset={() => { setPlaying(false); setYear(maxY); }} />
        <div className="panel fill" ref={box}>
          {view === "list" ? (
            <div className="tlist">
              <div className="tlist-head">
                <SortHead k="year" s={s} toggle={toggle}>שנה</SortHead>
                <SortHead k="name" s={s} toggle={toggle}>זוכה</SortHead>
                <SortHead k="age" s={s} toggle={toggle}>גיל</SortHead>
                <SortHead k="field" s={s} toggle={toggle}>תחום</SortHead>
                <span className="label"><bdi className="num">{sorted.length}</bdi> פרסים עד <bdi className="num">{year}</bdi></span>
              </div>
              <div className="tlist-body">
                {sorted.map((p, i) => <LaureateLine key={`${p.id}-${p.y}-${i}`} m={m} p={p} active={pick === p}
                  onPick={() => setPick(p)} onName={m.selIds.has(p.id) ? () => go("people", { id: p.id }) : undefined} />)}
              </div>
            </div>
          ) : <>
            <div className="clock num" aria-live="polite">{year}</div>
            <div className="clock-sub label"><bdi className="num">{shown.length}</bdi> פרסים עד השנה הזו</div>
            {w > 0 && (
              <svg width={w} height={h - 34} className="chart" role="img" aria-label="גיל בזכייה לפי שנת הפרס">
                {[20, 40, 60, 80, 100].map((a) => (
                  <g key={a}><line x1={M.l} x2={w - M.r} y1={yS(a)} y2={yS(a)} className="gridline" />
                    <text x={M.l - 8} y={yS(a)} dy="0.32em" textAnchor="end" className="axis">{a}</text></g>
                ))}
                {[1901, 1925, 1950, 1975, 2000, 2025].filter((t) => t <= maxY).map((t) => (
                  <text key={t} x={x(t)} y={h - M.b - 34 + 18} textAnchor="middle" className="axis">{t}</text>
                ))}
                <text transform={`translate(12,${(M.t + h - M.b - 34) / 2}) rotate(-90)`} className="axis" textAnchor="middle">גיל בזכייה</text>
                <line x1={x(year)} x2={x(year)} y1={M.t} y2={h - M.b - 34} className="nowline" />
                {shown.filter((p) => !p.sel).map((p, i) => (
                  <circle key={`${p.id}-${p.y}-${i}`} cx={x(p.y)} cy={yS(p.age!)} r={pick === p ? 6 : 3.2} fill={FIELD[p.f].color} opacity={pick === p ? 1 : .55}
                    stroke={pick === p ? "#1B1A17" : "none"} strokeWidth={2} style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(null)} onClick={() => setPick(p)} />
                ))}
                <path d={path} className="trend" />
                {shown.filter((p) => p.sel).map((p) => (
                  <circle key={`s-${p.id}-${p.y}`} cx={x(p.y)} cy={yS(p.age!)} r={pick === p ? 8 : 6.5} fill={FIELD[p.f].color} stroke={pick === p ? "#1B1A17" : "#B08A2E"} strokeWidth={2.2}
                    className="sel-dot" onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(null)} onClick={() => setPick(p)} />
                ))}
                {hover && (
                  <g transform={`translate(${x(hover.y)},${yS(hover.age!)})`} pointerEvents="none">
                    <rect x={x(hover.y) > w / 2 ? -250 : 10} y={-30} width={240} height={24} className="tip-bg" />
                    <text x={x(hover.y) > w / 2 ? -130 : 130} y={-14} textAnchor="middle" className="tip">{`${hover.name} · ${hover.d ?? ""} · ${hover.y}`}</text>
                  </g>
                )}
              </svg>
            )}
            <div className="legend panel-legend">
              {FIELDS.map((f) => (
                <button key={f.code} className="chip" aria-pressed={fields.length === 1 && fields[0] === f.code}
                  onClick={() => setF(fields.length === 1 && fields[0] === f.code ? [] : [f.code])}>
                  <i className="dot" style={{ background: f.color }} />{f.he}
                </button>
              ))}
              <span><i className="ring" />נבחר</span>
              <span><i style={{ background: "#1B1A17", borderRadius: 0, height: 2, width: 14 }} />חציון נע</span>
              <span>לחיצה על נקודה: הגילוי בצד</span>
            </div>
          </>}
        </div>
      </div>
      <aside className="panel panel-pad scroll-in stack">
        {pick ? (
          <div className="stack rise" key={`${pick.id}-${pick.y}`}>
            <div className="aside-ops"><span className="label">הפרס שנבחר</span><button className="press icon-btn" onClick={() => setPick(null)} aria-label="סגירה" title="חזרה לתובנות">×</button></div>
            <LaureateLine m={m} p={pick} onName={m.selIds.has(pick.id) ? () => go("people", { id: pick.id }) : undefined} />
            <Rich as="p">{`זכה בגיל **${pick.age}**. החציון ${scope} באותן שנים: **${Math.round(median(pts.filter((q) => Math.abs(q.y - pick.y) <= 7).map((q) => q.age!)))}**.`}</Rich>
          </div>
        ) : (
          <div className="stack">
            <div className="label">מה הגיל מספר, {scope}, עד <bdi className="num">{year}</bdi></div>
            {youngest && <div className="age-card"><span className="age-tag young">הצעיר ביותר · <bdi className="num">{youngest.age}</bdi></span>
              <LaureateLine m={m} p={youngest} onPick={() => setPick(youngest)} compact /></div>}
            {oldest && <div className="age-card"><span className="age-tag old">המבוגר ביותר · <bdi className="num">{oldest.age}</bdi></span>
              <LaureateLine m={m} p={oldest} onPick={() => setPick(oldest)} compact /></div>}
            <div className="gender">
              <div><span className="num gender-n">{women.length}</span><span>נשים · גיל חציוני <bdi className="num">{isNaN(mw) ? "-" : Math.round(mw)}</bdi></span></div>
              <div><span className="num gender-n">{men.length}</span><span>גברים · גיל חציוני <bdi className="num">{isNaN(mm) ? "-" : Math.round(mm)}</bdi></span></div>
              <span className="gender-bar"><i style={{ width: `${(women.length / Math.max(1, women.length + men.length)) * 100}%` }} /></span>
            </div>
            <Tone kind="insight" title="תובנה">{`==הגילוי קודם להכרה בעשרות שנים.==\nהגיל בזכייה עלה מ-**${Math.round(early)}** ל-**${Math.round(late)}**: הוועדה מחכה שהרעיון יוכח.`}</Tone>
          </div>
        )}
        <div className="label">גיל חציוני לפי עשור. לחיצה מבודדת תחום</div>
        <div className="multiples">
          {multiples.map(({ f, dec, a, b }) => (
            <button key={f.code} className="press mult" aria-pressed={fields.length === 1 && fields[0] === f.code}
              onClick={() => setF(fields.length === 1 && fields[0] === f.code ? [] : [f.code])}>
              <span className="mult-head"><span style={{ color: f.color, fontWeight: 600 }}>{f.he}</span>
                <span className="num" title="חציון עד 1950 ← מאז 2001">{isNaN(a) ? "" : `${Math.round(a)}→`}{Math.round(b)}</span></span>
              <svg width="140" height="44" viewBox="0 0 140 44" aria-hidden="true">
                <path d={line<[number, number]>().x((d) => sx(d[0])).y((d) => sy(d[1])).curve(curveMonotoneX)(dec) ?? ""} fill="none" stroke={f.color} strokeWidth="1.75" />
                <line x1={sx(year)} x2={sx(year)} y1={2} y2={42} stroke="#1B1A17" strokeOpacity=".25" />
              </svg>
            </button>
          ))}
        </div>
        <Tone kind="problem" title="הטיית מדגם">{"הפרס לא מוענק לאחר המוות.\nהכרה מאוחרת מתגמלת את מי שחי זמן רב."}</Tone>
        <Src href="https://www.nature.com/articles/508186a">Fortunato et al., Nature 2014</Src>
      </aside>
    </div>
  );
}
