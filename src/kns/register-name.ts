import {
  ContractExecuteTransaction,
  ContractFunctionParameters,
  type Signer,
  type TransactionResponse,
} from "@hashgraph/sdk";
import { parseName } from "./parse-name.js";
import { getRegisterPriceHbar } from "./get-register-price.js";

export async function registerName({
  signer,
  name,
  duration: { years },
}: {
  signer: Signer;
  name: string;
  duration: { years: number };
}): Promise<TransactionResponse> {
  const parsedName = parseName(name);

  // FIXME: the TLD contract ID should be in a map of available TLDs
  const tldContractId = "0.0.48727098";

  const unitPrice = await getRegisterPriceHbar(name);
  const price = unitPrice.toBigNumber().multipliedBy(years);

  const registerParams = new ContractFunctionParameters()
    .addString(parsedName.secondLevelDomain)
    .addUint256(years);

  const transaction = new ContractExecuteTransaction()
    .setContractId(tldContractId)
    .setFunction("purchaseZone", registerParams)
    .setPayableAmount(price)
    // FIXME: determine the correct gas amount
    .setGas(2_000_000);

  await signer.populateTransaction(transaction);

  return signer.call(transaction);
}
