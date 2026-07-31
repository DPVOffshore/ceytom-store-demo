const puppeteer = require("puppeteer-core");

const BASE = "http://127.0.0.1:3307";
const PAGES = [
  ["home", "/"],
  ["catalog", "/catalog"],
  ["product", "/product/lmb22"],
  ["quote", "/quote"],
  ["system", "/systems/main-switchboard"],
  ["brands", "/brands"],
];
const VIEWPORTS = [
  ["desktop", 1440, 900],
  ["mobile", 390, 844],
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/opt/google/chrome/chrome",
    args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
  });

  const problems = [];

  for (const [vpName, w, h] of VIEWPORTS) {
    for (const [name, path] of PAGES) {
      const page = await browser.newPage();
      await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
      const errors = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(String(e)));

      await page.goto(BASE + path, { waitUntil: "networkidle0", timeout: 60000 });
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
        path: `/tmp/shots/${vpName}-${name}.png`,
        fullPage: vpName === "desktop" && name === "home",
      });
      await page.close();
    }
  }

  await browser.close();
  if (problems.length === 0) console.log("No layout problems found.");
  else problems.forEach((p) => console.log("• " + p));
})();
