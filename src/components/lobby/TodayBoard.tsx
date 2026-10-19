import Link from "next/link";
import { Icon } from "@/components/pixel/Icon";
import { Panel } from "@/components/pixel/Panel";
import { Sprite } from "@/components/pixel/Sprite";
import { formatNumber } from "@/lib/format";
import { sortForToday, type MemberRow } from "@/server/queries/boards";
import { MemberAvatar } from "./MemberAvatar";

/** "Hôm nay ai đã giải?": thay cho thread khoe ảnh chụp màn hình trên Discord. */
export function TodayBoard({ members }: { members: MemberRow[] }) {
  const rows = sortForToday(members);
  const done = rows.filter((r) => r.today.active).length;
  return (
    <Panel
      title="Hôm nay ai đã giải?"
      actions={
        <span className="label-px text-mist">
          {done}/{rows.length} kỳ thủ đã giải
        </span>
      }
    >
      {rows.length === 0 ? (
        <p className="text-body-sm text-mist">Chưa có kỳ thủ nào kết nối Lichess. Hãy là người đầu tiên!</p>
      ) : (
        <>
          {done === 0 && <p className="mb-2 text-body-sm text-mist">Chưa ai giải hôm nay. Ai sẽ đi nước đầu tiên?</p>}
          {done === rows.length && <p className="mb-2 text-body-sm text-leaf-400">Cả hội đã giải hôm nay!</p>}
          <ul className="flex flex-col gap-2">
            {rows.map((r, i) => (
              <li key={r.username}>
                <Link
                  href={`/u/${r.username}`}
                  className="flex items-center gap-3 px-1 py-1 hover:bg-felt-700 focus-visible:bg-felt-700"
                >
                  <MemberAvatar sprite={r.pieceSprite} index={i} palette={r.today.active ? "ivory" : "ghost"} title={r.pieceName} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate-vi font-display text-ui leading-8">{r.name}</span>
                    <span className="block text-body-sm text-mist">@{r.username}</span>
                  </span>
                  {r.today.active ? (
                    <span className="chip chip-leaf">
                      <Icon name="check" /> Đã giải · {formatNumber(r.today.points)} điểm
                    </span>
                  ) : r.atRisk ? (
                    <span className="chip chip-ember">
                      <Icon name="hourglass" /> Sắp mất Streak!
                    </span>
                  ) : (
                    <span className="chip">Chưa giải</span>
                  )}
                  <span className="flex w-16 items-center justify-end gap-1">
                    <Sprite id="crown" palette={r.currentStreak > 0 ? "gold" : "iron"} scale={2} />
                    <span className="text-body text-gold-300">{r.currentStreak}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
