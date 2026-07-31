"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRfq } from "./RfqProvider";
import { PartNumber, Eyebrow } from "./Bits";

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
  const { addMany } = useRfq();
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

  return (
    <section className="border border-navy/12 bg-white">
      <div className="border-b border-navy/10 bg-mist px-6 py-4">
        <Eyebrow>Bulk entry</Eyebrow>
        <h2 className="h-display mt-2 text-[20px] text-navy">Paste or upload a parts list</h2>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-slate/75">
          One part number per line, with an optional quantity — <span className="data">LMB22, 4</span>{" "}
          or <span className="data">A202A x 2</span>. We match each line against the catalogue and
          show you what we could not find.
        </p>
      </div>

      <div className="p-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          placeholder={"LMB22, 4\nA202A x 2\nTARA120E\nSA80, 1"}
          aria-label="Parts list"
          className="data w-full resize-y border border-navy/15 bg-white p-4 text-[13px] leading-relaxed text-navy placeholder:text-slate/70 focus:border-teal focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => run()}
            className="bg-deep px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-teal"
          >
            Match against catalogue
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="border border-navy/20 px-5 py-2.5 text-[13px] font-semibold text-navy transition-colors hover:border-teal hover:text-tealink"
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
              className="text-[13px] text-slate/70 hover:text-coralink"
            >
              Clear
            </button>
          )}
        </div>

        {result && (
          <div className="mt-6 space-y-5">
            <div className="flex flex-wrap items-center gap-4 border-y border-navy/10 py-3">
              <p className="data text-[13px] text-tealink">{result.matched.length} matched</p>
              <p className="data text-[13px] text-coralink">{result.unmatched.length} not found</p>
              {result.matched.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    addMany(result.matched);
                    setResult(null);
                    setText("");
                  }}
                  className="ml-auto bg-coral px-4 py-2 text-[13px] font-semibold text-navy hover:bg-coral/90"
                >
                  Add {result.matched.length} matched lines to request
                </button>
              )}
            </div>

            {result.matched.length > 0 && (
              <div>
                <p className="eyebrow text-slate/70">Matched</p>
                <ul className="mt-2 divide-y divide-navy/8 border border-navy/10">
                  {result.matched.map((m, i) => (
                    <li key={i} className="flex items-center gap-4 px-4 py-2.5">
                      <span className="data w-28 shrink-0 text-[13px] font-medium text-tealink">
                        {m.product.partNumber}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-slate/75">
                        {m.product.name}
                      </span>
                      <span className="data shrink-0 text-[12px] text-slate/70">× {m.qty}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.unmatched.length > 0 && (
              <div>
                <p className="eyebrow text-slate/70">Not in the listed catalogue</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate/70">
                  These will still be sent with your request — we source beyond what is listed
                  and will confirm availability.
                </p>
                <ul className="mt-2 divide-y divide-navy/8 border border-coral/25 bg-coral/[0.04]">
                  {result.unmatched.map((u, i) => (
                    <li key={i} className="data px-4 py-2.5 text-[13px] text-slate/70">
                      {u.raw}
                    </li>
                  ))}
                </ul>
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
        <span className="text-[13px] font-medium text-navy">{label}</span>
        {required ? (
          <span className="data text-[11px] text-coralink">required</span>
        ) : (
          <span className="data text-[11px] text-slate/70">optional</span>
        )}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-slate/70">{hint}</span>}
    </label>
  );
}

const input =
  "mt-1.5 w-full border border-navy/15 bg-white px-3.5 py-2.5 text-[14px] text-navy placeholder:text-slate/70 focus:border-teal focus:outline-none";

export default function QuoteBuilder({ catalogue, company }) {
  const { lines, setQty, remove, clear, count } = useRfq();
  const [sent, setSent] = useState(false);
  const [ref, setRef] = useState("");

  function submit(e) {
    e.preventDefault();
    // Mock submission — a real build posts to the sales inbox and logs a draft order.
    setRef(`RFQ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`);
    setSent(true);
    clear();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <Eyebrow>Request received</Eyebrow>
        <h1 className="h-display mt-4 text-[30px] text-navy">Your request has been sent</h1>
        <p className="data mt-4 text-[15px] text-tealink">{ref}</p>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-slate/70">
          Our sales team will respond with a formal quotation within {company.responseTime},
          including unit pricing, lead time, freight and applicable VAT. A copy has been sent to
          the email address you provided.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/catalog"
            className="bg-coral px-6 py-3 text-[14px] font-semibold text-navy hover:bg-coral/90"
          >
            Back to catalogue
          </Link>
          <a
            href={`mailto:${company.quoteEmail}`}
            className="border border-navy/20 px-6 py-3 text-[14px] font-semibold text-navy hover:border-teal hover:text-tealink"
          >
            Email the sales team
          </a>
        </div>
        <p className="mt-10 text-[12px] text-slate/70">
          Demonstration build — nothing was actually sent.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-shell px-6 py-12">
      <div className="max-w-2xl">
        <Eyebrow>Quote request</Eyebrow>
        <h1 className="h-display mt-3 text-[30px] text-navy md:text-[40px]">
          Build your request
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-slate/70">
          No account needed. Add parts from the catalogue or paste a list, tell us where it is
          going, and we will return a formal quotation within {company.responseTime}.
        </p>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_400px]">
        <div className="space-y-8">
          {/* basket */}
          <section className="border border-navy/12 bg-white">
            <div className="flex items-center justify-between border-b border-navy/10 bg-mist px-6 py-4">
              <div>
                <Eyebrow>Line items</Eyebrow>
                <h2 className="h-display mt-2 text-[20px] text-navy">
                  {lines.length} part{lines.length === 1 ? "" : "s"}
                  {count > 0 && (
                    <span className="data ml-2 text-[14px] font-normal text-slate/70">
                      {count} units
                    </span>
                  )}
                </h2>
              </div>
              {lines.length > 0 && (
                <button
                  type="button"
                  onClick={clear}
                  className="text-[13px] font-semibold text-coralink hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {lines.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-[15px] text-slate/70">No parts added yet.</p>
                <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-slate/70">
                  Search the catalogue and use “Add to quote”, or paste a parts list below.
                </p>
                <Link
                  href="/catalog"
                  className="mt-5 inline-block border border-navy/20 px-5 py-2.5 text-[13px] font-semibold text-navy hover:border-teal hover:text-tealink"
                >
                  Browse the catalogue
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-navy/8">
                {lines.map((l) => (
                  <li key={l.id} className="flex items-center gap-4 px-4 py-4 sm:px-6">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-navy/10 bg-white p-1">
                      {l.image ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={l.image} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <span className="data text-[9px] text-slate/70">n/a</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <PartNumber value={l.partNumber} size="xs" />
                      <p className="mt-1.5 truncate text-[13px] text-slate/75">{l.name}</p>
                      <p className="text-[12px] text-slate/70">{l.brand}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQty(l.id, l.qty - 1)}
                        aria-label={`Decrease quantity of ${l.partNumber}`}
                        className="h-8 w-8 border border-navy/15 text-[15px] text-navy hover:border-teal hover:text-tealink"
                      >
                        −
                      </button>
                      <input
                        value={l.qty}
                        onChange={(e) =>
                          setQty(l.id, parseInt(e.target.value.replace(/\D/g, "") || "1", 10))
                        }
                        aria-label={`Quantity of ${l.partNumber}`}
                        className="data h-8 w-14 border border-navy/15 text-center text-[13px] text-navy focus:border-teal focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setQty(l.id, l.qty + 1)}
                        aria-label={`Increase quantity of ${l.partNumber}`}
                        className="h-8 w-8 border border-navy/15 text-[15px] text-navy hover:border-teal hover:text-tealink"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(l.id)}
                        aria-label={`Remove ${l.partNumber}`}
                        className="ml-1 px-2 text-[13px] text-slate/70 hover:text-coralink"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <PasteTool catalogue={catalogue} />
        </div>

        {/* form */}
        <form onSubmit={submit} className="space-y-5 self-start border border-navy/12 bg-white p-6 lg:sticky lg:top-28">
          <div>
            <Eyebrow>Your details</Eyebrow>
            <p className="mt-2 text-[13px] leading-relaxed text-slate/70">
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
            <input required name="port" className={input} placeholder="Jebel Ali, Berth 12" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Required by">
              <input type="date" name="requiredBy" className={input} />
            </Field>
            <Field label="Your PO reference">
              <input name="po" className={input} placeholder="PO-2026-…" />
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              name="notes"
              rows={3}
              className={`${input} resize-y`}
              placeholder="Switchboard panel reference, drawing number, urgency…"
            />
          </Field>

          <div className="border-t border-navy/10 pt-5">
            <p className="data text-[12px] text-slate/70">
              {lines.length} line{lines.length === 1 ? "" : "s"} · {count} unit
              {count === 1 ? "" : "s"} will be attached
            </p>
            <button
              type="submit"
              disabled={lines.length === 0}
              className="mt-3 w-full bg-coral px-6 py-3.5 text-[14px] font-semibold text-navy transition-colors hover:bg-coral/90 disabled:cursor-not-allowed disabled:bg-navy/12 disabled:text-navy/70"
            >
              Send quote request
            </button>
            {lines.length === 0 && (
              <p className="mt-2 text-center text-[12px] text-slate/70">
                Add at least one part to send a request.
              </p>
            )}
            <p className="mt-4 text-[12px] leading-relaxed text-slate/70">
              Sent to {company.quoteEmail}. We reply within {company.responseTime}. Prices are
              quoted exclusive of VAT; UAE supply is invoiced with 5% VAT and our TRN.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
