import { useEffect, useRef, useState } from "react";
import { geoDistance, geoGraticule10, geoNaturalEarth1, geoOrthographic, geoPath, GeoPermissibleObjects, GeoProjection } from "d3-geo";
import { feature } from "topojson-client";
import { useReducedMotion } from "./ui";

export type GlobePoint = { id: string; lat: number; lon: number; color: string; big?: boolean; label: string };

let landCache: Promise<GeoPermissibleObjects> | null = null;
const loadLand = () =>
  (landCache ??= fetch("./land-110m.json").then((r) => r.json()).then((t) => feature(t, t.objects.land) as unknown as GeoPermissibleObjects));

/** הטלה: כדור (אורתוגרפי) או מפה שטוחה (Natural Earth), שבה כל הנקודות גלויות יחד. */
function makeProj(flat: boolean, w: number, h: number, rot: [number, number], k = 1, pan: [number, number] = [0, 0]): GeoProjection {
  if (flat) {
    const p = geoNaturalEarth1().rotate([rot[0], 0, 0]).fitExtent([[8, 8], [w - 8, h - 8]], { type: "Sphere" });
    const [tx, ty] = p.translate();
    return p.scale(p.scale() * k).translate([w / 2 + (tx - w / 2) * k + pan[0], h / 2 + (ty - h / 2) * k + pan[1]]);
  }
  const r = (Math.min(w, h) / 2 - 6) * k;
  return geoOrthographic().scale(r).translate([w / 2, h / 2]).rotate([rot[0], rot[1], 0]).clipAngle(90);
}

/** גלובוס מסתובב או מפה שטוחה. כל נקודה לחיצה. גרירה מסובבת, ריחוף מציג שם. */
export default function Globe({ points, onPick, focus, spin = true, height, flat = false }: {
  points: GlobePoint[]; onPick?: (id: string) => void; focus?: string | null; spin?: boolean; height?: number | string; flat?: boolean;
}) {
  const flatRef = useRef(flat); flatRef.current = flat;
  const zoom = useRef(1);
  const pan = useRef<[number, number]>([0, 0]);
  const [zoomShown, setZoomShown] = useState(1);
  const setZoom = (k: number) => { zoom.current = Math.max(1, Math.min(8, k)); if (zoom.current === 1) pan.current = [0, 0]; setZoomShown(zoom.current); };
  useEffect(() => { pan.current = [0, 0]; }, [flat]);
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [land, setLand] = useState<GeoPermissibleObjects | null>(null);
  const [hover, setHover] = useState<{ p: GlobePoint; x: number; y: number } | null>(null);
  const rot = useRef<[number, number]>([-20, -25]);
  const drag = useRef<{ x: number; y: number; r: [number, number] } | null>(null);
  const size = useRef({ w: 300, h: 300 });
  const reduced = useReducedMotion();
  const pointsRef = useRef(points); pointsRef.current = points;
  const focusRef = useRef(focus); focusRef.current = focus;

  useEffect(() => { loadLand().then(setLand).catch(() => setLand(null)); }, []);

  // סיבוב אל הנקודה שבפוקוס
  useEffect(() => {
    const p = points.find((q) => q.id === focus);
    if (!p) return;
    const target: [number, number] = [-p.lon, -Math.max(-60, Math.min(60, p.lat))];
    const start = [...rot.current] as [number, number];
    if (reduced) { rot.current = target; return; }
    let t0 = 0; let raf = 0;
    const step = (t: number) => {
      t0 ||= t; const k = Math.min(1, (t - t0) / 900); const e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      let dl = target[0] - start[0]; dl = ((dl + 540) % 360) - 180;
      rot.current = [start[0] + dl * e, start[1] + (target[1] - start[1]) * e];
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [focus, points, reduced]);

  useEffect(() => {
    const el = wrap.current!; const cv = canvas.current!;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1);
      size.current = { w: r.width, h: r.height };
      cv.width = Math.max(1, r.width * dpr); cv.height = Math.max(1, r.height * dpr);
      cv.style.width = `${r.width}px`; cv.style.height = `${r.height}px`;
      cv.getContext("2d")!.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    ro.observe(el);
    let raf = 0; let last = 0;
    const grat = geoGraticule10();
    const draw = (t: number) => {
      const dt = last ? t - last : 16; last = t;
      const isFlat = flatRef.current;
      if (spin && !isFlat && zoom.current === 1 && !reduced && !drag.current && !hover) rot.current = [rot.current[0] + dt * 0.006, rot.current[1]];
      const { w, h } = size.current; const ctx = cv.getContext("2d")!;
      const r = (isFlat ? Math.min(w / 2, h) / 2 : Math.min(w, h) / 2 - 6) * Math.sqrt(zoom.current);
      const proj = makeProj(isFlat, w, h, isFlat ? [0, 0] : rot.current, zoom.current, pan.current);
      const path = geoPath(proj, ctx);
      ctx.clearRect(0, 0, w, h);
      // כדור: עומק בצל ובגרדיאנט, מקור אור משמאל למעלה
      const g = ctx.createRadialGradient(w / 2 - r * .35, h / 2 - r * .35, r * .1, w / 2, h / 2, r);
      g.addColorStop(0, "#FFFFFF"); g.addColorStop(1, "#ECEBE6");
      ctx.save(); if (!isFlat) { ctx.shadowColor = "rgba(27,26,23,.18)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; }
      ctx.beginPath(); path({ type: "Sphere" }); ctx.fillStyle = g; ctx.fill(); ctx.restore();
      ctx.beginPath(); path(grat); ctx.strokeStyle = "rgba(27,26,23,.07)"; ctx.lineWidth = .6; ctx.stroke();
      if (land) { ctx.beginPath(); path(land); ctx.fillStyle = "#D9D6CD"; ctx.fill(); ctx.strokeStyle = "rgba(27,26,23,.25)"; ctx.lineWidth = .5; ctx.stroke(); }
      ctx.beginPath(); path({ type: "Sphere" }); ctx.strokeStyle = "rgba(27,26,23,.35)"; ctx.lineWidth = 1; ctx.stroke();
      const center: [number, number] = [-rot.current[0], -rot.current[1]];
      const pts = pointsRef.current;
      const k = Math.max(.7, r / 260);
      for (const big of [false, true]) {
        for (const p of pts) {
          if (!!p.big !== big) continue;
          if (!isFlat && geoDistance([p.lon, p.lat], center) > Math.PI / 2 - .02) continue;
          const xy = proj([p.lon, p.lat]); if (!xy) continue;
          ctx.beginPath(); ctx.arc(xy[0], xy[1], (big ? 4.2 : 2.3) * k, 0, Math.PI * 2);
          ctx.fillStyle = p.color; ctx.globalAlpha = big ? 1 : .72; ctx.fill(); ctx.globalAlpha = 1;
          if (big) { ctx.lineWidth = 2; ctx.strokeStyle = "#B08A2E"; ctx.stroke(); }
          if (p.id === focusRef.current) {
            ctx.beginPath(); ctx.arc(xy[0], xy[1], 11 * k, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.strokeStyle = "#1B1A17"; ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [land, spin, reduced, hover, flat]);

  const pick = (ev: React.PointerEvent): { p: GlobePoint; x: number; y: number } | null => {
    const rect = canvas.current!.getBoundingClientRect();
    const x = ev.clientX - rect.left, y = ev.clientY - rect.top;
    const { w, h } = size.current; const isFlat = flatRef.current;
    const proj = makeProj(isFlat, w, h, isFlat ? [0, 0] : rot.current, zoom.current, pan.current);
    const center: [number, number] = [-rot.current[0], -rot.current[1]];
    let best: GlobePoint | null = null; let bd = 10;
    for (const p of pointsRef.current) {
      if (!isFlat && geoDistance([p.lon, p.lat], center) > Math.PI / 2) continue;
      const xy = proj([p.lon, p.lat]); if (!xy) continue;
      const d = Math.hypot(xy[0] - x, xy[1] - y) - (p.big ? 3 : 0);
      if (d < bd) { bd = d; best = p; }
    }
    return best ? { p: best, x, y } : null;
  };

  return (
    <div ref={wrap} className="globe" style={{ position: "relative", width: "100%", height: height ?? "100%", touchAction: "none" }}>
      <canvas ref={canvas} role="img" aria-label={flat ? "מפה של מקומות הלידה של הזוכים" : "גלובוס של מקומות הלידה של הזוכים"}
        style={{ display: "block", cursor: hover ? "pointer" : drag.current ? "grabbing" : "grab" }}
        onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, r: flatRef.current ? [...pan.current] as [number, number] : [...rot.current] as [number, number] }; (e.target as Element).setPointerCapture(e.pointerId); }}
        onWheel={(e) => { setZoom(zoom.current * (e.deltaY < 0 ? 1.2 : 1 / 1.2)); }}
        onPointerMove={(e) => {
          if (drag.current && flatRef.current) {
            const d = drag.current;
            if (zoom.current > 1) pan.current = [d.r[0] + (e.clientX - d.x), d.r[1] + (e.clientY - d.y)];
          } else if (drag.current) {
            const d = drag.current; const s = .35 / zoom.current;
            rot.current = [d.r[0] + (e.clientX - d.x) * s, Math.max(-80, Math.min(80, d.r[1] - (e.clientY - d.y) * s))];
          } else setHover(pick(e));
        }}
        onPointerUp={(e) => {
          const d = drag.current; drag.current = null;
          if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 4) { const h = pick(e); if (h && onPick) onPick(h.p.id); }
        }}
        onPointerLeave={() => setHover(null)} />
      <div className="zoom-ctl" role="group" aria-label="זום">
        <button className="press icon-btn" onClick={() => setZoom(zoom.current * 1.5)} title="התקרבות" aria-label="התקרבות">+</button>
        <button className="press icon-btn" onClick={() => setZoom(zoom.current / 1.5)} disabled={zoomShown <= 1} title="התרחקות" aria-label="התרחקות">−</button>
        {zoomShown > 1 && <button className="press icon-btn" onClick={() => setZoom(1)} title="חזרה לתצוגה המלאה" aria-label="איפוס זום">⟲</button>}
      </div>
      {hover && (
        <div className="globe-tip" style={{ position: "absolute", left: hover.x + 12, top: hover.y - 10, pointerEvents: "none" }}>
          {hover.p.label}
        </div>
      )}
    </div>
  );
}
