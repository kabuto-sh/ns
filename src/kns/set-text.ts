import type { Signer, TransactionResponse } from "@hashgraph/sdk";
import { parseRecordName } from "./parse-name.js";
import {
  ContractExecuteTransaction,
  ContractFunctionParameters,
} from "@hashgraph/sdk";
import { getNameSerial } from "./get-name-serial.js";

export async function setText({
  signer,
  name,
  text,
}: {
  signer: Signer;
  name: string;
  text: string;
}): Promise<TransactionResponse> {
  const parsedName = parseRecordName(name);
  const nameSerial = await getNameSerial(parsedName);

  // FIXME: the TLD contract ID should be in a map of available TLDs
  const tldContractId = "0.0.48699076";

  const setParams = new ContractFunctionParameters()
    .addInt64(nameSerial)
    .addString(parsedName.recordName)
    .addString(text);

  const transaction = new ContractExecuteTransaction()
    .setContractId(tldContractId)
    .setFunction("setText", setParams)
    // FIXME: determine the correct gas amount
    .setGas(2_000_000);

  await signer.populateTransaction(transaction);

  return signer.call(transaction);
}
