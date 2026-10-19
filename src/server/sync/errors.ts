/** Khoá của link đã bị lấy mất (hết hạn hoặc link bị xoá giữa chừng). */
export class LostLeaseError extends Error {
  constructor() {
    super("Mất khoá đồng bộ");
    this.name = "LostLeaseError";
  }
}

/** Dừng stream vì hết ngân sách thời gian của lần chạy (không phải lỗi). */
export class BudgetExceededError extends Error {
  constructor() {
    super("Hết ngân sách thời gian");
    this.name = "BudgetExceededError";
  }
}

export function shortError(error: unknown): string {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return text.slice(0, 300);
}
