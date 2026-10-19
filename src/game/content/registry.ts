import { PIECES } from "./pieces";
import type { ContentDef, ContentKind } from "./types";

/** Toàn bộ nội dung của game. Giai đoạn sau thêm thẻ, trang bị, vật phẩm… vào danh sách này. */
export const ALL_CONTENT: readonly ContentDef[] = [...PIECES];

const byId = new Map<string, ContentDef>(ALL_CONTENT.map((def) => [def.id, def]));

export function getDef(id: string): ContentDef | undefined {
  return byId.get(id);
}

export function requireDef(id: string): ContentDef {
  const def = byId.get(id);
  if (!def) throw new Error(`Không có nội dung với id "${id}"`);
  return def;
}

export function defsOfKind(kind: ContentKind): ContentDef[] {
  return ALL_CONTENT.filter((def) => def.kind === kind);
}
