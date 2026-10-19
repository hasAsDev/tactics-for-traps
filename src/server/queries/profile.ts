import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { dailyStat, providerLink, user, userStat } from "@/db/schema";
import type { LichessProfileSnapshot } from "@/db/schema/types";
import { levelProgress, pieceForLevel } from "@/game/core/progression";
import { currentStreak } from "@/game/core/streak";
import { addDays, dayNumber, isoFromDayNumber, mondayOf } from "@/game/core/time";
import { emptyBoard, type BoardDTO } from "@/game/world";
import { importProgress } from "../sync/window";

export const BOARD_WEEKS = 53;

export interface LichessInfo {
  username: string;
  url: string;
  status: "active" | "needs_reauth";
  snapshot: LichessProfileSnapshot | null;
  lastSyncAt: string | null;
  lastError: string | null;
  importProgress: number | null;
  tokenExpiresAt: string | null;
}

export interface ProfileDTO {
  id: string;
  username: string;
  name: string;
  joinedAt: string;
  lichess: LichessInfo | null;
  xp: number;
  level: number;
  pieceId: string;
  pieceName: string;
  pieceSprite: string;
  xpIntoLevel: number;
  xpForNext: number;
  currentStreak: number;
  atRisk: boolean;
  todayActive: boolean;
  longestStreak: number;
  activeDays: number;
  totalSolved: number;
  board: BoardDTO;
}

/** Thứ Hai đầu tiên của bàn 53 tuần kết thúc ở tuần chứa hôm nay. */
export function boardStart(todayIso: string, weeks = BOARD_WEEKS): string {
  return isoFromDayNumber(mondayOf(dayNumber(todayIso)) - (weeks - 1) * 7);
}

export function streakFromStat(
  stat: { lastRunLen: number; lastRunEnd: string | null; longestStreak: number } | undefined,
  todayIso: string,
) {
  return currentStreak(
    {
      longest: stat?.longestStreak ?? 0,
      longestEnd: null,
      lastRunLen: stat?.lastRunLen ?? 0,
      lastRunEnd: stat?.lastRunEnd ? dayNumber(stat.lastRunEnd) : null,
    },
    dayNumber(todayIso),
  );
}

export async function getProfile(usernameParam: string, todayIso: string): Promise<ProfileDTO | null> {
  const username = usernameParam.toLowerCase();
  const [row] = await db
    .select({ id: user.id, username: user.username, name: user.name, createdAt: user.createdAt })
    .from(user)
    .where(eq(user.username, username));
  if (!row || !row.username) return null;

  const [link] = await db.select().from(providerLink).where(eq(providerLink.userId, row.id));
  const [stat] = await db.select().from(userStat).where(eq(userStat.userId, row.id));

  const start = boardStart(todayIso);
  const todayIndex = dayNumber(todayIso) - dayNumber(start);
  const board = emptyBoard(BOARD_WEEKS, start, todayIndex);
  const days = await db
    .select()
    .from(dailyStat)
    .where(and(eq(dailyStat.userId, row.id), gte(dailyStat.day, start)));
  for (const d of days) {
    const i = dayNumber(d.day) - dayNumber(start);
    if (i < 0 || i >= board.points.length) continue;
    board.solved[i] = d.solved;
    board.failed[i] = d.failed;
    board.points[i] = d.points;
    board.pstreakRuns[i] = d.pstreakRuns;
    board.pstreakBest[i] = d.pstreakBest;
    board.stormRuns[i] = d.stormRuns;
    board.stormBest[i] = d.stormBest;
    board.racerRuns[i] = d.racerRuns;
    board.racerBest[i] = d.racerBest;
  }

  const streak = streakFromStat(stat, todayIso);
  board.atRisk = streak.atRisk;
  const progress = levelProgress(stat?.xp ?? 0);
  const piece = pieceForLevel(progress.level);

  return {
    id: row.id,
    username: row.username,
    name: row.name,
    joinedAt: row.createdAt.toISOString(),
    lichess: link
      ? {
          username: link.externalUsername,
          url: `https://lichess.org/@/${link.externalUsername}`,
          status: link.status === "needs_reauth" ? "needs_reauth" : "active",
          snapshot: link.profile ?? null,
          lastSyncAt: link.lastSuccessAt?.toISOString() ?? null,
          lastError: link.lastError,
          importProgress: importProgress(link),
          tokenExpiresAt: link.tokenExpiresAt?.toISOString() ?? null,
        }
      : null,
    xp: progress.xp,
    level: progress.level,
    pieceId: piece.id,
    pieceName: piece.name,
    pieceSprite: piece.art.src === "matrix" ? piece.art.id : "pawn-s",
    xpIntoLevel: progress.xpIntoLevel,
    xpForNext: progress.xpForNext,
    currentStreak: streak.current,
    atRisk: streak.atRisk,
    todayActive: streak.todayActive,
    longestStreak: stat?.longestStreak ?? 0,
    activeDays: stat?.activeDays ?? 0,
    totalSolved: stat?.totalSolved ?? 0,
    board,
  };
}

/** 7 ngày gần nhất (mới nhất trước) để hiện nhật ký. */
export function lastSevenDays(board: BoardDTO) {
  const out: { iso: string; index: number }[] = [];
  for (let k = 0; k < 7; k++) {
    const index = board.todayIndex - k;
    if (index < 0) break;
    out.push({ iso: addDays(board.startDate, index), index });
  }
  return out;
}

/** Trạng thái đồng bộ gọn (dùng cho /api/sync/status, không lộ dữ liệu nhạy cảm). */
export async function getSyncStatus(usernameParam: string) {
  const [row] = await db
    .select({
      status: providerLink.status,
      lockUntil: providerLink.lockUntil,
      lastSuccessAt: providerLink.lastSuccessAt,
      winSinceMs: providerLink.winSinceMs,
      winTopMs: providerLink.winTopMs,
      winBeforeMs: providerLink.winBeforeMs,
      floorMs: providerLink.floorMs,
      syncedToMs: providerLink.syncedToMs,
      syncing: sql<boolean>`${providerLink.lockUntil} is not null and ${providerLink.lockUntil} > now()`,
    })
    .from(providerLink)
    .innerJoin(user, eq(user.id, providerLink.userId))
    .where(eq(user.username, usernameParam.toLowerCase()));
  if (!row) return null;
  return {
    status: row.status,
    syncing: Boolean(row.syncing),
    importing: row.winSinceMs !== null,
    progress: importProgress(row),
    lastSyncAt: row.lastSuccessAt?.toISOString() ?? null,
  };
}
