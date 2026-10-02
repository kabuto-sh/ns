import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KNS } from "../index.js";

const MINUTES_10 = 10 * 60 * 1000;

function exchangeRate(usd: number) {
  return { data: { data: { usd } } };
}

describe("getRegisterPriceHbar", () => {
  let kns: KNS;

  beforeEach(() => {
    vi.useFakeTimers();
    kns = new KNS();
  });

  afterEach(() => {
    kns.close();
    vi.useRealTimers();
  });

  it("reuses the exchange rate for ten minutes", async () => {
    const get = vi
      .spyOn(kns["_resolver"], "get")
      .mockResolvedValue(exchangeRate(0.05));

    await kns.getRegisterPriceHbar("foo");
    vi.advanceTimersByTime(MINUTES_10 - 1);
    const price = await kns.getRegisterPriceHbar("foo");

    expect(get).toHaveBeenCalledOnce();
    expect(get).toHaveBeenCalledWith("/exchange-rate");
    expect(price.toString()).toBe("100 ℏ");
  });

  it("fetches the exchange rate again after ten minutes", async () => {
    const get = vi
      .spyOn(kns["_resolver"], "get")
      .mockResolvedValueOnce(exchangeRate(0.05))
      .mockResolvedValueOnce(exchangeRate(0.1));

    await kns.getRegisterPriceHbar("foo");
    vi.advanceTimersByTime(MINUTES_10);
    const refetched = await kns.getRegisterPriceHbar("foo");

    // still cached against the second fetch, not the first
    vi.advanceTimersByTime(MINUTES_10 - 1);
    const cached = await kns.getRegisterPriceHbar("foo");

    expect(get).toHaveBeenCalledTimes(2);
    expect(refetched.toString()).toBe("50 ℏ");
    expect(cached.toString()).toBe("50 ℏ");
  });
});
