// Postgres local cho dev: PGlite (Postgres chạy bằng WASM) mở cổng TCP để `pg` kết nối như Postgres thật.
// Chạy: npm run db:up   (dữ liệu lưu trong .pglite/dev, dừng bằng Ctrl+C)
import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const dataDir = process.env.PGLITE_DIR ?? "./.pglite/dev";
const port = Number(process.env.PGLITE_PORT ?? 5432);

mkdirSync(dataDir, { recursive: true });
const db = await PGlite.create({ dataDir });
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 8 });
await server.start();
console.log(`[db] PGlite đang chạy: postgres://postgres:postgres@127.0.0.1:${port}/postgres (dữ liệu: ${dataDir})`);

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  await server.stop().catch(() => {});
  await db.close().catch(() => {});
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
