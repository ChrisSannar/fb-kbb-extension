/**
 * One-time KBB taxonomy scraper. Run on YOUR machine (real Chromium, your IP) —
 * KBB is behind Akamai, so this won't work from a sandbox/CI.
 *
 *   bunx playwright install chromium     # once
 *   bun run probe                        # verify page structure first
 *   bun run scrape -- honda toyota       # scrape specific makes (or all if none given)
 *
 * Env:
 *   HEADLESS=1     run headless (default is headful — far better against Akamai)
 *   DELAY_MS=1500  per-request throttle
 *   WARMUP_MS=5000 pause after the homepage to clear a challenge by hand
 *   CHROME_PATH=/usr/bin/chromium   explicit browser binary (best vs Akamai)
 *   CHANNEL=chrome browser channel if installed (chrome|msedge); else bundled
 *   PROFILE=...    persistent profile dir (default scraper/.profile)
 *
 * Output: extension/taxonomy.json  (make -> model -> year -> [{slug, label?}])
 * `label` is the style link's visible text, e.g. "EX-L Sport Utility 4D".
 *
 * NOTE: the link-extraction regexes below assume KBB index pages link to their
 * children with clean paths (/make/, /make/model/, /make/model/year/,
 * /make/model/year/style/). Verify with `bun run probe` and adjust if wrong.
 */
import { chromium, type Page } from "playwright";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MAKES, resolveMakeSlug } from "../src/makes";
import type { KbbTaxonomy, KbbStyle } from "../src/taxonomy";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "extension", "taxonomy.json");
const SAMPLES = join(ROOT, "scraper", "samples");
const BASE = "https://www.kbb.com";
const DELAY = Number(process.env.DELAY_MS ?? 1500);
const HEADLESS = process.env.HEADLESS === "1";
const EXECUTABLE = process.env.CHROME_PATH; // explicit browser binary, overrides CHANNEL
const CHANNEL = process.env.CHANNEL; // e.g. "chrome" | "msedge" — only if installed
const PROFILE = process.env.PROFILE ?? join(ROOT, "scraper", ".profile");
const WARMUP = Number(process.env.WARMUP_MS ?? 5000); // pause after homepage

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Page fetches tallied across the run, so a silent block shows up at the end. */
const stats = { ok: 0, blocked: 0 };

async function goto(page: Page, url: string): Promise<boolean> {
  const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => null);
  await sleep(DELAY);
  const status = res?.status() ?? 0;
  const ok = status > 0 && status < 400;
  if (ok) stats.ok++;
  else {
    stats.blocked++;
    console.warn(`  ! ${status || "ERR"} ${url}`);
  }
  return ok;
}

/**
 * KBB lists non-style links under a year page too (specs, consumer-reviews,
 * deals-incentives, write-review). Real styles are body-style slugs ending in a
 * door count, e.g. "ex-l-sport-utility-4d". Keep those; drop the rest.
 */
const NON_STYLE = new Set([
  "specs", "consumer-reviews", "deals-incentives", "photos", "pictures",
  "pricing", "mpg", "recalls", "safety", "warranty", "reviews",
]);
function isStyleSlug(slug: string): boolean {
  return !NON_STYLE.has(slug) && !slug.includes("_");
}

/**
 * The make page mixes model links with marketing/utility links. Models are the
 * first path segment after the make; drop the known non-models and any bare
 * number (a year segment slipping through).
 */
const NON_MODEL = new Set([
  "build-and-price", "lease-deals", "deals-incentives", "incentives", "owners",
  "reviews", "news", "specs", "pictures", "photos", "videos", "compare",
  "dealers", "for-sale", "used-cars", "new-cars", "car-finder", "values", "pricing",
]);
function isModelSlug(slug: string): boolean {
  return !NON_MODEL.has(slug) && !/^\d+$/.test(slug);
}

/** Anchors on the page as {href, text}, whitespace-collapsed. */
async function anchors(page: Page): Promise<{ href: string; text: string }[]> {
  return page.$$eval("a[href]", (els) =>
    els.map((a) => ({
      href: (a as HTMLAnchorElement).getAttribute("href") ?? "",
      text: ((a as HTMLElement).textContent ?? "").replace(/\s+/g, " ").trim(),
    })),
  );
}

/** Collect the unique capture-group value from anchors whose path matches `re`. */
async function childSlugs(page: Page, re: RegExp): Promise<string[]> {
  const out = new Set<string>();
  for (const { href } of await anchors(page)) {
    const m = href.replace(BASE, "").match(re);
    if (m?.[1]) out.add(m[1]);
  }
  return [...out];
}

/**
 * Like childSlugs, but keeps each link's visible text as the style label.
 * First occurrence of a slug wins. Used at the style level so the popup can
 * show a human label (e.g. "EX-L Sport Utility 4D") instead of a bare slug.
 */
async function childStyles(page: Page, re: RegExp): Promise<KbbStyle[]> {
  const seen = new Map<string, string>();
  for (const { href, text } of await anchors(page)) {
    const m = href.replace(BASE, "").match(re);
    if (m?.[1] && isStyleSlug(m[1]) && !seen.has(m[1])) seen.set(m[1], text);
  }
  return [...seen].map(([slug, label]) => ({ slug, ...(label ? { label } : {}) }));
}

async function probe(page: Page): Promise<void> {
  mkdirSync(SAMPLES, { recursive: true });
  for (const [name, url] of [
    ["make-page", `${BASE}/honda/`],
    ["year-page", `${BASE}/honda/pilot/2003/`],
    ["model-page", `${BASE}/honda/pilot/`],
    ["sitemap-index", `${BASE}/sitemap-index.xml`],
  ] as const) {
    const ok = await goto(page, url);
    const html = await page.content();
    writeFileSync(join(SAMPLES, `${name}.html`), html);
    console.log(`probe ${name}: ${ok ? "ok" : "blocked"} -> scraper/samples/${name}.html (${html.length}b)`);
  }
  console.log("\nInspect the samples, confirm the child-link regexes, then run `bun run scrape`.");
}

async function scrape(page: Page, makeFilter: string[]): Promise<void> {
  const taxonomy: KbbTaxonomy = existsSync(OUT)
    ? (JSON.parse(readFileSync(OUT, "utf8")) as KbbTaxonomy)
    : {};
  const makes = makeFilter.length
    ? MAKES.filter((m) => makeFilter.includes(resolveMakeSlug(m)) || makeFilter.includes(m.toLowerCase()))
    : MAKES;

  for (const make of makes) {
    const mk = resolveMakeSlug(make);
    if (!(await goto(page, `${BASE}/${mk}/`))) continue;
    // First segment after the make on ANY link (models are linked with a year,
    // e.g. /honda/accord/2025/, so don't require a clean /honda/accord/ path).
    const models = (await childSlugs(page, new RegExp(`^/${mk}/([^/?#]+)/`))).filter(isModelSlug);
    console.log(`${make}: ${models.length} models`);

    for (const model of models) {
      if (!(await goto(page, `${BASE}/${mk}/${model}/`))) continue;
      const years = await childSlugs(page, new RegExp(`^/${mk}/${model}/((?:19|20)\\d\\d)/?$`));

      for (const year of years) {
        if (!(await goto(page, `${BASE}/${mk}/${model}/${year}/`))) continue;
        const styles = await childStyles(page, new RegExp(`^/${mk}/${model}/${year}/([^/?#]+)/?$`));
        if (!styles.length) continue;
        ((taxonomy[mk] ??= {})[model] ??= {})[year] = styles;
        writeFileSync(OUT, JSON.stringify(taxonomy)); // checkpoint after each year
        const labelled = styles.filter((s) => s.label).length;
        console.log(`  ${mk}/${model}/${year}: ${styles.length} styles (${labelled} labelled)`);
      }
    }
  }
  const entries = Object.values(taxonomy).flatMap((m) => Object.values(m).flatMap(Object.keys)).length;
  console.log(`\nFetched ok: ${stats.ok}  blocked/failed: ${stats.blocked}`);
  if (stats.ok === 0) {
    console.log("Every request was blocked — Akamai. Warm the profile first (run `bun run probe`, solve any challenge), then re-run scrape.");
  } else if (entries === 0) {
    console.log("Pages loaded but no styles parsed — the link structure changed; re-check the regexes against a fresh probe.");
  } else {
    console.log(`Wrote ${entries} make/model/year entries -> ${OUT}. Rebuild with \`bun run build\`.`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isProbe = args.includes("--probe");
  const makeFilter = args.filter((a) => !a.startsWith("--")).map((a) => a.toLowerCase());

  // Real installed Chrome + a persistent profile beats bundled Chromium against
  // Akamai: genuine UA/client-hints, no spoof mismatch, and the _abck sensor
  // cookie persists between runs once it's warmed up. No UA override — a real
  // Chrome that lies about its UA is itself a tell.
  mkdirSync(PROFILE, { recursive: true });
  // Pick a browser: explicit binary (CHROME_PATH) > named channel (CHANNEL) >
  // Playwright's bundled Chromium. A real distro browser fares best vs Akamai.
  const browserChoice = EXECUTABLE
    ? { executablePath: EXECUTABLE }
    : CHANNEL
      ? { channel: CHANNEL }
      : {};
  const context = await chromium.launchPersistentContext(PROFILE, {
    headless: HEADLESS,
    ...browserChoice,
    viewport: { width: 1280, height: 900 },
    args: ["--disable-blink-features=AutomationControlled"],
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  const page = context.pages()[0] ?? (await context.newPage());

  try {
    // Warm up on the homepage so Akamai issues a valid sensor cookie before we
    // crawl. On a fresh profile (headful) you may have to clear one challenge by
    // hand in the visible window — WARMUP_MS gives you time, and it's saved to
    // the profile so later runs sail through.
    await goto(page, `${BASE}/`);
    await sleep(WARMUP);
    if (isProbe) await probe(page);
    else await scrape(page, makeFilter);
  } finally {
    await context.close();
  }
}

main();
