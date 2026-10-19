import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LogoutButton } from "@/components/forms/LogoutButton";
import { DeleteAccountButton, DisplayNameForm, PasswordForm, UnlinkLichessButton } from "@/components/forms/SettingsForms";
import { Icon } from "@/components/pixel/Icon";
import { Panel } from "@/components/pixel/Panel";
import { ConnectLichessButton } from "@/components/profile/ConnectLichessButton";
import { getViewer } from "@/lib/session";
import { getLinkStatus } from "@/server/queries/boards";

export const metadata: Metadata = { title: "Cài đặt" };

export default function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-[40rem] flex-col gap-6">
      <h1 className="text-title">Cài đặt</h1>
      <Suspense fallback={<div className="panel-wood h-96 animate-pulse" aria-busy />}>
        <Settings />
      </Suspense>
    </div>
  );
}

async function Settings() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/settings");
  const link = await getLinkStatus(viewer.id);

  return (
    <>
      <Panel title="Hồ sơ">
        <p className="mb-3 text-body-sm text-mist">
          Tên đăng nhập: <span className="text-ivory">@{viewer.username}</span> (không đổi được)
        </p>
        <DisplayNameForm initialName={viewer.name} />
      </Panel>

      <Panel title="Lichess">
        {link ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2">
              <Icon name="chess" />
              {link.status === "needs_reauth" ? "Mất kết nối" : "Đã kết nối"}: @{link.externalUsername}
            </p>
            <div className="flex flex-wrap gap-2">
              {link.status === "needs_reauth" && <ConnectLichessButton label="Kết nối lại" className="btn btn-sm btn-primary" />}
              <UnlinkLichessButton lichessUsername={link.externalUsername} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p>Chưa kết nối. Kết nối để tự động đồng bộ lịch sử puzzle (chỉ quyền đọc puzzle).</p>
            <ConnectLichessButton />
          </div>
        )}
      </Panel>

      <Panel title="Đổi mật khẩu">
        <PasswordForm />
      </Panel>

      <Panel title="Vùng nguy hiểm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DeleteAccountButton username={viewer.username} />
          <LogoutButton />
        </div>
      </Panel>
    </>
  );
}
