import { SortHead, useSort } from "../lib/sort";
import { FIELD, Model } from "../lib/data";
import Rich from "../lib/Rich";
import { Src, Tone } from "../lib/ui";

const STATUS: Record<string, string> = { match: "תואם", match_year: "תואם בשנה (תאריך חלקי ב-API)", mismatch: "פער", no_api_date: "אין תאריך ב-API", no_wikidata_date: "אין תאריך ב-Wikidata" };

export default function Quality({ m }: { m: Model }) {
  const q = m.quality;
  type QF = (typeof q.fields)[number]; type MM = (typeof q.mismatches)[number];
  const { sorted: qf, s: sf, toggle: tf } = useSort(q.fields, { f: (r: QF) => FIELD[r.f].he, p: (r: QF) => r.api_prizes, l: (r: QF) => r.api_laureates }, { key: "p", dir: "desc" });
  const { sorted: mism, s: sm, toggle: tm } = useSort(q.mismatches, { en: (r: MM) => r.en, api: (r: MM) => r.api }, { key: "en", dir: "asc" });
  const ok = q.fields.every((f) => f.api_prizes === f.spec_prizes && f.api_laureates === f.spec_laureates);
  const total = Object.values(q.birth).reduce((a, b) => a + b, 0);
  return (
    <div className="focus-aside">
      <div className="screen" style={{ gridTemplateRows: "auto minmax(0,1fr)" }}>
        <div className="screen-head">
          <div>
            <Rich as="h1" className="insight-line">{ok ? "הספירות תואמות בכל **6** התחומים." : "יש פער בספירות. לבדוק."}</Rich>
            <p className="explain">נבדק אוטומטית בכל בנייה, מול ערכי ה-SPEC. <span className="label">Nobel {m.meta.nobel_snapshot} · Wikidata {m.meta.wikidata_snapshot}</span></p>
          </div>
        </div>
        <div className="quality-grid">
          <div className="panel panel-pad scroll-in">
            <div className="label">ספירות לפי תחום</div>
            <table className="qt">
              <thead><tr><th><SortHead k="f" s={sf} toggle={tf}>תחום</SortHead></th><th><SortHead k="p" s={sf} toggle={tf}>פרסים</SortHead></th><th>SPEC</th><th><SortHead k="l" s={sf} toggle={tf}>זוכים</SortHead></th><th>SPEC</th><th>מצב</th></tr></thead>
              <tbody>{qf.map((f) => {
                const good = f.api_prizes === f.spec_prizes && f.api_laureates === f.spec_laureates;
                return (<tr key={f.f}><td style={{ color: FIELD[f.f].color, fontWeight: 600 }}>{FIELD[f.f].he}</td>
                  <td className="num">{f.api_prizes}</td><td className="num muted">{f.spec_prizes}</td>
                  <td className="num">{f.api_laureates}</td><td className="num muted">{f.spec_laureates}</td>
                  <td className={good ? "ok" : "bad"}>{good ? "תואם" : "פער"}</td></tr>);
              })}</tbody>
            </table>
            <p className="src">זוכים = צמדי זוכה-פרס. סך הכול <bdi className="num">{m.people.length}</bdi> זוכים ייחודיים ו-<bdi className="num">{m.prizes.length}</bdi> צמדים. ערכי ה-SPEC עצמם לא אומתו מול עמודי NobelPrize.org.</p>
            <div className="label" style={{ marginTop: 16 }}>תאריך לידה: API מול Wikidata</div>
            <div className="stackbar">
              {Object.entries(q.birth).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
                <i key={k} className={`sb-${k}`} style={{ flex: n }} title={`${STATUS[k] ?? k}: ${n}`} />
              ))}
            </div>
            <div className="legend">{Object.entries(q.birth).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
              <span key={k}><i className={`sb-${k}`} />{STATUS[k] ?? k} <bdi className="num">{n}</bdi></span>))}</div>
            <p className="src"><bdi className="num">{Math.round(((q.birth.match ?? 0) + (q.birth.match_year ?? 0)) / total * 100)}%</bdi> תואמים. פער מסומן ולא מתוקן, לפי תנאי השימוש של ה-API.</p>
          </div>
          <div className="panel panel-pad scroll-in">
            <div className="label">פערי תאריך לידה: <bdi className="num">{q.mismatches.length}</bdi></div>
            <table className="qt">
              <thead><tr><th><SortHead k="en" s={sm} toggle={tm}>זוכה</SortHead></th><th><SortHead k="api" s={sm} toggle={tm}>API</SortHead></th><th>Wikidata</th></tr></thead>
              <tbody>{mism.map((x) => (
                <tr key={x.id}><td dir="ltr" style={{ textAlign: "right" }}>{x.en}</td><td className="num">{x.api}</td><td className="num">{x.wd.split("|").map((d) => d.slice(0, 10)).join(", ")}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
      <aside className="panel panel-pad scroll-in stack">
        <Tone kind="solution" title="על מה הכלי נשען">{"**Nobel Prize API v2.1**: מקור רשמי, CC0.\n**Wikidata**: העשרה בלבד, CC0.\nמזהה צולב: nobel_id ↔ QID מתוך ה-API, בלי התאמת שמות."}</Tone>
        <Tone kind="insight" title="איך הוא מודד את עצמו">{"==כל בנייה מריצה בדיקות==: ספירות מול ה-SPEC, מזהים צולבים ותקינות כרטיסים.\nציטוט ארוך מ-**15** מילים מכשיל את הבדיקה."}</Tone>
        <Tone kind="problem" title="מה עוד לא נבדק">{"OpenAlex ומאמרי הפרס: מחכים לאימות ידני.\nסט הזהב (**200** תאים) מחכה לענת."}</Tone>
        <Src href="https://www.nobelprize.org/about/terms-of-use-for-api-nobelprize-org-and-data-nobelprize-org/">תנאי השימוש של NobelPrize.org</Src>
      </aside>
    </div>
  );
}
