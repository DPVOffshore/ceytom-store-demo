import QuoteBuilder from "@/components/QuoteBuilder";
import { products, requirementIndex, COMPANY } from "@/lib/data";

export const metadata = {
  title: "Request a quote",
  description:
    "Build a marine electrical parts request. Paste a list of up to 100 lines, add your vessel, delivery port and sailing date, and receive a formal quotation within one business day.",
};

export default function QuotePage() {
  // Enough to match part numbers, judge availability against a sailing date and
  // find an in-stock alternative with the same key specs — and no more.
  const catalogue = products.map((p) => ({
    id: p.id,
    partNumber: p.partNumber,
    name: p.name,
    brand: p.brand,
    image: p.image,
    category: p.category,
    stockQty: p.stockQty,
    leadTimeDays: p.leadTimeDays,
    restockDays: p.restockDays,
    moq: p.moq,
    holeDia: p.holeDia,
    plateSize: p.plateSize,
    voltage: p.voltage,
  }));

  return (
    <QuoteBuilder catalogue={catalogue} requirements={requirementIndex()} company={COMPANY} />
  );
}
