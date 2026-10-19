import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HeatmapPanel } from "@/components/board/HeatmapPanel";
import { Panel } from "@/components/pixel/Panel";
import { CharacterCard } from "@/components/profile/CharacterCard";
import { OwnerPanel } from "@/components/profile/OwnerPanel";
import { SevenDayLog } from "@/components/profile/SevenDayLog";
import { getProfile } from "@/server/queries/profile";
import { siteToday } from "@/server/queries/time";

export async function generateMetadata({ params }: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username.toLowerCase()}` };
}

export default function ProfilePage({ params, searchParams }: PageProps<"/u/[username]">) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <Profile params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Profile({
  params,
  searchParams,
}: {
  params: PageProps<"/u/[username]">["params"];
  searchParams: PageProps<"/u/[username]">["searchParams"];
}) {
  const [{ username }, query, today] = await Promise.all([params, searchParams, siteToday()]);
  const profile = await getProfile(username, today);
  if (!profile) notFound();
  const lichessParam = typeof query.lichess === "string" ? query.lichess : undefined;

  return (
    <div className="flex flex-col gap-6">
      <CharacterCard profile={profile} />
      <Suspense fallback={null}>
        <OwnerPanel profile={profile} lichessParam={lichessParam} />
      </Suspense>
      {profile.lichess ? (
        <Panel title="Bàn cờ 12 tháng">
          <HeatmapPanel board={profile.board} todayIso={today} />
        </Panel>
      ) : (
        <Panel variant="paper">
          <p>{profile.name} chưa kết nối Lichess.</p>
        </Panel>
      )}
      {profile.lichess && <SevenDayLog board={profile.board} />}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="panel-wood h-64 animate-pulse" />
      <div className="panel-wood h-96 animate-pulse" />
      <p className="label-px text-mist">Đang xếp quân…</p>
    </div>
  );
}
