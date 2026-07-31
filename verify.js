const puppeteer = require("puppeteer-core");
const BASE = "http://127.0.0.1:3302";

function lum(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
function parse(c) {
  const m = c.match(/(\d+(?:\.\d+)?)/g);
  return m ? m.slice(0, 3).map(Number) : [255, 255, 255];
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/opt/google/chrome/chrome",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(BASE + "/", { waitUntil: "networkidle0" });

  const info = await page.evaluate(() => {
    const fonts = [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.status}`);
    const h1 = document.querySelector("h1");
    const mono = document.querySelector(".data");
    const eyebrow = document.querySelector(".eyebrow");
    const cs = (el) => {
      if (!el) return null;
      const s = getComputedStyle(el);
      return {
        family: s.fontFamily.split(",")[0].replace(/"/g, ""),
        size: s.fontSize,
        weight: s.fontWeight,
        tracking: s.letterSpacing,
        color: s.color,
      };
    };
    // sample the hero background
    const hero = document.querySelector("section");
    return {
      loadedFonts: [...new Set(fonts)],
      h1: cs(h1),
      h1Text: h1?.textContent.trim().slice(0, 60),
      mono: cs(mono),
      eyebrow: cs(eyebrow),
      heroBg: hero ? getComputedStyle(hero).backgroundColor : null,
      radii: [...new Set([...document.querySelectorAll("a,button,div,article")]
        .map((e) => getComputedStyle(e).borderRadius)
        .filter((r) => r && r !== "0px"))].slice(0, 6),
      imgCount: document.querySelectorAll("img").length,
      brokenImgs: [...document.querySelectorAll("img")].filter((i) => i.complete && i.naturalWidth === 0).length,
    };
  });

  console.log("Loaded fonts:");
  info.loadedFonts.forEach((f) => console.log("  " + f));
  console.log("\nh1:", JSON.stringify(info.h1), "\n   text:", info.h1Text);
  console.log("mono sample:", JSON.stringify(info.mono));
  console.log("eyebrow:", JSON.stringify(info.eyebrow));
  console.log("hero bg:", info.heroBg);
  console.log("non-zero radii found:", info.radii.length ? info.radii.join(", ") : "none (as intended)");
  console.log("images:", info.imgCount, "broken:", info.brokenImgs);

  // contrast checks on key text/background pairs
  const pairs = await page.evaluate(() => {
    const out = [];
    const sel = [
      ["h1", "hero heading"],
      ["section p", "hero body"],
      [".eyebrow", "eyebrow"],
      ["a[href='/quote']", "primary CTA"],
    ];
    for (const [s, label] of sel) {
      const el = document.querySelector(s);
      if (!el) continue;
      let bgEl = el;
      let bg = "rgba(0, 0, 0, 0)";
      while (bgEl && (bg === "rgba(0, 0, 0, 0)" || bg === "transparent")) {
        bg = getComputedStyle(bgEl).backgroundColor;
        bgEl = bgEl.parentElement;
      }
      out.push({ label, fg: getComputedStyle(el).color, bg, size: getComputedStyle(el).fontSize });
    }
    return out;
  });

  console.log("\nContrast:");
  for (const p of pairs) {
    const r = ratio(parse(p.fg), parse(p.bg));
    const large = parseFloat(p.size) >= 24;
    const need = large ? 3 : 4.5;
    console.log(
      `  ${p.label.padEnd(15)} ${r.toFixed(2)}:1  ${r >= need ? "PASS" : "FAIL"} (needs ${need}, ${p.size})`
    );
  }

  await browser.close();
})();
