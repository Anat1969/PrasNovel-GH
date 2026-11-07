import { useEffect, useMemo, useState } from "react";
import { Model, PritzkerEntry } from "../lib/data";
import Rich from "../lib/Rich";
import { go } from "../lib/route";
import { Tone } from "../lib/ui";
import { ArticleView, Step, Thread } from "../lib/Thread";

/** חדר פריצקר: פרס האדריכלות, חדר נפרד מנובל. רשת כרונולוגית, צבע לפי משפחת רעיון.
 *  לחיצה על משפחה: האבולוציה של הרעיון בצד, ואז השמות. לחיצה על אריח: הכרטיס בצד. */
export default function PritzkerPage({ m, params }: { m: Model; params: Record<string, string> }) {
  const P = m.pritzker;
  const [theme, setTheme] = useState<string | null>(params.t ?? null);
  const [women, setWomen] = useState(params.w === "1");
  const [pick, setPick] = useState<string | null>(params.id ?? null);
  const [read, setRead] = useState(params.art === "1");
  useEffect(() => { setPick(params.id ?? null); setTheme(params.t ?? null); setRead(params.art === "1"); }, [params.id, params.t, params.art]);
  const all = P?.entries ?? [];
  const list = useMemo(() => all.filter((e) => (!theme || e.theme === theme) && (!women || e.people.some((p) => p.g === "f"))), [all, theme, women]);
  if (!P) return <div className="panel empty">אין נתוני פריצקר. הריצו את scripts/fetch_pritzker.py ואת הייצוא.</div>;

  const people = all.flatMap((e) => e.people);
  const nWomen = people.filter((p) => p.g === "f").length;
  const firstWoman = all.find((e) => e.people.some((p) => p.g === "f"));
  const countries = new Map<string, number>();
  people.forEach((p) => (p.c ?? "לא ידוע").split("|").slice(0, 1).forEach((c) => countries.set(c, (countries.get(c) ?? 0) + 1)));
  const topC = [...countries.entries()].sort((a, b) => b[1] - a[1]);
  const cur = all.find((e) => e.slug === pick) ?? null;
  const cols = list.length > 20 ? 7 : list.length > 9 ? 4 : 3;
  const themeOf = (code?: string | null) => P.themes.find((t) => t.code === code);
  const setParams = (t: string | null, w: boolean, id: string | null, art = false) =>
    go("pritzker", { t: t ?? undefined, w: w ? "1" : undefined, id: id ?? undefined, art: art ? "1" : undefined });
  const steps = (code: string): Step[] => (P.articles[code]?.steps ?? []).map((s) => {
    const e = all.find((x) => x.slug === s.slug)!;
    return { y: e.y, who: e.he, step: s.step, onClick: () => { setPick(e.slug); setParams(code, women, e.slug, read); } };
  });
  const art = theme ? P.articles[theme] : undefined;
  const pickTheme = (v: string | null) => { setTheme(v); setPick(null); setRead(false); setParams(v, women, null); };

  return (
    <div className="focus-aside pz">
      <div className="screen" style={{ gridTemplateRows: "auto minmax(0,1fr)" }}>
        <div className="screen-head">
          <div>
            <Rich as="h1" className="insight-line">{`**${all.length}** פרסים מאז **${all[0]?.y}**, **${people.length}** אדריכלים, **${P.themes.length}** משפחות של רעיון`}</Rich>
            <p className="explain">חדר נפרד: <strong>פרס פריצקר לאדריכלות</strong>, שאינו חלק מפרס נובל. <mark className="insight">לחיצה על משפחה מראה איך הרעיון התפתח, ולאן הוא הולך.</mark></p>
          </div>
          <div className="controls pz-controls">
            <button className="chip" aria-pressed={!theme && !women} onClick={() => { setWomen(false); pickTheme(null); }}>הכול</button>
            {P.themes.map((t) => (
              <button key={t.code} className="chip" aria-pressed={theme === t.code} onClick={() => pickTheme(theme === t.code ? null : t.code)}>
                <i className="dot" style={{ background: t.color }} />{t.he} <bdi className="num">{all.filter((e) => e.theme === t.code).length}</bdi>
              </button>
            ))}
            <button className="chip" aria-pressed={women} onClick={() => { setWomen(!women); setPick(null); setParams(theme, !women, null); }}>רק נשים</button>
          </div>
        </div>
        {read && art && theme ? <ArticleView art={art} steps={steps(theme)} color={themeOf(theme)!.color} kicker={`פריצקר · ${themeOf(theme)!.he}`}
          status={P.status} onClose={() => { setRead(false); setParams(theme, women, pick); }} /> :
        <div className="panel fill pz-panel">
          <div className="pz-grid" style={{ ["--cols" as string]: cols, ["--rows" as string]: Math.ceil(list.length / cols) }}>
            {list.map((e) => <Tile key={e.slug} e={e} color={themeOf(e.theme)?.color ?? "#888"} on={pick === e.slug} onClick={() => { const v = pick === e.slug ? null : e.slug; setPick(v); setParams(theme, women, v); }} />)}
          </div>
          <div className="legend panel-legend">
            {P.themes.map((t) => <span key={t.code}><i className="dot" style={{ background: t.color }} /> {t.he}</span>)}
            <span>לחיצה על משפחה: האבולוציה של הרעיון</span>
          </div>
        </div>}
      </div>
      <aside className="panel panel-pad scroll-in stack">
        {cur ? <Card e={cur} close={() => { setPick(null); setParams(theme, women, null, read); }} status={P.status} themeHe={themeOf(cur.theme)?.he} color={themeOf(cur.theme)?.color} /> : theme && art ? (
          <div className="stack">
            <Thread art={art} steps={steps(theme)} color={themeOf(theme)!.color} onRead={() => { setRead(true); setParams(theme, women, null, true); }} />
            <span className="label">כל הזוכים ב{themeOf(theme)!.he} · <bdi className="num">{list.length}</bdi></span>
            {list.map((e) => (
              <button key={e.slug} className="tu-item idea-first" onClick={() => { setPick(e.slug); setParams(theme, women, e.slug, read); }}>
                <span className="idea-big">{e.idea}</span>
                <span className="who-small"><bdi className="num">{e.y}</bdi> · {e.he}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <Tone kind="insight" title="מה יש בחדר">{`==שש משפחות של רעיון, ולכל אחת חוט שמוביל לגילוי הבא.==\nהשנים והשמות מאומתים מול הרשימה הרשמית ומול Wikidata.\nהרעיון והיישום לעיר: ${P.status === "מאושר" ? "**פרשנות מאושרת** [הערכה]" : "**טיוטה** לאישור"}.`}</Tone>
            <div className="pz-themes">
              {P.themes.map((t) => (
                <button key={t.code} className="tu-item idea-first" style={{ borderInlineStart: `3px solid ${t.color}`, paddingInlineStart: 10 }} onClick={() => pickTheme(t.code)}>
                  <span className="idea-big">{P.articles[t.code]?.title}</span>
                  <span className="who-small">{t.he} · <bdi className="num">{all.filter((e) => e.theme === t.code).length}</bdi> זוכים</span>
                </button>
              ))}
            </div>
            <div className="pz-stats">
              <div><span className="label">נשים</span><strong className="num">{nWomen}/{people.length}</strong><span className="dc-sub">הראשונה: {firstWoman?.he}, <bdi className="num">{firstWoman?.y}</bdi></span></div>
              <div><span className="label">מדינות (לפי אזרחות ראשונה)</span><strong className="num">{countries.size}</strong>
                <span className="dc-sub">{topC.slice(0, 4).map(([c, n]) => `${c} ${n}`).join(" · ")}</span></div>
            </div>
            <Tone kind="problem" title="שדה הטיה">{P.bias + " החלוקה למשפחות היא הכרעה של Claude: זוכה שפעל בכמה כיוונים שויך לאחד."}</Tone>
            <p className="src">מקורות: <a href={P.source} target="_blank" rel="noreferrer">הרשימה הרשמית של הפרס</a> (שנים ושמות בלבד; הטקסטים והתמונות באתר מוגנים) · Wikidata · Wikimedia Commons. תמונת מצב <bdi className="num">{P.snapshot}</bdi>.</p>
          </>
        )}
      </aside>
    </div>
  );
}

function Tile({ e, color, on, onClick }: { e: PritzkerEntry; color: string; on: boolean; onClick: () => void }) {
  return (
    <button className="press tile pz-tile" aria-current={on} style={{ ["--c" as string]: color }} onClick={onClick} title={`${e.y} · ${e.he}`}>
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

function Card({ e, close, status, themeHe, color }: { e: PritzkerEntry; close: () => void; status: string; themeHe?: string; color?: string }) {
  const life = (p: PritzkerEntry["people"][number]) => [p.b?.slice(0, 4), p.d?.slice(0, 4)].filter(Boolean).join("–");
  return (
    <div className="stack rise" key={e.slug}>
      <div className="aside-ops"><span className="label" style={{ color }}>{themeHe ? `${themeHe} · ` : ""}זוכה פריצקר <bdi className="num">{e.y}</bdi></span><button className="press icon-btn" onClick={close} aria-label="סגירה">×</button></div>
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
      <div className="card-idea"><Tone kind="insight" title="הרעיון">{`==${e.idea}==`}</Tone></div>
      <div>
        <h2 className="name-small">{e.he}</h2>
        {e.en && <p className="lat pz-en" dir="ltr">{e.en}</p>}
      </div>
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
