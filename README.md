# fb-kbb-extension

Private Chrome extension. On a Facebook Marketplace car listing, adds a **"Check on KBB"** button that opens the matching Kelley Blue Book valuation page in a new tab.

Personal use only — not published. See `CONTEXT.md` for domain language.

## How it works (v1)

- Reads **year / make / model** from the listing (FB structured fields, falling back to the title).
- Builds a **year-level** KBB URL: `/{make}/{model}/{year}/?condition=good&intent=buy-used&pricetype=private-party`.
- Opens it. KBB shows the trim picker; you adjust trim/mileage there.
- **No network access** — the extension never contacts KBB; it only constructs a URL.

## Phase 2 — exact trim/Style links (built, needs data)

The extension already prefers an exact **Style** URL (e.g. `/honda/pilot/2003/ex-l-sport-utility-4d/`) when the vehicle is in the bundled `extension/taxonomy.json`, matching the listing's trim if present, else the base style. It **falls back to the v1 year-level URL** when the vehicle isn't in the Taxonomy — so an empty/partial taxonomy is safe.

`extension/taxonomy.json` ships empty; fill it with the scraper:

```bash
bunx playwright install chromium     # once
bun run probe                        # dumps scraper/samples/*.html — verify page structure
bun run scrape -- honda toyota       # scrape specific makes (omit args for all)
bun run build                        # re-bundle so the new taxonomy ships
```

The scraper runs **headful by default** (better against Akamai) and must run on your own machine — it won't work from a sandbox/CI. It checkpoints after every year, so it's resumable. If `probe` shows KBB's child links don't match the assumed path pattern, the regexes in `scraper/scrape.ts` need a tweak.

## Build & load

```bash
bun install
bun test          # url-builder + parser
bun run build     # bundles src/content.ts -> extension/content.js
```

Then in Chrome: `chrome://extensions` → enable Developer mode → **Load unpacked** → select the `extension/` folder.

## Known v1 limitations

- Title-fallback parsing grabs a single model token, so multi-word models (e.g. "Grand Cherokee") rely on FB's structured fields.
- FB DOM selectors (`readFields`, title `<h1>`) are best-guess until verified on a live listing — expect to tweak them once.
- Tricky make slugs are handled via `MAKE_SLUG_OVERRIDES` in `src/makes.ts`; add entries as 404s surface.
