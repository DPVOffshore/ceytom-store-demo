import raw from "./catalog.json";

export const products = raw.products;
export const groups = raw.groups;
export const systems = raw.systems;
export const categories = raw.categories;

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
    if (hit) matched.push({ product: hit, qty, raw: line });
    else unmatched.push({ raw: line, query: pnPart, qty });
  }
  return { matched, unmatched };
}

export function relatedProducts(p, n = 4) {
  return products
    .filter((x) => x.id !== p.id && x.category === p.category)
    .slice(0, n);
}

export function stockTone(stock) {
  if (stock.startsWith("In stock")) return "text-teal";
  if (stock.startsWith("Low")) return "text-coral";
  return "text-slate/60";
}
