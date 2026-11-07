import { useMemo, useState } from "react";
import { Model, PritzkerEntry } from "../lib/data";
import Rich from "../lib/Rich";
import { go } from "../lib/route";
import { Tone } from "../lib/ui";

/** חדר פריצקר: פרס האדריכלות, חדר נפרד מנובל. רשת כרונולוגית; לחיצה על אריח מחליפה את החלונית שבצד. */
const DECADES = [
  { k: "70", from: 1979, to: 1989, he: "1979–1989", color: "#B49A6A" },
  { k: "90", from: 1990, to: 1999, he: "שנות ה־90", color: "#8F7D5E" },
  { k: "00", from: 2000, to: 2009, he: "שנות ה־2000", color: "#6F665A" },
  { k: "10", from: 2010, to: 2019, he: "שנות ה־2010", color: "#4F4C47" },
  { k: "20", from: 2020, to: 2099, he: "שנות ה־2020", color: "#1B1A17" },
];
const decadeOf = (y: number) => DECADES.find((d) => y >= d.from && y <= d.to)!;

export default function PritzkerPage({ m, params }: { m: Model; params: Record<string, string> }) {
  const P = m.pritzker;
  const [dec, setDec] = useState<string | null>(params.d ?? null);
  const [women, setWomen] = useState(params.w === "1");
  const [pick, setPick] = useState<string | null>(params.id ?? null);
  const all = P?.entries ?? [];
  const list = useMemo(() => all.filter((e) => (!dec || decadeOf(e.y).k === dec) && (!women || e.people.some((p) => p.g === "f"))), [all, dec, women]);
  if (!P) return <div className="panel empty">אין נתוני פריצקר. הריצו את scripts/fetch_pritzker.py ואת הייצוא.</div>;

  const people = all.flatMap((e) => e.people);
  const nWomen = people.filter((p) => p.g === "f").length;
  const firstWoman = all.find((e) => e.people.some((p) => p.g === "f"));
  const countries = new Map<string, number>();
  people.forEach((p) => (p.c ?? "לא ידוע").split("|").slice(0, 1).forEach((c) => countries.set(c, (countries.get(c) ?? 0) + 1)));
  const topC = [...countries.entries()].sort((a, b) => b[1] - a[1]);
  const cur = all.find((e) => e.slug === pick) ?? null;
  const cols = list.length > 20 ? 7 : list.length > 9 ? 5 : 3;
  const setParams = (d: string | null, w: boolean, id: string | null) => go("pritzker", { d: d ?? undefined, w: w ? "1" : undefined, id: id ?? undefined });

  return (
    <div className="focus-aside pz">
      <div className="screen" style={{ gridTemplateRows: "auto minmax(0,1fr)" }}>
        <div className="screen-head">
          <div>
            <Rich as="h1" className="insight-line">{`**${all.length}** פרסים מאז **${all[0]?.y}**, **${people.length}** אדריכלים, **${nWomen}** נשים`}</Rich>
            <p className="explain">חדר נפרד: <strong>פרס פריצקר לאדריכלות</strong>, שאינו חלק מפרס נובל. <mark className="insight">לכל זוכה: הרעיון שלו, ומה העיר לוקחת ממנו.</mark></p>
          </div>
          <div className="controls pz-controls">
            <button className="chip" aria-pressed={!dec && !women} onClick={() => { setDec(null); setWomen(false); setPick(null); setParams(null, false, null); }}>הכול</button>
            {DECADES.map((d) => (
              <button key={d.k} className="chip" aria-pressed={dec === d.k} onClick={() => { const v = dec === d.k ? null : d.k; setDec(v); setPick(null); setParams(v, women, null); }}>
                <i className="dot" style={{ background: d.color }} />{d.he}
              </button>
            ))}
            <button className="chip" aria-pressed={women} onClick={() => { setWomen(!women); setPick(null); setParams(dec, !women, null); }}>רק נשים</button>
          </div>
        </div>
        <div className="panel fill pz-panel">
          <div className="pz-grid" style={{ ["--cols" as string]: cols, ["--rows" as string]: Math.ceil(list.length / cols) }}>
            {list.map((e) => <Tile key={e.slug} e={e} on={pick === e.slug} onClick={() => { const v = pick === e.slug ? null : e.slug; setPick(v); setParams(dec, women, v); }} />)}
          </div>
          <div className="legend panel-legend">
            {DECADES.map((d) => <span key={d.k}><i className="dot" style={{ background: d.color }} /> {d.he}</span>)}
            <span>לחיצה על אריח: הרעיון והעיר בצד</span>
          </div>
        </div>
      </div>
      <aside className="panel panel-pad scroll-in stack">
        {cur ? <Card e={cur} close={() => { setPick(null); setParams(dec, women, null); }} status={P.status} /> : (
          <>
            <Tone kind="insight" title="מה יש בחדר">{`==כל זוכה מוצג עם הרעיון שלו, ומה העיר לוקחת ממנו.==\nהשנים והשמות מאומתים מול הרשימה הרשמית ומול Wikidata.\nהרעיון והיישום לעיר: ${P.status === "מאושר" ? "**פרשנות מאושרת** [הערכה]" : "**טיוטה** לאישור"}.`}</Tone>
            <div className="pz-stats">
              <div><span className="label">נשים</span><strong className="num">{nWomen}/{people.length}</strong><span className="dc-sub">הראשונה: {firstWoman?.he}, <bdi className="num">{firstWoman?.y}</bdi></span></div>
              <div><span className="label">מדינות (לפי אזרחות ראשונה)</span><strong className="num">{countries.size}</strong>
                <span className="dc-sub">{topC.slice(0, 4).map(([c, n]) => `${c} ${n}`).join(" · ")}</span></div>
            </div>
            <Tone kind="problem" title="שדה הטיה">{P.bias}</Tone>
            <p className="src">מקורות: <a href={P.source} target="_blank" rel="noreferrer">הרשימה הרשמית של הפרס</a> (שנים ושמות בלבד; הטקסטים והתמונות באתר מוגנים) · Wikidata · Wikimedia Commons. תמונת מצב <bdi className="num">{P.snapshot}</bdi>.</p>
          </>
        )}
      </aside>
    </div>
  );
}

function Tile({ e, on, onClick }: { e: PritzkerEntry; on: boolean; onClick: () => void }) {
  const d = decadeOf(e.y);
  return (
    <button className="press tile pz-tile" aria-current={on} style={{ ["--c" as string]: d.color }} onClick={onClick} title={`${e.y} · ${e.he}`}>
      <div className="tile-img pz-img">
        {e.work?.img ? <img src={`./${e.work.img}`} alt={e.work.he ?? e.work.en ?? ""} loading="lazy" onError={(x) => { x.currentTarget.style.display = "none"; }} />
          : <span className="pz-gap">אין תמונה חופשית</span>}
      </div>
      <div className="tile-txt">
        <span className="tile-name"><bdi className="num">{e.y}</bdi> {e.he}</span>
        <span className="tile-disc pz-work">{e.work ? (e.work.he ?? <bdi dir="ltr">{e.work.en}</bdi>) : "עבודה מרכזית: לא נבחרה"}</span>
      </div>
    </button>
  );
}

function Card({ e, close, status }: { e: PritzkerEntry; close: () => void; status: string }) {
  const life = (p: PritzkerEntry["people"][number]) => [p.b?.slice(0, 4), p.d?.slice(0, 4)].filter(Boolean).join("–");
  return (
    <div className="stack rise" key={e.slug}>
      <div className="aside-ops"><span className="label">זוכה פריצקר <bdi className="num">{e.y}</bdi></span><button className="press icon-btn" onClick={close} aria-label="סגירה">×</button></div>
      {e.work?.img && (
        <figure className="pz-fig">
          <img className="aside-img" src={`./${e.work.img}`} alt={e.work.he ?? e.work.en ?? ""} onError={(x) => { x.currentTarget.style.display = "none"; }} />
          <figcaption className="src">
            {e.work.he ?? <bdi dir="ltr">{e.work.en}</bdi>}{e.work.place ? `, ${e.work.place}` : ""}{e.work.y ? <>, <bdi className="num">{e.work.y}</bdi></> : null}.
            {" "}תמונה: <bdi dir="ltr">{e.work.by ?? "לא ידוע"}</bdi>, <bdi dir="ltr">{e.work.lic}</bdi>{e.work.page && <>, <a href={e.work.page} target="_blank" rel="noreferrer">Commons</a></>}
          </figcaption>
        </figure>
      )}
      {e.work && !e.work.img && <p className="src">העבודה המרכזית: {e.work.he ?? <bdi dir="ltr">{e.work.en}</bdi>}. התמונה עוד לא נטענה.</p>}
      <div>
        <h2 className="pz-name">{e.he}</h2>
        {e.en && <p className="lat pz-en" dir="ltr">{e.en}</p>}
      </div>
      <Tone kind="insight" title="הרעיון">{`==${e.idea}==`}</Tone>
      <p className="ins-line ins-city"><strong>לעיר:</strong> {e.city}</p>
      <div className="pz-people">
        {e.people.map((p) => (
          <div key={p.qid}>
            <span className="label">{p.c?.split("|").join(", ") ?? "אזרחות לא ידועה"}{life(p) ? <> · <bdi className="num">{life(p)}</bdi></> : null}</span>
            {p.wiki && <a className="src" href={p.wiki} target="_blank" rel="noreferrer">ויקיפדיה</a>}
          </div>
        ))}
      </div>
      <span className={`st ${status === "מאושר" ? "st-ok" : "st-est"}`} style={{ justifySelf: "start" }}>{status === "מאושר" ? "פרשנות מאושרת · הערכה" : "טיוטה לאישור · הערכה"}</span>
      <p className="src">שנה ושם: הרשימה הרשמית של הפרס. העבודה: Wikidata, שבה הזוכה רשום כאדריכל.</p>
    </div>
  );
}
