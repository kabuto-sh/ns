import { describe, expect, it } from "vitest";
import { getRegisterPriceUsd } from "../get-register-price.js";
import BigNumber from "bignumber.js";

describe("getRegisterPriceUsd", () => {
  it("can price 3+ regular characters", () => {
    expect(getRegisterPriceUsd("foo")).toEqual(BigNumber(5));
    expect(getRegisterPriceUsd("foobar")).toEqual(BigNumber(5));
  });

  it("can price 2 regular characters", () => {
    expect(getRegisterPriceUsd("fo")).toEqual(BigNumber(50));
  });

  it("can price 1 regular character", () => {
    expect(getRegisterPriceUsd("f")).toEqual(BigNumber(500));
  });

  it("can price 0 characters", () => {
    expect(getRegisterPriceUsd("")).toEqual(BigNumber("inf"));
  });

  it("can price 3+ non-ascii characters", () => {
    expect(getRegisterPriceUsd("안도선")).toEqual(BigNumber(10));
    expect(getRegisterPriceUsd("안도선안도선")).toEqual(BigNumber(10));
  });

  it("can price 2 non-ascii characters", () => {
    expect(getRegisterPriceUsd("안도")).toEqual(BigNumber(100));
  });

  it("can price 1 non-ascii character", () => {
    expect(getRegisterPriceUsd("안")).toEqual(BigNumber(1000));
  });

  it("can price 3+ emoji characters", () => {
    expect(getRegisterPriceUsd("😊😊😊")).toEqual(BigNumber(10));
    expect(getRegisterPriceUsd("😊😊😊😊")).toEqual(BigNumber(10));
  });

  it("can price 2 emoji characters", () => {
    expect(getRegisterPriceUsd("😊😊")).toEqual(BigNumber(100));
  });

  it("can price 1 emoji character", () => {
    expect(getRegisterPriceUsd("😊")).toEqual(BigNumber(1000));
  });
});
