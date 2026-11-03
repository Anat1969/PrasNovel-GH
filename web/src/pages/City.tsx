import { useMemo, useState } from "react";
import { FIELD, FieldCode, Model, nameHe, Selected } from "../lib/data";
import FieldGlyph from "../lib/FieldGlyph";
import LaureateLine from "../lib/Laureate";
import Rich from "../lib/Rich";
import { go } from "../lib/route";
import { SortHead, useSort } from "../lib/sort";
import { FieldChips, Tone } from "../lib/ui";

/** מה לוקחים לעיר: לכל רעיון, היישום בתכנון ובניהול עירוני. לחיצה מציגה את הכרטיס בצד. */
export default function City({ m, params }: { m: Model; params: Record<string, string> }) {
  const [fields, setFields] = useState<FieldCode[]>(() => (params.f ? (params.f.split(",") as FieldCode[]) : []));
  const [pick, setPick] = useState<string | null>(params.id ?? null);
  const rows = useMemo(() => m.selected.filter((s) => s.card.urban_example_he && (!fields.length || fields.includes(s.field))), [m, fields]);
  const { sorted, s, toggle } = useSort(rows, {
    year: (r: Selected) => r.year, name: (r: Selected) => nameHe(m.byId.get(r.nobel_id)), field: (r: Selected) => FIELD[r.field].he,
  }, { key: "year", dir: "asc" });
  const cur = m.selected.find((x) => x.nobel_id === pick);
  const prize = cur ? m.prizesOf.get(cur.nobel_id)!.find((p) => p.y === cur.year)! : null;
  const approved = m.selected.filter((x) => x.card_status === "מאושר").length;

  return (
    <div className="focus-aside">
      <div className="screen" style={{ gridTemplateRows: "auto minmax(0,1fr)" }}>
        <div className="screen-head">
          <div>
            <Rich as="h1" className="insight-line">{`**${rows.length}** רעיונות, ולכל אחד שאלה אחת: **מה העיר לוקחת מזה?**`}</Rich>
            <p className="explain">מהגילוי בשולחן המעבדה אל הרחוב, השכונה והתוכנית. <mark className="insight">היישום הוא הצעה לעבודה, לא טענה על הזוכה.</mark></p>
          </div>
          <div className="controls"><FieldChips value={fields} onChange={(f) => { setFields(f); setPick(null); go("city", { f: f.join(",") || undefined }); }} /></div>
        </div>
        <div className="panel fill city-list">
          <div className="city-head">
            <SortHead k="year" s={s} toggle={toggle}>שנה</SortHead>
            <SortHead k="name" s={s} toggle={toggle}>זוכה והגילוי</SortHead>
            <span className="label">לעיר</span>
            <SortHead k="field" s={s} toggle={toggle}>תחום</SortHead>
          </div>
          <div className="city-body">
            {sorted.map((r) => (
              <div key={r.nobel_id} role="button" tabIndex={0} className={`city-row${pick === r.nobel_id ? " on" : ""}`} style={{ ["--c" as string]: FIELD[r.field].color }}
                onClick={() => setPick(r.nobel_id)} onKeyDown={(e) => { if (e.key === "Enter") setPick(r.nobel_id); }}>
                <span className="num city-y">{r.year}</span>
                <span className="city-who">
                  <button className="lline-name" onClick={(e) => { e.stopPropagation(); go("people", { id: r.nobel_id }); }}>{nameHe(m.byId.get(r.nobel_id))}</button>
                  <span className="idea-disc">{r.discovery}</span>
                </span>
                <span className="city-use">{r.card.urban_example_he}</span>
                <span className="city-f"><FieldGlyph f={r.field} size={13} /> {FIELD[r.field].he}</span>
              </div>
            ))}
          </div>
          <div className="legend panel-legend">
            <span>לחיצה על שורה: הכרטיס המלא בצד</span>
            <span>לחיצה על שם: כרטיס הזוכה</span>
            <span><bdi className="num">{approved}</bdi> מתוך <bdi className="num">{m.selected.length}</bdi> כרטיסים אושרו</span>
          </div>
        </div>
      </div>
      <aside className="panel panel-pad scroll-in stack">
        {cur && prize ? (
          <div className="stack rise" key={cur.nobel_id}>
            <div className="aside-ops"><span className="label">הרעיון ויישומו</span><button className="press icon-btn" onClick={() => setPick(null)} aria-label="סגירה">×</button></div>
            {cur.image && <img className="aside-img" src={cur.image.thumb_url} alt={cur.image.caption_he} onError={(e) => { e.currentTarget.style.display = "none"; }} />}
            <LaureateLine m={m} p={prize} onName={() => go("people", { id: cur.nobel_id })} />
            <Tone kind="insight" title="הרעיון">{`==${cur.card.idea_he ?? ""}==`}</Tone>
            <p className="ins-line ins-city"><strong>לעיר:</strong> {cur.card.urban_example_he}</p>
            {cur.card.takeaway_he && <Tone kind="solution" title="מה לוקחים לעבודה">{cur.card.takeaway_he}</Tone>}
            {cur.card.bias_note && <Tone kind="problem" title="שדה הטיה">{cur.card.bias_note}</Tone>}
            <span className={`st ${cur.card_status === "מאושר" ? "st-ok" : "st-est"}`} style={{ justifySelf: "start" }}>{cur.card_status === "מאושר" ? "מאושר" : "טיוטה לאישור"}</span>
          </div>
        ) : (
          <>
            <Tone kind="insight" title="איך משתמשים">{"==כל רעיון גדול נבדק כאן בקנה מידה של רחוב.==\nבוחרים שורה, ורואים את הרעיון, היישום ושדה ההטיה."}</Tone>
            <Tone kind="problem" title="זהירות [הנחה]">{"היישום העירוני הוא **השאלה של ענת** לרעיון, לא מה שהזוכה טען.\nכל כרטיס הוא טיוטה עד שענת מאשרת."}</Tone>
          </>
        )}
      </aside>
    </div>
  );
}
