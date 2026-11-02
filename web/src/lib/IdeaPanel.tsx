import { FIELD, Model, NOBEL_TO_OA, OA_FIELD_HE, nameHe } from "./data";
import IdeaCurve from "./IdeaCurve";
import LaureateLine from "./Laureate";
import Rich from "./Rich";
import { go } from "./route";

/** חלונית רעיון: הגילוי, עקומת החיים, מי משתמש בו ואיך (עבודות אמיתיות), והקשרים לזוכים אחרים. */
export default function IdeaPanel({ m, id, onClose, focusField }: { m: Model; id: string; onClose: () => void; focusField?: string | null }) {
  const s = m.selected.find((x) => x.nobel_id === id);
  if (!s) return null;
  const o = s.openalex;
  const prize = m.prizesOf.get(id)!.find((p) => p.y === s.year)!;
  const home = NOBEL_TO_OA[s.field];
  const fields = o.fields ?? [];
  const tot = fields.reduce((a, f) => a + f[1], 0);
  const outside = fields.filter((f) => !home.includes(f[0]));
  const outShare = tot ? outside.reduce((a, f) => a + f[1], 0) / tot : 0;
  const order = focusField ? [...fields].sort((a, b) => (a[0] === focusField ? -1 : b[0] === focusField ? 1 : 0)) : fields;
  const cites = m.cites.filter((c) => c.s === id || c.t === id);
  return (
    <div className="stack rise idea-panel" key={id} style={{ ["--c" as string]: FIELD[s.field].color }}>
      <div className="aside-ops"><span className="label">הרעיון שנבחר</span><button className="press icon-btn" onClick={onClose} aria-label="סגירה" title="חזרה">×</button></div>
      <LaureateLine m={m} p={prize} onName={() => go("people", { id })} />
      {o.curve && o.curve.length > 0 && (
        <div>
          <div className="label">עבודות מצטטות בכל שנה. קו זהב: הפרס</div>
          <IdeaCurve curve={o.curve} prize={s.year} color={FIELD[s.field].color} w={320} h={60} from={Math.min(o.curve[0][0], s.year - 5)} />
        </div>
      )}
      {tot > 0 && <Rich as="p">{`**${Math.round(outShare * 100)}%** מהעבודות שמצטטות את ${nameHe(m.byId.get(id))} הן מחוץ לתחום הפרס.`}</Rich>}
      {order.slice(0, 5).map(([f, n]) => {
        const ex = o.examples?.[f] ?? [];
        const out = !home.includes(f);
        return (
          <div key={f} className={`use-field${out ? " out" : ""}${focusField === f ? " on" : ""}`}>
            <div className="use-field-head"><strong>{OA_FIELD_HE[f] ?? f}</strong><span className="num">{Math.round((n / tot) * 100)}%</span>{out && <span className="use-out">מחוץ לתחום</span>}</div>
            {ex.length > 0 ? ex.slice(0, 3).map((w) => (
              <div key={w.title} className="use-ex">
                <span className="num">{w.y}</span>
                {w.doi ? <a href={w.doi} target="_blank" rel="noreferrer" dir="auto">{w.title}</a> : <span dir="auto">{w.title}</span>}
              </div>
            )) : <span className="dc-sub">דוגמאות ייאספו באיסוף הבא של OpenAlex.</span>}
          </div>
        );
      })}
      {cites.length > 0 && <div className="label">קשרים לזוכים נבחרים אחרים</div>}
      {cites.map((c) => (
        <div key={c.s + c.t} className="cite-body">
          <Rich as="p">{`**${nameHe(m.byId.get(c.s))}** מצטט/ת את **${nameHe(m.byId.get(c.t))}** ב-${c.n} עבודות.`}</Rich>
          {c.title && <div className="cite-title">{c.title}</div>}
          {c.why && <Rich as="p">{c.why}</Rich>}
        </div>
      ))}
      <p className="src">עבודות מצטטות: OpenAlex, לפי תחום המחקר הראשי של כל עבודה. הדוגמאות הן העבודות המצוטטות ביותר בכל תחום.</p>
    </div>
  );
}
