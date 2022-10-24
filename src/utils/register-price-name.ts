import { parseName } from "./parse-name.js";

export function getRegisterPriceOfName(name: string): number {
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

  return price;
}
