function unaliasTopLevelDomain(tld: string): string {
  // alias .h to .ℏ
  if (tld === "h") {
    tld = "ℏ";
  }

  return tld;
}

export interface ParsedName {
  secondLevelDomain: string;
  topLevelDomain: string;
}

export function parseName(name: string): ParsedName {
  const nameParts = name.trim().split(".");

  if (nameParts.length !== 2 || nameParts[0].length === 0) {
    throw Error("invalid, expected a name of the form `example.hh`");
  }

  return {
    secondLevelDomain: nameParts[0],
    topLevelDomain: unaliasTopLevelDomain(nameParts[1]),
  };
}

export interface ParsedRecordName {
  recordName: string;
  secondLevelDomain: string;
  topLevelDomain: string;
}

export function parseRecordName(recordName: string): ParsedRecordName {
  const nameParts = recordName.trim().split(".");

  if (nameParts.length === 1) {
    throw Error(
      "invalid, expected a record name of the form `example.hh` or `test.example.hh`"
    );
  }

  const name = nameParts.slice(0, nameParts.length - 2).join(".");

  return {
    recordName: name,
    secondLevelDomain: nameParts[nameParts.length - 2],
    topLevelDomain: unaliasTopLevelDomain(nameParts[nameParts.length - 1]),
  };
}
