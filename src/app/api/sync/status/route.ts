import { connection, NextResponse, type NextRequest } from "next/server";
import { getSyncStatus } from "@/server/queries/profile";

/** Trạng thái đồng bộ gọn của một kỳ thủ (công khai, không có dữ liệu nhạy cảm). */
export async function GET(request: NextRequest) {
  await connection();
  const username = request.nextUrl.searchParams.get("u");
  if (!username) return NextResponse.json({ error: "missing_user" }, { status: 400 });
  const status = await getSyncStatus(username);
  if (!status) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}
