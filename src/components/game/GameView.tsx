"use client";

import { useEffect, useRef, useState } from "react";
import type { Metric } from "@/game/core/intensity";
import { boardSize } from "@/game/art/iso";
import type { BoardDTO, WorldHandle } from "@/game/world";

interface GameViewProps {
  board: BoardDTO;
  metric: Metric;
  selected: number | null;
  onHover?: (index: number | null, at: { x: number; y: number } | null) => void;
  onSelect?: (index: number) => void;
  /** Gọi khi zoom (CSS px trên mỗi điểm ảnh art) thay đổi, để đặt tooltip. */
  onZoom?: (zoom: number) => void;
  /** Không tạo được WebGL: cha nên hiện lưới phẳng thay thế. */
  onFail?: () => void;
}

/** Phóng theo số nguyên điểm ảnh thiết bị: mỗi điểm ảnh art phủ đúng n điểm ảnh màn hình. */
function computeZoom(cssWidth: number, artWidth: number): number {
  const dpr = window.devicePixelRatio || 1;
  const n = Math.max(1, Math.floor((cssWidth * dpr) / artWidth));
  return n / dpr;
}

/** Khung chứa thế giới Phaser. Phaser chỉ được nạp ở client, bằng import động. */
export function GameView({ board, metric, selected, onHover, onSelect, onZoom, onFail }: GameViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<WorldHandle | null>(null);
  const callbacks = useRef({ onHover, onSelect, onZoom, onFail });
  const latest = useRef({ board, metric, selected });
  const [ready, setReady] = useState(false);
  const art = boardSize(board.weeks);

  useEffect(() => {
    callbacks.current = { onHover, onSelect, onZoom, onFail };
  });

  useEffect(() => {
    latest.current = { board, metric, selected };
    handleRef.current?.update({ board, metric, selected });
  }, [board, metric, selected]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let dead = false;
    let handle: WorldHandle | null = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const width = () => host.parentElement?.clientWidth ?? host.clientWidth;

    import("@/game/phaser/createWorld")
      .then(({ createWorld }) => {
        if (dead) return;
        const zoom = computeZoom(width(), boardSize(latest.current.board.weeks).w);
        callbacks.current.onZoom?.(zoom);
        handle = createWorld(
          host,
          { ...latest.current, reducedMotion },
          {
            hover: (i, at) => callbacks.current.onHover?.(i, at),
            select: (i) => callbacks.current.onSelect?.(i),
            ready: () => !dead && setReady(true),
          },
          zoom,
        );
        handleRef.current = handle;
      })
      .catch(() => {
        if (!dead) callbacks.current.onFail?.();
      });

    const resize = new ResizeObserver(() => {
      if (!handleRef.current) return;
      const zoom = computeZoom(width(), boardSize(latest.current.board.weeks).w);
      handleRef.current.setZoom(zoom);
      callbacks.current.onZoom?.(zoom);
    });
    resize.observe(host.parentElement ?? host);

    const visibility = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) handleRef.current?.wake();
      else handleRef.current?.sleep();
    });
    visibility.observe(host);

    return () => {
      dead = true;
      resize.disconnect();
      visibility.disconnect();
      handle?.destroy();
      handleRef.current = null;
    };
  }, []);

  return (
    <div className="relative" style={{ aspectRatio: `${art.w} / ${art.h}` }}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <span className="label-px animate-pulse text-mist">Đang xếp quân…</span>
        </div>
      )}
      <div ref={hostRef} aria-hidden className="absolute inset-0 flex justify-center [&_canvas]:touch-pan-y" />
    </div>
  );
}
