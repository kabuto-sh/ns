import type { Provider } from "@hashgraph/sdk";
import { TransactionResponse } from "@hashgraph/sdk";
import { registerName } from "./kns/register-name.js";

export class KNS {
  private _provider?: Provider;

  setProvider(provider: Provider) {
    this._provider = provider;
  }

  registerName(
    name: string,
    duration: { years: number }
  ): Promise<TransactionResponse> {
    if (this._provider == null) {
      throw Error(
        "provider required, call setProvider before calling registerName"
      );
    }

    return registerName({
      provider: this._provider,
      name,
      duration,
    });
  }
}
