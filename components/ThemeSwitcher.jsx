"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { THEMES } from "@/lib/themes";
import { useTheme } from "./ThemeProvider";

export default function ThemeSwitcher({ className = "" }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const itemRefs = useRef([]);

  const active = THEMES.find((t) => t.id === theme) ?? THEMES[0];
  const activeIndex = THEMES.indexOf(active);

  const close = useCallback((focusButton = false) => {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  }, []);

  // outside click / focus leaving the widget
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onFocusIn = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open]);

  // move focus onto the selected row when the menu opens
  useEffect(() => {
    if (open) itemRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  const onButtonKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onMenuKeyDown = (e) => {
    const last = THEMES.length - 1;
    const i = itemRefs.current.indexOf(document.activeElement);
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        close(true);
        break;
      case "Tab":
        setOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        itemRefs.current[i >= last ? 0 : i + 1]?.focus();
        break;
      case "ArrowUp":
        e.preventDefault();
        itemRefs.current[i <= 0 ? last : i - 1]?.focus();
        break;
      case "Home":
        e.preventDefault();
        itemRefs.current[0]?.focus();
        break;
      case "End":
        e.preventDefault();
        itemRefs.current[last]?.focus();
        break;
      default:
        break;
    }
  };

  const select = (id) => {
    setTheme(id);
    close(true);
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onButtonKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Colour theme: ${active.name}. Change theme`}
        className="inline-flex items-center gap-2 border border-primary/15 px-2.5 py-2 text-[13px] font-medium text-ink/75 transition-colors hover:border-secondary-ink hover:text-secondary-ink"
      >
        <PaletteIcon />
        <span className="hidden xl:inline">{active.name}</span>
        <span aria-hidden="true" className="hidden sm:flex">
          {active.swatches.map((c, i) => (
            <span
              key={i}
              className="h-3 w-2 border border-primary/10"
              style={{ backgroundColor: c, marginLeft: i ? -1 : 0 }}
            />
          ))}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Colour theme"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full z-50 mt-1 w-[288px] border border-primary/15 bg-base shadow-xl"
        >
          <p className="eyebrow border-b border-primary/10 bg-surface px-4 py-2.5 text-ink/70">
            Colour theme
          </p>

          {THEMES.map((t, i) => {
            const selected = t.id === theme;
            return (
              <button
                key={t.id}
                ref={(el) => (itemRefs.current[i] = el)}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => select(t.id)}
                className={`flex w-full items-center gap-3 border-b border-primary/8 px-4 py-3 text-left transition-colors last:border-0 hover:bg-surface ${
                  selected ? "bg-surface" : ""
                }`}
              >
                <span aria-hidden="true" className="flex shrink-0">
                  {t.swatches.map((c, j) => (
                    <span
                      key={j}
                      className="h-7 w-4 border border-primary/10"
                      style={{ backgroundColor: c, marginLeft: j ? -1 : 0 }}
                    />
                  ))}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-primary">
                    {t.name}
                  </span>
                  <span className="block text-[12px] leading-snug text-ink/70">
                    {t.tagline}
                  </span>
                </span>

                <span aria-hidden="true" className="w-4 shrink-0 text-secondary-ink">
                  {selected ? <CheckIcon /> : null}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PaletteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M12 3a9 9 0 0 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2 0-1 .8-1.8 1.8-1.8H16a5 5 0 0 0 5-5c0-3.9-4-6.7-9-6.7Z" />
      <circle cx="7.5" cy="11.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden="true"
    >
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}
