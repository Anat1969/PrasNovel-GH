import { useMemo, useState } from "react";

export type SortState<K extends string> = { key: K; dir: "asc" | "desc" };

/** מיון לפי עמודה: לחיצה ראשונה בוחרת עמודה, לחיצה נוספת הופכת כיוון. */
type Getters<T> = Record<string, (r: T) => number | string | null | undefined>;
export function useSort<T, G extends Getters<T>>(rows: T[], get: G, init: SortState<keyof G & string>) {
  type K = keyof G & string;
  const [s, setS] = useState<SortState<K>>(init);
  const sorted = useMemo(() => {
    const f = get[s.key];
    return [...rows].sort((a, b) => {
      const x = f(a), y = f(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "he");
      return s.dir === "asc" ? c : -c;
    });
  }, [rows, s]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (key: K) => setS((p) => (p.key === key ? { key, dir: p.dir === "asc" ? "desc" : "asc" } : { key, dir: rows.length && typeof get[key](rows[0]) === "number" ? "desc" : "asc" }));
  return { sorted, s, toggle };
}

/** כותרת עמודה ממיינת. */
export function SortHead<K extends string>({ k, s, toggle, children, className }: { k: K; s: SortState<K>; toggle: (k: K) => void; children: React.ReactNode; className?: string }) {
  const on = s.key === k;
  return (
    <button className={`sort-head${on ? " on" : ""}${className ? " " + className : ""}`} onClick={() => toggle(k)}
      aria-sort={on ? (s.dir === "asc" ? "ascending" : "descending") : "none"} title="מיון: לחיצה נוספת הופכת כיוון">
      {children}<span className="sort-arrow" aria-hidden="true">{on ? (s.dir === "asc" ? "▲" : "▼") : "↕"}</span>
    </button>
  );
}
