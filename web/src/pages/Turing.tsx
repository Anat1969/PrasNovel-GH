import { useEffect, useMemo, useState } from "react";
import { FIELD, Model, TuringEntry } from "../lib/data";
import Rich from "../lib/Rich";
import { go } from "../lib/route";
import { Tone } from "../lib/ui";
import { ArticleView, Step, Thread } from "../lib/Thread";

/** חדר טיורינג: מפה של תחומים לאורך השנים. שורה לכל תחום, פורטרט בכל שנת זכייה. הבינה המלאכותית למעלה, עם הגלים שלה. */
export default function TuringPage({ m, params }: { m: Model; params: Record<string, string> }) {
  const T = m.turing;
  const [area, setArea] = useState<string | null>(params.a ?? null);
  const [pick, setPick] = useState<string | null>(params.id ?? null);
  const [read, setRead] = useState(params.art === "1");
  useEffect(() => { setPick(params.id ?? null); setArea(params.a ?? null); setRead(params.art === "1"); }, [params.id, params.a, params.art]);
  const entries = T?.entries ?? [];
  const areas = T?.areas ?? [];
  const nowShown = useMemo(() => entries.filter((e) => !area || e.area === area), [entries, area]);
  if (!T) return <div className="panel empty">אין נתוני טיורינג. הריצו את scripts/fetch_turing.py ואת הייצוא.</div>;

  const people = entries.flatMap((e) => e.people);
  const women = people.filter((p) => p.g === "f").length;
  const ai = entries.filter((e) => e.area === "ai");
  const y0 = entries[0].y, y1 = entries[entries.length - 1].y;
  const W = 1000, LBL = 150, ROW = 46, TOP = 20, H = TOP + areas.length * ROW + 30;
  const x = (y: number) => 18 + ((y - y0) / (y1 - y0)) * (W - LBL - 40);
  const rowOf = (a: string) => areas.findIndex((r) => r.code === a);
  const cur = entries.find((e) => e.slug === pick) ?? null;
  const setP = (a: string | null, id: string | null, art = false) => go("turing", { a: a ?? undefined, id: id ?? undefined, art: art ? "1" : undefined });
  const steps = (code: string): Step[] => (T.articles[code]?.steps ?? []).map((s) => {
    const e = entries.find((x) => x.slug === s.slug)!;
    return { y: e.y, who: e.he, step: s.step, onClick: () => { setPick(e.slug); setP(code, e.slug, read); } };
  });
  const art = area ? T.articles[area] : undefined;
  const color = (a: string) => areas.find((r) => r.code === a)?.color ?? "#888";
  const decades = [];
  for (let d = Math.ceil(y0 / 10) * 10; d <= y1; d += 10) decades.push(d);

  return (
    <div className="focus-aside tu">
      <div className="screen" style={{ gridTemplateRows: "auto minmax(0,1fr)" }}>
        <div className="screen-head">
          <div>
            <Rich as="h1" className="insight-line">{`**${y1 - y0 + 1}** שנים, **${people.length}** זוכים, **${women}** נשים. הבינה המלאכותית זכתה ב-**${T.ai_waves.length}** גלים`}</Rich>
            <p className="explain">חדר נפרד: <strong>פרס טיורינג</strong> למדעי המחשב, שאינו חלק מפרס נובל. <mark className="insight">כל גל של בינה מלאכותית החליף את התפיסה: מלוגיקה, להסתברות, לנתונים.</mark></p>
          </div>
          <div className="controls tu-controls">
            <button className="chip" aria-pressed={!area} onClick={() => { setArea(null); setPick(null); setRead(false); setP(null, null); }}>הכול</button>
            {areas.map((a) => (
              <button key={a.code} className="chip" aria-pressed={area === a.code} onClick={() => { const v = area === a.code ? null : a.code; setArea(v); setPick(null); setRead(false); setP(v, null); }}>
                <i className="dot" style={{ background: a.color }} />{a.he}
              </button>
            ))}
          </div>
        </div>
        {read && art && area ? <ArticleView art={art} steps={steps(area)} color={color(area)} kicker={`טיורינג · ${areas.find((a) => a.code === area)?.he}`}
          status={T.status} onClose={() => { setRead(false); setP(area, pick); }} /> :
        <div className="panel fill tu-panel">
          <div className="tu-map">
            <svg viewBox={`0 0 ${W} ${H}`} className="tu-svg" role="img" aria-label="זוכי פרס טיורינג לפי תחום ושנה">
              <defs>
                {entries.map((e) => <clipPath id={`tc-${e.slug}`} key={e.slug}><circle cx={x(e.y)} cy={TOP + rowOf(e.area) * ROW + ROW / 2} r={13} /></clipPath>)}
              </defs>
              {T.ai_waves.map((w) => (
                <g key={w.he}>
                  <rect x={x(w.from) - 14} y={TOP + rowOf("ai") * ROW + 2} width={x(w.to) - x(w.from) + 28} height={ROW - 4} rx={6} className="tu-wave" />
                  <text x={(x(w.from) + x(w.to)) / 2} y={TOP - 6} className="tu-wave-t" textAnchor="middle">{w.he}</text>
                </g>
              ))}
              {areas.map((a, i) => (
                <g key={a.code} className={`tu-lbl${area && area !== a.code ? " dim" : ""}`} onClick={() => { const v = area === a.code ? null : a.code; setArea(v); setPick(null); setRead(false); setP(v, null); }}>
                  <line x1={0} x2={W - LBL + 4} y1={TOP + i * ROW + ROW / 2} y2={TOP + i * ROW + ROW / 2} className="tu-row" style={{ stroke: a.color }} />
                  
                  <text x={W - 4} y={TOP + i * ROW + ROW / 2 + 5} style={{ fill: a.color }} className="tu-lbl-t" textAnchor="end">{`${a.he} (${entries.filter((e) => e.area === a.code).length})`}</text>
                </g>
              ))}
              {decades.map((d) => (
                <g key={d}><line x1={x(d)} x2={x(d)} y1={TOP} y2={TOP + areas.length * ROW} className="tu-dec" /><text x={x(d)} y={H - 4} className="tu-year" textAnchor="middle">{d}</text></g>
              ))}
              {entries.map((e) => {
                const cx = x(e.y), cy = TOP + rowOf(e.area) * ROW + ROW / 2;
                const img = e.people.find((p) => p.img)?.img;
                const off = area && e.area !== area;
                return (
                  <g key={e.slug} className={`tu-dot${pick === e.slug ? " on" : ""}${off ? " off" : ""}`} onClick={() => { const v = pick === e.slug ? null : e.slug; setPick(v); setP(area, v); }}>
                    <title>{`${e.y} · ${e.he}`}</title>
                    <circle cx={cx} cy={cy} r={15} fill="#fff" stroke={color(e.area)} strokeWidth={pick === e.slug ? 3.5 : 2} />
                    {img ? <image href={`./${img}`} x={cx - 13} y={cy - 13} width={26} height={26} clipPath={`url(#tc-${e.slug})`} preserveAspectRatio="xMidYMid slice" />
                      : <text x={cx} y={cy + 4} textAnchor="middle" className="tu-ini">{(e.people[0].en ?? "").split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("")}</text>}
                    {e.people.length > 1 && <text x={cx + 12} y={cy - 9} className="tu-n">{e.people.length}</text>}
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="legend panel-legend">
            <span><i className="dot" style={{ background: "#FBF0D0" }} /> גל של בינה מלאכותית</span>
            <span>מספר ליד עיגול: כמה זוכים חלקו את הפרס</span>
            <span>לחיצה על עיגול: הרעיון והעיר בצד</span>
            <span>לחיצה על תחום: האבולוציה של הרעיונות</span>
          </div>
        </div>}
      </div>
      <aside className="panel panel-pad scroll-in stack">
        {cur ? <Card m={m} e={cur} color={color(cur.area)} areaHe={areas.find((a) => a.code === cur.area)?.he ?? ""} status={T.status}
          close={() => { setPick(null); setP(area, null); }} /> : area ? (
          <div className="stack">
            {art && <Thread art={art} steps={steps(area)} color={color(area)} onRead={() => { setRead(true); setP(area, null, true); }} />}
            <span className="label">כל הזוכים ב{areas.find((a) => a.code === area)?.he} · <bdi className="num">{nowShown.length}</bdi> פרסים</span>
            {nowShown.map((e) => (
              <button key={e.slug} className="tu-item idea-first" onClick={() => { setPick(e.slug); setP(area, e.slug, read); }}>
                <span className="idea-big">{e.idea}</span>
                <span className="who-small"><bdi className="num">{e.y}</bdi> · {e.he}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <button className="press thread-read" onClick={() => { setArea("ai"); setRead(true); setP("ai", null, true); }}>לכתבה: מהלוגיקה אל הניסיון ←</button>
            <Tone kind="insight" title="הרציונל">{"==הפרס משרטט את כל מדעי המחשב: מהתאוריה, דרך השפות והמערכות, עד הרשת וההצפנה.==\nהבינה המלאכותית קיבלה פרס בחמישה גלים, וכל גל החליף את התפיסה הקודמת."}</Tone>
            <div className="tu-waves">
              {T.ai_waves.map((w) => {
                const es = ai.filter((e) => e.y >= w.from && e.y <= w.to);
                return (
                  <div key={w.he}>
                    <span className="label"><bdi className="num">{w.from === w.to ? w.from : `${w.from}–${w.to}`}</bdi> · {w.he}</span>
                    {es.map((e) => <button key={e.slug} className="tu-item idea-first" onClick={() => { setPick(e.slug); setP(area, e.slug); }}><span className="idea-big">{e.idea}</span><span className="who-small">{e.he}</span></button>)}
                  </div>
                );
              })}
            </div>
            <Tone kind="problem" title="שדה הטיה">{T.bias}</Tone>
            <p className="src">מקורות: Wikidata, ורשימת הזוכים בוויקיפדיה האנגלית {T.checked_wikipedia ? "(הושוו לפי מזהה)" : "(ההשוואה ממתינה)"} · אתר ACM חוסם גישה אוטומטית, ולכן <strong>לא אומת</strong> מולו · תמונות: Wikimedia Commons.</p>
          </>
        )}
      </aside>
    </div>
  );
}

function Card({ m, e, color, areaHe, status, close }: { m: Model; e: TuringEntry; color: string; areaHe: string; status: string; close: () => void }) {
  const life = (b: string | null, d: string | null) => [b?.slice(0, 4), d?.slice(0, 4)].filter(Boolean).join("–");
  return (
    <div className="stack rise" key={e.slug}>
      <div className="aside-ops"><span className="label" style={{ color }}>{areaHe} · פרס טיורינג <bdi className="num">{e.y}</bdi></span><button className="press icon-btn" onClick={close} aria-label="סגירה">×</button></div>
      <div className="tu-faces">
        {e.people.map((p) => (
          <figure key={p.qid} className="tu-face">
            {p.img ? <img src={`./${p.img}`} alt={p.en ?? ""} onError={(x) => { x.currentTarget.style.display = "none"; }} /> : <span className="tu-noimg">אין תמונה חופשית</span>}
            <figcaption>
              <bdi dir="ltr">{p.en}</bdi>
              <span className="label">{p.c?.split("|")[0] ?? ""}{life(p.b, p.d) ? <> · <bdi className="num">{life(p.b, p.d)}</bdi></> : null}</span>
              {p.nobel.map((n) => <span key={n.y} className="st st-ok tu-nobel">גם נובל ל{FIELD[n.f].he}, <bdi className="num">{n.y}</bdi></span>)}
              {!p.wd && <span className="st st-est">חסר ב-Wikidata, מאומת מוויקיפדיה</span>}
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="card-idea"><Tone kind="insight" title="הרעיון">{`==${e.idea}==`}</Tone></div>
      <h2 className="name-small">{e.he}</h2>
      <p className="ins-line ins-city"><strong>לעיר:</strong> {e.city}</p>
      {e.people.some((p) => p.nobel.length) && (
        <button className="press tu-bridge" onClick={() => { const n = e.people.find((p) => p.nobel.length)!.nobel[0]; go(m.selIds.has(n.id) ? "people" : "world", { id: n.id }); }}>
          לחדר הנובל של הזוכה ←
        </button>
      )}
      <span className={`st ${status === "מאושר" ? "st-ok" : "st-est"}`} style={{ justifySelf: "start" }}>{status === "מאושר" ? "פרשנות מאושרת · הערכה" : "טיוטה לאישור · הערכה"}</span>
      <p className="src">
        {e.people.filter((p) => p.img).map((p) => <span key={p.qid}>תמונה: <bdi dir="ltr">{p.by ?? "לא ידוע"}</bdi>, <bdi dir="ltr">{p.lic}</bdi>{p.page && <> (<a href={p.page} target="_blank" rel="noreferrer">Commons</a>)</>}. </span>)}
        {e.people.filter((p) => p.wiki).map((p, i) => <span key={p.qid}>{i ? " · " : ""}<a href={p.wiki!} target="_blank" rel="noreferrer">ויקיפדיה: <bdi dir="ltr">{p.en}</bdi></a></span>)}
      </p>
    </div>
  );
}
