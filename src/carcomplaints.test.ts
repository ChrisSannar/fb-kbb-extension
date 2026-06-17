import { expect, test, describe } from "bun:test";
import { buildCarComplaintsUrl, ccSegment, ccModelSegment } from "./carcomplaints";

describe("buildCarComplaintsUrl", () => {
  test("single-word model", () => {
    expect(buildCarComplaintsUrl({ make: "Mazda", model: "Tribute", year: 2005 })).toBe(
      "https://www.carcomplaints.com/Mazda/Tribute/2005/",
    );
  });

  test("multi-word model uses underscores", () => {
    expect(buildCarComplaintsUrl({ make: "Jeep", model: "Grand Cherokee", year: 2015 })).toBe(
      "https://www.carcomplaints.com/Jeep/Grand_Cherokee/2015/",
    );
  });

  test("real hyphen and casing are preserved", () => {
    expect(buildCarComplaintsUrl({ make: "Mazda", model: "CX-5", year: 2016 })).toBe(
      "https://www.carcomplaints.com/Mazda/CX-5/2016/",
    );
  });

  test("lowercase model input is capitalized", () => {
    expect(buildCarComplaintsUrl({ make: "Mazda", model: "tribute", year: 2005 })).toBe(
      "https://www.carcomplaints.com/Mazda/Tribute/2005/",
    );
    expect(buildCarComplaintsUrl({ make: "Jeep", model: "grand cherokee", year: 2015 })).toBe(
      "https://www.carcomplaints.com/Jeep/Grand_Cherokee/2015/",
    );
  });
});

describe("ccModelSegment", () => {
  test("capitalizes the first letter of each word, underscores spaces", () => {
    expect(ccModelSegment("grand cherokee")).toBe("Grand_Cherokee");
  });

  test("leaves the rest of each word untouched so acronym casing survives", () => {
    expect(ccModelSegment("CX-5")).toBe("CX-5");
  });

  test("trims and collapses internal whitespace", () => {
    expect(ccModelSegment("  santa   fe  ")).toBe("Santa_Fe");
  });
});

describe("ccSegment", () => {
  test("trims and collapses internal whitespace to a single underscore", () => {
    expect(ccSegment("  Grand   Cherokee  ")).toBe("Grand_Cherokee");
  });
});
