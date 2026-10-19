import { NextResponse } from "next/server";
import { appOrigin, serverEnv } from "@/env";
import { getViewer } from "@/lib/session";
import {
  authorizeUrl,
  createPending,
  encodePending,
  OAUTH_COOKIE,
  OAUTH_COOKIE_MAX_AGE,
  OAUTH_COOKIE_PATH,
} from "@/server/lichess/oauth";

/**
 * Bắt đầu kết nối Lichess (POST từ form, để prefetch không ghi đè cookie state).
 * Tạo PKCE verifier + state, lưu vào cookie httpOnly rồi chuyển sang trang đồng ý của Lichess.
 */
export async function POST(request: Request) {
  const origin = appOrigin();
  if (request.headers.get("origin") !== origin) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }
  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(new URL("/login?next=/settings", origin), 303);

  const pending = createPending(viewer.id);
  const response = NextResponse.redirect(
    authorizeUrl({ origin, clientId: serverEnv().LICHESS_CLIENT_ID, pending }),
    303,
  );
  response.cookies.set(OAUTH_COOKIE, encodePending(pending), {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: OAUTH_COOKIE_PATH,
    maxAge: OAUTH_COOKIE_MAX_AGE,
  });
  return response;
}
