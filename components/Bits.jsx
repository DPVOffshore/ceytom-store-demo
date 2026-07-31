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
      className={`data inline-flex items-center gap-1.5 border border-teal/30 bg-tint/25 font-medium text-deep transition-colors hover:border-teal hover:bg-tint/50 ${sizes[size]} ${className}`}
    >
      {value}
      <span className="text-tealink">{copied ? "copied" : "⧉"}</span>
    </button>
  );
}

export function SpecChip({ label, children }) {
  return (
    <span className="data inline-flex items-baseline gap-1 border border-navy/12 bg-mist px-1.5 py-0.5 text-[11px] text-slate/80">
      {label && <span className="text-slate/70">{label}</span>}
      {children}
    </span>
  );
}

export function Stock({ value }) {
  const inStock = value.startsWith("In stock");
  const low = value.startsWith("Low");
  const dot = inStock ? "bg-teal" : low ? "bg-coral" : "bg-slate/35";
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-slate/70">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {value}
    </span>
  );
}

export function Eyebrow({ children, tone = "teal" }) {
  const c = tone === "light" ? "text-tint/70" : "text-tealink";
  return <p className={`eyebrow ${c}`}>{children}</p>;
}

export function Rule() {
  return <hr className="hairline border-t" />;
}
