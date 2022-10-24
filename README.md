# Kabuto Name Service (KNS) SDK

> The only full decentralized Web3 name service on Hedera Hashgraph.

## Install

```sh
npm install @kabuto-sh/ns
```

## Usage

```ts
import { KNS } from "@kabuto-sh/ns";

const kns = new KNS();

// NOTE: setProvider takes anything that implements the Provider interface
//  from HIP-338
kns.setProvider(yourProvider);
```

## License

Licensed under the Apache license, version 2.0 ([LICENSE](./LICENSE)
or <https://www.apache.org/licenses/LICENSE-2.0>).

**Contribution**

Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in the work by you, as defined in the Apache-2.0 license,
shall be licensed as above, without any additional terms or conditions.
