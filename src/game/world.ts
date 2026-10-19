import { dayIntensity, type Metric } from "./core/intensity";
import type { DayTotals } from "./core/points";

/**
 * Dữ liệu bàn cờ gửi từ server xuống client (dạng mảng cột cho gọn).
 * Chỉ số d = 0 là Thứ Hai đầu tiên của bàn; d = todayIndex là hôm nay.
 */
export interface BoardDTO {
  weeks: number;
  startDate: string;
  todayIndex: number;
  /** Hôm nay chưa giải nhưng đang có streak. */
  atRisk: boolean;
  solved: number[];
  failed: number[];
  points: number[];
  pstreakRuns: number[];
  pstreakBest: number[];
  stormRuns: number[];
  stormBest: number[];
  racerRuns: number[];
  racerBest: number[];
}

export function emptyBoard(weeks: number, startDate: string, todayIndex: number): BoardDTO {
  const zeros = () => new Array<number>(weeks * 7).fill(0);
  return {
    weeks,
    startDate,
    todayIndex,
    atRisk: false,
    solved: zeros(),
    failed: zeros(),
    points: zeros(),
    pstreakRuns: zeros(),
    pstreakBest: zeros(),
    stormRuns: zeros(),
    stormBest: zeros(),
    racerRuns: zeros(),
    racerBest: zeros(),
  };
}

export function dayTotalsAt(board: BoardDTO, d: number): DayTotals {
  return {
    solved: board.solved[d] ?? 0,
    failed: board.failed[d] ?? 0,
    stormRuns: board.stormRuns[d] ?? 0,
    stormBest: board.stormBest[d] ?? 0,
    racerRuns: board.racerRuns[d] ?? 0,
    racerBest: board.racerBest[d] ?? 0,
    pstreakRuns: board.pstreakRuns[d] ?? 0,
    pstreakBest: board.pstreakBest[d] ?? 0,
  };
}

/** Intensity 0–6 của từng ngày theo tab đang chọn (ngày tương lai = 0). */
export function boardLevels(board: BoardDTO, metric: Metric): Uint8Array {
  const levels = new Uint8Array(board.weeks * 7);
  for (let d = 0; d < levels.length && d <= board.todayIndex; d++) {
    levels[d] = dayIntensity(dayTotalsAt(board, d), metric);
  }
  return levels;
}

/** Cắt bàn còn `weeks` tuần gần nhất (dùng cho màn hình hẹp). */
export function sliceBoard(board: BoardDTO, weeks: number): BoardDTO {
  if (weeks >= board.weeks) return board;
  const drop = (board.weeks - weeks) * 7;
  const cut = (arr: number[]) => arr.slice(drop);
  const [y, m, dd] = board.startDate.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, dd + drop)).toISOString().slice(0, 10);
  return {
    weeks,
    startDate: start,
    todayIndex: board.todayIndex - drop,
    atRisk: board.atRisk,
    solved: cut(board.solved),
    failed: cut(board.failed),
    points: cut(board.points),
    pstreakRuns: cut(board.pstreakRuns),
    pstreakBest: cut(board.pstreakBest),
    stormRuns: cut(board.stormRuns),
    stormBest: cut(board.stormBest),
    racerRuns: cut(board.racerRuns),
    racerBest: cut(board.racerBest),
  };
}

export interface WorldState {
  board: BoardDTO;
  metric: Metric;
  selected: number | null;
  reducedMotion: boolean;
}

export interface WorldEvents {
  /** Ngày đang trỏ chuột (null khi rời bàn). `at` là toạ độ art của đỉnh ô. */
  hover?: (index: number | null, at: { x: number; y: number } | null) => void;
  select?: (index: number) => void;
  ready?: () => void;
}

/** Điều khiển thế giới Phaser từ React (không lộ kiểu Phaser ra ngoài). */
export interface WorldHandle {
  update(state: Partial<WorldState>): void;
  setZoom(zoom: number): void;
  sleep(): void;
  wake(): void;
  destroy(): void;
}
