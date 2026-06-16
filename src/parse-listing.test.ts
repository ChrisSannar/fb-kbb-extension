import { expect, test, describe } from "bun:test";
import { parseVehicle } from "./parse-listing";

describe("parseVehicle — title", () => {
  test("year make model trim", () => {
    expect(parseVehicle({ title: "2003 Honda Pilot EX-L" })).toEqual({
      year: 2003,
      make: "Honda",
      model: "Pilot",
      trim: "EX-L",
    });
  });

  test("two-word make", () => {
    expect(parseVehicle({ title: "2018 Land Rover Range Rover HSE" })).toEqual({
      year: 2018,
      make: "Land Rover",
      model: "Range", // v1 title fallback grabs one model token (known limitation)
      trim: "Rover HSE",
    });
  });

  test("hyphenated make", () => {
    expect(parseVehicle({ title: "2016 Mercedes-Benz C300 Sport" })).toEqual({
      year: 2016,
      make: "Mercedes-Benz",
      model: "C300",
      trim: "Sport",
    });
  });

  test("unknown make falls back to first/second token", () => {
    expect(parseVehicle({ title: "2012 Saab 9-3 Turbo" })).toEqual({
      year: 2012,
      make: "Saab",
      model: "9-3",
      trim: "Turbo",
    });
  });

  test("no year → null", () => {
    expect(parseVehicle({ title: "Honda Pilot EX-L" })).toBeNull();
  });
});

describe("parseVehicle — structured fields win and avoid the boundary problem", () => {
  test("multi-word model from fields", () => {
    expect(
      parseVehicle({
        title: "2015 Jeep Grand Cherokee Laredo 4WD clean title",
        fields: { year: "2015", make: "Jeep", model: "Grand Cherokee" },
      }),
    ).toEqual({ year: 2015, make: "Jeep", model: "Grand Cherokee" });
  });

  test("incomplete fields fall back to title", () => {
    expect(
      parseVehicle({ title: "2003 Honda Pilot EX-L", fields: { make: "Honda" } }),
    ).toEqual({ year: 2003, make: "Honda", model: "Pilot", trim: "EX-L" });
  });
});
