import type { AccountId } from "@hashgraph/sdk";

export interface AddressRecord {
  name: string;

  coinType: number;

  address: string;
  addressBytes: Uint8Array;
}

export interface TextRecord {
  name: string;
  text: string;
}

export interface Name {
  serialNumber: number;
  ownerAccountId: AccountId;
  expirationTime: Date;
}
