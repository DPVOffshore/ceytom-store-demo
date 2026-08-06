#!/usr/bin/env node
/**
 * build-crossrefs.js — generates lib/crossrefs.json.
 *
 *   node tools/build-crossrefs.js
 *
 * WHAT THIS IS: a *plausible* competitor cross-reference table for the demo. The
 * competitor series and part-number formats are real (Schneider Harmony XB4/XB5,
 * Allen-Bradley 800F/800T/700-HN, Eaton RMQ-Titan M22/DILM, Siemens 3SU1/3SB3/3RT,
 * ABB CP1/S200/A-line, Idec YW/HW, Omron A22/MY/LY/H3CR), and each entry is
 * pointed at a Ceytom line of the right family, size and rating. The individual
 * pairings are NOT verified engineering equivalences — a production table has to
 * be built from manufacturer data and signed off by sales. README says so, and so
 * does the /cross-reference page.
 *
 * Deterministic: every choice is drawn from a PRNG seeded on the Ceytom product id.
 */

const fs = require("fs");
const path = require("path");

const CATALOG = path.join(__dirname, "..", "lib", "catalog.json");
const OUT = path.join(__dirname, "..", "lib", "crossrefs.json");

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

const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
const int = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const pad = (n, w) => String(n).padStart(w, "0");

/* ---------- family classification ---------- */

const FAMILY_BY_CATEGORY = {
  "19mm / 22mm Push Button Series": "pushbutton",
  "30mm Push Button Series": "pushbutton",
  "Motor St art Push Button": "pushbutton",
  "Emergency Stop Button Series": "estop",
  "22mm & 30mm Selector Switch Series": "selector",
  "16mm Selector Switch Series": "selector",
  "Monolever Joystick Switch": "selector",
  "16mm LED Panel Indicator Light": "indicator",
  "22mm LED Panel Indicator Light": "indicator",
  "30mm LED Panel Indicator Light": "indicator",
  "Panel Bulbs": "bulb",
  "20A Rotary Cam Switch": "camswitch",
  "32-40A Rotary Cam Switch": "camswitch",
  "63-80A Rotary Cam Switch": "camswitch",
  "120A Rotary Cam Switch": "camswitch",
  "Motor Reversing Cam Switch": "camswitch",
  "Multi Step Rotary Cam Switch": "camswitch",
  "Star Delta Rotary Cam Switch": "camswitch",
  "Voltmeter & Ammeter Rotary Cam Switch": "camswitch",
  "Power Relay & Base": "relay",
  "Solid State Relay": "ssr",
  "Protective / Floatless Relay - Din Rail": "relay",
  "Digital & Analog Timer": "timer",
  "Micro Limit Switch": "limit",
  "Mini Limit Switch": "limit",
  "10A Limit Switch": "limit",
  "Proximity & Photo Switch Senor": "proximity",
  "Measuring Instruments": "meter",
  Transducers: "meter",
  "Current Transformers": "ct",
  "Din Rail Isolator / Disconnect Switch": "isolator",
  "Low Voltage Switchgear": "isolator",
  "MERZ Switches": "isolator",
  "Automatic Transfer Switch (ATS)": "isolator",
  "Signal Tower Light": "tower",
  "Warning Light": "tower",
  "Buzzer & Siren": "tower",
  "Toggle / Snap Switch": "toggle",
  "Rocker Switch": "toggle",
  "Protection Cover / Guard": "guard",
  "Control Protection Box": "guard",
  "Terminal Block": "terminal",
  "FastBlow / SlowBlow / Time-Delay Fuses": "fuse",
  "Control Transformer": "transformer",
  "Temperature Controller": "controller",
};

/** Share of each family that gets a cross-reference. Weighted to the families a
 *  buyer actually arrives holding a dead competitor part for. */
const COVERAGE = {
  pushbutton: 0.8,
  estop: 1.0,
  selector: 0.8,
  indicator: 0.85,
  camswitch: 0.32,
  relay: 0.48,
  ssr: 0.35,
  timer: 0.14,
  limit: 0.16,
  proximity: 0.16,
  meter: 0.22,
  ct: 0.2,
  isolator: 0.22,
  tower: 0.22,
  toggle: 0.14,
  guard: 0.12,
  terminal: 0.12,
  fuse: 0.3,
  bulb: 0.18,
  transformer: 0.1,
  controller: 0.14,
};

/* ---------- attribute extraction ---------- */

const COLOURS = [
  ["red", { sch: 4, ab: 4, eat: "R", idec: "R", omr: "R", abb: "R", sie: 4 }],
  ["green", { sch: 3, ab: 3, eat: "G", idec: "G", omr: "G", abb: "G", sie: 3 }],
  ["yellow", { sch: 5, ab: 5, eat: "Y", idec: "A", omr: "Y", abb: "Y", sie: 5 }],
  ["amber", { sch: 5, ab: 5, eat: "Y", idec: "A", omr: "Y", abb: "Y", sie: 5 }],
  ["blue", { sch: 6, ab: 6, eat: "B", idec: "S", omr: "A", abb: "B", sie: 6 }],
  ["white", { sch: 1, ab: 7, eat: "W", idec: "W", omr: "W", abb: "W", sie: 1 }],
  ["black", { sch: 2, ab: 2, eat: "S", idec: "B", omr: "B", abb: "K", sie: 2 }],
];

function colourOf(p) {
  const hay = `${p.name} ${p.description}`.toLowerCase();
  for (const [word, codes] of COLOURS) if (hay.includes(word)) return codes;
  return null;
}

/**
 * Panel cut-out in mm. Many lines carry two hole sizes as a facet ("19mm","22mm"
 * or "22mm","30mm") because the range spans both, so the text is read first —
 * it names the actual device — and the facet is only a fallback, taking the
 * smaller cut-out, which is the one the part is listed under.
 */
function holeOf(p) {
  const text = `${p.name} ${p.description}`;
  const m = text.match(/\b(16|19|22|30)\s*mm/i);
  if (m) return m[1] === "19" ? 22 : parseInt(m[1], 10);
  const facets = p.holeDia.map((v) => parseInt(v, 10)).filter((n) => !Number.isNaN(n));
  if (!facets.length) return null;
  const min = Math.min(...facets);
  return min === 19 ? 22 : min;
}

function ampsOf(p) {
  if (p.current && p.current.length) return Math.max(...p.current);
  const m = `${p.name} ${p.description}`.match(/(\d{1,3})\s*A\b/);
  return m ? parseInt(m[1], 10) : null;
}

function pinsOf(p) {
  const m = `${p.name} ${p.description}`.match(/(\d{1,2})\s*Pin/i);
  return m ? parseInt(m[1], 10) : null;
}

const isIlluminated = (p) => {
  const hay = `${p.name} ${p.description}`;
  if (/non[-\s]?illuminat/i.test(hay)) return false;
  return /illuminat|led|lamp|pilot/i.test(hay);
};
const isLatching = (p) => /latch|maintain/i.test(`${p.name} ${p.description}`);

/* ---------- competitor part-number builders ----------
   Each builder returns null when the brand does not make an equivalent in that
   size or style, so a 16 mm device never gets offered a 30 mm competitor. */

const BUILDERS = {
  pushbutton: {
    Telemecanique: (r, p, a) => {
      if (a.hole === 16) return `XB6-A${a.c ? a.c.sch : int(r, 1, 6)}${int(r, 1, 2)}B`;
      if (a.hole === 30) return `9001K-P${int(r, 1, 9)}${pick(r, ["R", "G", "A"])}${int(r, 1, 9)}`;
      const series = r() < 0.5 ? "XB4-B" : "XB5-A";
      const style = a.illuminated ? "W" : a.latching ? "L" : "A";
      return `${series}${style}${a.c ? a.c.sch : int(r, 1, 6)}${int(r, 1, 2)}${a.illuminated ? "B5" : ""}`;
    },
    "Allen-Bradley": (r, p, a) => {
      if (a.hole === 30) return `800T-${a.illuminated ? "PB16" : "A"}${int(r, 1, 6)}${pick(r, ["A", "B", "D"])}`;
      if (a.hole === 16) return null;
      return `800F${pick(r, ["P", "M"])}-${a.illuminated ? "L" : "F"}${a.c ? a.c.ab : int(r, 2, 7)}`;
    },
    "Moeller / Eaton": (r, p, a) =>
      a.hole === 22 ? `M22-${a.illuminated ? "DL" : "D"}${a.latching ? "R" : ""}-${a.c ? a.c.eat : "G"}-X${int(r, 0, 1)}` : null,
    Siemens: (r, p, a) => {
      if (a.hole === 16) return null;
      if (r() < 0.35) return `3SB3000-0A${pick(r, ["A", "B"])}${a.c ? a.c.sie : int(r, 1, 6)}1`;
      return `3SU1050-0A${a.illuminated ? "L" : "B"}${a.c ? a.c.sie : int(r, 1, 6)}0-0AA0`;
    },
    ABB: (r, p, a) => (a.hole === 22 ? `CP${a.latching ? 2 : 1}-${a.illuminated ? 30 : 10}${a.c ? a.c.abb : "G"}-${int(r, 0, 1)}${int(r, 0, 1)}` : null),
    Idec: (r, p, a) => {
      if (a.hole === 16) return `AL6M-M1${pick(r, ["4", "1"])}${a.c ? a.c.idec : "G"}`;
      if (a.hole === 30) return null;
      const s = r() < 0.5 ? "YW1B" : "HW1B";
      return `${s}-M${int(r, 1, 2)}${a.illuminated ? "L" : "E"}${int(r, 1, 2)}0${a.c ? a.c.idec : "G"}`;
    },
    Omron: (r, p, a) => {
      if (a.hole === 16) return `A16${a.illuminated ? "L" : ""}-${pick(r, ["J", "T"])}${a.c ? a.c.omr : "G"}-${int(r, 1, 2)}`;
      if (a.hole === 30) return null;
      return `A22${a.illuminated ? "L" : ""}-${pick(r, ["T", "M"])}${a.c ? a.c.omr : "G"}-${int(r, 1, 2)}${int(r, 0, 1)}M`;
    },
  },

  estop: {
    Telemecanique: (r, p, a) =>
      a.hole === 16
        ? `XB6-AS${int(r, 1, 9)}B`
        : a.hole === 30
          ? `9001K-M${int(r, 1, 9)}R`
          : `XB${r() < 0.5 ? "4-B" : "5-A"}S${pick(r, ["542", "8445", "8444", "9445"])}`,
    "Allen-Bradley": (r, p, a) =>
      a.hole === 16
        ? null
        : a.hole === 30
          ? `800T-FXQ${pick(r, ["24", "10"])}R${pick(r, ["A", "B"])}`
          : `800F${pick(r, ["P", "M"])}-MT${int(r, 4, 4)}${int(r, 2, 6)}`,
    "Moeller / Eaton": (r, p, a) =>
      a.hole === 16 ? null : `M22-PV${pick(r, ["", "T", "S", "45P"])}${r() < 0.4 ? `/K${int(r, 0, 1)}${int(r, 1, 2)}` : ""}`,
    Siemens: (r, p, a) => (a.hole === 16 ? null : `3SU1050-1H${pick(r, ["A", "B"])}${int(r, 2, 4)}0-0AA0`),
    ABB: (r, p, a) => (a.hole === 16 ? null : `CP6-10R-${pick(r, ["01", "02", "11"])}`),
    Idec: (r, p, a) =>
      a.hole === 16 ? `AL6M-V4${int(r, 1, 2)}R` : `${pick(r, ["YW1B", "HW1B"])}-V${int(r, 4, 6)}${pick(r, ["E", "M"])}0${int(r, 1, 2)}R`,
    Omron: (r, p, a) => (a.hole === 16 ? `A16E-${pick(r, ["M", "L"])}-${int(r, 1, 2)}` : `A22E-${pick(r, ["M", "L"])}-${int(r, 0, 1)}${int(r, 1, 2)}`),
  },

  selector: {
    Telemecanique: (r, p, a) =>
      a.hole === 16 ? `XB6-A${pick(r, ["D", "E"])}${int(r, 2, 3)}${int(r, 1, 3)}B` : `XB${r() < 0.5 ? "4-B" : "5-A"}D${int(r, 2, 5)}${int(r, 1, 5)}`,
    "Allen-Bradley": (r, p, a) =>
      a.hole === 30 ? `800T-${pick(r, ["H", "J"])}${int(r, 2, 17)}${pick(r, ["A", "D"])}` : `800F${pick(r, ["P", "M"])}-SM${int(r, 2, 3)}${int(r, 1, 4)}`,
    "Moeller / Eaton": (r, p, a) => (a.hole === 22 ? `M22-WR${pick(r, ["K", "S", "LK"])}${r() < 0.5 ? int(r, 2, 3) : ""}` : null),
    Siemens: (r, p, a) => (a.hole === 16 ? null : `3SU1050-2B${pick(r, ["F", "L", "M"])}${int(r, 1, 6)}0-0AA0`),
    ABB: (r, p, a) => (a.hole === 22 ? `KP${int(r, 1, 3)}-1${int(r, 0, 3)}${pick(r, ["B", "G", "R"])}-${int(r, 1, 2)}${int(r, 0, 1)}` : null),
    Idec: (r, p, a) => (a.hole === 22 ? `${pick(r, ["YW1S", "HW1S"])}-${int(r, 2, 3)}E${int(r, 1, 2)}${int(r, 0, 2)}` : null),
    Omron: (r, p, a) => (a.hole === 22 ? `A22${pick(r, ["S", "K"])}-${int(r, 2, 3)}${pick(r, ["M", "R"])}-${int(r, 1, 2)}${int(r, 0, 1)}` : null),
  },

  indicator: {
    Telemecanique: (r, p, a) => {
      if (a.hole === 16) return `XB6-A${a.c ? a.c.sch : 3}V${pick(r, ["B", "M"])}`;
      if (a.hole === 30) return `9001K-P${int(r, 30, 39)}${pick(r, ["LRR", "LGG", "LAA"])}`;
      return `XB${r() < 0.5 ? "4-B" : "5-A"}V${pick(r, ["B", "M", "G"])}${a.c ? a.c.sch : 3}`;
    },
    "Allen-Bradley": (r, p, a) =>
      a.hole === 30 ? `800T-PB16${pick(r, ["R", "G", "A", "B"])}` : `800F${pick(r, ["P", "M"])}-P${a.c ? a.c.ab : 3}`,
    "Moeller / Eaton": (r, p, a) => (a.hole === 22 ? `M22-L${pick(r, ["", "ED"])}-${a.c ? a.c.eat : "G"}${r() < 0.5 ? `/230` : ""}` : null),
    Siemens: (r, p, a) => (a.hole === 16 ? null : `3SU1051-6A${pick(r, ["A", "B"])}${a.c ? a.c.sie : 3}0-0AA0`),
    ABB: (r, p, a) => (a.hole === 22 ? `CL-50${int(r, 1, 2)}${a.c ? a.c.abb : "G"}` : null),
    Idec: (r, p, a) => (a.hole === 22 ? `${pick(r, ["YW1P", "HW1P"])}-1${pick(r, ["U", "E"])}Q${int(r, 3, 4)}${a.c ? a.c.idec : "G"}` : `AL6Q-P${int(r, 1, 4)}${a.c ? a.c.idec : "G"}`),
    Omron: (r, p, a) => (a.hole === 22 ? `A22L-${pick(r, ["T", "C"])}${a.c ? a.c.omr : "G"}-${int(r, 1, 2)}${int(r, 0, 1)}A` : `A16L-${pick(r, ["T", "J"])}${a.c ? a.c.omr : "G"}`),
  },

  camswitch: {
    Telemecanique: (r, p, a) => `K${int(r, 1, 5)}${pick(r, ["F", "D", "B", "A"])}${pad(int(r, 1, 99), 3)}${pick(r, ["ACH", "MCH", "UCH"])}`,
    ABB: (r, p, a) => (a.amps ? `OT${a.amps}F${pick(r, ["3", "4"])}${pick(r, ["", "N"])}` : `C${int(r, 2, 3)}SS${int(r, 1, 4)}-10B`),
    Siemens: (r, p, a) => `3LD2${pad(int(r, 100, 599), 3)}-0TK${int(r, 51, 53)}`,
    "Moeller / Eaton": (r, p, a) => `T${int(r, 0, 5)}-${int(r, 1, 6)}-${pad(int(r, 8210, 8999), 4)}`,
  },

  relay: {
    Omron: (r, p, a) => {
      const body = a.pins === 14 ? pick(r, ["MY4N-J", "MY4N-D2", "LY4N-J"]) : a.pins === 11 ? pick(r, ["MK3P-I", "MY3N-J"]) : a.pins === 5 ? pick(r, ["G2R-1-SN", "MY1N-J"]) : pick(r, ["MY2N-J", "LY2N-J", "MK2P-I"]);
      return `${body} ${pick(r, ["DC24", "AC220", "DC12", "AC110"])}`;
    },
    "Allen-Bradley": (r, p, a) => (a.socket ? `700-HN${int(r, 100, 199)}` : `700-HK${int(r, 3, 6)}${pick(r, ["A", "Z"])}${int(r, 1, 24)}`),
    Telemecanique: (r, p, a) => (a.socket ? `RXZE${int(r, 1, 2)}${pick(r, ["M4", "S108M", "S114M"])}` : `RXM${a.pins === 14 ? 4 : 2}AB${int(r, 1, 2)}${pick(r, ["BD", "B7", "P7", "F7"])}`),
    Siemens: (r, p, a) => (a.socket ? `LZS:PT78${int(r, 600, 799)}` : `LZX:${pick(r, ["RT", "PT"])}${a.pins === 14 ? 4 : 2}${pick(r, ["78", "70"])}${int(r, 20, 40)}`),
    "Moeller / Eaton": (r, p, a) => (a.socket ? `EZ-SOC-${int(r, 1, 4)}` : `ETR${int(r, 2, 4)}-${pick(r, ["11", "51", "69"])}-A`),
    ABB: (r, p, a) => (a.socket ? `CR-M${pick(r, ["2", "4"])}SS` : `CR-M${pick(r, ["024", "230", "110"])}${pick(r, ["DC", "AC"])}${a.pins === 14 ? 4 : 2}L`),
  },

  ssr: {
    Omron: (r) => `G3NA-${int(r, 2, 8)}${int(r, 0, 5)}0B-UTU ${pick(r, ["DC5-24", "AC100-240"])}`,
    Siemens: (r) => `3RF2${pad(int(r, 10, 90), 2)}-1${pick(r, ["A", "B"])}A${int(r, 2, 4)}5`,
    ABB: (r) => `SSR-${int(r, 25, 90)}D${pick(r, ["A", "D"])}`,
    "Moeller / Eaton": (r) => `D${pick(r, ["1", "2"])}${int(r, 4, 9)}${pick(r, ["D", "A"])}${int(r, 20, 90)}`,
  },

  timer: {
    Omron: (r) => `H3${pick(r, ["CR-A8", "Y-2", "DE-M1", "CA-A"])} ${pick(r, ["AC24-48", "AC100-240", "DC24"])}`,
    Telemecanique: (r) => `RE${int(r, 7, 22)}${pick(r, ["R", "T"])}${int(r, 1, 3)}${pick(r, ["MMU", "AMU", "LMU"])}`,
    Siemens: (r) => `7PU${int(r, 40, 49)}${int(r, 10, 60)}-${int(r, 1, 9)}${pick(r, ["AN", "AL"])}${int(r, 20, 30)}`,
    "Moeller / Eaton": (r) => `ETR4-${pick(r, ["11", "51", "69", "70"])}-A`,
    ABB: (r) => `CT-${pick(r, ["MFD", "ERD", "AHD"])}.${int(r, 12, 22)}`,
  },

  limit: {
    Telemecanique: (r) => `${pick(r, ["XCKN", "XCMD", "XCKJ"])}${pad(int(r, 2100, 2199), 4)}${pick(r, ["P20", "H29", "12"])}`,
    Omron: (r) => `${pick(r, ["WLCA2-2", "D4N-1120", "D4N-4120", "WLCA12-2"])}${r() < 0.4 ? "N" : ""}`,
    "Allen-Bradley": (r) => `802T-${pick(r, ["AP", "BP", "ST"])}${int(r, 1, 9)}`,
    "Moeller / Eaton": (r) => `LS-${pick(r, ["11", "02", "11S", "20"])}/${pick(r, ["L", "P", "H"])}`,
    Siemens: (r) => `3SE5${int(r, 110, 132)}-0${pick(r, ["C", "B"])}C0${int(r, 1, 5)}`,
  },

  proximity: {
    Omron: (r) => `${pick(r, ["E2E-X", "E2B-M"])}${int(r, 2, 18)}${pick(r, ["ME1", "MY1", "F1"])}-${pick(r, ["Z", "M1"])}`,
    Telemecanique: (r) => `XS${int(r, 1, 6)}${int(r, 12, 61)}B${int(r, 1, 4)}PA${pick(r, ["L2", "M12", "L01"])}`,
    Siemens: (r) => `3RG4${pad(int(r, 10, 24), 3)}-0${pick(r, ["A", "B"])}G${int(r, 30, 36)}`,
    "Allen-Bradley": (r) => `871TM-${pick(r, ["B", "N"])}${int(r, 2, 10)}N${int(r, 8, 30)}-${pick(r, ["A2", "D4"])}`,
  },

  meter: {
    Omron: (r) => `K3${pick(r, ["MA-J", "HB-X", "MA-F"])}-A${int(r, 1, 2)} ${pick(r, ["100-240VAC", "24VAC/VDC"])}`,
    Siemens: (r) => `7KT${pick(r, ["1", "PAC"])}${int(r, 1200, 1600)}`,
    ABB: (r) => `M2M-${pick(r, ["LV", "MODBUS", "ANALYZER"])}-${int(r, 1, 3)}`,
    Telemecanique: (r) => `METSE${pick(r, ["PM1200", "PM2120", "DM1110"])}`,
  },

  ct: {
    Telemecanique: (r) => `METSECT5${pick(r, ["CC", "MB", "HG"])}${pad(int(r, 5, 40) * 10, 3)}`,
    Siemens: (r) => `4NC5${int(r, 132, 148)}-${int(r, 0, 2)}CE${int(r, 20, 41)}`,
    ABB: (r) => `CT-${pick(r, ["A", "B"])}${int(r, 30, 80)}/${int(r, 1, 5)}00-5`,
  },

  isolator: {
    ABB: (r, p, a) => (a.amps ? `OT${a.amps}F${pick(r, ["3", "4"])}N2` : `S20${int(r, 1, 4)}-${pick(r, ["B", "C", "D"])}${pick(r, ["10", "16", "20", "32", "63"])}`),
    Telemecanique: (r, p, a) => (r() < 0.5 ? `A9F${int(r, 74, 79)}${int(r, 1, 4)}${int(r, 10, 63)}` : `VCF${int(r, 1, 6)}${pick(r, ["N", "GE"])}`),
    Siemens: (r, p, a) => `3LD2${pad(int(r, 100, 599), 3)}-1TL${int(r, 51, 53)}`,
    "Moeller / Eaton": (r, p, a) => `P${int(r, 1, 3)}-${pick(r, ["25", "32", "63", "100"])}/${pick(r, ["I2", "EA", "SVB"])}`,
  },

  tower: {
    Telemecanique: (r) => `XV${pick(r, ["BC", "GB", "UC"])}${int(r, 21, 36)}${pick(r, ["", "SH", "K"])}`,
    Idec: (r) => `LD6A-${int(r, 1, 5)}${pick(r, ["DQB", "WQB", "DZQ"])}-${pick(r, ["RYG", "RYGBC", "RG"])}`,
    Siemens: (r) => `8WD4${int(r, 2, 6)}${int(r, 20, 60)}-${int(r, 0, 5)}${pick(r, ["AB", "AD"])}`,
    "Allen-Bradley": (r) => `855T-${pick(r, ["B24", "G24", "L24"])}${pick(r, ["TL", "N3"])}`,
  },

  toggle: {
    "Allen-Bradley": (r) => `800T-${pick(r, ["N", "T"])}${int(r, 1, 9)}${pick(r, ["A", "D"])}`,
    Telemecanique: (r) => `XB${pick(r, ["4-BJ", "5-AJ"])}${int(r, 21, 65)}`,
    Idec: (r) => `${pick(r, ["S2AR", "AS6M"])}-${int(r, 1, 4)}${pick(r, ["1", "2"])}${pick(r, ["B", "C"])}`,
    Omron: (r) => `A8${pick(r, ["GS", "L"])}-${int(r, 10, 40)}${pick(r, ["1", "2"])}`,
  },

  guard: {
    Telemecanique: (r) => `${pick(r, ["XALD", "XAPD", "XACA"])}${pad(int(r, 1, 1299), 3)}`,
    "Moeller / Eaton": (r) => `M22-${pick(r, ["I1", "I3", "SD", "IY"])}${r() < 0.4 ? `-K${int(r, 1, 4)}` : ""}`,
    ABB: (r) => `MEP${int(r, 1, 4)}-${pick(r, ["GY", "YE"])}`,
    "Allen-Bradley": (r) => `800F-${pick(r, ["ALP", "AGD", "1YM"])}${int(r, 1, 6)}`,
  },

  terminal: {
    ABB: (r) => `M${pick(r, ["4/6", "6/8", "10/10", "16/12", "35/32"])}.${pick(r, ["N", "P", "SNB"])}`,
    Siemens: (r) => `8WH${int(r, 1000, 1050)}-0${pick(r, ["A", "G"])}${int(r, 1, 9)}0`,
    "Moeller / Eaton": (r) => `XB${pick(r, ["UT", "IT"])}${int(r, 2, 35)}PC`,
  },

  fuse: {
    Siemens: (r) => `3N${pick(r, ["A3", "E1", "W6"])}${int(r, 800, 830)}-${int(r, 0, 9)}`,
    "Moeller / Eaton": (r) => `${pick(r, ["FWH", "C10G", "FWP"])}-${int(r, 2, 63)}${pick(r, ["A", "B"])}`,
    ABB: (r) => `E9F${int(r, 1, 3)}${pick(r, ["PV", "GG"])}${int(r, 2, 32)}`,
  },

  bulb: {
    Telemecanique: (r) => `DL1${pick(r, ["CE", "BD", "CF"])}${int(r, 20, 250)}`,
    Idec: (r) => `LSED-${int(r, 1, 6)}${pick(r, ["R", "G", "A", "W"])}-${pick(r, ["24V", "220V", "6V"])}`,
    Omron: (r) => `A22-${int(r, 5, 30)}${pick(r, ["R", "G", "A", "W"])}`,
    "Allen-Bradley": (r) => `800T-N${int(r, 300, 320)}`,
  },

  transformer: {
    ABB: (r) => `TM-C${int(r, 1, 6)}/${int(r, 50, 630)}`,
    Siemens: (r) => `4AM${int(r, 3, 6)}${int(r, 42, 68)}-${int(r, 4, 8)}${pick(r, ["AT", "AN"])}10-0FA0`,
    "Moeller / Eaton": (r) => `STZ${int(r, 63, 630)}/${int(r, 1, 4)}`,
  },

  controller: {
    Omron: (r) => `E5C${pick(r, ["C", "SV", "N"])}-${pick(r, ["QX2ASM", "RX2ASM", "R2T"])}-800`,
    Siemens: (r) => `3RS1${int(r, 40, 42)}-1${pick(r, ["G", "H"])}D${int(r, 60, 80)}`,
    ABB: (r) => `CM-T${pick(r, ["CS", "CN"])}.${int(r, 11, 23)}`,
  },
};

/** Which brands a family is worth quoting against, most likely first. */
const BRAND_ORDER = {
  pushbutton: ["Telemecanique", "Allen-Bradley", "Moeller / Eaton", "Siemens", "Idec", "Omron", "ABB"],
  estop: ["Telemecanique", "Allen-Bradley", "Moeller / Eaton", "Siemens", "ABB", "Idec", "Omron"],
  selector: ["Telemecanique", "Allen-Bradley", "Moeller / Eaton", "Siemens", "Idec", "Omron", "ABB"],
  indicator: ["Telemecanique", "Moeller / Eaton", "Allen-Bradley", "Siemens", "Idec", "Omron", "ABB"],
  camswitch: ["Telemecanique", "ABB", "Siemens", "Moeller / Eaton"],
  relay: ["Omron", "Telemecanique", "Allen-Bradley", "Siemens", "ABB", "Moeller / Eaton"],
  ssr: ["Omron", "Siemens", "ABB", "Moeller / Eaton"],
  timer: ["Omron", "Telemecanique", "Moeller / Eaton", "Siemens", "ABB"],
  limit: ["Telemecanique", "Omron", "Allen-Bradley", "Moeller / Eaton", "Siemens"],
  proximity: ["Omron", "Telemecanique", "Siemens", "Allen-Bradley"],
  meter: ["Omron", "Siemens", "ABB", "Telemecanique"],
  ct: ["Telemecanique", "Siemens", "ABB"],
  isolator: ["ABB", "Telemecanique", "Siemens", "Moeller / Eaton"],
  tower: ["Telemecanique", "Idec", "Siemens", "Allen-Bradley"],
  toggle: ["Allen-Bradley", "Telemecanique", "Idec", "Omron"],
  guard: ["Telemecanique", "Moeller / Eaton", "Allen-Bradley", "ABB"],
  terminal: ["ABB", "Siemens", "Moeller / Eaton"],
  fuse: ["Siemens", "Moeller / Eaton", "ABB"],
  bulb: ["Telemecanique", "Idec", "Omron", "Allen-Bradley"],
  transformer: ["ABB", "Siemens", "Moeller / Eaton"],
  controller: ["Omron", "Siemens", "ABB"],
};

/* ---------- notes ---------- */

const FUNCTIONAL_NOTES = {
  control: [
    "Same 22 mm cut-out and contact rating; terminal screws are M3, not M3.5.",
    "Interchangeable in the panel; the legend ring is a separate line here, not fitted.",
    "Same function and cut-out; body sits 4 mm shallower behind the panel.",
    "Equivalent rating; terminals are rear-entry rather than side-entry.",
    "Same cut-out and function; the bezel is chrome-plated brass rather than plastic.",
    "Matches on rating and travel; contact block clips from the front, not the rear.",
  ],
  indicator: [
    "Same 22 mm cut-out; the LED module and holder are one piece here, not two.",
    "Equivalent output and cut-out; the lens is polycarbonate rather than glass.",
    "Same cut-out and voltage; terminals are screw rather than push-in.",
    "Interchangeable in the panel; body sits 3 mm shallower behind the plate.",
  ],
  relay: [
    "Same pin-out and contact set; the base is a separate line here.",
    "Identical coil ratings and contact arrangement; the test lever is mechanical, not latching.",
    "Same 8-pin layout; overall height is 3 mm greater with the retaining clip fitted.",
    "Equivalent switching capacity; the status LED is standard rather than an option.",
  ],
  general: [
    "Equivalent rating and mounting; the housing is polycarbonate rather than metal.",
    "Same electrical rating; the terminal shroud is a separate accessory here.",
    "Matches on rating and dimensions; the cable entry is M20, not PG16.",
    "Same duty and enclosure rating; fixing centres differ by 2 mm.",
  ],
};

const CONSULT_NOTES = {
  control: [
    "Close on cut-out and rating — confirm panel depth before ordering.",
    "Contact count varies across this range — confirm how many N/O and N/C you need.",
    "Several variants share this reference — send the full nameplate and we will confirm.",
    "Dimensionally close — confirm the mounting centres against your panel drawing.",
  ],
  indicator: [
    "Close on cut-out and output — confirm the supply voltage of the LED module.",
    "This reference covers several lens colours — confirm the colour required.",
    "Dimensionally close — confirm panel depth behind the plate.",
    "Available as both an integral LED and a bulb-and-holder pair — confirm which you hold.",
  ],
  relay: [
    "Coil voltage range differs at the low end — confirm your control voltage.",
    "Pin count matches but contact rating differs — confirm the load being switched.",
    "Confirm whether the socket is being replaced with the relay.",
  ],
  general: [
    "Equivalent by rating; certification set differs — confirm if class approval is required.",
    "Close on rating — confirm the enclosure rating your installation requires.",
    "Confirm the terminal size against the cable you are landing.",
    "Rating band overlaps — send the load details and we will confirm the size.",
  ],
};

function noteFor(rnd, family, matchType) {
  const pool =
    family === "indicator" || family === "bulb"
      ? "indicator"
      : ["pushbutton", "estop", "selector"].includes(family)
        ? "control"
        : ["relay", "ssr", "timer"].includes(family)
          ? "relay"
          : "general";
  const notes = matchType === "functional" ? FUNCTIONAL_NOTES[pool] : CONSULT_NOTES[pool];
  return pick(rnd, notes);
}

/* ---------- main ---------- */

function main() {
  const { products } = JSON.parse(fs.readFileSync(CATALOG, "utf8"));

  const norm = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const taken = new Set(products.map((p) => norm(p.partNumber)));
  const entries = [];

  for (const p of products) {
    const family = FAMILY_BY_CATEGORY[p.category];
    if (!family) continue;
    const builders = BUILDERS[family];
    const order = BRAND_ORDER[family];
    if (!builders || !order) continue;

    const rnd = mulberry32(hash32(`xref:${p.id}`));
    if (rnd() > (COVERAGE[family] ?? 0)) continue;

    const attrs = {
      hole: holeOf(p),
      amps: ampsOf(p),
      pins: pinsOf(p),
      c: colourOf(p),
      illuminated: isIlluminated(p),
      latching: isLatching(p),
      socket: /socket|base/i.test(`${p.name} ${p.description}`),
    };

    // one to three competitor references, most-likely brand first
    const wanted = 1 + (rnd() < 0.5 ? 1 : 0) + (rnd() < 0.18 ? 1 : 0);
    const shuffled = order.slice().sort(() => (rnd() < 0.5 ? -1 : 1));
    // the market-leading brand for the family leads the list slightly more often
    // than chance, but not on every product — otherwise it dominates the table
    if (rnd() < 0.4) shuffled.sort((a, b) => (a === order[0] ? -1 : b === order[0] ? 1 : 0));

    let made = 0;
    for (const brand of shuffled) {
      if (made >= wanted) break;
      const build = builders[brand];
      if (!build) continue;

      let pn = null;
      for (let attempt = 0; attempt < 8; attempt++) {
        const candidate = build(rnd, p, attrs);
        if (!candidate) break;
        if (!taken.has(norm(candidate))) {
          pn = candidate;
          break;
        }
      }
      if (!pn) continue;
      taken.add(norm(pn));

      const roll = rnd();
      const matchType = roll < 0.42 ? "direct" : roll < 0.78 ? "functional" : "consult";

      entries.push({
        competitorPn: pn,
        brand,
        ceytomId: p.id,
        matchType,
        ...(matchType === "direct" ? {} : { note: noteFor(rnd, family, matchType) }),
      });
      made++;
    }
  }

  entries.sort((a, b) => a.competitorPn.localeCompare(b.competitorPn));

  const brands = {};
  const byType = {};
  const covered = new Set();
  for (const e of entries) {
    brands[e.brand] = (brands[e.brand] || 0) + 1;
    byType[e.matchType] = (byType[e.matchType] || 0) + 1;
    covered.add(e.ceytomId);
  }

  const out = {
    note:
      "Plausible demonstration data. Competitor series and part-number formats are real; " +
      "individual pairings are generated and must be verified by sales before publication.",
    brands: Object.keys(brands).sort(),
    entries,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");

  console.log(`${entries.length} cross-references over ${covered.size} Ceytom products`);
  console.log("  by brand:", brands);
  console.log("  by match:", byType);
}

main();
