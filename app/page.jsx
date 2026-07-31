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
} from "@/lib/data";

const CERT_STRIP = ["CE Mark", "UL Listed", "TÜV", "CSA", "IEC", "RoHS"];

function searchIndex() {
  return products.map((p) => ({ i: p.id, p: p.partNumber, n: p.name, c: p.category }));
}

export default function Home() {
  const index = searchIndex();
  const featured = products.filter((p) => p.image).slice(0, 8);
  const inStock = products.filter((p) => p.stock.startsWith("In stock")).length;

  return (
    <>
      {/* ─────────── HERO: the search field is the thesis ─────────── */}
      <section className="schematic bg-navy text-white">
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
            <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-white/80 md:text-[16px]">
              Marine electrical switchgear, control and signalling components for
              commercial vessels. {products.length} part numbers, {inStock} in Dubai stock,
              delivered to vessel or berth.
            </p>

            <div className="mt-10">
              <PartSearch index={index} />
              <p className="data mt-3 text-left text-[11px] text-tint/70">
                <span className="caret" />
                Type a part number, or a description such as “emergency stop 22mm”
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <span className="eyebrow text-tint/70">Quote in {COMPANY.responseTime}</span>
              <span className="h-3 w-px bg-tint/20" />
              <Link href="/quote" className="text-[14px] font-semibold text-coral hover:underline">
                Upload a parts list →
              </Link>
            </div>
          </div>
        </div>

        {/* certification strip */}
        <div className="border-t border-tint/12">
          <div className="mx-auto flex max-w-shell flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 py-5">
            <span className="eyebrow text-tint/70">Certified to</span>
            {CERT_STRIP.map((c) => (
              <span key={c} className="data text-[13px] font-medium tracking-wide text-white/75">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── KEY FIGURES ─────────── */}
      <section className="border-b border-navy/10">
        <div className="mx-auto grid max-w-shell grid-cols-2 divide-x divide-navy/10 px-6 lg:grid-cols-4">
          {[
            [products.length, "part numbers listed"],
            [categories.length, "product families"],
            [BRANDS.length, "manufacturers stocked"],
            ["4", "Dubai & Fujairah ports served"],
          ].map(([n, l]) => (
            <div key={l} className="px-4 py-8 first:pl-0 lg:px-8">
              <p className="h-display data text-[30px] text-teal md:text-[38px]">{n}</p>
              <p className="mt-1 text-[13px] leading-snug text-slate/70">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────── BROWSE BY GROUP ─────────── */}
      <section className="mx-auto max-w-shell px-6 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>Catalogue</Eyebrow>
            <h2 className="h-display mt-3 text-[28px] text-navy md:text-[34px]">
              Browse by component family
            </h2>
          </div>
          <Link href="/catalog" className="text-[14px] font-semibold text-tealink hover:underline">
            View full catalogue →
          </Link>
        </div>

        <div className="mt-10 grid gap-px border border-navy/10 bg-navy/10 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map((g) => {
            const sample = products.find((p) => p.group === g.id && p.image);
            return (
              <Link
                key={g.id}
                href={`/catalog?group=${g.id}`}
                className="group flex flex-col justify-between bg-white p-6 transition-colors hover:bg-mist"
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
                  <h3 className="h-display text-[17px] leading-tight text-navy group-hover:text-tealink">
                    {g.name}
                  </h3>
                  <p className="data mt-2 text-[12px] text-slate/70">{g.count} parts</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─────────── BROWSE BY SHIP SYSTEM ─────────── */}
      <section className="bg-mist">
        <div className="mx-auto max-w-shell px-6 py-20">
          <div className="max-w-2xl">
            <Eyebrow>Where it fits</Eyebrow>
            <h2 className="h-display mt-3 text-[28px] text-navy md:text-[34px]">
              Browse by shipboard system
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-slate/70">
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
                  className="group border border-navy/12 bg-white p-6 transition-colors hover:border-teal"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="h-display text-[18px] leading-tight text-navy group-hover:text-tealink">
                      {s.name}
                    </h3>
                    <span className="data shrink-0 text-[12px] text-slate/70">{count}</span>
                  </div>
                  <p className="mt-3 text-[13px] leading-relaxed text-slate/70">
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
            <h2 className="h-display mt-3 text-[28px] text-navy md:text-[34px]">
              Common bridge &amp; engine-room spares
            </h2>
          </div>
          <Link href="/catalog" className="text-[14px] font-semibold text-tealink hover:underline">
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
      <section className="schematic bg-deep text-white">
        <div className="mx-auto max-w-shell px-6 py-20">
          <div className="max-w-2xl">
            <Eyebrow tone="light">How it works</Eyebrow>
            <h2 className="h-display mt-3 text-[28px] md:text-[34px]">
              We quote rather than list prices
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/80">
              Marine procurement runs on negotiated, volume-based terms. Build a request,
              send it, and our team responds with a formal quotation including lead time,
              freight and applicable VAT.
            </p>
          </div>

          <ol className="mt-12 grid gap-px bg-white/12 md:grid-cols-4">
            {[
              ["Find the parts", "Search by part number, or paste a list of up to 100 lines."],
              ["Build the request", "Add lines with quantities. No account needed."],
              ["Send it", "Add your vessel, delivery port and required-by date."],
              ["Receive a quotation", `A formal quote within ${COMPANY.responseTime}.`],
            ].map(([t, d], i) => (
              <li key={t} className="bg-deep p-6">
                <span className="data text-[12px] text-tint">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="h-display mt-3 text-[17px]">{t}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/75">{d}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/quote"
              className="bg-coral px-6 py-3 text-[14px] font-semibold text-navy transition-colors hover:bg-coral/90"
            >
              Start a quote request
            </Link>
            <Link
              href="/catalog"
              className="border border-white/25 px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:border-tint hover:text-tint"
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
            <h2 className="h-display mt-3 text-[28px] text-navy md:text-[34px]">
              Verifiable, on every page
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-slate/70">
              Procurement teams need to confirm who they are buying from before they raise a
              purchase order. Our licence, tax registration and physical premises are published,
              not buried.
            </p>
            <Link
              href="/about"
              className="mt-6 inline-block text-[14px] font-semibold text-tealink hover:underline"
            >
              Company details →
            </Link>
          </div>

          <dl className="grid gap-px border border-navy/10 bg-navy/10 sm:grid-cols-2">
            {[
              ["Registered name", COMPANY.legalName],
              ["Trade licence", COMPANY.licence],
              ["Tax registration (TRN)", COMPANY.trn],
              ["Premises", COMPANY.address],
              ["Business hours", COMPANY.hours],
              ["Delivery to vessel", COMPANY.ports.join(", ")],
            ].map(([k, v]) => (
              <div key={k} className="bg-white p-5">
                <dt className="eyebrow text-slate/70">{k}</dt>
                <dd className="data mt-2 text-[13px] leading-relaxed text-navy">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
