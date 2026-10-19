import Link from "next/link";
import { Panel } from "@/components/pixel/Panel";
import { Sprite } from "@/components/pixel/Sprite";
import { sortMembers, type MemberRow } from "@/server/queries/boards";
import { MemberAvatar } from "./MemberAvatar";

export function TopFive({ members }: { members: MemberRow[] }) {
  const rows = sortMembers(members, "streak").slice(0, 5);
  return (
    <Panel title="Top 5 · Streak">
      {rows.length === 0 ? (
        <p className="text-body-sm text-mist">Chưa có kỳ thủ nào.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <li key={r.username}>
              <Link href={`/u/${r.username}`} className="flex items-center gap-2 px-1 hover:bg-felt-700">
                <span className={`w-6 text-body ${i === 0 ? "text-gold-300" : i === 1 ? "text-ivory" : i === 2 ? "text-wood-400" : "text-mist"}`}>
                  {i + 1}
                </span>
                <MemberAvatar sprite={r.pieceSprite} index={i} title={r.pieceName} />
                <span className="min-w-0 flex-1 truncate-vi">{r.name}</span>
                <Sprite id="crown" palette={r.currentStreak > 0 ? "gold" : "iron"} scale={2} />
                <span className="w-10 text-right text-gold-300">{r.currentStreak}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
      <Link href="/leaderboard" className="btn btn-sm mt-3">
        Xem bảng xếp hạng
      </Link>
    </Panel>
  );
}
