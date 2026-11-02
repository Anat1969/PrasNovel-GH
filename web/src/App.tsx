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

const TABS = [
  { page: "home", label: "בית" },
  { page: "people", label: "עשרים הזוכים" },
  { page: "time", label: "ציר זמן" },
  { page: "ideas", label: "חיי הרעיון" },
  { page: "net", label: "רשת המנחים" },
  { page: "world", label: "גלובוס" },
  { page: "quality", label: "איכות הנתונים" },
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
  const res = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return m.people.filter((p) => matches(`${p.he ?? ""} ${p.en}`, s))
      .sort((a, b) => Number(m.selIds.has(b.id)) - Number(m.selIds.has(a.id)) || (m.firstYear.get(a.id)! - m.firstYear.get(b.id)!));
  }, [q, m]);
  const target = (id: string) => (m.selIds.has(id) ? href("people", { id }) : href("world", { id }));
  return (
    <div className="search" onBlur={() => setTimeout(() => setOpen(false), 150)}>
      <input ref={input} value={q} placeholder="חיפוש זוכה" aria-label="חיפוש זוכה"
        onFocus={(e) => { e.target.select(); setOpen(true); }}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setIdx(0); }}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setQ(""); setOpen(false); }
          if (e.key === "ArrowDown") setIdx((i) => Math.min(i + 1, res.length - 1));
          if (e.key === "ArrowUp") setIdx((i) => Math.max(i - 1, 0));
          if (e.key === "Enter" && res[idx]) { window.location.hash = target(res[idx].id); setOpen(false); }
        }} />
      <button className="x" aria-label="איפוס החיפוש" onClick={() => { setQ(""); input.current?.focus(); }}>×</button>
      {open && q.trim().length >= 2 && (
        <div className="search-results" role="listbox">
          <div className="search-count"><bdi className="num">{res.length}</bdi> תוצאות{res.length ? `, מתוכן ${res.filter((p) => m.selIds.has(p.id)).length} מהנבחרים` : ""}</div>
          {res.slice(0, 12).map((p, i) => (
            <a key={p.id} href={target(p.id)} aria-selected={i === idx} onClick={() => setOpen(false)}>
              <span><strong>{nameHe(p)}</strong><span className="lat" dir="ltr">{p.en}</span></span>
              <span className="label">{m.firstYear.get(p.id)}{m.selIds.has(p.id) ? " · נבחר" : ""}</span>
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
  return (
    <div className="app-shell">
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
          : page === "ideas" ? <Ideas m={m} />
          : page === "quality" ? <Quality m={m} />
          : <Home m={m} />}
      </main>
    </div>
  );
}
export { go };
