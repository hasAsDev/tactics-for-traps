/**
 * Bảng màu cố định của "Thế giới bàn cờ". Nguồn duy nhất cho CSS (@theme trong globals.css),
 * Phaser và SVG render ở server. Một unit test kiểm tra globals.css khớp với bảng này.
 */
export const PALETTE = {
  "felt-950": "#08150f",
  "felt-900": "#0d2118",
  "felt-800": "#133024",
  "felt-700": "#1b4331",
  "felt-600": "#2a5c45",
  ink: "#1a100a",
  "wood-900": "#3b2214",
  "wood-800": "#5c3720",
  "wood-600": "#8b5a32",
  "wood-400": "#b9824c",
  "wood-200": "#e2b97f",
  "board-light": "#f0d9b5",
  "board-dark": "#b58863",
  ivory: "#f7eed8",
  paper: "#eadcbc",
  "paper-line": "#c9b58c",
  "ink-muted": "#5b4636",
  mist: "#a9c3b2",
  "gold-300": "#f9cf55",
  "gold-500": "#e9a930",
  "ember-400": "#ff8a70",
  "ember-600": "#a33022",
  "sky-300": "#80d4ff",
  "leaf-400": "#9fe07a",
  "heat-1": "#a46b38",
  "heat-2": "#c07f3a",
  "heat-3": "#d9953a",
  "heat-4": "#e9a930",
  "heat-5": "#f9cf55",
  "heat-6": "#fff3c4",
  "cherry-300": "#b8693a",
  "cherry-500": "#7d3f22",
  "cherry-700": "#4f2414",
} as const;

export type ColorToken = keyof typeof PALETTE;

export const HEAT_TOKENS = ["heat-1", "heat-2", "heat-3", "heat-4", "heat-5", "heat-6"] as const;

/** Màu dạng số 0xAABBGGRR để ghi thẳng vào Uint32Array trên ImageData (máy little-endian). */
export function packColor(hex: string, alpha = 255): number {
  const v = Number.parseInt(hex.slice(1), 16);
  const r = (v >> 16) & 0xff;
  const g = (v >> 8) & 0xff;
  const b = v & 0xff;
  return ((alpha << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

export function tokenColor(token: ColorToken, alpha = 255): number {
  return packColor(PALETTE[token], alpha);
}
