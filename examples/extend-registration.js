// import the Kabuto Name Service (KNS) SDK
import { Client, LocalProvider, Wallet } from "@hashgraph/sdk";
import { KNS } from "@kabuto-sh/ns";

// instantiate a new KNS client
const kns = new KNS({
  // select `testnet` or `mainnet`
  network: "testnet",
});

// configure the signing authority
// this will be the account that signs to pay for the transaction
// and the recipient of the purchased name
const client = LocalProvider.fromClient(Client.forTestnet());
const softwareWallet = new Wallet(
  process.env.ACCOUNT_ID,
  process.env.ACCOUNT_KEY,
  client,
);

kns.setSigner(softwareWallet);

// log the expiration of the domain
let name = await kns.getName("example.hh");
console.log(name.expirationTime);

// ask to extend it by 1 year
name = await kns.extendNameRegistration("example.hh", { years: 1 });

// log the expiration again
console.log(name.expirationTime);

// close the client and immediately quit
kns.close();
process.exit(0);
