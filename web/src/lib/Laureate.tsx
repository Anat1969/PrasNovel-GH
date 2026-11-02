import { FIELD, Model, nameHe, Prize } from "./data";
import FieldGlyph from "./FieldGlyph";

/** שורת זוכה: שנה, שם, הגילוי בהדגשה, וסיבת הזכייה בעברית. שם לבד לא אומר כלום. */
export default function LaureateLine({ m, p, onName, onPick, active, compact }: {
  m: Model; p: Prize; onName?: () => void; onPick?: () => void; active?: boolean; compact?: boolean;
}) {
  const person = m.byId.get(p.id);
  const sel = m.selIds.has(p.id);
  return (
    <div className={`lline${active ? " on" : ""}${sel ? " sel" : ""}`} style={{ ["--c" as string]: FIELD[p.f].color }}
      onClick={onPick} role={onPick ? "button" : undefined} tabIndex={onPick ? 0 : undefined}
      onKeyDown={(e) => { if (onPick && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onPick(); } }}>
      <span className="num lline-year">{p.y}</span>
      <div className="lline-body">
        <div className="lline-head">
          {onName ? <button className="lline-name" onClick={(e) => { e.stopPropagation(); onName(); }} title="לכרטיס הזוכה">{nameHe(person)}</button>
            : <span className="lline-name">{nameHe(person)}</span>}
          <span className="lline-field"><FieldGlyph f={p.f} size={11} /> {FIELD[p.f].he}</span>
          {p.age != null && <span className="lline-age">גיל <bdi className="num">{p.age}</bdi></span>}
          {sel && <span className="lline-tag">נבחר</span>}
        </div>
        {p.d && <div className="lline-disc">{p.d}</div>}
        {!compact && (p.mh ? <div className="lline-why">{p.mh}</div> : <div className="lline-why" dir="ltr">{p.m}</div>)}
      </div>
    </div>
  );
}
