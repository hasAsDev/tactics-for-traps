import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { providerLink, syncRun } from "@/db/schema";
import { decryptToken, lichessTokenAad } from "../crypto/token-cipher";
import { LichessRateLimitedError, LichessUnauthorizedError } from "../lichess/client";
import { recomputeUser } from "../stats/recompute";
import { LostLeaseError, shortError } from "./errors";
import { pullFeed, refreshProfile } from "./feed";
import { leaseActive, lockLink, releaseLink, setLichessBackoff, type LinkRow } from "./leases";
import { lichessPort, type LichessPort } from "./port";
import { pullPuzzles } from "./puzzles";

export type SyncTrigger = "link" | "manual" | "ping" | "cron";
export type SyncOutcome =
  | "ok"
  | "partial"
  | "busy"
  | "skipped"
  | "needs_reauth"
  | "rate_limited"
  | "lost"
  | "error";

const FEED_EVERY_MS = 30 * 60_000;
const PROFILE_EVERY_MS = 6 * 60 * 60_000;
const MIN_RUN_MS = 30_000;
const STREAM_RESERVE_MS = 20_000;

export interface SyncDeps {
  port: LichessPort;
  now: () => number;
  sleep?: (ms: number) => Promise<void>;
  tokenKey?: string;
}

const defaultDeps = (): SyncDeps => ({ port: lichessPort, now: Date.now });

function due(at: Date | null, everyMs: number, now: number): boolean {
  return !at || now - at.getTime() >= everyMs;
}

function backoffMs(failCount: number): number {
  return Math.min(5 * 60_000 * 2 ** Math.max(0, failCount - 1), 6 * 60 * 60_000);
}

/**
 * Đồng bộ một tài khoản Lichess: khoá → kéo puzzle (cửa sổ resume được) → feed → kỷ lục
 * → tính lại thống kê → nhả khoá. Không bao giờ ném lỗi ra ngoài; kết quả ghi vào sync_run.
 */
export async function syncLink(
  linkId: number,
  trigger: SyncTrigger,
  deadline: number,
  deps: SyncDeps = defaultDeps(),
): Promise<SyncOutcome> {
  const { port, now } = deps;
  if (deadline - now() < MIN_RUN_MS) return "skipped";
  if (await leaseActive("lichess-backoff")) return "rate_limited";

  const lockToken = randomUUID();
  const link = await lockLink(linkId, lockToken, deadline - now() + MIN_RUN_MS);
  if (!link) return "busy";

  const [run] = await db.insert(syncRun).values({ linkId, trigger }).returning({ id: syncRun.id });
  let outcome: SyncOutcome = "ok";
  let fetched = 0;
  let inserted = 0;
  let errorText: string | null = null;
  const own = and(eq(providerLink.id, linkId), eq(providerLink.lockToken, lockToken));

  const pullPublic = async (current: LinkRow) => {
    const force = trigger === "link" || trigger === "manual";
    if ((force || due(current.feedPolledAt, FEED_EVERY_MS, now())) && deadline - now() > 15_000) {
      await pullFeed({ link: current, lockToken, port, sleep: deps.sleep });
    }
    if ((force || due(current.profileFetchedAt, PROFILE_EVERY_MS, now())) && deadline - now() > 15_000) {
      await refreshProfile({ link: current, lockToken, port, sleep: deps.sleep });
    }
  };

  try {
    if (link.status === "active" && link.accessTokenEnc) {
      const key = deps.tokenKey ?? process.env.TOKEN_ENCRYPTION_KEY ?? "";
      const token = decryptToken(link.accessTokenEnc, lichessTokenAad(link.externalId), key);
      const result = await pullPuzzles({ link, token, lockToken, stopAt: deadline - STREAM_RESERVE_MS, port, now });
      fetched = result.fetched;
      inserted = result.inserted;
      if (!result.complete) outcome = "partial";
    }
    await pullPublic(link);
    await recomputeUser(link.userId);
    await db
      .update(providerLink)
      .set({
        lastSyncAt: sql`now()`,
        lastSuccessAt: sql`now()`,
        lastError: null,
        failCount: 0,
        nextAttemptAt: null,
      })
      .where(own);
  } catch (error) {
    if (error instanceof LichessUnauthorizedError) {
      outcome = "needs_reauth";
      await db
        .update(providerLink)
        .set({ status: "needs_reauth", lastSyncAt: sql`now()`, lastError: "Lichess từ chối token (401)" })
        .where(own);
      // Token chết nhưng feed công khai vẫn đọc được: giữ dữ liệu Storm/Racer/Streak không bị mất.
      try {
        await pullPublic(link);
      } catch {
        // bỏ qua
      }
      await recomputeUser(link.userId).catch(() => {});
    } else if (error instanceof LichessRateLimitedError) {
      outcome = "rate_limited";
      await setLichessBackoff().catch(() => {});
      await recomputeUser(link.userId).catch(() => {});
    } else if (error instanceof LostLeaseError) {
      outcome = "lost";
    } else {
      outcome = "error";
      errorText = shortError(error);
      const failCount = link.failCount + 1;
      await db
        .update(providerLink)
        .set({
          lastSyncAt: sql`now()`,
          lastError: errorText,
          failCount,
          nextAttemptAt: new Date(now() + backoffMs(failCount)),
        })
        .where(own)
        .catch(() => {});
      await recomputeUser(link.userId).catch(() => {});
    }
  } finally {
    await releaseLink(linkId, lockToken).catch(() => {});
    await db
      .update(syncRun)
      .set({ finishedAt: sql`now()`, outcome, fetched, inserted, error: errorText })
      .where(eq(syncRun.id, run.id))
      .catch(() => {});
  }
  return outcome;
}
