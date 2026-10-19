import { PALETTE, type ColorToken } from "@/game/art/palette";

/**
 * Viền pixel cho CSS `border-image` (9-slice) dựng từ SVG inline với shape-rendering="crispEdges".
 * Mỗi "band" là một vòng tính từ mép vào; band có hai màu thì nửa trên-trái dùng màu đầu, nửa dưới-phải dùng màu sau.
 * Góc được vát chéo `notch` điểm ảnh.
 */
type Band = ColorToken | [ColorToken, ColorToken];

export function makeFrameMatrix(n: number, bands: Band[], notch: number): (ColorToken | null)[][] {
  const rows: (ColorToken | null)[][] = [];
  for (let y = 0; y < n; y++) {
    const row: (ColorToken | null)[] = [];
    for (let x = 0; x < n; x++) {
      const rx = n - 1 - x;
      const ry = n - 1 - y;
      const band = Math.min(x, y, rx, ry, x + y - notch, rx + y - notch, x + ry - notch, rx + ry - notch);
      if (band < 0 || band >= bands.length) {
        row.push(null);
        continue;
      }
      const spec = bands[band];
      row.push(Array.isArray(spec) ? (x + y <= n - 1 ? spec[0] : spec[1]) : spec);
    }
    rows.push(row);
  }
  return rows;
}

function matrixToSvg(rows: (ColorToken | null)[][], extra = ""): string {
  const n = rows.length;
  const w = rows[0]?.length ?? 0;
  const byColor = new Map<string, string[]>();
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const token = row[x];
      if (!token) {
        x++;
        continue;
      }
      let end = x + 1;
      while (end < row.length && row[end] === token) end++;
      const list = byColor.get(token) ?? [];
      list.push(`M${x} ${y}h${end - x}v1h-${end - x}z`);
      byColor.set(token, list);
      x = end;
    }
  });
  const paths = [...byColor.entries()]
    .map(([token, d]) => `<path fill='${PALETTE[token as ColorToken]}' d='${d.join("")}'/>`)
    .join("");
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${n}' viewBox='0 0 ${w} ${n}' shape-rendering='crispEdges'>${extra}${paths}</svg>`;
}

function dataUri(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Viền mực 1 điểm ảnh, góc vát: dùng cho mọi control (nút, ô nhập, chip, tab). */
export const NOTCH_FRAME = makeFrameMatrix(3, ["ink"], 1);
/** Khung gỗ của panel chính. */
export const WOOD_FRAME = makeFrameMatrix(9, ["ink", ["wood-400", "wood-800"], "wood-600", "wood-900"], 2);
/** Khung giấy (biên bản ván cờ). */
export const PAPER_FRAME = makeFrameMatrix(5, ["ink", ["ivory", "paper-line"]], 1);

/** Ô texture nỉ 8×8: vài điểm sáng/tối mờ, dùng được trên mọi sắc nỉ. */
function feltTexture(): string {
  const light = [
    [1, 0],
    [5, 1],
    [2, 3],
    [7, 4],
    [0, 6],
    [4, 6],
  ];
  const dark = [
    [3, 1],
    [6, 2],
    [1, 5],
    [5, 7],
  ];
  const rect = (x: number, y: number, fill: string, opacity: number) =>
    `<rect x='${x}' y='${y}' width='1' height='1' fill='${fill}' fill-opacity='${opacity}'/>`;
  const body = [
    ...light.map(([x, y]) => rect(x, y, "#ffffff", 0.04)),
    ...dark.map(([x, y]) => rect(x, y, "#000000", 0.18)),
  ].join("");
  return `<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8' shape-rendering='crispEdges'>${body}</svg>`;
}

/** Biến CSS chứa ảnh viền; layout tiêm một lần trong <style>. */
export const FRAMES_CSS = `:root{--frame-notch:${dataUri(matrixToSvg(NOTCH_FRAME))};--frame-wood:${dataUri(
  matrixToSvg(WOOD_FRAME),
)};--frame-paper:${dataUri(matrixToSvg(PAPER_FRAME))};--felt-texture:${dataUri(feltTexture())}}`;
