import { Suspense } from "react";
import { StaticScene } from "@/components/board/StaticScene";
import { HeroCta } from "@/components/lobby/HeroCta";
import { TodayBoard } from "@/components/lobby/TodayBoard";
import { TopFive } from "@/components/lobby/TopFive";
import { PixelText } from "@/components/pixel/PixelText";
import { renderHeroScene } from "@/game/art/board";
import { getMembers } from "@/server/queries/boards";
import { siteToday } from "@/server/queries/time";

export default function LobbyPage() {
  const hero = renderHeroScene();
  return (
    <div className="flex flex-col gap-6">
      <section className="panel-wood grid items-center gap-6 p-4 md:grid-cols-[auto_1fr] md:p-6">
        <div className="panel-felt flex justify-center overflow-hidden">
          <StaticScene frame={hero} scale={3} className="h-auto max-w-full" label="Bàn cờ: Mã trắng chĩa đôi Vua và Hậu đen" />
        </div>
        <div className="flex flex-col gap-4">
          <h1>
            <span className="sr-only">Tactics for Traps</span>
            <PixelText lines={["TACTICS", "FOR TRAPS"]} scale={5} className="hidden md:block" />
            <PixelText lines={["TACTICS", "FOR TRAPS"]} scale={4} className="md:hidden" />
          </h1>
          <p className="text-body">Giải puzzle Lichess mỗi ngày. Giữ Streak, lên Level, đua top cùng hội bạn.</p>
          <p className="text-body-sm text-mist">Tự động đồng bộ từ Lichess — khỏi chụp màn hình gửi Discord nữa.</p>
          <div className="flex flex-wrap gap-3">
            <Suspense fallback={<div className="h-14 w-64" aria-hidden />}>
              <HeroCta />
            </Suspense>
          </div>
        </div>
      </section>
      <Suspense fallback={<div className="panel-wood h-64 animate-pulse" aria-busy />}>
        <LobbyBoards />
      </Suspense>
    </div>
  );
}

async function LobbyBoards() {
  const today = await siteToday();
  const members = await getMembers(today);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <TodayBoard members={members} />
      <TopFive members={members} />
    </div>
  );
}
