// import the Kabuto Name Service (KNS) SDK
import { Client, LocalProvider, Wallet } from "@hashgraph/sdk";
import { KNS } from "@kabuto-sh/ns";

// instantiate a new KNS client
const kns = new KNS({
  // select `testnet` or `mainnet`
  network: "mainnet",
});

// configure the signing authority
// this will be the account that signs to pay for the transaction
// and the recipient of the purchased name
const client = LocalProvider.fromClient(Client.forMainnet());
const softwareWallet = new Wallet(process.env.ACCOUNT_ID, process.env.ACCOUNT_KEY, client);

kns.setSigner(softwareWallet);

// ask for the HBAR address for a domain name
await kns.registerName("example.hh", { years: 1 });

// close the client and immediately quit
kns.close();
process.exit(0);
