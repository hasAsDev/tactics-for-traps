/** Kiểm tra dữ liệu người dùng nhập (dùng cả trong hook của Better Auth lẫn form). */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const DISPLAY_NAME_MAX = 30;

const USERNAME_RE = /^[a-z0-9_-]+$/;

/** Tên không được dùng làm username (trùng đường dẫn hoặc dễ gây nhầm). */
const RESERVED = new Set([
  "admin",
  "administrator",
  "api",
  "auth",
  "u",
  "user",
  "users",
  "me",
  "settings",
  "login",
  "logout",
  "register",
  "signup",
  "signin",
  "leaderboard",
  "dev",
  "root",
  "system",
  "support",
  "help",
  "about",
  "static",
  "lichess",
  "tactics",
  "traps",
  "tactics-for-traps",
  "null",
  "undefined",
  "_next",
]);

export function isAllowedUsername(username: string): boolean {
  const u = username.toLowerCase();
  return (
    u.length >= USERNAME_MIN &&
    u.length <= USERNAME_MAX &&
    USERNAME_RE.test(u) &&
    !RESERVED.has(u)
  );
}

export class DisplayNameError extends Error {
  constructor(public readonly code: "DISPLAY_NAME_EMPTY" | "DISPLAY_NAME_TOO_LONG" | "DISPLAY_NAME_INVALID") {
    super(code);
    this.name = "DisplayNameError";
  }
}

/**
 * Chuẩn hoá tên hiển thị: NFC (máy Apple hay gửi dạng tách dấu NFD), bỏ khoảng trắng thừa,
 * 1–30 ký tự, cấm ký tự điều khiển/định dạng (kể cả ký tự đảo chiều bidi).
 */
export function normalizeDisplayName(input: unknown): string {
  if (typeof input !== "string") throw new DisplayNameError("DISPLAY_NAME_EMPTY");
  const value = input.normalize("NFC").replace(/\s+/gu, " ").trim();
  if (value.length === 0) throw new DisplayNameError("DISPLAY_NAME_EMPTY");
  if (/\p{C}/u.test(value)) throw new DisplayNameError("DISPLAY_NAME_INVALID");
  if ([...value].length > DISPLAY_NAME_MAX) throw new DisplayNameError("DISPLAY_NAME_TOO_LONG");
  return value;
}
