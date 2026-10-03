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

  it("limits the second-level domain to 32 bytes", () => {
    expect(() => parseName(`${"a".repeat(32)}.hh`)).not.toThrow();

    // 11 characters, but 33 bytes
    expect(() => parseName(`${"안".repeat(11)}.hh`)).toThrow(
      "to be at most 32 bytes",
    );
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

  it("limits the record name and second-level domain to 32 bytes", () => {
    expect(() =>
      parseRecordName(`${"a".repeat(16)}.${"b".repeat(15)}.foo.hh`),
    ).not.toThrow();

    expect(() =>
      parseRecordName(`${"a".repeat(16)}.${"b".repeat(16)}.foo.hh`),
    ).toThrow("to be at most 32 bytes");

    expect(() => parseRecordName(`sub.${"a".repeat(33)}.hh`)).toThrow(
      "to be at most 32 bytes",
    );
  });
});
