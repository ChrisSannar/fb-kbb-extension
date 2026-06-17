import { parseVehicle, type ListingInput, type ParsedVehicle } from "./parse-listing";

/** What the popup asks for, and what it gets back. */
export interface KbbRequest {
  type: "GET_KBB";
}
/**
 * The popup owns URL-building and the editable make/model/year/style form now,
 * so the content script's only job is to read the listing and hand back the
 * best-effort parse. `vehicle` is null when the page is a listing we couldn't
 * parse — the popup still shows empty, editable fields in that case.
 */
export type KbbResult =
  | { ok: true; vehicle: ParsedVehicle | null }
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

/** Parse the current page, or explain why this isn't a listing. */
function buildResult(): KbbResult {
  if (!location.pathname.includes("/marketplace/item/")) {
    return { ok: false, error: "Open a Facebook Marketplace vehicle listing first." };
  }
  const input: ListingInput = { title: readTitle(), fields: readFields() };
  return { ok: true, vehicle: parseVehicle(input) };
}

chrome.runtime.onMessage.addListener(
  (msg: KbbRequest, _sender, sendResponse: (r: KbbResult) => void) => {
    if (msg?.type === "GET_KBB") {
      sendResponse(buildResult());
    }
    return false; // responded synchronously
  },
);
