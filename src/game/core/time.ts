/**
 * Ngày của site. Cả nhóm dùng chung một múi giờ nên "hôm nay" giống nhau với mọi người.
 * Ngày được biểu diễn bằng chuỗi ISO "YYYY-MM-DD" hoặc số thứ tự ngày (số ngày kể từ 1970-01-01),
 * nên mọi phép cộng/trừ ngày đều là số nguyên, không dính DST.
 */
export const SITE_TIME_ZONE = "Asia/Ho_Chi_Minh";

const DAY_MS = 86_400_000;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** Ngày (theo múi giờ của site) chứa thời điểm này, dạng "YYYY-MM-DD". */
export function siteDateOf(instant: Date | number, timeZone = SITE_TIME_ZONE): string {
  const parts = formatterFor(timeZone).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Số thứ tự ngày của một ngày lịch ISO (1970-01-01 = 0). */
export function dayNumber(iso: string): number {
  const m = ISO_RE.exec(iso);
  if (!m) throw new Error(`Ngày không hợp lệ: ${iso}`);
  return Math.round(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY_MS);
}

/** Ngược lại với dayNumber. */
export function isoFromDayNumber(n: number): string {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return isoFromDayNumber(dayNumber(iso) + days);
}

/** Thứ trong tuần, Thứ Hai = 0 … Chủ Nhật = 6 (tuần kiểu Việt Nam). 1970-01-01 là Thứ Năm. */
export function weekdayMon0(day: number): number {
  return (((day + 3) % 7) + 7) % 7;
}

/** Số thứ tự của Thứ Hai đầu tuần chứa ngày này. */
export function mondayOf(day: number): number {
  return day - weekdayMon0(day);
}

/**
 * Feed của Lichess tính theo ngày UTC. Ngày UTC D được gán vào ngày site chứa lúc D 12:00 UTC
 * (với UTC+7 là cùng ngày D).
 */
export function siteDateOfUtcDay(utcIso: string, timeZone = SITE_TIME_ZONE): string {
  return siteDateOf(new Date(`${utcIso}T12:00:00Z`), timeZone);
}
