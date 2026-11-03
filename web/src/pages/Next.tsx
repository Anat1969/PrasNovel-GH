import { useState } from "react";
import { FIELD, FIELDS, FieldCode, Model, nameHe } from "../lib/data";
import FieldGlyph from "../lib/FieldGlyph";
import LaureateLine from "../lib/Laureate";
import Rich from "../lib/Rich";
import { go } from "../lib/route";
import { FieldChips, Src, Tone } from "../lib/ui";

/** הגילוי הבא: כתבת EPOCH לכל תחום. התחזית היא הנחה; העובדות, השמות והציטוט מהנתונים הרשמיים. */
export default function Next({ m, params }: { m: Model; params: Record<string, string> }) {
  const [field, setField] = useState<FieldCode>(() => ((params.f && FIELD[params.f as FieldCode]) ? params.f as FieldCode : "physics"));
  const a = m.next?.articles[field];
  if (!a) return <div className="panel empty">אין כתבות עדיין.</div>;
  const F = FIELD[field];
  const prizeOf = (id: string, y: number) => m.prizesOf.get(id)?.find((p) => p.y === y);
  const q = prizeOf(a.quote_ref.id, a.quote_ref.y);
  const img = m.selected.find((s) => s.nobel_id === a.image_from)?.image;
  const setF = (f: FieldCode[]) => { const v = f[f.length - 1] ?? field; setField(v); go("next", { f: v }); };

  return (
    <div className="focus-aside">
      <div className="screen" style={{ gridTemplateRows: "auto minmax(0,1fr)" }}>
        <div className="screen-head">
          <div>
            <h1 className="insight-line">הגילוי הבא ב{F.he}</h1>
            <p className="explain">כתבה לכל תחום, ברוח EPOCH. <mark className="insight">התחזית היא [הנחה], ניסוי מחשבתי.</mark> השמות, המוסדות והנימוקים מנתוני הנובל.</p>
          </div>
          <div className="controls"><FieldChips value={[field]} onChange={setF} /></div>
        </div>
        <article className="panel fill nx" style={{ ["--c" as string]: F.color }} key={field}>
          <div className="nx-scroll">
            <header className="nx-hero">
              {img && <figure className="nx-fig"><img src={img.thumb_url} alt={img.caption_he} onError={(e) => { e.currentTarget.style.display = "none"; }} /><figcaption>{img.caption_he}</figcaption></figure>}
              <div className="nx-titles">
                <span className="nx-kicker"><FieldGlyph f={field} size={14} /> {F.he} · <span className="tr-ev est">הנחה</span></span>
                <h2 className="nx-title">{a.title}</h2>
                <p className="nx-sub">{a.subtitle}</p>
                <p className="nx-hook">{a.hook}</p>
              </div>
            </header>
            <div className="nx-body">
              <p>{a.lens}</p>
              <Rich as="p">{a.deep}</Rich>
              <blockquote className="nx-meta"><span className="label">המטפורה המנחה</span>{a.metaphor}</blockquote>
              <div className="nx-impl">
                <div><span className="label">עכשיו</span><p>{a.implications.now}</p></div>
                <div><span className="label">שנה־שנתיים</span><p>{a.implications.short}</p></div>
                <div><span className="label">שלוש עד חמש שנים</span><p>{a.implications.long}</p></div>
                <div className="nx-me"><span className="label">לי ולעיר</span><p>{a.implications.personal}</p></div>
              </div>
              <div className="nx-act"><span className="label">מה עושים</span><ol>{a.action.map((x) => <li key={x}>{x}</li>)}</ol></div>
            </div>
          </div>
        </article>
      </div>
      <aside className="panel panel-pad scroll-in stack">
        {q && (
          <figure className="nx-quote">
            <span className="label">הציטוט: נימוק הוועדה, {q.y}</span>
            <blockquote>"{q.mh ?? q.m}"</blockquote>
            <span className="lat" dir="ltr">"{q.m}"</span>
            <Src href={`https://www.nobelprize.org/laureate/${q.id}`}>{`NobelPrize.org · ${nameHe(m.byId.get(q.id))}`}</Src>
          </figure>
        )}
        <Tone kind="insight" title="התובנה">{a.insight}</Tone>
        <div className="haiku">{a.haiku.map((l) => <span key={l}>{l}</span>)}</div>
        <div className="label">הקולות שעליהם הכתבה נשענת</div>
        {a.experts.map((e) => {
          const p = prizeOf(e.id, e.y);
          return p ? <div key={e.id} className="nx-expert"><LaureateLine m={m} p={p} compact onName={m.selIds.has(e.id) ? () => go("people", { id: e.id }) : undefined} /><p className="dc-sub">{e.role}</p></div> : null;
        })}
        <Tone kind="problem" title="איך לקרוא [הנחה]">{"אף אחד לא יודע מה יהיה הגילוי הבא.\nהכתבה היא **תרגיל חשיבה**: היא מושכת קו מהגילויים האחרונים אל שאלה פתוחה."}</Tone>
        <div className="chips">{FIELDS.map((f) => <button key={f.code} className="chip" aria-pressed={field === f.code} onClick={() => setF([f.code])}><i className="dot" style={{ background: f.color }} />{f.he}</button>)}</div>
      </aside>
    </div>
  );
}
