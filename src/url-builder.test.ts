import { expect, test, describe } from "bun:test";
import { buildKbbUrl, slugify } from "./url-builder";
import { SAMPLE_TAXONOMY } from "./taxonomy";

describe("buildKbbUrl", () => {
  test("reproduces the real 2003 Honda Pilot EX-L example URL", () => {
    const style = SAMPLE_TAXONOMY.honda!.pilot!["2003"]!.find(
      (s) => s.slug === "ex-l-sport-utility-4d",
    );
    const url = buildKbbUrl({
      makeSlug: "honda",
      modelSlug: "pilot",
      year: 2003,
      style,
      mileage: 190264,
      color: "blue",
      condition: "good",
      priceType: "private-party",
    });
    expect(url).toBe(
      "https://www.kbb.com/honda/pilot/2003/ex-l-sport-utility-4d/?category=suv&color=blue&condition=good&intent=buy-used&mileage=190264&pricetype=private-party",
    );
  });

  test("falls back to a year-level URL when the trim/style is unknown", () => {
    const url = buildKbbUrl({
      makeSlug: "honda",
      modelSlug: "pilot",
      year: 2003,
      mileage: 190264,
    });
    expect(url).toBe(
      "https://www.kbb.com/honda/pilot/2003/?condition=good&intent=buy-used&mileage=190264&pricetype=private-party",
    );
  });

  test("applies sane defaults (condition=good, pricetype=private-party) and omits unknown fields", () => {
    const url = buildKbbUrl({ makeSlug: "toyota", modelSlug: "tacoma", year: 2018 });
    expect(url).toBe(
      "https://www.kbb.com/toyota/tacoma/2018/?condition=good&intent=buy-used&pricetype=private-party",
    );
  });
});

describe("slugify", () => {
  test.each([
    ["Honda", "honda"],
    ["EX-L", "ex-l"],
    ["Mercedes-Benz", "mercedes-benz"],
    ["Land Rover", "land-rover"],
    ["RAM 1500", "ram-1500"],
    ["Mazda CX-5", "mazda-cx-5"],
  ])("slugify(%p) -> %p", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});
