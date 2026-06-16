import type { KbbStyle } from "./taxonomy";

export type KbbCondition = "fair" | "good" | "very-good" | "excellent";
export type KbbPriceType = "private-party" | "trade-in" | "retail" | "certified";

export interface BuildKbbUrlParams {
  /** Make slug, e.g. "honda" (already normalized — see `slugify`). */
  makeSlug: string;
  /** Model slug, e.g. "pilot". */
  modelSlug: string;
  year: number;
  /**
   * Resolved style from the taxonomy. When omitted (trim couldn't be matched),
   * we build the year-level URL and let the human pick the trim on KBB.
   */
  style?: KbbStyle;
  mileage?: number;
  /** Lowercase color name, e.g. "blue". Omitted if unknown. */
  color?: string;
  /** Defaults to "good". */
  condition?: KbbCondition;
  /** Defaults to "private-party" (the right basis for a FB Marketplace sale). */
  priceType?: KbbPriceType;
}

const BASE = "https://www.kbb.com";

/** Normalize a make/model/trim name into a KBB-style path slug. */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[''.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Build a KBB valuation URL from listing data plus a resolved taxonomy style.
 * Query params are emitted in KBB's observed (alphabetical) order so the result
 * is deterministic and easy to assert against.
 */
export function buildKbbUrl(params: BuildKbbUrlParams): string {
  const { makeSlug, modelSlug, year, style, mileage, color } = params;
  const condition = params.condition ?? "good";
  const priceType = params.priceType ?? "private-party";

  const path = style
    ? `/${makeSlug}/${modelSlug}/${year}/${style.slug}/`
    : `/${makeSlug}/${modelSlug}/${year}/`;

  // Inserted in alphabetical order: category, color, condition, intent, mileage, pricetype.
  const query = new URLSearchParams();
  if (style?.category) query.set("category", style.category);
  if (color) query.set("color", color);
  query.set("condition", condition);
  query.set("intent", "buy-used");
  if (mileage != null) query.set("mileage", String(mileage));
  query.set("pricetype", priceType);

  return `${BASE}${path}?${query.toString()}`;
}
