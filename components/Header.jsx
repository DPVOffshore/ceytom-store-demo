"use client";

import Link from "next/link";
import { useState } from "react";
import { useRfq } from "./RfqProvider";
import ThemeSwitcher from "./ThemeSwitcher";
import { COMPANY } from "@/lib/data";

// Cross-reference earns a nav slot rather than living only on the home page:
// a buyer holding a failed competitor part can arrive on any page, and there is
// no other route to it once they are deep in the catalogue. "By ship system"
// shortens to keep six items clear of the theme switcher at 1024px.
const NAV = [
  { href: "/catalog", label: "Catalogue" },
  { href: "/systems", label: "Ship systems" },
  { href: "/cross-reference", label: "Cross-reference" },
  { href: "/brands", label: "Brands" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const MOBILE_NAV = [...NAV, { href: "/quote/saved", label: "Saved lists" }];

export default function Header() {
  const { count } = useRfq();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-primary/10 bg-base/95 backdrop-blur">
      {/* utility strip */}
      <div className="hidden bg-primary text-on-primary lg:block">
        <div className="mx-auto flex max-w-shell items-center justify-between px-6 py-1.5">
          <p className="data text-[11px] text-tint/90">
            {COMPANY.city}, {COMPANY.country} · TRN {COMPANY.trn} · {COMPANY.hours}
          </p>
          <div className="data flex items-center gap-5 text-[11px]">
            <a href={`tel:${COMPANY.landline.replace(/\s/g, "")}`} className="hover:text-tint">
              {COMPANY.landline}
            </a>
            <a href={`mailto:${COMPANY.email}`} className="hover:text-tint">
              {COMPANY.email}
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-shell items-center gap-6 px-6 py-3">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-10 w-10 object-contain" />
          <span className="leading-none">
            <span className="h-display block text-[19px] text-primary">CEYTOM</span>
            <span className="eyebrow block text-secondary-ink">Marine Electrical</span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-5 lg:flex xl:gap-7">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-[14px] font-medium text-ink/75 transition-colors hover:text-secondary-ink"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <ThemeSwitcher className="ml-auto lg:ml-0" />

        <Link
          href="/quote"
          className="inline-flex items-center gap-2 bg-accent px-4 py-2.5 text-[13px] font-semibold text-on-accent transition-colors hover:bg-accent/90"
        >
          Request quote
          <span className="data border-l border-primary/25 pl-2 text-[12px] tabular-nums">
            {count}
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Menu"
          className="lg:hidden"
        >
          <span className="block h-px w-6 bg-primary" />
          <span className="mt-1.5 block h-px w-6 bg-primary" />
          <span className="mt-1.5 block h-px w-6 bg-primary" />
        </button>
      </div>

      {open && (
        <nav className="border-t border-primary/10 bg-base px-6 py-3 lg:hidden">
          {MOBILE_NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className="block border-b border-primary/8 py-3 text-[15px] font-medium text-ink/80 last:border-0"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
