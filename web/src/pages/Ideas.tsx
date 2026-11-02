import { useEffect, useMemo, useRef, useState } from "react";
import { FIELD, median, Model, nameHe, Selected } from "../lib/data";
import FieldGlyph from "../lib/FieldGlyph";
import IdeaCurve from "../lib/IdeaCurve";
import Rich from "../lib/Rich";
import { go } from "../lib/route";
import { useSize } from "../lib/useSize";
import YearBar from "../lib/YearBar";
import { Src, Tone, useReducedMotion } from "../lib/ui";

const FROM = 1875, TO = 2025;
const STATUS_TONE: Record<string, string> = { "אומת": "st-ok", "הערכה": "st-est", "סתירה": "st-bad", "לא קושר": "st-bad", "לא רלוונטי": "st-na", "לא נאסף": "st-na" };

type Row = { s: Selected; name: string; top: { title: string; y: number | null; c: number }; curve: [number, number][]; total: number; after: number; gap: number | null };

export default function Ideas({ m }: { m: Model }) {
  const reduced = useReducedMotion();
  const rows: Row[] = useMemo(() => m.selected
    .filter((s) => s.openalex.curve && s.openalex.curve.length && s.openalex.top?.length)
    .map((s) => {
      const curve = s.openalex.curve!;
      const total = curve.reduce((a, d) => a + d[1], 0);
      const after = curve.filter((d) => d[0] > s.year).reduce((a, d) => a + d[1], 0) / Math.max(1, total);
      const top = s.openalex.top![0];
      return { s, name: nameHe(m.byId.get(s.nobel_id)), top, curve, total, after, gap: top.y != null ? s.year - top.y : null };
    })
    .sort((a, b) => (a.top.y ?? 0) - (b.top.y ?? 0)), [m]);

  const [year, setYear] = useState(TO);
  const [playing, setPlaying] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  useEffect(() => {
    if (!playing) return;
    if (reduced) { setYear(TO); setPlaying(false); return; }
    const t = setInterval(() => setYear((y) => { if (y >= TO) { setPlaying(false); return TO; } return y + 1; }), 70);
    return () => clearInterval(t);
  }, [playing, reduced]);

  const box = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(box);
  const rowH = Math.max(30, Math.floor((h - 70) / Math.max(1, rows.length)));
  const curveW = Math.max(80, w - (window.innerWidth <= 760 ? 96 + 52 + 12 : 172 + 76 + 24) - 24);
  const sofar = rows.reduce((a, r) => a + r.curve.filter((d) => d[0] <= year).reduce((b, d) => b + d[1], 0), 0);

  const gaps = rows.map((r) => r.gap).filter((g): g is number => g != null);
  const mostlyAfter = rows.filter((r) => r.after > 0.5).length;
  const statuses = m.selected.reduce<Record<string, number>>((a, s) => ({ ...a, [s.openalex.status]: (a[s.openalex.status] ?? 0) + 1 }), {});
  const cites = [...m.cites].sort((a, b) => b.n - a.n);
  const ticks = [1900, 1925, 1950, 1975, 2000];
  const xOf = (y: number) => 2 + ((y - FROM) / (TO - FROM)) * (curveW - 4);

  return (
    <div className="focus-aside">
      <div className="screen" style={{ gridTemplateRows: "auto auto minmax(0,1fr)" }}>
        <div className="screen-head">
          <div>
            <Rich as="h1" className="insight-line">{`מהעבודה המצוטטת ביותר עד הפרס: חציון **${Math.round(median(gaps))}** שנים.`}</Rich>
            <p className="explain">
              כל שורה היא רעיון: כמה עבודות ציטטו בכל שנה את <bdi className="num">25</bdi> המאמרים המובילים של הזוכה (OpenAlex). קו זהב: שנת הפרס.{" "}
              <mark className="insight">אצל <bdi className="num">{mostlyAfter}</bdi> מתוך <bdi className="num">{rows.length}</bdi> רוב הציטוטים נרשמו אחרי הפרס.</mark>
            </p>
          </div>
        </div>
        <YearBar min={FROM} max={TO} value={year} onChange={(y) => { setPlaying(false); setYear(y); }} playing={playing}
          onPlay={() => { if (!playing && year >= TO) setYear(FROM); setPlaying(!playing); }} onReset={() => { setPlaying(false); setYear(TO); }} />
        <div className="panel fill ideas" ref={box}>
          {w > 0 && (
            <div className="idea-rows" style={{ ["--row" as string]: `${rowH}px`, ["--cw" as string]: `${curveW}px` }}>
              <div className="idea-axis" aria-hidden="true">
                <span />
                <svg width={curveW} height={16} style={{ direction: "ltr" }}>
                  {ticks.filter((t, i) => curveW > 360 || i % 2 === 0).map((t) => <text key={t} x={xOf(t)} y={12} textAnchor="middle" fontSize="10.5" fill="#77756F" fontFamily="var(--mono)">{t}</text>)}
                </svg>
                <span className="label">סה"כ</span>
              </div>
              {rows.map((r) => (
                <button key={r.s.nobel_id} className="idea-row" data-dim={hover && hover !== r.s.nobel_id ? "1" : undefined}
                  onMouseEnter={() => setHover(r.s.nobel_id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(r.s.nobel_id)} onBlur={() => setHover(null)}
                  onClick={() => go("people", { id: r.s.nobel_id })}
                  title={`${r.name} · העבודה המצוטטת ביותר: ${r.top.title} (${r.top.y ?? "?"}) · פרס ${r.s.year}`}>
                  <span className="idea-name"><FieldGlyph f={r.s.field} size={12} /><span className="idea-n">{r.name}</span><span className={`st ${STATUS_TONE[r.s.openalex.status]}`}>{r.s.openalex.status}</span></span>
                  <IdeaCurve curve={r.curve} prize={r.s.year} until={year} color={FIELD[r.s.field].color} w={curveW} h={rowH - 4} from={FROM} to={TO} />
                  <span className="num idea-total">{r.total.toLocaleString("en-US")}</span>
                </button>
              ))}
            </div>
          )}
          <div className="legend idea-legend">
            <span className="label" aria-live="polite">עד <bdi className="num">{year}</bdi>: <bdi className="num">{sofar.toLocaleString("en-US")}</bdi> עבודות מצטטות</span>
            <span><i style={{ background: "#B08A2E", borderRadius: 0, width: 3, height: 12 }} />שנת הפרס</span>
            <span><i style={{ background: "#2F5D8A", opacity: .4, borderRadius: 2 }} />עבודות מצטטות בשנה, כל שורה לפי השיא שלה</span>
            <span><span className="st st-ok">אומת</span> ORCID או שני מאמרי עוגן</span>
            <span><span className="st st-est">הערכה</span> מאמר עוגן אחד</span>
          </div>
        </div>
      </div>
      <aside className="panel panel-pad scroll-in stack">
        <div className="label">מי בונה על מי, בתוך עשרים הזוכים</div>
        {cites.length ? cites.map((c) => (
          <a key={`${c.s}-${c.t}`} className="cite-row" href={`#/people?id=${c.s}`}>
            <span><strong>{nameHe(m.byId.get(c.s))}</strong> מצטט/ת את <strong>{nameHe(m.byId.get(c.t))}</strong></span>
            <span className="cite-bar"><i style={{ width: `${(c.n / cites[0].n) * 100}%`, background: FIELD[m.selected.find((s) => s.nobel_id === c.t)!.field].color }} /></span>
            <span className="num">{c.n}</span>
          </a>
        )) : <p className="src">לא נמצאו ציטוטים ישירים בין הזוכים.</p>}
        <p className="src">מספר העבודות של הזוכה המצטט שמפנות ל-25 המאמרים המובילים של המצוטט. התחומים רחוקים זה מזה, ולכן רוב הקשרים בכלכלה.</p>
        <Tone kind="problem" title="למה לא להסיק סיבה [הערכה]">{"מספר המאמרים בעולם **גדל מאוד** לאורך המאה, ולכן כל עקומה נוטה לעלות.\nזה **דפוס**, לא הוכחה שהפרס הגביר ציטוטים."}</Tone>
        <Tone kind="insight" title="מה לוקחים">{"==רעיון חי עשרות שנים אחרי שנולד.==\nההכרה הרשמית מגיעה באמצע הדרך, לא בסופה."}</Tone>
        <div className="label">קישור לזוכים ב-OpenAlex</div>
        <div className="legend">
          {Object.entries(statuses).map(([k, v]) => <span key={k}><span className={`st ${STATUS_TONE[k]}`}>{k}</span> <bdi className="num">{v}</bdi></span>)}
        </div>
        <p className="src">הקישור עובר דרך מאמרי עוגן שנבדקו מול Crossref, לא דרך שם. ל-<bdi>ORCID</bdi> של רמון אי קחאל ב-Wikidata יש פרופיל של חוקר אחר, ולכן הוא מסומן כסתירה ולא מוצג. זוכי השלום פעלו דרך מוסדות ותנועות, וספירת ציטוטים לא מודדת אותם.</p>
        <Src href="https://github.com/Anat1969/PrasNovel-GH/blob/main/config/openalex_anchors.json">מאמרי העוגן</Src>
        <Src href="https://openalex.org">{`OpenAlex, CC0 · נאסף ${m.meta.openalex_snapshot ?? "-"}`}</Src>
      </aside>
    </div>
  );
}
