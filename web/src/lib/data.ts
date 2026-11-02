export type FieldCode = "physics" | "chemistry" | "medicine" | "economics" | "peace" | "literature";
export type Person = { id: string; qid: string | null; en: string; he: string | null; g: string | null; org: number;
  born: string | null; city: string | null; country: string | null; cont: string | null; lat: number | null; lon: number | null };
export type Prize = { id: string; y: number; f: FieldCode; age: number | null; p: string; m: string };
export type Image = { file: string; page_url: string; thumb_url: string; width: number; height: number; license: string;
  license_url: string | null; artist: string; year: string | null; caption_he: string; caption_en: string; relation: string };
export type Selected = { nobel_id: string; qid: string; field: FieldCode; year: number; why_he: string; motivation_he: string | null;
  card: Record<string, string | null>; card_status: string; card_file: string | null;
  affiliations: { name: string; city: string | null; country: string | null }[];
  museum: { haiku: string[]; note: string } | null; image: Image | null; image_gap: string | null };
export type Edge = { s: string; t: string; sl: string | null; tl: string | null; sh: string | null; th: string | null;
  sn: string | null; tn: string | null; prop: string; url: string };
export type Data = {
  meta: Record<string, string | null>; people: Person[]; prizes: Prize[]; selected: Selected[]; edges: Edge[];
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
