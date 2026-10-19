import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MiniHeatmap } from "@/components/board/MiniHeatmap";
import { MemberAvatar } from "@/components/lobby/MemberAvatar";
import { Sprite } from "@/components/pixel/Sprite";
import { formatNumber } from "@/lib/format";
import { getMembers, sortMembers, type LeaderboardTab } from "@/server/queries/boards";
import { siteToday } from "@/server/queries/time";

export const metadata: Metadata = { title: "Bảng xếp hạng" };

const TABS: { id: LeaderboardTab; label: string }[] = [
  { id: "streak", label: "Streak" },
  { id: "week", label: "7 ngày" },
  { id: "xp", label: "XP" },
];

export default function LeaderboardPage({ searchParams }: PageProps<"/leaderboard">) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title">Bảng xếp hạng</h1>
      <Suspense fallback={<div className="panel-paper h-96 animate-pulse" aria-busy />}>
        <Leaderboard searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Leaderboard({ searchParams }: { searchParams: PageProps<"/leaderboard">["searchParams"] }) {
  const query = await searchParams;
  const tab: LeaderboardTab = query.tab === "week" || query.tab === "xp" ? query.tab : "streak";
  const today = await siteToday();
  const rows = sortMembers(await getMembers(today), tab);
  /** Huy chương vàng / bạc / đồng cho ba hạng đầu (chữ mực trên nền màu, đọc rõ trên giấy). */
  const medal = ["bg-gold-500", "bg-mist", "bg-wood-400"];

  return (
    <>
      <nav aria-label="Xếp theo" className="frame flex self-start bg-wood-900">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.id === "streak" ? "/leaderboard" : `/leaderboard?tab=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={
              tab === t.id
                ? "label-px flex min-h-11 items-center bg-paper px-4 text-ink shadow-[inset_0_2px_0_0_var(--color-ivory)]"
                : "label-px flex min-h-11 items-center px-4 text-ivory hover:bg-wood-800"
            }
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <section className="panel-paper overflow-x-auto p-3 md:p-4">
        {rows.length === 0 ? (
          <p>Chưa có kỳ thủ nào. Hãy là người đầu tiên!</p>
        ) : (
          <table className="w-full text-left text-body">
            <thead>
              <tr className="border-b-2 border-paper-line text-body-sm text-ink-muted">
                <th scope="col" className="py-1 pr-2 font-normal">#</th>
                <th scope="col" className="px-2 font-normal">Kỳ thủ</th>
                <th scope="col" className={`px-2 font-normal ${tab === "streak" ? "text-ink" : ""}`}>Streak</th>
                <th scope="col" className="hidden px-2 font-normal sm:table-cell">Kỷ lục</th>
                <th scope="col" className={`hidden px-2 font-normal sm:table-cell ${tab === "week" ? "text-ink" : ""}`}>7 ngày</th>
                <th scope="col" className={`hidden px-2 font-normal md:table-cell ${tab === "xp" ? "text-ink" : ""}`}>XP</th>
                <th scope="col" className="hidden px-2 font-normal lg:table-cell">12 tuần</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.username} className="border-b-2 border-paper-line">
                  <td className="py-2 pr-2">
                    {medal[i] ? (
                      <span className={`frame inline-flex h-8 w-8 items-center justify-center font-display text-ui leading-none text-ink ${medal[i]}`}>
                        {i + 1}
                      </span>
                    ) : (
                      <span className="inline-flex w-8 justify-center">{i + 1}</span>
                    )}
                  </td>
                  <td className="px-2">
                    <Link href={`/u/${r.username}`} className="flex items-center gap-2">
                      <MemberAvatar sprite={r.pieceSprite} index={i} title={r.pieceName} />
                      <span className="min-w-0">
                        <span className="block truncate-vi">{r.name}</span>
                        <span className="block text-body-sm text-ink-muted">
                          {r.pieceName} · Level {r.level}
                          <span className="sm:hidden"> · 7 ngày {formatNumber(r.weekPoints)}</span>
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-2">
                    <span className="flex items-center gap-1">
                      <Sprite id="crown" palette={r.currentStreak > 0 ? "gold" : "iron"} scale={2} />
                      {r.currentStreak}
                    </span>
                  </td>
                  <td className="hidden px-2 sm:table-cell">{r.longestStreak}</td>
                  <td className="hidden px-2 sm:table-cell">{formatNumber(r.weekPoints)}</td>
                  <td className="hidden px-2 md:table-cell">{formatNumber(r.xp)}</td>
                  <td className="hidden px-2 lg:table-cell">
                    <MiniHeatmap levels={r.recent} label={`Hoạt động 12 tuần của ${r.name}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
