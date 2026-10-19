"use client";

import { useEffect, useState } from "react";
import { formatRelative } from "@/lib/format";

/** "5 phút trước"… tính trong effect (không gọi Date.now() lúc render). */
export function RelativeTime({ iso, fallback = "" }: { iso: string | null; fallback?: string }) {
  const [text, setText] = useState<string>(fallback);
  useEffect(() => {
    if (!iso) return;
    const tick = () => setText(formatRelative(new Date(iso), Date.now()));
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, [iso]);
  return <time dateTime={iso ?? undefined}>{iso ? text : fallback}</time>;
}
