import { dayNumber, weekdayMon0 } from "@/game/core/time";

/** Định dạng kiểu Việt Nam: 5.230, 14/10/2026, Thứ Ba… */

const numberFmt = new Intl.NumberFormat("vi-VN");

export function formatNumber(n: number): string {
  return numberFmt.format(n);
}

export const WEEKDAYS = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"] as const;
export const WEEKDAYS_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

/** "2026-10-14" → "14/10/2026". */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** "2026-10-14" → "14/10". */
export function formatShortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function weekdayName(iso: string): string {
  return WEEKDAYS[weekdayMon0(dayNumber(iso))];
}

/** "Hôm nay, 14/10/2026" / "Hôm qua, …" / "Thứ Ba, 14/10/2026". */
export function dayLabel(iso: string, todayIso: string): string {
  const diff = dayNumber(todayIso) - dayNumber(iso);
  const prefix = diff === 0 ? "Hôm nay" : diff === 1 ? "Hôm qua" : weekdayName(iso);
  return `${prefix}, ${formatDate(iso)}`;
}

export function monthLabel(month: number): string {
  return `Thg ${month}`;
}

const relativeFmt = new Intl.RelativeTimeFormat("vi", { numeric: "auto" });

/** "vừa xong", "5 phút trước", "hôm qua"… (chỉ gọi phía client, trong effect). */
export function formatRelative(from: Date | number, now: number): string {
  const diffSec = Math.round((new Date(from).getTime() - now) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 45) return "vừa xong";
  if (abs < 3600) return relativeFmt.format(Math.round(diffSec / 60), "minute");
  if (abs < 86_400) return relativeFmt.format(Math.round(diffSec / 3600), "hour");
  return relativeFmt.format(Math.round(diffSec / 86_400), "day");
}
