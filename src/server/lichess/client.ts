import { parseNdjson } from "./ndjson";
import {
  accountResponse,
  activityEntry,
  activityResponse,
  puzzleActivityEntry,
  tokenResponse,
  userPublicResponse,
  type ActivityEntry,
  type PuzzleActivityEntry,
  type UserPublic,
} from "./schemas";

/**
 * Client HTTP tối giản cho Lichess. Quy tắc của Lichess: mỗi lúc một request,
 * gặp 429 thì đợi đủ 1 phút. Không bao giờ log header Authorization.
 */

export const LICHESS_ORIGIN = "https://lichess.org";
const REQUEST_TIMEOUT_MS = 15_000;

export class LichessUnauthorizedError extends Error {
  constructor() {
    super("Lichess từ chối token (401)");
    this.name = "LichessUnauthorizedError";
  }
}

export class LichessRateLimitedError extends Error {
  constructor() {
    super("Lichess đang giới hạn tần suất (429)");
    this.name = "LichessRateLimitedError";
  }
}

export class LichessHttpError extends Error {
  constructor(public readonly status: number, message?: string) {
    super(message ?? `Lichess trả lỗi HTTP ${status}`);
    this.name = "LichessHttpError";
  }
}

function userAgent(): string {
  const site = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return `TacticsForTraps/0.1 (+${site})`;
}

function headers(token?: string, accept = "application/json"): HeadersInit {
  const h: Record<string, string> = { Accept: accept, "User-Agent": userAgent() };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function ensureOk(res: Response): Promise<Response> {
  if (res.ok) return res;
  await res.body?.cancel().catch(() => {});
  if (res.status === 401) throw new LichessUnauthorizedError();
  if (res.status === 429) throw new LichessRateLimitedError();
  throw new LichessHttpError(res.status);
}

function timeoutSignal(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export interface TokenExchange {
  accessToken: string;
  expiresInSec: number | null;
}

/** Đổi authorization code lấy access token (PKCE, không có client secret). */
export async function exchangeCode(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
}): Promise<TokenExchange> {
  const res = await fetch(`${LICHESS_ORIGIN}/api/token`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      code_verifier: params.codeVerifier,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
    }),
    signal: timeoutSignal(),
  });
  if (res.status === 400) {
    await res.body?.cancel().catch(() => {});
    throw new LichessHttpError(400, "Lichess từ chối mã xác thực (invalid_grant)");
  }
  const json = tokenResponse.parse(await (await ensureOk(res)).json());
  return { accessToken: json.access_token, expiresInSec: json.expires_in ?? null };
}

export async function getAccount(token: string): Promise<{ id: string; username: string }> {
  const res = await fetch(`${LICHESS_ORIGIN}/api/account`, {
    headers: headers(token),
    signal: timeoutSignal(),
  });
  return accountResponse.parse(await (await ensureOk(res)).json());
}

/** Thu hồi token (best-effort). */
export async function revokeToken(token: string): Promise<void> {
  const res = await fetch(`${LICHESS_ORIGIN}/api/token`, {
    method: "DELETE",
    headers: headers(token),
    signal: timeoutSignal(),
  });
  if (res.status === 401) return; // token đã chết sẵn
  await ensureOk(res);
  await res.body?.cancel().catch(() => {});
}

/**
 * Stream lịch sử puzzle (mới → cũ). `since` bao gồm, `before` loại trừ.
 * Server Lichess chỉ trả 20 dòng/giây, nên bên gọi phải truyền `signal` để cắt theo ngân sách thời gian.
 */
export async function* puzzleActivity(
  token: string,
  range: { since: number; before: number },
  options: { signal?: AbortSignal; idleMs?: number; onBadLine?: (line: string) => void } = {},
): AsyncGenerator<PuzzleActivityEntry> {
  const url = new URL(`${LICHESS_ORIGIN}/api/puzzle/activity`);
  url.searchParams.set("since", String(range.since));
  url.searchParams.set("before", String(range.before));
  const res = await ensureOk(
    await fetch(url, { headers: headers(token, "application/x-ndjson"), signal: options.signal }),
  );
  if (!res.body) return;
  for await (const raw of parseNdjson<unknown>(res.body, {
    idleMs: options.idleMs,
    onBadLine: options.onBadLine,
  })) {
    const parsed = puzzleActivityEntry.safeParse(raw);
    if (parsed.success) yield parsed.data;
    else options.onBadLine?.(JSON.stringify(raw).slice(0, 200));
  }
}

/** Feed hoạt động công khai: tối đa 7 ngày có hoạt động gần nhất, ngày theo UTC. */
export async function userActivity(username: string): Promise<ActivityEntry[]> {
  const res = await fetch(`${LICHESS_ORIGIN}/api/user/${encodeURIComponent(username)}/activity`, {
    headers: headers(),
    signal: timeoutSignal(),
  });
  const list = activityResponse.parse(await (await ensureOk(res)).json());
  const out: ActivityEntry[] = [];
  for (const item of list) {
    const parsed = activityEntry.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

export async function userPublic(username: string): Promise<UserPublic> {
  const res = await fetch(`${LICHESS_ORIGIN}/api/user/${encodeURIComponent(username)}`, {
    headers: headers(),
    signal: timeoutSignal(),
  });
  return userPublicResponse.parse(await (await ensureOk(res)).json());
}
