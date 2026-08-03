"use client";

import { useState } from "react";

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

export function SpecChip({ label, children }) {
  return (
    <span className="data inline-flex items-baseline gap-1 border border-primary/12 bg-surface px-1.5 py-0.5 text-[11px] text-ink/80">
      {label && <span className="text-ink/70">{label}</span>}
      {children}
    </span>
  );
}

export function Stock({ value }) {
  const inStock = value.startsWith("In stock");
  const low = value.startsWith("Low");
  const dot = inStock ? "bg-secondary-ink" : low ? "bg-accent" : "bg-ink/35";
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-ink/70">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {value}
    </span>
  );
}

export function Eyebrow({ children, tone = "teal" }) {
  const c = tone === "light" ? "text-tint/70" : "text-secondary-ink";
  return <p className={`eyebrow ${c}`}>{children}</p>;
}

export function Rule() {
  return <hr className="hairline border-t" />;
}
