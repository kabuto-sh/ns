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

describe("without a signer", () => {
  const SIGNER_REQUIRED =
    "signer required, call setSigner before calling this method";

  let kns: KNS;

  beforeEach(() => {
    kns = new KNS();
  });

  afterEach(() => {
    kns.close();
  });

  function stubRequests() {
    const unexpected = new Error("unexpected request");

    return {
      resolver: vi.spyOn(kns["_resolver"], "get").mockRejectedValue(unexpected),
      mirror: vi
        .spyOn(kns["_hederaMirror"], "get")
        .mockRejectedValue(unexpected),
    };
  }

  it("isAssociatedForName throws before any request", async () => {
    const { resolver, mirror } = stubRequests();

    await expect(kns.isAssociatedForName("foo.hh")).rejects.toThrow(
      SIGNER_REQUIRED,
    );
    expect(resolver).not.toHaveBeenCalled();
    expect(mirror).not.toHaveBeenCalled();
  });

  it("associateName throws before any request", async () => {
    const { resolver, mirror } = stubRequests();

    await expect(kns.associateName("foo.hh")).rejects.toThrow(SIGNER_REQUIRED);
    expect(resolver).not.toHaveBeenCalled();
    expect(mirror).not.toHaveBeenCalled();
  });

  it("findNamesByOwner with no owner throws before any request", async () => {
    const { resolver, mirror } = stubRequests();

    await expect(kns.findNamesByOwner()).rejects.toThrow(SIGNER_REQUIRED);
    expect(resolver).not.toHaveBeenCalled();
    expect(mirror).not.toHaveBeenCalled();
  });

  it("findNamesByOwner with an owner does not need one", async () => {
    const get = vi.spyOn(kns["_resolver"], "get").mockResolvedValue({
      data: {
        data: {
          names: [{ name: "foo.hh", expiresAt: "2027-01-01T00:00:00.000Z" }],
        },
      },
    });

    const names = await kns.findNamesByOwner("0.0.1234");

    expect(get).toHaveBeenCalledWith("/owner/0.0.1234");
    expect(names).toEqual([
      {
        domain: "foo.hh",
        expirationTime: new Date("2027-01-01T00:00:00.000Z"),
      },
    ]);
  });
});
