// Chạy lúc build trên Vercel (chỉ production): kiểm tra biến môi trường rồi chạy migration Drizzle.
// Local: dùng `npm run db:migrate`.
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { databaseEnvNames, resolveDatabaseUrls } from "../src/db/url.mjs";

if (process.env.VERCEL_ENV !== "production") {
  console.log("[migrate] bỏ qua (VERCEL_ENV khác production)");
  process.exit(0);
}

/** Báo sớm, lúc build, những biến còn thiếu hoặc sai, thay vì để web lỗi khi đang chạy. */
function checkEnv() {
  const env = process.env;
  const problems = [];
  if (!resolveDatabaseUrls(env).direct) {
    // Chỉ in tên biến, không in giá trị.
    const seen = databaseEnvNames(env);
    problems.push(
      "DATABASE_URL: bản build Production không thấy connection string Postgres nào " +
        "(đã tìm DATABASE_URL, DATABASE_URL_UNPOOLED, POSTGRES_URL và các tên đó có tiền tố).\n" +
        `    Biến liên quan tới database mà build thấy: ${seen.length > 0 ? seen.join(", ") : "(không có)"}\n` +
        "    Cách sửa: Storage → database Neon → Connect Project → chọn project này, tick Production → Connect.\n" +
        "    Nếu tạo database bên console Neon: tự thêm DATABASE_URL (Settings → Environment Variables, môi trường Production).",
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

const { direct: url, pooled, directName, pooledName } = resolveDatabaseUrls();
const derived = directName === pooledName && url !== pooled;
console.log(`[migrate] dùng ${directName}${derived ? " (đổi sang host kết nối thẳng)" : ""}`);
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
