import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StaticScene } from "@/components/board/StaticScene";
import { Field } from "@/components/pixel/Field";
import { Icon } from "@/components/pixel/Icon";
import { Panel } from "@/components/pixel/Panel";
import { PixelText } from "@/components/pixel/PixelText";
import { Sprite } from "@/components/pixel/Sprite";
import { XpBar } from "@/components/pixel/XpBar";
import { renderHeatmapBoard, renderHeroScene } from "@/game/art/board";
import { SPRITE_PALETTES, SPRITES, type PaletteName, type SpriteId } from "@/game/art/sprites";

export const metadata: Metadata = { title: "Bảng mẫu pixel" };

const VI_SAMPLE = "ẤẦẨẪẬ ẮẰẲẴẶ ỐỒỔỖỘ ỚỜỞỠỢ ỨỪỬỮỰ đĐ — Nguyễn Văn Đức giải 42 puzzle";

/** Dữ liệu giả có quy luật (không dùng Math.random để trang prerender được). */
function fakeLevels(weeks: number, todayIndex: number): number[] {
  return Array.from({ length: weeks * 7 }, (_, d) => {
    if (d > todayIndex) return 0;
    const wave = (d * 37 + (d % 7) * 11) % 17;
    return wave < 5 ? 0 : Math.min(6, Math.floor((wave - 4) / 2) + 1);
  });
}

export default function PixelSpecimenPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const weeks = 53;
  const todayIndex = weeks * 7 - 4;
  const board = renderHeatmapBoard({ weeks, todayIndex, levels: fakeLevels(weeks, todayIndex) });
  const small = renderHeatmapBoard({ weeks: 12, todayIndex: 12 * 7 - 4, levels: fakeLevels(12, 12 * 7 - 4) });
  const hero = renderHeroScene();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-title">Bảng mẫu pixel</h1>

      <Panel title="Logo">
        <div className="flex flex-col gap-4">
          <PixelText lines={["TACTICS FOR TRAPS"]} scale={4} />
          <PixelText lines={["TACTICS", "FOR TRAPS"]} scale={5} />
        </div>
      </Panel>

      <Panel title="Chữ">
        <div className="flex flex-col gap-2">
          <p className="text-stat font-[900] text-gold-300">45</p>
          <h2 className="text-title">Tiêu đề: {VI_SAMPLE}</h2>
          <p className="text-ui font-display">Nút / tên: {VI_SAMPLE}</p>
          <p className="text-body">Thân bài VT323: {VI_SAMPLE}</p>
          <p className="text-body-sm text-mist">Chú thích: {VI_SAMPLE}</p>
          <p className="label-px">Nhãn: Streak · Level · XP · Đã giải</p>
        </div>
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Nút & chip">
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn btn-primary">Đồng bộ ngay</button>
            <button className="btn">Kết nối Lichess</button>
            <button className="btn btn-danger">Xóa tài khoản</button>
            <button className="btn" disabled>
              Đang xếp quân…
            </button>
            <button className="btn btn-sm">Nhỏ</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip">Chưa giải</span>
            <span className="chip chip-gold">
              <Icon name="crown" /> 45 ngày
            </span>
            <span className="chip chip-ember">
              <Icon name="hourglass" /> Sắp mất Streak!
            </span>
            <span className="chip chip-leaf">
              <Icon name="check" /> Đã giải
            </span>
            <span className="chip chip-sky">Lichess</span>
          </div>
          <div className="mt-4">
            <XpBar xpIntoLevel={340} xpForNext={500} level={12} />
          </div>
        </Panel>
        <Panel title="Form">
          <form className="flex flex-col gap-4">
            <Field id="demo-user" label="Tên đăng nhập" hint="Dùng trong đường dẫn hồ sơ: /u/ten-cua-ban" placeholder="minh_99" />
            <Field id="demo-pass" label="Mật khẩu" type="password" error="Mật khẩu cần ít nhất 8 ký tự." defaultValue="1234" />
          </form>
        </Panel>
      </div>

      <Panel variant="paper" title="Biên bản (giấy)">
        <p>Ngày · Điểm · Đúng · Sai — Thứ Ba, 14/10/2026: 23 điểm, đúng 18, sai 4</p>
      </Panel>

      <Panel title="Sprite × palette">
        <div className="flex flex-wrap gap-6">
          {(Object.keys(SPRITE_PALETTES) as PaletteName[]).map((palette) => (
            <div key={palette} className="flex flex-col items-center gap-2">
              <div className="flex items-end gap-2">
                {(Object.keys(SPRITES) as SpriteId[]).map((id) => (
                  <Sprite key={id} id={id} palette={palette} scale={3} />
                ))}
              </div>
              <span className="label-px text-mist">{palette}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Bàn cờ 53 tuần (SVG tĩnh)">
        <div className="panel-felt overflow-x-auto">
          <StaticScene frame={board} scale={2} />
        </div>
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Bàn 12 tuần">
          <div className="panel-felt">
            <StaticScene frame={small} scale={2} />
          </div>
        </Panel>
        <Panel title="Hero 8×8">
          <div className="panel-felt">
            <StaticScene frame={hero} scale={3} />
          </div>
        </Panel>
      </div>
    </div>
  );
}
