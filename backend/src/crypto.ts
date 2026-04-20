import crypto from "crypto";

export function getEncryptionParams(encKey: string, ivKey: string) {
  // IV: .toString("hex") on a string is a no-op, then slice first 16 chars
  const iv = ivKey.toString().slice(0, 16);
  return { key: encKey, iv };
}

export function encrypt(
  plaintext: string,
  encKey: string,
  ivKey: string
): string {
  const { key, iv } = getEncryptionParams(encKey, ivKey);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}

export function decrypt(
  ciphertext: string,
  encKey: string,
  ivKey: string
): string {
  const { key, iv } = getEncryptionParams(encKey, ivKey);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
