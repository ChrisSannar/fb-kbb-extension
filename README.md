# fb-kbb-extension

Private Chrome extension. Adds a **toolbar icon** that, while you're on a Facebook Marketplace car listing, opens a small popup with two sections — a **"Check on KBB"** link to the matching Kelley Blue Book valuation page, and a **"View on CarComplaints"** link to the matching CarComplaints.com page. Both have editable, prefilled fields. Personal use only — not published.

---

## Quick start — get it running

You need [Bun](https://bun.sh) installed (`curl -fsSL https://bun.sh/install | bash`) and Google Chrome (or any Chromium browser: Edge, Brave).

### 1. Build the extension

```bash
cd fb-kbb-extension
bun install
bun run build
```

`bun run build` bundles `src/content.ts`, `src/popup.ts`, and `src/background.ts` into `extension/`. **You must run it before loading** (and again after any code change). The folder you load into Chrome is `extension/` — it needs `manifest.json`, `popup.html`, `content.js`, `popup.js`, `background.js`, `taxonomy.json`, and `icons/` present. (The icons are committed; regenerate with `bun run icons` if needed.)

### 2. Load it into Chrome

1. Open `chrome://extensions` in the address bar.
2. Turn on **Developer mode** (toggle, top-right).
3. Click **Load unpacked**.
4. Select the **`fb-kbb-extension/extension`** folder (the inner one, not the repo root).

You'll see a "FB Marketplace → KBB" card appear. Click the **puzzle-piece** icon in Chrome's toolbar and **pin** it so its blue "K" icon stays visible. That's it — it's installed.

### 3. Try it

1. Go to a Facebook Marketplace **car listing** — the URL must look like
   `https://www.facebook.com/marketplace/item/123456789...` (an individual listing, not the search grid). You must be logged in to Facebook.
2. Click the extension's **toolbar icon**. A popup opens showing the parsed vehicle (e.g. "2003 Honda Pilot") and a blue **"Check on KBB"** link.
3. Click the link → a new tab opens on KBB for that year/make/model. Adjust trim/mileage on KBB if you like.

If the listing can't be read, the popup shows a short error instead (e.g. "Open a Facebook Marketplace vehicle listing first.").

With the default (empty) taxonomy it opens the **year-level** KBB page; do [Phase 2](#phase-2-optional--exact-trim-pages) to land on exact trims.

### Re-running after a code change

```bash
bun run build                       # rebuild content.js
```

Then in `chrome://extensions` click the **↻ reload** icon on the extension card, and **refresh** the Facebook tab.

---

## Troubleshooting

- **Popup says "Open a Facebook Marketplace vehicle listing…".** The content script only loads on `/marketplace/*` pages. Make sure you're on an individual listing (`/marketplace/item/...`) and **refresh** the tab after loading/reloading the extension.
- **Popup says it couldn't read the vehicle.** The FB DOM selectors didn't find year/make/model. The listing title `<h1>` and structured fields are the inputs — see limitations; tweak `readTitle`/`readFields` in `src/content.ts`, rebuild, reload.
- **KBB link is wrong / 404s.** The make/model parsed from the listing didn't map to a KBB path. Right-click the link → Copy link address to inspect it. Fixes: add a make-slug override in `src/makes.ts`, or adjust the selectors in `src/content.ts`. Rebuild + reload after editing.
- **Nothing / extension errored.** On the `chrome://extensions` card, click **Errors** or **service worker**/**Inspect views** to see logs; right-click the popup → **Inspect** to debug it. Make sure `bun run build` produced `extension/content.js` and `extension/popup.js`.

---

## How it works

- The **content script** (`content.ts`) runs on FB Marketplace pages. It doesn't touch the page UI — it just waits for the popup to ask, then reads **year / make / model** from the listing (FB's structured "About this vehicle" fields first, falling back to parsing the title like `2003 Honda Pilot EX-L`).
- The **popup** (`popup.ts`, opened from the toolbar icon) messages the content script for the active tab, then shows the KBB link or a one-line error.
- The **background service worker** (`background.ts`) greys out / disables the toolbar icon unless the active tab is on `facebook.com/marketplace/*`, so the popup only opens where it's useful.
- The KBB URL is **built locally — no network access.** The extension never contacts KBB or any server; it only constructs a URL string from the FB page data plus its bundled taxonomy. KBB is loaded only when *you* click the link.
- Defaults the rest: `condition=good`, `intent=buy-used`, `pricetype=private-party`.

See `CONTEXT.md` for the precise vocabulary (Style vs Trim vs Body style, etc.).

---

## Phase 2 (optional) — exact trim pages

By default the button opens the year-level page (`/honda/pilot/2003/`) and you pick the trim on KBB. To make it deep-link to the exact trim (`/honda/pilot/2003/ex-l-sport-utility-4d/`), populate the bundled taxonomy with the one-time scraper.

This **must run on your own machine** (real Chromium, your IP) — KBB is behind Akamai bot-protection, so it won't work from a server/CI.

```bash
bunx playwright install chromium     # one-time: download the browser
bun run probe                        # sanity check — dumps scraper/samples/*.html
bun run scrape -- honda toyota       # scrape specific makes (omit args to do all)
bun run build                        # re-bundle so the new taxonomy.json ships
```

Then reload the extension (step "Re-running after a code change"). It checkpoints after every year, so a long scrape is resumable. If `bun run probe` shows KBB's pages don't link children as `/make/model/year/style/` paths, the regexes in `scraper/scrape.ts` need a small tweak — paste a sample and adjust.

The extension safely **falls back to the year-level URL** for any vehicle not in the taxonomy, so a partial scrape is fine.

---

## Development

```bash
bun test          # url-builder, parser, style-selection
bun run typecheck # tsc --noEmit
```

### Known limitations

- Title-fallback parsing grabs a single model token, so multi-word models (e.g. "Grand Cherokee") rely on FB's structured fields being present.
- FB DOM selectors (`readFields`, title `<h1>`) in `src/content.ts` are best-guess until verified on a live listing — expect to tweak them once against a real page.
- Tricky make slugs are handled via `MAKE_SLUG_OVERRIDES` in `src/makes.ts`; add entries as 404s surface.
