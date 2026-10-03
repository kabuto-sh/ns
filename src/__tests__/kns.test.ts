import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Signer,
  Transaction,
  TransactionReceipt,
} from "@hiero-ledger/sdk";
import {
  AccountId,
  TransactionId,
  TransactionReceiptQuery,
} from "@hiero-ledger/sdk";
import {
  APIError,
  KNS,
  NameNotFoundError,
  SignerRejectedError,
} from "../index.js";
import { hexDecode } from "../hex.js";

const MINUTES_10 = 10 * 60 * 1000;

const RESOLVER = "https://ns.testnet.kabuto.sh/api";

const MIRROR = "https://testnet.mirrornode.hedera.com";

const ETH_ADDRESS = "0x71c7656ec7ab88b098defb751b7401b5f6d8976f";

function exchangeRate(usd: number) {
  return { data: { usd } };
}

// Answers each URL in `routes` with its body as JSON, or as-is if it's a Response, and fails
// any other request. A second call replaces the routes of the first.
function route(routes: Record<string, unknown>) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);

    if (!(url in routes)) {
      throw new Error(`unexpected request: ${url}`);
    }

    const body = routes[url];

    return body instanceof Response ? body : Response.json(body);
  });
}

function errorResponse(status: number) {
  return new Response(null, { status });
}

afterEach(() => {
  vi.restoreAllMocks();
});

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
    const fetch = route({ [`${RESOLVER}/exchange-rate`]: exchangeRate(0.05) });

    await kns.getRegisterPriceHbar("foo");
    vi.advanceTimersByTime(MINUTES_10 - 1);
    const price = await kns.getRegisterPriceHbar("foo");

    expect(fetch).toHaveBeenCalledOnce();
    expect(price.toString()).toBe("100 ℏ");
  });

  it("fetches the exchange rate again after ten minutes", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(exchangeRate(0.05)))
      .mockResolvedValueOnce(Response.json(exchangeRate(0.1)));

    await kns.getRegisterPriceHbar("foo");
    vi.advanceTimersByTime(MINUTES_10);
    const refetched = await kns.getRegisterPriceHbar("foo");

    // still cached against the second fetch, not the first
    vi.advanceTimersByTime(MINUTES_10 - 1);
    const cached = await kns.getRegisterPriceHbar("foo");

    expect(fetch).toHaveBeenCalledTimes(2);
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

  it("isAssociatedForName throws before any request", async () => {
    const fetch = route({});

    await expect(kns.isAssociatedForName("foo.hh")).rejects.toThrow(
      SIGNER_REQUIRED,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("associateName throws before any request", async () => {
    const fetch = route({});

    await expect(kns.associateName("foo.hh")).rejects.toThrow(SIGNER_REQUIRED);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("findNamesByOwner with no owner throws before any request", async () => {
    const fetch = route({});

    await expect(kns.findNamesByOwner()).rejects.toThrow(SIGNER_REQUIRED);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("findNamesByOwner with an owner does not need one", async () => {
    route({
      [`${RESOLVER}/owner/0.0.1234`]: {
        data: {
          names: [{ name: "foo.hh", expiresAt: "2027-01-01T00:00:00.000Z" }],
        },
      },
    });

    const names = await kns.findNamesByOwner("0.0.1234");

    expect(names).toEqual([
      {
        domain: "foo.hh",
        expirationTime: new Date("2027-01-01T00:00:00.000Z"),
      },
    ]);
  });
});

describe("reading names", () => {
  let kns: KNS;

  beforeEach(() => {
    kns = new KNS();
  });

  afterEach(() => {
    kns.close();
  });

  it.each([
    { serial: 7, version: 1, tokenId: "0.0.101", contractId: "0.0.100" },
    { serial: -7, version: 2, tokenId: "0.0.201", contractId: "0.0.200" },
    { serial: 32007, version: 3, tokenId: "0.0.301", contractId: "0.0.300" },
  ])(
    "getName reads serial $serial as serial 7 of v$version",
    async ({ serial, version, tokenId, contractId }) => {
      route({
        [`${RESOLVER}/name/foo.hh`]: {
          data: {
            v1TokenId: "0.0.101",
            v1ContractId: "0.0.100",
            v2TokenId: "0.0.201",
            v2ContractId: "0.0.200",
            v3TokenId: "0.0.301",
            v3ContractId: "0.0.300",
            tokenSerialNumber: serial,
            expiresAt: "2027-01-01T00:00:00.000Z",
          },
        },
        [`${MIRROR}/api/v1/tokens/${tokenId}/nfts/7`]: {
          account_id: "0.0.1001",
        },
      });

      const name = await kns.getName("foo.hh");

      expect(name.version).toBe(version);
      expect(name.serialNumber).toBe(7);
      expect(name.contractSerialNumber).toBe(serial);
      expect(name.tokenId.toString()).toBe(tokenId);
      expect(name.contractId.toString()).toBe(contractId);
      expect(name.ownerAccountId.toString()).toBe("0.0.1001");
    },
  );

  describe.each([
    {
      method: "getName",
      path: "/name/foo.hh",
      call: () => kns.getName("foo.hh"),
    },
    {
      method: "getAll",
      path: "/name/foo.hh/record",
      call: () => kns.getAll("foo.hh"),
    },
    {
      method: "getAddressBytes",
      path: "/name/foo.hh/record/address/60",
      call: () => kns.getAddressBytes("foo.hh", 60),
    },
    {
      method: "getText",
      path: "/name/foo.hh/record/text",
      call: () => kns.getText("foo.hh"),
    },
    {
      method: "getMetadata",
      path: "/name/foo.hh/metadata",
      call: () => kns.getMetadata("foo.hh"),
    },
    // registerName asks the resolver for the TLD first, so that's the request that fails
    {
      method: "registerName",
      path: "/name/.hh",
      call: () => kns.registerName("foo.hh", { years: 1 }),
    },
  ])("$method", ({ path, call }) => {
    it.each([404, 400])(
      "reports a %i from the resolver as NameNotFoundError",
      async (status) => {
        route({ [`${RESOLVER}${path}`]: errorResponse(status) });

        await expect(call()).rejects.toBeInstanceOf(NameNotFoundError);
      },
    );
  });

  it("getText rejects any other resolver error with its status", async () => {
    route({ [`${RESOLVER}/name/foo.hh/record/text`]: errorResponse(500) });

    const error = await kns.getText("foo.hh").catch((error) => error);

    expect(error).toBeInstanceOf(APIError);
    expect(error.status).toBe(500);
  });

  it("findNamesByAddress rejects a 404 with its status", async () => {
    route({
      [`${RESOLVER}/record/address/60/${ETH_ADDRESS}/name`]: errorResponse(404),
    });

    const error = await kns
      .findNamesByAddress(60, ETH_ADDRESS)
      .catch((error) => error);

    expect(error).toBeInstanceOf(APIError);
    expect(error.status).toBe(404);
  });

  it("getName rejects a mirror node error with its status and URL", async () => {
    const nft = `${MIRROR}/api/v1/tokens/0.0.101/nfts/7`;

    route({
      [`${RESOLVER}/name/foo.hh`]: {
        data: {
          v1TokenId: "0.0.101",
          v1ContractId: "0.0.100",
          tokenSerialNumber: 7,
          expiresAt: "2027-01-01T00:00:00.000Z",
        },
      },
      [nft]: errorResponse(500),
    });

    const error = await kns.getName("foo.hh").catch((error) => error);

    expect(error).toBeInstanceOf(APIError);
    expect(error.status).toBe(500);
    expect(error.url).toBe(nft);
  });

  it("getAll decodes address records", async () => {
    route({
      [`${RESOLVER}/name/foo.hh/record`]: {
        data: {
          address: [
            {
              name: "",
              coinType: 60,
              address: "ccdlbseriLCY3vt1G3QBtfbYl28=",
            },
          ],
          text: [{ name: "", text: "Hello World" }],
        },
      },
    });

    await expect(kns.getAll("foo.hh")).resolves.toEqual({
      address: [
        {
          name: "",
          coinType: 60,
          address: ETH_ADDRESS,
          addressBytes: hexDecode(ETH_ADDRESS),
        },
      ],
      text: [{ name: "", text: "Hello World" }],
    });
  });

  it("findNamesByAddress looks up a checksummed ETH address in lowercase", async () => {
    route({
      [`${RESOLVER}/record/address/60/${ETH_ADDRESS}/name`]: {
        data: [{ domain: "foo", parent: "hh" }],
      },
    });

    await expect(
      kns.findNamesByAddress(60, "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"),
    ).resolves.toEqual(["foo.hh"]);
  });
});

describe("with a resolver URL", () => {
  let kns: KNS;

  beforeEach(() => {
    kns = new KNS({ network: "testnet", resolver: "http://localhost/api/" });
  });

  afterEach(() => {
    kns.close();
  });

  it("sends resolver requests to it", async () => {
    route({
      "http://localhost/api/name/foo.hh/record/text": {
        data: { name: "", text: "Hello World" },
      },
    });

    await expect(kns.getText("foo.hh")).resolves.toBe("Hello World");
  });
});

describe("with a signer", () => {
  const accountId = AccountId.fromString("0.0.1001");

  // foo.hh isn't registered, so the token for .hh stands in for it
  const unregistered = {
    [`${RESOLVER}/name/foo.hh`]: errorResponse(404),
    [`${RESOLVER}/name/.hh`]: {
      data: { v3ContractId: "0.0.300", v3TokenId: "0.0.301" },
    },
  };

  let kns: KNS;
  let call: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    kns = new KNS();
    call = vi.fn();

    // like WalletConnect, populateTransaction leaves the node account IDs unset
    kns.setSigner({
      getAccountId: () => accountId,
      getNetwork: () => ({ "0.testnet.hedera.com:50211": "0.0.3" }),
      populateTransaction: async (transaction: Transaction) =>
        transaction.setTransactionId(TransactionId.generate(accountId)),
      call,
    } as unknown as Signer);

    route(unregistered);
  });

  afterEach(() => {
    kns.close();
  });

  it("isAssociatedForName checks the TLD token for an unregistered name", async () => {
    route({
      ...unregistered,
      [`${MIRROR}/api/v1/accounts/0.0.1001`]: {
        balance: { tokens: [{ token_id: "0.0.301" }] },
      },
    });

    await expect(kns.isAssociatedForName("foo.hh")).resolves.toBe(true);
  });

  it("associateName sends to the nodes in the signer's network", async () => {
    call.mockResolvedValue(null);

    await expect(kns.associateName("foo.hh")).rejects.toBeInstanceOf(
      SignerRejectedError,
    );

    const [transaction] = call.mock.calls[0];
    expect(transaction.nodeAccountIds.map(String)).toEqual(["0.0.3"]);
  });

  it("associateName wraps an error from the signer", async () => {
    const rejection = new Error("user rejected");
    call.mockRejectedValue(rejection);

    const error = await kns.associateName("foo.hh").catch((error) => error);

    expect(error).toBeInstanceOf(SignerRejectedError);
    expect(error.source).toBe(rejection);
  });

  it("setText writes to a name registerName just registered via .h", async () => {
    // the resolver has not seen foo.ℏ yet
    const fetch = route({
      [`${RESOLVER}/name/.ℏ`]: {
        data: { v3ContractId: "0.0.400", v3TokenId: "0.0.401" },
      },
      [`${RESOLVER}/exchange-rate`]: exchangeRate(0.05),
    });

    vi.spyOn(TransactionReceiptQuery.prototype, "execute").mockResolvedValue({
      children: [{ serials: [] }, { serials: [{ toNumber: () => 5 }] }],
    } as unknown as TransactionReceipt);

    call.mockResolvedValue({});

    await kns.registerName("foo.h", { years: 1 });
    await kns.setText("foo.h", "Hello World");

    expect(fetch).not.toHaveBeenCalledWith(`${RESOLVER}/name/foo.%E2%84%8F`);

    const [, [transaction]] = call.mock.calls;
    expect(transaction.contractId.toString()).toBe("0.0.400");
  });
});
