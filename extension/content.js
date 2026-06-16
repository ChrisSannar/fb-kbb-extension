// src/url-builder.ts
var BASE = "https://www.kbb.com";
function slugify(value) {
  return value.trim().toLowerCase().replace(/[''.]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function buildKbbUrl(params) {
  const { makeSlug, modelSlug, year, style, mileage, color } = params;
  const condition = params.condition ?? "good";
  const priceType = params.priceType ?? "private-party";
  const path = style ? `/${makeSlug}/${modelSlug}/${year}/${style.slug}/` : `/${makeSlug}/${modelSlug}/${year}/`;
  const query = new URLSearchParams;
  if (style?.category)
    query.set("category", style.category);
  if (color)
    query.set("color", color);
  query.set("condition", condition);
  query.set("intent", "buy-used");
  if (mileage != null)
    query.set("mileage", String(mileage));
  query.set("pricetype", priceType);
  return `${BASE}${path}?${query.toString()}`;
}

// src/makes.ts
var MAKES = [
  "Alfa Romeo",
  "Aston Martin",
  "Land Rover",
  "Mercedes-Benz",
  "Acura",
  "Audi",
  "BMW",
  "Buick",
  "Cadillac",
  "Chevrolet",
  "Chrysler",
  "Dodge",
  "Fiat",
  "Ford",
  "Genesis",
  "GMC",
  "Honda",
  "Hyundai",
  "Infiniti",
  "Jaguar",
  "Jeep",
  "Kia",
  "Lexus",
  "Lincoln",
  "Maserati",
  "Mazda",
  "Mini",
  "Mitsubishi",
  "Nissan",
  "Polestar",
  "Porsche",
  "Ram",
  "Rivian",
  "Subaru",
  "Tesla",
  "Toyota",
  "Volkswagen",
  "Volvo"
];
var MAKE_SLUG_OVERRIDES = {};
function resolveMakeSlug(make) {
  const key = make.trim().toLowerCase();
  return MAKE_SLUG_OVERRIDES[key] ?? slugify(make);
}

// src/parse-listing.ts
var YEAR_RE = /\b(19[5-9]\d|20[0-4]\d)\b/;
function parseVehicle(input) {
  const fromFields = parseFromFields(input.fields);
  if (fromFields)
    return fromFields;
  return parseFromTitle(input.title);
}
function parseFromFields(fields) {
  if (!fields)
    return null;
  const yearStr = fields.year?.match(YEAR_RE)?.[0];
  const make = fields.make?.trim();
  const model = fields.model?.trim();
  if (!yearStr || !make || !model)
    return null;
  const trim = fields.trim?.trim() || undefined;
  return { year: Number(yearStr), make, model, ...trim ? { trim } : {} };
}
function parseFromTitle(title) {
  if (!title)
    return null;
  const yearMatch = title.match(YEAR_RE);
  if (!yearMatch)
    return null;
  const year = Number(yearMatch[0]);
  const tokens = title.replace(yearMatch[0], " ").trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2)
    return null;
  const lower = tokens.map((t) => t.toLowerCase());
  for (const make of MAKES) {
    const words = make.toLowerCase().split(/\s+/);
    if (words.every((w, i) => lower[i] === w)) {
      const model = tokens[words.length];
      if (!model)
        return null;
      return withTrim(year, make, model, tokens, words.length);
    }
  }
  return withTrim(year, tokens[0], tokens[1], tokens, 1);
}
function withTrim(year, make, model, tokens, makeLen) {
  const trim = tokens.slice(makeLen + 1).join(" ") || undefined;
  return { year, make, model, ...trim ? { trim } : {} };
}

// src/select-style.ts
function selectStyle(styles, trim) {
  if (!styles || styles.length === 0)
    return;
  if (trim) {
    const t = slugify(trim);
    const match = styles.find((s) => s.slug === t || s.slug.startsWith(`${t}-`));
    if (match)
      return match;
  }
  return styles[0];
}
function lookupStyles(taxonomy, makeSlug, modelSlug, year) {
  return taxonomy[makeSlug]?.[modelSlug]?.[String(year)];
}

// extension/taxonomy.json
var taxonomy_default = {};

// src/content.ts
var TAXONOMY = taxonomy_default;
function readTitle() {
  return document.querySelector("h1")?.textContent?.trim() || undefined;
}
function readFields() {
  const fields = {};
  const wanted = ["make", "model", "year", "mileage"];
  for (const el of document.querySelectorAll("span, div")) {
    const label = el.textContent?.trim().toLowerCase();
    if (!label || !wanted.includes(label))
      continue;
    const value = el.parentElement?.querySelector(":scope > :last-child")?.textContent?.trim();
    if (value && value.toLowerCase() !== label)
      fields[label] = value;
  }
  return fields;
}
function buildResult() {
  if (!location.pathname.includes("/marketplace/item/")) {
    return { ok: false, error: "Open a Facebook Marketplace vehicle listing first." };
  }
  const input = { title: readTitle(), fields: readFields() };
  const v = parseVehicle(input);
  if (!v) {
    return { ok: false, error: "Couldn't read the year, make, and model from this listing." };
  }
  const makeSlug = resolveMakeSlug(v.make);
  const modelSlug = slugify(v.model);
  const style = selectStyle(lookupStyles(TAXONOMY, makeSlug, modelSlug, v.year), v.trim);
  const kbbUrl = buildKbbUrl({ makeSlug, modelSlug, year: v.year, style });
  return { ok: true, vehicle: v, kbbUrl };
}
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "GET_KBB") {
    sendResponse(buildResult());
  }
  return false;
});
