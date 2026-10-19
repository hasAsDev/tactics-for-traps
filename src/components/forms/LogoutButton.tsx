"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Icon } from "@/components/pixel/Icon";
import { authClient } from "@/lib/auth-client";

export function LogoutButton({ className = "btn" }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      data-pending={pending || undefined}
      onClick={() =>
        startTransition(async () => {
          await authClient.signOut();
          router.replace("/");
          router.refresh();
        })
      }
    >
      <Icon name="logout" />
      {pending ? "Đang đăng xuất…" : "Đăng xuất"}
    </button>
  );
}
