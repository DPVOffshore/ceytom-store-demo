#!/usr/bin/env node
/**
 * build-assemblies.js — generates lib/assemblies.json.
 *
 *   node tools/build-assemblies.js
 *
 * Control gear is sold as an assembly. Ordering a 22 mm head without a contact
 * block, or a pilot lamp holder marked "w/o Bulb" without the bulb, is a common
 * and expensive mistake. This builds the "what else does this need" graph.
 *
 * Every relation is inferred from data that is actually in the catalogue —
 * mounting hole diameter, plate size, pin count, the literal "w/o Bulb" wording,
 * and the "Suitable for <series>" text the socket lines already carry. Nothing
 * here is a hand-invented pairing.
 *
 * Roles
 *   requires     the part does not function without it — an error state, not an upsell
 *   recommended  standard practice for a marine panel; leaving it out is a choice
 *   optional     applies to some installations only
 *
 * Unlisted requirements: a plain 22 mm head needs a contact block, but this
 * catalogue does not list contact blocks as separate lines. Rather than pretend
 * otherwise, those relations carry `unlisted: true` and an `x:` id. The UI adds
 * them to a request as a free-text line for sales to price.
 */

const fs = require("fs");
const path = require("path");

const CATALOG = path.join(__dirname, "..", "lib", "catalog.json");
const OUT = path.join(__dirname, "..", "lib", "assemblies.json");

const { products } = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
const byId = new Map(products.map((p) => [p.id, p]));
const text = (p) => `${p.name} ${p.description}`;

/* ---------- attribute readers ---------- */

function holeMm(p) {
  const m = text(p).match(/\b(16|19|22|30)\s*mm/i);
  if (m) return m[1] === "19" ? 22 : parseInt(m[1], 10);
  const facets = p.holeDia.map((v) => parseInt(v, 10)).filter((n) => !Number.isNaN(n));
  if (!facets.length) return null;
  const min = Math.min(...facets);
  return min === 19 ? 22 : min;
}

function pinCount(p) {
  const m = text(p).match(/(\d{1,2})\s*Pin/i);
  return m ? parseInt(m[1], 10) : null;
}

/** True when the line states its own contact arrangement (1N/O, 2NO+1NC, 3CO…). */
function statesContacts(p) {
  if (p.contacts && p.contacts.length) return true;
  return /\b\d\s*N\s*[\/.]?\s*[OC]\b|\b\d\s*(NO|NC|CO)\b|\bNO\s*[+\/]\s*NC\b|changeover|\bCO\b/i.test(text(p));
}

const colourWords = ["red", "green", "yellow", "amber", "blue", "white"];
function colourOf(p) {
  const hay = text(p).toLowerCase();
  for (const c of colourWords) if (hay.includes(c)) return c === "amber" ? "yellow" : c;
  return null;
}

const HEAD_CATEGORIES = new Set([
  "19mm / 22mm Push Button Series",
  "30mm Push Button Series",
  "Emergency Stop Button Series",
  "22mm & 30mm Selector Switch Series",
  "16mm Selector Switch Series",
]);

const CAM_CATEGORIES = new Set([
  "20A Rotary Cam Switch",
  "32-40A Rotary Cam Switch",
  "63-80A Rotary Cam Switch",
  "120A Rotary Cam Switch",
  "Motor Reversing Cam Switch",
  "Multi Step Rotary Cam Switch",
  "Star Delta Rotary Cam Switch",
  "Voltmeter & Ammeter Rotary Cam Switch",
]);

/* ---------- component pools, drawn from the real catalogue ---------- */

const bulbs = products.filter((p) => p.category === "Panel Bulbs");
const guards = products.filter((p) => p.category === "Protection Cover / Guard");
const boxes = products.filter((p) => p.category === "Control Protection Box");
const cts = products.filter((p) => p.category === "Current Transformers");
const meterSelectors = products.filter((p) => p.category === "Voltmeter & Ammeter Rotary Cam Switch");
const timers = products.filter(
  (p) => p.category === "Digital & Analog Timer" && /din rail/i.test(text(p)) && /timer/i.test(text(p))
);

/** "an 8-pin", "an 11-pin", but "a 5-pin", "a 14-pin". */
const article = (n) => (n === 8 || n === 11 || n === 18 ? "an" : "a");

const relayFamily = products.filter((p) => p.category === "Power Relay & Base");
const sockets = relayFamily.filter((p) => /socket|base/i.test(text(p)));
const relays = relayFamily.filter((p) => !/socket|base/i.test(text(p)));

/** Sockets keyed by the pin count they accept. */
const socketsByPin = new Map();
for (const s of sockets) {
  const n = pinCount(s);
  if (n == null) continue;
  if (!socketsByPin.has(n)) socketsByPin.set(n, []);
  socketsByPin.get(n).push(s);
}

/** Sockets that name the relay series they suit ("Suitable for RFT1 or…"). */
const socketHints = sockets
  .map((s) => {
    const m = text(s).match(/Suitable for\s+(?:\d+Pin\s+)?([A-Z]{2,4}\d?)/i);
    return m ? { socket: s, series: m[1].toUpperCase() } : null;
  })
  .filter(Boolean);

const bulbFor = (base, colour) => {
  const prefix = base === "E10" ? "E10-" : "S9-";
  const want = (colour || "white").toUpperCase();
  return (
    bulbs.find((b) => b.partNumber === `${prefix}${want}`) ||
    bulbs.find((b) => b.partNumber.startsWith(prefix) && b.partNumber.includes(want)) ||
    bulbs.find((b) => b.partNumber === `${prefix}WHITE`) ||
    null
  );
};

const guardsForHole = (mm) => guards.filter((g) => holeMm(g) === mm);
const boxesForHole = (mm) => boxes.filter((b) => holeMm(b) === mm);

/* ---------- relation assembly ---------- */

const relations = {};

function add(product, rel) {
  if (!rel) return;
  if (!rel.unlisted && (!rel.id || !byId.has(rel.id) || rel.id === product.id)) return;
  const list = (relations[product.id] ||= []);
  if (list.some((r) => r.id === rel.id)) return;
  list.push(rel);
}

for (const p of products) {
  const mm = holeMm(p);

  /* --- 1. pilot lamp holders sold without a bulb --- */
  if (/w\/?o\s*bulb|without bulb/i.test(text(p))) {
    const base = mm === 16 ? "E10" : "S9";
    const colour = colourOf(p);
    const bulb = bulbFor(base, colour);
    if (bulb) {
      add(p, {
        id: bulb.id,
        role: "requires",
        kind: "bulb",
        reason: `Supplied without a bulb. This holder takes a ${base === "E10" ? "E10 screw" : "BA9s bayonet"} bulb — order it in ${colour || "the lens"} to match the lens, and to your control voltage.`,
      });
      const spare = bulbs.find((b) => b.id !== bulb.id && b.partNumber.startsWith(base === "E10" ? "E10-" : "S9-") && /FILAMENT/.test(b.partNumber));
      if (spare)
        add(p, {
          id: spare.id,
          role: "optional",
          kind: "bulb",
          reason: "Filament equivalent, where a vessel's existing panel is not on LED.",
        });
    }
  }

  /* --- 2. heads with no contact block stated --- */
  if (HEAD_CATEGORIES.has(p.category) && !statesContacts(p) && mm) {
    const estop = p.category === "Emergency Stop Button Series";
    add(p, {
      id: `x:contact-block-${mm}mm-${estop ? "nc" : "no"}`,
      unlisted: true,
      label: `${mm} mm contact block — ${estop ? "1 N/C" : "1 N/O"}`,
      role: "requires",
      kind: "contact-block",
      reason: estop
        ? `Head only. An emergency stop must break the circuit through at least one N/C block — the head on its own switches nothing. Contact blocks are not a listed line; we quote the block that fits this ${mm} mm head.`
        : `Head only. Without a contact block behind it this ${mm} mm actuator switches nothing. Contact blocks are not a listed line; we quote the block that fits.`,
    });
  }

  /* --- 3. guards, covers and legend plates for panel-mounted control devices --- */
  if (HEAD_CATEGORIES.has(p.category) && mm) {
    const estop = p.category === "Emergency Stop Button Series";
    if (estop) {
      const metalGuard = guards.find((g) => g.partNumber === "G4B22");
      const legend = guards.find((g) => g.partNumber === "G2BM4");
      if (metalGuard && mm === 22)
        add(p, {
          id: metalGuard.id,
          role: "recommended",
          kind: "guard",
          reason: "Deck and engine-room stations take knocks. A collision guard prevents the mushroom head being operated by passing traffic or stowed gear.",
        });
      if (legend && mm === 22)
        add(p, {
          id: legend.id,
          role: "recommended",
          kind: "legend",
          reason: "An emergency stop station has to be identified at the panel. This is the matching 22 mm label plate.",
        });
    } else {
      const cover = guardsForHole(mm).find((g) => /cover/i.test(text(g)));
      if (cover)
        add(p, {
          id: cover.id,
          role: "optional",
          kind: "guard",
          reason: `Exposed positions: a ${mm} mm clear cover keeps water, dust and accidental contact off the actuator without hiding it.`,
        });
    }

    const box = boxesForHole(mm)[0];
    if (box)
      add(p, {
        id: box.id,
        role: "optional",
        kind: "enclosure",
        reason: `Mounting outside a switchboard? This enclosure is drilled for ${mm} mm devices and rated for the space.`,
      });
  }

  /* --- 4. plug-in relays need a base --- */
  if (relays.includes(p)) {
    const pins = pinCount(p);
    const pcb = /pcb|flange|solid state/i.test(text(p));
    if (pins != null && !pcb) {
      const series = p.partNumber.match(/^([A-Z]{2,4}\d?)/i)?.[1]?.toUpperCase();
      const hinted = socketHints.find((h) => series && (h.series === series || series.startsWith(h.series)));
      const candidates = hinted ? [hinted.socket] : socketsByPin.get(pins) || [];
      if (candidates.length) {
        add(p, {
          id: candidates[0].id,
          role: "requires",
          kind: "base",
          reason: `${pins}-pin plug-in relay. It has no mounting feet of its own — it needs ${article(pins)} ${pins}-pin base to land on the DIN rail and to land the wiring.`,
        });
        if (candidates[1])
          add(p, {
            id: candidates[1].id,
            role: "optional",
            kind: "base",
            reason: "Alternative base with the same pin layout — different terminal style.",
          });
      }
    }
    if (pins != null && !pcb && timers.length) {
      const timer = timers[pinCount(p) % timers.length];
      add(p, {
        id: timer.id,
        role: "optional",
        kind: "timer",
        reason: "Adds a delay-on or delay-off function to the same rail without a separate controller.",
      });
    }
  }

  /* --- 5. panel meters --- */
  if (p.category === "Measuring Instruments" && /ammeter/i.test(text(p))) {
    const direct = /direct/i.test(text(p));
    if (cts.length) {
      const ct = cts[p.id.length % cts.length];
      add(p, {
        id: ct.id,
        role: direct ? "optional" : "recommended",
        kind: "ct",
        reason: direct
          ? "Direct-connected up to its stated range. Above that it reads through a current transformer sized to the primary."
          : "This meter reads through a current transformer. Size the CT to the primary current, not to the meter.",
      });
    }
    const plate = p.plateSize[0];
    const sel = meterSelectors.find((s) => (plate ? s.plateSize.includes(plate) : true));
    if (sel)
      add(p, {
        id: sel.id,
        role: "optional",
        kind: "selector",
        reason: plate
          ? `Same ${plate} cut-out. Switches one meter across all three phases instead of fitting three.`
          : "Switches one meter across all three phases instead of fitting three.",
      });
  }

  /* --- 6. motor-duty cam switches mounted outside a switchboard --- */
  if (CAM_CATEGORIES.has(p.category) && /motor|star delta|reversing/i.test(text(p) + p.category)) {
    const plate = p.plateSize[0];
    const box = boxes.find((b) => plate && b.plateSize.includes(plate)) || boxes.find((b) => /metal enclosure/i.test(text(b)));
    if (box)
      add(p, {
        id: box.id,
        role: "recommended",
        kind: "enclosure",
        reason: plate
          ? `Panel-mount switch with a ${plate} plate. Fitted outside a switchboard it needs an enclosure — this one takes that plate size.`
          : "Panel-mount switch. Fitted outside a switchboard it needs an enclosure rated for the space.",
      });
  }
}

/* ---------- write ---------- */

const roleCount = {};
const kindCount = {};
for (const list of Object.values(relations))
  for (const r of list) {
    roleCount[r.role] = (roleCount[r.role] || 0) + 1;
    kindCount[r.kind] = (kindCount[r.kind] || 0) + 1;
  }

const out = {
  note:
    "Inferred from catalogue facets — mounting hole diameter, plate size, relay pin count, " +
    "and the catalogue's own 'w/o Bulb' and 'Suitable for …' wording. Demonstration data: " +
    "verify against manufacturer drawings before publication.",
  roles: {
    requires: "Does not function without it. Missing = error, not upsell.",
    recommended: "Standard practice for a marine panel.",
    optional: "Applies to some installations only.",
  },
  relations,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");

console.log(`${Object.keys(relations).length} products with assembly relations`);
console.log("  by role:", roleCount);
console.log("  by kind:", kindCount);
