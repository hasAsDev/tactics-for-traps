import type { Frame } from "@/game/art/raster";

interface StaticSceneProps {
  frame: Frame;
  scale?: number;
  className?: string;
  label?: string;
}

/** Vẽ một Frame pixel thành SVG ngay trên server (không cần JavaScript ở client). */
export function StaticScene({ frame, scale = 2, className, label }: StaticSceneProps) {
  const paths = frame.toSvgPaths();
  return (
    <svg
      viewBox={`0 0 ${frame.w} ${frame.h}`}
      width={frame.w * scale}
      height={frame.h * scale}
      shapeRendering="crispEdges"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {paths.map((p, i) => (
        <path key={i} fill={p.fill} fillOpacity={p.opacity < 1 ? p.opacity : undefined} d={p.d} />
      ))}
    </svg>
  );
}
