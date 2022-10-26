import { parseName } from "../utils/parse-name.js";
import BigNumber from "bignumber.js";
import { getHbarPrice } from "../coingecko.js";
import { Hbar } from "@hashgraph/sdk";

export async function getRegisterPriceHbar(name: string): Promise<Hbar> {
  const priceUsd = getRegisterPriceUsd(name);
  const hbarToUsd = await getHbarPrice();
  const priceHbar = priceUsd.div(hbarToUsd).decimalPlaces(8);

  return new Hbar(priceHbar);
}

export function getRegisterPriceUsd(name: string): BigNumber {
  if (name.includes(".")) {
    name = parseName(name)[0];
  }

  let price: number;
  let hasEmoji = false;

  if (/\p{Extended_Pictographic}/u.test(name)) {
    hasEmoji = true;
  }

  switch (name.length) {
    case 1:
      price = 500;
      break;

    case 2:
      price = hasEmoji ? 1000 : 50;
      break;

    case 3:
      price = hasEmoji ? 100 : 5;
      break;

    default:
      price = hasEmoji ? 50 : 5;
  }

  return new BigNumber(price);
}
