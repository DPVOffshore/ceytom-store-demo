/**
 * Shared browser bootstrap for audit.js and contrast.js.
 *
 * Chrome lives in a different place on every machine, so the path is resolved
 * rather than hard-coded: CHROME_PATH wins, then the usual install locations for
 * Linux, macOS and Windows. Nothing about what the audits check is affected.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const puppeteer = require("puppeteer-core");

/**
 * lib/themes.js is an ES module and these scripts are CommonJS, so the registry
 * is read out of the source rather than duplicated here. A theme added to the
 * app is picked up by the audits automatically — a second hand-kept list would
 * silently stop covering new palettes.
 */
function readThemeRegistry() {
  const src = fs.readFileSync(path.join(__dirname, "lib", "themes.js"), "utf8");
  const storage = src.match(/STORAGE_KEY\s*=\s*"([^"]+)"/);
  const ids = [...src.matchAll(/^\s*id:\s*"([^"]+)"/gm)].map((m) => m[1]);
  if (!storage || ids.length === 0)
    throw new Error("Could not read the theme registry from lib/themes.js");
  return { STORAGE_KEY: storage[1], THEME_IDS: ids };
}

const CANDIDATES = [
  process.env.CHROME_PATH,
  "/opt/google/chrome/chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  path.join(process.env["PROGRAMFILES"] || "C:\\Program Files", "Google/Chrome/Application/chrome.exe"),
  path.join(process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)", "Google/Chrome/Application/chrome.exe"),
  path.join(os.homedir(), "AppData/Local/Google/Chrome/Application/chrome.exe"),
  path.join(process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)", "Microsoft/Edge/Application/msedge.exe"),
  path.join(process.env["PROGRAMFILES"] || "C:\\Program Files", "Microsoft/Edge/Application/msedge.exe"),
].filter(Boolean);

const { STORAGE_KEY, THEME_IDS } = readThemeRegistry();

function chromePath() {
  for (const c of CANDIDATES) if (fs.existsSync(c)) return c;
  throw new Error(
    "No Chrome or Edge binary found. Set CHROME_PATH to the executable and re-run."
  );
}

async function launch() {
  return puppeteer.launch({
    executablePath: chromePath(),
    args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
  });
}

/**
 * Force a palette before the page paints. The site's own pre-paint script reads
 * this key, so seeding localStorage is exactly what a returning visitor does —
 * no test-only code path.
 */
async function applyTheme(page, theme) {
  await page.evaluateOnNewDocument(
    (key, value) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* ignore */
      }
    },
    STORAGE_KEY,
    theme
  );
}

module.exports = { launch, chromePath, applyTheme, THEME_IDS, STORAGE_KEY };
