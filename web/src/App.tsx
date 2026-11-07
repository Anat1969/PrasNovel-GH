import { useEffect, useMemo, useRef, useState } from "react";
import { loadData, Model, nameHe } from "./lib/data";
import { go, href, useRoute } from "./lib/route";
import Home from "./pages/Home";
import People from "./pages/People";
import Time from "./pages/Time";
import Network from "./pages/Network";
import World from "./pages/World";
import Quality from "./pages/Quality";
import Ideas from "./pages/Ideas";
import Fields from "./pages/Fields";
import Cross from "./pages/Cross";
import City from "./pages/City";
import Next from "./pages/Next";
import PrintNext from "./pages/PrintNext";
import Creations from "./pages/Creations";
import PritzkerPage from "./pages/Pritzker";
import TuringPage from "./pages/Turing";

const TABS = [
  { page: "home", label: "בית" },
  { page: "people", label: "הזוכים" },
  { page: "time", label: "ציר זמן" },
  { page: "fields", label: "התפתחות" },
  { page: "ideas", label: "חיי הרעיון" },
  { page: "cross", label: "בין תחומים" },
  { page: "city", label: "לעיר" },
  { page: "next", label: "הגילוי הבא" },
  { page: "creations", label: "יצירות" },
  { page: "pritzker", label: "פריצקר" },
  { page: "turing", label: "טיורינג" },
  { page: "net", label: "מנחים" },
  { page: "world", label: "גלובוס" },
  { page: "quality", label: "איכות" },
];
const PREFIX = /^(ו|ה|ב|כ|ל|מ|ש){0,2}/;

/** התאמה בתחילת מילה, גם אחרי אותיות שימוש. מילה עד 3 אותיות חייבת להיות שלמה. */
function matches(text: string, q: string) {
  const words = text.toLowerCase().split(/[\s,.'"()\-־]+/).filter(Boolean);
  return words.some((w) => {
    const bare = w.replace(PREFIX, "");
    if (q.length <= 3) return w === q || bare === q;
    return w.startsWith(q) || bare.startsWith(q);
  });
}

function Search({ m }: { m: Model }) {
  const [q, setQ] = useState(() => sessionStorage.getItem("q") ?? "");
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { try { sessionStorage.setItem("q", q); } catch { /* ignore */ } }, [q]);
  type Hit = { key: string; title: string; en: string; sub: string; href: string; rank: number; y: number };
  const res = useMemo<Hit[]>(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const target = (id: string) => (m.selIds.has(id) ? href("people", { id }) : href("world", { id }));
    const nobel: Hit[] = m.people.filter((p) => matches(`${p.he ?? ""} ${p.en}`, s)).map((p) => ({
      key: `n${p.id}`, title: nameHe(p), en: p.en, sub: `נובל ${m.firstYear.get(p.id)}${m.selIds.has(p.id) ? " · נבחר" : ""}`,
      href: target(p.id), rank: m.selIds.has(p.id) ? 0 : 2, y: m.firstYear.get(p.id) ?? 0 }));
    const pz: Hit[] = (m.pritzker?.entries ?? []).flatMap((e) => {
      const hay = `${e.he} ${e.en ?? ""} ${e.people.map((p) => p.en ?? "").join(" ")} ${e.work?.he ?? ""} ${e.work?.en ?? ""}`;
      return matches(hay, s) ? [{ key: `p${e.slug}`, title: e.he, en: e.work?.he ?? e.work?.en ?? "", sub: `פריצקר ${e.y}`, href: href("pritzker", { id: e.slug }), rank: 1, y: e.y }] : [];
    });
    const tu: Hit[] = (m.turing?.entries ?? []).flatMap((e) => {
      const hay = `${e.he} ${e.people.map((p) => p.en ?? "").join(" ")}`;
      return matches(hay, s) ? [{ key: `t${e.slug}`, title: e.he, en: e.people.map((p) => p.en).join(", "), sub: `טיורינג ${e.y}`, href: href("turing", { id: e.slug }), rank: 1, y: e.y }] : [];
    });
    return [...nobel, ...pz, ...tu].sort((a, b) => a.rank - b.rank || a.y - b.y);
  }, [q, m]);
  return (
    <div className="search" onBlur={() => setTimeout(() => setOpen(false), 150)}>
      <input ref={input} value={q} placeholder="חיפוש: זוכה, אדריכל, בניין" aria-label="חיפוש זוכה, אדריכל או בניין"
        onFocus={(e) => { e.target.select(); setOpen(true); }}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setIdx(0); }}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setQ(""); setOpen(false); }
          if (e.key === "ArrowDown") setIdx((i) => Math.min(i + 1, res.length - 1));
          if (e.key === "ArrowUp") setIdx((i) => Math.max(i - 1, 0));
          if (e.key === "Enter" && res[idx]) { window.location.hash = res[idx].href; setOpen(false); }
        }} />
      <button className="x" aria-label="איפוס החיפוש" onClick={() => { setQ(""); input.current?.focus(); }}>×</button>
      {open && q.trim().length >= 2 && (
        <div className="search-results" role="listbox">
          <div className="search-count"><bdi className="num">{res.length}</bdi> תוצאות: נובל, פריצקר וטיורינג</div>
          {res.slice(0, 14).map((h, i) => (
            <a key={h.key} href={h.href} aria-selected={i === idx} onClick={() => setOpen(false)}>
              <span><strong>{h.title}</strong>{h.en && <span className="lat" dir="ltr">{h.en}</span>}</span>
              <span className="label">{h.sub}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const route = useRoute();
  const [m, setM] = useState<Model | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { loadData().then(setM).catch((e) => setErr(String(e))); }, []);
  useEffect(() => {
    const t = TABS.find((x) => x.page === route.page)?.label;
    document.title = t && t !== "בית" ? `${t} · גמד על כתפי ענקים` : "גמד על כתפי ענקים";
  }, [route.page]);
  const page = TABS.some((t) => t.page === route.page) ? route.page : "home";
  if (route.page === "print") return m ? <PrintNext m={m} params={route.params} /> : <div className="empty">{err ?? "טוען..."}</div>;
  return (
    <div className={`app-shell${page === "creations" ? " page-creations" : ""}`}>
      <header className="topbar">
        <div className="topbar-in">
          <a className="brand" href="#/" aria-label="דף הבית"><img src="./icon.svg" alt="" /><span>גמד על כתפי ענקים</span></a>
          <nav className="tabs" aria-label="ניווט">
            {TABS.map((t) => <a key={t.page} className="tab" href={href(t.page)} aria-current={page === t.page ? "page" : undefined}>{t.label}</a>)}
          </nav>
          {m ? <Search m={m} /> : <span />}
          <ai-menu chat="https://claude.ai/code/session_018qeN19GqF7DmqAbTa4J48a"></ai-menu>
        </div>
      </header>
      <main className="app-main" key={page}>
        {err ? <div className="empty"><div><h2>הנתונים לא נטענו</h2><p>{err}</p><p>הריצו <code>make web</code> כדי לייצא את data.json, ורעננו.</p></div></div>
          : !m ? <div className="empty">טוען 125 שנות פרס...</div>
          : page === "people" ? <People m={m} params={route.params} />
          : page === "time" ? <Time m={m} params={route.params} />
          : page === "net" ? <Network m={m} params={route.params} />
          : page === "world" ? <World m={m} params={route.params} />
          : page === "fields" ? <Fields m={m} params={route.params} />
          : page === "city" ? <City m={m} params={route.params} />
          : page === "next" ? <Next m={m} params={route.params} />
          : page === "cross" ? <Cross m={m} params={route.params} />
          : page === "ideas" ? <Ideas m={m} params={route.params} />
          : page === "quality" ? <Quality m={m} />
          : page === "creations" ? <Creations />
          : page === "pritzker" ? <PritzkerPage m={m} params={route.params} />
          : page === "turing" ? <TuringPage m={m} params={route.params} />
          : <Home m={m} />}
      </main>
    </div>
  );
}
export { go };
