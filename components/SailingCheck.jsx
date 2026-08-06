"use client";

import { useState } from "react";
import Link from "next/link";
import { EtaBadge } from "./Bits";
import { DESTINATIONS, daysUntil, formatSailDate, getDestination, lineEta } from "@/lib/eta";

/**
 * The single-part version of the vessel-ETA check on the request page.
 * A superintendent's actual question about any given part is "will it be on
 * board before we sail", and answering it here saves building a request first.
 */
export default function SailingCheck({ product }) {
  const [date, setDate] = useState("");
  const [qty, setQty] = useState(1);
  const [dest, setDest] = useState("uae");

  const destination = getDestination(dest);
  const daysAvailable = date ? daysUntil(date) : null;
  const past = daysAvailable != null && daysAvailable < 0;
  const eta =
    date && !past
      ? lineEta({ product, qty, transitDays: destination.transitDays, daysAvailable })
      : null;

  const field =
    "w-full border border-primary/15 bg-base px-2.5 py-2 text-[13px] text-primary focus:border-secondary-ink focus:outline-none";

  return (
    <div className="mt-5 border border-primary/12 bg-base p-5">
      <p className="eyebrow text-secondary-ink">Will this make my sailing date?</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_84px_1fr]">
        <label className="block">
          <span className="block text-[12px] text-ink/75">Vessel sails</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${field} mt-1`}
            aria-label="Date the vessel sails"
          />
        </label>
        <label className="block">
          <span className="block text-[12px] text-ink/75">Qty</span>
          <input
            value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value.replace(/\D/g, "") || "1", 10)))}
            aria-label="Quantity required"
            className={`${field} data mt-1 text-center`}
          />
        </label>
        <label className="block">
          <span className="block text-[12px] text-ink/75">Delivering to</span>
          <select
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            aria-label="Delivery destination"
            className={`${field} mt-1`}
          >
            {DESTINATIONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.short} · {d.transitDays}d
              </option>
            ))}
          </select>
        </label>
      </div>

      {past && (
        <p className="mt-3 text-[13px] text-accent-ink">That date has already passed.</p>
      )}

      {eta && (
        <div className="mt-4 border-t border-primary/10 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <EtaBadge verdict={eta.verdict} label={eta.label} />
            <span className="text-[13px] text-ink/75">
              by {formatSailDate(date)}
            </span>
          </div>
          <p className="data mt-2 text-[12px] leading-relaxed text-ink/70">
            {eta.steps.join(" · ")}
          </p>
          {eta.verdict !== "makes" && (
            <p className="mt-2 text-[12px] leading-relaxed text-ink/75">
              {eta.split
                ? `We can ship ${eta.split.nowQty} from Dubai stock now and follow with ${eta.split.laterQty}. `
                : ""}
              Add it to a request with your sailing date and we will confirm against live stock —{" "}
              <Link href="/quote" className="font-semibold text-secondary-ink hover:underline">
                build the request
              </Link>
              .
            </p>
          )}
        </div>
      )}

      {!eta && !past && (
        <p className="mt-3 text-[12px] leading-relaxed text-ink/70">
          Enter the date the vessel sails. We work back from Dubai stock, the balance lead time and
          freight transit, and show the arithmetic.
        </p>
      )}
    </div>
  );
}
