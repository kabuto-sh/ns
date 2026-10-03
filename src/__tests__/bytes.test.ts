import { describe, expect, it } from "vitest";
import { toBytes32 } from "../bytes.js";

describe("toBytes32", () => {
  it("pads on the right with zeros", () => {
    const padded = toBytes32(new Uint8Array([1, 2, 3]));

    expect(padded.byteLength).toBe(32);
    expect(Array.from(padded.subarray(0, 4))).toEqual([1, 2, 3, 0]);
    expect(padded.subarray(3).every((b) => b === 0)).toBe(true);
  });
});
