import { useEffect, useMemo, useState } from "react";
import { FIELD, FIELDS, FieldCode, Model, Selected } from "../lib/data";
import FieldGlyph from "../lib/FieldGlyph";
import IdeaCurve from "../lib/IdeaCurve";
import Rich from "../lib/Rich";
import { go, href } from "../lib/route";
import { FieldChips, Icon, Name, Src, Tone } from "../lib/ui";

const REPO = "https://github.com/Anat1969/PrasNovel-GH/blob/main/";

function WorkImage({ s, large }: { s: Selected; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [s.nobel_id]);
  if (s.image && !failed) {
    return (
      <img src={s.image.thumb_url} alt={s.image.caption_he} loading="lazy" decoding="async"
        width={s.image.width} height={s.image.height} className={large ? "work-img large" : "work-img"}
        onError={() => setFailed(true)} />
    );
  }
  const why = failed ? "התמונה לא נטענה כרגע מ-Wikimedia Commons." : s.image_gap ?? "אין עדיין תמונת עבודה מתאימה";
  return (
    <div className={large ? "work-gap large" : "work-gap"} title={why}>
      <FieldGlyph f={s.field} size={large ? 64 : 40} />
    </div>
  );
}

const ST: Record<string, string> = { "אומת": "st-ok", "הערכה": "st-est", "סתירה": "st-bad", "לא קושר": "st-bad", "לא רלוונטי": "st-na", "לא נאסף": "st-na" };

/** OpenAlex בכרטיס: סטטוס הקישור, עקומת חיי הרעיון והמאמרים המצוטטים ביותר. */
function OpenAlexBlock({ s }: { s: Selected }) {
  const o = s.openalex;
  return (
    <div className="detail-block">
      <div className="label">חיי הרעיון <span className={`st ${ST[o.status]}`}>{o.status}</span></div>
      {o.why && <p className="src">{o.why}</p>}
      {o.curve && o.curve.length > 0 && (
        <a href="#/ideas" title="לכל העקומות" className="oa-curve">
          <IdeaCurve curve={o.curve} prize={s.year} color={FIELD[s.field].color} w={300} h={46} from={Math.min(o.curve[0][0], s.year - 5)} />
        </a>
      )}
      {o.cited != null && (
        <dl className="facts">
          <dt>עבודות</dt><dd><bdi className="num">{o.works?.toLocaleString("en-US")}</bdi></dd>
          <dt>ציטוטים</dt><dd><bdi className="num">{o.cited.toLocaleString("en-US")}</bdi></dd>
          <dt>מדד h</dt><dd><bdi className="num">{o.h}</bdi></dd>
        </dl>
      )}
      {o.top?.slice(0, 3).map((w) => (
        <div key={w.title + w.y} className="dense-row oa-work">
          <span className="num label">{w.y ?? "-"}</span>
          {w.doi ? <a href={w.doi} target="_blank" rel="noreferrer" dir="auto">{w.title}</a> : <span dir="auto">{w.title}</span>}
          <span className="num label" title="ציטוטים">{w.c.toLocaleString("en-US")}</span>
        </div>
      ))}
      {o.ids && o.ids.length > 0 && (
        <p className="src">{o.split ? "OpenAlex מפצל את הזוכה לשני פרופילים, ושניהם נספרים. " : ""}
          {o.ids.map((id) => <a key={id} href={`https://openalex.org/${id}`} target="_blank" rel="noreferrer" style={{ marginInlineEnd: 6 }}>OpenAlex {id}</a>)}
        </p>
      )}
    </div>
  );
}

export default function People({ m, params }: { m: Model; params: Record<string, string> }) {
  const [fields, setFields] = useState<FieldCode[]>(() => (params.f ? (params.f.split(",") as FieldCode[]) : []));
  const order = FIELDS.map((f) => f.code);
  const list = useMemo(() => m.selected
    .filter((s) => !fields.length || fields.includes(s.field))
    .sort((a, b) => order.indexOf(a.field) - order.indexOf(b.field) || a.year - b.year), [m, fields]);
  const id = params.id && list.some((s) => s.nobel_id === params.id) ? params.id : list[0]?.nobel_id;
  const idx = list.findIndex((s) => s.nobel_id === id);
  const cur = list[idx];
  const setSel = (nid?: string, f = fields) => go("people", { id: nid, f: f.join(",") || undefined });

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowLeft" && idx < list.length - 1) setSel(list[idx + 1].nobel_id);
      if (e.key === "ArrowRight" && idx > 0) setSel(list[idx - 1].nobel_id);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });

  const women = list.filter((s) => m.byId.get(s.nobel_id)?.g === "female").length;
  return (
    <div className="focus-aside">
      <div className="screen">
        <div className="screen-head">
          <div>
            <Rich as="h1" className="insight-line">{`**${list.length}** ענקים, **${women}** מהם נשים.`}</Rich>
            <p className="explain">בכל תחום ארבעה: מוקדם ומאוחר, אישה, ומישהו שנולד מחוץ לאירופה ולארה"ב. <span className="label">{m.meta.selection_status}</span></p>
          </div>
          <FieldChips value={fields} onChange={(f) => { setFields(f); setSel(undefined, f); }} fields={order.filter((f) => f !== "literature")} />
        </div>
        <div className="people-grid" style={{ ["--rows" as string]: Math.ceil(list.length / 5) }}>
          {list.map((s, i) => {
            const p = m.byId.get(s.nobel_id)!; const prize = m.prizesOf.get(s.nobel_id)!.find((x) => x.y === s.year)!;
            return (
              <a key={s.nobel_id} href={href("people", { id: s.nobel_id, f: fields.join(",") || undefined })}
                className="press tile rise" style={{ ["--c" as string]: FIELD[s.field].color, animationDelay: `${i * .03}s` }}
                aria-current={s.nobel_id === id ? "true" : undefined}>
                <div className="tile-img"><WorkImage s={s} /></div>
                <div className="tile-txt">
                  <span className="label">{FIELD[s.field].he} · <bdi className="num">{s.year}</bdi></span>
                  <strong className="tile-name">{p.he || p.en}</strong>
                  <span className="lat tile-en" dir="ltr">{p.en}</span>
                </div>
                <span className="tile-age num" title="גיל בזכייה">{prize.age ?? ""}</span>
              </a>
            );
          })}
        </div>
      </div>
      {cur ? <Detail m={m} s={cur} idx={idx} n={list.length}
        prev={() => idx > 0 && setSel(list[idx - 1].nobel_id)} next={() => idx < list.length - 1 && setSel(list[idx + 1].nobel_id)} />
        : <div className="panel empty">אין זוכים בבחירה הזו. "הכול" מאפס את הבורר.</div>}
    </div>
  );
}

function Detail({ m, s, idx, n, prev, next }: { m: Model; s: Selected; idx: number; n: number; prev: () => void; next: () => void }) {
  const p = m.byId.get(s.nobel_id)!;
  const prize = m.prizesOf.get(s.nobel_id)!.find((x) => x.y === s.year)!;
  const others = m.prizesOf.get(s.nobel_id)!.filter((x) => x.y !== s.year);
  const mentors = m.edges.filter((e) => e.t === s.qid);
  const students = m.edges.filter((e) => e.s === s.qid);
  const c = s.card;
  return (
    <aside className="panel detail scroll-in" aria-label="כרטיס זוכה" key={s.nobel_id}>
      <div className="detail-ops">
        <button className="press icon-btn" onClick={prev} disabled={idx === 0} title="הקודם" aria-label="הקודם">{Icon.prev}</button>
        <span className="label" dir="ltr"><bdi className="num">{idx + 1}</bdi> / <bdi className="num">{n}</bdi></span>
        <button className="press icon-btn" onClick={next} disabled={idx === n - 1} title="הבא" aria-label="הבא">{Icon.next}</button>
        <a className="press icon-btn" href="#/people" title="איפוס הבחירה" aria-label="איפוס">{Icon.close}</a>
      </div>
      <div className="detail-head rise" style={{ ["--c" as string]: FIELD[s.field].color }}>
        <span className="label"><FieldGlyph f={s.field} size={14} /> {FIELD[s.field].he} · <bdi className="num">{s.year}</bdi></span>
        <h2 className="detail-name"><Name he={p.he} en={p.en} /></h2>
      </div>
      <figure className="detail-fig rise" style={{ animationDelay: ".05s" }}>
        <WorkImage s={s} large />
        {s.image ? (
          <figcaption>
            <strong>{s.image.caption_he}</strong>
            <span className="src"> {s.image.artist}{s.image.year ? `, ${s.image.year}` : ""} · {s.image.license} · <a href={s.image.page_url} target="_blank" rel="noreferrer">Wikimedia Commons</a></span>
          </figcaption>
        ) : <figcaption className="src">{s.image_gap ?? "אין עדיין תמונת עבודה עם רישיון מתועד."} חור גלוי עדיף על תמונה מטעה.</figcaption>}
      </figure>
      <dl className="facts">
        <dt>גיל בזכייה</dt><dd><bdi className="num">{prize.age ?? "-"}</bdi></dd>
        <dt>חלק בפרס</dt><dd><bdi className="num">{prize.p}</bdi></dd>
        <dt>מקום לידה</dt><dd>{[p.city, p.country].filter(Boolean).join(", ") || "-"}</dd>
        <dt>מוסד בזכייה</dt><dd>{s.affiliations.length ? s.affiliations.map((a) => a.name).join("; ") : "ללא שיוך ב-API"}</dd>
        {others.length ? <><dt>פרס נוסף</dt><dd>{others.map((o) => `${FIELD[o.f].he} ${o.y}`).join(", ")}</dd></> : null}
      </dl>
      <div className="detail-block">
        <div className="label">החידוש, בנימוק הרשמי</div>
        {s.motivation_he && <p className="quote">"{s.motivation_he}" <span className="label">תרגום</span></p>}
        <p className="lat" dir="ltr" style={{ margin: "2px 0" }}>"{prize.m}"</p>
        <Src href={`https://www.nobelprize.org/laureate/${s.nobel_id}`}>NobelPrize.org</Src>
      </div>
      {(mentors.length > 0 || students.length > 0) && (
        <div className="detail-block">
          <div className="label">מנחים ותלמידים</div>
          {mentors.map((e) => <div key={e.s} className="dense-row"><span className="label">מנחה</span><Name he={e.sh} en={e.sl ?? e.s} />{e.sn ? <span className="medal-tag">נובל</span> : null}</div>)}
          {students.slice(0, 6).map((e) => <div key={e.t} className="dense-row"><span className="label">תלמיד/ה</span><Name he={e.th} en={e.tl ?? e.t} />{e.tn ? <span className="medal-tag">נובל</span> : null}</div>)}
          {students.length > 6 && <a className="src" href={href("net", { id: s.nobel_id })}>עוד {students.length - 6} ברשת המנחים</a>}
        </div>
      )}
      <OpenAlexBlock s={s} />
      {s.museum && (
        <div className="detail-block">
          <div className="haiku">{s.museum.haiku.map((l) => <span key={l}>{l}</span>)}</div>
          <div className="src" style={{ marginTop: 4 }}>ההייקו מאיר: {s.museum.note} טיוטת Claude.</div>
        </div>
      )}
      <div className="detail-block">
        {s.card_status === "מאושר" ? (
          <>
            <Tone kind="insight" title="הרעיון">{c.idea_he ?? ""}</Tone>
            <Tone kind="solution" title={`מה לוקחים לעבודה [${c.label}]`}>{c.takeaway_he ?? ""}</Tone>
            <Tone kind="problem" title="שדה הטיה">{c.bias_note ?? ""}</Tone>
          </>
        ) : (
          <Tone kind="neutral" title="כרטיס התובנה: טיוטה">{`הרעיון, השיטה, ציטוט עד **15** מילים, יישום ושדה הטיה.\nנכתבים ונערכים על ידי ענת.`}</Tone>
        )}
        {s.card_file && <a className="src" href={REPO + s.card_file} target="_blank" rel="noreferrer">לעריכת הכרטיס ב-GitHub</a>}
        <p className="src" style={{ marginTop: 6 }}>למה נבחר/ה [הנחה]: {s.why_he}</p>
      </div>
    </aside>
  );
}
