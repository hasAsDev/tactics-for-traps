import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { providerDay, providerLink } from "@/db/schema";
import type { LichessProfileSnapshot } from "@/db/schema/types";
import type { ActivityEntry, UserPublic } from "../lichess/schemas";
import { LostLeaseError } from "./errors";
import type { LinkRow } from "./leases";
import type { LichessPort } from "./port";

/**
 * Các endpoint public của Lichess giới hạn theo IP (15 request / 2 phút), mà IP của Vercel dùng chung.
 * Giữ khoảng cách tối thiểu giữa hai lần gọi trong cùng một instance.
 */
export const PUBLIC_CALL_GAP_MS = 9_000;
let lastPublicCall = 0;

export async function waitPublicSlot(sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))): Promise<void> {
  const wait = lastPublicCall + PUBLIC_CALL_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastPublicCall = Date.now();
}

/** Chỉ dùng trong test. */
export function resetPublicSlot(): void {
  lastPublicCall = 0;
}

export function utcDayOf(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function feedRow(linkId: number, entry: ActivityEntry) {
  return {
    linkId,
    day: utcDayOf(entry.interval.start),
    stormRuns: entry.storm?.runs ?? 0,
    stormBest: entry.storm?.score ?? 0,
    racerRuns: entry.racer?.runs ?? 0,
    racerBest: entry.racer?.score ?? 0,
    pstreakRuns: entry.streak?.runs ?? 0,
    pstreakBest: entry.streak?.score ?? 0,
    feedWins: entry.puzzles?.score.win ?? 0,
    feedLosses: entry.puzzles?.score.loss ?? 0,
    raw: entry,
  };
}

const keepMax = (column: string) => sql.raw(`greatest(provider_day.${column}, excluded.${column})`);

/** Đọc feed 7 ngày gần nhất và lưu Storm/Racer/Puzzle Streak theo ngày UTC (chỉ tăng, không giảm). */
export async function pullFeed(params: {
  link: LinkRow;
  lockToken: string;
  port: LichessPort;
  sleep?: (ms: number) => Promise<void>;
}): Promise<number> {
  await waitPublicSlot(params.sleep);
  const entries = await params.port.userActivity(params.link.externalId);
  const rows = entries.map((e) => feedRow(params.link.id, e));
  if (rows.length > 0) {
    await db
      .insert(providerDay)
      .values(rows)
      .onConflictDoUpdate({
        target: [providerDay.linkId, providerDay.day],
        set: {
          stormRuns: keepMax("storm_runs"),
          stormBest: keepMax("storm_best"),
          racerRuns: keepMax("racer_runs"),
          racerBest: keepMax("racer_best"),
          pstreakRuns: keepMax("pstreak_runs"),
          pstreakBest: keepMax("pstreak_best"),
          feedWins: keepMax("feed_wins"),
          feedLosses: keepMax("feed_losses"),
          raw: sql`excluded.raw`,
          updatedAt: sql`now()`,
        },
      });
  }
  const saved = await db
    .update(providerLink)
    .set({ feedPolledAt: sql`now()` })
    .where(and(eq(providerLink.id, params.link.id), eq(providerLink.lockToken, params.lockToken)))
    .returning({ id: providerLink.id });
  if (saved.length === 0) throw new LostLeaseError();
  return rows.length;
}

export function profileSnapshot(user: UserPublic): LichessProfileSnapshot {
  const perfs = user.perfs ?? {};
  return {
    username: user.username,
    title: user.title,
    puzzleRating: perfs.puzzle?.rating,
    puzzleGames: perfs.puzzle?.games,
    pstreakBest: perfs.streak?.score,
    pstreakRuns: perfs.streak?.runs,
    stormBest: perfs.storm?.score,
    stormRuns: perfs.storm?.runs,
    racerBest: perfs.racer?.score,
    racerRuns: perfs.racer?.runs,
  };
}

/** Làm mới ảnh chụp kỷ lục (puzzle rating, best Storm/Racer/Streak). */
export async function refreshProfile(params: {
  link: LinkRow;
  lockToken: string;
  port: LichessPort;
  sleep?: (ms: number) => Promise<void>;
}): Promise<void> {
  await waitPublicSlot(params.sleep);
  const user = await params.port.userPublic(params.link.externalId);
  const snapshot = profileSnapshot(user);
  const saved = await db
    .update(providerLink)
    .set({ profile: snapshot, profileFetchedAt: sql`now()`, externalUsername: user.username })
    .where(and(eq(providerLink.id, params.link.id), eq(providerLink.lockToken, params.lockToken)))
    .returning({ id: providerLink.id });
  if (saved.length === 0) throw new LostLeaseError();
}
