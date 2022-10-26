import BigNumber from "bignumber.js";
import axios from "axios";

const coinGecko = axios.create({
  baseURL: "https://api.coingecko.com/api",
});

const MINUTES_10 = 10 * 60 * 1000;

let hbarPrice: BigNumber | null = null;
let hbarPriceTimestamp: number = 0;

export async function getHbarPrice(): Promise<BigNumber> {
  if (hbarPrice != null && hbarPriceTimestamp <= Date.now() - MINUTES_10) {
    // hbar price is non-null and its been less than 10 minutes
    // since we fetched
    return hbarPrice;
  }

  interface HbarPriceResponse {
    "hedera-hashgraph": { usd: number };
  }

  const { data } = await coinGecko.get<HbarPriceResponse>("/v3/simple/price", {
    params: {
      ids: "hedera-hashgraph",
      vs_currencies: "usd",
    },
  });

  hbarPrice = new BigNumber(data["hedera-hashgraph"].usd);
  hbarPriceTimestamp = Date.now();

  return hbarPrice;
}
