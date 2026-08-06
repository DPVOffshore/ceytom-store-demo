import CrossReference from "@/components/CrossReference";
import {
  products,
  crossrefs,
  CROSSREF_BRANDS,
  CROSSREF_DISCLAIMER,
  COMPANY,
} from "@/lib/data";

export const metadata = {
  title: "Cross-reference — competitor part equivalents",
  description:
    "Find the Ceytom equivalent of a Telemecanique, Schneider, Allen-Bradley, Moeller, Eaton, Siemens, ABB, Idec or Omron control component. Paste a competitor bill of materials and get equivalents, availability and a quotation in one pass.",
};

export default function CrossReferencePage() {
  // Only the products the table actually points at, and only the fields the
  // client needs — the page must not ship the whole catalogue.
  const referenced = new Set(crossrefs.map((e) => e.ceytomId));
  const catalogue = products
    .filter((p) => referenced.has(p.id))
    .map((p) => ({
      id: p.id,
      partNumber: p.partNumber,
      name: p.name,
      brand: p.brand,
      image: p.image,
      stockQty: p.stockQty,
      leadTimeDays: p.leadTimeDays,
      restockDays: p.restockDays,
      moq: p.moq,
    }));

  return (
    <>
      <nav className="border-b border-primary/10 bg-surface">
        <ol className="mx-auto flex max-w-shell flex-wrap items-center gap-2 px-6 py-3 text-[12px] text-ink/70">
          <li>
            <a href="/" className="hover:text-secondary-ink">
              Home
            </a>
          </li>
          <li aria-hidden>/</li>
          <li className="text-primary">Cross-reference</li>
        </ol>
      </nav>

      <CrossReference
        entries={crossrefs}
        catalogue={catalogue}
        brands={CROSSREF_BRANDS}
        disclaimer={`${CROSSREF_DISCLAIMER} Confirm any substitution with ${COMPANY.short} before ordering.`}
        coverage={{
          entries: crossrefs.length,
          products: referenced.size,
          total: products.length,
        }}
      />
    </>
  );
}
