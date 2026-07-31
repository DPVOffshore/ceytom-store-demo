import { notFound } from "next/navigation";
import { COMPANY } from "@/lib/data";
import { Eyebrow } from "@/components/Bits";

const POLICIES = {
  terms: {
    title: "Terms of sale",
    intro:
      "These terms govern the supply of goods by Ceytom Co L.L.C. They apply to every quotation and order unless varied in writing.",
    sections: [
      ["Quotations", "Quotations are valid for the period stated on the quotation and are subject to stock being unsold at the time of order. Prices quoted exclude freight and duties unless expressly stated."],
      ["Orders and acceptance", "An order is accepted when we issue an order confirmation. Specifications, drawings and part numbers supplied by the buyer remain the buyer's responsibility to verify."],
      ["Lead times", "Lead times are estimates given in good faith based on supplier information. They are not guaranteed delivery dates and are not a condition of the contract."],
      ["Title and risk", "Title passes on receipt of payment in full. Risk passes on delivery to the buyer or to the buyer's nominated carrier or vessel."],
      ["Payment", "Payment by card or telegraphic transfer in advance unless approved credit terms have been agreed in writing. Bank charges are for the buyer's account."],
      ["Tax", "UAE VAT at 5% is applied to domestic supply. Export supply may be zero-rated subject to delivery terms and evidence of export being retained."],
      ["Governing law", "These terms are governed by the laws of the United Arab Emirates as applied in the Emirate of Dubai, and the courts of Dubai have exclusive jurisdiction."],
    ],
  },
  shipping: {
    title: "Shipping & delivery",
    intro:
      "How goods move from our Dubai warehouse to your vessel, workshop or forwarder.",
    sections: [
      ["UAE delivery", `Own transport within the UAE, including alongside delivery at ${COMPANY.ports.join(", ")}. Same-day dispatch for in-stock items ordered before the daily cut-off.`],
      ["GCC delivery", "Courier or road freight. Customs clearance, duties and any destination charges are the buyer's responsibility unless agreed otherwise on the quotation."],
      ["International", "Courier or air freight via Aramex or DHL, or on the buyer's nominated forwarder. Export documentation including HS code and country of origin is provided with the consignment."],
      ["Delivery to vessel", "Alongside delivery requires the vessel name, berth or anchorage, agent details and a contact on board. Port access lead times apply and are outside our control."],
      ["Freight charges", "Weight-based for standard consignments. Oversized or heavy items are quoted as a freight-on-request line so you see the actual cost rather than an averaged estimate."],
      ["Inspection on receipt", "Please examine goods on receipt and record any visible damage on the carrier's paperwork before signing."],
    ],
  },
  returns: {
    title: "Returns & warranty",
    intro:
      "What can be returned, within what window, and how manufacturer warranty is handled.",
    sections: [
      ["Inspection window", "Notify us of shortages, incorrect supply or transit damage within seven days of receipt, quoting the invoice number and part number."],
      ["Returns process", "Returns require a returns authorisation number issued by us before despatch. Goods must be unused, in original packaging and complete."],
      ["Non-returnable items", "Electrical components that have been installed or energised, items cut or modified to order, and special-order lines brought in specifically for your requirement are not returnable."],
      ["Manufacturer warranty", "Manufacturer warranty is passed through to the buyer on the terms offered by the manufacturer. We will handle the claim on your behalf where the manufacturer permits it."],
      ["Warranty exclusions", "Warranty does not cover damage from incorrect installation, over-voltage, water ingress beyond the rated IP class, or use outside the stated rating."],
      ["Liability", "Our liability is limited to replacement or refund of the goods supplied. Consequential losses, including vessel delay, are excluded."],
    ],
  },
  privacy: {
    title: "Privacy",
    intro:
      "What we collect when you request a quote, why we hold it, and how long we keep it.",
    sections: [
      ["What we collect", "Contact details, company name, tax registration number where given, vessel and delivery details, and the contents of your enquiry."],
      ["Why we hold it", "To prepare and issue quotations, fulfil orders, meet tax and customs record-keeping obligations, and maintain the commercial relationship."],
      ["Sharing", "Shared with couriers and freight forwarders for delivery, and with our bank and accountant for payment and tax reporting. We do not sell contact data."],
      ["Retention", "Commercial records are retained for the period required by UAE tax law, currently five years, and then deleted."],
      ["Your rights", `To request a copy of the data we hold, or correction or deletion where we are not required to retain it, contact ${COMPANY.email}.`],
      ["Cookies", "We use functional cookies only, to remember the contents of your quote request between visits. No advertising or cross-site tracking cookies are set."],
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(POLICIES).map((slug) => ({ slug }));
}

export function generateMetadata({ params }) {
  const p = POLICIES[params.slug];
  return p ? { title: p.title, description: p.intro } : { title: "Policy not found" };
}

export default function PolicyPage({ params }) {
  const p = POLICIES[params.slug];
  if (!p) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Eyebrow>Policy</Eyebrow>
      <h1 className="h-display mt-3 text-[32px] text-navy md:text-[40px]">{p.title}</h1>
      <p className="mt-5 text-[16px] leading-relaxed text-slate/75">{p.intro}</p>

      <div className="mt-6 border-l-2 border-coral bg-coral/[0.05] px-5 py-4">
        <p className="text-[13px] leading-relaxed text-slate/75">
          <span className="font-semibold text-navy">Draft for review.</span> This wording is a
          starting point for the build and has not been reviewed by a UAE-qualified legal
          advisor. It must be reviewed before the site goes live.
        </p>
      </div>

      <dl className="mt-10">
        {p.sections.map(([h, body], i) => (
          <div key={h} className="border-t border-navy/10 py-6">
            <dt className="flex items-baseline gap-3">
              <span className="data text-[12px] text-tealink">{String(i + 1).padStart(2, "0")}</span>
              <span className="h-display text-[19px] text-navy">{h}</span>
            </dt>
            <dd className="mt-3 pl-9 text-[15px] leading-relaxed text-slate/75">{body}</dd>
          </div>
        ))}
      </dl>

      <p className="data mt-10 border-t border-navy/10 pt-6 text-[12px] leading-relaxed text-slate/70">
        {COMPANY.legalName} · Trade licence {COMPANY.licence} · TRN {COMPANY.trn}
        <br />
        {COMPANY.address}
      </p>
    </div>
  );
}
