import type { MetadataRoute } from "next";

/**
 * Không cho bot tìm kiếm thu thập (giữ quota CU-giờ miễn phí của Neon),
 * nhưng vẫn cho bot tạo preview link (Discord, Facebook, X…).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: ["Discordbot", "facebookexternalhit", "Twitterbot", "TelegramBot", "Slackbot"], allow: "/" },
      { userAgent: "*", disallow: "/" },
    ],
  };
}
