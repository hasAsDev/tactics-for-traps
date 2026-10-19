import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";

/** Đã đăng nhập thì về hồ sơ (đặt trong <Suspense> vì đọc cookie). */
export async function RedirectIfSignedIn() {
  const viewer = await getViewer();
  if (viewer) redirect(`/u/${viewer.username}`);
  return null;
}
