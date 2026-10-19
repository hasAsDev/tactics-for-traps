import type { ContentDef, PieceComponent } from "./types";

export type PieceId =
  | "piece.pawn"
  | "piece.knight"
  | "piece.bishop"
  | "piece.rook"
  | "piece.queen"
  | "piece.king";

export type PieceDef = ContentDef & {
  id: PieceId;
  kind: "piece";
  components: { piece: PieceComponent };
};

/** Sprite nhỏ (đỉnh tháp, avatar) của từng quân, dùng chung cho Phaser, DOM và SVG server. */
export const PIECE_SPRITES: Record<PieceId, string> = {
  "piece.pawn": "pawn-s",
  "piece.knight": "knight-s",
  "piece.bishop": "bishop-s",
  "piece.rook": "rook-s",
  "piece.queen": "queen-s",
  "piece.king": "king-s",
};

function piece(
  id: PieceId,
  name: string,
  description: string,
  minLevel: number,
): PieceDef {
  return {
    id,
    kind: "piece",
    name,
    description,
    art: { src: "matrix", id: PIECE_SPRITES[id], palette: "ivory" },
    tags: ["hero"],
    components: { piece: { minLevel, anchors: {} } },
  };
}

/** Thứ tự phong cấp của nhân vật theo Level. */
export const PIECES: readonly PieceDef[] = [
  piece("piece.pawn", "Tốt", "Bước đầu tiên của mọi kỳ thủ.", 1),
  piece("piece.knight", "Mã", "Nhảy chữ L, chuyên đòn chĩa đôi.", 5),
  piece("piece.bishop", "Tượng", "Lướt dài trên đường chéo.", 10),
  piece("piece.rook", "Xe", "Thống trị hàng và cột mở.", 15),
  piece("piece.queen", "Hậu", "Quân mạnh nhất trên bàn cờ.", 20),
  piece("piece.king", "Vua", "Đỉnh cao của hội giải puzzle.", 30),
];
