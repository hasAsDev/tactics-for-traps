import type { ReactNode } from "react";

type Variant = "wood" | "paper" | "felt";

interface PanelProps {
  variant?: Variant;
  title?: ReactNode;
  /** Nội dung đặt cạnh tiêu đề (ví dụ nút, chip). */
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
  as?: "section" | "div" | "article" | "aside";
  id?: string;
  labelledBy?: string;
}

const VARIANT: Record<Variant, string> = {
  wood: "panel-wood p-3 md:p-5",
  paper: "panel-paper p-3 md:p-4",
  felt: "panel-felt p-3",
};

/** Panel khung gỗ / giấy / nỉ. Tiêu đề là một "biển" gỗ nhỏ. */
export function Panel({ variant = "wood", title, actions, className = "", children, as: Tag = "section", id, labelledBy }: PanelProps) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <Tag className={`${VARIANT[variant]} ${className}`} id={id} aria-labelledby={labelledBy ?? (title ? headingId : undefined)}>
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title ? (
            <h2
              id={headingId}
              className={
                variant === "paper"
                  ? "label-px text-ink-muted"
                  : "frame label-px inline-block bg-wood-800 px-2 pt-[3px] pb-[2px] text-ivory [text-shadow:0_2px_0_var(--color-ink)]"
              }
            >
              {title}
            </h2>
          ) : (
            <span />
          )}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </Tag>
  );
}
