import BigNumber from "bignumber.js";
import { parseName } from "./parse-name";

export function getRegisterPriceUsd(name: string): BigNumber {
  if (name.includes(".")) {
    name = parseName(name).secondLevelDomain;
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
