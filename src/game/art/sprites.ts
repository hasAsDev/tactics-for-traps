import type { ColorToken } from "./palette";

/**
 * Sprite pixel vẽ bằng code: mỗi sprite là các hàng chữ cái "vai trò",
 * palette quyết định vai trò nào thành màu nào (đổi palette là đổi màu cả bộ).
 * Ánh sáng từ trên-trái: highlight bên trái, shade bên phải và đáy.
 *
 *   .  trong suốt     o  viền      h  highlight
 *   b  thân           s  bóng      t  viền trang trí / cờ
 *   j, J  đá quý
 */
export type Role = "o" | "h" | "b" | "s" | "t" | "j" | "J";

export type SpritePalette = Partial<Record<Role, ColorToken>>;

export const SPRITE_PALETTES = {
  ivory: { o: "ink", h: "ivory", b: "paper", s: "paper-line", t: "ember-600", j: "ember-600", J: "sky-300" },
  ebony: { o: "ink", h: "wood-600", b: "wood-800", s: "wood-900", t: "gold-500", j: "gold-500", J: "gold-500" },
  gold: { o: "ink", h: "heat-6", b: "gold-300", s: "gold-500", t: "ember-600", j: "ember-600", J: "sky-300" },
  iron: { o: "ink", h: "mist", b: "felt-600", s: "felt-700", t: "felt-700", j: "felt-800", J: "felt-800" },
  ghost: { o: "felt-600", h: "felt-700", b: "felt-700", s: "felt-800", t: "felt-700", j: "felt-800", J: "felt-800" },
  sky: { o: "ink", h: "ivory", b: "sky-300", s: "sky-300", t: "sky-300" },
  flag: { o: "ink", h: "ivory", b: "ember-400", s: "ember-600", t: "ember-600" },
} satisfies Record<string, SpritePalette>;

export type PaletteName = keyof typeof SPRITE_PALETTES;

export const SPRITES = {
  // Quân nhỏ: rộng 10, căn đáy (dùng trên đỉnh tháp, avatar, danh sách).
  "pawn-s": [
    "...oooo...",
    "..ohhbbo..",
    "..ohbbso..",
    "...obso...",
    "..oobsoo..",
    "...obso...",
    "..ohbbso..",
    ".ohbbbsso.",
    ".oooooooo.",
  ],
  "knight-s": [
    "...o.o....",
    "..ohoho...",
    ".ohbbbbo..",
    "ohbobbbso.",
    "obbbbbbbso",
    "osbbsobbso",
    ".oo.obbbso",
    "...obbbbso",
    "..ohbbbbso",
    "..ohbbbsso",
    ".ohbbbbbso",
    ".oooooooo.",
  ],
  "bishop-s": [
    "....oo....",
    "...ohso...",
    "....oo....",
    "...ohso...",
    "..ohboso..",
    "..ohobso..",
    "..ohbbso..",
    "...obso...",
    "..oobsoo..",
    "...ohso...",
    "..ohbbso..",
    ".oooooooo.",
  ],
  "rook-s": [
    ".oo.oo.oo.",
    ".ohhbbbso.",
    ".ohbbbbso.",
    ".oooooooo.",
    "..ohbbso..",
    "..ohbbso..",
    "..ohbbso..",
    "..ohbbso..",
    ".oohbbsoo.",
    ".ohbbbbso.",
    ".oooooooo.",
  ],
  "queen-s": [
    ".o..oo..o.",
    ".oo.oo.oo.",
    ".ohbbbbso.",
    ".ohbjbbso.",
    "..ohbbso..",
    "..ohbbso..",
    "...obso...",
    "..oobsoo..",
    "..ohbbso..",
    "..ohbbso..",
    ".oohbbsoo.",
    ".ohbbbbso.",
    ".oooooooo.",
  ],
  "king-s": [
    "....oo....",
    "...oooo...",
    "....oo....",
    "..oooooo..",
    ".ohbjbbso.",
    ".ohbbbbso.",
    "..ohbbso..",
    "...obso...",
    "..oobsoo..",
    "..ohbbso..",
    "..ohbbso..",
    ".oohbbsoo.",
    ".ohbbbbso.",
    ".oooooooo.",
  ],
  // Vương miện của Streak.
  crown: [
    ".o....o....o.",
    "oho..oho..oho",
    "ohbo.obo.obso",
    "ohbbobbbobbso",
    "ohbbbbbbbbbso",
    "ohjbbbJbbbjso",
    "ossssssssssso",
    ".ooooooooooo.",
  ],
  // Cờ hiệu cắm trên ô "hôm nay" khi chưa giải.
  flag: [
    "oo....",
    "obbo..",
    "obbbo.",
    "obso..",
    "oo....",
    "o.....",
    "o.....",
    "o.....",
    "oo....",
  ],
  // Đồng hồ cát: sắp mất Streak.
  hourglass: [
    "ooooooo",
    ".ohbbo.",
    ".obbso.",
    "..obo..",
    "...o...",
    "..obo..",
    ".obbso.",
    ".ohbbo.",
    "ooooooo",
  ],
  // Con trỏ chỉ xuống ô đang chọn.
  cursor: [
    "obbbbbo",
    ".obbbo.",
    "..obo..",
    "...o...",
  ],
} satisfies Record<string, readonly string[]>;

export type SpriteId = keyof typeof SPRITES;

export interface SpriteSize {
  w: number;
  h: number;
}

export function spriteSize(id: SpriteId): SpriteSize {
  const rows = SPRITES[id];
  return { w: rows[0].length, h: rows.length };
}

export function isSpriteId(id: string): id is SpriteId {
  return Object.hasOwn(SPRITES, id);
}
