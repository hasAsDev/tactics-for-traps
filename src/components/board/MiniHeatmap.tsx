import { PALETTE } from "@/game/art/palette";

const COLORS = [
  PALETTE["wood-900"],
  PALETTE["heat-1"],
  PALETTE["heat-2"],
  PALETTE["heat-3"],
  PALETTE["heat-4"],
  PALETTE["heat-5"],
  PALETTE["heat-6"],
];

/** Heatmap phẳng 12 tuần (SVG render ở server): cột = tuần, hàng = thứ, ô 3 điểm ảnh, khe 1. */
export function MiniHeatmap({ levels, label }: { levels: number[]; label: string }) {
  const weeks = Math.ceil(levels.length / 7);
  const size = 3;
  const gap = 1;
  const w = weeks * (size + gap) - gap;
  const h = 7 * (size + gap) - gap;
  return (
    <svg width={w * 2} height={h * 2} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" role="img" aria-label={label}>
      {levels.map((level, k) => {
        const week = Math.floor(k / 7);
        const day = k % 7;
        return (
          <rect
            key={k}
            x={week * (size + gap)}
            y={day * (size + gap)}
            width={size}
            height={size}
            fill={COLORS[Math.max(0, Math.min(6, level))]}
          />
        );
      })}
    </svg>
  );
}
