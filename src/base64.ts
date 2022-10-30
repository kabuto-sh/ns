export function base64Decode(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}

export function base64Encode(data: Uint8Array): string {
  return btoa(String.fromCharCode.apply(null, Array.from(data)));
}
