import axios from "axios";
import { AccountId } from "@hashgraph/sdk";

const hederaMirror = axios.create({
  // TODO: need a way to change network globally?
  baseURL: "https://testnet.mirrornode.hedera.com/",
});

export interface Nft {
  ownerAccountId: AccountId;
}

export async function getNft(
  tokenId: string,
  serialNumber: number
): Promise<Nft> {
  interface HederaNftResponse {
    account_id: string;
  }

  const hederaResp = await hederaMirror.get<HederaNftResponse>(
    `/api/v1/tokens/${tokenId}/nfts/${serialNumber}`
  );

  return {
    ownerAccountId: AccountId.fromString(hederaResp.data.account_id),
  };
}
