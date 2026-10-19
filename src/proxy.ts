import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Kiểm tra lạc quan: chưa có cookie session thì chuyển về trang đăng nhập.
 * Trang /settings vẫn tự kiểm tra session thật (cookie có thể đã hết hạn).
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/settings/:path*"],
};
