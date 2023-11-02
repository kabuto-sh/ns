import type { AccountId, ContractId, TokenId } from "@hashgraph/sdk";

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
  domain: string;
  // serial number of the token, relative to the contract version
  serialNumber: number;
  ownerAccountId: AccountId;
  expirationTime: Date;
  tokenId: TokenId;
  contractId: ContractId;
  // absolute serial number of token for use in the contract
  contractSerialNumber: number;
  version: 1 | 2 | 3;
}
