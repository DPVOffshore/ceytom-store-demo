"use client";

import Link from "next/link";
import { useRfq } from "./RfqProvider";
import { PartNumber, SpecChip, Stock } from "./Bits";

export function AddToQuote({ product, qty = 1, block = false, label = "Add to quote" }) {
  const { add } = useRfq();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        add(product, qty);
      }}
      className={`border border-accent bg-accent px-4 py-2 text-[13px] font-semibold text-on-accent transition-colors hover:bg-base hover:text-accent-ink ${
        block ? "w-full" : ""
      }`}
    >
      {label}
    </button>
  );
}

export default function ProductCard({ product: p }) {
  const specs = [];
  if (p.current?.length) specs.push(["", `${p.current[p.current.length - 1]} A`]);
  if (p.voltage?.length) specs.push(["", p.voltage[p.voltage.length - 1]]);
  if (p.ip?.length) specs.push(["", p.ip[0]]);
  if (p.holeDia?.length) specs.push(["ø", p.holeDia[0]]);
  if (p.poles?.length) specs.push(["", p.poles[p.poles.length - 1]]);

  return (
    <article className="group flex flex-col border border-primary/10 bg-base transition-colors hover:border-secondary-ink/50">
      <Link href={`/product/${p.id}`} className="block">
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-base p-4">
          {p.image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={p.image}
              alt={p.name}
              loading="lazy"
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
            />
          ) : (
            <span className="eyebrow text-ink/70">No image</span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col border-t border-primary/10 p-4">
        <PartNumber value={p.partNumber} size="xs" className="self-start" />
        <Link href={`/product/${p.id}`} className="mt-2.5 block">
          <h3 className="text-[14px] font-semibold leading-snug text-primary group-hover:text-secondary-ink">
            {p.name}
          </h3>
        </Link>
        <p className="mt-1 text-[12px] text-ink/70">
          {p.brand}
          {p.origin ? ` · ${p.origin}` : ""}
        </p>

        {specs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {specs.slice(0, 4).map(([l, v], i) => (
              <SpecChip key={i} label={l}>
                {v}
              </SpecChip>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-primary/8 pt-3">
          <Stock value={p.stock} />
          <AddToQuote product={p} label="Add" />
        </div>
      </div>
    </article>
  );
}
