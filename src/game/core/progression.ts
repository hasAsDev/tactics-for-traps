import { PIECES, type PieceDef } from "../content/pieces";

/** XP là tổng điểm từ trước đến nay. */
export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 20)) + 1;
}

/** XP tối thiểu để đạt level này (level 1 = 0, level 2 = 20, level 3 = 80…). */
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return 20 * (l - 1) * (l - 1);
}

export interface LevelProgress {
  level: number;
  xp: number;
  levelStartXp: number;
  nextLevelXp: number;
  /** XP đã có trong level hiện tại. */
  xpIntoLevel: number;
  /** XP cần cho cả level hiện tại. */
  xpForNext: number;
}

export function levelProgress(xp: number): LevelProgress {
  const safeXp = Math.max(0, Math.floor(xp));
  const level = levelFromXp(safeXp);
  const levelStartXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  return {
    level,
    xp: safeXp,
    levelStartXp,
    nextLevelXp,
    xpIntoLevel: safeXp - levelStartXp,
    xpForNext: nextLevelXp - levelStartXp,
  };
}

/** Quân cờ (nhân vật) tương ứng với level: Tốt → Mã → Tượng → Xe → Hậu → Vua. */
export function pieceForLevel(level: number): PieceDef {
  let current = PIECES[0];
  for (const piece of PIECES) {
    if (level >= piece.components.piece.minLevel) current = piece;
  }
  return current;
}
