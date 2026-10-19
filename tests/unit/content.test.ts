import { describe, expect, it } from "vitest";
import { PIECES } from "@/game/content/pieces";
import { ALL_CONTENT, getDef, requireDef } from "@/game/content/registry";
import { contentDefSchema } from "@/game/content/schema";

describe("registry nội dung", () => {
  it("mọi def hợp lệ theo schema", () => {
    for (const def of ALL_CONTENT) {
      const result = contentDefSchema.safeParse(def);
      expect(result.success, `${def.id}: ${result.error?.message}`).toBe(true);
    }
  });

  it("ID không trùng", () => {
    const ids = ALL_CONTENT.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("tra cứu theo ID", () => {
    expect(getDef("piece.knight")?.name).toBe("Mã");
    expect(getDef("piece.nope")).toBeUndefined();
    expect(() => requireDef("piece.nope")).toThrow();
  });

  it("6 quân phong cấp theo thứ tự level tăng dần, bắt đầu từ level 1", () => {
    const levels = PIECES.map((p) => p.components.piece.minLevel);
    expect(PIECES).toHaveLength(6);
    expect(levels[0]).toBe(1);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
  });
});
