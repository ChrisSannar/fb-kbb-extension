import { MAKES } from "./makes";

export interface ParsedVehicle {
  year: number;
  make: string; // canonical, e.g. "Honda"
  model: string; // raw token(s), e.g. "Pilot" (title fallback gives one token)
  trim?: string; // best-effort, e.g. "EX-L" — used in phase 2 to pick a Style
}

export interface ListingInput {
  /** Listing title, e.g. "2003 Honda Pilot EX-L". */
  title?: string;
  /** FB structured "About this vehicle" fields, keys lowercased. */
  fields?: Record<string, string>;
}

const YEAR_RE = /\b(19[5-9]\d|20[0-4]\d)\b/;

/**
 * Resolve year/make/model from a listing. Prefers FB's structured fields
 * (no model/trim boundary problem); falls back to parsing the title.
 * Returns null if year/make/model can't all be established.
 */
export function parseVehicle(input: ListingInput): ParsedVehicle | null {
  const fromFields = parseFromFields(input.fields);
  if (fromFields) return fromFields;
  return parseFromTitle(input.title);
}

function parseFromFields(fields?: Record<string, string>): ParsedVehicle | null {
  if (!fields) return null;
  const yearStr = fields.year?.match(YEAR_RE)?.[0];
  const make = fields.make?.trim();
  const model = fields.model?.trim();
  if (!yearStr || !make || !model) return null;
  const trim = fields.trim?.trim() || undefined;
  return { year: Number(yearStr), make, model, ...(trim ? { trim } : {}) };
}

function parseFromTitle(title?: string): ParsedVehicle | null {
  if (!title) return null;
  const yearMatch = title.match(YEAR_RE);
  if (!yearMatch) return null;
  const year = Number(yearMatch[0]);

  // Tokens with the year token removed, order preserved.
  const tokens = title
    .replace(yearMatch[0], " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length < 2) return null;

  const lower = tokens.map((t) => t.toLowerCase());

  // Greedy longest known-make match at the start (MAKES is longest-first).
  for (const make of MAKES) {
    const words = make.toLowerCase().split(/\s+/);
    if (words.every((w, i) => lower[i] === w)) {
      const model = tokens[words.length];
      if (!model) return null;
      return withTrim(year, make, model, tokens, words.length);
    }
  }

  // Unknown make: best-effort first-token=make, second=model.
  return withTrim(year, tokens[0]!, tokens[1]!, tokens, 1);
}

/** Model is the token at `makeLen`; trim is everything after it. */
function withTrim(
  year: number,
  make: string,
  model: string,
  tokens: string[],
  makeLen: number,
): ParsedVehicle {
  const trim = tokens.slice(makeLen + 1).join(" ") || undefined;
  return { year, make, model, ...(trim ? { trim } : {}) };
}
