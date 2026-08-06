import Link from "next/link";
import { notFound } from "next/navigation";
import { systems, groups, products, getSystem } from "@/lib/data";
import ProductCard from "@/components/ProductCard";
import { Eyebrow } from "@/components/Bits";

export function generateStaticParams() {
  return systems.map((s) => ({ id: s.id }));
}

const BLURB = {
  "engine-room":
    "Main and auxiliary engine control, starter panels, motor isolation and machinery monitoring. Components here face heat, vibration and oil mist, so ingress protection and contact rating matter more than anywhere else on the vessel.",
  "bridge-wheelhouse":
    "Console switching, indication and alarm acknowledgement. Panel indicators and selector switches on the bridge need consistent legend plates and low-glare lens colours for night watch.",
  "deck-machinery":
    "Winch, windlass and crane control — pendant stations, limit switches and emergency stops rated for weather-deck exposure and rough handling.",
  "main-switchboard":
    "Generator and distribution panels: cam switches, voltmeter and ammeter selectors, current transformers, control transformers and terminal blocks for MSB and ESB builds.",
  "pump-room":
    "Cargo, ballast and bilge pump control — level relays, floatless relays, timers and proximity sensing for automatic start and dry-run protection.",
  "safety-alarm":
    "General alarm, fire detection indication and abandon-ship signalling. Sirens, beacons and tower lights with audible ratings suited to machinery spaces.",
};

export function generateMetadata({ params }) {
  const s = getSystem(params.id);
  if (!s) return { title: "System not found" };
  return { title: s.name, description: BLURB[s.id] };
}

export default function SystemPage({ params }) {
  const s = getSystem(params.id);
  if (!s) notFound();

  const list = products.filter((p) => s.groups.includes(p.group));
  const byGroup = s.groups
    .map((gid) => ({
      group: groups.find((g) => g.id === gid),
      items: list.filter((p) => p.group === gid && p.image).slice(0, 4),
      total: list.filter((p) => p.group === gid).length,
    }))
    .filter((x) => x.group);

  return (
    <>
      <section className="schematic border-b border-primary/10 bg-primary text-on-primary">
        <div className="mx-auto max-w-shell px-6 py-14">
          <nav className="mb-6">
            <Link href="/systems" className="text-[13px] text-tint/90 hover:text-tint">
              ← All ship systems
            </Link>
          </nav>
          <Eyebrow tone="light">Ship system</Eyebrow>
          <h1 className="h-display mt-3 text-[32px] leading-tight md:text-[44px]">{s.name}</h1>
          <p className="mt-5 max-w-3xl text-[15px] leading-relaxed text-on-primary/90">{BLURB[s.id]}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/catalog?group=${s.groups[0]}`}
              className="bg-accent px-6 py-3 text-[14px] font-semibold text-on-accent hover:bg-accent/90"
            >
              Filter the catalogue
            </Link>
            <Link
              href="/quote"
              className="border border-on-primary/25 px-6 py-3 text-[14px] font-semibold text-on-primary hover:border-tint hover:text-tint"
            >
              Send a parts list
            </Link>
          </div>
          <p className="data mt-6 text-[12px] text-tint">
            {list.length} parts across {byGroup.length} component families
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-shell px-6 py-14">
        {byGroup.map(({ group, items, total }) => (
          <section key={group.id} className="mb-16 last:mb-0">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-primary/10 pb-4">
              <h2 className="h-display text-[23px] text-primary">{group.name}</h2>
              <Link
                href={`/catalog?group=${group.id}`}
                className="text-[13px] font-semibold text-secondary-ink hover:underline"
              >
                All {total} parts →
              </Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
