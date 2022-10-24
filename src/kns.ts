import type { Provider } from "@hashgraph/sdk";

export class KNS {
  private _provider?: Provider;

  setProvider(provider: Provider) {
    this._provider = provider;
  }
}
