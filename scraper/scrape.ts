/**
 * One-time KBB taxonomy scraper. Run on YOUR machine (real Chromium, your IP) —
 * KBB is behind Akamai, so this won't work from a sandbox/CI.
 *
 *   bunx playwright install chromium     # once
 *   bun run probe                        # verify page structure first
 *   bun run scrape -- honda toyota       # scrape specific makes (or all if none given)
 *
 * Env:
 *   HEADLESS=1   run headless (default is headful — better against Akamai)
 *   DELAY_MS=1500  per-request throttle
 *
 * Output: extension/taxonomy.json  (make -> model -> year -> [{slug}])
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function goto(page: Page, url: string): Promise<boolean> {
  const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => null);
  await sleep(DELAY);
  const ok = !!res && res.status() < 400;
  if (!ok) console.warn(`  ! ${res?.status() ?? "ERR"} ${url}`);
  return ok;
}

/** Collect the unique capture-group value from anchors whose path matches `re`. */
async function childSlugs(page: Page, re: RegExp): Promise<string[]> {
  const hrefs = await page.$$eval("a[href]", (els) =>
    els.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? ""),
  );
  const out = new Set<string>();
  for (const h of hrefs) {
    const m = h.replace(BASE, "").match(re);
    if (m?.[1]) out.add(m[1]);
  }
  return [...out];
}

async function probe(page: Page): Promise<void> {
  mkdirSync(SAMPLES, { recursive: true });
  for (const [name, url] of [
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
    const models = await childSlugs(page, new RegExp(`^/${mk}/([^/?#]+)/?$`));
    console.log(`${make}: ${models.length} models`);

    for (const model of models) {
      if (!(await goto(page, `${BASE}/${mk}/${model}/`))) continue;
      const years = await childSlugs(page, new RegExp(`^/${mk}/${model}/((?:19|20)\\d\\d)/?$`));

      for (const year of years) {
        if (!(await goto(page, `${BASE}/${mk}/${model}/${year}/`))) continue;
        const slugs = await childSlugs(page, new RegExp(`^/${mk}/${model}/${year}/([^/?#]+)/?$`));
        if (!slugs.length) continue;
        const styles: KbbStyle[] = slugs.map((slug) => ({ slug }));
        ((taxonomy[mk] ??= {})[model] ??= {})[year] = styles;
        writeFileSync(OUT, JSON.stringify(taxonomy)); // checkpoint after each year
        console.log(`  ${mk}/${model}/${year}: ${styles.length} styles`);
      }
    }
  }
  console.log(`\nDone -> ${OUT}. Rebuild the extension with \`bun run build\`.`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isProbe = args.includes("--probe");
  const makeFilter = args.filter((a) => !a.startsWith("--")).map((a) => a.toLowerCase());

  const browser = await chromium.launch({ headless: HEADLESS });
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  } as never);
  try {
    if (isProbe) await probe(page);
    else await scrape(page, makeFilter);
  } finally {
    await browser.close();
  }
}

main();
