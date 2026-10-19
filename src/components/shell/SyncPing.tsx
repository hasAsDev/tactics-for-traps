"use client";

import { useEffect } from "react";

const KEY = "tft:lastPing";
const EVERY_MS = 10 * 60_000;

/** Báo server "có người đang xem" (tối đa mỗi 10 phút một lần cho mỗi trình duyệt). */
export function SyncPing() {
  useEffect(() => {
    let last = 0;
    try {
      last = Number(window.localStorage.getItem(KEY) ?? 0);
    } catch {
      last = 0;
    }
    if (Date.now() - last < EVERY_MS) return;
    try {
      window.localStorage.setItem(KEY, String(Date.now()));
    } catch {
      // trình duyệt chặn localStorage: vẫn ping (server có giới hạn riêng)
    }
    void fetch("/api/sync/ping", { method: "POST", keepalive: true }).catch(() => {});
  }, []);
  return null;
}
