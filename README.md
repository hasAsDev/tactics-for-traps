# Tactics for Traps

Web "game" isometric pixel-art cho hội bạn giải puzzle Lichess: tự đồng bộ lịch sử puzzle, vẽ **bàn cờ heatmap 12 tháng** (mỗi ngày một ô, ngày giải nhiều mọc thành tháp gỗ có quân cờ trên đỉnh), tính **Streak**, **Level/XP**, có **Bảng xếp hạng** và khung **"Hôm nay ai đã giải?"** — khỏi chụp màn hình gửi Discord.

## Tính năng (MVP)

- Đăng ký / đăng nhập / đăng xuất bằng username + mật khẩu (không cần email), đổi mật khẩu, xoá tài khoản.
- Kết nối Lichess qua OAuth (chỉ quyền `puzzle:read`), lần đầu tự nhập 12 tháng lịch sử puzzle (kèm theme, rating).
- Đồng bộ tự động: puzzle thường (giờ chính xác) + Puzzle Streak / Storm / Racer (theo ngày UTC của Lichess).
- Hồ sơ công khai `/u/<username>`: nhân vật là quân cờ theo Level (Tốt → Mã → Tượng → Xe → Hậu → Vua), vương miện Streak, kỷ lục, bàn cờ Phaser có tab Tổng / Puzzle / Puzzle Streak / Storm / Racer, chế độ Lưới, nhật ký 7 ngày.
- Sảnh `/` và Bảng xếp hạng `/leaderboard` (Streak / 7 ngày / XP).

## Chạy local

Cần Node 22. Không cần Docker: Postgres local chạy bằng [PGlite](https://pglite.dev) (Postgres biên dịch sang WASM).

```bash
npm install
cp .env.example .env.local        # rồi điền các secret (lệnh tạo secret có sẵn trong file)
npm run db:up                     # mở Postgres local ở cổng 5432 (để terminal này chạy)
npm run db:migrate                # ở terminal khác
npm run seed:demo                 # (tuỳ chọn) 6 kỳ thủ demo, mật khẩu: demo-password-123
npm run dev                       # http://localhost:3000
```

Kết nối Lichess khi chạy local: dùng đúng `http://localhost:3000` (không dùng 127.0.0.1) để cookie và `redirect_uri` khớp nhau.

### Script

| Lệnh | Việc |
|---|---|
| `npm run dev` / `npm run build` | Dev server / build production (build chạy migrate chỉ khi `VERCEL_ENV=production`) |
| `npm test` | Unit test (luật game, cửa sổ đồng bộ, ndjson, mã hoá, PKCE…) |
| `npm run test:int` | Integration test trên PGlite in-memory (engine đồng bộ, auth hook) |
| `npm run typecheck` / `npm run lint` | TypeScript / ESLint |
| `npm run db:generate` / `npm run db:migrate` | Tạo / chạy migration Drizzle |
| `npm run auth:generate` | Sinh lại schema Better Auth (sau đó đổi mọi `timestamp` sang `withTimezone: true`) |
| `npm run seed:demo` | Dữ liệu demo (chỉ chạy với DB local) |
| `npm run art:preview` | Xuất các cảnh pixel ra PNG trong `.art-preview/` |
| `npm run admin:reset-password -- <username>` | Đặt lại mật khẩu (in mật khẩu tạm một lần, đăng xuất mọi thiết bị) |

Trang mẫu giao diện khi dev: `/dev/pixel`.

## Kiến trúc

Bốn lớp, phụ thuộc một chiều:

1. **Dữ liệu gốc** — `puzzle_event` (từng puzzle, có `themes`, `rating`), `provider_day` (feed 7 ngày của Lichess, lưu vĩnh viễn).
2. **Luật game thuần** — `src/game/core` (điểm, intensity, Level/quân, streak), có `RULES_VERSION`, chạy được cả server lẫn client.
3. **Trạng thái suy ra** — `daily_stat`, `user_stat`, tính lại toàn bộ cho user sau mỗi lần đồng bộ.
4. **Hiển thị** — React (UI, chữ tiếng Việt), **Phaser 4** (thế giới: `src/game/phaser`, chỉ nạp ở client bằng import động), SVG render ở server (hero, mini heatmap).

Nội dung game (quân, sau này thẻ/trang bị/Boss) nằm trong registry `src/game/content` với ID cố định. Hình pixel vẽ bằng ma trận ký tự trong `src/game/art/sprites.ts`; `src/game/art/raster.ts` biên dịch chúng cho Phaser, DOM và SVG.

Đồng bộ (`src/server/sync`): mỗi tài khoản có khoá riêng; puzzle được kéo theo "cửa sổ" resume được (stream ndjson 20 dòng/giây của Lichess, cắt theo ngân sách thời gian 300 s của Vercel); feed công khai giãn cách ≥ 9 s; gặp 429 thì nghỉ 60 s toàn hệ thống. Kích hoạt bởi: kết nối OAuth, nút "Đồng bộ ngay", lượt vào web (`/api/sync/ping`, tối đa mỗi 10 phút), và cron hằng ngày `/api/cron/sync` (01:00 UTC).

Ngày của site dùng chung múi giờ `Asia/Ho_Chi_Minh`. Puzzle Streak/Storm/Racer lấy theo ngày UTC của Lichess (chơi từ 00:00–07:00 giờ VN sẽ tính vào hôm trước).

## Deploy (chỉ dùng gói miễn phí)

1. **Tạo secret cho production** (khác với secret local):
   ```bash
   node -e "const c=require('crypto');console.log('BETTER_AUTH_SECRET='+c.randomBytes(32).toString('base64url'));console.log('TOKEN_ENCRYPTION_KEY='+c.randomBytes(32).toString('base64'));console.log('CRON_SECRET='+c.randomBytes(24).toString('base64url'))"
   ```
   Không đổi `TOKEN_ENCRYPTION_KEY` sau khi đã có người kết nối Lichess (token cũ sẽ không giải mã được, mọi người phải kết nối lại).
2. **GitHub:** tạo repo trên tài khoản **cá nhân** (Hobby không deploy được repo của organization; nên để public), rồi đẩy code:
   ```bash
   git remote add origin https://github.com/<tài-khoản>/tactics-for-traps.git
   git push -u origin master
   ```
3. **Vercel:** Add New → Project → Import repo. Tên project quyết định domain `https://<tên>.vercel.app`. Ở mục Environment Variables, thêm `BETTER_AUTH_SECRET`, `TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`, `BETTER_AUTH_URL=https://<tên>.vercel.app` và `LICHESS_CLIENT_ID=tactics-for-traps`, rồi bấm Deploy. Lần build đầu sẽ dừng với thông báo thiếu `DATABASE_URL`: bình thường, vì chưa có database.
4. **Neon:** trong project Vercel, tab Storage → Create Database → Neon → gói **Free**, region **AWS Asia Pacific (Singapore)** → kết nối với môi trường Production. Neon tự thêm `DATABASE_URL` và `DATABASE_URL_UNPOOLED`.
5. **Redeploy:** tab Deployments → bản mới nhất → Redeploy. Log build phải có dòng `[migrate] xong`.
6. **Kiểm tra domain:** nếu tên bị trùng, Vercel sẽ thêm hậu tố vào domain. Khi đó sửa `BETTER_AUTH_URL` cho khớp domain production thật rồi Redeploy. Luôn mở web bằng domain này (OAuth Lichess và kiểm tra Origin dựa vào nó).
7. **Tiết kiệm CU-giờ:** Neon console → branch `main` → Compute → Edit → min = max = 0,25 CU (scale-to-zero giữ mặc định).
8. **Thử:** đăng ký → Kết nối Lichess → chờ khoảng 1 phút để nhập lịch sử. Settings → Cron Jobs → Run để thử cron.

Giới hạn cần nhớ: Vercel Hobby chỉ dùng phi thương mại, cron 1 lần/ngày, log giữ 1 giờ (xem bảng `sync_run`). Neon Free 100 CU-giờ/tháng: `robots.txt` đã chặn bot tìm kiếm (trừ bot preview link). Tuỳ chọn khi bị spam: `SIGNUP_DISABLED=1` hoặc `SIGNUP_INVITE_CODE`.

## Lộ trình game

- **Giai đoạn 2 — Sưu tầm:** xu, rương, thẻ chiến thuật theo theme puzzle (Chĩa đôi, Ghim, Mat hàng cuối…; áp dụng cả lịch sử đã lưu), trang bị mặc theo lớp, Khiên Streak, thành tựu, sổ cái phần thưởng.
- **Giai đoạn 3 — Boss chung hằng tuần:** cả hội cùng đánh, sát thương tính từ puzzle giải được, điểm yếu theo theme.

Dữ liệu puzzle từ Lichess.org. Không liên kết chính thức với Lichess.
