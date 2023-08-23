// import the Kabuto Name Service (KNS) SDK
import { KNS } from "@kabuto-sh/ns";

// instantiate a new KNS client
const kns = new KNS({
  // select `testnet` or `mainnet`
  network: "testnet",
});

// ask to find any names by the given owner on the Hedera network
const names = await kns.findNamesByOwner("0.0.445388");
console.log(">", names);

// close the client and immediately quit
kns.close();
process.exit(0);
