import { describe, expect, it } from "vitest";
import { dayIntensity, intensityOf } from "@/game/core/intensity";
import { dayPoints, EMPTY_DAY, isActiveDay } from "@/game/core/points";
import { levelFromXp, levelProgress, pieceForLevel, xpForLevel } from "@/game/core/progression";
import { currentStreak, summarizeStreaks } from "@/game/core/streak";
import {
  addDays,
  dayNumber,
  isoFromDayNumber,
  mondayOf,
  siteDateOf,
  siteDateOfUtcDay,
  weekdayMon0,
} from "@/game/core/time";

const day = (patch: Partial<typeof EMPTY_DAY>) => ({ ...EMPTY_DAY, ...patch });

describe("điểm và ngày hoạt động", () => {
  it("cộng puzzle đúng với điểm cao nhất của các chế độ", () => {
    expect(dayPoints(day({ solved: 10, failed: 3, pstreakBest: 12, stormBest: 30, racerBest: 5 }))).toBe(57);
  });

  it("ngày chỉ có puzzle sai hoặc lượt chơi 0 điểm vẫn là ngày hoạt động", () => {
    expect(isActiveDay(day({ failed: 1 }))).toBe(true);
    expect(isActiveDay(day({ stormRuns: 1 }))).toBe(true);
    expect(isActiveDay(EMPTY_DAY)).toBe(false);
  });
});

describe("intensity", () => {
  it.each([
    [1, 1],
    [4, 1],
    [5, 2],
    [14, 2],
    [15, 3],
    [29, 3],
    [30, 4],
    [49, 4],
    [50, 5],
    [79, 5],
    [80, 6],
    [500, 6],
  ])("tab Tổng: %i điểm → intensity %i", (points, expected) => {
    expect(intensityOf(points, true, "total")).toBe(expected);
  });

  it("không hoạt động → 0; hoạt động nhưng 0 điểm → 1", () => {
    expect(intensityOf(0, false, "total")).toBe(0);
    expect(dayIntensity(day({ failed: 2 }), "total")).toBe(1);
    expect(dayIntensity(day({ failed: 2 }), "puzzle")).toBe(1);
    expect(dayIntensity(day({ failed: 2 }), "storm")).toBe(0);
  });

  it("mỗi tab dùng giá trị của chế độ đó", () => {
    const d = day({ solved: 25, stormRuns: 2, stormBest: 41 });
    expect(dayIntensity(d, "puzzle")).toBe(6);
    expect(dayIntensity(d, "storm")).toBe(5);
    expect(dayIntensity(d, "racer")).toBe(0);
  });
});

describe("level và quân cờ", () => {
  it.each([
    [0, 1],
    [19, 1],
    [20, 2],
    [79, 2],
    [80, 3],
    [180, 4],
  ])("%i XP → level %i", (xp, level) => {
    expect(levelFromXp(xp)).toBe(level);
  });

  it("xpForLevel là nghịch đảo của levelFromXp", () => {
    for (let level = 1; level < 60; level++) {
      expect(levelFromXp(xpForLevel(level))).toBe(level);
      expect(levelFromXp(xpForLevel(level + 1) - 1)).toBe(level);
    }
  });

  it("tiến độ trong level", () => {
    expect(levelProgress(100)).toMatchObject({ level: 3, xpIntoLevel: 20, xpForNext: 100 });
  });

  it.each([
    [1, "piece.pawn"],
    [4, "piece.pawn"],
    [5, "piece.knight"],
    [10, "piece.bishop"],
    [15, "piece.rook"],
    [29, "piece.queen"],
    [30, "piece.king"],
    [99, "piece.king"],
  ])("level %i → %s", (level, id) => {
    expect(pieceForLevel(level).id).toBe(id);
  });
});

describe("streak", () => {
  const today = dayNumber("2026-10-19");

  it("chưa có ngày nào", () => {
    const s = summarizeStreaks([]);
    expect(s).toEqual({ longest: 0, longestEnd: null, lastRunLen: 0, lastRunEnd: null });
    expect(currentStreak(s, today)).toEqual({ current: 0, atRisk: false, todayActive: false });
  });

  it("chuỗi dài nhất và chuỗi gần nhất là hai chuỗi khác nhau", () => {
    const s = summarizeStreaks([1, 2, 3, 4, 10, 11, 4, 2]);
    expect(s).toEqual({ longest: 4, longestEnd: 4, lastRunLen: 2, lastRunEnd: 11 });
  });

  it("hôm nay đã giải → giữ streak", () => {
    const s = summarizeStreaks([today - 2, today - 1, today]);
    expect(currentStreak(s, today)).toEqual({ current: 3, atRisk: false, todayActive: true });
  });

  it("hôm nay chưa giải nhưng hôm qua có → sắp mất streak", () => {
    const s = summarizeStreaks([today - 2, today - 1]);
    expect(currentStreak(s, today)).toEqual({ current: 2, atRisk: true, todayActive: false });
  });

  it("lỡ một ngày → mất streak", () => {
    const s = summarizeStreaks([today - 3, today - 2]);
    expect(currentStreak(s, today).current).toBe(0);
  });
});

describe("ngày của site (giờ Việt Nam)", () => {
  it("nửa đêm giờ VN là 17:00 UTC", () => {
    expect(siteDateOf(new Date("2026-10-18T16:59:59.999Z"))).toBe("2026-10-18");
    expect(siteDateOf(new Date("2026-10-18T17:00:00.000Z"))).toBe("2026-10-19");
  });

  it("ngày UTC của feed rơi vào cùng ngày VN (quy tắc 12:00 UTC)", () => {
    expect(siteDateOfUtcDay("2026-10-19")).toBe("2026-10-19");
    expect(siteDateOfUtcDay("2026-12-31")).toBe("2026-12-31");
  });

  it("số thứ tự ngày và thứ trong tuần", () => {
    expect(dayNumber("1970-01-01")).toBe(0);
    expect(isoFromDayNumber(dayNumber("2026-10-19"))).toBe("2026-10-19");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
    // 19/10/2026 là Thứ Hai
    expect(weekdayMon0(dayNumber("2026-10-19"))).toBe(0);
    expect(weekdayMon0(dayNumber("2026-10-25"))).toBe(6);
    expect(isoFromDayNumber(mondayOf(dayNumber("2026-10-22")))).toBe("2026-10-19");
  });
});
