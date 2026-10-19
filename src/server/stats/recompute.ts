import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { dailyStat, userStat } from "@/db/schema";
import { dayPoints, isActiveDay, type DayTotals } from "@/game/core/points";
import { summarizeStreaks } from "@/game/core/streak";
import { dayNumber, isoFromDayNumber, SITE_TIME_ZONE } from "@/game/core/time";
import { RULES_VERSION } from "@/game/core/version";

interface AggregateRow extends Record<string, unknown> {
  day: string;
  solved: number;
  failed: number;
  storm_runs: number;
  storm_best: number;
  racer_runs: number;
  racer_best: number;
  pstreak_runs: number;
  pstreak_best: number;
}

/**
 * Tổng hợp dữ liệu gốc của user theo ngày site:
 *  - puzzle_event: theo giờ thật, đổi sang múi giờ site.
 *  - provider_day: ngày UTC D → ngày site chứa D 12:00 UTC.
 */
async function aggregate(executor: Pick<typeof db, "execute">, userId: string): Promise<AggregateRow[]> {
  const tz = SITE_TIME_ZONE;
  const result = await executor.execute<AggregateRow>(sql`
    select
      day::text as day,
      coalesce(p.solved, 0)::int as solved,
      coalesce(p.failed, 0)::int as failed,
      coalesce(r.storm_runs, 0)::int as storm_runs,
      coalesce(r.storm_best, 0)::int as storm_best,
      coalesce(r.racer_runs, 0)::int as racer_runs,
      coalesce(r.racer_best, 0)::int as racer_best,
      coalesce(r.pstreak_runs, 0)::int as pstreak_runs,
      coalesce(r.pstreak_best, 0)::int as pstreak_best
    from (
      select (e.played_at at time zone ${tz})::date as day,
             count(*) filter (where e.win) as solved,
             count(*) filter (where not e.win) as failed
      from puzzle_event e
      join provider_link l on l.id = e.link_id
      where l.user_id = ${userId}
      group by 1
    ) p
    full join (
      select ((d.day + time '12:00') at time zone 'UTC' at time zone ${tz})::date as day,
             sum(d.storm_runs) as storm_runs, max(d.storm_best) as storm_best,
             sum(d.racer_runs) as racer_runs, max(d.racer_best) as racer_best,
             sum(d.pstreak_runs) as pstreak_runs, max(d.pstreak_best) as pstreak_best
      from provider_day d
      join provider_link l on l.id = d.link_id
      where l.user_id = ${userId}
      group by 1
    ) r using (day)
    order by day
  `);
  return result.rows;
}

function toTotals(row: AggregateRow): DayTotals {
  return {
    solved: row.solved,
    failed: row.failed,
    stormRuns: row.storm_runs,
    stormBest: row.storm_best,
    racerRuns: row.racer_runs,
    racerBest: row.racer_best,
    pstreakRuns: row.pstreak_runs,
    pstreakBest: row.pstreak_best,
  };
}

export interface RecomputeResult {
  activeDays: number;
  xp: number;
}

/**
 * Tính lại toàn bộ daily_stat + user_stat của một user trong một transaction.
 * Khoá advisory theo user để hai lần tính lại song song không giẫm lên nhau.
 */
export async function recomputeUser(userId: string): Promise<RecomputeResult> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`recompute:${userId}`}))`);
    const rows = await aggregate(tx, userId);
    const active = rows
      .map((row) => ({ day: row.day, totals: toTotals(row) }))
      .filter((d) => isActiveDay(d.totals));

    await tx.delete(dailyStat).where(eq(dailyStat.userId, userId));
    const values = active.map(({ day, totals }) => ({ userId, day, ...totals, points: dayPoints(totals) }));
    for (let i = 0; i < values.length; i += 500) {
      await tx.insert(dailyStat).values(values.slice(i, i + 500));
    }

    const streak = summarizeStreaks(active.map((d) => dayNumber(d.day)));
    const xp = values.reduce((sum, v) => sum + v.points, 0);
    const stat = {
      xp,
      activeDays: values.length,
      totalSolved: values.reduce((sum, v) => sum + v.solved, 0),
      longestStreak: streak.longest,
      longestStreakEnd: streak.longestEnd === null ? null : isoFromDayNumber(streak.longestEnd),
      lastRunLen: streak.lastRunLen,
      lastRunEnd: streak.lastRunEnd === null ? null : isoFromDayNumber(streak.lastRunEnd),
      rulesVersion: RULES_VERSION,
      computedAt: new Date(),
    };
    await tx
      .insert(userStat)
      .values({ userId, ...stat })
      .onConflictDoUpdate({ target: userStat.userId, set: stat });
    return { activeDays: values.length, xp };
  });
}
