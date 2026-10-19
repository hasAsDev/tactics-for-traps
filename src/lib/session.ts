import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "./auth";

/** Người đang xem trang (chỉ các trường an toàn để đưa xuống client). */
export interface Viewer {
  id: string;
  username: string;
  name: string;
}

/**
 * Đọc session của request hiện tại (một lần mỗi request).
 * Chỉ gọi trong component đã bọc <Suspense>, Server Action hoặc Route Handler.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name } = session.user;
  const username = (session.user as { username?: string | null }).username ?? "";
  return { id, username, name };
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw new Error("UNAUTHENTICATED");
  return viewer;
}
