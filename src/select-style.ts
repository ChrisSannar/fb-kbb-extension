import type { KbbStyle, KbbTaxonomy } from "./taxonomy";
import { slugify } from "./url-builder";

/**
 * Choose a Style for a vehicle. If a trim is given and matches a style slug
 * (exact, or as a leading segment like "ex-l" → "ex-l-sport-utility-4d"),
 * use it. Otherwise fall back to the first (base) style. Returns undefined
 * when there are no styles.
 */
export function selectStyle(styles: KbbStyle[] | undefined, trim?: string): KbbStyle | undefined {
  if (!styles || styles.length === 0) return undefined;
  if (trim) {
    const t = slugify(trim);
    const match = styles.find((s) => s.slug === t || s.slug.startsWith(`${t}-`));
    if (match) return match;
  }
  return styles[0];
}

/** Look up the styles list for a make/model/year in the bundled Taxonomy. */
export function lookupStyles(
  taxonomy: KbbTaxonomy,
  makeSlug: string,
  modelSlug: string,
  year: number,
): KbbStyle[] | undefined {
  return taxonomy[makeSlug]?.[modelSlug]?.[String(year)];
}
