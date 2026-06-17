import type { KbbRequest, KbbResult } from "./content";
import type { ParsedVehicle } from "./parse-listing";
import type { KbbStyle, KbbTaxonomy } from "./taxonomy";
import { buildKbbUrl, slugify } from "./url-builder";
import { resolveMakeSlug } from "./makes";
import { selectStyle, lookupStyles } from "./select-style";
import taxonomyData from "../extension/taxonomy.json";

const TAXONOMY = taxonomyData as KbbTaxonomy;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const makeEl = $<HTMLInputElement>("make");
const modelEl = $<HTMLInputElement>("model");
const yearEl = $<HTMLInputElement>("year");
const labelEl = $<HTMLInputElement>("label");
const link = $<HTMLAnchorElement>("kbb");
const form = $("form");
const errorEl = $("error");
const loadingEl = $("loading");

/** Whether the user has hand-edited the Style field (suppresses auto-defaulting). */
let labelTouched = false;

function showError(message: string): void {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

/** Replace a <datalist>'s options with `values`. */
function fillDatalist(id: string, values: string[]): void {
  $(id).replaceChildren(
    ...values.map((v) => {
      const o = document.createElement("option");
      o.value = v;
      return o;
    }),
  );
}

/** Current field values resolved to taxonomy keys (make/model slugs, year string). */
function keys(): { make: string; model: string; year: string } {
  return {
    make: resolveMakeSlug(makeEl.value),
    model: slugify(modelEl.value),
    year: yearEl.value.trim(),
  };
}

function stylesFor(make: string, model: string, year: string): KbbStyle[] | undefined {
  return TAXONOMY[make]?.[model]?.[year];
}

/**
 * Resolve the Style field — a human label from the taxonomy, or free-typed text —
 * to a KbbStyle. Free text becomes a bare slug (no category), which still yields
 * a usable style-level URL the human can sanity-check on KBB.
 */
function resolveStyle(styles: KbbStyle[] | undefined): KbbStyle | undefined {
  const text = labelEl.value.trim();
  if (!text) return undefined;
  const t = slugify(text);
  return styles?.find((s) => s.label === text || s.slug === t) ?? { slug: t };
}

/** Repopulate the cascading datalists from the current fields and rebuild the link. */
function refresh(): void {
  const { make, model, year } = keys();
  fillDatalist("models", TAXONOMY[make] ? Object.keys(TAXONOMY[make]).sort() : []);
  fillDatalist(
    "years",
    TAXONOMY[make]?.[model]
      ? Object.keys(TAXONOMY[make][model]).sort((a, b) => Number(b) - Number(a))
      : [],
  );
  const styles = stylesFor(make, model, year);
  fillDatalist("labels", styles ? styles.map((s) => s.label ?? s.slug) : []);

  // Nothing came off the page (or the user cleared it): default to the cheapest
  // trim. KBB lists styles base-first, so styles[0] is the cheapest; if the
  // vehicle has no styles in the taxonomy, leave the field as is.
  if (styles?.length && !labelTouched && labelEl.value.trim() === "") {
    labelEl.value = styles[0]!.label ?? styles[0]!.slug;
  }

  const yearNum = Number(year);
  if (!make || !model || !year || Number.isNaN(yearNum)) {
    link.classList.add("hidden");
    return;
  }
  link.href = buildKbbUrl({
    makeSlug: make,
    modelSlug: model,
    year: yearNum,
    style: resolveStyle(styles),
  });
  link.classList.remove("hidden");
}

/** Seed the fields from the page parse (everything stays editable). */
function prefill(v: ParsedVehicle | null): void {
  if (v) {
    makeEl.value = resolveMakeSlug(v.make);
    modelEl.value = slugify(v.model);
    yearEl.value = String(v.year);
    const style = selectStyle(
      lookupStyles(TAXONOMY, makeEl.value, modelEl.value, v.year),
      v.trim,
    );
    if (style) labelEl.value = style.label ?? style.slug;
  }
  fillDatalist("makes", Object.keys(TAXONOMY).sort());
  refresh();
}

async function main(): Promise<void> {
  // Registered before refresh so a cleared field stays cleared (the listeners
  // fire in registration order within one input event).
  labelEl.addEventListener("input", () => {
    labelTouched = true;
  });
  for (const el of [makeEl, modelEl, yearEl, labelEl]) {
    el.addEventListener("input", refresh);
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    loadingEl.classList.add("hidden");
    showError("No active tab.");
    return;
  }
  try {
    const res = await chrome.tabs.sendMessage<KbbRequest, KbbResult>(tab.id, {
      type: "GET_KBB",
    });
    loadingEl.classList.add("hidden");
    if (!res.ok) {
      showError(res.error);
      return;
    }
    form.classList.remove("hidden");
    prefill(res.vehicle);
  } catch {
    // No content script on this page (not a facebook.com/marketplace tab).
    loadingEl.classList.add("hidden");
    showError("Open a Facebook Marketplace vehicle listing, then click the icon.");
  }
}

void main();
