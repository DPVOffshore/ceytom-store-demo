import QuoteBuilder from "@/components/QuoteBuilder";
import { products, COMPANY } from "@/lib/data";

export const metadata = {
  title: "Request a quote",
  description:
    "Build a marine electrical parts request. Paste a list of up to 100 lines, add your vessel and delivery port, and receive a formal quotation within one business day.",
};

export default function QuotePage() {
  // slim index — the matcher only needs identity, not full specs
  const catalogue = products.map((p) => ({
    id: p.id,
    partNumber: p.partNumber,
    name: p.name,
    brand: p.brand,
    image: p.image,
  }));

  return <QuoteBuilder catalogue={catalogue} company={COMPANY} />;
}
