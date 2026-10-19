import Link from "next/link";
import { Suspense } from "react";
import { PixelText } from "@/components/pixel/PixelText";
import { Sprite } from "@/components/pixel/Sprite";
import { HeaderUser, HeaderUserSkeleton } from "./HeaderUser";
import { NavLink } from "./NavLink";

const navClass =
  "label-px px-2 py-2 text-ivory hover:text-gold-300 data-[active]:text-gold-300 data-[active]:underline data-[active]:underline-offset-4";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b-4 border-ink bg-wood-800 shadow-[inset_0_2px_0_0_var(--color-wood-600)]">
      <div className="mx-auto flex h-14 max-w-[72rem] items-center justify-between gap-3 px-4 md:h-16 md:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="Tactics for Traps — về Sảnh">
          <Sprite id="crown" palette="gold" scale={2} />
          <PixelText lines={["TACTICS FOR TRAPS"]} scale={2} className="hidden sm:block" />
          <PixelText lines={["T4T"]} scale={2} className="sm:hidden" />
        </Link>
        <nav aria-label="Chính" className="hidden items-center gap-1 md:flex">
          <NavLink href="/" className={navClass}>
            Sảnh
          </NavLink>
          <NavLink href="/leaderboard" className={navClass}>
            Bảng xếp hạng
          </NavLink>
        </nav>
        <Suspense fallback={<HeaderUserSkeleton />}>
          <HeaderUser />
        </Suspense>
      </div>
    </header>
  );
}
