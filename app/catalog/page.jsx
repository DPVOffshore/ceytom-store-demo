import CatalogBrowser from "@/components/CatalogBrowser";
import { products, groups } from "@/lib/data";
import { Eyebrow } from "@/components/Bits";

export const metadata = {
  title: "Catalogue",
  description:
    "Search 744 marine electrical part numbers by current rating, voltage, ingress protection, mounting size and certification.",
};

export default function CatalogPage({ searchParams }) {
  const initial = {
    q: searchParams?.q || "",
    group: searchParams?.group || "",
    category: searchParams?.category || "",
  };

  return (
    <>
      <section className="schematic border-b border-primary/10 bg-primary text-on-primary">
        <div className="mx-auto max-w-shell px-6 py-12">
          <Eyebrow tone="light">Catalogue</Eyebrow>
          <h1 className="h-display mt-3 text-[30px] md:text-[40px]">
            {products.length} part numbers
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-on-primary/90">
            Filter by the specification that matters on a switchboard drawing — current rating,
            voltage, ingress protection, mounting hole diameter, plate size, pole configuration
            and certification. Prices are quoted, not listed.
          </p>
        </div>
      </section>

      <CatalogBrowser products={products} groups={groups} initial={initial} />
    </>
  );
}
