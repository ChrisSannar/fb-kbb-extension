import { expect, test, describe } from "bun:test";
import { selectStyle, lookupStyles } from "./select-style";
import { SAMPLE_TAXONOMY } from "./taxonomy";

const styles = SAMPLE_TAXONOMY.honda!.pilot!["2003"]!;

describe("selectStyle", () => {
  test("matches trim as a leading slug segment", () => {
    expect(selectStyle(styles, "EX-L")?.slug).toBe("ex-l-sport-utility-4d");
  });

  test("falls back to the first style when trim doesn't match", () => {
    expect(selectStyle(styles, "Touring")?.slug).toBe("lx-sport-utility-4d");
  });

  test("falls back to the first style when no trim given", () => {
    expect(selectStyle(styles)?.slug).toBe("lx-sport-utility-4d");
  });

  test("undefined when no styles", () => {
    expect(selectStyle([], "EX-L")).toBeUndefined();
    expect(selectStyle(undefined)).toBeUndefined();
  });
});

describe("lookupStyles", () => {
  test("hit", () => {
    expect(lookupStyles(SAMPLE_TAXONOMY, "honda", "pilot", 2003)).toHaveLength(3);
  });
  test("miss", () => {
    expect(lookupStyles(SAMPLE_TAXONOMY, "honda", "civic", 2003)).toBeUndefined();
  });
});
