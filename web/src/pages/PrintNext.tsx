import { FIELD, FIELDS, FieldCode, Model, nameHe } from "../lib/data";
import Rich from "../lib/Rich";
import { href } from "../lib/route";

/** כתבות "הגילוי הבא" לדפוס: דף A4 אחד לכל כתבה, מימין לשמאל, עם קרדיט לתמונה ומקור לציטוט.
 *  #/print?f=all מדפיס את כל השש; #/print?f=physics כתבה אחת. */
export default function PrintNext({ m, params }: { m: Model; params: Record<string, string> }) {
  const arts = m.next?.articles;
  if (!arts) return <div className="empty">אין כתבות.</div>;
  const f = params.f as FieldCode | "all" | undefined;
  const list = (f && f !== "all" && FIELD[f as FieldCode] ? [f as FieldCode] : FIELDS.map((x) => x.code)).filter((c) => arts[c]);

  return (
    <div className="a4-doc" dir="rtl" lang="he">
      <div className="a4-bar no-print">
        <a className="press a4-btn" href={href("next", f && f !== "all" ? { f } : undefined)}>חזרה לכתבות</a>
        <span className="a4-pick">
          <a href={href("print", { f: "all" })} aria-current={!f || f === "all" ? "page" : undefined}>כל השש</a>
          {FIELDS.map((x) => <a key={x.code} href={href("print", { f: x.code })} aria-current={f === x.code ? "page" : undefined}>{x.he}</a>)}
        </span>
        <button className="press a4-btn a4-print" onClick={() => window.print()}>הדפסה או שמירה כ־PDF</button>
        <span className="label">גודל A4, שוליים אפס בהגדרות ההדפסה</span>
      </div>
      {list.map((code, i) => <Sheet key={code} m={m} code={code} n={i + 1} total={list.length} />)}
    </div>
  );
}

function Sheet({ m, code, n, total }: { m: Model; code: FieldCode; n: number; total: number }) {
  const a = m.next!.articles[code];
  const F = FIELD[code];
  const prizeOf = (id: string, y: number) => m.prizesOf.get(id)?.find((p) => p.y === y);
  const q = prizeOf(a.quote_ref.id, a.quote_ref.y);
  const img = m.selected.find((s) => s.nobel_id === a.image_from)?.image;
  const imgBy = m.selected.find((s) => s.nobel_id === a.image_from);

  return (
    <article className="a4" style={{ ["--c" as string]: F.color }} data-field={code}>
      <header className="a4-top">
        <span className="a4-kicker">הגילוי הבא · {F.he} · <b>[הנחה]</b></span>
        <span className="a4-series">גמד על כתפי ענקים</span>
      </header>

      <h1 className="a4-title">{a.title}</h1>
      <p className="a4-sub">{a.subtitle}</p>

      <div className="a4-hero">
        {img ? (
          <figure className="a4-fig">
            <img src={`./next/${code}.jpg`} alt={img.caption_he} onError={(e) => { e.currentTarget.src = img.thumb_url; }} />
            <figcaption>{img.caption_he}</figcaption>
          </figure>
        ) : <div />}
        <p className="a4-hook">{a.hook}</p>
      </div>

      <div className="a4-cols">
        <p>{a.lens}</p>
        <Rich as="p">{a.deep}</Rich>
        <blockquote className="a4-meta"><span className="a4-lbl">המטפורה המנחה</span>{a.metaphor}</blockquote>
      </div>

      {q && (
        <figure className="a4-quote">
          <blockquote>"{q.mh ?? q.m}"</blockquote>
          <figcaption>נימוק ועדת הפרס, <bdi className="num">{q.y}</bdi> · {nameHe(m.byId.get(q.id))} · <bdi dir="ltr">NobelPrize.org</bdi></figcaption>
        </figure>
      )}

      <div className="a4-impl">
        <div><span className="a4-lbl">עכשיו</span><p>{a.implications.now}</p></div>
        <div><span className="a4-lbl">שנה־שנתיים</span><p>{a.implications.short}</p></div>
        <div><span className="a4-lbl">שלוש עד חמש שנים</span><p>{a.implications.long}</p></div>
        <div className="a4-me"><span className="a4-lbl">לי ולעיר</span><p>{a.implications.personal}</p></div>
      </div>

      <div className="a4-close">
        <div className="a4-ins">
          <span className="a4-lbl">התובנה</span>
          <p><mark className="insight">{a.insight.replace(/==/g, "")}</mark></p>
          <span className="a4-lbl">מה עושים</span>
          <ol>{a.action.map((x) => <li key={x}>{x}</li>)}</ol>
        </div>
        <div className="a4-haiku">{a.haiku.map((l) => <span key={l}>{l}</span>)}</div>
        <div className="a4-voices">
          <span className="a4-lbl">הקולות</span>
          {a.experts.map((e) => {
            const p = prizeOf(e.id, e.y);
            return p ? <p key={e.id}><b>{nameHe(m.byId.get(e.id))}</b>, <bdi className="num">{e.y}</bdi>. {e.role}</p> : null;
          })}
        </div>
      </div>

      <footer className="a4-foot">
        <span>
          <b>איך לקרוא:</b> התחזית היא [הנחה], תרגיל חשיבה. השמות, השנים והנימוקים מנתוני פרס נובל הרשמיים.
          {img && <span className="a4-credit">תמונה: <bdi dir="ltr">{img.artist ?? "לא ידוע"}</bdi>, <bdi dir="ltr">{img.license}</bdi>, <bdi dir="ltr">Wikimedia Commons</bdi>{imgBy ? ` (מתוך עבודת ${nameHe(m.byId.get(imgBy.nobel_id))})` : ""}.</span>}
        </span>
        <span className="a4-sign">אד' ענת שטיבלמן A&amp;I · <bdi className="num">{n}/{total}</bdi></span>
      </footer>
    </article>
  );
}
