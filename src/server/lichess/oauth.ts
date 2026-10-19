import "server-only";
import { LICHESS_ORIGIN } from "./client";
import { codeChallengeS256, createCodeVerifier, createState } from "./pkce";

/** Cookie ngắn hạn giữ state + PKCE verifier trong lúc người dùng ở trang đồng ý của Lichess. */
export const OAUTH_COOKIE = "tft_lichess_oauth";
export const OAUTH_COOKIE_PATH = "/api/lichess";
export const OAUTH_COOKIE_MAX_AGE = 600;
export const LICHESS_SCOPE = "puzzle:read";

export interface OAuthPending {
  state: string;
  verifier: string;
  userId: string;
  createdAt: number;
}

export function createPending(userId: string): OAuthPending {
  return { state: createState(), verifier: createCodeVerifier(), userId, createdAt: Date.now() };
}

export function encodePending(p: OAuthPending): string {
  return Buffer.from(JSON.stringify(p), "utf8").toString("base64url");
}

export function decodePending(raw: string | undefined): OAuthPending | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<OAuthPending>;
    if (
      typeof value.state === "string" &&
      typeof value.verifier === "string" &&
      typeof value.userId === "string" &&
      typeof value.createdAt === "number"
    ) {
      return value as OAuthPending;
    }
  } catch {
    // cookie hỏng
  }
  return null;
}

export function redirectUri(origin: string): string {
  return `${origin}/api/lichess/callback`;
}

export function authorizeUrl(params: { origin: string; clientId: string; pending: OAuthPending }): string {
  const url = new URL(`${LICHESS_ORIGIN}/oauth`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", redirectUri(params.origin));
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("code_challenge", codeChallengeS256(params.pending.verifier));
  url.searchParams.set("scope", LICHESS_SCOPE);
  url.searchParams.set("state", params.pending.state);
  return url.toString();
}
