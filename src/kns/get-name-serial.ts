import BigNumber from "bignumber.js";
import { ParsedRecordName } from "./parse-name.js";
import { getName } from "./get-name.js";

let nameToSerial: Map<string, BigNumber> = new Map();

export async function getNameSerial(
  parsedName: ParsedRecordName
): Promise<BigNumber> {
  const name = `${parsedName.secondLevelDomain}.${parsedName.topLevelDomain}`;
  let nameSerial = nameToSerial.get(name);

  if (nameSerial != null) {
    return nameSerial;
  }

  const { serialNumber } = await getName(
    `${parsedName.secondLevelDomain}.${parsedName.topLevelDomain}`
  );

  nameSerial = new BigNumber(serialNumber);

  nameToSerial.set(name, nameSerial);

  return nameSerial;
}
