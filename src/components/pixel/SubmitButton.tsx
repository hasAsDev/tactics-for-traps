"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "./Icon";

interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  pendingLabel: ReactNode;
  pending?: boolean;
}

/** Nút gửi form: hiện trạng thái "đang xử lý" (icon xoay theo bước 90°). */
export function SubmitButton({ children, pendingLabel, pending, className = "btn", disabled, ...rest }: SubmitButtonProps) {
  const status = useFormStatus();
  const busy = pending ?? status.pending;
  return (
    <button
      type="submit"
      className={className}
      disabled={disabled || busy}
      data-pending={busy ? "true" : undefined}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? (
        <>
          <Icon name="reload" className="animate-spin-steps" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
