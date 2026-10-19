"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Field } from "@/components/pixel/Field";
import { SubmitButton } from "@/components/pixel/SubmitButton";
import { authClient, PLACEHOLDER_EMAIL } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";

const USERNAME_RE = /^[a-z0-9_-]{3,20}$/;

type Errors = Partial<Record<"username" | "name" | "password" | "confirm" | "invite" | "form", string>>;

export function RegisterForm({ inviteRequired }: { inviteRequired: boolean }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [invite, setInvite] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();

  function validate(): Errors {
    const next: Errors = {};
    const u = username.trim().toLowerCase();
    if (!u) next.username = "Vui lòng nhập tên đăng nhập.";
    else if (!USERNAME_RE.test(u))
      next.username = "Tên đăng nhập gồm 3–20 ký tự: chữ thường không dấu (a–z), số, dấu gạch ngang hoặc gạch dưới.";
    const n = name.normalize("NFC").trim();
    if (!n) next.name = "Vui lòng nhập tên hiển thị.";
    else if ([...n].length > 30) next.name = "Tên hiển thị tối đa 30 ký tự.";
    if (!password) next.password = "Vui lòng nhập mật khẩu.";
    else if (password.length < 8) next.password = "Mật khẩu cần ít nhất 8 ký tự.";
    if (confirm !== password) next.confirm = "Mật khẩu nhập lại không khớp.";
    if (inviteRequired && !invite.trim()) next.invite = "Vui lòng nhập mã mời.";
    return next;
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const u = username.trim().toLowerCase();
    startTransition(async () => {
      const { error } = await authClient.signUp.email({
        email: PLACEHOLDER_EMAIL,
        username: u,
        name: name.normalize("NFC").trim(),
        password,
        fetchOptions: inviteRequired ? { headers: { "x-invite-code": invite.trim() } } : undefined,
      });
      if (error) {
        const message = authErrorMessage(error);
        const code = error.code ?? error.message ?? "";
        if (code.includes("USERNAME")) setErrors({ username: message });
        else if (code.includes("DISPLAY_NAME")) setErrors({ name: message });
        else if (code.includes("PASSWORD")) setErrors({ password: message });
        else if (code.includes("INVITE")) setErrors({ invite: message });
        else setErrors({ form: message });
        return;
      }
      router.replace(`/u/${u}?welcome=1`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field
        id="reg-username"
        label="Tên đăng nhập"
        hint="Dùng trong đường dẫn hồ sơ: /u/ten-cua-ban"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={20}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        error={errors.username}
        required
      />
      <Field
        id="reg-name"
        label="Tên hiển thị"
        hint="Có dấu thoải mái, tối đa 30 ký tự."
        autoComplete="nickname"
        maxLength={30}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        required
      />
      <Field
        id="reg-password"
        label="Mật khẩu"
        hint="Ít nhất 8 ký tự."
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        required
      />
      <Field
        id="reg-confirm"
        label="Nhập lại mật khẩu"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={errors.confirm}
        required
      />
      {inviteRequired && (
        <Field
          id="reg-invite"
          label="Mã mời"
          autoComplete="off"
          value={invite}
          onChange={(e) => setInvite(e.target.value)}
          error={errors.invite}
          required
        />
      )}
      {errors.form && (
        <p className="text-body-sm text-ember-400" role="alert">
          {errors.form}
        </p>
      )}
      <SubmitButton className="btn btn-primary w-full" pending={pending} pendingLabel="Đang tạo tài khoản…">
        Tạo tài khoản
      </SubmitButton>
      <p className="text-body-sm text-mist">
        Không có email, nên hãy nhớ mật khẩu. Quên thì nhờ người quản trị đặt lại.
      </p>
      <p className="text-body-sm text-mist">
        Đã có tài khoản?{" "}
        <Link href="/login" className="text-sky-300 underline underline-offset-4">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
