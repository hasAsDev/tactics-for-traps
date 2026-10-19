"use server";

import { and, eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { after } from "next/server";
import { db } from "@/db";
import { providerLink } from "@/db/schema";
import { getViewer } from "@/lib/session";
import { revokeLichessForUser } from "./lichess/revoke";
import { recomputeUser } from "./stats/recompute";
import { requestDeadline } from "./sync/deadline";
import { syncLink } from "./sync/sync-link";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const MANUAL_COOLDOWN_SEC = 60;

/** "Đồng bộ ngay": chạy nền bằng after(); client theo dõi /api/sync/status. */
export async function syncNow(): Promise<ActionResult> {
  const deadline = requestDeadline();
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Bạn cần đăng nhập." };
  const claimed = await db
    .update(providerLink)
    .set({ manualSyncAt: sql`now()`, nextAttemptAt: null })
    .where(
      and(
        eq(providerLink.userId, viewer.id),
        sql`(${providerLink.manualSyncAt} is null or ${providerLink.manualSyncAt} < now() - make_interval(secs => ${MANUAL_COOLDOWN_SEC}))`,
      ),
    )
    .returning({ id: providerLink.id });
  if (claimed.length === 0) {
    const [link] = await db.select({ id: providerLink.id }).from(providerLink).where(eq(providerLink.userId, viewer.id));
    return link
      ? { ok: false, error: "Vừa đồng bộ rồi, thử lại sau ít phút." }
      : { ok: false, error: "Bạn chưa kết nối Lichess." };
  }
  after(async () => {
    for (const { id } of claimed) await syncLink(id, "manual", deadline).catch(() => {});
  });
  return { ok: true };
}

/** Ngắt kết nối Lichess: thu hồi token, xoá link và dữ liệu đã đồng bộ, rồi tính lại thống kê. */
export async function unlinkLichess(): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Bạn cần đăng nhập." };
  await revokeLichessForUser(viewer.id);
  await db.delete(providerLink).where(eq(providerLink.userId, viewer.id));
  await recomputeUser(viewer.id);
  refresh();
  return { ok: true, message: "Đã ngắt kết nối Lichess." };
}
