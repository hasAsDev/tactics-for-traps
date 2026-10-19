/** Ảnh chụp các chỉ số Lichess công khai (GET /api/user/{username}), lưu trong provider_link.profile. */
export interface LichessProfileSnapshot {
  username: string;
  title?: string;
  puzzleRating?: number;
  puzzleGames?: number;
  /** Kỷ lục mọi thời đại của các chế độ chạy theo lượt. */
  pstreakBest?: number;
  pstreakRuns?: number;
  stormBest?: number;
  stormRuns?: number;
  racerBest?: number;
  racerRuns?: number;
}
