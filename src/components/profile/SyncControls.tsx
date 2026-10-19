"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/pixel/Icon";
import { RelativeTime } from "@/components/pixel/RelativeTime";
import { syncNow } from "@/server/actions";

interface SyncControlsProps {
  username: string;
  lastSyncAt: string | null;
  importProgress: number | null;
}

interface Status {
  syncing: boolean;
  importing: boolean;
  progress: number | null;
  lastSyncAt: string | null;
}

const POLL_MS = 3000;
const POLL_LIMIT_MS = 6 * 60_000;

/**
 * Chip trạng thái + nút "Đồng bộ ngay". Trong lúc chờ một lần đồng bộ (lần đầu sau khi kết nối,
 * đang nhập lịch sử, hoặc vừa bấm nút) thì hỏi /api/sync/status mỗi 3 s; khi có lần đồng bộ mới
 * hoàn tất thì tải lại dữ liệu trang.
 */
export function SyncControls({ username, lastSyncAt, importProgress }: SyncControlsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [polling, setPolling] = useState(importProgress !== null || lastSyncAt === null);
  const [status, setStatus] = useState<Status | null>(null);
  const baseline = useRef<string | null>(lastSyncAt);

  useEffect(() => {
    if (!polling) return;
    let stop = false;
    const startedAt = Date.now();
    const tick = async () => {
      if (Date.now() - startedAt > POLL_LIMIT_MS) {
        setPolling(false);
        setMessage({ tone: "info", text: "Đồng bộ đang lâu hơn bình thường. Tải lại trang sau ít phút nhé." });
        return;
      }
      try {
        const res = await fetch(`/api/sync/status?u=${encodeURIComponent(username)}`, { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as Status;
        if (stop) return;
        setStatus(next);
        if (!next.syncing && next.lastSyncAt && next.lastSyncAt !== baseline.current) {
          baseline.current = next.lastSyncAt;
          setPolling(false);
          router.refresh();
        }
      } catch {
        // thử lại ở lần sau
      }
    };
    const timer = window.setInterval(tick, POLL_MS);
    void tick();
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [polling, username, router]);

  const busy = pending || polling;
  const progress = status?.progress ?? importProgress;
  const shownSyncAt = status?.lastSyncAt ?? lastSyncAt;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="chip">
        <Icon name={busy ? "reload" : "check"} className={busy ? "animate-spin-steps" : undefined} />
        {busy ? (
          progress !== null ? (
            <>Đang nhập lịch sử… {Math.round(progress * 100)}%</>
          ) : (
            "Đang đồng bộ…"
          )
        ) : shownSyncAt ? (
          <>
            Đã đồng bộ <RelativeTime iso={shownSyncAt} />
          </>
        ) : (
          "Chưa đồng bộ"
        )}
      </span>
      <button
        type="button"
        className="btn btn-sm"
        disabled={busy}
        data-pending={busy || undefined}
        onClick={() =>
          startTransition(async () => {
            setMessage(null);
            const result = await syncNow();
            if (result.ok) {
              baseline.current = status?.lastSyncAt ?? lastSyncAt;
              setPolling(true);
            } else {
              setMessage({ tone: "error", text: result.error });
            }
          })
        }
      >
        <Icon name="reload" />
        Đồng bộ ngay
      </button>
      {message && (
        <span role="status" className={message.tone === "error" ? "text-body-sm text-ember-400" : "text-body-sm text-mist"}>
          {message.text}
        </span>
      )}
    </div>
  );
}
