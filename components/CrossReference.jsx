"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRfq } from "./RfqProvider";
import { PartNumber, CompetitorPn, MatchBadge, Stock, Eyebrow } from "./Bits";
import { moqOf } from "@/lib/availability";

const normalise = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * Same tolerant parser as the request page's paste tool: one reference per line,
 * optional quantity, comma / tab / semicolon separated. A competitor BOM pasted
 * straight out of a spreadsheet has to work first time.
 */
function parseRows(text, resolve) {
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return rows.map((row) => {
    const cells = row.split(/[\t,;|]+/).map((c) => c.trim()).filter(Boolean);
    let pn = cells[0] || row;
    let qty = 1;

    if (cells.length > 1) {
      const last = cells[cells.length - 1];
      const n = parseInt(last.replace(/[^\d]/g, ""), 10);
      if (!Number.isNaN(n) && n > 0 && n < 10000 && !resolve(last)) qty = n;
    } else {
      const m = row.match(/^(.*?)\s*[x×*]\s*(\d{1,4})$/i) || row.match(/^(.+?)\s+(\d{1,4})$/);
      if (m && m[1].trim() && resolve(m[1])) {
        pn = m[1].trim();
        qty = parseInt(m[2], 10);
      }
      const rev = row.match(/^(\d{1,4})\s*[x×*]\s*(.+)$/i);
      if (rev && resolve(rev[2])) {
        qty = parseInt(rev[1], 10);
        pn = rev[2].trim();
      }
    }
    return { raw: row, pn, qty };
  });
}

function ResultRow({ row, onAdd }) {
  const { has } = useRfq();
  const inBasket = row.product ? has(row.product.id) : has(`free:${normalise(row.pn).toLowerCase()}`);

  return (
    <tr className="border-b border-primary/8 last:border-0 align-top">
      <td className="px-3 py-3">
        {row.kind === "own" ? (
          <span className="data text-[12px] text-ink/70">{row.pn}</span>
        ) : (
          <CompetitorPn value={row.pn} />
        )}
        {row.qty > 1 && <span className="data ml-2 text-[12px] text-ink/70">× {row.qty}</span>}
      </td>

      <td className="px-3 py-3">
        {row.product ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <PartNumber value={row.product.partNumber} size="xs" />
              {row.entry && <MatchBadge type={row.entry.matchType} />}
              {row.kind === "own" && (
                <span className="data border border-secondary-ink/50 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-secondary-ink">
                  Our part
                </span>
              )}
            </div>
            <Link
              href={`/product/${row.product.id}`}
              className="mt-1.5 block text-[13px] leading-snug text-primary hover:text-secondary-ink"
            >
              {row.product.name}
            </Link>
            {row.entry?.note && (
              <p className="mt-1 max-w-md text-[12px] leading-relaxed text-ink/70">{row.entry.note}</p>
            )}
          </>
        ) : (
          <p className="text-[13px] leading-relaxed text-ink/75">
            Not in the cross-reference table yet. Send it with your request and our sales team will
            identify the equivalent.
          </p>
        )}
      </td>

      <td className="px-3 py-3">
        {row.product ? (
          <Stock product={row.product} qty={row.qty} detail />
        ) : (
          <span className="text-[12px] text-ink/70">Confirmed on quotation</span>
        )}
      </td>

      <td className="px-3 py-3 text-right">
        <button
          type="button"
          onClick={() => onAdd(row)}
          disabled={inBasket}
          className={`border bg-base px-3 py-1.5 text-[12px] font-semibold transition-colors ${
            inBasket
              ? "cursor-not-allowed border-primary/15 bg-surface text-ink/70"
              : row.product
                ? "border-accent-ink text-accent-ink hover:bg-accent hover:text-on-accent"
                : "border-primary/25 text-primary hover:border-secondary-ink hover:text-secondary-ink"
          }`}
        >
          {inBasket ? "Added" : row.product ? "Add" : "Add as enquiry"}
        </button>
      </td>
    </tr>
  );
}

export default function CrossReference({ entries, catalogue, brands, disclaimer, coverage }) {
  const { add, addFree } = useRfq();
  const [text, setText] = useState("");
  const [rows, setRows] = useState(null);
  const [brand, setBrand] = useState(null);
  const [browseLimit, setBrowseLimit] = useState(24);
  const fileRef = useRef(null);

  const byId = useMemo(() => new Map(catalogue.map((p) => [p.id, p])), [catalogue]);

  const xrefIndex = useMemo(() => {
    const m = new Map();
    for (const e of entries) {
      const key = normalise(e.competitorPn);
      if (!m.has(key)) m.set(key, e);
    }
    return m;
  }, [entries]);

  const ownIndex = useMemo(() => {
    const m = new Map();
    for (const p of catalogue) m.set(normalise(p.partNumber), p);
    return m;
  }, [catalogue]);

  const resolve = (s) => xrefIndex.has(normalise(s)) || ownIndex.has(normalise(s));

  function run(value) {
    const v = value ?? text;
    if (!v.trim()) {
      setRows(null);
      return;
    }
    const parsed = parseRows(v, resolve).map((row) => {
      const key = normalise(row.pn);
      const own = ownIndex.get(key);
      if (own) return { ...row, kind: "own", product: own, entry: null };
      const entry = xrefIndex.get(key);
      if (entry) return { ...row, kind: "xref", product: byId.get(entry.ceytomId) || null, entry };
      return { ...row, kind: "none", product: null, entry: null };
    });
    setRows(parsed);
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

  function addRow(row) {
    if (row.product) add(row.product, Math.max(row.qty, moqOf(row.product)));
    else
      addFree({
        id: `free:${normalise(row.pn).toLowerCase()}`,
        partNumber: row.pn,
        name: "Competitor reference — sales will identify the equivalent",
        qty: row.qty,
      });
  }

  function addAll(subset) {
    subset.forEach(addRow);
  }

  const matched = rows?.filter((r) => r.product) ?? [];
  const unmatched = rows?.filter((r) => !r.product) ?? [];

  const brandCounts = useMemo(() => {
    const c = {};
    for (const e of entries) c[e.brand] = (c[e.brand] || 0) + 1;
    return c;
  }, [entries]);

  const browse = useMemo(() => {
    if (!brand) return [];
    return entries.filter((e) => e.brand === brand);
  }, [entries, brand]);

  const input =
    "w-full border border-primary/15 bg-base px-3.5 py-2.5 text-[14px] text-primary placeholder:text-ink/70 focus:border-secondary-ink focus:outline-none";

  return (
    <div className="mx-auto max-w-shell px-6 py-12">
      <div className="max-w-3xl">
        <Eyebrow>Cross-reference</Eyebrow>
        <h1 className="h-display mt-3 text-[30px] text-primary md:text-[40px]">
          What replaces the part in your hand?
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink/75">
          A failed Telemecanique XB4, an Allen-Bradley 800F, a Moeller M22 — enter the number off
          the nameplate and we will show what we supply against it. Paste a whole competitor bill of
          materials and we will work through the lot.
        </p>
      </div>

      {/* Coverage honesty — stated up front, not buried in a footnote. */}
      <div className="mt-8 border border-primary/12 bg-surface p-5">
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
          <p className="text-[14px] text-ink/80">
            <span className="data font-semibold text-primary">{coverage.entries}</span> competitor
            references, over{" "}
            <span className="data font-semibold text-primary">{coverage.products}</span> of our{" "}
            <span className="data">{coverage.total}</span> listed parts, across{" "}
            <span className="data font-semibold text-primary">{brands.length}</span> manufacturers.
          </p>
        </div>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink/75">
          This table covers a subset of the catalogue and is being extended. A number that is not
          here does not mean we cannot supply it — most of what we cross-reference has not been
          entered yet. Send anything you cannot find and we will identify it and add it.
        </p>
      </div>

      {/* ── lookup ── */}
      <section className="mt-10 border border-primary/12 bg-base">
        <div className="border-b border-primary/10 bg-surface px-6 py-4">
          <Eyebrow>Lookup</Eyebrow>
          <h2 className="h-display mt-2 text-[20px] text-primary">
            Enter competitor part numbers
          </h2>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-ink/75">
            One per line, with an optional quantity — <span className="data">XB4-BA31, 4</span> or{" "}
            <span className="data">M22-D-G x 2</span>. Our own part numbers are recognised too, so a
            mixed list works.
          </p>
        </div>

        <div className="p-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            placeholder={"XB4-BA31, 4\nM22-PV\n800FP-F4 x 2\n3SU1050-1HB20-0AA0"}
            aria-label="Competitor part numbers"
            className="data w-full resize-y border border-primary/15 bg-base p-4 text-[13px] leading-relaxed text-primary placeholder:text-ink/70 focus:border-secondary-ink focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => run()}
              className="bg-primary-soft px-5 py-2.5 text-[13px] font-semibold text-on-primary transition-colors hover:bg-secondary-ink"
            >
              Find equivalents
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
                  setRows(null);
                }}
                className="text-[13px] text-ink/70 hover:text-accent-ink"
              >
                Clear
              </button>
            )}
          </div>

          {rows && (
            <div className="mt-6">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-primary/10 py-3">
                <p className="data text-[13px] text-secondary-ink">
                  {matched.length} equivalent{matched.length === 1 ? "" : "s"} found
                </p>
                <p className="data text-[13px] text-accent-ink">{unmatched.length} to identify</p>
                {rows.length > 0 && (
                  <button
                    type="button"
                    onClick={() => addAll(rows)}
                    className="ml-auto bg-accent px-4 py-2 text-[13px] font-semibold text-on-accent hover:bg-accent/90"
                  >
                    Add all {rows.length} line{rows.length === 1 ? "" : "s"} to request
                  </button>
                )}
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-primary/15">
                      <th className="eyebrow px-3 py-2 font-medium text-ink/70">Your part</th>
                      <th className="eyebrow px-3 py-2 font-medium text-ink/70">Ceytom equivalent</th>
                      <th className="eyebrow px-3 py-2 font-medium text-ink/70">Availability</th>
                      <th className="eyebrow px-3 py-2 text-right font-medium text-ink/70">Request</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <ResultRow key={`${row.raw}-${i}`} row={row} onAdd={addRow} />
                    ))}
                  </tbody>
                </table>
              </div>

              {unmatched.length > 0 && (
                <p className="mt-4 border-y border-r border-l-[3px] border-accent-ink/30 border-l-accent-ink bg-accent/[0.05] p-4 text-[13px] leading-relaxed text-ink/80">
                  <span aria-hidden className="data mr-2 font-semibold">
                    !
                  </span>
                  {unmatched.length} line{unmatched.length === 1 ? "" : "s"} not in the table. They
                  are not a dead end — added to a request they travel to our sales team as written,
                  and we come back with what replaces them.
                </p>
              )}

              <div className="mt-5">
                <Link
                  href="/quote"
                  className="inline-block border border-primary/20 px-5 py-2.5 text-[13px] font-semibold text-primary hover:border-secondary-ink hover:text-secondary-ink"
                >
                  Go to your request →
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── brand cards ── */}
      <section className="mt-16">
        <Eyebrow>By manufacturer</Eyebrow>
        <h2 className="h-display mt-3 text-[24px] text-primary">Brands we cross-reference</h2>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink/75">
          The legacy control gear most often found in a ship&apos;s switchboard. Open one to see
          every reference we hold against it.
        </p>

        <div className="mt-6 grid gap-px border border-primary/10 bg-primary/10 sm:grid-cols-2 lg:grid-cols-4">
          {brands.map((b) => {
            const selected = brand === b;
            return (
              <button
                key={b}
                type="button"
                onClick={() => {
                  setBrand(selected ? null : b);
                  setBrowseLimit(24);
                }}
                aria-pressed={selected}
                className={`p-5 text-left transition-colors ${
                  selected ? "bg-surface" : "bg-base hover:bg-surface"
                }`}
              >
                <p className="h-display text-[17px] leading-tight text-primary">{b}</p>
                <p className="data mt-2 text-[12px] text-ink/70">
                  {brandCounts[b]} references
                </p>
                <p className="mt-3 text-[12px] font-semibold text-secondary-ink">
                  {selected ? "Hide list" : "View list →"}
                </p>
              </button>
            );
          })}
        </div>

        {brand && (
          <div className="mt-6 border border-primary/12 bg-base">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/10 bg-surface px-5 py-3">
              <p className="text-[14px] font-semibold text-primary">
                {brand} — {browse.length} references
              </p>
              <button
                type="button"
                onClick={() => setBrand(null)}
                className="text-[13px] text-ink/70 hover:text-accent-ink"
              >
                Close
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-primary/12">
                    <th className="eyebrow px-4 py-2 font-medium text-ink/70">{brand} part</th>
                    <th className="eyebrow px-4 py-2 font-medium text-ink/70">Ceytom equivalent</th>
                    <th className="eyebrow px-4 py-2 font-medium text-ink/70">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {browse.slice(0, browseLimit).map((e) => {
                    const p = byId.get(e.ceytomId);
                    if (!p) return null;
                    return (
                      <tr key={e.competitorPn} className="border-b border-primary/8 align-top last:border-0">
                        <td className="px-4 py-2.5">
                          <CompetitorPn value={e.competitorPn} />
                        </td>
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/product/${p.id}`}
                            className="data text-[13px] font-medium text-secondary-ink hover:underline"
                          >
                            {p.partNumber}
                          </Link>
                          <span className="ml-2 text-[13px] text-ink/75">{p.name}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <MatchBadge type={e.matchType} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {browse.length > browseLimit && (
              <div className="border-t border-primary/10 p-4 text-center">
                <button
                  type="button"
                  onClick={() => setBrowseLimit((l) => l + 40)}
                  className="border border-primary/20 px-5 py-2.5 text-[13px] font-semibold text-primary hover:border-secondary-ink hover:text-secondary-ink"
                >
                  Show more · {browse.length - browseLimit} remaining
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── honesty about the data ── */}
      <section className="mt-16 border border-primary/12 bg-primary p-6 text-on-primary md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="h-display text-[20px]">Not finding your part?</p>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-on-primary/90">
              Send us the nameplate details — brand, series, rating, cut-out — and we will come back
              with what replaces it, and add it to this table. Photographs of the failed part are
              welcome; they are usually faster than a part number that has worn off.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/quote"
                className="bg-accent px-5 py-2.5 text-[13px] font-semibold text-on-accent hover:bg-accent/90"
              >
                Send it with a request
              </Link>
              <Link
                href="/contact"
                className="border border-on-primary/25 px-5 py-2.5 text-[13px] font-semibold text-on-primary hover:border-tint hover:text-tint"
              >
                Contact the sales team
              </Link>
            </div>
          </div>
          <div className="border-t border-tint/20 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <p className="eyebrow text-tint/90">How to read a match</p>
            <dl className="mt-3 space-y-3 text-[13px] leading-relaxed">
              <div>
                <dt className="font-semibold">Direct</dt>
                <dd className="text-on-primary/90">
                  Form, fit and function equivalent. Fits the same cut-out, same rating, same wiring.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Functional</dt>
                <dd className="text-on-primary/90">
                  Does the same job with a stated difference — terminal orientation, mounting depth,
                  housing material. The difference is written on every entry.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Consult</dt>
                <dd className="text-on-primary/90">
                  Close, but a variant or rating needs confirming. Sales checks before you order.
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <p className="mt-8 border-t border-tint/20 pt-5 text-[12px] leading-relaxed text-on-primary/90">
          {disclaimer}
        </p>
      </section>
    </div>
  );
}
