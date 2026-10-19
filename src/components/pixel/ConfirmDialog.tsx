"use client";

import { useRef, useState, type ReactNode } from "react";

interface ConfirmDialogProps {
  trigger: ReactNode;
  triggerClassName?: string;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  /** Nếu có: phải gõ đúng chuỗi này mới bấm xác nhận được. */
  typeToConfirm?: string;
  danger?: boolean;
  /** Nội dung form thêm (ví dụ ô mật khẩu). */
  children?: ReactNode;
  onConfirm: (form: FormData) => Promise<string | null>;
}

/** Hộp thoại xác nhận dùng <dialog> gốc (tự có focus trap, Esc, top layer). */
export function ConfirmDialog({
  trigger,
  triggerClassName = "btn",
  title,
  description,
  confirmLabel,
  typeToConfirm,
  danger,
  children,
  onConfirm,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const blocked = typeToConfirm !== undefined && typed.trim() !== typeToConfirm;

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => ref.current?.showModal()}>
        {trigger}
      </button>
      <dialog
        ref={ref}
        className="panel-wood m-auto w-[min(28rem,calc(100vw-2rem))] p-4 text-ivory backdrop:bg-felt-950/80"
        onClose={() => {
          setTyped("");
          setError(null);
        }}
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setError(null);
            const message = await onConfirm(new FormData(event.currentTarget));
            setPending(false);
            if (message) setError(message);
            else ref.current?.close();
          }}
        >
          <h2 className="text-title">{title}</h2>
          <div className="text-body">{description}</div>
          {children}
          {typeToConfirm !== undefined && (
            <label className="flex flex-col gap-1">
              <span className="label-px">Nhập {typeToConfirm} để xác nhận</span>
              <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
            </label>
          )}
          {error && (
            <p role="alert" className="text-body-sm text-ember-400">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="btn" onClick={() => ref.current?.close()}>
              Hủy
            </button>
            <button
              type="submit"
              className={danger ? "btn btn-danger" : "btn btn-primary"}
              disabled={blocked || pending}
              data-pending={pending || undefined}
            >
              {pending ? "Đang xử lý…" : confirmLabel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
