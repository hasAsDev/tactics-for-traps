"use client";

import { usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Client gọi API của Better Auth qua HTTP (để rate limit có hiệu lực). */
export const authClient = createAuthClient({
  plugins: [usernameClient()],
});

/**
 * Better Auth bắt buộc trường email khi đăng ký. Server luôn thay bằng địa chỉ ngẫu nhiên
 * (xem hooks trong lib/auth.ts); giá trị này chỉ để vượt qua bước kiểm tra định dạng.
 */
export const PLACEHOLDER_EMAIL = "placeholder@users.invalid";
