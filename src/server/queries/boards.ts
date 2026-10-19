import "server-only";
import { and, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { dailyStat, providerLink, user, userStat } from "@/db/schema";
import { dayIntensity } from "@/game/core/intensity";
import { EMPTY_DAY } from "@/game/core/points";
import { levelFromXp, pieceForLevel } from "@/game/core/progression";
import { addDays, dayNumber } from "@/game/core/time";
import { streakFromStat } from "./profile";

export interface MemberRow {
  username: string;
  name: string;
  level: number;
  pieceName: string;
  pieceSprite: string;
  xp: number;
  currentStreak: number;
  atRisk: boolean;
  longestStreak: number;
  today: { points: number; solved: number; failed: number; active: boolean };
  weekPoints: number;
  /** Intensity (tab Tổng) của 84 ngày gần nhất, cũ → mới. */
  recent: number[];
}

const RECENT_DAYS = 84;

/** Mọi thành viên đã kết nối Lichess kèm số liệu cho Sảnh và Bảng xếp hạng. */
export async function getMembers(todayIso: string): Promise<MemberRow[]> {
  const members = await db
    .select({ id: user.id, username: user.username, name: user.name })
    .from(user)
    .innerJoin(providerLink, eq(providerLink.userId, user.id));
  if (members.length === 0) return [];
  const ids = members.map((m) => m.id);
  const stats = await db.select().from(userStat).where(inArray(userStat.userId, ids));
  const from = addDays(todayIso, -(RECENT_DAYS - 1));
  const days = await db
    .select()
    .from(dailyStat)
    .where(and(inArray(dailyStat.userId, ids), gte(dailyStat.day, from)));

  const today = dayNumber(todayIso);
  const statBy = new Map(stats.map((s) => [s.userId, s]));
  const daysBy = new Map<string, typeof days>();
  for (const d of days) daysBy.set(d.userId, [...(daysBy.get(d.userId) ?? []), d]);

  return members
    .filter((m) => m.username)
    .map((m) => {
      const stat = statBy.get(m.id);
      const mine = daysBy.get(m.id) ?? [];
      const recent = new Array<number>(RECENT_DAYS).fill(0);
      let weekPoints = 0;
      let todayRow = { points: 0, solved: 0, failed: 0, active: false };
      for (const d of mine) {
        const age = today - dayNumber(d.day);
        if (age < 0 || age >= RECENT_DAYS) continue;
        recent[RECENT_DAYS - 1 - age] = dayIntensity({ ...EMPTY_DAY, ...d }, "total");
        if (age < 7) weekPoints += d.points;
        if (age === 0) todayRow = { points: d.points, solved: d.solved, failed: d.failed, active: true };
      }
      const streak = streakFromStat(stat, todayIso);
      const level = levelFromXp(stat?.xp ?? 0);
      const piece = pieceForLevel(level);
      return {
        username: m.username!,
        name: m.name,
        level,
        pieceName: piece.name,
        pieceSprite: piece.art.src === "matrix" ? piece.art.id : "pawn-s",
        xp: stat?.xp ?? 0,
        currentStreak: streak.current,
        atRisk: streak.atRisk,
        longestStreak: stat?.longestStreak ?? 0,
        today: todayRow,
        weekPoints,
        recent,
      };
    });
}

export type LeaderboardTab = "streak" | "week" | "xp";

export function sortMembers(rows: MemberRow[], tab: LeaderboardTab): MemberRow[] {
  const key = (r: MemberRow) =>
    tab === "streak" ? [r.currentStreak, r.weekPoints, r.xp] : tab === "week" ? [r.weekPoints, r.currentStreak, r.xp] : [r.xp, r.currentStreak, r.weekPoints];
  return [...rows].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return kb[i] - ka[i];
    return a.name.localeCompare(b.name, "vi");
  });
}

/** Thứ tự ở khung "Hôm nay": đã giải (điểm giảm dần) → sắp mất streak → còn lại. */
export function sortForToday(rows: MemberRow[]): MemberRow[] {
  const group = (r: MemberRow) => (r.today.active ? 0 : r.atRisk ? 1 : 2);
  return [...rows].sort(
    (a, b) =>
      group(a) - group(b) ||
      b.today.points - a.today.points ||
      b.currentStreak - a.currentStreak ||
      a.name.localeCompare(b.name, "vi"),
  );
}

export async function getLinkStatus(userId: string) {
  const [link] = await db
    .select({ status: providerLink.status, externalUsername: providerLink.externalUsername })
    .from(providerLink)
    .where(eq(providerLink.userId, userId));
  return link ?? null;
}
