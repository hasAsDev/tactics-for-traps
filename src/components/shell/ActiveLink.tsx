"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export interface ActiveLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  /** Khớp cả các đường dẫn con (ví dụ /u/...). */
  prefix?: boolean;
}

export function ActiveLink({ href, children, className = "", prefix = false }: ActiveLinkProps) {
  const pathname = usePathname();
  const active = prefix ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href;
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={className} data-active={active || undefined}>
      {children}
    </Link>
  );
}
