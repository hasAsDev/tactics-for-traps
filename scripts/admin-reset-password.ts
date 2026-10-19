// Đặt lại mật khẩu cho một kỳ thủ (web không dùng email nên đây là cách khôi phục).
// Chạy: npm run admin:reset-password -- <username>
// Script tạo mật khẩu tạm ngẫu nhiên, in ra MỘT lần và đăng xuất mọi thiết bị của người đó.
// Để chạy với DB production: đặt DATABASE_URL bằng URL Neon trong shell trước khi chạy.
import { randomBytes } from "node:crypto";

try {
  process.loadEnvFile(".env.local");
} catch {
  // không có .env.local
}

async function main() {
  const username = process.argv[2]?.toLowerCase();
  if (!username) {
    console.error("Cách dùng: npm run admin:reset-password -- <username>");
    process.exit(1);
  }
  const { eq } = await import("drizzle-orm");
  const { db, pool } = await import("../src/db");
  const { user } = await import("../src/db/schema");
  const { auth } = await import("../src/lib/auth");

  const [row] = await db.select({ id: user.id, name: user.name }).from(user).where(eq(user.username, username));
  if (!row) {
    console.error(`Không tìm thấy @${username}`);
    await pool.end();
    process.exit(1);
  }
  const ctx = await auth.$context;
  const temporary = randomBytes(9).toString("base64url");
  await ctx.internalAdapter.updatePassword(row.id, await ctx.password.hash(temporary));
  await ctx.internalAdapter.deleteUserSessions(row.id);
  await pool.end();
  console.log(`Đã đặt lại mật khẩu cho @${username} (${row.name}). Mật khẩu tạm: ${temporary}`);
  console.log("Nhắn người đó đăng nhập rồi đổi mật khẩu trong Cài đặt.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
