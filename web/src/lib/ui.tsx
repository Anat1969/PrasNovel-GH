import { ReactNode } from "react";
import Rich from "./Rich";
import { FIELDS, FieldCode, Person } from "./data";

export function Name({ he, en, big }: { he?: string | null; en: string; big?: boolean }) {
  return (
    <span className={big ? "name big" : "name"}>
      <strong>{he || en}</strong>
      {he && he !== en ? <span className="lat" dir="ltr">{en}</span> : null}
    </span>
  );
}
export const PersonName = ({ p, big }: { p: Person; big?: boolean }) => <Name he={p.he} en={p.en} big={big} />;

export const Src = ({ href, children }: { href: string; children: ReactNode }) => (
  <span className="src">מקור: <a href={href} target="_blank" rel="noreferrer">{children}</a></span>
);

export function Tone({ kind, title, children }: { kind: "problem" | "solution" | "insight" | "neutral"; title: string; children: string }) {
  return (
    <div className={`tone tone-${kind}`}>
      <h4>{title}</h4>
      <p className="lines">{children.split("\n").map((l, i) => <Rich key={i}>{l}</Rich>)}</p>
    </div>
  );
}

/** בורר: "הכול" מאפס, לחיצה מחליפה, "+" מוסיף, לחיצה על הבחירה היחידה מחזירה ל"הכול". */
export function FieldChips({ value, onChange, fields = FIELDS.map((f) => f.code), note }:
  { value: FieldCode[]; onChange: (v: FieldCode[]) => void; fields?: FieldCode[]; note?: string }) {
  const all = value.length === 0;
  return (
    <div className="chips" role="group" aria-label="תחום">
      <button className="chip" aria-pressed={all} onClick={() => onChange([])}>הכול</button>
      {FIELDS.filter((f) => fields.includes(f.code)).map((f) => {
        const on = value.includes(f.code);
        return (
          <span className="chip-wrap" key={f.code}>
            <button className="chip" aria-pressed={on}
              onClick={() => onChange(on && value.length === 1 ? [] : [f.code])}>
              <i className="dot" style={{ background: f.color }} />{f.he}
            </button>
            {!all && (
              <button className="chip-plus" title={on ? `להסיר את ${f.he}` : `להוסיף את ${f.he}`} aria-label={on ? "הסרה" : "הוספה"}
                onClick={() => onChange(on ? value.filter((x) => x !== f.code) : [...value, f.code])}>{on ? "−" : "+"}</button>
            )}
          </span>
        );
      })}
      {note ? <span className="chip-note">{note}</span> : null}
    </div>
  );
}

export function FieldLegend({ fields = FIELDS.map((f) => f.code), extra }: { fields?: FieldCode[]; extra?: ReactNode }) {
  return (
    <div className="legend">
      {FIELDS.filter((f) => fields.includes(f.code)).map((f) => <span key={f.code}><i style={{ background: f.color }} />{f.he}</span>)}
      {extra}
    </div>
  );
}

export const Icon = {
  prev: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9 6l6 6-6 6" /></svg>,
  next: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M15 6l-6 6 6 6" /></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M6 6l12 12M18 6L6 18" /></svg>,
  play: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>,
  pause: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>,
  reset: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" /></svg>,
};

export function useReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
