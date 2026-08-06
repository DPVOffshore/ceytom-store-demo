import raw from "./catalog.json";
import crossrefData from "./crossrefs.json";
import assemblyData from "./assemblies.json";

export const products = raw.products;
export const groups = raw.groups;
export const systems = raw.systems;
export const categories = raw.categories;

// Re-exported for convenience in server components. Client components should
// import from "@/lib/availability" and "@/lib/eta" directly — importing from
// here would pull the whole catalogue into the browser bundle.
export {
  availability,
  availabilityKey,
  availabilityRank,
  AVAILABILITY_FILTERS,
  LOW_STOCK,
  moqOf,
} from "./availability";

export const COMPANY = {
  legalName: "Ceytom Co L.L.C",
  short: "Ceytom",
  tagline: "Marine electrical control components",
  city: "Dubai",
  country: "United Arab Emirates",
  address: "Warehouse 7, Al Quoz Industrial Area 3, Dubai, UAE",
  landline: "+971 4 000 0000",
  whatsapp: "+971 50 000 0000",
  email: "sales@ceytom.ae",
  quoteEmail: "sales@ceytom.ae",
  trn: "100XXXXXXXXXXXX",
  licence: "CN-XXXXXXX",
  hours: "Mon–Sat · 08:00–18:00 GST",
  responseTime: "one business day",
  ports: ["Jebel Ali", "Port Rashid", "Hamriyah", "Fujairah Anchorage"],
};

export function getProduct(id) {
  return products.find((p) => p.id === id);
}

export function byGroup(gid) {
  return products.filter((p) => p.group === gid);
}

export function getGroup(gid) {
  return groups.find((g) => g.id === gid);
}

export function getSystem(sid) {
  return systems.find((s) => s.id === sid);
}

/** Unique sorted facet values across a product set. */
export function facetValues(list, key) {
  const set = new Set();
  for (const p of list) {
    const v = p[key];
    if (Array.isArray(v)) v.forEach((x) => set.add(String(x)));
    else if (v) set.add(String(v));
  }
  const out = [...set];
  if (key === "current") return out.sort((a, b) => parseFloat(a) - parseFloat(b));
  if (key === "voltage" || key === "holeDia" || key === "poles")
    return out.sort((a, b) => parseInt(a) - parseInt(b));
  return out.sort();
}

export const BRANDS = facetValues(products, "brand");
export const ORIGINS = facetValues(products, "origin");
export const CERTS = facetValues(products, "certifications");
export const IPS = facetValues(products, "ip");
export const HOLES = facetValues(products, "holeDia");
export const PLATES = facetValues(products, "plateSize");
export const POLES = facetValues(products, "poles");

/** Current rating buckets — procurement thinks in bands, not exact amps. */
export const CURRENT_BANDS = [
  { id: "0-10", label: "Up to 10 A", min: 0, max: 10 },
  { id: "10-25", label: "10 – 25 A", min: 10, max: 25 },
  { id: "25-63", label: "25 – 63 A", min: 25, max: 63 },
  { id: "63-125", label: "63 – 125 A", min: 63, max: 125 },
  { id: "125+", label: "Above 125 A", min: 125, max: 1e6 },
];

export const VOLTAGE_BANDS = [
  { id: "lv-dc", label: "12 – 48 V DC", test: (v) => /DC/.test(v) && parseInt(v) <= 48 },
  { id: "110", label: "110 – 130 V", test: (v) => parseInt(v) >= 110 && parseInt(v) <= 130 },
  { id: "220", label: "220 – 240 V", test: (v) => parseInt(v) >= 220 && parseInt(v) <= 240 },
  { id: "380", label: "380 V and above", test: (v) => parseInt(v) >= 380 },
];

/* ============================================================
   CROSS-REFERENCES — competitor part number → Ceytom equivalent
   ============================================================ */

export const crossrefs = crossrefData.entries;
export const CROSSREF_BRANDS = crossrefData.brands;
export const CROSSREF_DISCLAIMER = crossrefData.note;

const normalisePn = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const crossrefByPn = new Map();
for (const entry of crossrefs) {
  const key = normalisePn(entry.competitorPn);
  if (!crossrefByPn.has(key)) crossrefByPn.set(key, []);
  crossrefByPn.get(key).push(entry);
}

const crossrefByProduct = new Map();
for (const entry of crossrefs) {
  if (!crossrefByProduct.has(entry.ceytomId)) crossrefByProduct.set(entry.ceytomId, []);
  crossrefByProduct.get(entry.ceytomId).push(entry);
}

const MATCH_RANK = { direct: 0, functional: 1, consult: 2 };

/** Everything this Ceytom part is offered as a replacement for. */
export function crossrefsForProduct(id) {
  const list = crossrefByProduct.get(id) || [];
  return [...list].sort(
    (a, b) => MATCH_RANK[a.matchType] - MATCH_RANK[b.matchType] || a.competitorPn.localeCompare(b.competitorPn)
  );
}

export function crossrefsForBrand(brand) {
  return crossrefs
    .filter((e) => e.brand === brand)
    .sort((a, b) => a.competitorPn.localeCompare(b.competitorPn));
}

/** Exact hit on a competitor part number, punctuation-insensitive. */
export function crossrefExact(query) {
  return crossrefByPn.get(normalisePn(query)) || [];
}

/**
 * Competitor-part lookup for search. Exact first, then prefix — a buyer
 * half-reading a scorched nameplate types the first few characters.
 */
export function searchCrossrefs(query, limit = 5) {
  const flat = normalisePn(query);
  if (flat.length < 3) return [];
  const scored = [];
  for (const entry of crossrefs) {
    const pn = normalisePn(entry.competitorPn);
    let score = 0;
    if (pn === flat) score = 1000;
    else if (pn.startsWith(flat)) score = 700;
    else if (flat.length >= 5 && pn.includes(flat)) score = 450;
    else if (flat.length >= 4 && normalisePn(entry.brand).startsWith(flat)) score = 120;
    if (score) scored.push([score - MATCH_RANK[entry.matchType], entry]);
  }
  scored.sort((a, b) => b[0] - a[0] || a[1].competitorPn.localeCompare(b[1].competitorPn));
  return scored.slice(0, limit).map(([, entry]) => entry);
}

/** Slim payload for the client-side search box — part numbers only, no notes. */
export function crossrefSearchIndex() {
  return crossrefs.map((e) => ({
    x: e.competitorPn,
    b: e.brand,
    i: e.ceytomId,
    t: e.matchType,
  }));
}

/* ============================================================
   ASSEMBLIES — what else this part needs to work
   ============================================================ */

export const ASSEMBLY_DISCLAIMER = assemblyData.note;

/** Relations for one product, with the target resolved. Required parts first. */
export function assemblyFor(id) {
  const list = assemblyData.relations[id] || [];
  const order = { requires: 0, recommended: 1, optional: 2 };
  return list
    .map((rel) => ({ ...rel, product: rel.unlisted ? null : getProduct(rel.id) }))
    .filter((rel) => rel.unlisted || rel.product)
    .sort((a, b) => order[a.role] - order[b.role]);
}

/** The subset that must be present for the part to function at all. */
export function requiredFor(id) {
  return assemblyFor(id).filter((r) => r.role === "requires");
}

/** Slim map for the RFQ basket: line id → required relations, so the basket can
 *  flag a head with no contact block without importing the catalogue. */
export function requirementIndex() {
  const out = {};
  for (const [id, list] of Object.entries(assemblyData.relations)) {
    const required = list.filter((r) => r.role === "requires");
    if (!required.length) continue;
    out[id] = required.map((r) => {
      const target = r.unlisted ? null : getProduct(r.id);
      return {
        id: r.id,
        role: r.role,
        kind: r.kind,
        reason: r.reason,
        unlisted: !!r.unlisted,
        label: r.unlisted ? r.label : target.name,
        partNumber: r.unlisted ? null : target.partNumber,
        image: r.unlisted ? null : target.image,
        brand: r.unlisted ? null : target.brand,
      };
    });
  }
  return out;
}

/**
 * Part-number-first search. Exact match ranks first, then prefix,
 * then substring on the part number, then description terms.
 */
export function searchProducts(q, list = products, limit = 0) {
  const term = q.trim().toLowerCase();
  if (!term) return limit ? list.slice(0, limit) : list;
  const tokens = term.split(/\s+/).filter(Boolean);
  const scored = [];
  for (const p of list) {
    const pn = p.partNumber.toLowerCase();
    const pnFlat = pn.replace(/[^a-z0-9]/g, "");
    const flatTerm = term.replace(/[^a-z0-9]/g, "");
    let score = 0;
    if (pn === term || pnFlat === flatTerm) score = 1000;
    else if (pn.startsWith(term) || pnFlat.startsWith(flatTerm)) score = 700;
    else if (pn.includes(term) || pnFlat.includes(flatTerm)) score = 500;
    else {
      const hay = `${p.name} ${p.description} ${p.category} ${p.brand}`.toLowerCase();
      const hits = tokens.filter((t) => hay.includes(t)).length;
      if (hits === tokens.length) score = 200 + hits;
      else if (hits > 0) score = 40 * hits;
    }
    if (score > 0) scored.push([score, p]);
  }

  // A buyer holding a dead Telemecanique part types its number, not ours. If
  // nothing in the catalogue answers, resolve it through the cross-reference
  // table so the search still lands on something.
  if (!scored.length) {
    for (const entry of searchCrossrefs(term, 8)) {
      const p = getProduct(entry.ceytomId);
      if (p && list.includes(p) && !scored.some(([, x]) => x.id === p.id))
        scored.push([900 - MATCH_RANK[entry.matchType], p]);
    }
  }

  scored.sort((a, b) => b[0] - a[0] || a[1].partNumber.localeCompare(b[1].partNumber));
  const out = scored.map((s) => s[1]);
  return limit ? out.slice(0, limit) : out;
}

/** Match a pasted/uploaded parts list against the catalog. */
export function matchPartsList(text) {
  const lines = text
    .split(/[\n,;]+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const index = new Map();
  for (const p of products) index.set(p.partNumber.toLowerCase().replace(/[^a-z0-9]/g, ""), p);

  const matched = [];
  const unmatched = [];
  for (const line of lines) {
    // tolerate "PN x 4", "PN  4", "4 x PN"
    const m = line.match(/^(.*?)[\s\u00d7xX*]{1,3}(\d{1,4})$/) || null;
    let pnPart = line;
    let qty = 1;
    if (m && m[1].trim()) {
      pnPart = m[1].trim();
      qty = parseInt(m[2], 10);
    }
    const key = pnPart.toLowerCase().replace(/[^a-z0-9]/g, "");
    const hit = index.get(key);
    if (hit) {
      matched.push({ product: hit, qty, raw: line });
      continue;
    }
    // fall through to the competitor cross-reference table before giving up
    const [xref] = crossrefExact(pnPart);
    const substitute = xref ? getProduct(xref.ceytomId) : null;
    if (substitute) matched.push({ product: substitute, qty, raw: line, crossref: xref });
    else unmatched.push({ raw: line, query: pnPart, qty });
  }
  return { matched, unmatched };
}

export function relatedProducts(p, n = 4) {
  return products
    .filter((x) => x.id !== p.id && x.category === p.category)
    .slice(0, n);
}
