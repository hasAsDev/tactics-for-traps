import { and, eq } from "drizzle-orm";
import { after, connection, NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { providerLink } from "@/db/schema";
import { appOrigin, serverEnv } from "@/env";
import { getViewer } from "@/lib/session";
import { exchangeCode, getAccount, LichessHttpError } from "@/server/lichess/client";
import { saveLichessLink } from "@/server/lichess/link";
import {
  decodePending,
  OAUTH_COOKIE,
  OAUTH_COOKIE_MAX_AGE,
  OAUTH_COOKIE_PATH,
  redirectUri,
} from "@/server/lichess/oauth";
import { safeEqual } from "@/server/lichess/pkce";
import { requestDeadline } from "@/server/sync/deadline";
import { syncLink } from "@/server/sync/sync-link";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  await connection();
  const deadline = requestDeadline();
  const origin = appOrigin();
  const viewer = await getViewer();
  const params = request.nextUrl.searchParams;

  const finish = (status: string, path = viewer ? `/u/${viewer.username}` : "/settings") => {
    const url = new URL(path, origin);
    url.searchParams.set("lichess", status);
    const response = NextResponse.redirect(url, 303);
    response.cookies.set(OAUTH_COOKIE, "", { path: OAUTH_COOKIE_PATH, maxAge: 0 });
    return response;
  };

  if (!viewer) return finish("signin", "/login");

  const pending = decodePending(request.cookies.get(OAUTH_COOKIE)?.value);
  const state = params.get("state") ?? "";
  if (!pending || Date.now() - pending.createdAt > OAUTH_COOKIE_MAX_AGE * 1000) return finish("expired");
  if (!safeEqual(pending.state, state) || pending.userId !== viewer.id) return finish("invalid");
  if (params.get("error")) return finish("denied");

  const code = params.get("code");
  if (!code) return finish("invalid");

  let accessToken: string;
  let expiresInSec: number | null;
  try {
    ({ accessToken, expiresInSec } = await exchangeCode({
      code,
      codeVerifier: pending.verifier,
      redirectUri: redirectUri(origin),
      clientId: serverEnv().LICHESS_CLIENT_ID,
    }));
  } catch (error) {
    // Mã chỉ dùng được một lần: callback bị gửi lại mà link đã hoạt động thì coi như xong.
    if (error instanceof LichessHttpError && error.status === 400) {
      const [active] = await db
        .select({ id: providerLink.id })
        .from(providerLink)
        .where(and(eq(providerLink.userId, viewer.id), eq(providerLink.status, "active")));
      if (active) return finish("connected");
    }
    return finish("error");
  }

  let account: { id: string; username: string };
  try {
    account = await getAccount(accessToken);
  } catch {
    return finish("error");
  }

  const outcome = await saveLichessLink({
    userId: viewer.id,
    externalId: account.id,
    externalUsername: account.username,
    accessToken,
    expiresInSec,
  });
  if (outcome.kind === "taken") return finish("taken");
  if (outcome.kind === "other-account") return finish("other");

  after(async () => {
    await syncLink(outcome.linkId, "link", deadline).catch(() => {});
  });
  return finish("connected");
}
