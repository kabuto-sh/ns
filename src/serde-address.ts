import { AccountId } from "@hashgraph/sdk";
import { hexDecode, hexEncode } from "./hex.js";
import { utf8Decode, utf8Encode } from "./utf8.js";

export function formatAddress(coinType: number, address: Uint8Array): string {
  switch (coinType) {
    case 3030: // HBAR
      return deserializeHederaAddress(address).toString();

    case 0: // BTC
      return deserializeBitcoinAddress(address);

    case 60: // ETH
    case 714: // BNB (Binance ..)
    case 9006: // BSC (Binance ..)
      return deserializeEthereumAddress(address);

    default:
      // fallback to a 0x.. hex encoding of the address
      return "0x" + hexEncode(address);
  }
}

export function serializeAddress(
  coinType: number,
  address: string | Uint8Array,
): Uint8Array {
  let addressBytes: Uint8Array;

  if (typeof address === "string") {
    switch (coinType) {
      case 3030: // HBAR
        const accountId = AccountId.fromString(address);

        if (accountId.num.isZero()) {
          addressBytes = accountId.toBytes();
        } else {
          addressBytes = hexDecode(accountId.toSolidityAddress());
        }

        break;

      case 0: // BTC
        addressBytes = utf8Encode(address);
        break;

      case 60: // ETH
      case 714: // BNB (Binance ..)
      case 9006: // BSC (Binance ..)
        addressBytes = hexDecode(address); // always 20 bytes
        break;

      default:
        throw new Error(
          `no serialization for coinType ${coinType} available, please serialize before calling setAddress`,
        );
    }
  } else {
    addressBytes = address;
  }

  return addressBytes;
}

export function serializeHederaAddress(
  address: Uint8Array | string | AccountId,
): Uint8Array {
  if (address instanceof AccountId) {
    return address.toBytes();
  }

  return serializeAddress(3030, address);
}

export function deserializeHederaAddress(address: Uint8Array): AccountId {
  if (address.byteLength != 20) {
    return AccountId.fromBytes(address);
  }

  return AccountId.fromSolidityAddress(hexEncode(address));
}

export function deserializeEthereumAddress(address: Uint8Array): string {
  return "0x" + hexEncode(address);
}

export function deserializeBitcoinAddress(address: Uint8Array): string {
  return utf8Decode(address);
}
