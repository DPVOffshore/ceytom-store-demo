/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Every colour resolves through a CSS custom property defined in
      // app/globals.css, so swapping [data-theme] on <html> recolours the
      // whole site. The <alpha-value> placeholder is what keeps opacity
      // modifiers (bg-primary/10, text-ink/70) working.
      colors: {
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
          soft: "rgb(var(--color-primary-soft) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
          ink: "rgb(var(--color-accent-ink) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--color-secondary) / <alpha-value>)",
          ink: "rgb(var(--color-secondary-ink) / <alpha-value>)",
        },
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        base: "rgb(var(--color-base) / <alpha-value>)",
        tint: "rgb(var(--color-tint) / <alpha-value>)",
        ink: "rgb(var(--color-text) / <alpha-value>)",
        "on-primary": "rgb(var(--color-text-on-primary) / <alpha-value>)",
        "on-accent": "rgb(var(--color-text-on-accent) / <alpha-value>)",
      },
      fontFamily: {
        display: ["Archivo Variable", "Archivo", "system-ui", "sans-serif"],
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        none: "0",
        DEFAULT: "2px",
        sm: "2px",
        md: "3px",
      },
      maxWidth: { shell: "1320px" },
    },
  },
  plugins: [],
};
