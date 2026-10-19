import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import type { LichessProfileSnapshot } from "./types";

const tz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
/** Mốc thời gian kiểu mili-giây của Lichess (dùng cho con trỏ đồng bộ). */
const ms = (name: string) => bigint(name, { mode: "number" });
const day = (name: string) => date(name, { mode: "string" });
const count = (name: string) => integer(name).notNull().default(0);

/** Lớp 1 — tài khoản Lichess đã kết nối (mỗi user tối đa một). */
export const providerLink = pgTable(
  "provider_link",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("lichess"),
    /** id Lichess (chữ thường) từ /api/account. */
    externalId: text("external_id").notNull(),
    externalUsername: text("external_username").notNull(),
    /** "v1.<iv>.<ct>.<tag>"; null sau khi thu hồi. */
    accessTokenEnc: text("access_token_enc"),
    tokenExpiresAt: tz("token_expires_at"),
    status: text("status").notNull().default("active"),
    /** Không nhập puzzle cũ hơn mốc này (lúc kết nối − 365 ngày). */
    floorMs: ms("floor_ms").notNull(),
    /** Bất biến: mọi puzzle trong [floor, syncedTo] đã được lưu. */
    syncedToMs: ms("synced_to_ms"),
    winSinceMs: ms("win_since_ms"),
    winTopMs: ms("win_top_ms"),
    /** Điểm resume (loại trừ) của cửa sổ đang mở. */
    winBeforeMs: ms("win_before_ms"),
    feedPolledAt: tz("feed_polled_at"),
    profile: jsonb("profile").$type<LichessProfileSnapshot>(),
    profileFetchedAt: tz("profile_fetched_at"),
    lockToken: uuid("lock_token"),
    lockUntil: tz("lock_until"),
    manualSyncAt: tz("manual_sync_at"),
    lastSyncAt: tz("last_sync_at"),
    lastSuccessAt: tz("last_success_at"),
    lastError: text("last_error"),
    failCount: integer("fail_count").notNull().default(0),
    nextAttemptAt: tz("next_attempt_at"),
    linkedAt: tz("linked_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("provider_link_external_uq").on(t.provider, t.externalId),
    uniqueIndex("provider_link_user_uq").on(t.userId, t.provider),
    check("provider_link_status_ck", sql`${t.status} in ('active', 'needs_reauth')`),
  ],
);

/** Lớp 1 — từng puzzle (lần chơi đầu), kèm theme để làm thẻ chiến thuật và Boss sau này. */
export const puzzleEvent = pgTable(
  "puzzle_event",
  {
    linkId: integer("link_id")
      .notNull()
      .references(() => providerLink.id, { onDelete: "cascade" }),
    puzzleId: text("puzzle_id").notNull(),
    playedAt: tz("played_at").notNull(),
    /** Kết quả lúc ta thấy lần đầu (replay không làm đổi lịch sử). */
    win: boolean("win").notNull(),
    rating: smallint("rating"),
    themes: text("themes").array().notNull().default(sql`'{}'::text[]`),
  },
  (t) => [primaryKey({ columns: [t.linkId, t.puzzleId] })],
);

/** Lớp 1 — feed 7 ngày của Lichess (ngày UTC). Lưu vĩnh viễn vì Lichess sẽ xoá. */
export const providerDay = pgTable(
  "provider_day",
  {
    linkId: integer("link_id")
      .notNull()
      .references(() => providerLink.id, { onDelete: "cascade" }),
    day: day("day").notNull(),
    stormRuns: count("storm_runs"),
    stormBest: count("storm_best"),
    racerRuns: count("racer_runs"),
    racerBest: count("racer_best"),
    /** Chế độ Puzzle Streak (không phải streak theo ngày). */
    pstreakRuns: count("pstreak_runs"),
    pstreakBest: count("pstreak_best"),
    /** Chỉ để chẩn đoán (so với puzzle_event). */
    feedWins: count("feed_wins"),
    feedLosses: count("feed_losses"),
    raw: jsonb("raw"),
    updatedAt: tz("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.linkId, t.day] })],
);

/** Lớp 3 — dữ liệu suy ra: mỗi ngày site có hoạt động là một dòng. Tính lại được hoàn toàn. */
export const dailyStat = pgTable(
  "daily_stat",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    day: day("day").notNull(),
    solved: count("solved"),
    failed: count("failed"),
    stormRuns: count("storm_runs"),
    stormBest: count("storm_best"),
    racerRuns: count("racer_runs"),
    racerBest: count("racer_best"),
    pstreakRuns: count("pstreak_runs"),
    pstreakBest: count("pstreak_best"),
    points: count("points"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] }), index("daily_stat_day_idx").on(t.day)],
);

/** Lớp 3 — tóm tắt theo user. Streak hiện tại được tính lúc đọc từ last_run_*. */
export const userStat = pgTable("user_stat", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  xp: count("xp"),
  activeDays: count("active_days"),
  totalSolved: count("total_solved"),
  longestStreak: count("longest_streak"),
  longestStreakEnd: day("longest_streak_end"),
  lastRunLen: count("last_run_len"),
  lastRunEnd: day("last_run_end"),
  rulesVersion: integer("rules_version").notNull().default(1),
  computedAt: tz("computed_at").notNull().defaultNow(),
});

/** Nhật ký đồng bộ (log của Vercel Hobby chỉ giữ 1 giờ). Dọn bản ghi quá 30 ngày. */
export const syncRun = pgTable(
  "sync_run",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    linkId: integer("link_id").references(() => providerLink.id, { onDelete: "cascade" }),
    trigger: text("trigger").notNull(),
    startedAt: tz("started_at").notNull().defaultNow(),
    finishedAt: tz("finished_at"),
    outcome: text("outcome"),
    fetched: count("fetched"),
    inserted: count("inserted"),
    error: text("error"),
  },
  (t) => [
    index("sync_run_started_idx").on(t.startedAt),
    index("sync_run_link_idx").on(t.linkId, t.startedAt),
  ],
);

/** Khoá dùng chung: 'sync-batch', 'ping-throttle', 'lichess-backoff'. */
export const jobLease = pgTable("job_lease", {
  name: text("name").primaryKey(),
  holder: uuid("holder"),
  until: tz("until").notNull(),
});
