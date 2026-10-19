/** Tổng hoạt động của một ngày site (puzzle thường + Puzzle Streak/Storm/Racer). */
export interface DayTotals {
  solved: number;
  failed: number;
  stormRuns: number;
  stormBest: number;
  racerRuns: number;
  racerBest: number;
  /** Chế độ Puzzle Streak của Lichess (không phải streak theo ngày). */
  pstreakRuns: number;
  pstreakBest: number;
}

export const EMPTY_DAY: Readonly<DayTotals> = Object.freeze({
  solved: 0,
  failed: 0,
  stormRuns: 0,
  stormBest: 0,
  racerRuns: 0,
  racerBest: 0,
  pstreakRuns: 0,
  pstreakBest: 0,
});

/** Điểm của ngày: số puzzle giải đúng + điểm cao nhất của từng chế độ chạy theo lượt. */
export function dayPoints(d: DayTotals): number {
  return d.solved + d.pstreakBest + d.stormBest + d.racerBest;
}

/** Ngày có hoạt động: có ít nhất một puzzle (đúng hay sai) hoặc một lượt chơi. */
export function isActiveDay(d: DayTotals): boolean {
  return d.solved + d.failed + d.stormRuns + d.racerRuns + d.pstreakRuns > 0;
}
