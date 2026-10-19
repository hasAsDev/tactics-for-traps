import type { Server } from "node:net";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

/** Postgres in-memory (PGlite) cho integration test, migrate một lần cho cả phiên. */
export default async function setup(project: TestProject) {
  const pglite = await PGlite.create();
  const server = new PGLiteSocketServer({ db: pglite, port: 0, host: "127.0.0.1", maxConnections: 16 });
  await server.start();
  const address = (server as unknown as { server: Server }).server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const url = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  await client.end();

  project.provide("databaseUrl", url);
  return async () => {
    await server.stop();
    await pglite.close();
  };
}
