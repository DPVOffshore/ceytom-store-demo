"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { DEFAULT_THEME, STORAGE_KEY, isTheme } from "@/lib/themes";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Server renders the default; the inline script in <head> has already put the
  // saved theme on <html>, so we adopt that on mount rather than re-applying it
  // (which would cause a hydration mismatch).
  const [theme, setThemeState] = useState(DEFAULT_THEME);
  const timer = useRef(null);

  useEffect(() => {
    const applied = document.documentElement.getAttribute("data-theme");
    if (isTheme(applied)) setThemeState(applied);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const setTheme = useCallback((id) => {
    if (!isTheme(id)) return;
    setThemeState(id);

    const root = document.documentElement;
    root.setAttribute("data-theme", id);

    // Cross-fade the palette instead of snapping. The attribute is removed
    // afterwards so the transition never applies to ordinary interactions.
    root.setAttribute("data-theme-transition", "");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => root.removeAttribute("data-theme-transition"),
      300
    );

    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // private mode / storage disabled — theme still applies for this session
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
