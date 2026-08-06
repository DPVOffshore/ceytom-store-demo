import Link from "next/link";
import { COMPANY } from "@/lib/data";
import { Eyebrow } from "@/components/Bits";

export const metadata = {
  title: "Contact",
  description:
    "Contact Ceytom Co L.L.C in Dubai — landline, WhatsApp, sales email, warehouse address and business hours.",
};

const CHANNELS = [
  {
    label: "Quote requests",
    detail: COMPANY.quoteEmail,
    href: `mailto:${COMPANY.quoteEmail}`,
    note: `Formal quotation within ${COMPANY.responseTime}. Attach a parts list if you have one.`,
  },
  {
    label: "Landline",
    detail: COMPANY.landline,
    href: `tel:${COMPANY.landline.replace(/\s/g, "")}`,
    note: COMPANY.hours,
  },
  {
    label: "WhatsApp Business",
    detail: COMPANY.whatsapp,
    href: `https://wa.me/${COMPANY.whatsapp.replace(/\D/g, "")}`,
    note: "Send a photo of the nameplate or the failed part — often the fastest identification.",
  },
  {
    label: "Warehouse",
    detail: COMPANY.address,
    href: null,
    note: "Collection by appointment. Ask for the trade counter.",
  },
];

export default function ContactPage() {
  return (
    <>
      <section className="schematic border-b border-primary/10 bg-primary text-on-primary">
        <div className="mx-auto max-w-shell px-6 py-14">
          <Eyebrow tone="light">Contact</Eyebrow>
          <h1 className="h-display mt-3 text-[30px] md:text-[42px]">Talk to the sales desk</h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-on-primary/90">
            If a vessel is waiting, call or message rather than email. We can usually confirm
            stock while you are on the line.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-shell px-6 py-14">
        <div className="grid gap-4 sm:grid-cols-2">
          {CHANNELS.map((c) => (
            <div key={c.label} className="border border-primary/12 bg-base p-6">
              <p className="eyebrow text-secondary-ink">{c.label}</p>
              {c.href ? (
                <a
                  href={c.href}
                  className="data mt-3 block text-[16px] font-medium text-primary hover:text-secondary-ink"
                >
                  {c.detail}
                </a>
              ) : (
                <p className="mt-3 text-[15px] leading-relaxed text-primary">{c.detail}</p>
              )}
              <p className="mt-3 text-[13px] leading-relaxed text-ink/70">{c.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="border border-primary/12 bg-surface p-8">
            <h2 className="h-display text-[21px] text-primary">
              What to include when you enquire
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-ink/70">
              The more of this you can give us, the faster and firmer the quotation:
            </p>
            <ul className="mt-5 space-y-2.5">
              {[
                "Part number, or a photograph of the component nameplate",
                "Quantity required, and whether partial supply is acceptable",
                "Vessel name or IMO, and the panel or drawing reference",
                "Delivery point — warehouse collection, address, or alongside at a named berth",
                "Required-by date, and whether the vessel is sailing",
                "Whether class-approved equivalents are mandatory",
              ].map((t) => (
                <li key={t} className="flex gap-3 text-[14px] leading-relaxed text-ink/75">
                  <span className="mt-2 h-1 w-1 shrink-0 bg-accent" />
                  {t}
                </li>
              ))}
            </ul>
            <Link
              href="/quote"
              className="mt-7 inline-block bg-accent px-6 py-3 text-[14px] font-semibold text-on-accent hover:bg-accent/90"
            >
              Use the quote form instead
            </Link>
          </div>

          <div className="flex min-h-[280px] flex-col justify-between border border-primary/12 bg-base p-8">
            <div>
              <p className="eyebrow text-ink/70">Registered details</p>
              <dl className="mt-4 space-y-3">
                {[
                  ["Legal name", COMPANY.legalName],
                  ["Trade licence", COMPANY.licence],
                  ["TRN", COMPANY.trn],
                  ["Hours", COMPANY.hours],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[12px] text-ink/70">{k}</dt>
                    <dd className="data text-[13px] text-primary">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="mt-6 border-t border-primary/10 pt-4 text-[12px] leading-relaxed text-ink/70">
              A location map is embedded here in the production build.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
