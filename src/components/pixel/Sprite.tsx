import { spritePaths } from "@/game/art/render";
import { spriteSize, type PaletteName, type SpriteId } from "@/game/art/sprites";

interface SpriteProps {
  id: SpriteId;
  palette?: PaletteName;
  /** Số CSS px cho mỗi điểm ảnh art (số nguyên). */
  scale?: number;
  title?: string;
  className?: string;
}

/** Sprite pixel dạng SVG (render được ở server lẫn client). */
export function Sprite({ id, palette = "ivory", scale = 2, title, className }: SpriteProps) {
  const { w, h } = spriteSize(id);
  const paths = spritePaths(id, palette);
  return (
    <svg
      width={w * scale}
      height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
    >
      {paths.map((p) => (
        <path key={p.token} fill={p.hex} d={p.d} />
      ))}
    </svg>
  );
}
