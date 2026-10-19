import type { Metric } from "@/game/core/intensity";
import { THRESHOLDS } from "@/game/core/intensity";
import { addDays } from "@/game/core/time";
import { dayTotalsAt, type BoardDTO } from "@/game/world";
import { dayLabel, formatNumber } from "@/lib/format";

export const METRIC_LABELS: Record<Metric, string> = {
  total: "Tổng",
  puzzle: "Puzzle",
  pstreak: "Puzzle Streak",
  storm: "Storm",
  racer: "Racer",
};

export function dateOf(board: BoardDTO, index: number): string {
  return addDays(board.startDate, index);
}

/** Các dòng mô tả một ngày (dùng cho tooltip, DayCard và aria-label). */
export function describeDay(board: BoardDTO, index: number, todayIso: string) {
  const t = dayTotalsAt(board, index);
  const iso = dateOf(board, index);
  const lines: string[] = [];
  if (t.solved + t.failed > 0) lines.push(`Đúng ${formatNumber(t.solved)} · Sai ${formatNumber(t.failed)}`);
  if (t.pstreakRuns > 0) lines.push(`Puzzle Streak ${t.pstreakBest} · ${t.pstreakRuns} lượt`);
  if (t.stormRuns > 0) lines.push(`Storm ${t.stormBest} · ${t.stormRuns} lượt`);
  if (t.racerRuns > 0) lines.push(`Racer ${t.racerBest} · ${t.racerRuns} lượt`);
  const points = board.points[index] ?? 0;
  return {
    iso,
    title: dayLabel(iso, todayIso),
    points,
    lines,
    empty: lines.length === 0,
    isToday: iso === todayIso,
  };
}

export function bigValue(board: BoardDTO, index: number, metric: Metric): string {
  const t = dayTotalsAt(board, index);
  switch (metric) {
    case "total":
      return `${formatNumber(board.points[index] ?? 0)} điểm`;
    case "puzzle":
      return `${formatNumber(t.solved)} câu đúng`;
    case "pstreak":
      return `Kỷ lục ${t.pstreakBest}`;
    case "storm":
      return `Kỷ lục ${t.stormBest}`;
    case "racer":
      return `Kỷ lục ${t.racerBest}`;
  }
}

/** Nhãn khoảng của từng intensity, ví dụ ["1–4", "5–14", …, "80+"]. */
export function legendRanges(metric: Metric): string[] {
  const t = THRESHOLDS[metric];
  const starts = [1, ...t];
  return starts.map((start, i) => (i === starts.length - 1 ? `${start}+` : `${start}–${starts[i + 1] - 1}`));
}
