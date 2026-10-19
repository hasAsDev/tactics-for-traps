import { PALETTE, tokenColor, type ColorToken } from "./palette";
import { SPRITE_PALETTES, SPRITES, type PaletteName, type Role, type SpriteId } from "./sprites";

/** Một màu và đường path SVG gồm các đoạn ngang 1 px. */
export interface ColorPath {
  token: ColorToken;
  hex: string;
  d: string;
}

const pathCache = new Map<string, ColorPath[]>();

/** Chuyển sprite thành path SVG (mỗi màu một path) để vẽ bằng shape-rendering="crispEdges". */
export function spritePaths(id: SpriteId, palette: PaletteName): ColorPath[] {
  const key = `${id}|${palette}`;
  const cached = pathCache.get(key);
  if (cached) return cached;
  const rows = SPRITES[id];
  const roles = SPRITE_PALETTES[palette] as Partial<Record<Role, ColorToken>>;
  const byToken = new Map<ColorToken, string[]>();
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x] as Role | ".";
      if (ch === ".") {
        x++;
        continue;
      }
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      const token = roles[ch as Role];
      if (token) {
        const list = byToken.get(token) ?? [];
        list.push(`M${x} ${y}h${end - x}v1h-${end - x}z`);
        byToken.set(token, list);
      }
      x = end;
    }
  });
  const result = [...byToken.entries()].map(([token, parts]) => ({
    token,
    hex: PALETTE[token],
    d: parts.join(""),
  }));
  pathCache.set(key, result);
  return result;
}

export interface Bitmap {
  w: number;
  h: number;
  /** Màu 0xAABBGGRR, 0 = trong suốt. */
  px: Uint32Array;
}

const bitmapCache = new Map<string, Bitmap>();

/** Chuyển sprite thành bitmap để blit vào raster/canvas. */
export function spriteBitmap(id: SpriteId, palette: PaletteName): Bitmap {
  const key = `${id}|${palette}`;
  const cached = bitmapCache.get(key);
  if (cached) return cached;
  const rows = SPRITES[id];
  const roles = SPRITE_PALETTES[palette] as Partial<Record<Role, ColorToken>>;
  const w = rows[0].length;
  const h = rows.length;
  const px = new Uint32Array(w * h);
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const token = roles[row[x] as Role];
      if (token) px[y * w + x] = tokenColor(token);
    }
  });
  const bmp = { w, h, px };
  bitmapCache.set(key, bmp);
  return bmp;
}
