import { useEffect, useState } from "react";
// ניתוב hash: הכתובת נושאת דף ופרמטרים, כך שהעתקת קישור שומרת את המצב.
export type Route = { page: string; params: Record<string, string> };
const parse = (): Route => {
  const [path, query = ""] = window.location.hash.replace(/^#\/?/, "").split("?");
  return { page: path || "home", params: Object.fromEntries(new URLSearchParams(query)) };
};
export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}
export const href = (page: string, params?: Record<string, string | undefined>) => {
  const clean = Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== "")) as Record<string, string>;
  const q = Object.keys(clean).length ? "?" + new URLSearchParams(clean).toString() : "";
  return page === "home" ? "#/" : `#/${page}${q}`;
};
export const go = (page: string, params?: Record<string, string | undefined>) => { window.location.hash = href(page, params); };
