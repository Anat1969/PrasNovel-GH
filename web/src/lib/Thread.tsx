import { ThreadArticle } from "./data";
import { Tone } from "./ui";

/** צעד בחוט: שנה, זוכה, והצעד ברעיון. הרעיון גדול, השם קטן. */
export type Step = { y: number; who: string; step: string; onClick: () => void };

/** החוט בחלונית הצד: האבולוציה של הרעיונות בתחום, לפני רשימת השמות. */
export function Thread({ art, steps, color, onRead }: { art: ThreadArticle; steps: Step[]; color: string; onRead: () => void }) {
  return (
    <section className="thread" style={{ ["--c" as string]: color }}>
      <span className="label">האבולוציה של הרעיון</span>
      <h3 className="thread-title">{art.title}</h3>
      <ol className="thread-steps">
        {steps.map((s) => (
          <li key={s.y + s.who}>
            <button onClick={s.onClick}>
              <span className="thread-step">{s.step}</span>
              <span className="thread-who"><bdi className="num">{s.y}</bdi> · {s.who}</span>
            </button>
          </li>
        ))}
      </ol>
      <Tone kind="insight" title="החוט [הערכה]">{`==${art.insight}==`}</Tone>
      <Tone kind="solution" title="הגילוי הבא [הנחה]">{art.next}</Tone>
      <button className="press thread-read" onClick={onRead}>לכתבה המלאה ←</button>
    </section>
  );
}

/** הכתבה המלאה על האבולוציה, במסגרת המוקד (באותו מסך). */
export function ArticleView({ art, steps, color, kicker, status, onClose }:
  { art: ThreadArticle; steps: Step[]; color: string; kicker: string; status: string; onClose: () => void }) {
  return (
    <article className="panel fill evo" style={{ ["--c" as string]: color }}>
      <div className="evo-scroll">
        <div className="aside-ops"><span className="label evo-kicker">{kicker} · האבולוציה של הרעיון</span><button className="press icon-btn" onClick={onClose} aria-label="חזרה למפה">×</button></div>
        <h2 className="evo-title">{art.title}</h2>
        <p className="evo-sub">{art.sub}</p>
        <p className="evo-hook">{art.hook}</p>
        <div className="evo-body">
          <ol className="evo-steps">
            {steps.map((s, i) => (
              <li key={s.y + s.who}>
                <span className="evo-n num">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="evo-step">{s.step}</p>
                  <button className="evo-who" onClick={s.onClick}><bdi className="num">{s.y}</bdi> · {s.who}</button>
                </div>
              </li>
            ))}
          </ol>
          <div className="evo-side">
            <blockquote className="evo-insight"><span className="label">החוט [הערכה]</span>{art.insight}</blockquote>
            <div className="evo-next"><span className="label">הגילוי הבא [הנחה]</span><p>{art.next}</p></div>
            <div className="evo-city"><span className="label">לעיר</span><p>{art.city}</p></div>
            <div className="haiku">{art.haiku.map((l) => <span key={l}>{l}</span>)}</div>
            <p className="src">הזוכים והשנים: מהנתונים. הקריאה של החוט: Claude, {status === "מאושר" ? "פרשנות מאושרת" : "טיוטה לאישור"}. הגילוי הבא הוא ניסוי מחשבתי.</p>
          </div>
        </div>
      </div>
    </article>
  );
}
