import { describe, expect, it } from "vitest";
import { parseName, parseRecordName } from "../parse-name.js";

describe("parseName", () => {
  it("splits, trims and aliases .h to .ℏ", () => {
    expect(parseName(" foo.h ")).toEqual({
      secondLevelDomain: "foo",
      topLevelDomain: "ℏ",
    });
  });

  it.each(["foo", "sub.foo.hh", ".hh", "foo."])("rejects %j", (name) => {
    expect(() => parseName(name)).toThrow("expected a name of the form");
  });
});

describe("parseRecordName", () => {
  it("splits the record name off the name", () => {
    expect(parseRecordName("a.b.foo.h")).toEqual({
      recordName: "a.b",
      secondLevelDomain: "foo",
      topLevelDomain: "ℏ",
    });

    expect(parseRecordName("foo.hh")).toEqual({
      recordName: "",
      secondLevelDomain: "foo",
      topLevelDomain: "hh",
    });
  });

  it.each(["foo", ".hh", "foo.", "a..foo.hh"])("rejects %j", (name) => {
    expect(() => parseRecordName(name)).toThrow(
      "expected a record name of the form",
    );
  });
});
