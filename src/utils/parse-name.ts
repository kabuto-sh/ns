export function parseName(name: string): [string, string] {
  const nameParts = name.trim().split(".");

  if (nameParts.length !== 2 || nameParts[0].length === 0) {
    throw Error(
      "invalid, expected a second-level domain of the form `example.hh`"
    );
  }

  return nameParts as [string, string];
}
