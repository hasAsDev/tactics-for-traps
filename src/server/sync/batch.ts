import { randomUUID } from "node:crypto";
import { and, asc, inArray, isNotNull, isNull, lt, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { providerLink, syncRun } from "@/db/schema";
import { leaseActive, releaseLease, tryLease } from "./leases";
import { syncLink, type SyncDeps, type SyncOutcome, type SyncTrigger } from "./sync-link";

const PASS_ONE_MS = 40_000;
const MIN_LEFT_MS = 30_000;

export interface BatchResult {
  status: "done" | "busy";
  runs: { linkId: number; outcome: SyncOutcome }[];
}

/**
 * Đồng bộ các link đến hạn. Lượt 1: mỗi link tối đa 40 s để ai cũng có dữ liệu mới.
 * Lượt 2: dùng thời gian còn lại để nhập tiếp các cửa sổ chưa xong.
 */
export async function runSyncBatch(
  trigger: SyncTrigger,
  deadline: number,
  staleMs: number,
  deps?: SyncDeps,
): Promise<BatchResult> {
  const now = deps?.now ?? Date.now;
  const holder = randomUUID();
  if (!(await tryLease("sync-batch", holder, deadline - now() + MIN_LEFT_MS))) {
    return { status: "busy", runs: [] };
  }
  const runs: BatchResult["runs"] = [];
  try {
    const staleBefore = new Date(now() - staleMs);
    const due = await db
      .select({ id: providerLink.id })
      .from(providerLink)
      .where(
        and(
          or(isNull(providerLink.nextAttemptAt), lte(providerLink.nextAttemptAt, sql`now()`)),
          or(
            isNotNull(providerLink.winSinceMs),
            isNull(providerLink.lastSyncAt),
            lt(providerLink.lastSyncAt, staleBefore),
          ),
        ),
      )
      .orderBy(asc(sql`${providerLink.winSinceMs} is not null`), sql`${providerLink.lastSyncAt} asc nulls first`);

    for (const { id } of due) {
      if (deadline - now() < MIN_LEFT_MS || (await leaseActive("lichess-backoff"))) break;
      runs.push({ linkId: id, outcome: await syncLink(id, trigger, Math.min(deadline, now() + PASS_ONE_MS), deps) });
    }

    const importing = due.length
      ? await db
          .select({ id: providerLink.id })
          .from(providerLink)
          .where(and(inArray(providerLink.id, due.map((d) => d.id)), isNotNull(providerLink.winSinceMs)))
      : [];
    for (const { id } of importing) {
      if (deadline - now() < MIN_LEFT_MS || (await leaseActive("lichess-backoff"))) break;
      runs.push({ linkId: id, outcome: await syncLink(id, trigger, deadline, deps) });
    }

    if (trigger === "cron") {
      await db.delete(syncRun).where(lt(syncRun.startedAt, sql`now() - interval '30 days'`));
    }
  } finally {
    await releaseLease("sync-batch", holder).catch(() => {});
  }
  return { status: "done", runs };
}
