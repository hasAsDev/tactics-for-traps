import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { providerLink } from "@/db/schema";
import { serverEnv } from "@/env";
import { encryptToken, lichessTokenAad } from "../crypto/token-cipher";
import { revokeToken } from "./client";

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export type LinkOutcome =
  | { kind: "linked"; linkId: number }
  | { kind: "relinked"; linkId: number }
  | { kind: "taken" }
  | { kind: "other-account"; currentUsername: string };

/**
 * Lưu kết nối Lichess cho user sau khi OAuth thành công.
 * - Cùng tài khoản Lichess đã kết nối → thay token, giữ nguyên con trỏ đồng bộ.
 * - User đang kết nối tài khoản Lichess khác → từ chối (phải ngắt kết nối trước).
 * - Tài khoản Lichess đã thuộc user khác → từ chối.
 */
export async function saveLichessLink(params: {
  userId: string;
  externalId: string;
  externalUsername: string;
  accessToken: string;
  expiresInSec: number | null;
}): Promise<LinkOutcome> {
  const key = serverEnv().TOKEN_ENCRYPTION_KEY;
  const externalId = params.externalId.toLowerCase();
  const tokenEnc = encryptToken(params.accessToken, lichessTokenAad(externalId), key);
  const now = Date.now();
  const tokenExpiresAt = new Date(now + (params.expiresInSec ?? 365 * 24 * 3600) * 1000);

  const [existing] = await db
    .select({ id: providerLink.id, externalId: providerLink.externalId, externalUsername: providerLink.externalUsername })
    .from(providerLink)
    .where(and(eq(providerLink.userId, params.userId), eq(providerLink.provider, "lichess")));

  if (existing) {
    if (existing.externalId !== externalId) {
      await revokeToken(params.accessToken).catch(() => {});
      return { kind: "other-account", currentUsername: existing.externalUsername };
    }
    await db
      .update(providerLink)
      .set({
        accessTokenEnc: tokenEnc,
        tokenExpiresAt,
        externalUsername: params.externalUsername,
        status: "active",
        lastError: null,
        failCount: 0,
        nextAttemptAt: null,
      })
      .where(eq(providerLink.id, existing.id));
    return { kind: "relinked", linkId: existing.id };
  }

  const inserted = await db
    .insert(providerLink)
    .values({
      userId: params.userId,
      provider: "lichess",
      externalId,
      externalUsername: params.externalUsername,
      accessTokenEnc: tokenEnc,
      tokenExpiresAt,
      floorMs: now - YEAR_MS,
    })
    .onConflictDoNothing()
    .returning({ id: providerLink.id });

  if (inserted.length === 0) {
    await revokeToken(params.accessToken).catch(() => {});
    return { kind: "taken" };
  }
  return { kind: "linked", linkId: inserted[0].id };
}
