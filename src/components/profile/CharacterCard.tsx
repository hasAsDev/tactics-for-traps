import { Icon } from "@/components/pixel/Icon";
import { Sprite } from "@/components/pixel/Sprite";
import { XpBar } from "@/components/pixel/XpBar";
import type { SpriteId } from "@/game/art/sprites";
import { formatNumber } from "@/lib/format";
import type { ProfileDTO } from "@/server/queries/profile";

function Record({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="frame flex flex-col bg-felt-900 px-2 py-1">
      <span className="label-px text-mist">{label}</span>
      <span className="text-body text-ivory">{value === undefined || value === "" ? "—" : value}</span>
    </div>
  );
}

/** Thẻ nhân vật: quân cờ theo level, Level/XP, vương miện Streak và kỷ lục. */
export function CharacterCard({ profile }: { profile: ProfileDTO }) {
  const snap = profile.lichess?.snapshot;
  return (
    <section aria-labelledby="hero-name" className="panel-wood p-3 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="frame flex h-36 w-36 shrink-0 items-end justify-center self-center bg-board-light pb-2 md:self-auto">
          <Sprite id={profile.pieceSprite as SpriteId} palette={profile.level >= 30 ? "gold" : "ivory"} scale={8} title={profile.pieceName} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 id="hero-name" className="text-title truncate-vi [text-shadow:0_2px_0_var(--color-ink)]">
            {profile.name}
          </h1>
          <p className="flex flex-wrap items-center gap-2 text-body-sm text-mist">
            <span>@{profile.username}</span>
            {profile.lichess && (
              <a
                href={profile.lichess.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sky-300 underline underline-offset-4"
              >
                <Icon name="chess" /> lichess.org/@/{profile.lichess.username} <Icon name="external" />
              </a>
            )}
          </p>
          <p className="font-display text-ui">
            Level {profile.level} · <span className="text-gold-300">{profile.pieceName}</span>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <XpBar xpIntoLevel={profile.xpIntoLevel} xpForNext={profile.xpForNext} level={profile.level} />
            <span className="text-body-sm text-mist">
              {formatNumber(profile.xpIntoLevel)}/{formatNumber(profile.xpForNext)} XP
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 md:flex-col md:items-end">
          <div className="flex items-center gap-2">
            <Sprite id="crown" palette={profile.currentStreak > 0 ? "gold" : "iron"} scale={4} />
            <span className="text-stat font-[900] text-gold-300">{profile.currentStreak}</span>
          </div>
          <span className="label-px text-mist">{profile.currentStreak > 0 ? "ngày Streak" : "Chưa có Streak"}</span>
          {profile.atRisk && (
            <span className="chip chip-ember">
              <Icon name="hourglass" /> Hôm nay chưa giải
            </span>
          )}
          {profile.todayActive && (
            <span className="chip chip-leaf">
              <Icon name="check" /> Đã giữ Streak hôm nay
            </span>
          )}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Record label="Streak dài nhất" value={profile.longestStreak} />
        <Record label="Ngày hoạt động" value={formatNumber(profile.activeDays)} />
        <Record label="Puzzle rating" value={snap?.puzzleRating} />
        <Record label="Puzzle Streak" value={snap?.pstreakBest} />
        <Record label="Storm" value={snap?.stormBest} />
        <Record label="Racer" value={snap?.racerBest} />
      </div>
    </section>
  );
}
