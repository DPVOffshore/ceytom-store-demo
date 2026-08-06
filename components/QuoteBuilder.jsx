"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRfq } from "./RfqProvider";
import { PartNumber, Eyebrow, Stock, EtaBadge, RoleBadge } from "./Bits";
import ShareTools from "./ShareTools";
import { moqOf } from "@/lib/availability";
import {
  DESTINATIONS,
  daysUntil,
  destinationFromPort,
  findAlternative,
  getDestination,
  lineEta,
  summariseEta,
} from "@/lib/eta";
import { buildShareUrl, decodeBasket, readShareHash } from "@/lib/share";

function normalise(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Parse a pasted list. Tolerates "PN x 4", "PN, 4", "4 x PN", tabs, CSV. */
function parseLines(text, index) {
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const matched = [];
  const unmatched = [];

  for (const row of rows) {
    const cells = row.split(/[\t,;|]+/).map((c) => c.trim()).filter(Boolean);
    let pnPart = cells[0] || row;
    let qty = 1;

    if (cells.length > 1) {
      const last = cells[cells.length - 1];
      const n = parseInt(last.replace(/[^\d]/g, ""), 10);
      if (!Number.isNaN(n) && n > 0 && n < 10000 && !index.has(normalise(last))) {
        qty = n;
      }
    } else {
      const m = row.match(/^(.*?)\s*[x×*]\s*(\d{1,4})$/i) || row.match(/^(.+?)\s+(\d{1,4})$/);
      if (m && m[1].trim() && index.has(normalise(m[1]))) {
        pnPart = m[1].trim();
        qty = parseInt(m[2], 10);
      }
      const rev = row.match(/^(\d{1,4})\s*[x×*]\s*(.+)$/i);
      if (rev && index.has(normalise(rev[2]))) {
        qty = parseInt(rev[1], 10);
        pnPart = rev[2].trim();
      }
    }

    const hit = index.get(normalise(pnPart));
    if (hit) matched.push({ product: hit, qty, raw: row });
    else unmatched.push({ raw: row, qty });
  }
  return { matched, unmatched };
}

function PasteTool({ catalogue }) {
  const { addMany, addFree } = useRfq();
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const index = useMemo(() => {
    const m = new Map();
    catalogue.forEach((p) => m.set(normalise(p.partNumber), p));
    return m;
  }, [catalogue]);

  function run(value) {
    const v = value ?? text;
    if (!v.trim()) {
      setResult(null);
      return;
    }
    setResult(parseLines(v, index));
  }

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || "");
      setText(content);
      run(content);
    };
    reader.readAsText(file);
  }

  function addUnmatched() {
    result.unmatched.forEach((u) =>
      addFree({
        partNumber: u.raw,
        name: "Not in the listed catalogue — sales will identify this line",
        qty: u.qty,
      })
    );
    setResult({ ...result, unmatched: [] });
  }

  return (
    <section className="border border-primary/12 bg-base">
      <div className="border-b border-primary/10 bg-surface px-6 py-4">
        <Eyebrow>Bulk entry</Eyebrow>
        <h2 className="h-display mt-2 text-[20px] text-primary">Paste or upload a parts list</h2>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-ink/75">
          One part number per line, with an optional quantity — <span className="data">LMB22, 4</span>{" "}
          or <span className="data">A202A x 2</span>. We match each line against the catalogue and
          show you what we could not find. Holding competitor references instead?{" "}
          <Link href="/cross-reference" className="font-semibold text-secondary-ink hover:underline">
            Use the cross-reference tool
          </Link>
          .
        </p>
      </div>

      <div className="p-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          placeholder={"LMB22, 4\nA202A x 2\nTARA120E\nSA80, 1"}
          aria-label="Parts list"
          className="data w-full resize-y border border-primary/15 bg-base p-4 text-[13px] leading-relaxed text-primary placeholder:text-ink/70 focus:border-secondary-ink focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => run()}
            className="bg-primary-soft px-5 py-2.5 text-[13px] font-semibold text-on-primary transition-colors hover:bg-secondary-ink"
          >
            Match against catalogue
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="border border-primary/20 px-5 py-2.5 text-[13px] font-semibold text-primary transition-colors hover:border-secondary-ink hover:text-secondary-ink"
          >
            Upload CSV or TXT
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,.tsv,text/plain"
            onChange={onFile}
            className="hidden"
          />
          {text && (
            <button
              type="button"
              onClick={() => {
                setText("");
                setResult(null);
              }}
              className="text-[13px] text-ink/70 hover:text-accent-ink"
            >
              Clear
            </button>
          )}
        </div>

        {result && (
          <div className="mt-6 space-y-5">
            <div className="flex flex-wrap items-center gap-4 border-y border-primary/10 py-3">
              <p className="data text-[13px] text-secondary-ink">{result.matched.length} matched</p>
              <p className="data text-[13px] text-accent-ink">{result.unmatched.length} not found</p>
              {result.matched.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    addMany(result.matched);
                    setResult({ ...result, matched: [] });
                    setText("");
                  }}
                  className="ml-auto bg-accent px-4 py-2 text-[13px] font-semibold text-on-accent hover:bg-accent/90"
                >
                  Add {result.matched.length} matched lines to request
                </button>
              )}
            </div>

            {result.matched.length > 0 && (
              <div>
                <p className="eyebrow text-ink/70">Matched</p>
                <ul className="mt-2 divide-y divide-primary/8 border border-primary/10">
                  {result.matched.map((m, i) => (
                    <li key={i} className="flex items-center gap-4 px-4 py-2.5">
                      <span className="data w-28 shrink-0 text-[13px] font-medium text-secondary-ink">
                        {m.product.partNumber}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink/75">
                        {m.product.name}
                      </span>
                      <span className="data shrink-0 text-[12px] text-ink/70">× {m.qty}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.unmatched.length > 0 && (
              <div>
                <p className="eyebrow text-ink/70">Not in the listed catalogue</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink/70">
                  These will still be sent with your request — we source beyond what is listed
                  and will confirm availability.
                </p>
                <ul className="mt-2 divide-y divide-primary/8 border border-accent/25 bg-accent/[0.04]">
                  {result.unmatched.map((u, i) => (
                    <li key={i} className="data px-4 py-2.5 text-[13px] text-ink/70">
                      {u.raw}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={addUnmatched}
                  className="mt-3 border border-primary/20 px-4 py-2 text-[13px] font-semibold text-primary hover:border-secondary-ink hover:text-secondary-ink"
                >
                  Add these {result.unmatched.length} as enquiry lines
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <label className="block">
      <span className="flex items-baseline gap-2">
        <span className="text-[13px] font-medium text-primary">{label}</span>
        {required ? (
          <span className="data text-[11px] text-accent-ink">required</span>
        ) : (
          <span className="data text-[11px] text-ink/70">optional</span>
        )}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-ink/70">{hint}</span>}
    </label>
  );
}

const input =
  "mt-1.5 w-full border border-primary/15 bg-base px-3.5 py-2.5 text-[14px] text-primary placeholder:text-ink/70 focus:border-secondary-ink focus:outline-none";

/* ------------------------------------------------------------------ */

/**
 * One basket line, with everything a superintendent needs to decide: what is on
 * the shelf, whether it lands before the ship sails, what is missing from the
 * assembly, and what to do about it when the answer is no.
 */
function BasketLine({ line, product, requirements, sailDate, destination, daysAvailable, catalogue, split, onSplit }) {
  const { setQty, remove, add, addFree, has } = useRfq();

  const moq = product ? moqOf(product) : 1;
  const belowMoq = moq > 1 && line.qty < moq;

  const eta = sailDate
    ? lineEta({ product, qty: line.qty, transitDays: destination.transitDays, daysAvailable })
    : null;

  const alternative =
    eta && eta.verdict === "miss" && product ? findAlternative(product, line.qty, catalogue) : null;

  const unmet = (requirements[line.id] || []).filter((r) => !has(r.id));

  function addRequirement(req) {
    if (req.unlisted) {
      addFree({ id: req.id, partNumber: "To be quoted", name: req.label, qty: line.qty });
      return;
    }
    const target = catalogue.find((p) => p.id === req.id);
    if (target) add(target, Math.max(line.qty, moqOf(target)));
  }

  return (
    <li className="px-4 py-4 sm:px-6">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-primary/10 bg-base p-1">
          {line.image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={line.image} alt="" className="h-full w-full object-contain" />
          ) : (
            <span className="data text-[11px] text-ink/70">{line.freeText ? "TBQ" : "—"}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {line.freeText ? (
            <span className="data inline-flex items-center border border-accent/40 bg-accent/[0.07] px-1.5 py-0.5 text-[11px] text-primary">
              {line.partNumber}
            </span>
          ) : (
            <PartNumber value={line.partNumber} size="xs" />
          )}
          <p className="mt-1.5 text-[13px] leading-snug text-ink/75">{line.name}</p>
          {line.brand && <p className="text-[12px] text-ink/70">{line.brand}</p>}
          {product && <Stock product={product} qty={line.qty} detail className="mt-1.5" />}
          {belowMoq && (
            <p className="data mt-1 text-[12px] text-accent-ink">
              Minimum order quantity {moq} — we will quote {moq}.
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setQty(line.id, line.qty - 1)}
            aria-label={`Decrease quantity of ${line.partNumber}`}
            className="h-8 w-8 border border-primary/15 text-[15px] text-primary hover:border-secondary-ink hover:text-secondary-ink"
          >
            −
          </button>
          <input
            value={line.qty}
            onChange={(e) => setQty(line.id, parseInt(e.target.value.replace(/\D/g, "") || "1", 10))}
            aria-label={`Quantity of ${line.partNumber}`}
            className="data h-8 w-14 border border-primary/15 text-center text-[13px] text-primary focus:border-secondary-ink focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setQty(line.id, line.qty + 1)}
            aria-label={`Increase quantity of ${line.partNumber}`}
            className="h-8 w-8 border border-primary/15 text-[15px] text-primary hover:border-secondary-ink hover:text-secondary-ink"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => remove(line.id)}
            aria-label={`Remove ${line.partNumber}`}
            className="ml-1 px-2 text-[13px] text-ink/70 hover:text-accent-ink"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── sailing-date verdict, with the arithmetic shown ── */}
      {eta && (
        <div className="mt-3 border-t border-primary/8 pt-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <EtaBadge verdict={eta.verdict} label={eta.label} />
            <span className="data text-[12px] leading-relaxed text-ink/70">
              {eta.steps.join(" · ")}
            </span>
          </div>

          {eta.verdict === "miss" && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
              {eta.split && (
                <button
                  type="button"
                  onClick={() => onSplit(line.id)}
                  className={`border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                    split
                      ? "cursor-default border-secondary-ink text-secondary-ink"
                      : "border-primary/25 text-primary hover:border-secondary-ink hover:text-secondary-ink"
                  }`}
                >
                  {split
                    ? `✓ Split: ${eta.split.nowQty} now, ${eta.split.laterQty} to follow`
                    : `Split shipment — send ${eta.split.nowQty} now`}
                </button>
              )}
              {alternative && (
                <button
                  type="button"
                  onClick={() => {
                    remove(line.id);
                    add(alternative, line.qty);
                  }}
                  className="border border-primary/25 px-3 py-1.5 text-[12px] font-semibold text-primary transition-colors hover:border-secondary-ink hover:text-secondary-ink"
                >
                  Swap for <span className="data">{alternative.partNumber}</span> —{" "}
                  {alternative.stockQty} in stock
                </button>
              )}
              {!eta.split && !alternative && (
                <p className="text-[12px] leading-relaxed text-ink/75">
                  Nothing on the shelf and no matching alternative in stock. Sales will look for an
                  equivalent outside the listed catalogue.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── assembly check: a helpful check, not an upsell ── */}
      {unmet.length > 0 && (
        <div className="mt-3 border-l-2 border-l-accent bg-accent/[0.06] p-3">
          {unmet.map((req) => (
            <div key={req.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 py-1">
              <RoleBadge role="requires" />
              <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-ink/80">
                <span className="font-semibold text-primary">
                  {req.kind === "contact-block"
                    ? "This head needs a contact block."
                    : req.kind === "bulb"
                      ? "This lamp holder is supplied without a bulb."
                      : req.kind === "base"
                        ? "This plug-in relay needs a base."
                        : "This line needs a matching component."}
                </span>{" "}
                None in your request. {req.partNumber ? `We list it as ${req.partNumber}.` : "It is quoted rather than listed."}
              </p>
              <button
                type="button"
                onClick={() => addRequirement(req)}
                className="shrink-0 border border-accent bg-accent px-3 py-1.5 text-[12px] font-semibold text-on-accent transition-colors hover:bg-base hover:text-accent-ink"
              >
                Add {req.partNumber || "it"}
              </button>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */

export default function QuoteBuilder({ catalogue, requirements = {}, company }) {
  const { lines, note, setNote, clear, count, applyLines, ready } = useRfq();

  const [sent, setSent] = useState(false);
  const [ref, setRef] = useState("");
  const [sentList, setSentList] = useState({ lines: [], note: "" });
  const [reorderLink, setReorderLink] = useState("");

  const [port, setPort] = useState("");
  const [sailDate, setSailDate] = useState("");
  const [destOverride, setDestOverride] = useState("");
  const [splits, setSplits] = useState([]);
  const [incoming, setIncoming] = useState(null);
  const [imported, setImported] = useState("");

  const byId = useMemo(() => new Map(catalogue.map((p) => [p.id, p])), [catalogue]);

  // read inside callbacks that must not be re-created on every basket edit
  const linesRef = useRef(lines);
  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  /** Turn a decoded payload back into basket lines against the live catalogue. */
  const rebuild = useCallback(
    (decoded) => [
      ...decoded.items
        .map(({ id, qty }) => {
          const p = byId.get(id);
          return p
            ? { id: p.id, partNumber: p.partNumber, name: p.name, image: p.image ?? null, brand: p.brand ?? null, qty }
            : null;
        })
        .filter(Boolean),
      ...decoded.free.map((f) => ({
        id: f.id,
        partNumber: f.text || "—",
        name: "Sales will identify this line",
        image: null,
        brand: null,
        freeText: true,
        qty: f.qty,
      })),
    ],
    [byId]
  );

  /**
   * Take in a restored list. An empty basket is filled straight away; anything
   * else asks first, because silently overwriting someone's request is the one
   * unforgivable behaviour here.
   */
  const receive = useCallback(
    (restored, incomingNote, source) => {
      if (!restored.length) return;
      if (linesRef.current.length === 0) {
        applyLines(restored, "replace");
        if (incomingNote) setNote(incomingNote);
        setImported(`${restored.length} line${restored.length === 1 ? "" : "s"} restored from the ${source}.`);
      } else {
        setIncoming({ lines: restored, note: incomingNote });
      }
    },
    [applyLines, setNote]
  );

  /* ---- restore a shared list from the URL hash ---- */
  useEffect(() => {
    if (!ready) return;

    function consumeHash() {
      const payload = readShareHash(window.location.hash);
      if (!payload) return;
      const decoded = decodeBasket(payload);
      // clear the hash either way, so a refresh does not re-prompt
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      if (!decoded) return;
      receive(rebuild(decoded), decoded.note, "shared link");
    }

    consumeHash();
    // a share link opened while already on this page is a fragment navigation:
    // React does not remount, so the listener is what catches it
    window.addEventListener("hashchange", consumeHash);
    return () => window.removeEventListener("hashchange", consumeHash);
  }, [ready, rebuild, receive]);

  /* ---- a part requested from the search box that we do not list ---- */
  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams(window.location.search);
    const wanted = params.get("add");
    if (!wanted) return;
    window.history.replaceState(null, "", window.location.pathname);
    const hit = catalogue.find((p) => normalise(p.partNumber) === normalise(wanted));
    if (hit) applyLines([{ id: hit.id, partNumber: hit.partNumber, name: hit.name, image: hit.image ?? null, brand: hit.brand ?? null, qty: 1 }], "merge");
    else
      applyLines(
        [
          {
            id: `free:${normalise(wanted)}`,
            partNumber: wanted,
            name: "Not in the listed catalogue — sales will identify this line",
            image: null,
            brand: null,
            freeText: true,
            qty: 1,
          },
        ],
        "merge"
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const destination = getDestination(destOverride || destinationFromPort(port));
  const daysAvailable = sailDate ? daysUntil(sailDate) : null;
  const datePassed = daysAvailable != null && daysAvailable < 0;

  const perLine = useMemo(() => {
    if (!sailDate || datePassed) return [];
    return lines.map((l) =>
      lineEta({
        product: byId.get(l.id) || null,
        qty: l.qty,
        transitDays: destination.transitDays,
        daysAvailable,
      })
    );
  }, [lines, byId, sailDate, datePassed, destination.transitDays, daysAvailable]);

  const summary =
    perLine.length > 0 ? summariseEta(perLine.map((e) => e.verdict), sailDate) : null;

  function toggleSplit(id) {
    setSplits((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function importIncoming(mode) {
    if (!incoming) return;
    applyLines(incoming.lines, mode);
    if (incoming.note) setNote(incoming.note);
    setImported(
      mode === "replace"
        ? `Your list was replaced with the ${incoming.lines.length} shared lines.`
        : `${incoming.lines.length} shared lines merged into your list.`
    );
    setIncoming(null);
  }

  function submit(e) {
    e.preventDefault();
    // Mock submission — a real build posts to the sales inbox and logs a draft order.
    const snapshot = lines.map((l) => ({ ...l }));
    setSentList({ lines: snapshot, note });
    setReorderLink(buildShareUrl(window.location.origin, snapshot, note));
    setRef(`RFQ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`);
    setSent(true);
    clear();
    setSplits([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------------- confirmation ---------------- */

  if (sent) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24">
        <div className="text-center">
          <Eyebrow>Request received</Eyebrow>
          <h1 className="h-display mt-4 text-[30px] text-primary">Your request has been sent</h1>
          <p className="data mt-4 text-[15px] text-secondary-ink">{ref}</p>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-ink/70">
            Our sales team will respond with a formal quotation within {company.responseTime},
            including unit pricing, lead time, freight and applicable VAT. A copy has been sent to
            the email address you provided.
          </p>
        </div>

        <div className="mt-10 border border-primary/12 bg-base p-6 text-left">
          <Eyebrow>Reorder</Eyebrow>
          <h2 className="h-display mt-2 text-[19px] text-primary">
            Repeat this order in one click
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink/75">
            This link carries the {sentList.lines.length} line
            {sentList.lines.length === 1 ? "" : "s"} of request {ref}. In production it is included
            in the quotation email, so the vessel can reorder the same list next drydock without
            rebuilding it. The list travels in the address itself — nothing is stored on a server.
          </p>
          <div className="mt-3 flex">
            <input
              readOnly
              value={reorderLink}
              onFocus={(e) => e.target.select()}
              aria-label="Reorder link for this request"
              className="data min-w-0 flex-1 border border-primary/15 bg-surface px-3 py-2 text-[12px] text-primary focus:border-secondary-ink focus:outline-none"
            />
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(reorderLink)}
              className="shrink-0 bg-primary-soft px-4 py-2 text-[13px] font-semibold text-on-primary hover:bg-secondary-ink"
            >
              Copy
            </button>
          </div>
          <p className="mt-3 text-[12px] text-ink/70">
            <Link href="/quote/saved" className="font-semibold text-secondary-ink hover:underline">
              Saved lists on this device →
            </Link>
          </p>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/catalog"
            className="bg-accent px-6 py-3 text-[14px] font-semibold text-on-accent hover:bg-accent/90"
          >
            Back to catalogue
          </Link>
          <a
            href={`mailto:${company.quoteEmail}`}
            className="border border-primary/20 px-6 py-3 text-[14px] font-semibold text-primary hover:border-secondary-ink hover:text-secondary-ink"
          >
            Email the sales team
          </a>
        </div>
        <p className="mt-10 text-center text-[12px] text-ink/70">
          Demonstration build — nothing was actually sent.
        </p>
      </div>
    );
  }

  /* ---------------- builder ---------------- */

  return (
    <div className="mx-auto max-w-shell px-6 py-12">
      <div className="max-w-2xl">
        <Eyebrow>Quote request</Eyebrow>
        <h1 className="h-display mt-3 text-[30px] text-primary md:text-[40px]">
          Build your request
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink/70">
          No account needed. Add parts from the catalogue or paste a list, tell us where it is
          going and when the vessel sails, and we will return a formal quotation within{" "}
          {company.responseTime}.
        </p>
      </div>

      {/* a shared list arrived and there is already something in the basket */}
      {incoming && (
        <div className="mt-8 border border-accent bg-accent/[0.07] p-5">
          <p className="text-[14px] font-semibold text-primary">
            A shared list of {incoming.lines.length} line
            {incoming.lines.length === 1 ? "" : "s"} was opened.
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink/80">
            You already have {lines.length} line{lines.length === 1 ? "" : "s"} in your request. We
            will not overwrite it without asking.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => importIncoming("merge")}
              className="bg-accent px-4 py-2 text-[13px] font-semibold text-on-accent hover:bg-accent/90"
            >
              Merge into my list
            </button>
            <button
              type="button"
              onClick={() => importIncoming("replace")}
              className="border border-primary/25 px-4 py-2 text-[13px] font-semibold text-primary hover:border-secondary-ink hover:text-secondary-ink"
            >
              Replace my list
            </button>
            <button
              type="button"
              onClick={() => setIncoming(null)}
              className="px-2 text-[13px] text-ink/70 hover:text-accent-ink"
            >
              Keep mine, discard the shared list
            </button>
          </div>
        </div>
      )}

      {imported && (
        <p className="mt-8 border border-secondary-ink/40 bg-surface p-4 text-[13px] text-ink/80">
          <span aria-hidden className="data mr-2 font-semibold text-secondary-ink">
            ✓
          </span>
          {imported}
        </p>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_400px]">
        <div className="space-y-8">
          {/* basket */}
          <section className="border border-primary/12 bg-base">
            <div className="flex items-center justify-between border-b border-primary/10 bg-surface px-6 py-4">
              <div>
                <Eyebrow>Line items</Eyebrow>
                <h2 className="h-display mt-2 text-[20px] text-primary">
                  {lines.length} part{lines.length === 1 ? "" : "s"}
                  {count > 0 && (
                    <span className="data ml-2 text-[14px] font-normal text-ink/70">
                      {count} units
                    </span>
                  )}
                </h2>
              </div>
              {lines.length > 0 && (
                <button
                  type="button"
                  onClick={clear}
                  className="text-[13px] font-semibold text-accent-ink hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {lines.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-[15px] text-ink/70">No parts added yet.</p>
                <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-ink/70">
                  Search the catalogue and use “Add to quote”, or paste a parts list below.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/catalog"
                    className="inline-block border border-primary/20 px-5 py-2.5 text-[13px] font-semibold text-primary hover:border-secondary-ink hover:text-secondary-ink"
                  >
                    Browse the catalogue
                  </Link>
                  <Link
                    href="/cross-reference"
                    className="inline-block border border-primary/20 px-5 py-2.5 text-[13px] font-semibold text-primary hover:border-secondary-ink hover:text-secondary-ink"
                  >
                    Cross-reference a competitor part
                  </Link>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-primary/8">
                {lines.map((l) => (
                  <BasketLine
                    key={l.id}
                    line={l}
                    product={byId.get(l.id) || null}
                    requirements={requirements}
                    sailDate={datePassed ? "" : sailDate}
                    destination={destination}
                    daysAvailable={daysAvailable}
                    catalogue={catalogue}
                    split={splits.includes(l.id)}
                    onSplit={toggleSplit}
                  />
                ))}
              </ul>
            )}
          </section>

          <PasteTool catalogue={catalogue} />

          <ShareTools
            lines={lines}
            note={note}
            setNote={setNote}
            onImport={(parsed) => receive(rebuild(parsed), parsed.note, "list file")}
          />
        </div>

        {/* form */}
        <form onSubmit={submit} className="space-y-5 self-start border border-primary/12 bg-base p-6 lg:sticky lg:top-28">
          <div>
            <Eyebrow>Your details</Eyebrow>
            <p className="mt-2 text-[13px] leading-relaxed text-ink/70">
              We quote to companies and to individual owners alike. Vessel details help us confirm
              fitment and delivery.
            </p>
          </div>

          <Field label="Company name" required>
            <input required name="company" className={input} placeholder="Gulf Marine Services LLC" />
          </Field>
          <Field label="Contact name" required>
            <input required name="contact" className={input} placeholder="Full name" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Email" required>
              <input required type="email" name="email" className={input} placeholder="name@company.com" />
            </Field>
            <Field label="Phone" required>
              <input required name="phone" className={input} placeholder="+971 …" />
            </Field>
          </div>
          <Field label="Tax registration (TRN)">
            <input name="trn" className={`${input} data`} placeholder="100XXXXXXXXXXXX" />
          </Field>
          <Field label="Vessel name or IMO">
            <input name="vessel" className={input} placeholder="MV Example / IMO 9XXXXXX" />
          </Field>
          <Field label="Delivery port or address" required hint="Include berth or anchorage if delivering to vessel.">
            <input
              required
              name="port"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className={input}
              placeholder="Jebel Ali, Berth 12"
            />
          </Field>

          {/* ── the question behind the request ── */}
          <div className="border border-primary/12 bg-surface p-4">
            <Field
              label="Vessel sails / required on board"
              hint="We work back from Dubai stock, the balance lead time and freight transit."
            >
              <input
                type="date"
                name="requiredBy"
                value={sailDate}
                onChange={(e) => setSailDate(e.target.value)}
                className={input}
              />
            </Field>
            <label className="mt-3 block">
              <span className="text-[13px] font-medium text-primary">Freight destination</span>
              <select
                value={destOverride || destinationFromPort(port)}
                onChange={(e) => setDestOverride(e.target.value)}
                aria-label="Freight destination"
                className={input}
              >
                {DESTINATIONS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label} — {d.transitDays} day{d.transitDays === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[12px] text-ink/70">
                {destOverride
                  ? "Set by you."
                  : port
                    ? `Read from “${port}”. Change it if that is wrong.`
                    : "Defaults to UAE until you enter a delivery port."}
              </span>
            </label>
            {datePassed && (
              <p className="mt-3 text-[12px] text-accent-ink">
                That sailing date has already passed.
              </p>
            )}
          </div>

          <Field label="Your PO reference">
            <input name="po" className={input} placeholder="PO-2026-…" />
          </Field>
          <Field label="Notes">
            <textarea
              name="notes"
              rows={3}
              className={`${input} resize-y`}
              placeholder="Switchboard panel reference, drawing number, urgency…"
            />
          </Field>

          <div className="border-t border-primary/10 pt-5">
            {/* ── the ETA summary, immediately above the button ── */}
            {summary && (
              <div
                className={`mb-4 border p-4 ${
                  summary.worst === "miss"
                    ? "border-accent bg-accent/[0.07]"
                    : summary.worst === "tight"
                      ? "border-accent-ink/40 bg-surface"
                      : "border-secondary-ink/40 bg-surface"
                }`}
              >
                <p className="text-[13px] font-semibold leading-relaxed text-primary">
                  {summary.sentence}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {summary.makes > 0 && <EtaBadge verdict="makes" label={`${summary.makes} in time`} />}
                  {summary.tight > 0 && <EtaBadge verdict="tight" label={`${summary.tight} tight`} />}
                  {summary.miss > 0 && <EtaBadge verdict="miss" label={`${summary.miss} will miss`} />}
                  {summary.unknown > 0 && (
                    <EtaBadge verdict="unknown" label={`${summary.unknown} to confirm`} />
                  )}
                </div>
                <p className="mt-2.5 text-[12px] leading-relaxed text-ink/75">
                  Based on Dubai stock at the quantities above plus {destination.transitDays} day
                  {destination.transitDays === 1 ? "" : "s"} transit to {destination.short}. Lines
                  that miss are marked in the list with the alternatives available.
                </p>
                {splits.length > 0 && (
                  <p className="mt-2 text-[12px] text-secondary-ink">
                    {splits.length} line{splits.length === 1 ? "" : "s"} flagged for split shipment.
                  </p>
                )}
              </div>
            )}

            <p className="data text-[12px] text-ink/70">
              {lines.length} line{lines.length === 1 ? "" : "s"} · {count} unit
              {count === 1 ? "" : "s"} will be attached
            </p>
            <button
              type="submit"
              disabled={lines.length === 0}
              className="mt-3 w-full bg-accent px-6 py-3.5 text-[14px] font-semibold text-on-accent transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-primary/12 disabled:text-primary/70"
            >
              Send quote request
            </button>
            {lines.length === 0 && (
              <p className="mt-2 text-center text-[12px] text-ink/70">
                Add at least one part to send a request.
              </p>
            )}
            <p className="mt-4 text-[12px] leading-relaxed text-ink/70">
              Sent to {company.quoteEmail}. We reply within {company.responseTime}. Prices are
              quoted exclusive of VAT; UAE supply is invoiced with 5% VAT and our TRN.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
