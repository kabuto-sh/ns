export function utf8Decode(data: Uint8Array): string {
  return new TextDecoder().decode(data);
}

export function utf8Encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}
