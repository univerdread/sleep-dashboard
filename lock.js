// Opens what site.py sealed: AES-GCM, key from PBKDF2-SHA256, gzip inside. Plain functions, so the
// tests can run this same file in node against Python's output.
const b64bytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(passphrase, saltB64, iterations) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: b64bytes(saltB64), iterations }, base, 256);
  return new Uint8Array(bits);
}

async function openBox(box, rawKey) {
  const blob = b64bytes(box.slice(4));
  const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: blob.slice(0, 12) }, key, blob.slice(12));
  const stream = new Blob([plain]).stream().pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text());
}
