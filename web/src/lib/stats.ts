import { FieldCode, median, Model } from "./data";

export function stats(m: Model) {
  const persons = m.prizes.filter((p) => !m.byId.get(p.id)?.org);
  const women = persons.filter((p) => m.byId.get(p.id)?.g === "female").length;
  const ageMed = (f: FieldCode | null, from: number, to: number) =>
    median(persons.filter((p) => (!f || p.f === f) && p.y >= from && p.y <= to && p.age != null).map((p) => p.age!));
  const cont = new Map<string, number>();
  for (const p of persons) { const c = m.byId.get(p.id)?.cont; if (c) cont.set(c, (cont.get(c) ?? 0) + 1); }
  const contShare = [...cont.entries()].map(([c, n]) => ({ c, n, share: (n / persons.length) * 100 })).sort((a, b) => b.n - a.n);
  const years = m.prizes.map((p) => p.y);
  return {
    persons: persons.length, women, womenShare: (women / persons.length) * 100,
    ageMed, contShare, firstYear: Math.min(...years), lastYear: Math.max(...years),
    laureateEdges: m.edges.filter((e) => e.sn && e.tn).length,
  };
}
