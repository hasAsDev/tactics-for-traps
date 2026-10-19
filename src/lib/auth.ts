// CLI `auth generate` cũng nạp file này: chỉ dùng import tương đối, không import "server-only".
import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { db } from "../db";
import * as schema from "../db/schema";
import { revokeLichessForUser } from "../server/lichess/revoke";
import {
  DisplayNameError,
  isAllowedUsername,
  normalizeDisplayName,
  USERNAME_MAX,
  USERNAME_MIN,
} from "../server/validation";

const DAY = 60 * 60 * 24;

/** Header client gửi kèm khi đăng ký, chỉ cần khi đặt SIGNUP_INVITE_CODE. */
export const INVITE_HEADER = "x-invite-code";

function displayName(value: unknown): string {
  try {
    return normalizeDisplayName(value);
  } catch (error) {
    if (error instanceof DisplayNameError) {
      throw new APIError("BAD_REQUEST", { message: error.code, code: error.code });
    }
    throw error;
  }
}

function assertSignupOpen(headers: Headers | undefined) {
  if (process.env.SIGNUP_DISABLED === "1" || process.env.SIGNUP_DISABLED === "true") {
    throw new APIError("FORBIDDEN", { message: "SIGNUP_DISABLED", code: "SIGNUP_DISABLED" });
  }
  const invite = process.env.SIGNUP_INVITE_CODE;
  if (invite && headers?.get(INVITE_HEADER) !== invite) {
    throw new APIError("FORBIDDEN", { message: "INVALID_INVITE_CODE", code: "INVALID_INVITE_CODE" });
  }
}

export const auth = betterAuth({
  appName: "Tactics for Traps",
  database: drizzleAdapter(db, { provider: "pg", schema }),
  telemetry: { enabled: false },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  session: {
    expiresIn: 30 * DAY,
    updateAge: DAY,
  },
  user: {
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        await revokeLichessForUser(user.id).catch(() => {});
      },
    },
  },
  // Không có email thật: tắt mọi đường dẫn dựa trên email (chỉ chặn được qua HTTP).
  disabledPaths: [
    "/sign-in/email",
    "/forget-password",
    "/request-password-reset",
    "/reset-password",
    "/send-verification-email",
    "/verify-email",
    "/change-email",
  ],
  rateLimit: {
    enabled: process.env.NODE_ENV === "production" || process.env.AUTH_RATE_LIMIT === "1",
    storage: "database",
    customRules: {
      // Mạng di động VN hay dùng chung IP (CGNAT) nên giới hạn đăng ký khá rộng.
      "/sign-up/email": { window: 3600, max: 10 },
      "/sign-in/username": { window: 60, max: 5 },
      "/change-password": { window: 60, max: 5 },
      "/delete-user": { window: 3600, max: 5 },
      "/get-session": false,
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const body = (ctx.body ?? {}) as Record<string, unknown>;
      if (ctx.path === "/sign-up/email") {
        assertSignupOpen(ctx.headers);
        if (body.image) {
          throw new APIError("BAD_REQUEST", { message: "FIELD_NOT_ALLOWED", code: "FIELD_NOT_ALLOWED" });
        }
        return {
          context: {
            body: {
              // Better Auth bắt buộc có email; ta không dùng email nên tạo địa chỉ giả ngẫu nhiên.
              email: `${randomUUID()}@users.invalid`,
              name: displayName(body.name),
            },
          },
        };
      }
      if (ctx.path === "/update-user") {
        for (const field of ["image", "username", "displayUsername", "email"]) {
          if (field in body) {
            throw new APIError("BAD_REQUEST", { message: "FIELD_NOT_EDITABLE", code: "FIELD_NOT_EDITABLE" });
          }
        }
        if ("name" in body) return { context: { body: { name: displayName(body.name) } } };
      }
    }),
  },
  plugins: [
    username({
      minUsernameLength: USERNAME_MIN,
      maxUsernameLength: USERNAME_MAX,
      usernameValidator: isAllowedUsername,
      displayUsername: false,
      immutableUsername: true,
    }),
    nextCookies(), // phải đứng cuối
  ],
});

export type Session = typeof auth.$Infer.Session;
