"use client";

import Link from "next/link";
import { useState } from "react";
import { useRfq } from "./RfqProvider";
import { COMPANY } from "@/lib/data";

const NAV = [
  { href: "/catalog", label: "Catalogue" },
  { href: "/systems", label: "By ship system" },
  { href: "/brands", label: "Brands" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const { count } = useRfq();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-navy/10 bg-white/95 backdrop-blur">
      {/* utility strip */}
      <div className="hidden bg-navy text-white lg:block">
        <div className="mx-auto flex max-w-shell items-center justify-between px-6 py-1.5">
          <p className="data text-[11px] text-tint/70">
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
            <span className="h-display block text-[19px] text-navy">CEYTOM</span>
            <span className="eyebrow block text-tealink">Marine Electrical</span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-7 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-[14px] font-medium text-slate/75 transition-colors hover:text-tealink"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/quote"
          className="ml-auto inline-flex items-center gap-2 bg-coral px-4 py-2.5 text-[13px] font-semibold text-navy transition-colors hover:bg-coral/90 lg:ml-0"
        >
          Request quote
          <span className="data border-l border-navy/25 pl-2 text-[12px] tabular-nums">
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
          <span className="block h-px w-6 bg-navy" />
          <span className="mt-1.5 block h-px w-6 bg-navy" />
          <span className="mt-1.5 block h-px w-6 bg-navy" />
        </button>
      </div>

      {open && (
        <nav className="border-t border-navy/10 bg-white px-6 py-3 lg:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className="block border-b border-navy/8 py-3 text-[15px] font-medium text-slate/80 last:border-0"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
