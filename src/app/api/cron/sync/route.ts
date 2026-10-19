import { timingSafeEqual } from "node:crypto";
import { connection, NextResponse } from "next/server";
import { serverEnv } from "@/env";
import { requestDeadline } from "@/server/sync/deadline";
import { runSyncBatch } from "@/server/sync/batch";

export const maxDuration = 300;

function authorized(request: Request): boolean {
  const expected = Buffer.from(`Bearer ${serverEnv().CRON_SECRET}`, "utf8");
  const actual = Buffer.from(request.headers.get("authorization") ?? "", "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Vercel Cron (1 lần/ngày): đồng bộ mọi link, chạy trực tiếp trong request. */
export async function GET(request: Request) {
  await connection();
  const deadline = requestDeadline();
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await runSyncBatch("cron", deadline, 0);
  const counts: Record<string, number> = {};
  for (const run of result.runs) counts[run.outcome] = (counts[run.outcome] ?? 0) + 1;
  return NextResponse.json({ status: result.status, runs: result.runs.length, outcomes: counts });
}
