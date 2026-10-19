import { z } from "zod";
import { resolveDatabaseUrls } from "./db/url.mjs";

// Biến môi trường phía server, kiểm tra lúc dùng lần đầu (không kiểm tra lúc import,
// để `next build` và CLI của Better Auth không vỡ khi thiếu biến).
const serverSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  TOKEN_ENCRYPTION_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(16),
  LICHESS_CLIENT_ID: z.string().min(1).default("tactics-for-traps"),
  SIGNUP_DISABLED: z.string().optional(),
  SIGNUP_INVITE_CODE: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (!cached) {
    // DATABASE_URL có thể đến từ tên khác (POSTGRES_URL, tiền tố của Neon), xem db/url.mjs.
    const parsed = serverSchema.safeParse({ ...process.env, DATABASE_URL: resolveDatabaseUrls().pooled });
    if (!parsed.success) {
      const keys = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
      throw new Error(`Biến môi trường không hợp lệ hoặc bị thiếu: ${keys}`);
    }
    cached = parsed.data;
  }
  return cached;
}

/** Origin chính thức của site, không có dấu "/" ở cuối. */
export function appOrigin(): string {
  return serverEnv().BETTER_AUTH_URL.replace(/\/+$/, "");
}
