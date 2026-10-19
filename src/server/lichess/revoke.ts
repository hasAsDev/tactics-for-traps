import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "../../db";
import { providerLink } from "../../db/schema";
import { decryptToken, lichessTokenAad } from "../crypto/token-cipher";
import { revokeToken } from "./client";

/** Thu hồi token Lichess của user (best-effort, dùng khi xoá tài khoản hoặc ngắt kết nối). */
export async function revokeLichessForUser(userId: string): Promise<void> {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) return;
  const links = await db
    .select({ externalId: providerLink.externalId, tokenEnc: providerLink.accessTokenEnc })
    .from(providerLink)
    .where(and(eq(providerLink.userId, userId), isNotNull(providerLink.accessTokenEnc)));
  await Promise.all(
    links.map(async (link) => {
      try {
        const token = decryptToken(link.tokenEnc!, lichessTokenAad(link.externalId), key);
        await revokeToken(token);
      } catch {
        // bỏ qua: token có thể đã hết hạn hoặc Lichess không phản hồi
      }
    }),
  );
}
