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

export function formatName(parsed: ParsedName): string {
  return `${parsed.secondLevelDomain}.${parsed.topLevelDomain}`;
}

export function normalizeName(name: string): string {
  return formatName(parseName(name));
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
      "invalid, expected a record name of the form `example.hh` or `test.example.hh`",
    );
  }

  const name = nameParts.slice(0, nameParts.length - 2).join(".");

  return {
    recordName: name,
    secondLevelDomain: nameParts[nameParts.length - 2],
    topLevelDomain: unaliasTopLevelDomain(nameParts[nameParts.length - 1]),
  };
}

export function formatRecordName(parsed: ParsedRecordName): string {
  let name = `${parsed.secondLevelDomain}.${parsed.topLevelDomain}`;

  if (parsed.recordName.length > 0) {
    name = parsed.recordName + "." + name;
  }

  return name;
}

export function normalizeRecordName(recordName: string): string {
  return formatRecordName(parseRecordName(recordName));
}
