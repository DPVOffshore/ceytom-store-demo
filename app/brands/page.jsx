import Link from "next/link";
import { products, BRANDS } from "@/lib/data";
import { Eyebrow } from "@/components/Bits";

export const metadata = {
  title: "Manufacturers",
  description:
    "Marine electrical components from Auspicious, Revalco, Anly, Hugo Müller, MERZ, Bussmann and others, stocked in Dubai.",
};

export default function BrandsPage() {
  const rows = BRANDS.map((b) => {
    const list = products.filter((p) => p.brand === b);
    return {
      brand: b,
      count: list.length,
      origin: list.find((p) => p.origin)?.origin || "—",
      families: [...new Set(list.map((p) => p.category))].slice(0, 3),
      sample: list.find((p) => p.image),
    };
  }).sort((a, b) => b.count - a.count);

  return (
    <>
      <section className="schematic border-b border-navy/10 bg-navy text-white">
        <div className="mx-auto max-w-shell px-6 py-12">
          <Eyebrow tone="light">Supply chain</Eyebrow>
          <h1 className="h-display mt-3 text-[30px] md:text-[40px]">
            {BRANDS.length} manufacturers
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/75">
            We stock from established control-gear manufacturers across Taiwan, Italy, Germany and
            the USA. Country of origin is stated on every part and on export documentation.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-shell px-6 py-14">
        {/* mobile: stacked cards — a four-column table is unusable at 390px */}
        <ul className="grid gap-3 sm:hidden">
          {rows.map((r) => (
            <li key={r.brand} className="border border-navy/12 bg-white p-5">
              <div className="flex items-baseline justify-between gap-3">
                <Link
                  href={`/catalog?q=${encodeURIComponent(r.brand)}`}
                  className="text-[15px] font-semibold text-navy hover:text-tealink"
                >
                  {r.brand}
                </Link>
                <span className="data text-[12px] text-tealink">{r.count} parts</span>
              </div>
              <p className="data mt-1.5 text-[12px] text-slate/70">{r.origin}</p>
              <p className="mt-2.5 text-[13px] leading-relaxed text-slate/75">
                {r.families.join(" · ")}
              </p>
            </li>
          ))}
        </ul>

        <div className="hidden border border-navy/12 sm:block">
          <table className="w-full border-collapse bg-white text-left">
            <thead>
              <tr className="border-b border-navy/12 bg-mist">
                <th className="eyebrow px-5 py-3 text-slate/70">Manufacturer</th>
                <th className="eyebrow px-5 py-3 text-slate/70">Origin</th>
                <th className="eyebrow px-5 py-3 text-slate/70">Principal families</th>
                <th className="eyebrow px-5 py-3 text-right text-slate/70">Parts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.brand} className="border-b border-navy/8 last:border-0 hover:bg-mist/60">
                  <td className="px-5 py-4">
                    <Link
                      href={`/catalog?q=${encodeURIComponent(r.brand)}`}
                      className="text-[14px] font-semibold text-navy hover:text-tealink"
                    >
                      {r.brand}
                    </Link>
                  </td>
                  <td className="data px-5 py-4 text-[13px] text-slate/75">{r.origin}</td>
                  <td className="px-5 py-4 text-[13px] leading-relaxed text-slate/75">
                    {r.families.join(" · ")}
                  </td>
                  <td className="data px-5 py-4 text-right text-[13px] text-tealink">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10 border border-navy/12 bg-mist p-6">
          <h2 className="h-display text-[18px] text-navy">On authorised distribution</h2>
          <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-slate/70">
            We state distribution status only where we hold it in writing. Where we supply as a
            stockist rather than an appointed distributor, we say so on the quotation. If your
            procurement process requires a letter of authorisation for a particular line, ask and
            we will tell you honestly whether we can provide one.
          </p>
        </div>
      </div>
    </>
  );
}
