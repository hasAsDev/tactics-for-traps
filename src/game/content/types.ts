/**
 * Registry nội dung: mọi "element" của game (quân/nhân vật, thẻ, trang bị, vật phẩm, thành tựu, Boss)
 * là dữ liệu có ID cố định. DB chỉ lưu ID. Def đã phát hành thì không xoá, chỉ đánh dấu `retired`.
 * Thuộc tính được ghép từ các component, nên thêm loại mới chủ yếu là thêm dữ liệu.
 */

export type ContentKind = "piece" | "card" | "equipment" | "item" | "achievement" | "boss";

export type Rarity = "common" | "rare" | "epic" | "legendary";

/** Tham chiếu tới hình: ma trận pixel trong code, hoặc (sau này) sprite sheet Aseprite. */
export type SpriteRef =
  | { src: "matrix"; id: string; palette: string }
  | { src: "aseprite"; sheet: string; tag: string };

export type EquipSlot = "head" | "body" | "hand" | "trinket";

export interface Anchor {
  x: number;
  y: number;
}

export interface PieceComponent {
  /** Level tối thiểu để "phong cấp" lên quân này. */
  minLevel: number;
  /** Điểm neo trang bị trên khung nhân vật lớn (giai đoạn 2). */
  anchors: Partial<Record<EquipSlot, Anchor>>;
}

/** Các component dành cho giai đoạn sau; khai báo sẵn để registry có hình dạng ổn định. */
export interface CardComponent {
  /** Theme Lichess tạo nên thẻ này (ví dụ "fork"). */
  themes: string[];
  /** Số puzzle giải đúng để đạt bậc Đồng/Bạc/Vàng/Kim cương. */
  tiers: [number, number, number, number];
}

export interface EquippableComponent {
  slot: EquipSlot;
  layer: SpriteRef;
}

export interface StackableComponent {
  max: number;
}

export interface ConsumableComponent {
  effect: string;
}

export interface StatsComponent {
  power?: number;
}

export interface ContentComponents {
  piece?: PieceComponent;
  card?: CardComponent;
  equippable?: EquippableComponent;
  stackable?: StackableComponent;
  consumable?: ConsumableComponent;
  stats?: StatsComponent;
}

export interface ContentDef {
  /** ID cố định dạng `<kind>.<slug>`, ví dụ "piece.knight". */
  id: string;
  kind: ContentKind;
  name: string;
  description: string;
  rarity?: Rarity;
  art: SpriteRef;
  tags: string[];
  retired?: boolean;
  components: ContentComponents;
}
