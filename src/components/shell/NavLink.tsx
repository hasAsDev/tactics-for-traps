import Link from "next/link";
import { Suspense } from "react";
import { ActiveLink, type ActiveLinkProps } from "./ActiveLink";

/**
 * Link điều hướng có trạng thái "đang ở trang này". usePathname bị treo khi prerender trang có
 * tham số động (/u/[username]) dưới Cache Components, nên bọc Suspense với link thường làm fallback.
 */
export function NavLink(props: ActiveLinkProps) {
  return (
    <Suspense
      fallback={
        <Link href={props.href} className={props.className}>
          {props.children}
        </Link>
      }
    >
      <ActiveLink {...props} />
    </Suspense>
  );
}
