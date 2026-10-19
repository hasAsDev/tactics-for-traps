// Xuất các cảnh pixel ra PNG để xem nhanh (không cần trình duyệt): npm run art:preview
// Ảnh nằm trong .art-preview/ (đã gitignore).
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { renderHeatmapBoard, renderHeroScene } from "../src/game/art/board";
import { pixelTextFrame } from "../src/game/art/glyphs";
import { PALETTE } from "../src/game/art/palette";
import { Frame } from "../src/game/art/raster";
import { spriteBitmap } from "../src/game/art/render";
import { SPRITE_PALETTES, SPRITES, type PaletteName, type SpriteId } from "../src/game/art/sprites";

const OUT = ".art-preview";
mkdirSync(OUT, { recursive: true });

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Ghép frame lên nền nỉ, phóng to theo số nguyên rồi mã hoá PNG. */
function writePng(name: string, frame: Frame, scale = 3, background = PALETTE["felt-800"]): void {
  const bg = Number.parseInt(background.slice(1), 16);
  const w = frame.w * scale;
  const h = frame.h * scale;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const c = frame.px[Math.floor(y / scale) * frame.w + Math.floor(x / scale)];
      const a = ((c >>> 24) & 0xff) / 255;
      const blend = (fg: number, bgc: number) => Math.round(fg * a + bgc * (1 - a));
      const o = y * (w * 4 + 1) + 1 + x * 4;
      raw[o] = blend(c & 0xff, (bg >> 16) & 0xff);
      raw[o + 1] = blend((c >>> 8) & 0xff, (bg >> 8) & 0xff);
      raw[o + 2] = blend((c >>> 16) & 0xff, bg & 0xff);
      raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  writeFileSync(`${OUT}/${name}.png`, png);
  console.log(`${OUT}/${name}.png  (${frame.w}×${frame.h} ×${scale})`);
}

function fakeLevels(weeks: number, todayIndex: number): number[] {
  return Array.from({ length: weeks * 7 }, (_, d) => {
    if (d > todayIndex) return 0;
    const wave = (d * 37 + (d % 7) * 11) % 17;
    return wave < 5 ? 0 : Math.min(6, Math.floor((wave - 4) / 2) + 1);
  });
}

writePng("hero", renderHeroScene(), 4);
writePng("board-53w", renderHeatmapBoard({ weeks: 53, todayIndex: 53 * 7 - 4, levels: fakeLevels(53, 53 * 7 - 4) }), 2);
writePng(
  "board-12w",
  renderHeatmapBoard({ weeks: 12, todayIndex: 12 * 7 - 4, levels: fakeLevels(12, 12 * 7 - 4) }),
  4,
);
// Bàn 6 tuần, mỗi cột một intensity để soi từng tầng tháp.
writePng(
  "towers",
  renderHeatmapBoard({ weeks: 6, todayIndex: 41, levels: Array.from({ length: 42 }, (_, d) => Math.floor(d / 7) + 1) }),
  6,
);
writePng("logo", pixelTextFrame(["TACTICS", "FOR TRAPS"]), 6);

// Bảng sprite: mỗi hàng một palette.
const palettes = Object.keys(SPRITE_PALETTES) as PaletteName[];
const ids = Object.keys(SPRITES) as SpriteId[];
const cell = 16;
const sheet = new Frame(ids.length * cell, palettes.length * cell);
palettes.forEach((palette, row) => {
  ids.forEach((id, col) => {
    const bmp = spriteBitmap(id, palette);
    sheet.blit(bmp, col * cell + Math.floor((cell - bmp.w) / 2), row * cell + (cell - bmp.h) - 1);
  });
});
writePng("sprites", sheet, 6);
