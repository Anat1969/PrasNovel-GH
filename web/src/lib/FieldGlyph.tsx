import { FIELD, FieldCode } from "./data";
// סט אייקוני קו לנושאים: קו אחד בעובי 1.75, 24×24, בצבע הנושא. משמש גם כאיור כשאין תמונת עבודה.
const PATHS: Record<FieldCode, string> = {
  physics: "M12 12m-1.6 0a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M3 12c0-2.2 4-4 9-4s9 1.8 9 4-4 4-9 4-9-1.8-9-4zM7.5 4.2c1.9-1.1 5.6 1.3 8.1 5.6s2.9 8.7.9 9.9-5.6-1.3-8.1-5.6-2.9-8.7-.9-9.9z",
  chemistry: "M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9zM12 7.5l3.9 2.25v4.5L12 16.5l-3.9-2.25v-4.5z",
  medicine: "M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0 -16 0M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M6 7l1.5 1.5M17 16l1.5 1.5",
  economics: "M3 20h18M5 16l4-5 4 3 6-8M15 6h4v4",
  peace: "M5 19c6-1 11-6 13-14M9 15c-2 0-3.5-1.5-3.5-3.5 2 0 3.5 1.5 3.5 3.5zM13 11c-2 0-3.5-1.5-3.5-3.5 2 0 3.5 1.5 3.5 3.5zM12 15c0-2 1.5-3.5 3.5-3.5 0 2-1.5 3.5-3.5 3.5z",
  literature: "M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1zM12 6v14",
};
export default function FieldGlyph({ f, size = 24 }: { f: FieldCode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={FIELD[f].color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[f]} />
    </svg>
  );
}
