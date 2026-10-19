import { Sprite } from "@/components/pixel/Sprite";
import type { PaletteName, SpriteId } from "@/game/art/sprites";

/** Ô vuông bàn cờ chứa quân của người chơi (xen kẽ ô sáng/tối theo vị trí trong danh sách). */
export function MemberAvatar({
  sprite,
  index,
  palette = "ivory",
  title,
}: {
  sprite: string;
  index: number;
  palette?: PaletteName;
  title?: string;
}) {
  return (
    <span
      className={`frame flex h-10 w-10 shrink-0 items-end justify-center pb-[2px] ${index % 2 === 0 ? "bg-board-light" : "bg-board-dark"}`}
    >
      <Sprite id={sprite as SpriteId} palette={palette} scale={2} title={title} />
    </span>
  );
}
