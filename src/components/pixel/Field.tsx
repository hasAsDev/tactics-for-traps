import type { InputHTMLAttributes, ReactNode } from "react";
import { Icon } from "./Icon";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  trailing?: ReactNode;
}

/** Nhãn + ô nhập + gợi ý/lỗi, nối với nhau bằng aria-describedby. */
export function Field({ id, label, hint, error, trailing, className = "", ...input }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="label-px text-ivory">
        {label}
      </label>
      <div className="flex items-stretch gap-2">
        <input
          id={id}
          className="input"
          aria-invalid={error ? true : undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
          {...input}
        />
        {trailing}
      </div>
      {error ? (
        <p id={errorId} className="flex items-center gap-1 text-body-sm text-ember-400" role="alert">
          <Icon name="alert" />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-body-sm text-mist">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
