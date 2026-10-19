import { pixelTextFrame } from "@/game/art/glyphs";

interface PixelTextProps {
  /** Mỗi phần tử là một dòng (chỉ chữ có trong bộ glyph của logo). */
  lines: string[];
  scale?: number;
  className?: string;
}

const cache = new Map<string, { w: number; h: number; paths: ReturnType<ReturnType<typeof pixelTextFrame>["toSvgPaths"]> }>();

function build(lines: string[]) {
  const key = lines.join("\n");
  let entry = cache.get(key);
  if (!entry) {
    const frame = pixelTextFrame(lines);
    entry = { w: frame.w, h: frame.h, paths: frame.toSvgPaths() };
    cache.set(key, entry);
  }
  return entry;
}

/** Logo chữ pixel (biển gỗ vàng). Luôn aria-hidden: đặt chữ thật bên cạnh cho screen reader. */
export function PixelText({ lines, scale = 2, className }: PixelTextProps) {
  const { w, h, paths } = build(lines);
  return (
    <svg
      width={w * scale}
      height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      aria-hidden
      className={className}
    >
      {paths.map((p, i) => (
        <path key={i} fill={p.fill} fillOpacity={p.opacity < 1 ? p.opacity : undefined} d={p.d} />
      ))}
    </svg>
  );
}
