import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { jobLease, providerLink } from "@/db/schema";

/**
 * Khoá dùng chung, mỗi khoá là MỘT câu SQL (an toàn với PgBouncer transaction mode).
 *  - 'sync-batch'     : chỉ một batch đồng bộ chạy tại một thời điểm (kể cả khi cron chạy trùng).
 *  - 'ping-throttle'  : mỗi 10 phút tối đa một batch do người dùng vào web kích hoạt.
 *  - 'lichess-backoff': gặp 429 thì nghỉ 60 s cho toàn hệ thống.
 */
export type LeaseName = "sync-batch" | "ping-throttle" | "lichess-backoff";

const secs = (ms: number) => sql`make_interval(secs => ${Math.max(0, ms) / 1000}::double precision)`;

/** Lấy khoá nếu còn trống hoặc đã hết hạn. */
export async function tryLease(name: LeaseName, holder: string, ttlMs: number): Promise<boolean> {
  const rows = await db
    .insert(jobLease)
    .values({ name, holder, until: sql`now() + ${secs(ttlMs)}` })
    .onConflictDoUpdate({
      target: jobLease.name,
      set: { holder, until: sql`now() + ${secs(ttlMs)}` },
      setWhere: lt(jobLease.until, sql`now()`),
    })
    .returning({ holder: jobLease.holder });
  return rows.length > 0 && rows[0].holder === holder;
}

export async function releaseLease(name: LeaseName, holder: string): Promise<void> {
  await db.delete(jobLease).where(and(eq(jobLease.name, name), eq(jobLease.holder, holder)));
}

export async function leaseActive(name: LeaseName): Promise<boolean> {
  const rows = await db
    .select({ name: jobLease.name })
    .from(jobLease)
    .where(and(eq(jobLease.name, name), sql`${jobLease.until} > now()`));
  return rows.length > 0;
}

/** Đặt (hoặc kéo dài) thời gian nghỉ sau khi Lichess trả 429. */
export async function setLichessBackoff(ms = 60_000): Promise<void> {
  await db
    .insert(jobLease)
    .values({ name: "lichess-backoff", holder: null, until: sql`now() + ${secs(ms)}` })
    .onConflictDoUpdate({
      target: jobLease.name,
      set: { until: sql`greatest(${jobLease.until}, now() + ${secs(ms)})` },
    });
}

export type LinkRow = typeof providerLink.$inferSelect;

/** Khoá một link để đồng bộ. Trả về dòng link nếu lấy được khoá, null nếu đang có lần chạy khác. */
export async function lockLink(linkId: number, lockToken: string, leaseMs: number): Promise<LinkRow | null> {
  const rows = await db
    .update(providerLink)
    .set({ lockToken, lockUntil: sql`now() + ${secs(leaseMs)}` })
    .where(
      and(
        eq(providerLink.id, linkId),
        or(isNull(providerLink.lockUntil), lt(providerLink.lockUntil, sql`now()`)),
      ),
    )
    .returning();
  return rows[0] ?? null;
}

export async function releaseLink(linkId: number, lockToken: string): Promise<void> {
  await db
    .update(providerLink)
    .set({ lockToken: null, lockUntil: null })
    .where(and(eq(providerLink.id, linkId), eq(providerLink.lockToken, lockToken)));
}
