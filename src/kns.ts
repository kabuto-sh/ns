import type { Signer } from "@hashgraph/sdk";
import { Hbar, TransactionResponse } from "@hashgraph/sdk";
import { registerName } from "./kns/register-name.js";
import { removeText } from "./kns/remove-text.js";
import { getName, type Name } from "./kns/get-name.js";
import BigNumber from "bignumber.js";
import {
  getRegisterPriceHbar,
  getRegisterPriceUsd,
} from "./kns/get-register-price.js";
import { setText } from "./kns/set-text.js";

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
    this._requireSigner();

    return registerName({
      signer: this._signer!,
      name,
      duration,
    });
  }

  /**
   * Gets the registration information for a name, if registered.
   */
  getName(name: string): Promise<Name> {
    return getName(name);
  }

  /**
   * Sets the text record for a name.
   */
  setText(name: string, text: string): Promise<TransactionResponse> {
    this._requireSigner();

    return setText({
      signer: this._signer!,
      text,
      name,
    });
  }

  /**
   * Removes a text record for a name.
   */
  removeText(name: string): Promise<TransactionResponse> {
    this._requireSigner();

    return removeText({
      signer: this._signer!,
      name,
    });
  }

  private _requireSigner() {
    if (this._signer == null) {
      throw Error(
        "provider required, call setSigner before calling registerName"
      );
    }
  }
}
