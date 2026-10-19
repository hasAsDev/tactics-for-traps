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

/** Chip trạng thái + nút "Đồng bộ ngay"; trong lúc đồng bộ thì hỏi /api/sync/status mỗi 3 s. */
export function SyncControls({ username, lastSyncAt, importProgress }: SyncControlsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [polling, setPolling] = useState(importProgress !== null);
  const [status, setStatus] = useState<Status | null>(null);
  const seenBusy = useRef(false);

  useEffect(() => {
    if (!polling) return;
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/sync/status?u=${encodeURIComponent(username)}`, { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as Status;
        if (stop) return;
        setStatus(next);
        if (next.syncing || next.importing) seenBusy.current = true;
        if (!next.syncing && (seenBusy.current || !next.importing)) {
          setPolling(false);
          seenBusy.current = false;
          router.refresh();
        }
      } catch {
        // thử lại ở lần sau
      }
    };
    const timer = window.setInterval(tick, 3000);
    void tick();
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [polling, username, router]);

  const busy = pending || polling;
  const progress = status?.progress ?? importProgress;

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
        ) : (
          <>
            Đã đồng bộ <RelativeTime iso={status?.lastSyncAt ?? lastSyncAt} fallback="—" />
          </>
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
              seenBusy.current = false;
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
