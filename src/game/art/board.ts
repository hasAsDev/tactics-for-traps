import { tokenColor } from "./palette";
import { Frame } from "./raster";
import { spriteBitmap } from "./render";
import type { PaletteName, SpriteId } from "./sprites";
import {
  boardSize,
  cellOfDay,
  cellXY,
  checkerColor,
  drawBoardBase,
  drawTower,
  piecePosition,
  ROWS,
} from "./iso";

/** Quân trên đỉnh tháp theo intensity 1–6: Tốt → Mã → Tượng → Xe → Hậu → Vua (vàng). */
export const LEVEL_PIECES: readonly { sprite: SpriteId; palette: PaletteName }[] = [
  { sprite: "pawn-s", palette: "ivory" },
  { sprite: "knight-s", palette: "ivory" },
  { sprite: "bishop-s", palette: "ivory" },
  { sprite: "rook-s", palette: "ivory" },
  { sprite: "queen-s", palette: "ivory" },
  { sprite: "king-s", palette: "gold" },
];

export function levelPiece(level: number) {
  return LEVEL_PIECES[Math.max(1, Math.min(6, level)) - 1];
}

export interface HeatmapBoardModel {
  weeks: number;
  /** Chỉ số của hôm nay trong mảng ngày (0 = Thứ Hai đầu tiên của bàn). */
  todayIndex: number;
  /** Intensity 0–6 của từng ngày, độ dài weeks × 7. */
  levels: ArrayLike<number>;
}

/** Màu ô của ngày d: ô cờ nếu đã qua, màu gỗ nếu là ngày tương lai. */
export function heatmapCellColor(model: HeatmapBoardModel, i: number, j: number): number {
  const d = (i - 1) * ROWS + (j - 1);
  return d > model.todayIndex ? tokenColor("wood-800") : checkerColor(i, j);
}

/** Thứ tự vẽ từ xa đến gần (painter's algorithm): tăng dần theo i + j. */
export function backToFrontDays(weeks: number): number[] {
  const days = Array.from({ length: weeks * ROWS }, (_, d) => d);
  return days.sort((a, b) => {
    const ca = cellOfDay(a);
    const cb = cellOfDay(b);
    return ca.i + ca.j - (cb.i + cb.j) || ca.i - cb.i;
  });
}

/** Vẽ toàn bộ bàn heatmap (dùng cho ảnh tĩnh và buffer chọn ô của Phaser). */
export function renderHeatmapBoard(model: HeatmapBoardModel, withIds = false): Frame {
  const { w, h } = boardSize(model.weeks);
  const frame = new Frame(w, h, withIds);
  drawBoardBase(frame, {
    cols: model.weeks,
    rows: ROWS,
    cellColor: (i, j) => heatmapCellColor(model, i, j),
    cellId: (i, j) => {
      const d = (i - 1) * ROWS + (j - 1);
      return d <= model.todayIndex ? d : undefined;
    },
  });
  for (const d of backToFrontDays(model.weeks)) {
    const level = model.levels[d] ?? 0;
    if (d > model.todayIndex || level <= 0) continue;
    const { i, j } = cellOfDay(d);
    const { x, y } = cellXY(i, j);
    drawTower(frame, x, y, level, d);
    const piece = levelPiece(level);
    const bmp = spriteBitmap(piece.sprite, piece.palette);
    const pos = piecePosition(x, y, level, bmp.h);
    frame.blit(bmp, pos.x, pos.y, d);
  }
  return frame;
}

/** Cảnh tĩnh ở Sảnh: bàn 8×8, Mã trắng ở f7 chĩa đôi Vua h8 và Hậu d8. */
export function renderHeroScene(): Frame {
  const cols = 8;
  const rows = 8;
  const { w, h } = boardSize(cols, rows);
  const frame = new Frame(w, h);
  drawBoardBase(frame, { cols, rows, cellColor: checkerColor });
  // Ô cờ: i = cột (a = 1 … h = 8), j = 9 − hàng (hàng 8 ở phía sau).
  const square = (sq: string) => ({ i: sq.charCodeAt(0) - 96, j: 9 - Number(sq[1]) });
  const pieces: { sq: string; sprite: SpriteId; palette: PaletteName }[] = [
    { sq: "a8", sprite: "rook-s", palette: "ebony" },
    { sq: "d8", sprite: "queen-s", palette: "ebony" },
    { sq: "h8", sprite: "king-s", palette: "ebony" },
    { sq: "g7", sprite: "pawn-s", palette: "ebony" },
    { sq: "h7", sprite: "pawn-s", palette: "ebony" },
    { sq: "a7", sprite: "pawn-s", palette: "ebony" },
    { sq: "f7", sprite: "knight-s", palette: "ivory" },
    { sq: "e4", sprite: "pawn-s", palette: "ivory" },
    { sq: "f2", sprite: "pawn-s", palette: "ivory" },
    { sq: "g2", sprite: "pawn-s", palette: "ivory" },
    { sq: "e1", sprite: "rook-s", palette: "ivory" },
    { sq: "g1", sprite: "king-s", palette: "ivory" },
  ];
  pieces
    .map((p) => ({ ...p, ...square(p.sq) }))
    .sort((a, b) => a.i + a.j - (b.i + b.j))
    .forEach((p) => {
      const { x, y } = cellXY(p.i, p.j, rows);
      const bmp = spriteBitmap(p.sprite, p.palette);
      const pos = piecePosition(x, y, 0, bmp.h);
      frame.blit(bmp, pos.x, pos.y);
    });
  return frame;
}
