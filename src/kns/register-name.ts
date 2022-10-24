import {
  ContractExecuteTransaction,
  ContractFunctionParameters,
  type Provider,
  Signer,
  type TransactionResponse,
} from "@hashgraph/sdk";
import { parseName } from "../utils/parse-name.js";
import { getRegisterPriceOfName } from "../utils/register-price-name.js";
import BigNumber from "bignumber.js";

export async function registerName({
  signer,
  name,
  duration: { years },
}: {
  signer: Signer;
  name: string;
  duration: { years: number };
}): Promise<TransactionResponse> {
  const [sld, tld] = parseName(name);

  // FIXME: the TLD contract ID should be in a map of available TLDs
  const tldContractId = "0.0.48699076";

  const priceUsd = getRegisterPriceOfName(sld);

  // FIXME: get USD TO HBAR from CoinGecko
  const usdToHbar = new BigNumber("16.88");

  const priceHbar = usdToHbar.multipliedBy(priceUsd).multipliedBy(years);

  const registerParams = new ContractFunctionParameters()
    .addString(sld)
    .addUint256(years);

  const transaction = new ContractExecuteTransaction()
    .setContractId(tldContractId)
    .setFunction("purchaseZone", registerParams)
    .setPayableAmount(priceHbar)
    // FIXME: determine the correct gas amount
    .setGas(2_000_000);

  await signer.populateTransaction(transaction);

  return signer.call(transaction);
}
