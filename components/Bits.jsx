"use client";

import { useState } from "react";
import { availability } from "@/lib/availability";

/** The signature element: every part number is monospace and copyable. */
export function PartNumber({ value, size = "sm", className = "" }) {
  const [copied, setCopied] = useState(false);
  const sizes = {
    xs: "text-[11px] px-1.5 py-0.5",
    sm: "text-[13px] px-2 py-0.5",
    lg: "text-lg px-2.5 py-1",
  };
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      title="Copy part number"
      className={`data inline-flex items-center gap-1.5 border border-secondary/30 bg-tint/25 font-medium text-primary-soft transition-colors hover:border-secondary hover:bg-tint/50 ${sizes[size]} ${className}`}
    >
      {value}
      <span className="text-secondary-ink">{copied ? "copied" : "⧉"}</span>
    </button>
  );
}

/**
 * A competitor's part number. Struck through and muted so it never reads as
 * something Ceytom supplies — this is the part the buyer is replacing.
 */
export function CompetitorPn({ value, className = "" }) {
  return (
    <span
      className={`data inline-flex items-center border border-primary/15 bg-surface px-1.5 py-0.5 text-[12px] text-ink/75 line-through decoration-ink/60 ${className}`}
    >
      {value}
    </span>
  );
}

export function SpecChip({ label, children }) {
  return (
    <span className="data inline-flex items-baseline gap-1 border border-primary/12 bg-surface px-1.5 py-0.5 text-[11px] text-ink/80">
      {label && <span className="text-ink/70">{label}</span>}
      {children}
    </span>
  );
}

/* ============================================================
   STATUS VOCABULARY
   ------------------------------------------------------------
   Five palettes have to carry these states, one of them near-monochrome, so
   hue is never the only signal. Every badge pairs a token colour with a glyph,
   a border weight and an explicit word, and the severity ramp reads correctly
   in greyscale: light outline → dark outline → solid fill.

   Two rules keep this legible in every theme:

   1. Coloured text always states its own background (bg-base). --color-accent-ink
      is tuned to reach AA on the page background, and only just — on a surface
      or on a tinted wash it drops to about 4:1 and fails. Badges therefore carry
      their own white rather than inheriting whatever they were dropped onto.

   2. Availability *labels* are body-dark, and the colour lives in the marker
      beside them. A label can land anywhere — a card, a banded panel, a tinted
      warning — so it cannot depend on its background. The marker is a 8px shape
      with no contrast requirement, and its form differs per state anyway.
   ============================================================ */

/** Availability marker. Shape encodes the state; the label beside it says it. */
function AvailabilityMark({ state }) {
  if (state === "in-stock")
    return <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-secondary-ink" />;
  if (state === "partial")
    return (
      <span
        aria-hidden
        className="relative h-2 w-2 shrink-0 overflow-hidden rounded-full border border-accent-ink"
      >
        <span className="absolute inset-x-0 bottom-0 h-1 bg-accent-ink" />
      </span>
    );
  if (state === "low")
    return <span aria-hidden className="h-2 w-2 shrink-0 rounded-full border-2 border-accent-ink" />;
  return <span aria-hidden className="h-2 w-2 shrink-0 rounded-full border border-ink/50" />;
}

/**
 * Availability for a product at a quantity. Pass `qty` wherever the user has
 * stated one — the answer genuinely changes.
 */
export function Stock({ product, qty = 1, detail = false, className = "" }) {
  const a = availability(product, qty);
  return (
    <span
      className={`inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] ${
        a.state === "sourced" ? "text-ink/75" : "text-primary"
      } ${className}`}
    >
      <AvailabilityMark state={a.state} />
      <span className={a.state === "sourced" ? "" : "font-medium"}>{a.label}</span>
      {detail && a.detail && <span className="data text-ink/70">· {a.detail}</span>}
    </span>
  );
}

const MATCH_STYLES = {
  direct: {
    glyph: "=",
    word: "Direct",
    title: "Form, fit and function equivalent",
    className: "border-secondary-ink bg-base text-secondary-ink",
  },
  functional: {
    glyph: "≈",
    word: "Functional",
    title: "Works in place of it, with minor differences",
    className: "border-accent-ink bg-base text-accent-ink",
  },
  consult: {
    glyph: "?",
    word: "Consult",
    title: "Close — sales will confirm before you order",
    className: "border-primary/45 bg-base text-ink/80",
  },
};

export function MatchBadge({ type, className = "" }) {
  const s = MATCH_STYLES[type] || MATCH_STYLES.consult;
  return (
    <span
      title={s.title}
      className={`data inline-flex shrink-0 items-center gap-1 border px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${s.className} ${className}`}
    >
      <span aria-hidden className="text-[12px] leading-none">
        {s.glyph}
      </span>
      {s.word}
    </span>
  );
}

const ETA_STYLES = {
  makes: { glyph: "✓", className: "border-secondary-ink bg-base text-secondary-ink" },
  tight: { glyph: "!", className: "border-2 border-accent-ink bg-base text-accent-ink" },
  miss: { glyph: "✕", className: "border-2 border-primary bg-primary text-on-primary" },
  unknown: { glyph: "?", className: "border-primary/45 bg-base text-ink/80" },
};

export function EtaBadge({ verdict, label, className = "" }) {
  const s = ETA_STYLES[verdict] || ETA_STYLES.unknown;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 border px-2 py-0.5 text-[12px] font-semibold ${s.className} ${className}`}
    >
      <span aria-hidden className="data text-[12px] leading-none">
        {s.glyph}
      </span>
      {label}
    </span>
  );
}

const ROLE_STYLES = {
  requires: {
    glyph: "!",
    word: "Required",
    className: "border-2 border-accent-ink bg-base font-bold text-accent-ink",
  },
  recommended: {
    glyph: "+",
    word: "Recommended",
    className: "border border-secondary-ink bg-base font-semibold text-secondary-ink",
  },
  optional: {
    glyph: "·",
    word: "Optional",
    className: "border border-primary/35 bg-base font-medium text-ink/75",
  },
};

export function RoleBadge({ role, className = "" }) {
  const s = ROLE_STYLES[role] || ROLE_STYLES.optional;
  return (
    <span
      className={`data inline-flex shrink-0 items-center gap-1 px-1.5 py-0.5 text-[11px] uppercase tracking-wider ${s.className} ${className}`}
    >
      <span aria-hidden className="leading-none">
        {s.glyph}
      </span>
      {s.word}
    </span>
  );
}

export function Eyebrow({ children, tone = "teal" }) {
  // /90 rather than /70: at 11px the tint has to clear 4.5:1 on the dark bands
  // in every palette, and Chandlery's and Tide & Teak's tints are close enough
  // to their primaries that 70% falls short.
  const c = tone === "light" ? "text-tint/90" : "text-secondary-ink";
  return <p className={`eyebrow ${c}`}>{children}</p>;
}

export function Rule() {
  return <hr className="hairline border-t" />;
}
