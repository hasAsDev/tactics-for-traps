import { tokenColor } from "./palette";
import { Frame } from "./raster";

/**
 * Chữ pixel 5×7 cho logo "TACTICS FOR TRAPS" (chỉ ASCII). Mặt chữ vàng, viền mực,
 * đổ khối gỗ 2 điểm ảnh xuống dưới như tấm biển gỗ.
 */
const GLYPHS: Record<string, string[]> = {
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
};

const GLYPH_W = 5;
const GLYPH_H = 7;
const ADVANCE = 6;
const SPACE = 3;
const PAD = 1; // chỗ cho viền
const DEPTH = 2; // đổ khối

export function pixelTextFrame(lines: string[]): Frame {
  const widths = lines.map((line) =>
    [...line].reduce((w, ch, i) => w + (ch === " " ? SPACE : GLYPH_W + (i < line.length - 1 ? 1 : 0)), 0),
  );
  const width = Math.max(...widths) + PAD * 2;
  const lineH = GLYPH_H + DEPTH + PAD * 2 + 1;
  const height = lineH * lines.length;
  const face = new Frame(width, height);
  const top = tokenColor("gold-300");
  const bottom = tokenColor("gold-500");
  lines.forEach((line, li) => {
    let x = PAD + Math.floor((Math.max(...widths) - widths[li]) / 2);
    const y0 = PAD + li * lineH;
    for (const ch of line.toUpperCase()) {
      if (ch === " ") {
        x += SPACE;
        continue;
      }
      const glyph = GLYPHS[ch];
      if (glyph) {
        glyph.forEach((row, gy) => {
          for (let gx = 0; gx < GLYPH_W; gx++) {
            if (row[gx] === "#") face.set(x + gx, y0 + gy, gy < 3 ? top : bottom);
          }
        });
      }
      x += ADVANCE;
    }
  });
  // Đổ khối: dịch mặt chữ xuống 1–2 điểm ảnh (gỗ), vẽ phía sau.
  const out = new Frame(width, height);
  const extrude = [tokenColor("wood-800"), tokenColor("wood-900")];
  for (let k = DEPTH; k >= 1; k--) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (face.get(x, y) !== 0) out.set(x, y + k, extrude[k - 1]);
      }
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const c = face.get(x, y);
      if (c !== 0) out.set(x, y, c);
    }
  }
  // Viền mực 8 hướng.
  const snapshot = out.px.slice();
  const filled = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height && snapshot[y * width + x] !== 0;
  const ink = tokenColor("ink");
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (filled(x, y)) continue;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((dx || dy) && filled(x + dx, y + dy)) {
            out.set(x, y, ink);
            dy = 2;
            break;
          }
        }
      }
    }
  }
  return out;
}
