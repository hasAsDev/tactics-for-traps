import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** PKCE (RFC 7636, chỉ S256) và state cho OAuth Lichess. */

export function createCodeVerifier(): string {
  return randomBytes(32).toString("base64url"); // 43 ký tự
}

export function codeChallengeS256(verifier: string): string {
  return createHash("sha256").update(verifier, "ascii").digest("base64url");
}

export function createState(): string {
  return randomBytes(32).toString("base64url");
}

/** So sánh constant-time (độ dài khác nhau thì trả false). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
