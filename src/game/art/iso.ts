import { tokenColor, HEAT_TOKENS } from "./palette";
import { Frame } from "./raster";

/**
 * Hình học bàn cờ isometric (đơn vị: điểm ảnh art).
 * Ô kim cương 16×8 (2:1). Tuần chạy xuống phải (i), thứ trong tuần chạy xuống trái (j, T2 = 1 … CN = 7),
 * nên ngày mới nhất nằm phía trước và không bị tháp của ngày cũ che.
 * Lưới có thêm 1 vòng khung gỗ: i ∈ [0, C+1], j ∈ [0, R+1].
 */
export const TW = 16;
export const TH = 8;
export const HW = 8;
export const HH = 4;
/** Chiều cao một khối tháp. */
export const BLOCK = 4;
/** Độ dày bệ bàn cờ. */
export const SLAB = 6;
/** Khoảng trống phía trên cho tháp cao nhất + quân Vua. */
export const TOP = 32;
export const ROWS = 7;

export interface BoardSize {
  w: number;
  h: number;
}

export function boardSize(weeks: number, rows = ROWS): BoardSize {
  return {
    w: (weeks + rows + 2) * HW + TW,
    h: TOP + (weeks + rows + 2) * HH + TH + SLAB + 2,
  };
}

/** Góc trên-trái của hộp 16×8 chứa ô (i, j). */
export function cellXY(i: number, j: number, rows = ROWS): { x: number; y: number } {
  return { x: (rows + 1 - j + i) * HW, y: TOP + (i + j) * HH };
}

/** Ô của ngày thứ d (0 = Thứ Hai đầu tiên của bàn). */
export function cellOfDay(d: number): { i: number; j: number } {
  return { i: Math.floor(d / 7) + 1, j: (d % 7) + 1 };
}

/** Nửa bề rộng của hàng r (0–7) trong ô kim cương; hàng phủ x ∈ [8 − half, 7 + half]. */
export function diamondHalf(r: number): number {
  return r < 4 ? 2 * r + 1 : 15 - 2 * r;
}

export function drawDiamond(frame: Frame, x0: number, y0: number, color: number, id?: number): void {
  for (let r = 0; r < TH; r++) {
    const half = diamondHalf(r);
    frame.hspan(x0 + 8 - half, x0 + 7 + half, y0 + r, color, id);
  }
}

/** Chỉ vẽ viền của ô kim cương (dùng cho "hôm nay" và ô đang chọn). */
export function drawDiamondOutline(frame: Frame, x0: number, y0: number, color: number): void {
  for (let r = 0; r < TH; r++) {
    const half = diamondHalf(r);
    const left = x0 + 8 - half;
    const right = x0 + 7 + half;
    const prevHalf = r === 0 ? 0 : diamondHalf(r - 1);
    const nextHalf = r === TH - 1 ? 0 : diamondHalf(r + 1);
    const edge = Math.max(1, half - Math.min(prevHalf, nextHalf));
    frame.hspan(left, left + edge - 1, y0 + r, color);
    frame.hspan(right - edge + 1, right, y0 + r, color);
  }
}

/** Chiều cao (điểm ảnh) của tháp ở intensity 1–6. */
export function towerHeight(level: number): number {
  return Math.max(0, Math.min(6, level)) * BLOCK;
}

const TOWER_TOP = [3, 3, 2, 2, 1, 1, 2, 2, 3, 3];
const TOWER_BOT = [4, 4, 5, 5, 6, 6, 5, 5, 4, 4];

export const TOWER_COLORS = {
  left: tokenColor("cherry-300"),
  right: tokenColor("cherry-500"),
  seam: tokenColor("cherry-700"),
  ink: tokenColor("ink"),
};

export function capColor(level: number): number {
  return tokenColor(HEAT_TOKENS[Math.max(1, Math.min(6, level)) - 1]);
}

/**
 * Tháp gỗ trên ô có góc (x0, y0): đỉnh tô màu heat, hai mặt bên màu cherry, ngấn mỗi 4 điểm ảnh,
 * mép và đáy bằng mực. Vẽ theo cột x = 3…12 của ô.
 */
export function drawTower(frame: Frame, x0: number, y0: number, level: number, id?: number): void {
  const h = towerHeight(level);
  if (h === 0) return;
  const cap = capColor(level);
  for (let k = 0; k < TOWER_TOP.length; k++) {
    const x = x0 + 3 + k;
    const top = y0 + TOWER_TOP[k] - h;
    const bot = y0 + TOWER_BOT[k];
    const capBottom = y0 + TOWER_BOT[k] - h;
    const silhouette = k === 0 || k === TOWER_TOP.length - 1;
    for (let y = top; y <= bot; y++) {
      let color: number;
      if (silhouette || y === top || y === bot) color = TOWER_COLORS.ink;
      else if (y <= capBottom) color = cap;
      else {
        const fromBottom = bot - y;
        color = fromBottom % BLOCK === 0 ? TOWER_COLORS.seam : k <= 4 ? TOWER_COLORS.left : TOWER_COLORS.right;
      }
      frame.set(x, y, color, id);
    }
  }
}

/** Vị trí góc trên-trái của sprite quân (rộng 10) đặt trên đỉnh tháp. */
export function piecePosition(x0: number, y0: number, level: number, pieceH: number): { x: number; y: number } {
  return { x: x0 + 3, y: y0 + 4 - towerHeight(level) - (pieceH - 1) };
}

export interface BoardBaseOptions {
  cols: number;
  rows: number;
  /** Màu của ô bên trong (1 ≤ i ≤ cols, 1 ≤ j ≤ rows). */
  cellColor: (i: number, j: number) => number;
  /** ID ghi vào buffer chọn ô (nếu Frame có buffer ID). */
  cellId?: (i: number, j: number) => number | undefined;
}

/** Màu ô cờ sáng/tối (giống bàn cờ thật: a1 là ô tối). */
export function checkerColor(i: number, j: number): number {
  return tokenColor((i + j) % 2 === 0 ? "board-light" : "board-dark");
}

/** Mặt bàn: vòng khung gỗ, các ô, bệ, viền mực và bóng đổ. */
export function drawBoardBase(frame: Frame, opts: BoardBaseOptions): void {
  const C = opts.cols;
  const R = opts.rows;
  const frameColor = tokenColor("wood-600");
  const slabLeft = tokenColor("wood-800");
  const slabRight = tokenColor("wood-900");
  const bottomY = new Int32Array(frame.w).fill(-1);
  for (let i = 0; i <= C + 1; i++) {
    for (let j = 0; j <= R + 1; j++) {
      const { x, y } = cellXY(i, j, R);
      const isFrame = i === 0 || j === 0 || i === C + 1 || j === R + 1;
      const color = isFrame ? frameColor : opts.cellColor(i, j);
      drawDiamond(frame, x, y, color, isFrame ? undefined : opts.cellId?.(i, j));
      for (let r = 0; r < TH; r++) {
        const half = diamondHalf(r);
        for (let px = x + 8 - half; px <= x + 7 + half; px++) {
          if (px >= 0 && px < frame.w) bottomY[px] = Math.max(bottomY[px], y + r);
        }
      }
    }
  }
  const apex = cellXY(C + 1, R + 1, R).x + 8;
  for (let x = 0; x < frame.w; x++) {
    if (bottomY[x] < 0) continue;
    frame.vspan(x, bottomY[x] + 1, bottomY[x] + SLAB, x < apex ? slabLeft : slabRight);
  }
  frame.outline(TOWER_COLORS.ink);
  const shadow = tokenColor("felt-950", 90);
  for (let x = 0; x < frame.w; x++) {
    let lowest = -1;
    for (let y = frame.h - 1; y >= 0; y--) {
      if (frame.get(x, y) !== 0) {
        lowest = y;
        break;
      }
    }
    if (lowest < 0) continue;
    for (let k = 1; k <= 2; k++) if (frame.get(x, lowest + k) === 0) frame.set(x, lowest + k, shadow);
  }
}
