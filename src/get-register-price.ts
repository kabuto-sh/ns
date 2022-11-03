import BigNumber from "bignumber.js";
import { parseName } from "./parse-name.js";
import { utf8Encode } from "./utf8.js";

function getByteLengthAndIsAscii(value: string): [number, boolean] {
  let len: number;
  let i = 0;
  let isAscii = true;

  const bytes = utf8Encode(value);

  for (len = 0; i < bytes.length; len++) {
    const b = bytes.at(i)!;

    if (b < 0x80) {
      i += 1;
    } else {
      isAscii = false;

      if (b < 0xe0) {
        i += 2;
      } else if (b < 0xf0) {
        i += 3;
      } else if (b < 0xf8) {
        i += 4;
      } else if (b < 0xfc) {
        i += 5;
      } else {
        i += 6;
      }
    }
  }

  return [len, isAscii];
}

export function getRegisterPriceUsd(name: string): BigNumber {
  if (name.includes(".")) {
    name = parseName(name).secondLevelDomain;
  }

  let price: number;

  const [byteLength, isAscii] = getByteLengthAndIsAscii(name);

  switch (byteLength) {
    case 1:
      price = 500;
      break;

    case 2:
      price = 50;
      break;

    default: // 3+
      price = 5;
      break;
  }

  if (!isAscii) {
    price *= 2;
  }

  return new BigNumber(price);
}
