import { Handjet, VT323 } from "next/font/google";

/** Hai font pixel duy nhất trên Google Fonts có dấu tiếng Việt. Chỉ dùng Handjet wght 400 và 900. */
export const handjet = Handjet({
  subsets: ["latin", "vietnamese"],
  variable: "--font-handjet",
  display: "swap",
  fallback: ["ui-monospace", "monospace"],
});

export const vt323 = VT323({
  weight: "400",
  subsets: ["latin", "vietnamese"],
  variable: "--font-vt323",
  display: "swap",
  fallback: ["ui-monospace", "monospace"],
});
