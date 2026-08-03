import Link from "next/link";
import { systems, groups, products } from "@/lib/data";
import { Eyebrow } from "@/components/Bits";

export const metadata = {
  title: "Browse by ship system",
  description:
    "Marine electrical components grouped by where they sit on the vessel: engine room, bridge, deck machinery, main switchboard, pump room and general alarm.",
};

export default function SystemsPage() {
  return (
    <>
      <section className="schematic border-b border-primary/10 bg-primary text-on-primary">
        <div className="mx-auto max-w-shell px-6 py-12">
          <Eyebrow tone="light">Where it fits</Eyebrow>
          <h1 className="h-display mt-3 text-[30px] md:text-[40px]">Browse by ship system</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-on-primary/75">
            Chief engineers and superintendents specify by location on the vessel, not by
            component taxonomy. These groupings follow the spaces you work in.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-shell px-6 py-14">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {systems.map((s) => {
            const list = products.filter((p) => s.groups.includes(p.group));
            const sample = list.find((p) => p.image);
            return (
              <Link
                key={s.id}
                href={`/systems/${s.id}`}
                className="group flex flex-col border border-primary/12 bg-base transition-colors hover:border-secondary-ink"
              >
                <div className="flex h-32 items-center justify-center border-b border-primary/10 p-4">
                  {sample?.image && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={sample.image}
                      alt=""
                      loading="lazy"
                      className="h-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h2 className="h-display text-[19px] leading-tight text-primary group-hover:text-secondary-ink">
                    {s.name}
                  </h2>
                  <p className="mt-3 flex-1 text-[13px] leading-relaxed text-ink/70">
                    {s.groups
                      .map((g) => groups.find((x) => x.id === g)?.name)
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="data mt-4 border-t border-primary/8 pt-3 text-[12px] text-secondary-ink">
                    {list.length} parts
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
