/** Tóm tắt các chuỗi ngày hoạt động liên tiếp, lưu trong user_stat. */
export interface StreakSummary {
  longest: number;
  /** Số thứ tự ngày cuối của chuỗi dài nhất (null nếu chưa có). */
  longestEnd: number | null;
  /** Độ dài chuỗi gần nhất. */
  lastRunLen: number;
  lastRunEnd: number | null;
}

export const EMPTY_STREAK: Readonly<StreakSummary> = Object.freeze({
  longest: 0,
  longestEnd: null,
  lastRunLen: 0,
  lastRunEnd: null,
});

/** @param activeDays số thứ tự các ngày có hoạt động (thứ tự bất kỳ, có thể trùng). */
export function summarizeStreaks(activeDays: Iterable<number>): StreakSummary {
  const days = [...new Set(activeDays)].sort((a, b) => a - b);
  if (days.length === 0) return { ...EMPTY_STREAK };
  let longest = 0;
  let longestEnd: number | null = null;
  let runLen = 0;
  let prev: number | null = null;
  for (const day of days) {
    runLen = prev !== null && day === prev + 1 ? runLen + 1 : 1;
    if (runLen >= longest) {
      longest = runLen;
      longestEnd = day;
    }
    prev = day;
  }
  return { longest, longestEnd, lastRunLen: runLen, lastRunEnd: prev };
}

export interface CurrentStreak {
  current: number;
  /** Hôm nay chưa giải nhưng hôm qua có: giải trước 24:00 để giữ streak. */
  atRisk: boolean;
  todayActive: boolean;
}

export function currentStreak(summary: StreakSummary, today: number): CurrentStreak {
  const end = summary.lastRunEnd;
  if (end === null) return { current: 0, atRisk: false, todayActive: false };
  if (end >= today) return { current: summary.lastRunLen, atRisk: false, todayActive: true };
  if (end === today - 1) return { current: summary.lastRunLen, atRisk: true, todayActive: false };
  return { current: 0, atRisk: false, todayActive: false };
}
