import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { dailyStat, jobLease, providerDay, providerLink, puzzleEvent, syncRun, user, userStat } from "@/db/schema";
import { leaseActive, lockLink, releaseLease, releaseLink, tryLease } from "@/server/sync/leases";
import { pullPuzzles } from "@/server/sync/puzzles";
import { recomputeUser } from "@/server/stats/recompute";
import { syncLink } from "@/server/sync/sync-link";
import { runSyncBatch } from "@/server/sync/batch";
import { createLink, createUser, depsFor, fakeLichess, puzzle, resetDb, TOKEN } from "./helpers";

const far = () => Date.now() + 120_000;

beforeEach(async () => {
  await resetDb();
});

async function linkRow(id: number) {
  const [row] = await db.select().from(providerLink).where(eq(providerLink.id, id));
  return row;
}

async function eventCount(linkId: number) {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(puzzleEvent)
    .where(eq(puzzleEvent.linkId, linkId));
  return n;
}

describe("kéo lịch sử puzzle (cửa sổ resume được)", () => {
  it("bị đứt kết nối nhiều lần vẫn nhập đủ, không sót không trùng", async () => {
    const userId = await createUser();
    const link = await createLink(userId, { floorMs: 1_000 });
    const fake = fakeLichess();
    // 1.000 puzzle, có nhóm cùng mili-giây.
    fake.history = Array.from({ length: 1000 }, (_, i) => puzzle(`p${i}`, 10_000 + Math.floor(i / 3)));
    fake.cutAfter = 137;

    let rounds = 0;
    for (;;) {
      rounds++;
      const lock = randomUUID();
      const row = await lockLink(link.id, lock, 60_000);
      expect(row).not.toBeNull();
      try {
        const res = await pullPuzzles({ link: row!, token: TOKEN, lockToken: lock, stopAt: far(), port: fake });
        expect(res.complete).toBe(true);
        break;
      } catch (error) {
        expect((error as Error).message).toBe("terminated");
      } finally {
        await releaseLink(link.id, lock);
      }
      expect(rounds).toBeLessThan(20);
    }

    expect(await eventCount(link.id)).toBe(1000);
    const after = await linkRow(link.id);
    expect(after.syncedToMs).not.toBeNull();
    expect(after.winSinceMs).toBeNull();
    expect(after.winBeforeMs).toBeNull();
    expect(rounds).toBeGreaterThan(7);
  });

  it("hết ngân sách thời gian thì để cửa sổ mở và lần sau chạy tiếp", async () => {
    const userId = await createUser();
    const link = await createLink(userId, { floorMs: 1_000 });
    const fake = fakeLichess();
    fake.history = Array.from({ length: 60 }, (_, i) => puzzle(`q${i}`, 50_000 + i * 10));
    fake.delayMs = 5;

    const lock = randomUUID();
    const row = await lockLink(link.id, lock, 60_000);
    const first = await pullPuzzles({ link: row!, token: TOKEN, lockToken: lock, stopAt: Date.now() + 80, port: fake });
    await releaseLink(link.id, lock);
    expect(first.complete).toBe(false);
    const mid = await linkRow(link.id);
    expect(mid.winSinceMs).not.toBeNull();
    expect(mid.winBeforeMs).not.toBeNull();
    expect(await eventCount(link.id)).toBeLessThan(60);

    fake.delayMs = 0;
    const lock2 = randomUUID();
    const row2 = await lockLink(link.id, lock2, 60_000);
    const second = await pullPuzzles({ link: row2!, token: TOKEN, lockToken: lock2, stopAt: far(), port: fake });
    await releaseLink(link.id, lock2);
    expect(second.complete).toBe(true);
    expect(await eventCount(link.id)).toBe(60);
  });

  it("lần sau chồng lấn 15 phút: bắt được entry đến muộn, replay không đổi kết quả đã lưu", async () => {
    const userId = await createUser();
    const now = Date.now();
    const link = await createLink(userId, { floorMs: now - 86_400_000 });
    const fake = fakeLichess();
    fake.history = [puzzle("a", now - 3_600_000, false), puzzle("b", now - 1_800_000)];
    expect(await syncLink(link.id, "manual", far(), depsFor(fake))).toBe("ok");
    expect(await eventCount(link.id)).toBe(2);

    // Replay "a" thành thắng (Lichess đổi win), và một entry ghi muộn 5 phút trước mốc đã đồng bộ.
    const synced = (await linkRow(link.id)).syncedToMs!;
    fake.history = [puzzle("a", now - 3_600_000, true), puzzle("b", now - 1_800_000), puzzle("late", synced - 5 * 60_000)];
    expect(await syncLink(link.id, "manual", far(), depsFor(fake))).toBe("ok");
    expect(await eventCount(link.id)).toBe(3);
    const [a] = await db.select().from(puzzleEvent).where(eq(puzzleEvent.puzzleId, "a"));
    expect(a.win).toBe(false);
    expect(a.themes).toEqual(["fork"]);
  });
});

describe("syncLink", () => {
  it("hai lần đồng bộ cùng lúc: một lần nhận busy", async () => {
    const userId = await createUser();
    const link = await createLink(userId);
    const fake = fakeLichess();
    fake.history = Array.from({ length: 30 }, (_, i) => puzzle(`c${i}`, Date.now() - i * 60_000));
    fake.delayMs = 3;
    const results = await Promise.all([
      syncLink(link.id, "manual", far(), depsFor(fake)),
      syncLink(link.id, "manual", far(), depsFor(fake)),
    ]);
    expect(results.sort()).toEqual(["busy", "ok"]);
  });

  it("401 → cần kết nối lại, nhưng feed công khai vẫn được đọc", async () => {
    const userId = await createUser();
    const link = await createLink(userId);
    const fake = fakeLichess();
    fake.failWith = "unauthorized";
    fake.feed = [{ interval: { start: Date.UTC(2026, 9, 18), end: Date.UTC(2026, 9, 19) }, storm: { runs: 3, score: 41 } }];
    expect(await syncLink(link.id, "cron", far(), depsFor(fake))).toBe("needs_reauth");
    const row = await linkRow(link.id);
    expect(row.status).toBe("needs_reauth");
    expect(row.lockToken).toBeNull();
    const days = await db.select().from(providerDay).where(eq(providerDay.linkId, link.id));
    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({ day: "2026-10-18", stormRuns: 3, stormBest: 41 });
  });

  it("429 → nghỉ toàn hệ thống, lần gọi kế tiếp bị bỏ qua", async () => {
    const userId = await createUser();
    const link = await createLink(userId);
    const fake = fakeLichess();
    fake.failWith = "rate-limited";
    expect(await syncLink(link.id, "cron", far(), depsFor(fake))).toBe("rate_limited");
    expect(await leaseActive("lichess-backoff")).toBe(true);
    expect(await syncLink(link.id, "cron", far(), depsFor(fake))).toBe("rate_limited");
    expect(fake.calls.puzzles).toBe(1);
  });

  it("ghi nhật ký sync_run và ảnh chụp kỷ lục", async () => {
    const userId = await createUser();
    const link = await createLink(userId);
    const fake = fakeLichess();
    fake.history = [puzzle("x", Date.now() - 1000)];
    await syncLink(link.id, "link", far(), depsFor(fake));
    const runs = await db.select().from(syncRun).where(eq(syncRun.linkId, link.id));
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ trigger: "link", outcome: "ok", fetched: 1, inserted: 1 });
    const row = await linkRow(link.id);
    expect(row.profile?.puzzleRating).toBe(1850);
    expect(row.profile?.stormBest).toBe(41);
  });
});

describe("tính lại thống kê", () => {
  it("chia ngày theo giờ Việt Nam, feed theo quy tắc 12:00 UTC, tính streak và XP", async () => {
    const userId = await createUser();
    const link = await createLink(userId);
    await db.insert(puzzleEvent).values([
      // 23:59:59 ngày 17/10 giờ VN
      { linkId: link.id, puzzleId: "n1", playedAt: new Date("2026-10-17T16:59:59Z"), win: true },
      // 00:00 ngày 18/10 giờ VN
      { linkId: link.id, puzzleId: "n2", playedAt: new Date("2026-10-17T17:00:00Z"), win: true },
      { linkId: link.id, puzzleId: "n3", playedAt: new Date("2026-10-18T03:00:00Z"), win: false },
    ]);
    await db.insert(providerDay).values({ linkId: link.id, day: "2026-10-19", stormRuns: 2, stormBest: 30 });
    await recomputeUser(userId);
    const days = await db.select().from(dailyStat).where(eq(dailyStat.userId, userId)).orderBy(dailyStat.day);
    expect(days.map((d) => [d.day, d.solved, d.failed, d.points])).toEqual([
      ["2026-10-17", 1, 0, 1],
      ["2026-10-18", 1, 1, 1],
      ["2026-10-19", 0, 0, 30],
    ]);
    const [stat] = await db.select().from(userStat).where(eq(userStat.userId, userId));
    expect(stat).toMatchObject({ xp: 32, activeDays: 3, totalSolved: 2, longestStreak: 3, lastRunLen: 3, lastRunEnd: "2026-10-19" });
  });

  it("hai lần tính lại song song không lỗi", async () => {
    const userId = await createUser();
    const link = await createLink(userId);
    await db.insert(puzzleEvent).values({ linkId: link.id, puzzleId: "z", playedAt: new Date(), win: true });
    await Promise.all([recomputeUser(userId), recomputeUser(userId), recomputeUser(userId)]);
    const days = await db.select().from(dailyStat).where(eq(dailyStat.userId, userId));
    expect(days).toHaveLength(1);
  });
});

describe("khoá và batch", () => {
  it("lease: chỉ một bên giữ, hết hạn thì bên khác lấy được", async () => {
    expect(await tryLease("sync-batch", "00000000-0000-4000-8000-000000000001", 60_000)).toBe(true);
    expect(await tryLease("sync-batch", "00000000-0000-4000-8000-000000000002", 60_000)).toBe(false);
    await db.update(jobLease).set({ until: sql`now() - interval '1 second'` });
    expect(await tryLease("sync-batch", "00000000-0000-4000-8000-000000000002", 60_000)).toBe(true);
    await releaseLease("sync-batch", "00000000-0000-4000-8000-000000000002");
    expect(await leaseActive("sync-batch")).toBe(false);
  });

  it("batch đồng bộ mọi link đến hạn; batch thứ hai cùng lúc nhận busy", async () => {
    const fake = fakeLichess();
    fake.history = [puzzle("b1", Date.now() - 1000)];
    fake.delayMs = 2;
    const u1 = await createUser();
    const u2 = await createUser();
    await createLink(u1);
    await createLink(u2);
    const [a, b] = await Promise.all([
      runSyncBatch("cron", far(), 0, depsFor(fake)),
      runSyncBatch("cron", far(), 0, depsFor(fake)),
    ]);
    const done = [a, b].find((r) => r.status === "done")!;
    expect([a.status, b.status].sort()).toEqual(["busy", "done"]);
    expect(done.runs.map((r) => r.outcome)).toEqual(["ok", "ok"]);
  });
});

describe("xoá dữ liệu", () => {
  it("xoá user thì mọi dữ liệu liên quan bị xoá theo", async () => {
    const userId = await createUser();
    const link = await createLink(userId);
    const fake = fakeLichess();
    fake.history = [puzzle("d1", Date.now() - 1000)];
    fake.feed = [{ interval: { start: Date.UTC(2026, 9, 18), end: Date.UTC(2026, 9, 19) }, racer: { runs: 1, score: 20 } }];
    await syncLink(link.id, "manual", far(), depsFor(fake));
    await db.delete(user).where(eq(user.id, userId));
    for (const table of [providerLink, puzzleEvent, providerDay, dailyStat, userStat, syncRun]) {
      const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(table);
      expect(n).toBe(0);
    }
  });
});
