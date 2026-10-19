import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { providerLink, puzzleEvent } from "@/db/schema";
import type { PuzzleActivityEntry } from "../lichess/schemas";
import { BudgetExceededError, LostLeaseError } from "./errors";
import type { LinkRow } from "./leases";
import type { LichessPort } from "./port";
import {
  checkpointBefore,
  closeWindow,
  hasOpenWindow,
  openWindow,
  streamParams,
  type OpenWindow,
} from "./window";

const FLUSH_ROWS = 200;
const FLUSH_MS = 5_000;
const IDLE_MS = 30_000;

export interface PullResult {
  fetched: number;
  inserted: number;
  complete: boolean;
}

interface PullContext {
  link: LinkRow;
  token: string;
  lockToken: string;
  /** Mốc (ms) phải dừng stream để còn thời gian lưu và tính lại. */
  stopAt: number;
  port: LichessPort;
  now?: () => number;
}

function ownLink(linkId: number, lockToken: string) {
  return and(eq(providerLink.id, linkId), eq(providerLink.lockToken, lockToken));
}

/**
 * Kéo lịch sử puzzle theo "cửa sổ" có thể resume (xem window.ts).
 * Mỗi batch được lưu cùng điểm resume trong một transaction; chỉ đóng cửa sổ khi stream kết thúc sạch.
 */
export async function pullPuzzles(ctx: PullContext): Promise<PullResult> {
  const now = ctx.now ?? Date.now;
  const { link, lockToken } = ctx;
  let w: OpenWindow;
  if (hasOpenWindow(link)) {
    w = { winSinceMs: link.winSinceMs!, winTopMs: link.winTopMs!, winBeforeMs: link.winBeforeMs };
  } else {
    w = openWindow(link, now());
    const saved = await db
      .update(providerLink)
      .set({ winSinceMs: w.winSinceMs, winTopMs: w.winTopMs, winBeforeMs: null })
      .where(ownLink(link.id, lockToken))
      .returning({ id: providerLink.id });
    if (saved.length === 0) throw new LostLeaseError();
  }

  let fetched = 0;
  let inserted = 0;
  let buffer: PuzzleActivityEntry[] = [];
  let lastFlush = now();

  async function flush(): Promise<void> {
    if (buffer.length === 0) return;
    const batch = buffer;
    buffer = [];
    lastFlush = now();
    const minDate = Math.min(...batch.map((e) => e.date));
    const nextBefore = checkpointBefore(w, minDate);
    const count = await db.transaction(async (tx) => {
      const rows = await tx
        .insert(puzzleEvent)
        .values(
          batch.map((e) => ({
            linkId: link.id,
            puzzleId: e.puzzle.id,
            playedAt: new Date(e.date),
            win: e.win,
            rating: e.puzzle.rating ?? null,
            themes: e.puzzle.themes ?? [],
          })),
        )
        .onConflictDoNothing()
        .returning({ puzzleId: puzzleEvent.puzzleId });
      const moved = await tx
        .update(providerLink)
        .set({ winBeforeMs: nextBefore })
        .where(ownLink(link.id, lockToken))
        .returning({ id: providerLink.id });
      if (moved.length === 0) throw new LostLeaseError();
      return rows.length;
    });
    w = { ...w, winBeforeMs: nextBefore };
    inserted += count;
  }

  const { since, before } = streamParams(w);
  const controller = new AbortController();
  const budget = Math.max(0, ctx.stopAt - now());
  const timer = setTimeout(() => controller.abort(new BudgetExceededError()), budget);
  let complete = false;
  let streamError: unknown = null;
  try {
    for await (const entry of ctx.port.puzzleActivity(ctx.token, { since, before }, { signal: controller.signal, idleMs: IDLE_MS })) {
      if (entry.date < since || entry.date >= before) continue;
      buffer.push(entry);
      fetched++;
      if (buffer.length >= FLUSH_ROWS || now() - lastFlush >= FLUSH_MS) await flush();
    }
    complete = !controller.signal.aborted;
  } catch (error) {
    if (!(controller.signal.aborted && controller.signal.reason instanceof BudgetExceededError)) {
      streamError = error;
    }
  } finally {
    clearTimeout(timer);
  }

  // Lưu phần đã nhận kể cả khi stream lỗi hoặc bị cắt.
  await flush();
  if (streamError) throw streamError;

  if (complete) {
    const closed = closeWindow(w);
    const saved = await db
      .update(providerLink)
      .set(closed)
      .where(ownLink(link.id, lockToken))
      .returning({ id: providerLink.id });
    if (saved.length === 0) throw new LostLeaseError();
  }
  return { fetched, inserted, complete };
}
