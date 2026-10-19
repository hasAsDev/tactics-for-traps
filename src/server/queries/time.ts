import "server-only";
import { connection } from "next/server";
import { siteDateOf } from "@/game/core/time";

/** "Hôm nay" theo giờ site. Gọi connection() để Next không tính sẵn lúc build. */
export async function siteToday(): Promise<string> {
  await connection();
  return siteDateOf(new Date());
}
