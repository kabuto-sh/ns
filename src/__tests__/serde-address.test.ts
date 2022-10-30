import { describe, expect, it } from "vitest";
import { AccountId } from "@hashgraph/sdk";
import { deserializeHederaAddress, serializeAddress } from "../serde-address";
import { hexEncode } from "../hex";

describe("serializeAddress", () => {
  it("can serialize a Hedera account ID", () => {
    let accountId = new AccountId(50, 20, 1040);
    let address = serializeAddress(3030, accountId.toString());

    expect(hexEncode(address)).toEqual(
      "0000003200000000000000140000000000000410000000000000000000000000"
    );

    expect(address.byteLength).toEqual(32);

    let reverseAccountId = deserializeHederaAddress(address);

    expect(reverseAccountId.num.toNumber()).toEqual(1040);
    expect(reverseAccountId.shard.toNumber()).toEqual(50);
    expect(reverseAccountId.realm.toNumber()).toEqual(20);
  });
});
