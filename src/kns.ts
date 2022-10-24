import type { Signer } from "@hashgraph/sdk";
import { TransactionResponse } from "@hashgraph/sdk";
import { registerName } from "./kns/register-name.js";
import { getName, type Name } from "./kns/get-name.js";

export class KNS {
  private _signer?: Signer;

  setSigner(signer: Signer) {
    this._signer = signer;
  }

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
