export function toBytes32(bytes: Uint8Array): Uint8Array {
  const padded = new Uint8Array(32);
  padded.fill(0);
  padded.set(bytes, 0);

  return padded;
}
