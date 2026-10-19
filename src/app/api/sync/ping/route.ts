import { randomUUID } from "node:crypto";
import { after, NextResponse } from "next/server";
import { appOrigin } from "@/env";
import { requestDeadline } from "@/server/sync/deadline";
import { runSyncBatch } from "@/server/sync/batch";
import { tryLease } from "@/server/sync/leases";

export const maxDuration = 300;

const THROTTLE_MS = 10 * 60_000;

/**
 * Có người vào web: tối đa mỗi 10 phút (toàn hệ thống) chạy một batch cho các link cũ hơn 10 phút.
 * Không nhận tham số, nên không thể bị dùng để nhắm vào một tài khoản cụ thể.
 */
export async function POST(request: Request) {
  if (request.headers.get("origin") !== appOrigin()) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }
  const deadline = requestDeadline();
  const scheduled = await tryLease("ping-throttle", randomUUID(), THROTTLE_MS);
  if (scheduled) {
    after(async () => {
      await runSyncBatch("ping", deadline, THROTTLE_MS).catch(() => {});
    });
  }
  return NextResponse.json({ scheduled }, { status: 202, headers: { "Cache-Control": "no-store" } });
}
