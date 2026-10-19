import Link from "next/link";
import { getViewer } from "@/lib/session";
import { Icon } from "@/components/pixel/Icon";
import { NavLink } from "./NavLink";

const linkClass =
  "label-px flex items-center gap-1 px-2 py-2 text-ivory hover:text-gold-300 data-[active]:text-gold-300";

/** Phần phụ thuộc session của header (đặt trong <Suspense>). */
export async function HeaderUser() {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className="btn btn-sm">
          Đăng nhập
        </Link>
        <Link href="/register" className="btn btn-sm btn-primary hidden sm:inline-flex">
          Đăng ký
        </Link>
      </div>
    );
  }
  return (
    <nav aria-label="Tài khoản" className="flex items-center gap-1">
      <NavLink href={`/u/${viewer.username}`} className={linkClass}>
        <Icon name="user" />
        <span className="truncate-vi max-w-[10rem]">{viewer.name}</span>
      </NavLink>
      <NavLink href="/settings" className={`${linkClass} hidden md:flex`}>
        <Icon name="settings" />
        <span className="sr-only">Cài đặt</span>
      </NavLink>
    </nav>
  );
}

export function HeaderUserSkeleton() {
  return <div className="h-9 w-32 animate-pulse bg-felt-700" aria-hidden />;
}
