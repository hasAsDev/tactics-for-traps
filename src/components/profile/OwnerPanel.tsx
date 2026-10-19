import { Icon } from "@/components/pixel/Icon";
import { getViewer } from "@/lib/session";
import type { ProfileDTO } from "@/server/queries/profile";
import { ConnectLichessButton } from "./ConnectLichessButton";
import { SyncControls } from "./SyncControls";

const LICHESS_MESSAGES: Record<string, { tone: "ok" | "warn"; text: string }> = {
  connected: { tone: "ok", text: "Đã kết nối Lichess! Đang đồng bộ lịch sử puzzle, có thể mất vài phút." },
  denied: { tone: "warn", text: "Bạn đã từ chối cấp quyền trên Lichess." },
  expired: { tone: "warn", text: "Phiên kết nối đã hết hạn. Thử lại nhé." },
  invalid: { tone: "warn", text: "Yêu cầu kết nối không hợp lệ. Thử lại nhé." },
  taken: { tone: "warn", text: "Tài khoản Lichess này đã được một người khác kết nối." },
  other: { tone: "warn", text: "Bạn đang kết nối một tài khoản Lichess khác. Hãy ngắt kết nối trước trong Cài đặt." },
  error: { tone: "warn", text: "Kết nối Lichess thất bại. Thử lại sau nhé." },
};

/** Phần chỉ chủ hồ sơ thấy: trạng thái đồng bộ, nút đồng bộ, CTA kết nối, banner kết nối lại. */
export async function OwnerPanel({ profile, lichessParam }: { profile: ProfileDTO; lichessParam?: string }) {
  const viewer = await getViewer();
  if (!viewer || viewer.id !== profile.id) return null;
  const notice = lichessParam ? LICHESS_MESSAGES[lichessParam] : undefined;
  const link = profile.lichess;

  return (
    <div className="flex flex-col gap-3">
      {notice && (
        <p role="status" className={notice.tone === "ok" ? "chip chip-leaf self-start" : "chip chip-ember self-start"}>
          <Icon name={notice.tone === "ok" ? "check" : "alert"} />
          {notice.text}
        </p>
      )}
      {!link ? (
        <section className="panel-wood flex flex-col gap-3 p-4">
          <h2 className="text-title">Bàn cờ còn trống</h2>
          <p>Kết nối tài khoản Lichess để tự động đồng bộ lịch sử puzzle và bắt đầu xây tháp.</p>
          <p className="text-body-sm text-mist">
            Web chỉ xin quyền đọc lịch sử puzzle (puzzle:read). Bạn đăng nhập và đồng ý ngay trên lichess.org.
          </p>
          <ConnectLichessButton />
        </section>
      ) : link.status === "needs_reauth" ? (
        <section className="panel-wood flex flex-col gap-3 p-4">
          <h2 className="text-title text-ember-400">Mất kết nối với Lichess</h2>
          <p>Quyền truy cập đã hết hạn hoặc bị thu hồi. Kết nối lại để tiếp tục đồng bộ puzzle.</p>
          <ConnectLichessButton label="Kết nối lại" />
        </section>
      ) : (
        <SyncControls username={profile.username} lastSyncAt={link.lastSyncAt} importProgress={link.importProgress} />
      )}
    </div>
  );
}
