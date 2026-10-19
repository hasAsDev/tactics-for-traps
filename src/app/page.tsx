import Link from "next/link";
import { StaticScene } from "@/components/board/StaticScene";
import { PixelText } from "@/components/pixel/PixelText";
import { renderHeroScene } from "@/game/art/board";

export default function LobbyPage() {
  const hero = renderHeroScene();
  return (
    <div className="flex flex-col gap-6">
      <section className="panel-wood grid items-center gap-6 p-4 md:grid-cols-[auto_1fr] md:p-6">
        <div className="panel-felt flex justify-center">
          <StaticScene frame={hero} scale={3} label="Bàn cờ: Mã trắng chĩa đôi Vua và Hậu đen" />
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
            <Link href="/register" className="btn btn-primary btn-lg">
              Đăng ký
            </Link>
            <Link href="/login" className="btn btn-lg">
              Đăng nhập
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
