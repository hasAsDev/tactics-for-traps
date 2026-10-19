"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Metric } from "@/game/core/intensity";
import { boardSize } from "@/game/art/iso";
import type { BoardDTO, WorldHandle } from "@/game/world";

interface GameViewProps {
  board: BoardDTO;
  metric: Metric;
  selected: number | null;
  onHover?: (index: number | null, at: { x: number; y: number } | null) => void;
  onSelect?: (index: number) => void;
  /** Gọi khi zoom (CSS px trên mỗi điểm ảnh art) thay đổi. */
  onZoom?: (zoom: number) => void;
  /** Không tạo được WebGL: cha nên hiện lưới phẳng thay thế. */
  onFail?: () => void;
  /** Lớp phủ (tooltip…) đặt trong khung đúng bằng canvas; toạ độ art × zoom. */
  children?: ReactNode;
}

/** Phóng theo số nguyên điểm ảnh thiết bị: mỗi điểm ảnh art phủ đúng n điểm ảnh màn hình. */
function computeZoom(cssWidth: number, artWidth: number): number {
  const dpr = window.devicePixelRatio || 1;
  const n = Math.max(1, Math.floor((cssWidth * dpr) / artWidth));
  return n / dpr;
}

/** Khung chứa thế giới Phaser. Phaser chỉ được nạp ở client, bằng import động. */
export function GameView({ board, metric, selected, onHover, onSelect, onZoom, onFail, children }: GameViewProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<WorldHandle | null>(null);
  const callbacks = useRef({ onHover, onSelect, onZoom, onFail });
  const latest = useRef({ board, metric, selected });
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null);
  const art = boardSize(board.weeks);

  useEffect(() => {
    callbacks.current = { onHover, onSelect, onZoom, onFail };
  });

  useEffect(() => {
    latest.current = { board, metric, selected };
    handleRef.current?.update({ board, metric, selected });
  }, [board, metric, selected]);

  useEffect(() => {
    const outer = outerRef.current;
    const host = hostRef.current;
    if (!outer || !host) return;
    let dead = false;
    let handle: WorldHandle | null = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const measure = () => computeZoom(outer.clientWidth, boardSize(latest.current.board.weeks).w);

    const applyZoom = (value: number) => {
      setZoom(value);
      callbacks.current.onZoom?.(value);
      handleRef.current?.setZoom(value);
    };
    applyZoom(measure());

    import("@/game/phaser/createWorld")
      .then(({ createWorld }) => {
        if (dead) return;
        handle = createWorld(
          host,
          { ...latest.current, reducedMotion },
          {
            hover: (i, at) => callbacks.current.onHover?.(i, at),
            select: (i) => callbacks.current.onSelect?.(i),
            ready: () => !dead && setReady(true),
          },
          measure(),
        );
        handleRef.current = handle;
      })
      .catch(() => {
        if (!dead) callbacks.current.onFail?.();
      });

    const resize = new ResizeObserver(() => applyZoom(measure()));
    resize.observe(outer);
    const dpr = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const onDpr = () => applyZoom(measure());
    dpr.addEventListener("change", onDpr);

    const visibility = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) handleRef.current?.wake();
      else handleRef.current?.sleep();
    });
    visibility.observe(outer);

    return () => {
      dead = true;
      resize.disconnect();
      visibility.disconnect();
      dpr.removeEventListener("change", onDpr);
      handle?.destroy();
      handleRef.current = null;
    };
  }, []);

  return (
    <div ref={outerRef} className="w-full">
      <div
        className="relative mx-auto"
        style={zoom ? { width: art.w * zoom, height: art.h * zoom } : { width: "100%", aspectRatio: `${art.w} / ${art.h}` }}
      >
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <span className="label-px animate-pulse text-mist">Đang xếp quân…</span>
          </div>
        )}
        <div ref={hostRef} aria-hidden className="absolute inset-0 [&_canvas]:touch-pan-y" />
        {ready && children}
      </div>
    </div>
  );
}
