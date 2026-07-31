"use client";

import { useMemo, useState, useEffect } from "react";
import ProductCard from "./ProductCard";
import { Eyebrow } from "./Bits";

const CURRENT_BANDS = [
  { id: "0-10", label: "Up to 10 A", min: 0, max: 10 },
  { id: "10-25", label: "10 – 25 A", min: 10, max: 25 },
  { id: "25-63", label: "25 – 63 A", min: 25, max: 63 },
  { id: "63-125", label: "63 – 125 A", min: 63, max: 125 },
  { id: "125+", label: "Above 125 A", min: 125, max: 1e9 },
];

const VOLTAGE_BANDS = [
  { id: "dc-lv", label: "12 – 48 V DC" },
  { id: "v110", label: "110 – 130 V" },
  { id: "v220", label: "220 – 240 V" },
  { id: "v380", label: "380 V and above" },
];

function inVoltageBand(volts, bandId) {
  return volts.some((v) => {
    const n = parseInt(v, 10);
    if (bandId === "dc-lv") return /DC/i.test(v) && n <= 48;
    if (bandId === "v110") return n >= 110 && n <= 130;
    if (bandId === "v220") return n >= 220 && n <= 240;
    if (bandId === "v380") return n >= 380;
    return false;
  });
}

function uniq(list, key) {
  const s = new Set();
  list.forEach((p) => {
    const v = p[key];
    if (Array.isArray(v)) v.forEach((x) => s.add(String(x)));
    else if (v) s.add(String(v));
  });
  const out = [...s];
  if (key === "holeDia" || key === "poles") return out.sort((a, b) => parseInt(a) - parseInt(b));
  return out.sort();
}

function FilterGroup({ title, children, defaultOpen = true, count }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-navy/10 py-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="eyebrow text-slate/70">{title}</span>
        <span className="data flex items-center gap-2 text-[11px] text-slate/70">
          {count ? <span className="text-coral">{count}</span> : null}
          <span>{open ? "−" : "+"}</span>
        </span>
      </button>
      {open && <div className="mt-3 space-y-1.5">{children}</div>}
    </div>
  );
}

function Check({ label, checked, onChange, hint }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-slate/75 hover:text-navy">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-3.5 w-3.5 shrink-0 accent-teal"
      />
      <span className="flex-1 leading-snug">{label}</span>
      {hint != null && <span className="data text-[11px] text-slate/70">{hint}</span>}
    </label>
  );
}

export default function CatalogBrowser({ products, groups, initial }) {
  const [q, setQ] = useState(initial.q || "");
  const [sort, setSort] = useState("relevance");
  const [showFilters, setShowFilters] = useState(false);
  const [limit, setLimit] = useState(36);

  const [f, setF] = useState({
    group: initial.group ? [initial.group] : [],
    category: initial.category ? [initial.category] : [],
    brand: [],
    origin: [],
    certifications: [],
    current: [],
    voltage: [],
    ip: [],
    holeDia: [],
    plateSize: [],
    poles: [],
    stock: [],
  });

  useEffect(() => {
    setLimit(36);
  }, [q, f, sort]);

  function toggle(key, value) {
    setF((prev) => {
      const set = new Set(prev[key]);
      set.has(value) ? set.delete(value) : set.add(value);
      return { ...prev, [key]: [...set] };
    });
  }

  function clearAll() {
    setF({
      group: [], category: [], brand: [], origin: [], certifications: [],
      current: [], voltage: [], ip: [], holeDia: [], plateSize: [], poles: [], stock: [],
    });
    setQ("");
  }

  const activeCount = Object.values(f).reduce((n, arr) => n + arr.length, 0);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const flat = term.replace(/[^a-z0-9]/g, "");

    let out = products.filter((p) => {
      if (f.group.length && !f.group.includes(p.group)) return false;
      if (f.category.length && !f.category.includes(p.category)) return false;
      if (f.brand.length && !f.brand.includes(p.brand)) return false;
      if (f.origin.length && !f.origin.includes(p.origin)) return false;
      if (f.certifications.length &&
          !f.certifications.every((c) => p.certifications.includes(c))) return false;
      if (f.ip.length && !f.ip.some((v) => p.ip.includes(v))) return false;
      if (f.holeDia.length && !f.holeDia.some((v) => p.holeDia.includes(v))) return false;
      if (f.plateSize.length && !f.plateSize.some((v) => p.plateSize.includes(v))) return false;
      if (f.poles.length && !f.poles.some((v) => p.poles.includes(v))) return false;
      if (f.stock.length) {
        const key = p.stock.startsWith("In stock")
          ? "in" : p.stock.startsWith("Low") ? "low" : "sourced";
        if (!f.stock.includes(key)) return false;
      }
      if (f.current.length) {
        const ok = f.current.some((id) => {
          const b = CURRENT_BANDS.find((x) => x.id === id);
          return p.current.some((a) => a > b.min - 0.001 && a <= b.max);
        });
        if (!ok) return false;
      }
      if (f.voltage.length && !f.voltage.some((b) => inVoltageBand(p.voltage, b))) return false;
      return true;
    });

    if (term) {
      const scored = [];
      for (const p of out) {
        const pn = p.partNumber.toLowerCase();
        const pf = pn.replace(/[^a-z0-9]/g, "");
        let s = 0;
        if (pf === flat) s = 1000;
        else if (pf.startsWith(flat)) s = 700;
        else if (pf.includes(flat)) s = 500;
        else {
          const hay = `${p.name} ${p.description} ${p.category} ${p.brand}`.toLowerCase();
          const tokens = term.split(/\s+/).filter(Boolean);
          const hits = tokens.filter((t) => hay.includes(t)).length;
          if (hits === tokens.length) s = 200;
          else if (hits) s = 40 * hits;
        }
        if (s) scored.push([s, p]);
      }
      scored.sort((a, b) => b[0] - a[0]);
      out = scored.map((x) => x[1]);
    }

    if (sort === "part") out = [...out].sort((a, b) => a.partNumber.localeCompare(b.partNumber));
    if (sort === "brand") out = [...out].sort((a, b) => a.brand.localeCompare(b.brand));
    if (sort === "stock")
      out = [...out].sort((a, b) => a.stock.localeCompare(b.stock));

    return out;
  }, [products, q, f, sort]);

  // facet options derived from the products still in play, so filters never dead-end
  const opts = useMemo(
    () => ({
      category: uniq(products.filter((p) => !f.group.length || f.group.includes(p.group)), "category"),
      brand: uniq(products, "brand"),
      origin: uniq(products, "origin"),
      certifications: uniq(products, "certifications"),
      ip: uniq(products, "ip"),
      holeDia: uniq(products, "holeDia"),
      plateSize: uniq(products, "plateSize"),
      poles: uniq(products, "poles"),
    }),
    [products, f.group]
  );

  const rail = (
    <div className="rail max-h-none overflow-visible lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-3">
      <div className="flex items-center justify-between border-b border-navy/10 pb-3">
        <Eyebrow>Filter</Eyebrow>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[12px] font-semibold text-coralink hover:underline"
          >
            Clear {activeCount}
          </button>
        )}
      </div>

      <FilterGroup title="Component family" count={f.group.length}>
        {groups.map((g) => (
          <Check
            key={g.id}
            label={g.name}
            hint={g.count}
            checked={f.group.includes(g.id)}
            onChange={() => toggle("group", g.id)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Product type" count={f.category.length} defaultOpen={false}>
        {opts.category.map((c) => (
          <Check
            key={c}
            label={c}
            checked={f.category.includes(c)}
            onChange={() => toggle("category", c)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Current rating" count={f.current.length}>
        {CURRENT_BANDS.map((b) => (
          <Check
            key={b.id}
            label={b.label}
            checked={f.current.includes(b.id)}
            onChange={() => toggle("current", b.id)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Voltage" count={f.voltage.length}>
        {VOLTAGE_BANDS.map((b) => (
          <Check
            key={b.id}
            label={b.label}
            checked={f.voltage.includes(b.id)}
            onChange={() => toggle("voltage", b.id)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Ingress protection" count={f.ip.length}>
        {opts.ip.map((v) => (
          <Check key={v} label={v} checked={f.ip.includes(v)} onChange={() => toggle("ip", v)} />
        ))}
      </FilterGroup>

      <FilterGroup title="Mounting hole ø" count={f.holeDia.length}>
        {opts.holeDia.map((v) => (
          <Check
            key={v}
            label={v}
            checked={f.holeDia.includes(v)}
            onChange={() => toggle("holeDia", v)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Plate size" count={f.plateSize.length} defaultOpen={false}>
        {opts.plateSize.map((v) => (
          <Check
            key={v}
            label={v}
            checked={f.plateSize.includes(v)}
            onChange={() => toggle("plateSize", v)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Poles" count={f.poles.length} defaultOpen={false}>
        {opts.poles.map((v) => (
          <Check key={v} label={v} checked={f.poles.includes(v)} onChange={() => toggle("poles", v)} />
        ))}
      </FilterGroup>

      <FilterGroup title="Certification" count={f.certifications.length}>
        {opts.certifications.map((v) => (
          <Check
            key={v}
            label={v}
            checked={f.certifications.includes(v)}
            onChange={() => toggle("certifications", v)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Manufacturer" count={f.brand.length} defaultOpen={false}>
        {opts.brand.map((v) => (
          <Check key={v} label={v} checked={f.brand.includes(v)} onChange={() => toggle("brand", v)} />
        ))}
      </FilterGroup>

      <FilterGroup title="Country of origin" count={f.origin.length} defaultOpen={false}>
        {opts.origin.map((v) => (
          <Check key={v} label={v} checked={f.origin.includes(v)} onChange={() => toggle("origin", v)} />
        ))}
      </FilterGroup>

      <FilterGroup title="Availability" count={f.stock.length}>
        {[["in", "In stock — Dubai"], ["low", "Low stock"], ["sourced", "Sourced to order"]].map(
          ([id, label]) => (
            <Check
              key={id}
              label={label}
              checked={f.stock.includes(id)}
              onChange={() => toggle("stock", id)}
            />
          )
        )}
      </FilterGroup>
    </div>
  );

  return (
    <div className="mx-auto max-w-shell px-6 py-10">
      <div className="grid gap-10 lg:grid-cols-[262px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-28">{rail}</div>
        </aside>

        <div>
          {/* search + sort bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-[240px] flex-1 items-center border border-navy/15 bg-white focus-within:border-teal">
              <span className="eyebrow border-r border-navy/10 px-3 py-3 text-tealink">Part no.</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search part number or description"
                aria-label="Search catalogue"
                className="data w-full bg-transparent px-4 py-3 text-[14px] text-navy placeholder:text-slate/70 focus:outline-none"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="px-3 text-[13px] text-slate/70 hover:text-coralink"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowFilters((s) => !s)}
              className="border border-navy/15 px-4 py-3 text-[13px] font-semibold text-navy lg:hidden"
            >
              Filter {activeCount > 0 && <span className="text-coral">({activeCount})</span>}
            </button>

            <label className="flex items-center gap-2 text-[13px] text-slate/70">
              <span className="hidden sm:inline">Sort</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="border border-navy/15 bg-white px-3 py-3 text-[13px] text-navy focus:border-teal focus:outline-none"
              >
                <option value="relevance">Relevance</option>
                <option value="part">Part number</option>
                <option value="brand">Manufacturer</option>
                <option value="stock">Availability</option>
              </select>
            </label>
          </div>

          <p className="data mt-4 text-[12px] text-slate/70">
            {results.length} of {products.length} parts
            {activeCount > 0 ? ` · ${activeCount} filter${activeCount > 1 ? "s" : ""} applied` : ""}
          </p>

          {showFilters && (
            <div className="mt-4 border border-navy/12 bg-white p-5 lg:hidden">{rail}</div>
          )}

          {results.length === 0 ? (
            <div className="mt-10 border border-navy/12 bg-mist p-10 text-center">
              <p className="h-display text-[19px] text-navy">No parts match those filters</p>
              <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-slate/75">
                We source outside the listed catalogue. Send the part numbers you need as a quote
                request and we will confirm availability and lead time.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={clearAll}
                  className="border border-navy/20 px-5 py-2.5 text-[13px] font-semibold text-navy hover:border-teal hover:text-tealink"
                >
                  Clear filters
                </button>
                <a
                  href="/quote"
                  className="bg-coral px-5 py-2.5 text-[13px] font-semibold text-navy hover:bg-coral/90"
                >
                  Request a part
                </a>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {results.slice(0, limit).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              {results.length > limit && (
                <div className="mt-10 text-center">
                  <button
                    type="button"
                    onClick={() => setLimit((l) => l + 36)}
                    className="border border-navy/20 px-7 py-3 text-[14px] font-semibold text-navy transition-colors hover:border-teal hover:text-tealink"
                  >
                    Show more · {results.length - limit} remaining
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
