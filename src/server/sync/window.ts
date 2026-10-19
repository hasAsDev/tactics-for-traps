/**
 * Toán con trỏ của "cửa sổ" đồng bộ puzzle (hàm thuần).
 *
 * Bất biến: mọi puzzle có floor ≤ date ≤ syncedTo đều đã được lưu.
 * Một cửa sổ [since, top] được stream từ mới đến cũ và có thể resume qua `before` (loại trừ).
 * Chỉ khi stream kết thúc sạch thì cửa sổ mới được đóng và syncedTo = top.
 */

export const OVERLAP_MS = 15 * 60_000;

export interface WindowState {
  floorMs: number;
  syncedToMs: number | null;
  winSinceMs: number | null;
  winTopMs: number | null;
  /** Điểm resume (loại trừ). null = bắt đầu từ top. */
  winBeforeMs: number | null;
}

export interface OpenWindow {
  winSinceMs: number;
  winTopMs: number;
  winBeforeMs: number | null;
}

export function hasOpenWindow(s: WindowState): boolean {
  return s.winSinceMs !== null && s.winTopMs !== null;
}

/** Mở cửa sổ mới. Lần đầu bắt đầu từ floor; các lần sau chồng lấn 15 phút để không sót. */
export function openWindow(s: WindowState, nowMs: number): OpenWindow {
  const since =
    s.syncedToMs === null ? s.floorMs : Math.max(s.floorMs, s.syncedToMs - OVERLAP_MS);
  return { winSinceMs: since, winTopMs: Math.max(nowMs, since), winBeforeMs: null };
}

/** Tham số gọi API: since (bao gồm), before (loại trừ). */
export function streamParams(w: OpenWindow): { since: number; before: number } {
  return { since: w.winSinceMs, before: w.winBeforeMs ?? w.winTopMs + 1 };
}

/**
 * Sau khi lưu một batch, lần sau chỉ cần đọc các entry cũ hơn. Dùng min + 1 vì `before` là loại trừ,
 * để nhóm entry cùng mili-giây với min được đọc lại (insert là idempotent nên không sao).
 */
export function checkpointBefore(w: OpenWindow, batchMinDateMs: number): number {
  const next = batchMinDateMs + 1;
  return w.winBeforeMs === null ? next : Math.min(w.winBeforeMs, next);
}

export interface ClosedWindow {
  syncedToMs: number;
  winSinceMs: null;
  winTopMs: null;
  winBeforeMs: null;
}

export function closeWindow(w: OpenWindow): ClosedWindow {
  return { syncedToMs: w.winTopMs, winSinceMs: null, winTopMs: null, winBeforeMs: null };
}

/** Tiến độ nhập (0–1) của cửa sổ đang mở, để hiện trên giao diện. */
export function importProgress(s: WindowState): number | null {
  if (s.winSinceMs === null || s.winTopMs === null) return null;
  const span = s.winTopMs - s.winSinceMs;
  if (span <= 0) return 1;
  const done = s.winTopMs - (s.winBeforeMs ?? s.winTopMs);
  return Math.min(1, Math.max(0, done / span));
}
