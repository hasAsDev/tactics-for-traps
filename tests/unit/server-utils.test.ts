import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken, lichessTokenAad } from "@/server/crypto/token-cipher";
import { codeChallengeS256, createCodeVerifier, createState, safeEqual } from "@/server/lichess/pkce";
import { DisplayNameError, isAllowedUsername, normalizeDisplayName } from "@/server/validation";

describe("mã hoá token", () => {
  const key = randomBytes(32).toString("base64");
  const aad = lichessTokenAad("bobby");

  it("mã hoá rồi giải mã lại được", () => {
    const blob = encryptToken("lio_secret", aad, key);
    expect(blob.startsWith("v1.")).toBe(true);
    expect(blob).not.toContain("lio_secret");
    expect(decryptToken(blob, aad, key)).toBe("lio_secret");
  });

  it("hai lần mã hoá cho kết quả khác nhau (IV ngẫu nhiên)", () => {
    expect(encryptToken("x", aad, key)).not.toBe(encryptToken("x", aad, key));
  });

  it("sai key, sai AAD hoặc bị sửa đều bị từ chối", () => {
    const blob = encryptToken("lio_secret", aad, key);
    expect(() => decryptToken(blob, aad, randomBytes(32).toString("base64"))).toThrow();
    expect(() => decryptToken(blob, lichessTokenAad("alice"), key)).toThrow();
    const parts = blob.split(".");
    parts[3] = Buffer.from("tampered-tag-16b").toString("base64url");
    expect(() => decryptToken(parts.join("."), aad, key)).toThrow();
  });

  it("key phải đúng 32 byte", () => {
    expect(() => encryptToken("x", aad, randomBytes(16).toString("base64"))).toThrow();
  });
});

describe("PKCE", () => {
  it("vector mẫu trong RFC 7636 (Phụ lục B)", () => {
    expect(codeChallengeS256("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });

  it("verifier và state đủ dài, không có padding", () => {
    expect(createCodeVerifier()).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(createState()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("so sánh constant-time", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("kiểm tra username và tên hiển thị", () => {
  it.each(["minh", "minh_99", "a-b-c", "ABC"])("cho phép %s", (u) => {
    expect(isAllowedUsername(u)).toBe(true);
  });

  it.each(["ab", "a".repeat(21), "minh nguyen", "đức", "admin", "Settings", "u", "a.b"])("từ chối %s", (u) => {
    expect(isAllowedUsername(u)).toBe(false);
  });

  it("chuẩn hoá NFC và khoảng trắng", () => {
    const nfd = "Nguyễn  Văn A".normalize("NFD");
    expect(normalizeDisplayName(`  ${nfd} `)).toBe("Nguyễn Văn A");
  });

  it("từ chối tên rỗng, quá dài, hoặc chứa ký tự điều khiển/bidi", () => {
    expect(() => normalizeDisplayName("   ")).toThrow(DisplayNameError);
    expect(() => normalizeDisplayName("a".repeat(31))).toThrow(DisplayNameError);
    expect(() => normalizeDisplayName("Admin‮")).toThrow(DisplayNameError);
    expect(() => normalizeDisplayName(42)).toThrow(DisplayNameError);
    expect(normalizeDisplayName("ả".repeat(30))).toHaveLength(30);
  });
});
