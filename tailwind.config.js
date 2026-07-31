/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // sampled directly from the Ceytom mark
        navy: "#012731",
        deep: "#073D4A",
        teal: "#078F93",
        coral: "#EB6A4C",      /* logo coral — backgrounds, paired with navy text */
        coralink: "#C94A2E",   /* coral text on light backgrounds (4.66:1) */
        tealink: "#06787C",    /* teal small text on light backgrounds (4.5:1) */
        mist: "#E9EEF1",
        tint: "#B7EEF1",
        slate: "#0F2B33",
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
