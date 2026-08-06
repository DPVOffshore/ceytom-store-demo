import Link from "next/link";
import PartSearch from "@/components/PartSearch";
import ProductCard from "@/components/ProductCard";
import { Eyebrow } from "@/components/Bits";
import {
  products,
  groups,
  systems,
  categories,
  BRANDS,
  COMPANY,
  availabilityKey,
  crossrefs,
} from "@/lib/data";

const CERT_STRIP = ["CE Mark", "UL Listed", "TÜV", "CSA", "IEC", "RoHS"];

function searchIndex() {
  return products.map((p) => ({ i: p.id, p: p.partNumber, n: p.name, c: p.category }));
}

function xrefIndex() {
  return crossrefs.map((e) => ({ x: e.competitorPn, b: e.brand, i: e.ceytomId, t: e.matchType }));
}

export default function Home() {
  const index = searchIndex();
  const xrefs = xrefIndex();
  const featured = products.filter((p) => p.image).slice(0, 8);
  const inStock = products.filter((p) => availabilityKey(p) === "in-stock").length;

  return (
    <>
      {/* ─────────── HERO: the search field is the thesis ─────────── */}
      <section className="schematic bg-primary text-on-primary">
        <div className="mx-auto max-w-shell px-6 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow tone="light">
              {COMPANY.city} stock · UAE · GCC · Worldwide
            </Eyebrow>
            <h1 className="h-display mt-6 text-[38px] leading-[1.03] md:text-[58px]">
              Find the part by its
              <br />
              <span className="text-tint">number</span>, not its name.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-on-primary/90 md:text-[16px]">
              Marine electrical switchgear, control and signalling components for
              commercial vessels. {products.length} part numbers, {inStock} in Dubai stock,
              delivered to vessel or berth.
            </p>

            <div className="mt-10">
              <PartSearch index={index} xrefIndex={xrefs} />
              <p className="data mt-3 text-left text-[11px] text-tint/90">
                <span className="caret" />
                Type a part number, or a description such as “emergency stop 22mm”
              </p>
            </div>

            {/* A buyer holding a failed competitor part has a different intent
                from one looking up our own number, so it gets its own door. */}
            <div className="mt-8 border border-tint/25 bg-on-primary/[0.05] p-5 text-left sm:flex sm:items-center sm:justify-between sm:gap-6">
              <div>
                <p className="eyebrow text-tint/90">Holding a failed part from another brand?</p>
                <p className="mt-2 text-[14px] leading-relaxed text-on-primary/90">
                  Look up a Telemecanique, Allen-Bradley, Moeller, Siemens, ABB, Idec or Omron
                  reference and we will show what replaces it.{" "}
                  <span className="data text-tint">{crossrefs.length}</span> references cross-listed.
                </p>
              </div>
              <Link
                href="/cross-reference"
                className="mt-4 inline-block shrink-0 border border-tint px-5 py-2.5 text-[13px] font-semibold text-tint transition-colors hover:bg-tint hover:text-primary sm:mt-0"
              >
                Cross-reference a part →
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <span className="eyebrow text-tint/90">Quote in {COMPANY.responseTime}</span>
              <span className="h-3 w-px bg-tint/20" />
              <Link href="/quote" className="text-[14px] font-semibold text-tint underline-offset-4 hover:underline">
                Upload a parts list →
              </Link>
            </div>
          </div>
        </div>

        {/* certification strip */}
        <div className="border-t border-tint/12">
          <div className="mx-auto flex max-w-shell flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 py-5">
            <span className="eyebrow text-tint/90">Certified to</span>
            {CERT_STRIP.map((c) => (
              <span key={c} className="data text-[13px] font-medium tracking-wide text-on-primary/90">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── KEY FIGURES ─────────── */}
      <section className="border-b border-primary/10">
        <div className="mx-auto grid max-w-shell grid-cols-2 divide-x divide-primary/10 px-6 lg:grid-cols-4">
          {[
            [products.length, "part numbers listed"],
            [categories.length, "product families"],
            [BRANDS.length, "manufacturers stocked"],
            ["4", "Dubai & Fujairah ports served"],
          ].map(([n, l]) => (
            <div key={l} className="px-4 py-8 first:pl-0 lg:px-8">
              <p className="h-display data text-[30px] text-secondary-ink md:text-[38px]">{n}</p>
              <p className="mt-1 text-[13px] leading-snug text-ink/70">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────── BROWSE BY GROUP ─────────── */}
      <section className="mx-auto max-w-shell px-6 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>Catalogue</Eyebrow>
            <h2 className="h-display mt-3 text-[28px] text-primary md:text-[34px]">
              Browse by component family
            </h2>
          </div>
          <Link href="/catalog" className="text-[14px] font-semibold text-secondary-ink hover:underline">
            View full catalogue →
          </Link>
        </div>

        <div className="mt-10 grid gap-px border border-primary/10 bg-primary/10 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map((g) => {
            const sample = products.find((p) => p.group === g.id && p.image);
            return (
              <Link
                key={g.id}
                href={`/catalog?group=${g.id}`}
                className="group flex flex-col justify-between bg-base p-6 transition-colors hover:bg-surface"
              >
                <div className="flex h-24 items-center justify-center">
                  {sample?.image && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={sample.image}
                      alt=""
                      loading="lazy"
                      className="h-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="mt-6">
                  <h3 className="h-display text-[17px] leading-tight text-primary group-hover:text-secondary-ink">
                    {g.name}
                  </h3>
                  <p className="data mt-2 text-[12px] text-ink/70">{g.count} parts</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─────────── BROWSE BY SHIP SYSTEM ─────────── */}
      <section className="bg-surface">
        <div className="mx-auto max-w-shell px-6 py-20">
          <div className="max-w-2xl">
            <Eyebrow>Where it fits</Eyebrow>
            <h2 className="h-display mt-3 text-[28px] text-primary md:text-[34px]">
              Browse by shipboard system
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink/70">
              Superintendents and chief engineers specify by location on the vessel.
              These groupings map the catalogue to the spaces you are actually working in.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {systems.map((s) => {
              const count = products.filter((p) => s.groups.includes(p.group)).length;
              return (
                <Link
                  key={s.id}
                  href={`/systems/${s.id}`}
                  className="group border border-primary/12 bg-base p-6 transition-colors hover:border-secondary-ink"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="h-display text-[18px] leading-tight text-primary group-hover:text-secondary-ink">
                      {s.name}
                    </h3>
                    <span className="data shrink-0 text-[12px] text-ink/70">{count}</span>
                  </div>
                  <p className="mt-3 text-[13px] leading-relaxed text-ink/70">
                    {s.groups
                      .map((g) => groups.find((x) => x.id === g)?.name)
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────── FEATURED ─────────── */}
      <section className="mx-auto max-w-shell px-6 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>Frequently requested</Eyebrow>
            <h2 className="h-display mt-3 text-[28px] text-primary md:text-[34px]">
              Common bridge &amp; engine-room spares
            </h2>
          </div>
          <Link href="/catalog" className="text-[14px] font-semibold text-secondary-ink hover:underline">
            All {products.length} parts →
          </Link>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* ─────────── HOW QUOTING WORKS — a real sequence, so numbered ─────────── */}
      <section className="schematic bg-primary-soft text-on-primary">
        <div className="mx-auto max-w-shell px-6 py-20">
          <div className="max-w-2xl">
            <Eyebrow tone="light">How it works</Eyebrow>
            <h2 className="h-display mt-3 text-[28px] md:text-[34px]">
              We quote rather than list prices
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-on-primary/90">
              Marine procurement runs on negotiated, volume-based terms. Build a request,
              send it, and our team responds with a formal quotation including lead time,
              freight and applicable VAT.
            </p>
          </div>

          <ol className="mt-12 grid gap-px bg-on-primary/12 md:grid-cols-4">
            {[
              ["Find the parts", "Search by part number, or paste a list of up to 100 lines."],
              ["Build the request", "Add lines with quantities. No account needed."],
              ["Send it", "Add your vessel, delivery port and required-by date."],
              ["Receive a quotation", `A formal quote within ${COMPANY.responseTime}.`],
            ].map(([t, d], i) => (
              <li key={t} className="bg-primary-soft p-6">
                <span className="data text-[12px] text-tint">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="h-display mt-3 text-[17px]">{t}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-on-primary/90">{d}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/quote"
              className="bg-accent px-6 py-3 text-[14px] font-semibold text-on-accent transition-colors hover:bg-accent/90"
            >
              Start a quote request
            </Link>
            <Link
              href="/catalog"
              className="border border-on-primary/25 px-6 py-3 text-[14px] font-semibold text-on-primary transition-colors hover:border-tint hover:text-tint"
            >
              Browse the catalogue
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────── TRUST ─────────── */}
      <section className="mx-auto max-w-shell px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <Eyebrow>Supplier credentials</Eyebrow>
            <h2 className="h-display mt-3 text-[28px] text-primary md:text-[34px]">
              Verifiable, on every page
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink/70">
              Procurement teams need to confirm who they are buying from before they raise a
              purchase order. Our licence, tax registration and physical premises are published,
              not buried.
            </p>
            <Link
              href="/about"
              className="mt-6 inline-block text-[14px] font-semibold text-secondary-ink hover:underline"
            >
              Company details →
            </Link>
          </div>

          <dl className="grid gap-px border border-primary/10 bg-primary/10 sm:grid-cols-2">
            {[
              ["Registered name", COMPANY.legalName],
              ["Trade licence", COMPANY.licence],
              ["Tax registration (TRN)", COMPANY.trn],
              ["Premises", COMPANY.address],
              ["Business hours", COMPANY.hours],
              ["Delivery to vessel", COMPANY.ports.join(", ")],
            ].map(([k, v]) => (
              <div key={k} className="bg-base p-5">
                <dt className="eyebrow text-ink/70">{k}</dt>
                <dd className="data mt-2 text-[13px] leading-relaxed text-primary">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
