import Link from "next/link";
import { COMPANY, products, BRANDS, categories } from "@/lib/data";
import { Eyebrow } from "@/components/Bits";

export const metadata = {
  title: "About",
  description:
    "Ceytom Co L.L.C is a Dubai marine electrical trading company supplying switchgear, control and signalling components to commercial vessels across the UAE, GCC and worldwide.",
};

export default function AboutPage() {
  return (
    <>
      <section className="schematic border-b border-navy/10 bg-navy text-white">
        <div className="mx-auto max-w-shell px-6 py-16">
          <Eyebrow tone="light">Company</Eyebrow>
          <h1 className="h-display mt-4 max-w-3xl text-[32px] leading-tight md:text-[46px]">
            A Dubai supply base for shipboard electrical control
          </h1>
          <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-white/80">
            {COMPANY.legalName} supplies the switchgear, control and signalling components that
            keep vessels operating — from main switchboard cam switches to bridge indicators and
            engine-room limit switches. We hold stock in Dubai and deliver to vessel.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-shell px-6 py-16">
        <div className="grid gap-14 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-10">
            <section>
              <h2 className="h-display text-[24px] text-navy">Who we supply</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-slate/75">
                Our customers are ship chandlers, fleet operators, marine workshops and
                shipyards working on commercial tonnage — tugs and workboats, cargo vessels,
                offshore support and fishing fleets. The common thread is that a vessel is
                waiting, and the part has to be identified correctly the first time.
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-slate/75">
                We are not a leisure-marine retailer. The catalogue is specified for panel
                builders and engineers who work from switchboard drawings.
              </p>
            </section>

            <section>
              <h2 className="h-display text-[24px] text-navy">How we work</h2>
              <dl className="mt-5 space-y-5">
                {[
                  [
                    "We quote rather than list prices",
                    "Marine procurement runs on negotiated, volume-based terms. Publishing a single list price would be misleading, so we quote against your actual requirement, quantity and delivery point.",
                  ],
                  [
                    "We stock in Dubai",
                    "Most of the catalogue ships ex-stock from our Al Quoz warehouse. Items sourced to order carry a stated lead time on the quotation, not a vague estimate.",
                  ],
                  [
                    "We deliver to the vessel",
                    `Own transport within the UAE, including alongside delivery at ${COMPANY.ports.join(", ")}. Aramex and DHL for GCC and international consignments.`,
                  ],
                  [
                    "We state origin and certification",
                    "Country of origin, HS code and certification are provided for customs and for class-survey documentation.",
                  ],
                ].map(([t, d]) => (
                  <div key={t} className="border-l-2 border-teal pl-5">
                    <dt className="h-display text-[17px] text-navy">{t}</dt>
                    <dd className="mt-2 text-[14px] leading-relaxed text-slate/70">{d}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="border border-coral/30 bg-coral/[0.04] p-6">
              <h2 className="h-display text-[19px] text-navy">On class approval</h2>
              <p className="mt-3 text-[14px] leading-relaxed text-slate/75">
                Our catalogue carries industrial certification — CE, UL, TÜV, CSA and IEC.
                Where your specification calls for marine type approval from ABS, DNV or Lloyd&apos;s
                Register, tell us at enquiry stage. We will confirm which lines hold it rather than
                imply blanket approval we do not have.
              </p>
            </section>
          </div>

          <aside className="space-y-8">
            <dl className="border border-navy/12 bg-white px-5 py-2">
              {[
                ["Registered name", COMPANY.legalName],
                ["Trade licence", COMPANY.licence],
                ["Tax registration", COMPANY.trn],
                ["Premises", COMPANY.address],
                ["Landline", COMPANY.landline],
                ["WhatsApp", COMPANY.whatsapp],
                ["Email", COMPANY.email],
                ["Hours", COMPANY.hours],
              ].map(([k, v]) => (
                <div key={k} className="border-b border-navy/8 py-3.5 last:border-0">
                  <dt className="eyebrow text-slate/70">{k}</dt>
                  <dd className="data mt-1.5 text-[13px] leading-relaxed text-navy">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="grid grid-cols-3 divide-x divide-navy/10 border border-navy/12 bg-white">
              {[
                [products.length, "parts"],
                [categories.length, "families"],
                [BRANDS.length, "makers"],
              ].map(([n, l]) => (
                <div key={l} className="px-4 py-6 text-center">
                  <p className="h-display data text-[24px] text-teal">{n}</p>
                  <p className="mt-1 text-[12px] text-slate/70">{l}</p>
                </div>
              ))}
            </div>

            <div className="bg-navy p-6 text-white">
              <p className="h-display text-[18px]">Have a parts list ready?</p>
              <p className="mt-2 text-[13px] leading-relaxed text-white/80">
                Paste up to 100 lines and we will match them against stock and quote as one package.
              </p>
              <Link
                href="/quote"
                className="mt-4 inline-block bg-coral px-5 py-2.5 text-[13px] font-semibold text-navy hover:bg-coral/90"
              >
                Start a request
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
