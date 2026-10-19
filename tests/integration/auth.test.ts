import { beforeEach, describe, expect, it } from "vitest";
import { auth } from "@/lib/auth";
import { resetDb } from "./helpers";

beforeEach(async () => {
  await resetDb();
});

const password = "test-password-123";

describe("hook đăng ký của Better Auth (cả khi gọi auth.api)", () => {
  it("luôn thay email bằng địa chỉ ngẫu nhiên .invalid và chuẩn hoá tên", async () => {
    const res = await auth.api.signUpEmail({
      body: { email: "victim@example.com", username: "MinhTest", name: "  Đức   Anh ".normalize("NFD"), password },
    });
    expect(res.user.email).toMatch(/^[0-9a-f-]{36}@users\.invalid$/);
    expect(res.user.name).toBe("Đức Anh");
    expect((res.user as { username?: string }).username).toBe("minhtest");
  });

  it("từ chối ảnh đại diện, tên dành riêng và tên hiển thị có ký tự điều khiển", async () => {
    await expect(
      auth.api.signUpEmail({ body: { email: "a@b.c", username: "imguser", name: "A", password, image: "https://x/y.png" } }),
    ).rejects.toMatchObject({ body: { code: "FIELD_NOT_ALLOWED" } });
    await expect(
      auth.api.signUpEmail({ body: { email: "a@b.c", username: "settings", name: "A", password } }),
    ).rejects.toMatchObject({ body: { code: "INVALID_USERNAME" } });
    await expect(
      auth.api.signUpEmail({ body: { email: "a@b.c", username: "bidi", name: "Admin‮", password } }),
    ).rejects.toMatchObject({ body: { code: "DISPLAY_NAME_INVALID" } });
  });

  it("đóng đăng ký bằng biến môi trường", async () => {
    process.env.SIGNUP_DISABLED = "1";
    try {
      await expect(
        auth.api.signUpEmail({ body: { email: "a@b.c", username: "closed", name: "A", password } }),
      ).rejects.toMatchObject({ body: { code: "SIGNUP_DISABLED" } });
    } finally {
      delete process.env.SIGNUP_DISABLED;
    }
  });
});
