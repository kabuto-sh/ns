import { kabutoResolver } from "../resolver.js";
import { getNft } from "../hedera-mirror.js";
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
      domain: {
        contract_id: string;
        nft_serial: number;
        zone_token_id: string;
      };
      zone: {
        size: number;
        // TODO: ttl
      };
    };
  }

  let tokenId: string;
  let serialNumber: number;

  try {
    const kabutoResp = await kabutoResolver.get<KabutoInfoResponse>(
      `/domain/${name}/info`
    );

    tokenId = kabutoResp.data.data.domain.zone_token_id;
    serialNumber = kabutoResp.data.data.domain.nft_serial;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      throw new NameNotFoundError();
    }

    throw error;
  }

  const nft = await getNft(tokenId, serialNumber);

  return {
    ownerAccountId: nft.ownerAccountId,
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
