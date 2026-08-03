import Link from "next/link";
import { COMPANY, groups, products } from "@/lib/data";

export default function Footer() {
  return (
    <footer className="schematic mt-24 bg-primary text-on-primary">
      <div className="mx-auto max-w-shell px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="h-11 w-11 object-contain" />
              <span>
                <span className="h-display block text-[19px]">CEYTOM</span>
                <span className="eyebrow block text-tint">Marine Electrical</span>
              </span>
            </div>
            <p className="mt-5 max-w-xs text-[14px] leading-relaxed text-on-primary/80">
              Switchgear, control and signalling components for commercial vessels.
              Stocked in Dubai, delivered to vessel.
            </p>
            <p className="data mt-5 text-[11px] leading-relaxed text-tint/70">
              {COMPANY.legalName}
              <br />
              Trade licence {COMPANY.licence}
              <br />
              TRN {COMPANY.trn}
            </p>
          </div>

          <div>
            <p className="eyebrow text-tint/70">Catalogue</p>
            <ul className="mt-4 space-y-2.5">
              {groups.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/catalog?group=${g.id}`}
                    className="group flex items-baseline justify-between gap-3 text-[14px] text-on-primary/70 hover:text-tint"
                  >
                    <span>{g.name}</span>
                    <span className="data text-[11px] text-on-primary/70">{g.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow text-tint/70">Contact</p>
            <ul className="mt-4 space-y-3 text-[14px] text-on-primary/70">
              <li>{COMPANY.address}</li>
              <li>
                <a href={`tel:${COMPANY.landline.replace(/\s/g, "")}`} className="data hover:text-tint">
                  {COMPANY.landline}
                </a>
                <span className="ml-2 text-[12px] text-on-primary/70">landline</span>
              </li>
              <li>
                <a href={`https://wa.me/${COMPANY.whatsapp.replace(/\D/g, "")}`} className="data hover:text-tint">
                  {COMPANY.whatsapp}
                </a>
                <span className="ml-2 text-[12px] text-on-primary/70">WhatsApp</span>
              </li>
              <li>
                <a href={`mailto:${COMPANY.email}`} className="data hover:text-tint">
                  {COMPANY.email}
                </a>
              </li>
              <li className="text-on-primary/75">{COMPANY.hours}</li>
            </ul>
          </div>

          <div>
            <p className="eyebrow text-tint/70">Delivery to vessel</p>
            <ul className="data mt-4 space-y-2 text-[13px] text-on-primary/70">
              {COMPANY.ports.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <span className="h-1 w-1 bg-accent" />
                  {p}
                </li>
              ))}
            </ul>
            <p className="eyebrow mt-8 text-tint/70">Policies</p>
            <ul className="mt-4 space-y-2.5 text-[14px] text-on-primary/70">
              <li><Link href="/policies/terms" className="hover:text-tint">Terms of sale</Link></li>
              <li><Link href="/policies/shipping" className="hover:text-tint">Shipping &amp; delivery</Link></li>
              <li><Link href="/policies/returns" className="hover:text-tint">Returns &amp; warranty</Link></li>
              <li><Link href="/policies/privacy" className="hover:text-tint">Privacy</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-on-primary/12 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="data text-[11px] text-on-primary/70">
            © {new Date().getFullYear()} {COMPANY.legalName}. {products.length} part numbers listed.
            Prices on request.
          </p>
          <p className="data text-[11px] text-on-primary/70">
            Demonstration build · mock data · no live transactions
          </p>
        </div>
      </div>
    </footer>
  );
}
