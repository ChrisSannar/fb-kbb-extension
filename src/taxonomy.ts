/**
 * KBB vehicle taxonomy: the slug data we scrape once from KBB so the extension
 * can rebuild a valuation URL from a Facebook Marketplace listing.
 *
 * Shape: make -> model -> year -> list of styles.
 * A "style" is the path segment KBB uses, e.g. "ex-l-sport-utility-4d",
 * plus the `category` query param that goes with it (e.g. "suv").
 */
export interface KbbStyle {
  /** Path slug, e.g. "ex-l-sport-utility-4d". */
  slug: string;
  /** `category` query param, e.g. "suv" | "sedan" | "truck". Optional — omitted if the scrape didn't capture it. */
  category?: string;
  /** Human label for picking when a listing's trim is ambiguous, e.g. "EX-L Sport Utility 4D". */
  label?: string;
}

export type KbbTaxonomy = {
  [makeSlug: string]: {
    [modelSlug: string]: {
      [year: string]: KbbStyle[];
    };
  };
};

/**
 * Tiny seed used by tests and for manual smoke-testing before the real scrape
 * lands. The full file is produced by `scraper/scrape.ts`.
 */
export const SAMPLE_TAXONOMY: KbbTaxonomy = {
  honda: {
    pilot: {
      "2003": [
        { slug: "lx-sport-utility-4d", category: "suv", label: "LX Sport Utility 4D" },
        { slug: "ex-sport-utility-4d", category: "suv", label: "EX Sport Utility 4D" },
        { slug: "ex-l-sport-utility-4d", category: "suv", label: "EX-L Sport Utility 4D" },
      ],
    },
  },
};
