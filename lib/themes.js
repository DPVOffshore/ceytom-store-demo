// Theme registry. The colour values here are for the swatch previews in the
// navbar switcher only — the actual palettes live as CSS custom properties in
// app/globals.css, keyed off [data-theme] on <html>. Keep the two in sync.

export const STORAGE_KEY = "ceytom-theme";
export const DEFAULT_THEME = "current";

export const THEMES = [
  {
    id: "current",
    name: "Current",
    tagline: "The live Ceytom palette",
    swatches: ["#012731", "#EB6A4C", "#078F93", "#E9EEF1"],
  },
  {
    id: "deep-harbour",
    name: "Deep Harbour",
    tagline: "Trustworthy, nautical, premium",
    swatches: ["#12354B", "#1B8A9C", "#E8DCC0", "#F4F6F7"],
  },
  {
    id: "chandlery",
    name: "Chandlery",
    tagline: "Industrial, bold, high-contrast",
    swatches: ["#22303A", "#FF6B4A", "#4A5C68", "#F4F1EA"],
  },
  {
    id: "tide-and-teak",
    name: "Tide & Teak",
    tagline: "Warm, approachable, marine-classic",
    swatches: ["#2C5F73", "#E9A13B", "#8FB8C4", "#EFEAE0"],
  },
  {
    id: "switchboard",
    name: "Switchboard",
    tagline: "Monochrome panel, safety-yellow accent",
    swatches: ["#000000", "#FFC91E", "#575757", "#FFFFFF"],
  },
];

export const THEME_IDS = THEMES.map((t) => t.id);

export function isTheme(id) {
  return THEME_IDS.includes(id);
}

/**
 * Runs blocking in <head>, before first paint, so a saved theme is already on
 * <html> by the time any pixel is drawn. Without this the page renders one
 * frame in the default palette on every refresh.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY
)});var ids=${JSON.stringify(THEME_IDS)};document.documentElement.setAttribute("data-theme",ids.indexOf(t)>-1?t:${JSON.stringify(
  DEFAULT_THEME
)});}catch(e){document.documentElement.setAttribute("data-theme",${JSON.stringify(
  DEFAULT_THEME
)});}})();`;
