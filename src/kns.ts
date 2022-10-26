import type { Signer } from "@hashgraph/sdk";
import { Hbar, TransactionResponse } from "@hashgraph/sdk";
import { registerName } from "./kns/register-name.js";
import { getName, type Name } from "./kns/get-name.js";
import BigNumber from "bignumber.js";
import {
  getRegisterPriceHbar,
  getRegisterPriceUsd,
} from "./kns/get-register-price.js";

export class KNS {
  private _signer?: Signer;

  /**
   * Sets the passed signer to be used to sign any generated transactions.
   * Must be called before any write method is called.
   */
  setSigner(signer: Signer) {
    this._signer = signer;
  }

  /**
   * Gets the estimated price (in USD) of registering the name.
   * Does not check if the name is available.
   */
  getRegisterPriceUsd(name: string): BigNumber {
    return getRegisterPriceUsd(name);
  }

  /**
   * Gets the estimated price (in HBAR) of registering the name.
   * Does not check if the name is available.
   */
  getRegisterPriceHbar(name: string): Promise<Hbar> {
    return getRegisterPriceHbar(name);
  }

  /**
   * Registers a new name to the current signer for the desired duration.
   * To check how much HBAR this will cost, call `getRegisterPrice(name)`.
   */
  registerName(
    name: string,
    duration: { years: number }
  ): Promise<TransactionResponse> {
    if (this._signer == null) {
      throw Error(
        "provider required, call setSigner before calling registerName"
      );
    }

    return registerName({
      signer: this._signer,
      name,
      duration,
    });
  }

  getName(name: string): Promise<Name> {
    return getName(name);
  }
}
