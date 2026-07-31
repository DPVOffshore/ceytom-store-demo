"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Part-number-first lookup. Buyers arrive with an identifier, not a product name,
 * so exact and prefix matches on the part number always outrank description text.
 */
function rank(index, q) {
  const term = q.trim().toLowerCase();
  if (!term) return [];
  const flat = term.replace(/[^a-z0-9]/g, "");
  const out = [];
  for (const it of index) {
    const pn = it.p.toLowerCase();
    const pf = pn.replace(/[^a-z0-9]/g, "");
    let s = 0;
    if (pn === term || pf === flat) s = 1000;
    else if (pf.startsWith(flat)) s = 700;
    else if (pf.includes(flat)) s = 500;
    else if (`${it.n} ${it.c}`.toLowerCase().includes(term)) s = 200;
    if (s) out.push([s, it]);
  }
  out.sort((a, b) => b[0] - a[0] || a[1].p.localeCompare(b[1].p));
  return out.slice(0, 7).map((x) => x[1]);
}

export default function PartSearch({ index, size = "hero" }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const box = useRef(null);

  const hits = useMemo(() => rank(index, q), [index, q]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  useEffect(() => {
    function onClick(e) {
      if (box.current && !box.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function go(item) {
    setOpen(false);
    router.push(`/product/${item.i}`);
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (hits[active]) go(hits[active]);
      else if (q.trim()) router.push(`/catalog?q=${encodeURIComponent(q.trim())}`);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const hero = size === "hero";

  return (
    <div ref={box} className="relative">
      <div
        className={`flex items-center border bg-white/[0.04] ${
          hero
            ? "border-tint/25 focus-within:border-teal"
            : "border-navy/15 bg-white focus-within:border-teal"
        }`}
      >
        <span
          className={`eyebrow shrink-0 border-r px-4 ${
            hero ? "border-tint/20 text-tint/70" : "border-navy/10 text-tealink"
          } ${hero ? "py-5" : "py-3"}`}
        >
          Part no.
        </span>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={hero ? "LMB22, A202A, TARA120E…" : "Search part number or description"}
          aria-label="Search by part number"
          className={`data w-full bg-transparent placeholder:text-current/30 focus:outline-none ${
            hero
              ? "px-5 py-5 text-[17px] text-white placeholder:text-tint/70 md:text-[19px]"
              : "px-4 py-3 text-[14px] text-navy placeholder:text-slate/70"
          }`}
        />
        <button
          type="button"
          onClick={() => q.trim() && router.push(`/catalog?q=${encodeURIComponent(q.trim())}`)}
          className={`shrink-0 bg-coral font-semibold text-navy transition-colors hover:bg-coral/90 ${
            hero ? "px-7 py-5 text-[14px]" : "px-5 py-3 text-[13px]"
          }`}
        >
          Search
        </button>
      </div>

      {open && q.trim() && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 border border-navy/12 bg-white shadow-xl">
          {hits.length === 0 ? (
            <div className="px-5 py-5">
              <p className="text-[14px] text-slate/70">
                No part matches <span className="data text-navy">{q}</span>.
              </p>
              <p className="mt-1.5 text-[13px] text-slate/70">
                We source beyond the listed catalogue — send it to us as a quote request and
                we&apos;ll confirm availability.
              </p>
              <button
                type="button"
                onClick={() => router.push(`/quote?add=${encodeURIComponent(q.trim())}`)}
                className="mt-3 text-[13px] font-semibold text-coralink hover:underline"
              >
                Request this part →
              </button>
            </div>
          ) : (
            <ul role="listbox">
              {hits.map((h, i) => (
                <li key={h.i}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(h)}
                    className={`flex w-full items-center gap-4 border-b border-navy/6 px-4 py-3 text-left last:border-0 ${
                      i === active ? "bg-tint/25" : "bg-white"
                    }`}
                  >
                    <span className="data w-32 shrink-0 text-[13px] font-medium text-tealink">
                      {h.p}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-slate/80">
                      {h.n}
                    </span>
                    <span className="eyebrow hidden shrink-0 text-slate/70 md:block">
                      {h.c}
                    </span>
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => router.push(`/catalog?q=${encodeURIComponent(q.trim())}`)}
                  className="w-full bg-mist px-4 py-2.5 text-left text-[12px] font-semibold text-deep hover:bg-tint/40"
                >
                  See all matches for “{q.trim()}” →
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
