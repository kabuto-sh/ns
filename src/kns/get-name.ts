import { kabutoResolver } from "../resolver.js";
import { hederaMirror } from "../mirror.js";
import { AccountId } from "@hashgraph/sdk";
import axios from "axios";

export interface Name {
  serialNumber: number;
  ownerAccountId: AccountId;
  tokenId: string;
  // TODO: expirationTime
}

export async function getName(name: string): Promise<Name> {
  interface KabutoInfoResponse {
    data: {
      contract_id: string;
      nft_serial: number;
      zone_token_id: string;
    };
  }

  let tokenId: string;
  let serialNumber: number;

  try {
    const kabutoResp = await kabutoResolver.get<KabutoInfoResponse>(
      `/domain/${name}/info`
    );

    tokenId = kabutoResp.data.data.zone_token_id;
    serialNumber = kabutoResp.data.data.nft_serial;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      throw new NameNotFoundError();
    }

    throw error;
  }

  interface HederaNftResponse {
    account_id: string;
  }

  const hederaResp = await hederaMirror.get<HederaNftResponse>(
    `/api/v1/tokens/${tokenId}/nfts/${serialNumber}`
  );

  return {
    ownerAccountId: AccountId.fromString(hederaResp.data.account_id),
    tokenId,
    serialNumber,
  };
}

export class NameNotFoundError extends Error {
  constructor() {
    super();

    this.name = "NameNotFoundError";
  }
}
