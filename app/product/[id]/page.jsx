import Link from "next/link";
import { notFound } from "next/navigation";
import { products, getProduct, relatedProducts, COMPANY } from "@/lib/data";
import { PartNumber, Stock, Eyebrow } from "@/components/Bits";
import ProductCard, { AddToQuote } from "@/components/ProductCard";

export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }));
}

export function generateMetadata({ params }) {
  const p = getProduct(params.id);
  if (!p) return { title: "Part not found" };
  return {
    title: `${p.partNumber} — ${p.name}`,
    description: `${p.partNumber}: ${p.description}. ${p.brand}${p.origin ? `, ${p.origin}` : ""}. Price on request from ${COMPANY.legalName}, Dubai.`,
  };
}

function Row({ label, children }) {
  if (children == null || children === "" || (Array.isArray(children) && !children.length))
    return null;
  return (
    <div className="grid grid-cols-[minmax(140px,38%)_1fr] gap-4 border-b border-primary/8 py-3 last:border-0">
      <dt className="text-[13px] text-ink/70">{label}</dt>
      <dd className="data text-[13px] leading-relaxed text-primary">{children}</dd>
    </div>
  );
}

export default function ProductPage({ params }) {
  const p = getProduct(params.id);
  if (!p) notFound();
  const related = relatedProducts(p, 4);
  const bullets = p.description.split(" · ").filter(Boolean);

  return (
    <>
      {/* breadcrumb */}
      <nav className="border-b border-primary/10 bg-surface">
        <ol className="mx-auto flex max-w-shell flex-wrap items-center gap-2 px-6 py-3 text-[12px] text-ink/70">
          <li><Link href="/" className="hover:text-secondary-ink">Home</Link></li>
          <li aria-hidden>/</li>
          <li><Link href="/catalog" className="hover:text-secondary-ink">Catalogue</Link></li>
          <li aria-hidden>/</li>
          <li>
            <Link href={`/catalog?group=${p.group}`} className="hover:text-secondary-ink">
              {p.groupName}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="data text-primary">{p.partNumber}</li>
        </ol>
      </nav>

      <article className="mx-auto max-w-shell px-6 py-12">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,460px)_1fr]">
          {/* image */}
          <div>
            <div className="flex aspect-square items-center justify-center border border-primary/12 bg-base p-10">
              {p.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={p.image} alt={p.name} className="h-full w-full object-contain" />
              ) : (
                <span className="eyebrow text-ink/70">Image on request</span>
              )}
            </div>
            <p className="data mt-3 text-[11px] text-ink/70">
              Manufacturer photograph. Appearance may vary by production batch.
            </p>
          </div>

          {/* summary */}
          <div>
            <Eyebrow>{p.category}</Eyebrow>
            <h1 className="h-display mt-3 text-[27px] leading-tight text-primary md:text-[33px]">
              {p.name}
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <PartNumber value={p.partNumber} size="lg" />
              <span className="text-[14px] text-ink/70">
                {p.brand}
                {p.origin ? ` · ${p.origin}` : ""}
              </span>
            </div>

            {bullets.length > 1 && (
              <ul className="mt-6 space-y-2">
                {bullets.map((b, i) => (
                  <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-ink/80">
                    <span className="mt-2 h-1 w-1 shrink-0 bg-secondary-ink" />
                    {b}
                  </li>
                ))}
              </ul>
            )}

            {p.certifications.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="eyebrow text-ink/70">Certified</span>
                {p.certifications.map((c) => (
                  <span
                    key={c}
                    className="data border border-secondary/30 bg-tint/25 px-2 py-0.5 text-[12px] font-medium text-primary-soft"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}

            {/* quote panel — no price, by design */}
            <div className="mt-8 border border-primary/12 bg-surface p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="h-display text-[18px] text-primary">Price on request</p>
                  <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-ink/75">
                    Marine supply runs on negotiated terms. Add this part to a request and we
                    respond with a formal quotation within {COMPANY.responseTime}.
                  </p>
                </div>
                <Stock value={p.stock} />
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <AddToQuote product={p} label="Add to quote request" />
                <Link
                  href="/quote"
                  className="border border-primary/20 px-4 py-2 text-[13px] font-semibold text-primary transition-colors hover:border-secondary-ink hover:text-secondary-ink"
                >
                  View request
                </Link>
              </div>
              {p.leadTime && (
                <p className="data mt-4 text-[12px] text-ink/70">
                  Indicative lead time if sourced: {p.leadTime}
                </p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
              <a href={`tel:${COMPANY.landline.replace(/\s/g, "")}`} className="text-secondary-ink hover:underline">
                Call {COMPANY.landline}
              </a>
              <a
                href={`https://wa.me/${COMPANY.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                  `Enquiry: ${p.partNumber} — ${p.name}`
                )}`}
                className="text-secondary-ink hover:underline"
              >
                WhatsApp this part
              </a>
            </div>
          </div>
        </div>

        {/* specification sheet */}
        <section className="mt-16 grid gap-10 lg:grid-cols-2">
          <div>
            <Eyebrow>Specification</Eyebrow>
            <dl className="mt-4 border border-primary/12 bg-base px-5 py-2">
              <Row label="Part number">{p.partNumber}</Row>
              <Row label="Manufacturer">{p.brand}</Row>
              <Row label="Country of origin">{p.origin}</Row>
              <Row label="Product family">{p.category}</Row>
              <Row label="Current rating">
                {p.current.length ? p.current.map((a) => `${a} A`).join(" · ") : null}
              </Row>
              <Row label="Voltage">{p.voltage.join(" · ")}</Row>
              <Row label="Ingress protection">{p.ip.join(" · ")}</Row>
              <Row label="Mounting hole ø">{p.holeDia.join(" · ")}</Row>
              <Row label="Plate size">{p.plateSize.join(" · ")}</Row>
              <Row label="Body dimensions">{p.dimensions?.join(" · ")}</Row>
              <Row label="Poles">{p.poles.join(" · ")}</Row>
              <Row label="Contact arrangement">{p.contacts.join(" · ")}</Row>
              <Row label="Certification">{p.certifications.join(" · ")}</Row>
              <Row label="Net weight">{p.weightKg != null ? `${p.weightKg.toFixed(2)} kg` : null}</Row>
              <Row label="Unit of measure">Each</Row>
            </dl>
            <p className="mt-3 text-[12px] leading-relaxed text-ink/70">
              Specification is taken from the manufacturer catalogue. Confirm critical dimensions
              and ratings against your switchboard drawing before ordering.
            </p>
          </div>

          <div>
            <Eyebrow>Supply &amp; documentation</Eyebrow>
            <dl className="mt-4 border border-primary/12 bg-base px-5 py-2">
              <Row label="Availability">{p.stock}</Row>
              <Row label="Lead time">{p.leadTime || "Ex-stock Dubai"}</Row>
              <Row label="Delivery">
                Own transport within the UAE, including delivery to vessel at{" "}
                {COMPANY.ports.join(", ")}. Aramex and DHL for GCC and international.
              </Row>
              <Row label="Warranty">
                Manufacturer warranty passed through. Terms on the quotation.
              </Row>
              <Row label="Documentation">
                Certificate of origin and conformity available on request with the order.
              </Row>
              <Row label="Tax">
                UAE VAT at 5% applied on domestic supply. Export supply may be zero-rated
                subject to delivery terms.
              </Row>
            </dl>

            <div className="mt-6 border border-primary/12 bg-primary p-6 text-on-primary">
              <p className="h-display text-[17px]">Need this in quantity?</p>
              <p className="mt-2 text-[13px] leading-relaxed text-on-primary/80">
                Send a full parts list and we will quote it as one package with consolidated
                freight. Lists of up to 100 lines can be pasted or uploaded directly.
              </p>
              <Link
                href="/quote"
                className="mt-4 inline-block bg-accent px-5 py-2.5 text-[13px] font-semibold text-on-accent hover:bg-accent/90"
              >
                Upload a parts list
              </Link>
            </div>
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-20">
            <Eyebrow>Same family</Eyebrow>
            <h2 className="h-display mt-3 text-[24px] text-primary">
              Other {p.category.toLowerCase()} parts
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => (
                <ProductCard key={r.id} product={r} />
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
