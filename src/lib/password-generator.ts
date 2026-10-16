/**
 * Cryptographically Secure Client-Side Password Generator
 * Uses window.crypto.getRandomValues() to generate high-entropy, unpredictable temporary passwords.
 * Entropy: ~60^12 = 2.1 x 10^21 combinations (vs 9,000 in legacy Math.random).
 */
export function generateSecureTemporaryPassword(prefix: "Setter" | "Reset" = "Setter"): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!#%&*";
  const length = 12;

  const cryptoObj = typeof window !== "undefined" ? window.crypto : globalThis.crypto;
  if (cryptoObj?.getRandomValues) {
    const array = new Uint32Array(length);
    cryptoObj.getRandomValues(array);
    let randomPart = "";
    for (let i = 0; i < length; i++) {
      randomPart += chars[array[i] % chars.length];
    }
    return `${prefix}#${randomPart}`;
  }

  // Fallback if Web Crypto is completely unavailable
  let randomPart = "";
  for (let i = 0; i < length; i++) {
    randomPart += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}#${randomPart}`;
}
