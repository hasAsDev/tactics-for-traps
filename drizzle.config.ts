import { defineConfig } from "drizzle-kit";
import { resolveDatabaseUrls } from "./src/db/url.mjs";

// Local: đọc .env.local. Trên Vercel/CI biến môi trường đã có sẵn.
try {
  process.loadEnvFile(".env.local");
} catch {
  // không có .env.local
}

const url = resolveDatabaseUrls().direct;
if (!url) throw new Error("Thiếu DATABASE_URL_UNPOOLED / DATABASE_URL");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
