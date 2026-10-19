import { randomBytes } from "node:crypto";
import { inject } from "vitest";

// Phải chạy trước khi test import src/db (Pool đọc DATABASE_URL lúc import).
process.env.DATABASE_URL = inject("databaseUrl");
process.env.TOKEN_ENCRYPTION_KEY ??= randomBytes(32).toString("base64");
process.env.BETTER_AUTH_SECRET ??= randomBytes(32).toString("base64url");
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.CRON_SECRET ??= randomBytes(24).toString("base64url");
