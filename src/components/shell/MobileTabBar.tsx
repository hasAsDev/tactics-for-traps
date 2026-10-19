import { Suspense } from "react";
import { Icon, type IconName } from "@/components/pixel/Icon";
import { getViewer } from "@/lib/session";
import { NavLink } from "./NavLink";

const tabClass =
  "label-px flex flex-1 flex-col items-center justify-center gap-[2px] py-1 text-mist data-[active]:text-gold-300";

function Tab({ href, icon, label, prefix }: { href: string; icon: IconName; label: string; prefix?: boolean }) {
  return (
    <NavLink href={href} className={tabClass} prefix={prefix}>
      <Icon name={icon} />
      <span>{label}</span>
    </NavLink>
  );
}

async function AccountTabs() {
  const viewer = await getViewer();
  if (!viewer) return <Tab href="/login" icon="login" label="Đăng nhập" />;
  return (
    <>
      <Tab href={`/u/${viewer.username}`} icon="user" label="Hồ sơ" />
      <Tab href="/settings" icon="settings" label="Cài đặt" />
    </>
  );
}

/** Thanh tab dưới cùng trên điện thoại. */
export function MobileTabBar() {
  return (
    <nav
      aria-label="Điều hướng"
      className="fixed inset-x-0 bottom-0 z-30 flex h-16 border-t-4 border-ink bg-wood-800 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <Tab href="/" icon="home" label="Sảnh" />
      <Tab href="/leaderboard" icon="trophy" label="Xếp hạng" />
      <Suspense fallback={<span className="flex-1" />}>
        <AccountTabs />
      </Suspense>
    </nav>
  );
}
