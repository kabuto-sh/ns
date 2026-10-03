import { describe, expect, it } from "vitest";
import { dateAddYears } from "../add-years.js";

describe("dateAddYears", () => {
  it("keeps the month, day and time", () => {
    expect(dateAddYears(new Date(2026, 9, 2, 17, 16, 14), 1)).toEqual(
      new Date(2027, 9, 2, 17, 16, 14),
    );
  });

  it("can add several years", () => {
    expect(dateAddYears(new Date(2026, 0, 31), 10)).toEqual(
      new Date(2036, 0, 31),
    );
  });

  it("lands 29 February on 28 February in a common year", () => {
    expect(dateAddYears(new Date(2024, 1, 29, 12), 1)).toEqual(
      new Date(2025, 1, 28, 12),
    );
  });

  it("keeps 29 February in a leap year", () => {
    expect(dateAddYears(new Date(2024, 1, 29), 4)).toEqual(
      new Date(2028, 1, 29),
    );
  });

  it("does not change the date passed in", () => {
    const date = new Date(2026, 9, 2);
    dateAddYears(date, 1);

    expect(date).toEqual(new Date(2026, 9, 2));
  });
});
