// Tạo vài kỳ thủ demo có dữ liệu 12 tháng để xem bàn cờ, Sảnh và Bảng xếp hạng.
// CHỈ chạy trên DB local: npm run seed:demo
// Mật khẩu của mọi tài khoản demo: demo-password-123
try {
  process.loadEnvFile(".env.local");
} catch {
  // không có .env.local
}

const DEMO_PASSWORD = "demo-password-123";

const DEMOS = [
  { username: "demo_minh", name: "Minh Nguyễn", activity: 0.9, intensity: 1.6, storm: true },
  { username: "demo_an", name: "Lê Thu An", activity: 0.7, intensity: 1.0, streak: true },
  { username: "demo_binh", name: "Trần Bình", activity: 0.5, intensity: 0.8, racer: true },
  { username: "demo_chi", name: "Phạm Quỳnh Chi", activity: 0.35, intensity: 0.6 },
  { username: "demo_duc", name: "Đỗ Đức", activity: 0.8, intensity: 2.4, storm: true, streak: true },
  { username: "demo_em", name: "Vũ Hải Em", activity: 0.2, intensity: 0.5 },
];

const THEMES = ["fork", "pin", "skewer", "mateIn2", "backRankMate", "discoveredAttack", "sacrifice", "endgame", "short"];

/** PRNG có seed (mulberry32) để dữ liệu demo lần nào cũng giống nhau. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (process.env.VERCEL_ENV === "production" || !/@(127\.0\.0\.1|localhost)[:/]/.test(url)) {
    throw new Error("seed-demo chỉ chạy với DATABASE_URL local (127.0.0.1/localhost).");
  }
  const { inArray } = await import("drizzle-orm");
  const { db, pool } = await import("../src/db");
  const { providerDay, providerLink, puzzleEvent, user } = await import("../src/db/schema");
  const { auth } = await import("../src/lib/auth");
  const { recomputeUser } = await import("../src/server/stats/recompute");
  const { siteDateOf, dayNumber } = await import("../src/game/core/time");

  await db.delete(user).where(inArray(user.username, DEMOS.map((d) => d.username)));
  const today = dayNumber(siteDateOf(new Date()));

  for (const [k, demo] of DEMOS.entries()) {
    const created = await auth.api.signUpEmail({
      body: { email: "seed@users.invalid", username: demo.username, name: demo.name, password: DEMO_PASSWORD },
    });
    const userId = created.user.id;
    const [link] = await db
      .insert(providerLink)
      .values({
        userId,
        externalId: demo.username,
        externalUsername: demo.username,
        floorMs: Date.now() - 365 * 86_400_000,
        syncedToMs: Date.now(),
        lastSyncAt: new Date(),
        lastSuccessAt: new Date(),
        feedPolledAt: new Date(),
        profileFetchedAt: new Date(),
        // Không bao giờ đến hạn đồng bộ thật (không có tài khoản Lichess thật).
        nextAttemptAt: new Date("2100-01-01T00:00:00Z"),
        profile: {
          username: demo.username,
          puzzleRating: 1400 + k * 120,
          puzzleGames: 500 + k * 300,
          stormBest: demo.storm ? 30 + k * 4 : undefined,
          pstreakBest: demo.streak ? 15 + k * 3 : undefined,
          racerBest: demo.racer ? 40 : undefined,
        },
      })
      .returning();

    const random = rng(1000 + k);
    const events: (typeof puzzleEvent.$inferInsert)[] = [];
    const days: (typeof providerDay.$inferInsert)[] = [];
    let streakBias = 0;
    for (let age = 364; age >= 0; age--) {
      // Chuỗi ngày: nếu hôm trước có giải thì hôm nay dễ giải tiếp hơn.
      const active = random() < Math.min(0.97, demo.activity + streakBias);
      streakBias = active ? 0.15 : 0;
      if (!active) continue;
      const dayIndex = today - age;
      const count = Math.max(1, Math.round(random() ** 2 * 40 * demo.intensity));
      for (let n = 0; n < count; n++) {
        // Giờ VN 7:00–23:59 → UTC 0:00–16:59
        const ms = dayIndex * 86_400_000 + Math.floor(random() * 17 * 3_600_000);
        if (ms > Date.now()) continue;
        events.push({
          linkId: link.id,
          puzzleId: `${demo.username}-${dayIndex}-${n}`,
          playedAt: new Date(ms),
          win: random() < 0.72,
          rating: 1200 + Math.floor(random() * 900),
          themes: [THEMES[Math.floor(random() * THEMES.length)], THEMES[Math.floor(random() * THEMES.length)]],
        });
      }
      if (age < 60 && (demo.storm || demo.streak || demo.racer) && random() < 0.5) {
        const iso = new Date(dayIndex * 86_400_000).toISOString().slice(0, 10);
        days.push({
          linkId: link.id,
          day: iso,
          stormRuns: demo.storm ? 1 + Math.floor(random() * 3) : 0,
          stormBest: demo.storm ? 15 + Math.floor(random() * 30) : 0,
          pstreakRuns: demo.streak ? 1 + Math.floor(random() * 2) : 0,
          pstreakBest: demo.streak ? 5 + Math.floor(random() * 20) : 0,
          racerRuns: demo.racer ? 1 : 0,
          racerBest: demo.racer ? 20 + Math.floor(random() * 30) : 0,
        });
      }
    }
    for (let i = 0; i < events.length; i += 1000) await db.insert(puzzleEvent).values(events.slice(i, i + 1000));
    if (days.length) await db.insert(providerDay).values(days);
    const stats = await recomputeUser(userId);
    console.log(`${demo.username}: ${events.length} puzzle, ${stats.activeDays} ngày, ${stats.xp} XP`);
  }
  await pool.end();
  console.log(`Xong. Đăng nhập bằng một tài khoản demo (vd demo_minh) với mật khẩu: ${DEMO_PASSWORD}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
