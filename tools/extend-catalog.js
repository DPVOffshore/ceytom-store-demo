#!/usr/bin/env node
/**
 * extend-catalog.js — adds inventory fields to every product in lib/catalog.json.
 *
 *   node tools/extend-catalog.js
 *
 * Adds:  stockQty, leadTimeDays, restockDays, moq
 * Keeps: leadTime (string, kept in sync with leadTimeDays)
 * Drops: stock (the old free-text availability string — availability() in
 *        lib/data.js now derives the label from stockQty + leadTimeDays)
 *
 * DETERMINISTIC. Every number is drawn from a PRNG seeded on the product id, so
 * the demo shows identical figures on every machine and every reload. Re-running
 * the script is idempotent: it reads `stock` on the first pass and `stockQty === 0`
 * on later passes to recover the same "sourced to order" set.
 *
 * Distribution — the brief asks for ~15% zero-stock, but it also requires every
 * line currently marked "Sourced to order" to land on zero, and that set is 168
 * of 744 (22.6%). The explicit rule wins; the remaining 576 products are split
 * 55/20/10 renormalised, i.e. ~65% mid, ~24% high, ~12% low single digits.
 */

const fs = require("fs");
const path = require("path");

const CATALOG = path.join(__dirname, "..", "lib", "catalog.json");

/* ---------- deterministic pseudo-randomness ---------- */

function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const intBetween = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

/* ---------- classification ---------- */

/** Small parts bought by the box, not the piece. Drives both MOQ and stock depth. */
const CONSUMABLE_CATEGORIES = new Set([
  "FastBlow / SlowBlow / Time-Delay Fuses",
  "Terminal Block",
  "Panel Bulbs",
]);

function isConsumable(p) {
  if (CONSUMABLE_CATEGORIES.has(p.category)) return true;
  // crimp lugs and similar hardware: no electrical facets, negligible weight
  return p.weightKg != null && p.weightKg <= 0.015;
}

/** Recover the sourced-to-order set whether or not `stock` is still present. */
function isSourced(p) {
  if (typeof p.stock === "string") return p.stock === "Sourced to order";
  return p.stockQty === 0;
}

/* ---------- main ---------- */

function extend(product) {
  const rnd = mulberry32(hash32(product.id));
  const consumable = isConsumable(product);

  let stockQty;
  if (isSourced(product)) {
    stockQty = 0;
  } else {
    const r = rnd();
    if (consumable) {
      // fuses and bulbs are held deep — they are cheap and always wanted
      stockQty = r < 0.62 ? intBetween(rnd, 60, 200) : r < 0.9 ? intBetween(rnd, 10, 40) : intBetween(rnd, 1, 9);
    } else if (r < 0.647) {
      stockQty = intBetween(rnd, 10, 40);
    } else if (r < 0.882) {
      stockQty = intBetween(rnd, 40, 200);
    } else {
      stockQty = intBetween(rnd, 1, 9);
    }
  }

  let leadTimeDays = null;
  let restockDays = null;

  if (stockQty === 0) {
    leadTimeDays = intBetween(rnd, 7, 35);
  } else if (stockQty < 40) {
    // shallow stock: a replenishment is usually already on the water
    if (rnd() < 0.7) restockDays = intBetween(rnd, 5, 21);
  }

  const moq = consumable ? [5, 10, 25][Math.floor(rnd() * 3)] : 1;

  const next = { ...product };
  delete next.stock;
  next.stockQty = stockQty;
  next.leadTimeDays = leadTimeDays;
  next.restockDays = restockDays;
  next.moq = moq;
  next.leadTime = leadTimeDays == null ? null : `${leadTimeDays} days`;
  return next;
}

function main() {
  const raw = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  raw.products = raw.products.map(extend);
  fs.writeFileSync(CATALOG, JSON.stringify(raw, null, 1) + "\n");

  const p = raw.products;
  const pct = (n) => `${((n / p.length) * 100).toFixed(1)}%`;
  console.log(`${p.length} products extended`);
  console.log(`  zero stock       ${String(p.filter((x) => x.stockQty === 0).length).padStart(4)}  ${pct(p.filter((x) => x.stockQty === 0).length)}`);
  console.log(`  1 – 9            ${String(p.filter((x) => x.stockQty > 0 && x.stockQty < 10).length).padStart(4)}  ${pct(p.filter((x) => x.stockQty > 0 && x.stockQty < 10).length)}`);
  console.log(`  10 – 39          ${String(p.filter((x) => x.stockQty >= 10 && x.stockQty < 40).length).padStart(4)}  ${pct(p.filter((x) => x.stockQty >= 10 && x.stockQty < 40).length)}`);
  console.log(`  40 +             ${String(p.filter((x) => x.stockQty >= 40).length).padStart(4)}  ${pct(p.filter((x) => x.stockQty >= 40).length)}`);
  console.log(`  with restock ETA ${String(p.filter((x) => x.restockDays != null).length).padStart(4)}`);
  console.log(`  MOQ above 1      ${String(p.filter((x) => x.moq > 1).length).padStart(4)}`);
}

main();
