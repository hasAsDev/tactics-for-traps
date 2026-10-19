import { dayTotalsAt, type BoardDTO } from "@/game/world";
import { formatShortDate, WEEKDAYS_SHORT } from "@/lib/format";
import { dayNumber, weekdayMon0 } from "@/game/core/time";
import { lastSevenDays } from "@/server/queries/profile";

function cell(v: number) {
  return v > 0 ? v : "·";
}

/** Nhật ký 7 ngày qua, dạng biên bản giấy. */
export function SevenDayLog({ board }: { board: BoardDTO }) {
  const rows = lastSevenDays(board);
  return (
    <section aria-labelledby="log-title" className="panel-paper overflow-x-auto p-3 md:p-4">
      <h2 id="log-title" className="label-px mb-2 text-ink-muted">
        7 ngày qua
      </h2>
      <table className="w-full min-w-[34rem] text-left text-body">
        <thead>
          <tr className="border-b-2 border-paper-line text-body-sm text-ink-muted">
            <th scope="col" className="py-1 pr-2 font-normal">Ngày</th>
            <th scope="col" className="px-2 font-normal">Điểm</th>
            <th scope="col" className="px-2 font-normal">Đúng</th>
            <th scope="col" className="px-2 font-normal">Sai</th>
            <th scope="col" className="px-2 font-normal">P.Streak</th>
            <th scope="col" className="px-2 font-normal">Storm</th>
            <th scope="col" className="px-2 font-normal">Racer</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ iso, index }, k) => {
            const t = dayTotalsAt(board, index);
            const label = k === 0 ? "Hôm nay" : k === 1 ? "Hôm qua" : `${WEEKDAYS_SHORT[weekdayMon0(dayNumber(iso))]} ${formatShortDate(iso)}`;
            return (
              <tr key={iso} className={`border-b-2 border-paper-line ${k === 0 ? "bg-heat-6" : ""}`}>
                <th scope="row" className="py-1 pr-2 font-normal">{label}</th>
                <td className="px-2">{cell(board.points[index] ?? 0)}</td>
                <td className="px-2">{cell(t.solved)}</td>
                <td className="px-2">{cell(t.failed)}</td>
                <td className="px-2">{cell(t.pstreakBest)}</td>
                <td className="px-2">{cell(t.stormBest)}</td>
                <td className="px-2">{cell(t.racerBest)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
