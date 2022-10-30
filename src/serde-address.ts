import { AccountId } from "@hashgraph/sdk";
import { hexDecode, hexEncode } from "./hex";
import { toBytes32 } from "./bytes";

export function formatAddress(coinType: number, address: Uint8Array): string {
  switch (coinType) {
    case 3030:
      return deserializeHederaAddress(address).toString();

    default:
      // fallback to a 0x.. hex encoding of the address
      return "0x" + hexEncode(address);
  }
}

export function serializeAddress(
  coinType: number,
  address: string | Uint8Array
): Uint8Array {
  let addressBytes: Uint8Array;

  if (typeof address === "string") {
    switch (coinType) {
      case 3030: // HBAR
        const accountId = AccountId.fromString(address);
        const solidityAddress = accountId.toSolidityAddress();

        addressBytes = hexDecode(solidityAddress);
        break;

      default:
        throw new Error(
          `no serialization for coinType ${coinType} available, please serialize before calling setAddress`
        );
    }
  } else {
    addressBytes = address;
  }

  return toBytes32(addressBytes);
}

export function deserializeHederaAddress(address: Uint8Array): AccountId {
  const solidityAddress = hexEncode(address.slice(0, 20));

  return AccountId.fromSolidityAddress(solidityAddress);
}
