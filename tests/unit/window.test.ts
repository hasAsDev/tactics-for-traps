import { describe, expect, it } from "vitest";
import {
  checkpointBefore,
  closeWindow,
  hasOpenWindow,
  importProgress,
  OVERLAP_MS,
  openWindow,
  streamParams,
  type WindowState,
} from "@/server/sync/window";

const base: WindowState = {
  floorMs: 1_000,
  syncedToMs: null,
  winSinceMs: null,
  winTopMs: null,
  winBeforeMs: null,
};

describe("cửa sổ đồng bộ", () => {
  it("cửa sổ đầu tiên bắt đầu từ floor", () => {
    expect(openWindow(base, 50_000)).toEqual({ winSinceMs: 1_000, winTopMs: 50_000, winBeforeMs: null });
  });

  it("các cửa sổ sau chồng lấn 15 phút nhưng không lùi quá floor", () => {
    const synced = { ...base, syncedToMs: 10_000_000 };
    expect(openWindow(synced, 20_000_000).winSinceMs).toBe(10_000_000 - OVERLAP_MS);
    const nearFloor = { ...base, syncedToMs: 2_000 };
    expect(openWindow(nearFloor, 20_000_000).winSinceMs).toBe(1_000);
  });

  it("before mặc định là top + 1 (loại trừ), sau checkpoint là min + 1", () => {
    const w = openWindow(base, 50_000);
    expect(streamParams(w)).toEqual({ since: 1_000, before: 50_001 });
    const before = checkpointBefore(w, 30_000);
    expect(before).toBe(30_001);
    expect(streamParams({ ...w, winBeforeMs: before })).toEqual({ since: 1_000, before: 30_001 });
  });

  it("checkpoint không bao giờ lùi lên (before chỉ giảm)", () => {
    const w = { ...openWindow(base, 50_000), winBeforeMs: 20_001 };
    expect(checkpointBefore(w, 40_000)).toBe(20_001);
  });

  it("đóng cửa sổ: syncedTo = top", () => {
    const w = openWindow(base, 50_000);
    expect(closeWindow(w)).toEqual({ syncedToMs: 50_000, winSinceMs: null, winTopMs: null, winBeforeMs: null });
  });

  it("tiến độ nhập", () => {
    expect(importProgress(base)).toBeNull();
    const w = { ...base, ...openWindow(base, 11_000) };
    expect(hasOpenWindow(w)).toBe(true);
    expect(importProgress(w)).toBe(0);
    expect(importProgress({ ...w, winBeforeMs: 6_000 })).toBe(0.5);
    expect(importProgress({ ...w, winBeforeMs: 1_000 })).toBe(1);
  });

  it("mô phỏng nhập có gián đoạn: không sót, không trùng", () => {
    // 1.000 entry, mới → cũ, có vài nhóm cùng mili-giây; cứ 137 entry thì bị cắt một lần.
    const entries = Array.from({ length: 1000 }, (_, i) => ({ id: `p${i}`, date: 2_000 + Math.floor(i / 3) }));
    const newestFirst = [...entries].sort((a, b) => b.date - a.date);
    const stored = new Set<string>();
    let state: WindowState = { ...base };
    const now = 10_000;
    let w = openWindow(state, now);
    state = { ...state, ...w };
    let rounds = 0;
    for (;;) {
      rounds++;
      const { since, before } = streamParams(w);
      const page = newestFirst.filter((e) => e.date >= since && e.date < before);
      const cut = page.slice(0, 137);
      for (const e of cut) stored.add(e.id);
      if (cut.length === page.length) {
        state = { ...state, ...closeWindow(w) };
        break;
      }
      w = { ...w, winBeforeMs: checkpointBefore(w, Math.min(...cut.map((e) => e.date))) };
    }
    expect(stored.size).toBe(1000);
    expect(state.syncedToMs).toBe(now);
    expect(rounds).toBeGreaterThan(7);
  });
});
