/**
 * Shareable and saved request lists — no accounts, no server.
 *
 * The payload lives in the URL **hash**, not the query string, so it is never
 * transmitted to a server, never lands in an access log and never reaches an
 * analytics tag. A vessel's parts list is commercially sensitive; keeping it
 * client-side is the whole point.
 *
 * Format (deliberately terse — this gets pasted into email):
 *   { v:1, l:["lmb22*4","a202a"], f:[["x:contact-block-22mm-nc","22 mm contact block",2]], n:"note" }
 * A catalogue line with quantity 1 drops the "*1".
 *
 * No JSON import — client components pull this in directly.
 */

export const SHARE_VERSION = 1;

/** Beyond this, mail clients and ticketing systems start breaking the link. */
export const URL_LIMIT = 2000;

export const SAVED_KEY = "ceytom.rfq.saved.v1";

/* ---------- base64url, unicode-safe ---------- */

function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(payload) {
  const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "="));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/* ---------- encode / decode ---------- */

export function encodeBasket(lines, note = "") {
  const l = [];
  const f = [];
  for (const line of lines) {
    if (line.freeText) f.push([line.id, line.partNumber || line.name || "", line.qty]);
    else l.push(line.qty > 1 ? `${line.id}*${line.qty}` : line.id);
  }
  const payload = { v: SHARE_VERSION, l };
  if (f.length) payload.f = f;
  if (note && note.trim()) payload.n = note.trim().slice(0, 400);
  return toBase64Url(JSON.stringify(payload));
}

/** @returns {{items:{id:string,qty:number}[], free:{id,text,qty}[], note:string}|null} */
export function decodeBasket(payload) {
  try {
    const data = JSON.parse(fromBase64Url(String(payload || "")));
    if (!data || data.v !== SHARE_VERSION || !Array.isArray(data.l)) return null;
    const items = data.l
      .map((entry) => {
        const [id, qty] = String(entry).split("*");
        if (!id) return null;
        const n = parseInt(qty || "1", 10);
        return { id, qty: Number.isFinite(n) && n > 0 ? Math.min(n, 9999) : 1 };
      })
      .filter(Boolean);
    const free = Array.isArray(data.f)
      ? data.f
          .map((row) => {
            if (!Array.isArray(row) || !row[0]) return null;
            const n = parseInt(row[2], 10);
            return {
              id: String(row[0]),
              text: String(row[1] || ""),
              qty: Number.isFinite(n) && n > 0 ? Math.min(n, 9999) : 1,
            };
          })
          .filter(Boolean)
      : [];
    return { items, free, note: typeof data.n === "string" ? data.n : "" };
  } catch {
    return null;
  }
}

export const SHARE_HASH_KEY = "list";

export function buildShareUrl(origin, lines, note = "") {
  return `${origin}/quote#${SHARE_HASH_KEY}=${encodeBasket(lines, note)}`;
}

export function readShareHash(hash) {
  const m = String(hash || "").match(new RegExp(`[#&]${SHARE_HASH_KEY}=([^&]+)`));
  return m ? m[1] : null;
}

/* ---------- downloadable fallback ---------- */

/** Same data as the link, as a file, for lists too long to survive a URL. */
export function basketToFile(lines, note = "") {
  return JSON.stringify(
    {
      format: "ceytom.request-list",
      version: SHARE_VERSION,
      savedAt: new Date().toISOString(),
      note,
      lines: lines.map((l) => ({
        id: l.id,
        partNumber: l.partNumber,
        name: l.name,
        qty: l.qty,
        ...(l.freeText ? { freeText: true } : {}),
      })),
    },
    null,
    2
  );
}

export function fileToBasket(text) {
  try {
    const data = JSON.parse(text);
    if (data?.format !== "ceytom.request-list" || !Array.isArray(data.lines)) return null;
    const items = [];
    const free = [];
    for (const l of data.lines) {
      if (!l?.id) continue;
      const qty = Number.isFinite(+l.qty) && +l.qty > 0 ? Math.min(Math.round(+l.qty), 9999) : 1;
      if (l.freeText) free.push({ id: String(l.id), text: String(l.partNumber || l.name || ""), qty });
      else items.push({ id: String(l.id), qty });
    }
    return { items, free, note: typeof data.note === "string" ? data.note : "" };
  } catch {
    return null;
  }
}

/* ---------- saved lists (localStorage) ---------- */

export function loadSavedLists() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSavedLists(lists) {
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(lists));
    return true;
  } catch {
    return false;
  }
}

export function saveList(name, lines, note = "") {
  const lists = loadSavedLists();
  const entry = {
    key: `L${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`,
    name: String(name || "").trim() || "Untitled list",
    savedAt: new Date().toISOString(),
    note,
    lines: lines.map((l) => ({
      id: l.id,
      partNumber: l.partNumber,
      name: l.name,
      brand: l.brand,
      image: l.image,
      qty: l.qty,
      ...(l.freeText ? { freeText: true } : {}),
    })),
  };
  const next = [entry, ...lists].slice(0, 40);
  return writeSavedLists(next) ? entry : null;
}

export function deleteSavedList(key) {
  const next = loadSavedLists().filter((l) => l.key !== key);
  writeSavedLists(next);
  return next;
}

export function renameSavedList(key, name) {
  const next = loadSavedLists().map((l) =>
    l.key === key ? { ...l, name: String(name || "").trim() || l.name } : l
  );
  writeSavedLists(next);
  return next;
}

export function formatSavedDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
