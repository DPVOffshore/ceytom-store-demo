import Link from "next/link";
import { Eyebrow } from "@/components/Bits";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-6 py-28 text-center">
      <Eyebrow>Not found</Eyebrow>
      <h1 className="h-display mt-4 text-[32px] text-primary">
        That part number isn&apos;t in the catalogue
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-ink/70">
        We list a portion of what we can supply. Search again, or send the number as a quote
        request and we will confirm availability.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/catalog" className="bg-accent px-6 py-3 text-[14px] font-semibold text-on-accent hover:bg-accent/90">
          Search the catalogue
        </Link>
        <Link href="/quote" className="border border-primary/20 px-6 py-3 text-[14px] font-semibold text-primary hover:border-secondary-ink hover:text-secondary-ink">
          Request a part
        </Link>
      </div>
    </div>
  );
}
