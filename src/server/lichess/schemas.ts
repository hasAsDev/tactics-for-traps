import { z } from "zod";

/** Schema (zod) của các response Lichess mà ta dùng. Trường lạ bị bỏ qua. */

export const tokenResponse = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().optional(),
  token_type: z.string().optional(),
});

export const accountResponse = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
});

/** Một dòng của GET /api/puzzle/activity. `date` = lần chơi đầu, `win` = kết quả lần cuối. */
export const puzzleActivityEntry = z.object({
  date: z.number().int(),
  win: z.boolean(),
  puzzle: z.object({
    id: z.string().min(1),
    rating: z.number().int().optional(),
    themes: z.array(z.string()).optional(),
  }),
});
export type PuzzleActivityEntry = z.infer<typeof puzzleActivityEntry>;

const runScore = z.object({ runs: z.number().int(), score: z.number().int() });

/** Một ngày (UTC) của GET /api/user/{username}/activity. */
export const activityEntry = z.object({
  interval: z.object({ start: z.number(), end: z.number() }),
  puzzles: z
    .object({
      score: z.object({ win: z.number().int(), loss: z.number().int() }),
    })
    .optional(),
  storm: runScore.optional(),
  racer: runScore.optional(),
  streak: runScore.optional(),
});
export type ActivityEntry = z.infer<typeof activityEntry>;

export const activityResponse = z.array(z.unknown());

const partialRun = z.object({ runs: z.number().int(), score: z.number().int() }).partial();

/** GET /api/user/{username} (chỉ phần ta cần). */
export const userPublicResponse = z.object({
  id: z.string(),
  username: z.string(),
  title: z.string().optional(),
  perfs: z
    .object({
      puzzle: z.object({ games: z.number().int(), rating: z.number().int() }).partial().optional(),
      storm: partialRun.optional(),
      racer: partialRun.optional(),
      streak: partialRun.optional(),
    })
    .optional(),
});
export type UserPublic = z.infer<typeof userPublicResponse>;
