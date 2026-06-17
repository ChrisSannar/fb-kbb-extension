# Developer notes

Technical reference for `fb-kbb-extension`. End-user install steps live in [README.md](README.md).

## Build

```bash
bun install        # optional — the build has no runtime npm deps
bun run build      # bundles src/{content,popup,background}.ts -> extension/
bun test           # url-builder, parser, style-selection, carcomplaints
bun run typecheck  # tsc --noEmit
```

`bun run build` is the only required step to ship; it bundles into `extension/`, which is the
folder loaded into the browser. It must contain `manifest.json`, `popup.html`, `content.js`,
`popup.js`, `background.js`, `taxonomy.json`, and `icons/`. Icons are committed; regenerate with
`bun run icons`. After any code change, rebuild, then click **↻ reload** on the
`chrome://extensions` card and refresh the Facebook tab. The setup scripts (`setup.sh`,
`setup.command`, `setup.bat`) wrap "install Bun if missing → `bun run build`" for non-developers.

## How it works

- **Content script** (`content.ts`) runs on FB Marketplace pages. It doesn't touch the page UI —
  it waits for the popup to ask, then reads **year / make / model** from the listing (FB's
  structured "About this vehicle" fields first, falling back to parsing the title like
  `2003 Honda Pilot EX-L`). It returns the best-effort parse; the popup owns everything else.
- **Popup** (`popup.ts`) shows two editable, prefilled sections:
  - **KBB** — cascading datalists from the bundled taxonomy (make → model → year → style slugs).
    Style defaults to the cheapest/base trim (`styles[0]`, since KBB lists base-first). Builds the
    URL via `buildKbbUrl` in `src/url-builder.ts`.
  - **CarComplaints** — its own human-cased make/model/year fields. `buildCarComplaintsUrl`
    (`src/carcomplaints.ts`) produces `/{Make}/{Model}/{Year}/`; `ccModelSegment` capitalizes each
    word and underscores spaces (`grand cherokee` → `Grand_Cherokee`) while leaving already-correct
    casing intact (`CX-5` stays `CX-5`).
- **Background service worker** (`background.ts`) greys out the toolbar icon unless the active tab
  is on `facebook.com/marketplace/*`.
- The KBB/CarComplaints URLs are **built locally — no network access.** The extension never
  contacts either site; it only constructs URL strings. The site loads only when *you* click.

See `CONTEXT.md` for the precise vocabulary (Style vs Trim vs Body style, etc.).

## KBB taxonomy scraper (optional — exact trim pages)

By default KBB opens the year-level page (`/honda/pilot/2003/`) and you pick the trim there. To
deep-link to an exact trim, populate `extension/taxonomy.json` with the one-time scraper. It
**must run on your own machine** (real Chromium, your IP) — KBB is behind Akamai bot-protection,
so it won't work from a server/CI.

```bash
bunx playwright install chromium     # one-time: download the browser
bun run probe                        # sanity check — dumps scraper/samples/*.html
bun run scrape -- honda toyota       # scrape specific makes (omit args to do all)
bun run scrape -- mazda/tribute      # targeted: one model (incl. discontinued ones the
                                     # make page no longer links); add /2005 for one year
bun run build                        # re-bundle so the new taxonomy.json ships
```

It checkpoints after every year, so a long scrape is resumable. The extension safely **falls back
to the year-level URL** for any vehicle not in the taxonomy, so a partial scrape is fine. If
`bun run probe` shows KBB no longer links children as `/make/model/year/style/` paths, adjust the
regexes in `scraper/scrape.ts`.

## Troubleshooting

- **Popup says "Open a Facebook Marketplace vehicle listing…".** The content script only loads on
  `/marketplace/*`. Be on an individual listing (`/marketplace/item/...`) and **refresh** after
  loading/reloading the extension.
- **Popup couldn't read the vehicle.** The FB DOM selectors didn't find year/make/model — just type
  them into the popup fields. To fix at the source, tweak `readTitle`/`readFields` in
  `src/content.ts`, rebuild, reload.
- **A link is wrong / 404s.** Inspect it (right-click → Copy link address). For KBB, add a make-slug
  override in `src/makes.ts` (`MAKE_SLUG_OVERRIDES`). For CarComplaints, just correct the field
  (irregular casing like `c-class` the rule can't infer is expected to be hand-fixed).
- **Extension errored.** On the `chrome://extensions` card click **Errors** / **service worker** /
  **Inspect views**; right-click the popup → **Inspect** to debug it. Confirm `bun run build`
  produced `extension/content.js` and `extension/popup.js`.

## Known limitations

- Title-fallback parsing grabs a single model token, so multi-word models (e.g. "Grand Cherokee")
  rely on FB's structured fields — or on you editing the popup field.
- FB DOM selectors (`readFields`, title `<h1>`) in `src/content.ts` are best-guess until verified on
  a live listing.
- Tricky KBB make slugs are handled via `MAKE_SLUG_OVERRIDES` in `src/makes.ts`; add entries as
  404s surface.
