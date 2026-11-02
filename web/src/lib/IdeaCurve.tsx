import { area, curveMonotoneX, line } from "d3-shape";
import { scaleLinear } from "d3-scale";

/** עקומת חיי רעיון: כמה עבודות ציטטו את המאמרים המובילים בכל שנה. קו זהב בשנת הפרס. */
export default function IdeaCurve({ curve, prize, until, color, w, h, from = 1875, to = 2025 }: {
  curve: [number, number][]; prize: number; until?: number; color: string; w: number; h: number; from?: number; to?: number;
}) {
  const x = scaleLinear().domain([from, to]).range([2, w - 2]);
  const max = Math.max(1, ...curve.map((d) => d[1]));
  const y = scaleLinear().domain([0, max]).range([h - 2, 3]);
  const pts = curve.filter((d) => until == null || d[0] <= until);
  const a = area<[number, number]>().x((d) => x(d[0])).y0(h - 2).y1((d) => y(d[1])).curve(curveMonotoneX)(pts) ?? "";
  const l = line<[number, number]>().x((d) => x(d[0])).y((d) => y(d[1])).curve(curveMonotoneX)(pts) ?? "";
  const shown = until == null || prize <= until;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="idea-curve" aria-hidden="true" style={{ direction: "ltr" }}>
      <line x1={2} x2={w - 2} y1={h - 2} y2={h - 2} stroke="#1B1A17" strokeOpacity=".15" />
      <path d={a} fill={color} fillOpacity=".18" />
      <path d={l} fill="none" stroke={color} strokeWidth="1.5" />
      {shown && <line x1={x(prize)} x2={x(prize)} y1={1} y2={h - 1} stroke="#B08A2E" strokeWidth="2" />}
    </svg>
  );
}
