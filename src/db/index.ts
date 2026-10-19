import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, types } from "pg";
import * as schema from "./schema";
import { resolveDatabaseUrls } from "./url.mjs";

// Cột DATE trả về chuỗi "YYYY-MM-DD" thay vì Date theo giờ máy (tránh lệch ngày).
types.setTypeParser(types.builtins.DATE, (value: string) => value);

// Một Pool cho mỗi instance (Fluid compute dùng lại instance giữa các request).
// Pool không mở kết nối cho tới query đầu tiên, nên import module này lúc build vẫn an toàn.
const globalForDb = globalThis as unknown as { __tftPool?: Pool };

function createPool(): Pool {
  const pool = new Pool({
    connectionString: resolveDatabaseUrls().pooled,
    max: 5,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 15_000,
  });
  attachDatabasePool(pool);
  return pool;
}

export const pool: Pool = globalForDb.__tftPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.__tftPool = pool;

export const db = drizzle(pool, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
