export type FieldCode = "physics" | "chemistry" | "medicine" | "economics" | "peace" | "literature";
export type Person = { id: string; qid: string | null; en: string; he: string | null; g: string | null; org: number;
  born: string | null; city: string | null; country: string | null; cont: string | null; lat: number | null; lon: number | null };
export type Prize = { id: string; y: number; f: FieldCode; age: number | null; p: string; m: string; mh: string | null; d: string | null };
export type Image = { file: string; page_url: string; thumb_url: string; width: number; height: number; license: string;
  license_url: string | null; artist: string; year: string | null; caption_he: string; caption_en: string; relation: string };
export type Selected = { nobel_id: string; qid: string; field: FieldCode; year: number; why_he: string; motivation_he: string | null;
  card: Record<string, string | null>; card_status: string; card_file: string | null;
  affiliations: { name: string; city: string | null; country: string | null }[];
  museum: { haiku: string[]; note: string; contribution?: string; takeaway?: string; works?: { he: string | null; orig: string; year: number }[] } | null; image: Image | null; image_gap: string | null;
  openalex: OpenAlex; degree: { he: string | null; en: string | null; by_he: string | null; by_en: string | null; year: number | null; url: string } | null;
  proposal: boolean; discovery: string | null; criterion?: string };
/** OpenAlex: status of the link and, when linked, counts, top works and the citing-works curve. */
export type OpenAlex = { status: "אומת" | "הערכה" | "סתירה" | "לא קושר" | "לא רלוונטי" | "לא נאסף"; why?: string;
  ids?: string[]; split?: boolean; snapshot?: string; evidence?: { kind: string; ref: string; ok: boolean }[];
  works?: number; cited?: number; h?: number; topic?: string | null; recent?: Record<string, number>;
  top?: { title: string; y: number | null; c: number; doi: string | null }[]; curve?: [number, number][]; curve_dropped?: number;
  fields?: [string, number][]; examples?: Record<string, { title: string; y: number | null; doi: string | null; c: number | null; topic: string | null }[]> };
export type Cite = { s: string; t: string; n: number; ev: { title: string; y: number | null; doi: string | null; refs: string | null }[];
  title?: string; why?: string; label?: string };
export type Transition = { from: { id: string; y: number }; to: { id: string; y: number }; title: string; how: string; evidence: string[] };
export type NextArticle = { title: string; subtitle: string; hook: string; lens: string; deep: string; metaphor: string;
  experts: { id: string; y: number; role: string }[]; implications: { now: string; short: string; long: string; personal: string };
  action: string[]; quote_ref: { id: string; y: number }; insight: string; haiku: string[]; image_from: string };
export type Link = { m: string; s: string; p: string };
export type EraTerms = { from: number; to: number; terms: string[] };
export type Edge = { s: string; t: string; sl: string | null; tl: string | null; sh: string | null; th: string | null;
  sn: string | null; tn: string | null; prop: string; url: string };
export type PritzkerEntry = { slug: string; y: number; he: string; en: string | null; idea: string; city: string;
  people: { qid: string; en: string | null; g: "m" | "f" | null; c: string | null; b: string | null; d: string | null; wiki: string | null }[];
  work: { qid: string; en: string | null; he: string | null; place: string | null; y: string | null; img: string | null; lic: string | null; by: string | null; page: string | null } | null };
export type Pritzker = { status: string; label: string; bias: string; source: string; snapshot: string; entries: PritzkerEntry[] };
export type Data = {
  pritzker: Pritzker | null;
  meta: Record<string, string | null>; people: Person[]; prizes: Prize[]; selected: Selected[]; edges: Edge[]; cites: Cite[];
  links: Link[]; mentor_why: string | null; mentor_props: Record<string, string> | null; terms: Record<FieldCode, EraTerms[]>; evolution: Record<FieldCode, string[]>;
  transitions: Record<FieldCode, Transition[]>;
  next: { status: string; articles: Record<FieldCode, NextArticle> } | null;
  home: { quote_en: string; quote_he: string; quote_by: string; quote_url: string; insight: string; haiku: string[]; haiku_note: string; inspiration: string } | null;
  quality: { fields: { f: FieldCode; api_prizes: number; spec_prizes: number; api_laureates: number; spec_laureates: number }[];
    birth: Record<string, number>; mismatches: { id: string; en: string; api: string; wd: string }[]; top_institutions: { name: string; n: number }[] };
};

export const FIELDS: { code: FieldCode; he: string; en: string; color: string; tone: string }[] = [
  { code: "physics", he: "פיזיקה", en: "Physics", color: "#2F5D8A", tone: "כחול־מעבדה" },
  { code: "chemistry", he: "כימיה", en: "Chemistry", color: "#2E7D6B", tone: "ירוק־מבחנה" },
  { code: "medicine", he: "רפואה", en: "Medicine", color: "#A2453D", tone: "אדום־תא" },
  { code: "economics", he: "כלכלה", en: "Economics", color: "#9A7419", tone: "זהב־מטבע" },
  { code: "peace", he: "שלום", en: "Peace", color: "#5B4B8A", tone: "סגול־אמנה" },
  { code: "literature", he: "ספרות", en: "Literature", color: "#77756F", tone: "אפור־דיו" },
];
export const FIELD = Object.fromEntries(FIELDS.map((f) => [f.code, f])) as Record<FieldCode, (typeof FIELDS)[number]>;
export const CONT_HE: Record<string, string> = { Europe: "אירופה", "North America": "צפון אמריקה", Asia: "אסיה",
  Africa: "אפריקה", Oceania: "אוקיאניה", "South America": "דרום אמריקה" };

export type Model = Data & {
  byId: Map<string, Person>; prizesOf: Map<string, Prize[]>; selIds: Set<string>; firstField: Map<string, FieldCode>;
  firstYear: Map<string, number>;
};

export async function loadData(): Promise<Model> {
  const r = await fetch("./data.json");
  if (!r.ok) throw new Error(`data.json: ${r.status}`);
  const d: Data = await r.json();
  const byId = new Map(d.people.map((p) => [p.id, p]));
  const prizesOf = new Map<string, Prize[]>();
  for (const p of d.prizes) prizesOf.set(p.id, [...(prizesOf.get(p.id) ?? []), p]);
  const firstField = new Map<string, FieldCode>();
  const firstYear = new Map<string, number>();
  for (const [id, ps] of prizesOf) {
    const f = [...ps].sort((a, b) => a.y - b.y)[0];
    firstField.set(id, f.f); firstYear.set(id, f.y);
  }
  return { ...d, byId, prizesOf, selIds: new Set(d.selected.map((s) => s.nobel_id)), firstField, firstYear };
}

export const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
export const nameHe = (p: Person | undefined) => (p ? p.he || p.en : "");

/** תחומי OpenAlex (רמת field) בעברית. */
export const OA_FIELD_HE: Record<string, string> = {
  "Agricultural and Biological Sciences": "חקלאות וביולוגיה", "Arts and Humanities": "אמנויות ומדעי הרוח",
  "Biochemistry, Genetics and Molecular Biology": "ביוכימיה וגנטיקה", "Business, Management and Accounting": "ניהול ועסקים",
  "Chemical Engineering": "הנדסה כימית", "Chemistry": "כימיה", "Computer Science": "מדעי המחשב", "Decision Sciences": "מדעי ההחלטה",
  "Earth and Planetary Sciences": "מדעי כדור הארץ", "Economics, Econometrics and Finance": "כלכלה", "Energy": "אנרגיה",
  "Engineering": "הנדסה", "Environmental Science": "מדעי הסביבה", "Immunology and Microbiology": "אימונולוגיה ומיקרוביולוגיה",
  "Materials Science": "מדע החומרים", "Mathematics": "מתמטיקה", "Medicine": "רפואה", "Neuroscience": "מדעי המוח", "Nursing": "סיעוד",
  "Pharmacology, Toxicology and Pharmaceutics": "פרמקולוגיה", "Physics and Astronomy": "פיזיקה ואסטרונומיה", "Psychology": "פסיכולוגיה",
  "Social Sciences": "מדעי החברה", "Veterinary": "וטרינריה", "Dentistry": "רפואת שיניים", "Health Professions": "מקצועות הבריאות",
};
/** איזה תחום OpenAlex מקביל לכל תחום נובל, כדי לזהות "השפעה מחוץ לתחום". */
export const NOBEL_TO_OA: Record<FieldCode, string[]> = {
  physics: ["Physics and Astronomy"], chemistry: ["Chemistry", "Chemical Engineering", "Biochemistry, Genetics and Molecular Biology"],
  medicine: ["Medicine", "Biochemistry, Genetics and Molecular Biology", "Immunology and Microbiology", "Neuroscience"],
  economics: ["Economics, Econometrics and Finance"], peace: [], literature: ["Arts and Humanities"],
};
