// import the Kabuto Name Service (KNS) SDK
import { KNS } from "@kabuto-sh/ns";

// instantiate a new KNS client
const kns = new KNS({
  // select `testnet` or `mainnet`
  network: "mainnet",
});

// ask for the HBAR address for a domain name
const address = await kns.getHederaAddress("mehcode.hh");
console.log(">", address.toString());

// close the client and immediately quit
kns.close();
process.exit(0);
