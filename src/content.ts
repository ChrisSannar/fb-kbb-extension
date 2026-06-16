import { parseVehicle, type ListingInput } from "./parse-listing";
import { buildKbbUrl, slugify } from "./url-builder";
import { resolveMakeSlug } from "./makes";
import { selectStyle, lookupStyles } from "./select-style";
import type { KbbTaxonomy } from "./taxonomy";
import taxonomyData from "../extension/taxonomy.json";

const TAXONOMY = taxonomyData as KbbTaxonomy;

const BTN_ID = "fb-kbb-btn";

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

function buildUrl(): string | null {
  const input: ListingInput = { title: readTitle(), fields: readFields() };
  const v = parseVehicle(input);
  if (!v) return null;
  const makeSlug = resolveMakeSlug(v.make);
  const modelSlug = slugify(v.model);
  // Phase 2: exact Style from the bundled Taxonomy; falls back to year-level
  // (v1 behaviour) when the vehicle isn't in the Taxonomy.
  const style = selectStyle(lookupStyles(TAXONOMY, makeSlug, modelSlug, v.year), v.trim);
  return buildKbbUrl({ makeSlug, modelSlug, year: v.year, style });
}

function render(): void {
  const isItem = location.pathname.includes("/marketplace/item/");
  const existing = document.getElementById(BTN_ID);
  if (!isItem) {
    existing?.remove();
    return;
  }
  const url = buildUrl();
  if (!url) {
    existing?.remove();
    return;
  }

  const btn = (existing as HTMLAnchorElement) ?? document.createElement("a");
  btn.id = BTN_ID;
  btn.textContent = "Check on KBB";
  (btn as HTMLAnchorElement).href = url;
  (btn as HTMLAnchorElement).target = "_blank";
  (btn as HTMLAnchorElement).rel = "noopener";
  Object.assign(btn.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "2147483647",
    padding: "10px 16px",
    background: "#0b6efd",
    color: "#fff",
    font: "600 14px system-ui, sans-serif",
    borderRadius: "8px",
    textDecoration: "none",
    boxShadow: "0 2px 8px rgba(0,0,0,.3)",
  } satisfies Partial<CSSStyleDeclaration>);
  if (!existing) document.body.appendChild(btn);
}

// FB is a SPA: re-render on DOM churn and on URL changes, throttled.
let timer: number | undefined;
function schedule(): void {
  clearTimeout(timer);
  timer = window.setTimeout(render, 400);
}

new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });

let lastPath = location.pathname;
setInterval(() => {
  if (location.pathname !== lastPath) {
    lastPath = location.pathname;
    schedule();
  }
}, 800);

schedule();
