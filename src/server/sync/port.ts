import { puzzleActivity, userActivity, userPublic } from "../lichess/client";

/** Các lời gọi Lichess mà engine đồng bộ dùng (test thay bằng client giả). */
export interface LichessPort {
  puzzleActivity: typeof puzzleActivity;
  userActivity: typeof userActivity;
  userPublic: typeof userPublic;
}

export const lichessPort: LichessPort = { puzzleActivity, userActivity, userPublic };
