/** Đọc một stream ndjson (mỗi dòng một JSON) mà không cần chờ hết response. */

export class StreamIdleError extends Error {
  constructor(ms: number) {
    super(`Stream không nhận được dữ liệu trong ${ms} ms`);
    this.name = "StreamIdleError";
  }
}

export interface NdjsonOptions {
  /** Huỷ nếu không có byte nào trong khoảng này (ms). */
  idleMs?: number;
  /** Gọi khi gặp một dòng không phải JSON hợp lệ (dòng đó bị bỏ qua). */
  onBadLine?: (line: string) => void;
}

async function readChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  idleMs: number | undefined,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  if (!idleMs) return reader.read();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const idle = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new StreamIdleError(idleMs)), idleMs);
  });
  try {
    return await Promise.race([reader.read(), idle]);
  } finally {
    clearTimeout(timer);
  }
}

export async function* parseNdjson<T = unknown>(
  body: ReadableStream<Uint8Array>,
  options: NdjsonOptions = {},
): AsyncGenerator<T, void, undefined> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  function* drain(final: boolean): Generator<T> {
    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      yield* parseLine(line);
    }
    if (final && buffer.length > 0) {
      const line = buffer;
      buffer = "";
      yield* parseLine(line);
    }
  }

  function* parseLine(raw: string): Generator<T> {
    const line = raw.trim();
    if (!line) return;
    let value: T;
    try {
      value = JSON.parse(line) as T;
    } catch {
      options.onBadLine?.(line);
      return;
    }
    yield value;
  }

  try {
    for (;;) {
      const { done, value } = await readChunk(reader, options.idleMs);
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      yield* drain(false);
    }
    buffer += decoder.decode();
    yield* drain(true);
  } finally {
    // Huỷ phần còn lại của stream nếu bên gọi dừng sớm (break, lỗi, hết thời gian).
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
