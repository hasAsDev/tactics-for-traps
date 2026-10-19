import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Mã hoá token Lichess khi lưu DB: AES-256-GCM, IV ngẫu nhiên 12 byte,
 * associated data (AAD) gắn token với tài khoản Lichess, định dạng "v1.<iv>.<ciphertext>.<tag>".
 */

const VERSION = "v1";

function keyFrom(rawKey: string): Buffer {
  const key = Buffer.from(rawKey, "base64");
  if (key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY phải là 32 byte dạng base64");
  return key;
}

export function encryptToken(plain: string, aad: string, rawKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(rawKey), iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
}

export function decryptToken(blob: string, aad: string, rawKey: string): string {
  const [version, iv, ciphertext, tag] = blob.split(".");
  if (version !== VERSION || !iv || !ciphertext || !tag) throw new Error("Token mã hoá sai định dạng");
  const decipher = createDecipheriv("aes-256-gcm", keyFrom(rawKey), Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function lichessTokenAad(externalId: string): string {
  return `lichess:${externalId}`;
}
