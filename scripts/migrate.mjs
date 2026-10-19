// Chạy migration Drizzle lúc build trên Vercel (chỉ production).
// Local: dùng `npm run db:migrate`.
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

if (process.env.VERCEL_ENV !== "production") {
  console.log("[migrate] bỏ qua (VERCEL_ENV khác production)");
  process.exit(0);
}

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] thiếu DATABASE_URL_UNPOOLED / DATABASE_URL");
  process.exit(1);
}

const LOCK_KEY = 727274; // khoá advisory cố định để hai bản build không migrate cùng lúc
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query("select pg_advisory_lock($1)", [LOCK_KEY]);
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  console.log("[migrate] xong");
} finally {
  await client.query("select pg_advisory_unlock($1)", [LOCK_KEY]).catch(() => {});
  await client.end();
}
