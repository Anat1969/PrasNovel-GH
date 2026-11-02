import { useEffect, useMemo, useRef, useState } from "react";
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, SimulationNodeDatum } from "d3-force";
import { Edge, FIELD, FieldCode, Model } from "../lib/data";
import Rich from "../lib/Rich";
import { go } from "../lib/route";
import { useSize } from "../lib/useSize";
import { FieldChips, Name, Src, Tone, useReducedMotion } from "../lib/ui";

type N = SimulationNodeDatum & { id: string; en: string; he: string | null; nobel: string | null; sel: boolean; level: number };
type L = { source: N | string; target: N | string; e: Edge };

export default function Network({ m, params }: { m: Model; params: Record<string, string> }) {
  const reduced = useReducedMotion();
  const [fields, setFields] = useState<FieldCode[]>(() => (params.f ? (params.f.split(",") as FieldCode[]) : []));
  const inField = (nid: string | null) => !!nid && (m.prizesOf.get(nid) ?? []).some((x) => fields.includes(x.f));
  const withEdges = m.selected.filter((s) => m.edges.some((e) => e.s === s.qid || e.t === s.qid) && (!fields.length || fields.includes(s.field)));
  const view = params.id ?? "laureates";
  const sub = useMemo(() => {
    const ok = (e: Edge) => !fields.length || inField(e.sn) || inField(e.tn);
    if (view === "all") return m.edges.filter(ok);
    if (view === "laureates") return m.edges.filter((e) => e.sn && e.tn && ok(e));
    const q = m.selected.find((s) => s.nobel_id === view)?.qid;
    return m.edges.filter((e) => e.s === q || e.t === q);
  }, [m, view, fields]);

  const { nodes, links } = useMemo(() => {
    const map = new Map<string, N>();
    const add = (id: string, en: string | null, he: string | null, nobel: string | null) => {
      if (!map.has(id)) map.set(id, { id, en: en ?? id, he, nobel, sel: !!nobel && m.selIds.has(nobel), level: 0 });
    };
    for (const e of sub) { add(e.s, e.sl, e.sh, e.sn); add(e.t, e.tl, e.th, e.tn); }
    // דור: המסלול הארוך ביותר מהשורש (מנחים למעלה)
    for (let i = 0; i < map.size; i++) {
      let changed = false;
      for (const e of sub) { const a = map.get(e.s)!, b = map.get(e.t)!; if (b.level < a.level + 1 && b.level < 12) { b.level = a.level + 1; changed = true; } }
      if (!changed) break;
    }
    return { nodes: [...map.values()], links: sub.map((e) => ({ source: e.s, target: e.t, e })) as L[] };
  }, [sub, m]);

  const box = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(box);
  const [, tick] = useState(0);
  const [pick, setPick] = useState<Edge | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const levels = Math.max(1, ...nodes.map((n) => n.level));

  useEffect(() => {
    if (!w || !h) return;
    const gap = (h - 90) / Math.max(1, levels);
    for (const n of nodes) { n.x ??= w / 2 + (Math.random() - .5) * w * .5; n.y ??= 45 + n.level * gap; }
    const sim = forceSimulation(nodes)
      .force("link", forceLink<N, L>(links as never).id((d) => d.id).distance(60).strength(.25))
      .force("charge", forceManyBody().strength(nodes.length > 40 ? -60 : -260))
      .force("x", forceX(w / 2).strength(nodes.length > 40 ? .04 : .02))
      .force("y", forceY<N>((d) => 45 + d.level * gap).strength(.9))
      .force("collide", forceCollide<N>((d) => (nodes.length > 40 && !d.nobel ? 10 : Math.min(110, (d.he || d.en).length * 3.7 + 18))).strength(1).iterations(3));
    if (reduced) { sim.stop(); for (let i = 0; i < 300; i++) sim.tick(); tick((t) => t + 1); return; }
    sim.on("tick", () => {
      for (const n of nodes) { n.x = Math.max(60, Math.min(w - 60, n.x!)); n.y = Math.max(20, Math.min(h - 20, n.y!)); }
      tick((t) => t + 1);
    });
    return () => { sim.stop(); };
  }, [nodes, links, w, h, levels, reduced]);

  const dense = nodes.length > 40;
  const chain = (() => {
    if (!pick) return [] as string[];
    const up: string[] = [pick.t, pick.s]; let cur = pick.s;
    for (let i = 0; i < 8; i++) { const e = m.edges.find((x) => x.t === cur); if (!e || up.includes(e.s)) break; up.push(e.s); cur = e.s; }
    return up.reverse();
  })();
  const nodeName = (id: string) => { const n = nodes.find((x) => x.id === id) ?? null; return n ? (n.he || n.en) : id; };
  const lab = view === "laureates" ? "בין זוכים" : view === "all" ? "כל הרשת" : nodeName(m.selected.find((s) => s.nobel_id === view)!.qid);

  return (
    <div className="focus-aside">
      <div className="screen" style={{ gridTemplateRows: "auto auto auto minmax(0,1fr)" }}>
        <div className="screen-head">
          <div>
            <Rich as="h1" className="insight-line">{`**${m.edges.length}** קשרי מנחה ותלמיד. **${m.edges.filter((e) => e.sn && e.tn).length}** מהם בין שני זוכים.`}</Rich>
            <p className="explain">מנחים למעלה, תלמידים למטה, כמו כתפיים. <mark className="insight">כל חץ הוא טענה ב-Wikidata, עם מקור.</mark></p>
          </div>
        </div>
        <FieldChips value={fields} onChange={(f) => { setFields(f); setPick(null); go("net", { id: view === "laureates" ? undefined : view, f: f.join(",") || undefined }); }} />
        <div className="chips" role="group" aria-label="תצוגה">
          <button className="chip" aria-pressed={view === "laureates"} onClick={() => { setPick(null); go("net", { f: fields.join(",") || undefined }); }}>בין זוכים</button>
          <button className="chip" aria-pressed={view === "all"} onClick={() => { setPick(null); go("net", { id: "all", f: fields.join(",") || undefined }); }}>כל הרשת</button>
          <span className="chip-note">|</span>
          {withEdges.map((s) => (
            <button key={s.nobel_id} className="chip" aria-pressed={view === s.nobel_id} onClick={() => { setPick(null); go("net", { id: s.nobel_id }); }}>
              {m.byId.get(s.nobel_id)?.he ?? m.byId.get(s.nobel_id)?.en}
            </button>
          ))}
        </div>
        <div className="panel fill" ref={box}>
          {w > 0 && nodes.length > 0 && (
            <svg width={w} height={h} className="net" role="img" aria-label={`רשת מנחים: ${lab}`}>
              <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0L10 5L0 10z" fill="#8A8984" /></marker></defs>
              {links.map((l, i) => {
                const a = l.source as N, b = l.target as N; if (a.x == null || b.x == null) return null;
                const on = pick && pick.s === a.id && pick.t === b.id;
                const near = hover && (hover === a.id || hover === b.id);
                const dy = (b.y! - a.y!) * .45;
                const d = `M${a.x},${a.y! + 10} C${a.x},${a.y! + dy} ${b.x},${b.y! - dy} ${b.x},${b.y! - 12}`;
                return (
                  <g key={i} onClick={() => setPick(l.e)} className="net-edge">
                    <path d={d} className={`net-link${on ? " on" : ""}${near ? " near" : ""}`} markerEnd="url(#arr)" />
                    <path d={d} className="net-hit"><title>{`${nodeName(a.id)} ← הנחה את ← ${nodeName(b.id)}`}</title></path>
                  </g>
                );
              })}
              {nodes.map((n) => {
                const show = !dense || n.nobel || hover === n.id;
                const txt = n.he || n.en;
                return (
                  <g key={n.id} transform={`translate(${n.x ?? 0},${n.y ?? 0})`} className="net-node"
                    onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)}
                    onClick={() => { const e = m.edges.find((x) => x.t === n.id) ?? m.edges.find((x) => x.s === n.id); if (e) setPick(e); if (n.sel && n.nobel) go("net", { id: n.nobel }); }}>
                    {show ? (
                      <>
                        <rect x={-Math.min(110, txt.length * 3.7 + 14)} y={-11} width={Math.min(220, txt.length * 7.4 + 28)} height={22}
                          className={n.nobel ? "nobel" : "plain"} strokeWidth={n.sel ? 2.5 : 1} />
                        <text textAnchor="middle" dy="0.35em">{txt.length > 28 ? txt.slice(0, 27) + "…" : txt}</text>
                      </>
                    ) : <circle r={4.5} className={n.nobel ? "nobel" : "plain"} />}
                  </g>
                );
              })}
            </svg>
          )}
          <div className="legend chart-legend">
            <span><i style={{ background: "#E2C77A", borderRadius: 0 }} />זוכה נובל</span>
            <span><i style={{ background: "#fff", border: "1px solid #999", borderRadius: 0 }} />לא זוכה</span>
            <span><i style={{ background: "#fff", border: "2.5px solid #1B1A17", borderRadius: 0 }} />מהנבחרים</span>
            <span>חץ: ממנחה לתלמיד. לחיצה על חץ מציגה את הקשר.</span>
          </div>
        </div>
      </div>
      <aside className="panel panel-pad scroll-in stack">
        {pick ? (
          <div className="relation rise" key={pick.s + pick.t}>
            <div className="label">הקשר שנבחר</div>
            <div className="rel-big"><Name he={pick.sh} en={pick.sl ?? pick.s} /><span className="rel-verb">← הנחה את ←</span><Name he={pick.th} en={pick.tl ?? pick.t} /></div>
            <RelationWhy m={m} e={pick} />
            <Src href={pick.url}>{`Wikidata ${pick.prop}`}</Src>
            {chain.length > 2 && (
              <ol className="chain">{chain.map((id) => <li key={id}>{nodeName(id) || id}</li>)}</ol>
            )}
          </div>
        ) : <Tone kind="neutral" title="איך קוראים">{"לחיצה על חץ מציגה את הקשר ואת השרשרת מלמעלה.\nלחיצה על אחד הנבחרים מתמקדת בו."}</Tone>}
        <div className="label">קשרים בתצוגה: <bdi className="num">{sub.length}</bdi></div>
        <div>
          {sub.slice(0, 40).map((e, i) => (
            <button key={i} className="dense-row rel-row" onClick={() => setPick(e)} aria-pressed={pick === e}>
              <span>{e.sh || e.sl}</span><span className="muted">←</span><span>{e.th || e.tl}</span>
              <span className="label" style={{ marginInlineStart: "auto" }}>{e.prop}</span>
            </button>
          ))}
        </div>
        <Tone kind="problem" title="הטיית כיסוי">{"Wikidata חלקי, במיוחד לפני המאה ה-20 ובשלום ובספרות.\nהיעדר קשר בגרף אינו היעדר מנטור במציאות."}</Tone>
        <Src href="https://doi.org/10.1007/s11192-024-04936-1">Tol, The Nobel family, Scientometrics 2024</Src>
      </aside>
    </div>
  );
}

/** הסבר לקשר: סוג הקשר, מתי כל אחד זכה, האם הוא חוצה תחומים, ולמה הוא חשוב. */
function RelationWhy({ m, e }: { m: Model; e: Edge }) {
  const a = e.sn ? (m.prizesOf.get(e.sn) ?? []) : [];
  const b = e.tn ? (m.prizesOf.get(e.tn) ?? []) : [];
  const fa = a[0]?.f, fb = b[0]?.f;
  const lines: string[] = [];
  lines.push(m.mentor_props?.[e.prop] ?? e.prop);
  if (a.length && b.length) {
    const gap = b[0].y - a[0].y;
    lines.push(`המנחה זכה ב-**${a[0].y}** (${FIELD[fa!].he}): **${a[0].d ?? ""}**.`);
    lines.push(`התלמיד זכה ב-**${b[0].y}** (${FIELD[fb!].he}): **${b[0].d ?? ""}**.`);
    lines.push(gap > 0 ? `התלמיד זכה ${gap} שנים אחרי המנחה.` : gap < 0 ? `**התלמיד זכה לפני המנחה**, ב-${-gap} שנים.` : "שניהם זכו באותה שנה.");
    if (fa !== fb) lines.push(`**הקשר חוצה תחומים:** שיטה מ${FIELD[fa!].he} הגיעה ל${FIELD[fb!].he}.`);
  } else if (a.length) lines.push(`המנחה זכה בנובל ב-**${a[0].y}**: **${a[0].d ?? ""}**. התלמיד לא זכה.`);
  else if (b.length) lines.push(`התלמיד זכה בנובל ב-**${b[0].y}**: **${b[0].d ?? ""}**. המנחה לא זכה.`);
  return (
    <div className="rel-why">
      {lines.map((l, i) => <Rich key={i} as="p">{l}</Rich>)}
      {m.mentor_why && <Tone kind="insight" title="למה זה חשוב [הערכה]">{m.mentor_why}</Tone>}
    </div>
  );
}
