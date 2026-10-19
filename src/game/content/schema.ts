import { z } from "zod";

/** Schema zod để kiểm tra registry trong test (không dùng lúc chạy). */

const spriteRef = z.discriminatedUnion("src", [
  z.object({ src: z.literal("matrix"), id: z.string().min(1), palette: z.string().min(1) }),
  z.object({ src: z.literal("aseprite"), sheet: z.string().min(1), tag: z.string().min(1) }),
]);

const anchor = z.object({ x: z.number().int(), y: z.number().int() });
const slot = z.enum(["head", "body", "hand", "trinket"]);

export const contentDefSchema = z
  .object({
    id: z.string().regex(/^[a-z]+\.[a-z0-9-]+$/),
    kind: z.enum(["piece", "card", "equipment", "item", "achievement", "boss"]),
    name: z.string().min(1),
    description: z.string().min(1),
    rarity: z.enum(["common", "rare", "epic", "legendary"]).optional(),
    art: spriteRef,
    tags: z.array(z.string()),
    retired: z.boolean().optional(),
    components: z
      .object({
        piece: z
          .object({
            minLevel: z.number().int().min(1),
            anchors: z.partialRecord(slot, anchor),
          })
          .optional(),
        card: z
          .object({
            themes: z.array(z.string().min(1)).min(1),
            tiers: z.tuple([z.number().int(), z.number().int(), z.number().int(), z.number().int()]),
          })
          .optional(),
        equippable: z.object({ slot, layer: spriteRef }).optional(),
        stackable: z.object({ max: z.number().int().min(1) }).optional(),
        consumable: z.object({ effect: z.string().min(1) }).optional(),
        stats: z.object({ power: z.number().optional() }).optional(),
      })
      .strict(),
  })
  .strict()
  .refine((def) => def.id.startsWith(`${def.kind}.`), {
    message: "id phải bắt đầu bằng kind, ví dụ piece.knight",
  });
