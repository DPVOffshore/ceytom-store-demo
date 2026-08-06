const { launch, applyTheme, THEME_IDS } = require("./browser");

const BASE = process.env.CONTRAST_BASE || "http://127.0.0.1:3307";

const PAGES = [
  "/",
  "/catalog",
  "/product/lmb22",
  "/product/pln22-r",
  "/quote",
  "/quote/saved",
  "/cross-reference",
  "/systems/main-switchboard",
  "/brands",
  "/about",
  "/contact",
  "/policies/terms",
];

/**
 * The one accepted exemption: WCAG does not apply a contrast minimum to a
 * disabled control, and the submit button is deliberately dimmed until the
 * request has a line in it. Matched on the text, not the ratio, so a genuine
 * regression on the enabled button is still reported.
 */
const EXEMPT = [{ text: "Send quote request", reason: "disabled control — exempt under WCAG 1.4.3" }];

const sweep = () => {
  function lum([r, g, b]) {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  function parse(c) {
    const m = c.match(/[\d.]+/g);
    if (!m) return null;
    const [r, g, b, a] = m.map(Number);
    return { rgb: [r, g, b], a: a === undefined ? 1 : a };
  }
  function blend(fg, bg) {
    return fg.rgb.map((v, i) => v * fg.a + bg[i] * (1 - fg.a));
  }
  function ratio(a, b) {
    const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  }

  const out = [];
  const els = document.querySelectorAll(
    "p,span,li,dt,dd,a,button,h1,h2,h3,label,th,td,input,textarea,select,strong,em,option"
  );
  for (const el of els) {
    const text = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(" ")
      .trim();
    if (!text) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;

    const cs = getComputedStyle(el);
    const fg = parse(cs.color);
    if (!fg) continue;

    // composite the full ancestor chain so semi-transparent panels
    // resolve against what is actually behind them
    const stack = [];
    for (let node = el; node; node = node.parentElement) {
      const b = parse(getComputedStyle(node).backgroundColor);
      if (b && b.a > 0) stack.push(b);
      if (b && b.a > 0.99) break;
    }
    let bgRgb = [255, 255, 255];
    for (let i = stack.length - 1; i >= 0; i--) bgRgb = blend(stack[i], bgRgb);

    const eff = fg.a < 1 ? blend(fg, bgRgb) : fg.rgb;
    const c = ratio(eff, bgRgb);
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    if (c < need - 0.01) {
      out.push({
        text: text.slice(0, 34),
        ratio: +c.toFixed(2),
        need,
        size,
        disabled: el.disabled === true || el.getAttribute("aria-disabled") === "true",
        fg: cs.color,
        bg: `rgb(${bgRgb.map(Math.round).join(",")})`,
      });
    }
  }
  // dedupe by text+ratio
  const seen = new Set();
  return out.filter((o) => {
    const k = o.text + o.ratio;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

(async () => {
  const browser = await launch();
  const byTheme = new Map();

  // Every palette, not just whichever one happens to be active. A pass on the
  // default proves nothing about the other four — the inks are tuned per theme.
  for (const theme of THEME_IDS) {
    const failures = [];
    for (const pathname of PAGES) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await applyTheme(page, theme);
      await page.goto(BASE + pathname, { waitUntil: "networkidle0", timeout: 60000 });

      const active = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
      if (active !== theme) {
        failures.push({ path: pathname, text: `THEME NOT APPLIED (got ${active})`, ratio: 0, need: 0, size: 0 });
        await page.close();
        continue;
      }

      const fails = await page.evaluate(sweep);
      fails.forEach((f) => failures.push({ path: pathname, ...f }));
      await page.close();
    }
    byTheme.set(theme, failures);
  }

  await browser.close();

  let real = 0;
  let exempted = 0;

  for (const theme of THEME_IDS) {
    const failures = byTheme.get(theme);
    const exempt = failures.filter((f) => EXEMPT.some((e) => f.text.startsWith(e.text)));
    const hard = failures.filter((f) => !EXEMPT.some((e) => f.text.startsWith(e.text)));
    real += hard.length;
    exempted += exempt.length;

    if (hard.length === 0) {
      console.log(
        `${theme.padEnd(16)} PASS  (${exempt.length} exempt: disabled submit button)`
      );
    } else {
      console.log(`${theme.padEnd(16)} ${hard.length} failure${hard.length === 1 ? "" : "s"}`);
      for (const f of hard.slice(0, 12)) {
        console.log(`   ${f.path}  ${f.ratio}:1 (need ${f.need}, ${f.size}px)  "${f.text}"`);
        console.log(`       fg ${f.fg} on ${f.bg}`);
      }
      if (hard.length > 12) console.log(`   … and ${hard.length - 12} more`);
    }
  }

  console.log("");
  if (real === 0)
    console.log(
      `All text passes WCAG AA contrast across all ${THEME_IDS.length} themes (${exempted} exempt disabled-control instances).`
    );
  else console.log(`${real} contrast failures across ${THEME_IDS.length} themes.`);
  process.exitCode = real ? 1 : 0;
})();
