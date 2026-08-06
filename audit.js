const fs = require("fs");
const path = require("path");
const { launch, applyTheme, THEME_IDS } = require("./browser");

const BASE = process.env.AUDIT_BASE || "http://127.0.0.1:3307";
const SHOTS = process.env.AUDIT_SHOTS || path.join(__dirname, ".audit-shots");

const PAGES = [
  ["home", "/"],
  ["catalog", "/catalog"],
  ["product", "/product/lmb22"],
  ["product-assembly", "/product/pln22-r"],
  ["quote", "/quote"],
  ["quote-saved", "/quote/saved"],
  ["cross-reference", "/cross-reference"],
  ["system", "/systems/main-switchboard"],
  ["brands", "/brands"],
];

const VIEWPORTS = [
  ["desktop", 1440, 900],
  // the header carries six nav items, a theme switcher and a CTA — 1024 is the
  // narrowest width at which they all have to fit on one row
  ["laptop", 1024, 800],
  ["mobile", 390, 844],
];

(async () => {
  const browser = await launch();
  fs.mkdirSync(SHOTS, { recursive: true });

  const problems = [];

  for (const [vpName, w, h] of VIEWPORTS) {
    for (const [name, pathname] of PAGES) {
      const page = await browser.newPage();
      await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
      const errors = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(String(e)));

      await page.goto(BASE + pathname, { waitUntil: "networkidle0", timeout: 60000 });
      await new Promise((r) => setTimeout(r, 400));

      const audit = await page.evaluate(() => {
        const out = { overflow: [], tiny: [], lowContrast: [], imgNoAlt: 0, docWidth: 0 };
        out.docWidth = document.documentElement.scrollWidth;
        out.viewWidth = window.innerWidth;

        // horizontal overflow offenders
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.right > window.innerWidth + 2 || r.left < -2) {
            const sel =
              el.tagName.toLowerCase() +
              (el.className && typeof el.className === "string"
                ? "." + el.className.split(/\s+/).slice(0, 3).join(".")
                : "");
            if (out.overflow.length < 8) out.overflow.push({ sel, left: Math.round(r.left), right: Math.round(r.right) });
          }
        }

        // text smaller than 11px
        for (const el of document.querySelectorAll("p,span,li,dt,dd,a,button,label,th,td")) {
          if (!el.textContent.trim()) continue;
          const fs = parseFloat(getComputedStyle(el).fontSize);
          if (fs && fs < 11 && out.tiny.length < 8)
            out.tiny.push({ tag: el.tagName, fs, text: el.textContent.trim().slice(0, 30) });
        }

        // images missing alt
        out.imgNoAlt = [...document.querySelectorAll("img")].filter((i) => i.alt === null || i.alt === undefined).length;

        return out;
      });

      if (audit.docWidth > audit.viewWidth + 2)
        problems.push(`${vpName}/${name}: horizontal scroll (doc ${audit.docWidth} > vp ${audit.viewWidth})`);
      audit.overflow.forEach((o) => problems.push(`${vpName}/${name}: overflow ${o.sel} [${o.left}→${o.right}]`));
      audit.tiny.forEach((t) => problems.push(`${vpName}/${name}: ${t.fs}px text "${t.text}"`));
      errors.forEach((e) => problems.push(`${vpName}/${name}: console ${e.slice(0, 120)}`));

      await page.screenshot({
        path: path.join(SHOTS, `${vpName}-${name}.png`),
        fullPage: vpName === "desktop" && name === "home",
      });
      await page.close();
    }
  }

  // The header is the one piece of chrome every theme shares and the one most
  // likely to overflow, since theme names change the switcher's width.
  for (const theme of THEME_IDS) {
    for (const [vpName, w, h] of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
      await applyTheme(page, theme);
      await page.goto(BASE + "/cross-reference", { waitUntil: "networkidle0", timeout: 60000 });
      const width = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        vp: window.innerWidth,
      }));
      if (width.doc > width.vp + 2)
        problems.push(`${theme}/${vpName}: horizontal scroll (doc ${width.doc} > vp ${width.vp})`);
      await page.close();
    }
  }

  await browser.close();
  if (problems.length === 0) console.log("No layout problems found.");
  else problems.forEach((p) => console.log("• " + p));
  process.exitCode = problems.length ? 1 : 0;
})();
