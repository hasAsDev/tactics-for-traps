import type { SVGProps } from "react";
import { Check } from "pixelarticons/react/Check.js";
import { Chess } from "pixelarticons/react/Chess.js";
import { Close } from "pixelarticons/react/Close.js";
import { Crown } from "pixelarticons/react/Crown.js";
import { ExternalLink } from "pixelarticons/react/ExternalLink.js";
import { Fire } from "pixelarticons/react/Fire.js";
import { Home } from "pixelarticons/react/Home.js";
import { Hourglass } from "pixelarticons/react/Hourglass.js";
import { InfoBox } from "pixelarticons/react/InfoBox.js";
import { Login } from "pixelarticons/react/Login.js";
import { Logout } from "pixelarticons/react/Logout.js";
import { Reload } from "pixelarticons/react/Reload.js";
import { SettingsCog } from "pixelarticons/react/SettingsCog.js";
import { SquareAlert } from "pixelarticons/react/SquareAlert.js";
import { Trash } from "pixelarticons/react/Trash.js";
import { Trophy } from "pixelarticons/react/Trophy.js";
import { User } from "pixelarticons/react/User.js";

const ICONS = {
  check: Check,
  chess: Chess,
  close: Close,
  crown: Crown,
  external: ExternalLink,
  fire: Fire,
  home: Home,
  hourglass: Hourglass,
  info: InfoBox,
  login: Login,
  logout: Logout,
  reload: Reload,
  settings: SettingsCog,
  alert: SquareAlert,
  trash: Trash,
  trophy: Trophy,
  user: User,
} as const;

export type IconName = keyof typeof ICONS;

/** Icon pixelarticons luôn ở 24 px (1 điểm ảnh icon = 2 CSS px = --px). */
export function Icon({ name, size = 24, ...rest }: { name: IconName; size?: 24 | 48 } & SVGProps<SVGSVGElement>) {
  const Component = ICONS[name];
  return <Component width={size} height={size} shapeRendering="crispEdges" aria-hidden {...rest} />;
}
