import { getDeadline } from "@vercel/functions";

/** Chừa 10 s trước hạn chót của function. */
export const SAFETY_MS = 10_000;
/** Hobby + Fluid compute: tối đa 300 s. */
export const MAX_DURATION_MS = 300_000;

/**
 * Hạn chót (ms) của lần gọi hiện tại. Đọc ngay đầu request rồi truyền vào after(),
 * vì công việc chạy nền dùng chung thời gian của function.
 */
export function requestDeadline(startedAt = Date.now()): number {
  let deadline: Date | undefined;
  try {
    deadline = getDeadline();
  } catch {
    deadline = undefined;
  }
  return (deadline ? deadline.getTime() : startedAt + MAX_DURATION_MS) - SAFETY_MS;
}
