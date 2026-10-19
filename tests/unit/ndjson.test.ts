import { describe, expect, it } from "vitest";
import { parseNdjson, StreamIdleError } from "@/server/lichess/ndjson";

function streamOf(chunks: string[], delayMs = 0): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    async pull(controller) {
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      controller.enqueue(encoder.encode(chunks[i++]));
    },
  });
}

async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const v of gen) out.push(v);
  return out;
}

describe("parseNdjson", () => {
  it("ghép các dòng bị cắt giữa hai chunk", async () => {
    const values = await collect(parseNdjson(streamOf(['{"a":1}\n{"a"', ':2}\n{"a":3}\n'])));
    expect(values).toEqual([{ a: 1 }, { a: 2 }, { a: 3 }]);
  });

  it("chấp nhận CRLF, dòng trống và dòng cuối không có xuống dòng", async () => {
    const values = await collect(parseNdjson(streamOf(['{"a":1}\r\n\r\n', '{"a":2}'])));
    expect(values).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it("bỏ qua dòng hỏng và báo lại", async () => {
    const bad: string[] = [];
    const values = await collect(
      parseNdjson(streamOf(['{"a":1}\nnot json\n{"a":2}\n']), { onBadLine: (l) => bad.push(l) }),
    );
    expect(values).toEqual([{ a: 1 }, { a: 2 }]);
    expect(bad).toEqual(["not json"]);
  });

  it("giữ đúng ký tự nhiều byte bị cắt giữa chunk", async () => {
    const bytes = new TextEncoder().encode('{"n":"Đỗ"}\n');
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 7));
        controller.enqueue(bytes.slice(7));
        controller.close();
      },
    });
    expect(await collect(parseNdjson(stream))).toEqual([{ n: "Đỗ" }]);
  });

  it("báo lỗi khi stream im lặng quá lâu", async () => {
    const gen = parseNdjson(streamOf(['{"a":1}\n', '{"a":2}\n'], 80), { idleMs: 20 });
    await expect(collect(gen)).rejects.toBeInstanceOf(StreamIdleError);
  });

  it("dừng sớm (break) thì huỷ stream", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new TextEncoder().encode('{"a":1}\n'));
      },
      cancel() {
        cancelled = true;
      },
    });
    const seen: unknown[] = [];
    for await (const value of parseNdjson(stream)) {
      seen.push(value);
      break;
    }
    expect(seen).toEqual([{ a: 1 }]);
    expect(cancelled).toBe(true);
  });
});
