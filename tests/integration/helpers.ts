import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { providerLink, user } from "@/db/schema";
import { encryptToken, lichessTokenAad } from "@/server/crypto/token-cipher";
import { LichessRateLimitedError, LichessUnauthorizedError } from "@/server/lichess/client";
import type { ActivityEntry, PuzzleActivityEntry, UserPublic } from "@/server/lichess/schemas";
import type { LichessPort } from "@/server/sync/port";

export async function resetDb(): Promise<void> {
  await db.execute(sql`truncate table "user", job_lease, sync_run restart identity cascade`);
}

export async function createUser(username = `u_${randomUUID().slice(0, 8)}`): Promise<string> {
  const id = randomUUID();
  await db.insert(user).values({
    id,
    name: username,
    email: `${id}@users.invalid`,
    username,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return id;
}

export const TOKEN = "lio_test_token";

export async function createLink(userId: string, opts: { externalId?: string; floorMs?: number } = {}) {
  const externalId = opts.externalId ?? `lichess_${randomUUID().slice(0, 6)}`;
  const [row] = await db
    .insert(providerLink)
    .values({
      userId,
      externalId,
      externalUsername: externalId,
      accessTokenEnc: encryptToken(TOKEN, lichessTokenAad(externalId), process.env.TOKEN_ENCRYPTION_KEY!),
      tokenExpiresAt: new Date(Date.now() + 365 * 86_400_000),
      floorMs: opts.floorMs ?? 0,
    })
    .returning();
  return row;
}

export function puzzle(id: string, date: number, win = true, themes: string[] = ["fork"]): PuzzleActivityEntry {
  return { date, win, puzzle: { id, rating: 1500, themes } };
}

export interface FakeLichess extends LichessPort {
  /** Lịch sử puzzle (thứ tự bất kỳ); fake trả theo thứ tự mới → cũ. */
  history: PuzzleActivityEntry[];
  feed: ActivityEntry[];
  calls: { puzzles: number; feed: number; profile: number };
  /** Sau bao nhiêu entry thì đứt kết nối (lỗi mạng) ở lần gọi kế tiếp. */
  cutAfter: number | null;
  /** Mỗi entry chờ bấy nhiêu ms (để thử cắt theo ngân sách thời gian). */
  delayMs: number;
  failWith: "unauthorized" | "rate-limited" | null;
}

export function fakeLichess(): FakeLichess {
  const fake: FakeLichess = {
    history: [],
    feed: [],
    calls: { puzzles: 0, feed: 0, profile: 0 },
    cutAfter: null,
    delayMs: 0,
    failWith: null,
    async *puzzleActivity(_token, range, options = {}) {
      fake.calls.puzzles++;
      if (fake.failWith === "unauthorized") throw new LichessUnauthorizedError();
      if (fake.failWith === "rate-limited") throw new LichessRateLimitedError();
      const page = [...fake.history]
        .filter((e) => e.date >= range.since && e.date < range.before)
        .sort((a, b) => b.date - a.date);
      let sent = 0;
      for (const entry of page) {
        if (options.signal?.aborted) throw options.signal.reason;
        if (fake.cutAfter !== null && sent >= fake.cutAfter) throw new TypeError("terminated");
        if (fake.delayMs) await new Promise((r) => setTimeout(r, fake.delayMs));
        if (options.signal?.aborted) throw options.signal.reason;
        sent++;
        yield entry;
      }
    },
    async userActivity() {
      fake.calls.feed++;
      if (fake.failWith === "rate-limited") throw new LichessRateLimitedError();
      return fake.feed;
    },
    async userPublic(username: string): Promise<UserPublic> {
      fake.calls.profile++;
      return {
        id: username,
        username,
        perfs: { puzzle: { rating: 1850, games: 900 }, storm: { runs: 10, score: 41 }, streak: { runs: 4, score: 22 } },
      };
    },
  };
  return fake;
}

/** Deps cho syncLink: client giả, bỏ khoảng chờ giữa các lần gọi public. */
export function depsFor(port: LichessPort) {
  return { port, now: Date.now, sleep: async () => {} };
}
