"use client";

import { useEffect, useMemo, useState } from "react";
import { GameView } from "@/components/game/GameView";
import { Sprite } from "@/components/pixel/Sprite";
import { LEVEL_PIECES } from "@/game/art/board";
import { METRICS, type Metric } from "@/game/core/intensity";
import { boardLevels, sliceBoard, type BoardDTO } from "@/game/world";
import { formatDate, formatNumber } from "@/lib/format";
import { bigValue, dateOf, describeDay, legendRanges, METRIC_LABELS } from "./day-text";
import { YearGrid } from "./YearGrid";

const RECENT_WEEKS = 12;

function useWideScreen(): boolean | null {
  const [wide, setWide] = useState<boolean | null>(null);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return wide;
}

interface HeatmapPanelProps {
  board: BoardDTO;
  todayIso: string;
}

/** Bàn cờ 12 tháng: tab chỉ số, chế độ 3D / Lưới, tooltip và thẻ chi tiết ngày. */
export function HeatmapPanel({ board, todayIso }: HeatmapPanelProps) {
  const [metric, setMetric] = useState<Metric>("total");
  const [view, setView] = useState<"3d" | "grid">("3d");
  const [selected, setSelected] = useState<number | null>(null);
  const [hover, setHover] = useState<{ index: number; at: { x: number; y: number } } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState(false);
  const wide = useWideScreen();

  const levels = useMemo(() => boardLevels(board, metric), [board, metric]);
  const board3d = useMemo(() => (wide ? board : sliceBoard(board, RECENT_WEEKS)), [board, wide]);
  const offset = (board.weeks - board3d.weeks) * 7;

  const summary = useMemo(() => {
    let active = 0;
    let total = 0;
    let best = -1;
    for (let d = 0; d <= board.todayIndex; d++) {
      const p = board.points[d] ?? 0;
      if (levels[d] > 0) active++;
      total += p;
      if (best < 0 || p > (board.points[best] ?? 0)) best = d;
    }
    return { active, total, best };
  }, [board, levels]);

  const showGrid = view === "grid" || failed;
  const cardIndex = selected ?? board.todayIndex;
  const card = describeDay(board, cardIndex, todayIso);
  const tip = hover ? describeDay(board, hover.index, todayIso) : null;
  const ranges = legendRanges(metric);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Chỉ số" className="frame flex max-w-full overflow-x-auto bg-wood-900">
          {METRICS.map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={metric === m}
              tabIndex={metric === m ? 0 : -1}
              onClick={() => setMetric(m)}
              onKeyDown={(e) => {
                const i = METRICS.indexOf(metric);
                if (e.key === "ArrowRight") setMetric(METRICS[(i + 1) % METRICS.length]);
                if (e.key === "ArrowLeft") setMetric(METRICS[(i + METRICS.length - 1) % METRICS.length]);
              }}
              className={
                metric === m
                  ? "label-px min-h-11 whitespace-nowrap bg-paper px-3 text-ink shadow-[inset_0_2px_0_0_var(--color-ivory)]"
                  : "label-px min-h-11 whitespace-nowrap px-3 text-ivory hover:bg-wood-800"
              }
            >
              {METRIC_LABELS[m]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={view === "3d" && !failed ? "btn btn-sm btn-primary" : "btn btn-sm"}
            aria-pressed={view === "3d"}
            disabled={failed}
            onClick={() => setView("3d")}
          >
            3D
          </button>
          <button
            type="button"
            className={showGrid ? "btn btn-sm btn-primary" : "btn btn-sm"}
            aria-pressed={showGrid}
            onClick={() => setView("grid")}
          >
            Lưới
          </button>
        </div>
      </div>

      <p className="text-body-sm text-mist" aria-live="polite">
        {formatNumber(summary.active)} ngày hoạt động · {formatNumber(summary.total)} điểm
        {summary.best >= 0 && (board.points[summary.best] ?? 0) > 0 && (
          <> · ngày cao nhất {formatNumber(board.points[summary.best])} điểm ({formatDate(dateOf(board, summary.best))})</>
        )}
      </p>

      <div className="panel-felt relative overflow-hidden">
        {showGrid || wide === null ? (
          wide === null && !showGrid ? (
            <div style={{ aspectRatio: "512 / 296" }} aria-hidden />
          ) : (
            <div className="p-2">
              <YearGrid
                board={board}
                levels={levels}
                metric={metric}
                todayIso={todayIso}
                selected={selected}
                onSelect={setSelected}
                mode="visible"
              />
            </div>
          )
        ) : (
          <>
            <GameView
              key={board3d.weeks}
              board={board3d}
              metric={metric}
              selected={selected === null ? null : selected - offset}
              onHover={(i, at) => setHover(i === null || !at ? null : { index: i + offset, at })}
              onSelect={(i) => setSelected(i + offset)}
              onZoom={setZoom}
              onFail={() => setFailed(true)}
            >
              {tip && hover && wide && (
                <div
                  className="panel-paper pointer-events-none absolute z-10 w-64 -translate-x-1/2 -translate-y-full p-2"
                  style={{ left: hover.at.x * zoom, top: Math.max(0, hover.at.y * zoom) }}
                  role="tooltip"
                >
                  <p className="label-px text-ink-muted">{tip.title}</p>
                  <p className="text-body">{bigValue(board, hover.index, metric)}</p>
                  {tip.empty ? (
                    <p className="text-body-sm text-ink-muted">Không có hoạt động</p>
                  ) : (
                    tip.lines.map((l) => (
                      <p key={l} className="text-body-sm">
                        {l}
                      </p>
                    ))
                  )}
                </div>
              )}
            </GameView>
            <YearGrid
              board={board}
              levels={levels}
              metric={metric}
              todayIso={todayIso}
              selected={selected}
              onSelect={setSelected}
              mode="sr-only"
            />
          </>
        )}
      </div>

      {wide === false && view === "3d" && !failed && (
        <button type="button" className="btn btn-sm self-start" onClick={() => setView("grid")}>
          Xem cả năm
        </button>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-2 text-body-sm text-mist">
          <span>Ít</span>
          {LEVEL_PIECES.map((p, i) => (
            <span key={p.sprite} className="flex flex-col items-center" title={ranges[i]}>
              <Sprite id={p.sprite} palette={p.palette} scale={2} />
              <span className="text-[0.8rem] leading-4">{ranges[i]}</span>
            </span>
          ))}
          <span>Nhiều</span>
        </div>
        <p className="text-body-sm text-mist">Storm/Racer/Puzzle Streak tính theo ngày UTC (7 giờ sáng giờ VN).</p>
      </div>

      <div className="panel-paper p-3" aria-live="polite">
        <p className="label-px text-ink-muted">{card.title}</p>
        <p className="text-ui font-display">{bigValue(board, cardIndex, metric)}</p>
        {card.empty ? (
          <p className="text-body-sm text-ink-muted">
            {card.isToday ? "Hôm nay chưa giải puzzle nào." : "Không có hoạt động."}
          </p>
        ) : (
          card.lines.map((l) => (
            <p key={l} className="text-body-sm">
              {l}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
