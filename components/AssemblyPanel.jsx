"use client";

import Link from "next/link";
import { useRfq } from "./RfqProvider";
import { PartNumber, RoleBadge, Stock, Eyebrow } from "./Bits";
import { moqOf } from "@/lib/availability";

/**
 * "Completes this assembly."
 *
 * A 22 mm head without a contact block, or a pilot lamp holder without a bulb,
 * is a part that arrives on the vessel and does nothing. Required components are
 * therefore an error state, not a suggestion: they are called out before the
 * optional accessories and they stay flagged until they are in the request.
 */

/** Accessories carry their own minimum order — bulbs and fuses ship in tens. */
function relationQty(rel, baseQty) {
  return rel.target ? Math.max(baseQty, moqOf(rel.target)) : baseQty;
}

function RelationRow({ rel, qty: baseQty }) {
  const { add, addFree, has } = useRfq();
  const inBasket = has(rel.id);
  const required = rel.role === "requires";
  const target = rel.target;
  const qty = relationQty(rel, baseQty);

  function addThis() {
    if (rel.unlisted) addFree({ id: rel.id, partNumber: "To be quoted", name: rel.label, qty });
    else add(target, qty);
  }

  return (
    <li
      className={`flex flex-col gap-3 bg-base p-4 sm:flex-row sm:items-start sm:gap-4 ${
        required ? "border-l-[3px] border-l-accent-ink" : ""
      }`}
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-primary/10 bg-base p-1">
        {target?.image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={target.image} alt="" loading="lazy" className="h-full w-full object-contain" />
        ) : (
          <span className="data text-center text-[11px] leading-tight text-ink/70">
            {rel.unlisted ? "TBQ" : "—"}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <RoleBadge role={rel.role} />
          {target ? (
            <PartNumber value={target.partNumber} size="xs" />
          ) : (
            <span className="data border border-primary/20 bg-surface px-1.5 py-0.5 text-[11px] text-ink/75">
              not a listed line
            </span>
          )}
          {inBasket && (
            <span className="data text-[11px] font-semibold text-secondary-ink">✓ in your request</span>
          )}
        </div>

        {target ? (
          <Link href={`/product/${target.id}`} className="mt-2 block">
            <p className="text-[14px] font-semibold leading-snug text-primary hover:text-secondary-ink">
              {target.name}
            </p>
          </Link>
        ) : (
          <p className="mt-2 text-[14px] font-semibold leading-snug text-primary">{rel.label}</p>
        )}

        <p className="mt-1.5 text-[13px] leading-relaxed text-ink/75">{rel.reason}</p>

        {target && <Stock product={target} qty={qty} detail className="mt-2" />}
      </div>

      <div className="shrink-0 sm:pt-1">
        <button
          type="button"
          onClick={addThis}
          disabled={inBasket}
          className={`w-full border px-4 py-2 text-[13px] font-semibold transition-colors sm:w-auto ${
            inBasket
              ? "cursor-not-allowed border-primary/15 bg-surface text-ink/70"
              : required
                ? "border-accent-ink bg-base text-accent-ink hover:bg-accent hover:text-on-accent"
                : "border-primary/20 text-primary hover:border-secondary-ink hover:text-secondary-ink"
          }`}
        >
          {inBasket ? "Added" : "Add"}
        </button>
      </div>
    </li>
  );
}

export default function AssemblyPanel({ product, relations, qty = 1 }) {
  const { add, addFree, has } = useRfq();
  if (!relations?.length) return null;

  const required = relations.filter((r) => r.role === "requires");
  const rest = relations.filter((r) => r.role !== "requires");
  const missing = required.filter((r) => !has(r.id));

  function addAssembly() {
    add(product, qty);
    for (const rel of required) {
      if (has(rel.id)) continue;
      const n = relationQty(rel, qty);
      if (rel.unlisted) addFree({ id: rel.id, partNumber: "To be quoted", name: rel.label, qty: n });
      else add(rel.target, n);
    }
  }

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Assembly check</Eyebrow>
          <h2 className="h-display mt-3 text-[24px] text-primary">Completes this assembly</h2>
        </div>
        {required.length > 0 && (
          <button
            type="button"
            onClick={addAssembly}
            className="border border-accent bg-accent px-5 py-2.5 text-[13px] font-semibold text-on-accent transition-colors hover:bg-base hover:text-accent-ink"
          >
            Add complete assembly · {required.length + 1} lines
          </button>
        )}
      </div>

      {required.length > 0 && (
        <p
          className={`mt-4 border-l-[3px] border-y border-r p-4 text-[13px] leading-relaxed ${
            missing.length
              ? "border-accent-ink/40 border-l-accent-ink bg-accent/[0.06] text-primary"
              : "border-secondary-ink/40 border-l-secondary-ink bg-surface text-ink/80"
          }`}
        >
          <span aria-hidden className="data mr-2 font-semibold">
            {missing.length ? "!" : "✓"}
          </span>
          {missing.length ? (
            <>
              <strong className="font-semibold">
                {missing.length} required component{missing.length === 1 ? "" : "s"} not in your request.
              </strong>{" "}
              This part does not function on its own — ordering it without{" "}
              {missing.length === 1 ? "the item" : "the items"} below means a second shipment.
            </>
          ) : (
            <>All required components for this part are already in your request.</>
          )}
        </p>
      )}

      <ul className="mt-4 divide-y divide-primary/8 border border-primary/12 bg-base">
        {required.map((rel) => (
          <RelationRow key={rel.id} rel={rel} qty={qty} />
        ))}
        {rest.map((rel) => (
          <RelationRow key={rel.id} rel={rel} qty={qty} />
        ))}
      </ul>

      <p className="mt-3 text-[12px] leading-relaxed text-ink/70">
        Relationships are inferred from catalogue data — cut-out diameter, plate size and relay pin
        count. Confirm against your switchboard drawing; if something you need is not listed here,
        add it to the request as free text and we will identify it.
      </p>
    </section>
  );
}
