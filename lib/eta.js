/**
 * Vessel-ETA arithmetic.
 *
 * A superintendent will not accept a bare verdict, so every result carries the
 * working: how much is on the shelf, how long the balance takes, how long the
 * freight takes, and how that lands against the sailing date. The UI prints
 * those steps next to the verdict.
 *
 * Calendar days throughout — deliberately. Working-day arithmetic would be more
 * accurate and far less checkable by eye, and the demo data is synthetic anyway.
 *
 * No JSON import — this is pulled into client components.
 */

export const DESTINATIONS = [
  { id: "uae", label: "UAE — to vessel, berth or address", short: "UAE", transitDays: 1 },
  { id: "gcc", label: "GCC — Saudi, Oman, Qatar, Kuwait, Bahrain", short: "GCC", transitDays: 3 },
  { id: "intl", label: "International — air freight", short: "International", transitDays: 7 },
];

export const DEFAULT_DESTINATION = "uae";

/** Days of slack below which a line is called tight rather than safe. */
export const TIGHT_MARGIN_DAYS = 2;

/** Fallback when a zero-stock line has no lead time recorded. */
const ASSUMED_LEAD_DAYS = 21;

const UAE_TERMS = [
  "uae", "united arab", "dubai", "jebel ali", "port rashid", "hamriyah", "fujairah",
  "abu dhabi", "sharjah", "ajman", "khor fakkan", "khalifa port", "mina zayed",
  "mina rashid", "ras al khaimah", "umm al quwain", "ruwais", "jafza", "dxb",
];

const GCC_TERMS = [
  "saudi", "ksa", "dammam", "jubail", "jeddah", "yanbu", "king abdullah port",
  "oman", "muscat", "sohar", "salalah", "duqm", "qatar", "doha", "hamad port",
  "kuwait", "shuwaikh", "shuaiba", "bahrain", "manama", "khalifa bin salman",
];

/**
 * Guess the freight band from whatever the buyer typed into the delivery-port
 * field. Always overridable in the UI — the guess is a starting point, not a
 * decision, and an unrecognised port falls back to international rather than
 * flattering the estimate.
 */
export function destinationFromPort(port) {
  const s = String(port || "").toLowerCase().trim();
  if (!s) return DEFAULT_DESTINATION;
  if (UAE_TERMS.some((t) => s.includes(t))) return "uae";
  if (GCC_TERMS.some((t) => s.includes(t))) return "gcc";
  return "intl";
}

export function getDestination(id) {
  return DESTINATIONS.find((d) => d.id === id) || DESTINATIONS[0];
}

/** Parse a native date input value (yyyy-mm-dd) as a plain calendar date. */
export function parseDateOnly(value) {
  const m = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3]);
}

/** Whole days from today to the given date. Negative when the date has passed. */
export function daysUntil(value, today = new Date()) {
  const target = parseDateOnly(value);
  if (target == null) return null;
  const t0 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - t0) / 86400000);
}

export function formatSailDate(value) {
  const t = parseDateOnly(value);
  if (t == null) return "";
  return new Date(t).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Can this line be on board by the sailing date?
 *
 * @returns {{
 *   verdict:'makes'|'tight'|'miss'|'unknown',
 *   label:string, readyDays:number|null, transitDays:number,
 *   arriveDays:number|null, daysAvailable:number|null,
 *   steps:string[], split:{nowQty:number,laterQty:number,laterArriveDays:number}|null
 * }}
 */
export function lineEta({ product, qty = 1, transitDays = 1, daysAvailable = null }) {
  const want = Math.max(1, Math.round(Number(qty) || 1));

  if (!product || product.stockQty == null) {
    return {
      verdict: "unknown",
      label: "Sales will confirm",
      readyDays: null,
      transitDays,
      arriveDays: null,
      daysAvailable,
      steps: ["not a listed line — availability confirmed on the quotation"],
      split: null,
    };
  }

  const stock = Math.max(0, Math.round(Number(product.stockQty) || 0));
  const lead = product.leadTimeDays ?? null;
  const restock = product.restockDays ?? null;

  const steps = [];
  let readyDays;

  if (stock >= want) {
    readyDays = 0;
    steps.push(`${want} of ${want} ex-stock Dubai`);
  } else if (stock > 0) {
    readyDays = restock ?? lead ?? ASSUMED_LEAD_DAYS;
    steps.push(`${stock} of ${want} in stock`);
    steps.push(`balance of ${want - stock} in ${readyDays} days`);
  } else {
    readyDays = lead ?? ASSUMED_LEAD_DAYS;
    steps.push(`nothing on the shelf`);
    steps.push(`${readyDays} days to source`);
  }

  steps.push(`${transitDays} day${transitDays === 1 ? "" : "s"} transit`);

  const arriveDays = readyDays + transitDays;

  let verdict = "unknown";
  let label = "Set a sailing date";
  if (daysAvailable != null) {
    if (arriveDays <= daysAvailable - TIGHT_MARGIN_DAYS) {
      verdict = "makes";
      label = "On board in time";
    } else if (arriveDays <= daysAvailable) {
      verdict = "tight";
      label = "Tight";
    } else {
      verdict = "miss";
      label = "Will not make it";
    }
    steps.push(`on board day ${arriveDays} of ${daysAvailable}`);
  }

  // A split shipment only helps when part of the line is already on the shelf
  // and that part can actually get there in time.
  let split = null;
  if (stock > 0 && stock < want && daysAvailable != null && transitDays <= daysAvailable) {
    split = { nowQty: stock, laterQty: want - stock, laterArriveDays: arriveDays };
  }

  return { verdict, label, readyDays, transitDays, arriveDays, daysAvailable, steps, split };
}

/**
 * An in-stock substitute in the same family whose key specs match. Used only
 * when a line misses the sailing date — the point is to offer something that
 * fits the same hole, not merely something in the same category.
 */
export function findAlternative(product, qty, catalogue) {
  if (!product || !Array.isArray(catalogue)) return null;
  const sameSpec = (a, b, key) => {
    const av = a[key];
    const bv = b[key];
    if (!Array.isArray(av) || !av.length) return true; // nothing to match on
    if (!Array.isArray(bv) || !bv.length) return false;
    return av.some((v) => bv.includes(v));
  };

  const candidates = catalogue.filter(
    (c) =>
      c.id !== product.id &&
      c.category === product.category &&
      (c.stockQty ?? 0) >= qty &&
      sameSpec(product, c, "holeDia") &&
      sameSpec(product, c, "plateSize") &&
      sameSpec(product, c, "voltage")
  );
  if (!candidates.length) return null;
  return candidates.sort((a, b) => (b.stockQty ?? 0) - (a.stockQty ?? 0))[0];
}

/** Roll individual verdicts into the one sentence that goes above the submit button. */
export function summariseEta(verdicts, sailDate) {
  const total = verdicts.length;
  const makes = verdicts.filter((v) => v === "makes").length;
  const tight = verdicts.filter((v) => v === "tight").length;
  const miss = verdicts.filter((v) => v === "miss").length;
  const unknown = verdicts.filter((v) => v === "unknown").length;

  const parts = [];
  parts.push(
    `${makes} of ${total} line${total === 1 ? "" : "s"} can be on board by ${formatSailDate(sailDate)}.`
  );
  if (tight) parts.push(`${tight} ${tight === 1 ? "is" : "are"} tight.`);
  if (miss) parts.push(`${miss} will not make it.`);
  if (unknown) parts.push(`${unknown} need${unknown === 1 ? "s" : ""} confirming by sales.`);

  return {
    total,
    makes,
    tight,
    miss,
    unknown,
    sentence: parts.join(" "),
    worst: miss ? "miss" : tight ? "tight" : unknown ? "unknown" : "makes",
  };
}
