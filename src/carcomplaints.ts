/**
 * CarComplaints.com URL builder. Unlike KBB (lowercase-hyphen slugs), CarComplaints
 * paths are human-cased and join multi-word models with underscores, keeping real
 * hyphens and casing verbatim:
 *
 *   /Mazda/Tribute/2005/        (single word)
 *   /Jeep/Grand_Cherokee/2015/  (space -> underscore)
 *   /Mazda/CX-5/2016/           (hyphen + casing preserved)
 *
 * So it can't be derived from a KBB slug (which is lossy); it's driven by the
 * listing's human-cased make/model instead.
 */
const BASE = "https://www.carcomplaints.com";

/** CarComplaints path segment: keep case & hyphens, collapse runs of space to "_". */
export function ccSegment(value: string): string {
  return value.trim().replace(/\s+/g, "_");
}

/**
 * CarComplaints model segment: capitalize the first letter of each word and join
 * with underscores ("grand cherokee" -> "Grand_Cherokee", "tribute" -> "Tribute").
 * The rest of each word is left untouched, so already-correct casing survives
 * ("CX-5" stays "CX-5"). Models this rule still misses are fixed by hand in the field.
 */
export function ccModelSegment(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("_");
}

export interface CarComplaintsParams {
  /** Human-cased make, e.g. "Mazda". */
  make: string;
  /** Model as typed/parsed, e.g. "CX-5", "Grand Cherokee", or lowercase "tribute". */
  model: string;
  year: number;
}

export function buildCarComplaintsUrl({ make, model, year }: CarComplaintsParams): string {
  return `${BASE}/${ccSegment(make)}/${ccModelSegment(model)}/${year}/`;
}
