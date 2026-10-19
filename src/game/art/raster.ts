import type { Bitmap } from "./render";

/**
 * Raster pixel tối giản: chỉ ghi các đoạn số nguyên, không khử răng cưa.
 * Dùng để dựng texture cho Phaser (client), ảnh SVG tĩnh (server) và buffer ID để chọn ô.
 */
export const NO_ID = 0xffff;

export class Frame {
  readonly px: Uint32Array;
  readonly id: Uint16Array | null;

  constructor(
    readonly w: number,
    readonly h: number,
    withIds = false,
  ) {
    this.px = new Uint32Array(w * h);
    this.id = withIds ? new Uint16Array(w * h).fill(NO_ID) : null;
  }

  set(x: number, y: number, color: number, id?: number): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    this.px[i] = color;
    if (this.id && id !== undefined) this.id[i] = id;
  }

  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.px[y * this.w + x];
  }

  /** Đoạn ngang [x0, x1] (bao gồm hai đầu). */
  hspan(x0: number, x1: number, y: number, color: number, id?: number): void {
    if (y < 0 || y >= this.h) return;
    const a = Math.max(0, Math.min(x0, x1));
    const b = Math.min(this.w - 1, Math.max(x0, x1));
    for (let x = a; x <= b; x++) this.set(x, y, color, id);
  }

  /** Đoạn dọc [y0, y1] (bao gồm hai đầu). */
  vspan(x: number, y0: number, y1: number, color: number, id?: number): void {
    const a = Math.min(y0, y1);
    const b = Math.max(y0, y1);
    for (let y = a; y <= b; y++) this.set(x, y, color, id);
  }

  /** Dán bitmap (bỏ qua điểm trong suốt). */
  blit(bmp: Bitmap, x0: number, y0: number, id?: number): void {
    for (let y = 0; y < bmp.h; y++) {
      for (let x = 0; x < bmp.w; x++) {
        const c = bmp.px[y * bmp.w + x];
        if (c !== 0) this.set(x0 + x, y0 + y, c, id);
      }
    }
  }

  /** Điểm trong suốt có hàng xóm (4 hướng) không trong suốt → tô màu viền. Đọc từ bản chụp nên không lan dây chuyền. */
  outline(color: number): void {
    const snapshot = this.px.slice();
    const at = (x: number, y: number) =>
      x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : snapshot[y * this.w + x];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (snapshot[y * this.w + x] !== 0) continue;
        if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) this.px[y * this.w + x] = color;
      }
    }
  }

  /** Dữ liệu RGBA để đưa vào ImageData (máy little-endian). */
  rgba(): Uint8ClampedArray<ArrayBuffer> {
    return new Uint8ClampedArray(this.px.buffer.slice(0) as ArrayBuffer);
  }

  /** SVG gồm các đoạn ngang theo từng màu (dùng cho ảnh tĩnh render ở server). */
  toSvgPaths(): { fill: string; opacity: number; d: string }[] {
    const groups = new Map<number, string[]>();
    for (let y = 0; y < this.h; y++) {
      let x = 0;
      while (x < this.w) {
        const c = this.px[y * this.w + x];
        if (c === 0) {
          x++;
          continue;
        }
        let end = x + 1;
        while (end < this.w && this.px[y * this.w + end] === c) end++;
        const list = groups.get(c) ?? [];
        list.push(`M${x} ${y}h${end - x}v1h-${end - x}z`);
        groups.set(c, list);
        x = end;
      }
    }
    return [...groups.entries()].map(([c, parts]) => ({
      fill: `#${hex2(c & 0xff)}${hex2((c >>> 8) & 0xff)}${hex2((c >>> 16) & 0xff)}`,
      opacity: ((c >>> 24) & 0xff) / 255,
      d: parts.join(""),
    }));
  }
}

function hex2(n: number): string {
  return n.toString(16).padStart(2, "0");
}
