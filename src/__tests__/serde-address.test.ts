import { describe, expect, it } from "vitest";
import { AccountId, PublicKey } from "@hashgraph/sdk";
import {
  deserializeBitcoinAddress,
  deserializeEthereumAddress,
  deserializeHederaAddress,
  serializeAddress,
  serializeHederaAddress
} from "../serde-address";
import { hexEncode } from "../hex";

describe("serializeAddress", () => {
  it("can serialize an old BTC address", () => {
    let btc = "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2";
    let address = serializeAddress(0, btc);

    expect(address.byteLength).toEqual(34);
    expect(hexEncode(address)).toEqual(
      "314276424d53455973745765747154466e354175346d3447466737784a614e564e32"
    );

    expect(deserializeBitcoinAddress(address)).toEqual(btc);
  });

  it("can serialize a new BTC address", () => {
    let btc = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";
    let address = serializeAddress(0, btc);

    expect(address.byteLength).toEqual(42);
    expect(hexEncode(address)).toEqual(
      "62633171617230737272723778666b7679356c3634336c79646e77397265353967747a7a7766356d6471"
    );

    expect(deserializeBitcoinAddress(address)).toEqual(btc);
  });

  it("can serialize an ETH address", () => {
    let eth = "0x71c7656ec7ab88b098defb751b7401b5f6d8976f";
    let address = serializeAddress(60, eth);

    expect(address.byteLength).toEqual(20);
    expect(hexEncode(address)).toEqual(
      "71c7656ec7ab88b098defb751b7401b5f6d8976f"
    );

    expect(deserializeEthereumAddress(address)).toEqual(eth);
  });

  it("can serialize a Hedera account alias", () => {
    let publicKey = PublicKey.fromString(
      "302a300506032b6570032100743553ec3647797df01a8ec74c1143ae8d9e187f60fc13d7998822e3cebc4f5e"
    );
    let accountId = publicKey.toAccountId(1, 2);
    let address = serializeHederaAddress(accountId);

    expect(address.byteLength).toEqual(40);
    expect(hexEncode(address)).toEqual(
      "0801100222221220743553ec3647797df01a8ec74c1143ae8d9e187f60fc13d7998822e3cebc4f5e"
    );

    let reverseAccountId = deserializeHederaAddress(address);

    expect(reverseAccountId.aliasKey).toEqual(publicKey);
    expect(reverseAccountId.num.toNumber()).toEqual(0);
    expect(reverseAccountId.shard.toNumber()).toEqual(1);
    expect(reverseAccountId.realm.toNumber()).toEqual(2);
  });

  it("can serialize a Hedera account ID", () => {
    let accountId = new AccountId(50, 20, 1040);
    let address = serializeAddress(3030, accountId.toString());

    expect(address.byteLength).toEqual(7);
    expect(hexEncode(address)).toEqual("08321014189008");

    let reverseAccountId = deserializeHederaAddress(address);

    expect(reverseAccountId.num.toNumber()).toEqual(1040);
    expect(reverseAccountId.shard.toNumber()).toEqual(50);
    expect(reverseAccountId.realm.toNumber()).toEqual(20);
  });
});
