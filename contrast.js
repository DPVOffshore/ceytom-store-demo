const puppeteer = require("puppeteer-core");
const BASE = "http://127.0.0.1:3307";
const PAGES = ["/", "/catalog", "/product/lmb22", "/quote", "/systems/main-switchboard", "/brands", "/about", "/contact", "/policies/terms"];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/opt/google/chrome/chrome",
    args: ["--no-sandbox", "--disable-gpu"],
  });

  const all = [];
  for (const path of PAGES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(BASE + path, { waitUntil: "networkidle0" });

    const fails = await page.evaluate(() => {
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
      const els = document.querySelectorAll("p,span,li,dt,dd,a,button,h1,h2,h3,label,th,td,input,textarea,select");
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
    });

    fails.forEach((f) => all.push({ path, ...f }));
    await page.close();
  }

  await browser.close();

  if (!all.length) {
    console.log("All text passes WCAG AA contrast.");
  } else {
    console.log(`${all.length} contrast failures:\n`);
    for (const f of all.slice(0, 30)) {
      console.log(`  ${f.path}  ${f.ratio}:1 (need ${f.need}, ${f.size}px)  "${f.text}"`);
      console.log(`      fg ${f.fg} on ${f.bg}`);
    }
  }
})();
