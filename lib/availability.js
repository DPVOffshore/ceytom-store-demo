/**
 * Availability, derived — not stored.
 *
 * The catalogue used to carry a free-text `stock` string ("In stock — Dubai").
 * That could not answer the only question a buyer actually asks, which is
 * "have you got twenty of them". Availability is now computed from stockQty,
 * leadTimeDays and restockDays against the quantity in front of the user, so
 * the same part reads "In stock" at qty 2 and "14 in stock, balance of 6 in
 * 10 days" at qty 20.
 *
 * No JSON import here on purpose — client components pull this in directly and
 * must not drag the 744-product catalogue into the browser bundle.
 */

/** At or below this, a line is called out as low rather than simply in stock. */
export const LOW_STOCK = 9;

/**
 * @param {object} product  needs stockQty, leadTimeDays, restockDays
 * @param {number} qtyWanted
 * @returns {{state:'in-stock'|'partial'|'low'|'sourced', label:string, detail:string|null, tone:'secondary'|'accent'|'muted'}}
 *
 * `tone` names a token family, not a colour: 'secondary' and 'accent' resolve
 * through --color-secondary-ink / --color-accent-ink, so they re-map with the
 * theme. In the default Ceytom palette 'accent' is the coral.
 */
export function availability(product, qtyWanted = 1) {
  const qty = Math.max(1, Math.round(Number(qtyWanted) || 1));
  const stock = Math.max(0, Math.round(Number(product?.stockQty ?? 0)));
  const lead = product?.leadTimeDays ?? null;
  const restock = product?.restockDays ?? null;

  if (stock === 0) {
    return {
      state: "sourced",
      label: "Sourced to order",
      detail: lead ? `${lead} days from order` : "lead time confirmed on quotation",
      tone: "muted",
    };
  }

  if (stock < qty) {
    const balance = qty - stock;
    return {
      state: "partial",
      label: `${stock} in stock`,
      detail: restock
        ? `balance of ${balance} in ${restock} days`
        : `balance of ${balance} sourced to order`,
      tone: "accent",
    };
  }

  if (stock <= LOW_STOCK) {
    return {
      state: "low",
      label: `Low stock — ${stock} in Dubai`,
      detail: restock ? `more in ${restock} days` : "no replenishment booked",
      tone: "accent",
    };
  }

  return {
    state: "in-stock",
    label: "In stock — Dubai",
    detail: `${stock} available`,
    tone: "secondary",
  };
}

/** Catalogue filter bucket. Evaluated at qty 1, so 'partial' cannot arise. */
export function availabilityKey(product) {
  return availability(product, 1).state;
}

export const AVAILABILITY_FILTERS = [
  ["in-stock", "In stock"],
  ["low", "Low stock"],
  ["sourced", "Sourced to order"],
];

/** Sort weight for the catalogue "Availability" sort — deepest stock first. */
export function availabilityRank(product) {
  const order = { "in-stock": 0, low: 1, partial: 1, sourced: 2 };
  return order[availabilityKey(product)] ?? 3;
}

/** Minimum order quantity, defaulting safely for records written before MOQ existed. */
export function moqOf(product) {
  const n = Number(product?.moq ?? 1);
  return Number.isFinite(n) && n > 1 ? Math.round(n) : 1;
}
