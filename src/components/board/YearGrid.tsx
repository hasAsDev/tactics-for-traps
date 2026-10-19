"use client";

import { useEffect, useRef } from "react";
import type { Metric } from "@/game/core/intensity";
import type { BoardDTO } from "@/game/world";
import { WEEKDAYS_SHORT } from "@/lib/format";
import { describeDay } from "./day-text";

const HEAT_BG = [
  "bg-wood-900",
  "bg-heat-1",
  "bg-heat-2",
  "bg-heat-3",
  "bg-heat-4",
  "bg-heat-5",
  "bg-heat-6",
] as const;

interface YearGridProps {
  board: BoardDTO;
  levels: Uint8Array;
  metric: Metric;
  todayIso: string;
  selected: number | null;
  onSelect: (index: number) => void;
  /** "visible": chế độ Lưới; "sr-only": lớp bàn phím/screen reader phía sau bàn 3D. */
  mode: "visible" | "sr-only";
}

/**
 * Lưới năm phẳng: hàng = thứ (T2…CN), cột = tuần. Vừa là chế độ "Lưới", vừa là lớp
 * bàn phím/screen reader cho bàn 3D (ARIA grid, roving tabindex).
 */
export function YearGrid({ board, levels, todayIso, selected, onSelect, mode }: YearGridProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const focusIndex = selected ?? board.todayIndex;

  useEffect(() => {
    if (mode !== "visible") return;
    const cell = tableRef.current?.querySelector<HTMLElement>(`[data-day="${board.todayIndex}"]`);
    cell?.scrollIntoView({ block: "nearest", inline: "end" });
  }, [mode, board.todayIndex]);

  function move(from: number, delta: number) {
    const next = Math.min(board.todayIndex, Math.max(0, from + delta));
    onSelect(next);
    requestAnimationFrame(() => {
      tableRef.current?.querySelector<HTMLElement>(`[data-day="${next}"]`)?.focus({ preventScroll: mode !== "visible" });
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTableElement>) {
    const from = Number((event.target as HTMLElement).dataset.day ?? focusIndex);
    const map: Record<string, number> = {
      ArrowLeft: -7,
      ArrowRight: 7,
      ArrowUp: -1,
      ArrowDown: 1,
      PageUp: -28,
      PageDown: 28,
    };
    if (event.key in map) {
      event.preventDefault();
      move(from, map[event.key]);
    } else if (event.key === "Home") {
      event.preventDefault();
      move(0, 0);
    } else if (event.key === "End") {
      event.preventDefault();
      move(board.todayIndex, 0);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(from);
    }
  }

  const weeks = Array.from({ length: board.weeks }, (_, w) => w);
  const visible = mode === "visible";

  return (
    <div className={visible ? "overflow-x-auto pb-2" : "sr-only"}>
      <table
        ref={tableRef}
        role="grid"
        aria-label="Lịch hoạt động theo ngày"
        className="border-separate"
        style={{ borderSpacing: visible ? "3px" : 0 }}
        onKeyDown={onKeyDown}
      >
        <tbody>
          {WEEKDAYS_SHORT.map((label, row) => (
            <tr key={label}>
              <th scope="row" className={visible ? "sticky left-0 bg-felt-900 pr-1 text-left text-body-sm text-mist" : ""}>
                {label}
              </th>
              {weeks.map((w) => {
                const d = w * 7 + row;
                const future = d > board.todayIndex;
                const info = future ? null : describeDay(board, d, todayIso);
                const level = future ? 0 : levels[d];
                const isSelected = selected === d;
                return (
                  <td
                    key={w}
                    role="gridcell"
                    data-day={d}
                    tabIndex={!future && d === focusIndex ? 0 : -1}
                    aria-selected={isSelected || undefined}
                    aria-disabled={future || undefined}
                    aria-current={info?.isToday ? "date" : undefined}
                    aria-label={
                      info
                        ? `${info.title}: ${info.empty ? "không có hoạt động" : `${info.points} điểm, ${info.lines.join(", ")}`}`
                        : undefined
                    }
                    onClick={future ? undefined : () => onSelect(d)}
                    className={
                      visible
                        ? [
                            "h-3 w-3 p-0 md:h-[14px] md:w-[14px]",
                            future ? "outline-dotted outline-1 outline-wood-800" : `${HEAT_BG[level]} cursor-pointer`,
                            info?.isToday ? "shadow-[inset_0_0_0_2px_var(--color-gold-300)]" : "",
                            isSelected ? "outline-2 outline-sky-300" : "",
                          ].join(" ")
                        : ""
                    }
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
