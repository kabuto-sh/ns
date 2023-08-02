// import the Kabuto Name Service (KNS) SDK
import { KNS } from "@kabuto-sh/ns";

// instantiate a new KNS client
const kns = new KNS({
  // select `testnet` or `mainnet`
  network: "testnet",
});

// ask for the HBAR address for a domain name
const expirations = await kns.findNamesByOwner("0.0.13808914");
console.log(">", expirations);

// close the client and immediately quit
kns.close();
process.exit(0);
