// Chạy lúc build trên Vercel (chỉ production): kiểm tra biến môi trường rồi chạy migration Drizzle.
// Local: dùng `npm run db:migrate`.
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

if (process.env.VERCEL_ENV !== "production") {
  console.log("[migrate] bỏ qua (VERCEL_ENV khác production)");
  process.exit(0);
}

/** Báo sớm, lúc build, những biến còn thiếu hoặc sai, thay vì để web lỗi khi đang chạy. */
function checkEnv() {
  const env = process.env;
  const problems = [];
  if (!env.DATABASE_URL_UNPOOLED && !env.DATABASE_URL) {
    problems.push(
      "DATABASE_URL: chưa có database. Vào tab Storage của project → Create Database → Neon, kết nối với môi trường Production.",
    );
  }
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) {
    problems.push("BETTER_AUTH_SECRET: thiếu hoặc ngắn hơn 32 ký tự.");
  }
  if (!env.BETTER_AUTH_URL || !/^https:\/\/[^/]+$/.test(env.BETTER_AUTH_URL.replace(/\/+$/, ""))) {
    problems.push("BETTER_AUTH_URL: phải là origin https của web, ví dụ https://tactics-for-traps.vercel.app");
  }
  if (!env.TOKEN_ENCRYPTION_KEY || Buffer.from(env.TOKEN_ENCRYPTION_KEY, "base64").length !== 32) {
    problems.push("TOKEN_ENCRYPTION_KEY: phải là 32 byte dạng base64.");
  }
  if (!env.CRON_SECRET || env.CRON_SECRET.length < 16) {
    problems.push("CRON_SECRET: thiếu hoặc ngắn hơn 16 ký tự.");
  }
  if (problems.length > 0) {
    console.error("[migrate] Thiếu cấu hình cho production (Project Settings → Environment Variables, rồi Redeploy):");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
}

checkEnv();

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
const LOCK_KEY = 727274; // khoá advisory cố định để hai bản build không migrate cùng lúc
const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 20_000 });
try {
  await client.connect();
} catch (error) {
  console.error(`[migrate] Không kết nối được database: ${error instanceof Error ? error.message : error}`);
  console.error("[migrate] Kiểm tra lại kết nối Neon ở tab Storage (môi trường Production) rồi Redeploy.");
  process.exit(1);
}
try {
  await client.query("select pg_advisory_lock($1)", [LOCK_KEY]);
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  console.log("[migrate] xong");
} finally {
  await client.query("select pg_advisory_unlock($1)", [LOCK_KEY]).catch(() => {});
  await client.end();
}
