"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/pixel/ConfirmDialog";
import { Field } from "@/components/pixel/Field";
import { Icon } from "@/components/pixel/Icon";
import { SubmitButton } from "@/components/pixel/SubmitButton";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { unlinkLichess } from "@/server/actions";

function Notice({ tone, text }: { tone: "ok" | "error"; text: string }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={tone === "ok" ? "text-body-sm text-leaf-400" : "text-body-sm text-ember-400"}>
      {text}
    </p>
  );
}

export function DisplayNameForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const value = name.normalize("NFC").trim();
        if (!value) return setNotice({ tone: "error", text: "Vui lòng nhập tên hiển thị." });
        startTransition(async () => {
          const { error } = await authClient.updateUser({ name: value });
          if (error) setNotice({ tone: "error", text: authErrorMessage(error) });
          else {
            setNotice({ tone: "ok", text: "Đã lưu thay đổi." });
            router.refresh();
          }
        });
      }}
    >
      <Field id="set-name" label="Tên hiển thị" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} />
      {notice && <Notice {...notice} />}
      <SubmitButton className="btn btn-primary self-start" pending={pending} pendingLabel="Đang lưu…">
        Lưu thay đổi
      </SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (next.length < 8) return setNotice({ tone: "error", text: "Mật khẩu cần ít nhất 8 ký tự." });
        if (next !== confirm) return setNotice({ tone: "error", text: "Mật khẩu nhập lại không khớp." });
        startTransition(async () => {
          const { error } = await authClient.changePassword({
            currentPassword: current,
            newPassword: next,
            revokeOtherSessions: true,
          });
          if (error) setNotice({ tone: "error", text: authErrorMessage(error) });
          else {
            setNotice({ tone: "ok", text: "Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất." });
            setCurrent("");
            setNext("");
            setConfirm("");
          }
        });
      }}
    >
      <Field id="pw-current" label="Mật khẩu hiện tại" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      <Field id="pw-new" label="Mật khẩu mới" type="password" autoComplete="new-password" hint="Ít nhất 8 ký tự." value={next} onChange={(e) => setNext(e.target.value)} />
      <Field id="pw-confirm" label="Nhập lại mật khẩu mới" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {notice && <Notice {...notice} />}
      <SubmitButton className="btn self-start" pending={pending} pendingLabel="Đang đổi…">
        Đổi mật khẩu
      </SubmitButton>
    </form>
  );
}

export function UnlinkLichessButton({ lichessUsername }: { lichessUsername: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger="Ngắt kết nối"
      triggerClassName="btn btn-sm"
      title="Ngắt kết nối Lichess?"
      danger
      confirmLabel="Ngắt kết nối"
      description={
        <>
          Dữ liệu puzzle đã đồng bộ từ @{lichessUsername} sẽ bị xoá khỏi Tactics for Traps (tài khoản Lichess không bị ảnh hưởng).
          Kết nối lại sẽ nhập lại được lịch sử puzzle 12 tháng, nhưng Puzzle Streak/Storm/Racer cũ hơn 7 ngày sẽ mất.
        </>
      }
      onConfirm={async () => {
        const result = await unlinkLichess();
        if (!result.ok) return result.error;
        router.refresh();
        return null;
      }}
    />
  );
}

export function DeleteAccountButton({ username }: { username: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <>
          <Icon name="trash" /> Xóa tài khoản
        </>
      }
      triggerClassName="btn btn-danger"
      title="Xóa tài khoản vĩnh viễn?"
      danger
      confirmLabel="Xóa vĩnh viễn"
      typeToConfirm={username}
      description="Hồ sơ, lịch sử puzzle, Streak và XP sẽ bị xóa vĩnh viễn và không thể khôi phục."
      onConfirm={async (form) => {
        const password = String(form.get("password") ?? "");
        if (!password) return "Vui lòng nhập mật khẩu.";
        const { error } = await authClient.deleteUser({ password });
        if (error) return authErrorMessage(error);
        router.replace("/");
        router.refresh();
        return null;
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="label-px">Mật khẩu</span>
        <input className="input" type="password" name="password" autoComplete="current-password" />
      </label>
    </ConfirmDialog>
  );
}
