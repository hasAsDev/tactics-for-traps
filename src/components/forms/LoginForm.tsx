"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Field } from "@/components/pixel/Field";
import { SubmitButton } from "@/components/pixel/SubmitButton";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";

/** Chỉ cho chuyển hướng về đường dẫn nội bộ. */
function safeNext(next: string | null): string | null {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim()) return setError("Vui lòng nhập tên đăng nhập.");
    if (!password) return setError("Vui lòng nhập mật khẩu.");
    setError(null);
    startTransition(async () => {
      const { data, error } = await authClient.signIn.username({ username: username.trim(), password });
      if (error || !data) {
        setError(authErrorMessage(error));
        return;
      }
      const name = (data.user as { username?: string }).username ?? username.trim().toLowerCase();
      router.replace(safeNext(params.get("next")) ?? `/u/${name}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field
        id="login-username"
        label="Tên đăng nhập"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <Field
        id="login-password"
        label="Mật khẩu"
        type={showPassword ? "text" : "password"}
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        trailing={
          <button
            type="button"
            className="btn btn-sm"
            aria-pressed={showPassword}
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? "Ẩn" : "Hiện"}
          </button>
        }
      />
      {error && (
        <p className="text-body-sm text-ember-400" role="alert">
          {error}
        </p>
      )}
      <SubmitButton className="btn btn-primary w-full" pending={pending} pendingLabel="Đang đăng nhập…">
        Đăng nhập
      </SubmitButton>
      <p className="text-body-sm text-mist">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="text-sky-300 underline underline-offset-4">
          Đăng ký
        </Link>
      </p>
    </form>
  );
}
