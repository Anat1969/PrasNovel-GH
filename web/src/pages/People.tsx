import { useEffect, useMemo, useState } from "react";
import { FIELD, FIELDS, FieldCode, Model, OA_FIELD_HE, Selected } from "../lib/data";
import FieldGlyph from "../lib/FieldGlyph";
import IdeaCurve from "../lib/IdeaCurve";
import Rich from "../lib/Rich";
import { go, href } from "../lib/route";
import { FieldChips, Icon, Name, Tone } from "../lib/ui";

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
    <section className="dc-block">
      <h3 className="dc-h">חיי הרעיון <span className={`st ${ST[o.status]}`}>{o.status}</span></h3>
      {o.cited != null && (
        <div className="dc-cite"><span className="num">{o.cited.toLocaleString("en-US")}</span><span>ציטוטים ב-OpenAlex, ב-<bdi className="num">{o.works?.toLocaleString("en-US")}</bdi> עבודות · מדד h <bdi className="num">{o.h}</bdi></span></div>
      )}
      {o.why && <p className="src">{o.why}</p>}
      {o.curve && o.curve.length > 0 && (
        <a href="#/ideas" title="לכל העקומות" className="oa-curve">
          <IdeaCurve curve={o.curve} prize={s.year} color={FIELD[s.field].color} w={300} h={46} from={Math.min(o.curve[0][0], s.year - 5)} />
        </a>
      )}
      {o.fields && o.fields.length > 0 && (() => {
        const tot = o.fields.reduce((a, f) => a + f[1], 0);
        return (
          <div className="dc-fields" title="תחומי המחקר של העבודות שמצטטות את 25 המאמרים המובילים">
            <span className="dc-sub">מי משתמש ברעיון היום:</span>
            {o.fields.slice(0, 4).map(([f, nn]) => (
              <span key={f} className="dc-field-row"><span>{OA_FIELD_HE[f] ?? f}</span><span className="cite-bar"><i style={{ width: `${(nn / o.fields![0][1]) * 100}%`, background: "var(--c)" }} /></span><span className="num">{Math.round((nn / tot) * 100)}%</span></span>
            ))}
          </div>
        );
      })()}
      {o.top?.slice(0, 3).map((w) => (
        <div key={w.title + w.y} className="dense-row oa-work">
          <span className="num label">{w.y ?? "-"}</span>
          {w.doi ? <a href={w.doi} target="_blank" rel="noreferrer" dir="auto">{w.title}</a> : <span dir="auto">{w.title}</span>}
          <span className="num label" title="ציטוטים">{w.c.toLocaleString("en-US")}</span>
        </div>
      ))}
    </section>
  );
}

export default function People({ m, params }: { m: Model; params: Record<string, string> }) {
  const [fields, setFields] = useState<FieldCode[]>(() => (params.f ? (params.f.split(",") as FieldCode[]) : []));
  const order = FIELDS.map((f) => f.code);
  const list = useMemo(() => m.selected
    .filter((s) => !fields.length || fields.includes(s.field))
    .sort((a, b) => order.indexOf(a.field) - order.indexOf(b.field) || a.year - b.year), [m, fields]); // תואם לסדר השורות
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

  // שורה לכל תחום, הזוכים לפי הסדר הכרונולוגי
  const byField = order.map((f) => [f, list.filter((s) => s.field === f).sort((a, b) => a.year - b.year)] as const).filter(([, v]) => v.length) as [FieldCode, Selected[]][];
  const women = list.filter((s) => m.byId.get(s.nobel_id)?.g === "female").length;
  return (
    <div className="focus-aside">
      <div className="screen">
        <div className="screen-head">
          <div>
            <Rich as="h1" className="insight-line">{`**${list.length}** ענקים, **${women}** מהם נשים.`}</Rich>
            <p className="explain">{m.meta.selection_criteria}{" "}
              <details className="why-these"><summary>למה דווקא אלה?</summary><p>{m.meta.why_these}</p><p className="label">{m.meta.selection_status}</p></details></p>
          </div>
          <FieldChips value={fields} onChange={(f) => { setFields(f); setSel(undefined, f); }} />
        </div>
        <div className={`people-rows${byField.length === 1 ? " single" : ""}`} style={{ ["--rows" as string]: byField.length }}>
          {byField.map(([f, items]) => (
            <section key={f} className="prow" style={{ ["--c" as string]: FIELD[f].color }} aria-label={FIELD[f].he}>
              <div className="prow-head">
                <FieldGlyph f={f} size={16} />
                <strong>{FIELD[f].he}</strong>
                <span className="prow-span num">{items[0].year}–{items[items.length - 1].year}</span>
              </div>
              <div className="prow-line" aria-hidden="true" />
              {items.map((s, i) => {
                const p = m.byId.get(s.nobel_id)!; const prize = m.prizesOf.get(s.nobel_id)!.find((x) => x.y === s.year)!;
                return (
                  <a key={s.nobel_id} href={href("people", { id: s.nobel_id, f: fields.join(",") || undefined })}
                    className="press tile rise" style={{ animationDelay: `${i * .03}s` }}
                    aria-current={s.nobel_id === id ? "true" : undefined}
                    title={`${p.he || p.en} · ${s.year} · ${s.discovery ?? ""}`}>
                    <div className="tile-img"><WorkImage s={s} /></div>
                    <div className="tile-txt">
                      <span className="tile-year num">{s.year}</span>
                      <strong className="tile-name">{p.he || p.en}</strong>
                      <span className="tile-disc">{s.discovery ?? ""}</span>
                    </div>
                    <span className="tile-age num" title="גיל בזכייה">{prize.age ?? ""}</span>
                  </a>
                );
              })}
            </section>
          ))}
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
  const mu = s.museum;
  const o = s.openalex;
  const d = s.degree;
  const color = FIELD[s.field].color;
  const born = [p.city, p.country].filter(Boolean).join(", ");
  const disc = s.discovery ?? prize.d;
  const why = s.motivation_he ?? prize.mh;
  const pyear = (nid: string | null) => (nid ? m.firstYear.get(nid) : undefined);
  const pdisc = (nid: string | null) => (nid ? m.prizesOf.get(nid)?.[0]?.d : undefined);
  return (
    <aside className="panel detail scroll-in" aria-label="כרטיס זוכה" key={s.nobel_id} style={{ ["--c" as string]: color }}>
      <div className="detail-ops">
        <button className="press icon-btn" onClick={prev} disabled={idx === 0} title="הקודם" aria-label="הקודם">{Icon.prev}</button>
        <span className="label" dir="ltr"><bdi className="num">{idx + 1}</bdi> / <bdi className="num">{n}</bdi></span>
        <button className="press icon-btn" onClick={next} disabled={idx === n - 1} title="הבא" aria-label="הבא">{Icon.next}</button>
        <a className="press icon-btn" href="#/people" title="איפוס הבחירה" aria-label="איפוס">{Icon.close}</a>
      </div>

      <figure className="dc-hero rise">
        <WorkImage s={s} large />
        <span className="dc-badge"><span className="num">{s.year}</span> · {FIELD[s.field].he}</span>
        {s.image && <figcaption>{s.image.caption_he}</figcaption>}
      </figure>

      <header className="dc-head rise" style={{ animationDelay: ".04s" }}>
        <h2 className="dc-name">{p.he || p.en} <span className="dc-en" dir="ltr">{p.en}</span></h2>
        {disc && <div className="dc-disc">{disc}</div>}
        {why && <p className="dc-why">{why}</p>}
        <span className="dc-sub">נימוק הוועדה, בתרגום לעברית</span>
      </header>

      <div className="dc-two rise" style={{ animationDelay: ".08s" }}>
        <section className="dc-mind">
          <h3 className="dc-h">בשכל</h3>
          {mu?.contribution && <p className="dc-lead">{mu.contribution}</p>}
          {mu?.takeaway && <p className="dc-take"><mark className="insight">{mu.takeaway}</mark></p>}
        </section>
        {mu?.haiku && (
          <section className="dc-heart">
            <h3 className="dc-h">ברגש</h3>
            <div className="haiku">{mu.haiku.map((l) => <span key={l}>{l}</span>)}</div>
            <div className="dc-sub">{mu.note}</div>
          </section>
        )}
      </div>

      <dl className="dc-facts">
        <div><dt>גיל</dt><dd className="num">{prize.age ?? "-"}</dd></div>
        <div><dt>תואר</dt><dd>{d ? <>{d.he ?? d.en}{d.by_he || d.by_en ? <span className="dc-sub">{d.by_he ?? d.by_en}{d.year ? `, ${d.year}` : ""}</span> : null}</> : <span className="dc-sub">לא תועד</span>}</dd></div>
        <div><dt>נולד/ה</dt><dd>{born || "-"}{p.born ? <span className="dc-sub num">{p.born.slice(0, 4)}</span> : null}</dd></div>
        <div><dt>מוסד בזכייה</dt><dd>{s.affiliations.length ? s.affiliations.map((a) => a.name).join("; ") : <span className="dc-sub">ללא שיוך רשמי</span>}</dd></div>
        {others.length ? <div className="dc-wide"><dt>פרס נוסף</dt><dd>{others.map((x) => `${FIELD[x.f].he} ${x.y}: ${x.d ?? ""}`).join(" · ")}</dd></div> : null}
      </dl>

      {mu?.works && (
        <section className="dc-block">
          <h3 className="dc-h">היצירות</h3>
          <ul className="dc-works">{mu.works.map((w) => <li key={w.orig}><strong>{w.he ?? w.orig}</strong>{w.he && <span className="dc-sub" dir="auto">{w.orig}</span>}<span className="num dc-sub">{w.year}</span></li>)}</ul>
        </section>
      )}

      <OpenAlexBlock s={s} />

      {(mentors.length > 0 || students.length > 0) && (
        <section className="dc-block">
          <h3 className="dc-h">על כתפי מי, ומי על כתפיו</h3>
          {mentors.map((e) => <div key={e.s} className="dc-rel"><span className="label">מנחה</span><Name he={e.sh} en={e.sl ?? e.s} />{e.sn && <span className="dc-sub">נובל {pyear(e.sn)}: {pdisc(e.sn)}</span>}</div>)}
          {students.slice(0, 6).map((e) => <div key={e.t} className="dc-rel"><span className="label">תלמיד/ה</span><Name he={e.th} en={e.tl ?? e.t} />{e.tn && <span className="dc-sub">נובל {pyear(e.tn)}: {pdisc(e.tn)}</span>}</div>)}
          {students.length > 6 && <a className="src" href={href("net", { id: s.nobel_id })}>עוד {students.length - 6} ברשת המנחים</a>}
        </section>
      )}

      <section className="dc-block">
        <h3 className="dc-h">כרטיס התובנה</h3>
        <p className="dc-take">{s.why_he} <span className="label">[הנחה]</span></p>
        {c.idea_he ? (
          <div className="ins-card">
            <div className="ins-head"><span className={`st ${s.card_status === "מאושר" ? "st-ok" : "st-est"}`}>{s.card_status === "מאושר" ? "מאושר" : "טיוטה לאישור"}</span>
              {c.label && <span className="label">[{c.label}]</span>}</div>
            <Tone kind="insight" title="הרעיון">{`==${c.idea_he}==`}</Tone>
            {c.method_he && <p className="ins-line"><strong>השיטה:</strong> {c.method_he}</p>}
            {c.takeaway_he && <Tone kind="solution" title="מה לוקחים לעבודה">{c.takeaway_he}</Tone>}
            {c.urban_example_he && <p className="ins-line ins-city"><strong>לעיר:</strong> {c.urban_example_he}</p>}
            {c.bias_note && <Tone kind="problem" title="שדה הטיה">{c.bias_note}</Tone>}
            {s.card_file && <a className="src" href={REPO + s.card_file} target="_blank" rel="noreferrer">לעריכה ולאישור</a>}
          </div>
        ) : (
          <p className="dc-sub">כרטיס התובנה עוד ריק.{" "}{s.card_file && <a href={REPO + s.card_file} target="_blank" rel="noreferrer">לעריכה</a>}</p>
        )}
      </section>

      <details className="dc-sources">
        <summary>מקורות והערות</summary>
        <ul>
          <li><a href={`https://www.nobelprize.org/laureate/${s.nobel_id}`} target="_blank" rel="noreferrer">NobelPrize.org</a>: הנימוק הרשמי: <span dir="ltr">"{prize.m}"</span></li>
          <li>התרגום, תווית הגילוי, התרומה, מה שהיא נתנה וההייקו: טיוטת Claude.</li>
          {d && <li><a href={d.url} target="_blank" rel="noreferrer">Wikidata</a>: תואר מתוך רשומת ההשכלה.</li>}
          {s.image && <li>{s.image.artist}{s.image.year ? `, ${s.image.year}` : ""} · {s.image.license} · <a href={s.image.page_url} target="_blank" rel="noreferrer">Wikimedia Commons</a></li>}
          {!s.image && <li>{s.image_gap ?? "אין עדיין תמונת עבודה עם רישיון מתועד."}</li>}
          {o.ids?.map((id) => <li key={id}><a href={`https://openalex.org/${id}`} target="_blank" rel="noreferrer">OpenAlex {id}</a>{o.split ? " (פרופיל מפוצל)" : ""}</li>)}
        </ul>
      </details>
    </aside>
  );
}
