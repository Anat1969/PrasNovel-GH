import { FIELD, FieldCode, Model, nameHe } from "./data";
import { href } from "./route";
import { ERAS } from "./ui";

/** כל זוכי התחום, לפי תקופה ושנה, עם נימוק הוועדה. הנבחרים מודגשים, עם התרומה בעברית. */
export default function FieldList({ m, field, until }: { m: Model; field: FieldCode; until?: number }) {
  const sel = new Map(m.selected.map((s) => [s.nobel_id, s]));
  const prizes = m.prizes.filter((p) => p.f === field && (until == null || p.y <= until)).sort((a, b) => a.y - b.y);
  const terms = m.terms?.[field] ?? [];
  return (
    <div className="fl scroll-in" style={{ ["--c" as string]: FIELD[field].color }}>
      {ERAS.map((era, i) => {
        const rows = prizes.filter((p) => p.y >= era.from && p.y <= era.to);
        if (!rows.length) return null;
        const t = terms[i]?.terms ?? [];
        return (
          <section key={era.id} className="fl-era">
            <header className="fl-era-head">
              <span className="num fl-era-years">{era.he}</span>
              <span className="label"><bdi className="num">{rows.length}</bdi> פרסים</span>
              {t.length > 0 && <span className="fl-terms" dir="ltr" title="המילים הבולטות בנימוקי הוועדה בתקופה הזו">{t.slice(0, 5).join(" · ")}</span>}
            </header>
            {rows.map((p, j) => {
              const s = sel.get(p.id);
              const person = m.byId.get(p.id);
              return (
                <a key={`${p.id}-${p.y}-${j}`} className={s ? "fl-row fl-sel" : "fl-row"} href={s ? href("people", { id: p.id }) : href("world", { id: p.id })}>
                  <span className="num fl-year">{p.y}</span>
                  <span className="fl-who">
                    <strong>{nameHe(person)}</strong>
                    {p.age != null && <span className="fl-age">גיל <bdi className="num">{p.age}</bdi></span>}
                    {s?.museum?.contribution && <span className="fl-contrib">{s.museum.contribution}</span>}
                    <span className="fl-why" dir="ltr">{p.m}</span>
                  </span>
                </a>
              );
            })}
          </section>
        );
      })}
      {!prizes.length && <p className="src">אין פרסים עד השנה שנבחרה.</p>}
    </div>
  );
}
