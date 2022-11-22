# Kabuto Name Service (KNS) SDK

> The only full decentralized Web3 name service on Hedera Hashgraph.

## Install

```sh
npm install @kabuto-sh/ns
```

## Usage

### Setup

Before using `KNS`, you need to set the `Signer` that will be used
to sign and execute transactions against the network.

```ts
import { KNS } from "@kabuto-sh/ns";

const kns = new KNS({
  network: "mainnet", // or "testnet"
});

// NOTE: setProvider takes anything that implements the Signer interface
//  from HIP-338
kns.setSigner(yourSigner);
```

### Register Name

Register the name, if available.
Mints the authorization NFT to the configured signer.

```ts
await kns.registerName("example.hh", { years: 3 });
```

The registration price is explained on https://ns.kabuto.sh. The
price is fixed to a USD value. To check the spot price in HBARs, you
can use the `getRegisterPriceHbar` function.

```ts
const priceInHbar = await kns.getRegisterPriceHbar("example.hh");
```

Note that `getRegisterPriceHbar` does not check for domain
availability.

### Set Text Record

In order to perform any `setX` or `deleteX` functions
on a name (e.g., `example.hh`) your signer must be the owner
of the authorization NFT.

```ts
// example.hh --> _
await kns.setText("example.hh", "Hello World");

// foo.example.hh --> _
await kns.setText("foo.example.hh", "Bar");
```

### Set Address Record

Address records are keyed by the [SLIP-44](https://github.com/satoshilabs/slips/blob/master/slip-0044.md) coin type.

```ts
// example.hh (HBAR) --> _
await kns.setAddress("example.hh", 3030, "0.0.2020");

// example.hh (ETH) --> _
await kns.setAddress(
  "example.hh",
  60,
  "0x71c7656ec7ab88b098defb751b7401b5f6d8976f"
);
```

### Set Hedera Address Record

```ts
// example.hh (HBAR) --> _
await kns.setHederaAddress("example.hh", "0.0.2020");
```

### Get Name

Retrieve the metadata for a name, if available.
Throws `NameNotFoundError` if not available.

```ts
const {
  serialNumber, // serial number in the NFT for this TLD
  ownerAccountId, // account ID that owns this name
  expirationTime, // time that the name ownership will expire
} = await kns.getName("example.hh");
```

### Get Records

Retrieve all text and address records for a name, if available.
Throws `NameNotFoundError` if not available.

```ts
const {
  text, // array of { name, text }
  address, // array of { name, coinType, address }
} = await kns.getAll("example.hh");
```

### Get Text Record

Retrieve a text for a name, if available.
Throws `NameNotFoundError` if not available.

```ts
const text = await kns.getText("example.hh");
```

### Get Address Record

Retrieve an address record for a name and coin type, if available.
Throws `NameNotFoundError` if not available.

```ts
// address is an Uint8Array
// 3030 is Hedera
const address = await kns.getAddress("example.hh", 3030);
```

### Get Hedera Address Record

Retrieve a HBAR address record for a name, if available.
Throws `NameNotFoundError` if not available.

```ts
// address is an @hashgraph/sdk.AccountId
const address = await kns.getHederaAddress("example.hh");
```

## License

Licensed under the Apache license, version 2.0 ([LICENSE](./LICENSE)
or <https://www.apache.org/licenses/LICENSE-2.0>).

**Contribution**

Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in the work by you, as defined in the Apache-2.0 license,
shall be licensed as above, without any additional terms or conditions.
