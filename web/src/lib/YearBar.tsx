import { Icon } from "./ui";
/** סרגל שנה: השנים רצות לאורכו, והשנה הנוכחית צפה מעל הידית. */
export default function YearBar({ min, max, value, onChange, playing, onPlay, onReset, label = "שנה" }: {
  min: number; max: number; value: number; onChange: (y: number) => void; playing: boolean; onPlay: () => void; onReset: () => void; label?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const ticks = [];
  for (let y = Math.ceil(min / 25) * 25; y <= max; y += 25) ticks.push(y);
  return (
    <div className="yearbar">
      <button className="press icon-btn" onClick={onPlay} title={playing ? "עצירה" : "הפעלה: השנים רצות"} aria-label={playing ? "עצירה" : "הפעלה"} aria-pressed={playing}>
        {playing ? Icon.pause : Icon.play}
      </button>
      <button className="press icon-btn" onClick={onReset} title="איפוס לכל הציר" aria-label="איפוס">{Icon.reset}</button>
      <div className="yb-track" dir="ltr">
        <span className="yb-float num" style={{ left: `${pct}%` }}>{value}</span>
        <input type="range" min={min} max={max} value={value} aria-label={label} onChange={(e) => onChange(+e.target.value)} />
        <div className="yb-ticks">{ticks.map((t) => <span key={t} style={{ left: `${((t - min) / (max - min)) * 100}%` }}>{t}</span>)}</div>
      </div>
    </div>
  );
}
