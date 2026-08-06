"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MatchBadge } from "./Bits";

const flatten = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Part-number-first lookup. Buyers arrive with an identifier, not a product name,
 * so exact and prefix matches on the part number always outrank description text.
 */
function rankProducts(index, q) {
  const term = q.trim().toLowerCase();
  if (!term) return [];
  const flat = flatten(term);
  const out = [];
  for (const it of index) {
    const pn = it.p.toLowerCase();
    const pf = flatten(pn);
    let s = 0;
    if (pn === term || pf === flat) s = 1000;
    else if (pf.startsWith(flat)) s = 700;
    else if (pf.includes(flat)) s = 500;
    else if (`${it.n} ${it.c}`.toLowerCase().includes(term)) s = 200;
    if (s) out.push({ score: s, kind: "product", item: it });
  }
  return out;
}

/**
 * The other way buyers arrive: holding a failed competitor part. A cross-reference
 * hit outranks a loose catalogue substring match, because an exact competitor
 * number is a much stronger signal than three shared characters.
 */
function rankCrossrefs(xrefIndex, byId, q) {
  const flat = flatten(q);
  if (flat.length < 3) return [];
  const rank = { direct: 0, functional: 1, consult: 2 };
  const out = [];
  for (const x of xrefIndex) {
    const pf = flatten(x.x);
    let s = 0;
    if (pf === flat) s = 1000;
    else if (pf.startsWith(flat)) s = 690;
    else if (flat.length >= 5 && pf.includes(flat)) s = 460;
    if (!s) continue;
    const target = byId.get(x.i);
    if (!target) continue;
    out.push({ score: s - rank[x.t], kind: "xref", item: x, target });
  }
  return out;
}

export default function PartSearch({ index, xrefIndex = [], size = "hero" }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const box = useRef(null);

  const byId = useMemo(() => new Map(index.map((it) => [it.i, it])), [index]);

  const hits = useMemo(() => {
    if (!q.trim()) return [];
    const merged = [...rankProducts(index, q), ...rankCrossrefs(xrefIndex, byId, q)];
    merged.sort((a, b) => b.score - a.score);
    const seen = new Set();
    const out = [];
    for (const h of merged) {
      const key = h.kind === "xref" ? `x:${h.item.x}` : `p:${h.item.i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(h);
      if (out.length === 7) break;
    }
    return out;
  }, [index, xrefIndex, byId, q]);

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

  function go(hit) {
    setOpen(false);
    router.push(`/product/${hit.kind === "xref" ? hit.item.i : hit.item.i}`);
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
        className={`flex items-center border bg-on-primary/[0.04] ${
          hero
            ? "border-tint/25 focus-within:border-secondary-ink"
            : "border-primary/15 bg-base focus-within:border-secondary-ink"
        }`}
      >
        <span
          className={`eyebrow shrink-0 border-r px-4 ${
            hero ? "border-tint/20 text-tint/90" : "border-primary/10 text-secondary-ink"
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
          placeholder={hero ? "LMB22, A202A, or a competitor number" : "Search part number or description"}
          aria-label="Search by part number"
          className={`data w-full min-w-0 bg-transparent placeholder:text-current/30 focus:outline-none ${
            hero
              ? "px-5 py-5 text-[17px] text-on-primary placeholder:text-tint/90 md:text-[19px]"
              : "px-4 py-3 text-[14px] text-primary placeholder:text-ink/70"
          }`}
        />
        <button
          type="button"
          onClick={() => q.trim() && router.push(`/catalog?q=${encodeURIComponent(q.trim())}`)}
          className={`shrink-0 bg-accent font-semibold text-on-accent transition-colors hover:bg-accent/90 ${
            hero ? "px-7 py-5 text-[14px]" : "px-5 py-3 text-[13px]"
          }`}
        >
          Search
        </button>
      </div>

      {open && q.trim() && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 border border-primary/12 bg-base shadow-xl">
          {hits.length === 0 ? (
            <div className="px-5 py-5">
              <p className="text-[14px] text-ink/70">
                No part matches <span className="data text-primary">{q}</span>.
              </p>
              <p className="mt-1.5 text-[13px] text-ink/70">
                We source beyond the listed catalogue, and our cross-reference table is still
                growing. Send it to us and we&apos;ll confirm what replaces it.
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                <button
                  type="button"
                  onClick={() => router.push(`/quote?add=${encodeURIComponent(q.trim())}`)}
                  className="text-[13px] font-semibold text-accent-ink hover:underline"
                >
                  Request this part →
                </button>
                <Link
                  href="/cross-reference"
                  className="text-[13px] font-semibold text-secondary-ink hover:underline"
                >
                  Find a replacement →
                </Link>
              </div>
            </div>
          ) : (
            <ul role="listbox">
              {hits.map((h, i) =>
                h.kind === "xref" ? (
                  <li key={`x:${h.item.x}`}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(h)}
                      className={`flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-primary/6 border-l-[3px] border-l-accent-ink px-4 py-3 text-left last:border-b-0 ${
                        i === active ? "bg-tint/30" : "bg-surface"
                      }`}
                    >
                      <span className="eyebrow w-full text-ink/70">Replacement for</span>
                      <span className="data text-[13px] text-ink/75 line-through decoration-ink/60">
                        {h.item.x}
                      </span>
                      <span aria-hidden className="data text-[13px] text-ink/70">
                        →
                      </span>
                      <span className="data text-[13px] font-semibold text-secondary-ink">
                        {h.target.p}
                      </span>
                      <MatchBadge type={h.item.t} />
                      <span className="w-full truncate text-[12px] text-ink/75">
                        {h.item.b} {h.item.x} · replaced by {h.target.n}
                      </span>
                    </button>
                  </li>
                ) : (
                  <li key={`p:${h.item.i}`}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(h)}
                      className={`flex w-full items-center gap-4 border-b border-primary/6 px-4 py-3 text-left last:border-0 ${
                        i === active ? "bg-tint/25" : "bg-base"
                      }`}
                    >
                      <span className="data w-32 shrink-0 text-[13px] font-medium text-secondary-ink">
                        {h.item.p}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink/80">
                        {h.item.n}
                      </span>
                      <span className="eyebrow hidden shrink-0 text-ink/70 md:block">
                        {h.item.c}
                      </span>
                    </button>
                  </li>
                )
              )}
              <li>
                <button
                  type="button"
                  onClick={() => router.push(`/catalog?q=${encodeURIComponent(q.trim())}`)}
                  className="w-full bg-surface px-4 py-2.5 text-left text-[12px] font-semibold text-primary-soft hover:bg-tint/40"
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
