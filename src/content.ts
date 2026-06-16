import { parseVehicle, type ListingInput, type ParsedVehicle } from "./parse-listing";
import { buildKbbUrl, slugify } from "./url-builder";
import { resolveMakeSlug } from "./makes";
import { selectStyle, lookupStyles } from "./select-style";
import type { KbbTaxonomy } from "./taxonomy";
import taxonomyData from "../extension/taxonomy.json";

const TAXONOMY = taxonomyData as KbbTaxonomy;

/** What the popup asks for, and what it gets back. */
export interface KbbRequest {
  type: "GET_KBB";
}
export type KbbResult =
  | { ok: true; vehicle: ParsedVehicle; kbbUrl: string }
  | { ok: false; error: string };

/** Listing title — FB renders it as the page's main <h1>. */
function readTitle(): string | undefined {
  return document.querySelector("h1")?.textContent?.trim() || undefined;
}

/**
 * Best-effort scrape of FB's "About this vehicle" label/value pairs.
 * Selectors are a guess until verified on a live listing — title is the
 * reliable fallback, so failure here is non-fatal.
 */
function readFields(): Record<string, string> {
  const fields: Record<string, string> = {};
  const wanted = ["make", "model", "year", "mileage"];
  for (const el of document.querySelectorAll<HTMLElement>("span, div")) {
    const label = el.textContent?.trim().toLowerCase();
    if (!label || !wanted.includes(label)) continue;
    const value = el.parentElement?.querySelector<HTMLElement>(
      ":scope > :last-child",
    )?.textContent?.trim();
    if (value && value.toLowerCase() !== label) fields[label] = value;
  }
  return fields;
}

/** Parse the current page and build a KBB URL, or explain why we can't. */
function buildResult(): KbbResult {
  if (!location.pathname.includes("/marketplace/item/")) {
    return { ok: false, error: "Open a Facebook Marketplace vehicle listing first." };
  }
  const input: ListingInput = { title: readTitle(), fields: readFields() };
  const v = parseVehicle(input);
  if (!v) {
    return { ok: false, error: "Couldn't read the year, make, and model from this listing." };
  }
  const makeSlug = resolveMakeSlug(v.make);
  const modelSlug = slugify(v.model);
  // Phase 2: exact Style from the bundled Taxonomy; falls back to year-level
  // (v1 behaviour) when the vehicle isn't in the Taxonomy.
  const style = selectStyle(lookupStyles(TAXONOMY, makeSlug, modelSlug, v.year), v.trim);
  const kbbUrl = buildKbbUrl({ makeSlug, modelSlug, year: v.year, style });
  return { ok: true, vehicle: v, kbbUrl };
}

chrome.runtime.onMessage.addListener(
  (msg: KbbRequest, _sender, sendResponse: (r: KbbResult) => void) => {
    if (msg?.type === "GET_KBB") {
      sendResponse(buildResult());
    }
    return false; // responded synchronously
  },
);
