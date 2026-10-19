import * as Phaser from "phaser";
import { LEVEL_PIECES, renderHeatmapBoard } from "../../art/board";
import { BLOCK, cellOfDay, cellXY, piecePosition } from "../../art/iso";
import { NO_ID } from "../../art/raster";
import { spriteSize } from "../../art/sprites";
import { boardLevels, type WorldEvents, type WorldState } from "../../world";
import { buildStaticTextures, pieceKey, putFrameTexture, towerKey } from "../textures";

const GROW_STEP_MS = 60;
const DROP_FRAME_MS = 33;
const DEPTH_OVERLAY = 100_000;

interface TowerSprite {
  day: number;
  level: number;
  x: number;
  y: number;
  tower: Phaser.GameObjects.Image;
  piece: Phaser.GameObjects.Image;
  startAt: number;
  shown: number;
  done: boolean;
}

/** Bàn cờ heatmap: mỗi ngày một ô, ngày có hoạt động mọc thành tháp gỗ có quân trên đỉnh. */
export class BoardScene extends Phaser.Scene {
  private state: WorldState;
  private readonly hooks: WorldEvents;
  private levels: Uint8Array = new Uint8Array(0);
  private ids: Uint16Array | null = null;
  private idWidth = 0;
  private base: Phaser.GameObjects.Image | null = null;
  private towers: TowerSprite[] = [];
  private todayOutline: Phaser.GameObjects.Image | null = null;
  private todayMarker: Phaser.GameObjects.Image | null = null;
  private highlight: Phaser.GameObjects.Image | null = null;
  private cursor: Phaser.GameObjects.Image | null = null;
  private hovered: number | null = null;
  private animating = false;
  private ready = false;

  constructor(state: WorldState, hooks: WorldEvents) {
    super({ key: "board" });
    this.state = state;
    this.hooks = hooks;
  }

  create(): void {
    buildStaticTextures(this);
    this.renderBoard(!this.state.reducedMotion);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => this.onPointer(p, false));
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => this.onPointer(p, true));
    this.input.on(Phaser.Input.Events.GAME_OUT, () => this.setHovered(null));
    this.ready = true;
    this.hooks.ready?.();
  }

  applyState(partial: Partial<WorldState>): void {
    const prev = this.state;
    this.state = { ...prev, ...partial };
    if (!this.ready) return;
    if ((partial.board && partial.board !== prev.board) || (partial.metric && partial.metric !== prev.metric)) {
      this.renderBoard(false);
    } else if ("selected" in partial) {
      this.renderHighlight();
    }
  }

  update(time: number): void {
    if (!this.animating) return;
    let pending = false;
    for (const t of this.towers) {
      if (t.done) continue;
      const elapsed = time - t.startAt;
      if (elapsed < 0) {
        pending = true;
        continue;
      }
      const shown = Math.min(t.level, Math.floor(elapsed / GROW_STEP_MS) + 1);
      if (shown !== t.shown) {
        t.shown = shown;
        t.tower.setTexture(towerKey(shown)).setPosition(t.x, t.y - shown * BLOCK).setVisible(true);
      }
      if (shown < t.level) {
        pending = true;
        continue;
      }
      const sinceTop = elapsed - t.level * GROW_STEP_MS;
      const drop = sinceTop < DROP_FRAME_MS ? -4 : sinceTop < DROP_FRAME_MS * 2 ? -2 : 0;
      const pos = piecePosition(t.x, t.y, t.level, t.piece.height);
      t.piece.setVisible(true).setPosition(pos.x, pos.y + drop);
      if (drop === 0) t.done = true;
      else pending = true;
    }
    if (!pending) this.animating = false;
  }

  /** Vẽ lại toàn bộ bàn theo dữ liệu và tab hiện tại. */
  private renderBoard(animate: boolean): void {
    const { board, metric } = this.state;
    this.levels = boardLevels(board, metric);

    const baseFrame = renderHeatmapBoard({ weeks: board.weeks, todayIndex: board.todayIndex, levels: [] });
    putFrameTexture(this, "board-base", baseFrame);
    this.base?.destroy();
    this.base = this.add.image(0, 0, "board-base").setOrigin(0, 0).setDepth(0);

    const picking = renderHeatmapBoard({ weeks: board.weeks, todayIndex: board.todayIndex, levels: this.levels }, true);
    this.ids = picking.id;
    this.idWidth = picking.w;

    for (const t of this.towers) {
      t.tower.destroy();
      t.piece.destroy();
    }
    this.towers = [];
    const now = this.time.now;
    const stagger = board.weeks > 20 ? 10 : 30;
    for (let d = 0; d <= board.todayIndex && d < this.levels.length; d++) {
      const level = this.levels[d];
      if (!level) continue;
      const { i, j } = cellOfDay(d);
      const { x, y } = cellXY(i, j);
      const depth = (i + j) * 10;
      const startLevel = animate ? 1 : level;
      const tower = this.add
        .image(x, y - startLevel * BLOCK, towerKey(startLevel))
        .setOrigin(0, 0)
        .setDepth(depth + 1)
        .setVisible(!animate);
      const pieceH = spriteSize(LEVEL_PIECES[level - 1].sprite).h;
      const pos = piecePosition(x, y, level, pieceH);
      const piece = this.add
        .image(pos.x, pos.y, pieceKey(level))
        .setOrigin(0, 0)
        .setDepth(depth + 2)
        .setVisible(!animate);
      this.towers.push({
        day: d,
        level,
        x,
        y,
        tower,
        piece,
        startAt: now + (i - 1) * stagger,
        shown: animate ? 0 : level,
        done: !animate,
      });
    }
    this.animating = animate && this.towers.length > 0;
    this.renderToday();
    this.renderHighlight();
  }

  private renderToday(): void {
    const { board } = this.state;
    this.todayOutline?.destroy();
    this.todayMarker?.destroy();
    this.todayOutline = null;
    this.todayMarker = null;
    if (board.todayIndex < 0 || board.todayIndex >= board.weeks * 7) return;
    const { i, j } = cellOfDay(board.todayIndex);
    const { x, y } = cellXY(i, j);
    this.todayOutline = this.add.image(x, y, "outline-today").setOrigin(0, 0).setDepth((i + j) * 10 + 0.5);
    const activeToday = (board.points[board.todayIndex] ?? 0) > 0 || (board.failed[board.todayIndex] ?? 0) > 0 ||
      (board.stormRuns[board.todayIndex] ?? 0) + (board.racerRuns[board.todayIndex] ?? 0) + (board.pstreakRuns[board.todayIndex] ?? 0) > 0;
    if (activeToday) return;
    const key = board.atRisk ? "hourglass" : "flag";
    const size = spriteSize(board.atRisk ? "hourglass" : "flag");
    this.todayMarker = this.add
      .image(x + 8 - Math.floor(size.w / 2), y + 4 - size.h, key)
      .setOrigin(0, 0)
      .setDepth((i + j) * 10 + 3);
    if (board.atRisk && !this.state.reducedMotion) {
      this.tweens.add({ targets: this.todayMarker, alpha: 0, duration: 1, hold: 500, repeatDelay: 500, yoyo: true, repeat: -1 });
    }
  }

  /** Viền xanh "xuyên thấu" + con trỏ trên ô đang trỏ hoặc đang chọn. */
  private renderHighlight(): void {
    const target = this.hovered ?? this.state.selected;
    this.highlight?.destroy();
    this.cursor?.destroy();
    this.highlight = null;
    this.cursor = null;
    if (target === null || target < 0 || target > this.state.board.todayIndex) return;
    const { i, j } = cellOfDay(target);
    const { x, y } = cellXY(i, j);
    this.highlight = this.add.image(x, y, "outline-selected").setOrigin(0, 0).setDepth(DEPTH_OVERLAY);
    const level = this.levels[target] ?? 0;
    const top = level ? piecePosition(x, y, level, spriteSize(LEVEL_PIECES[level - 1].sprite).h).y : y;
    this.cursor = this.add.image(x + 5, top - 6, "cursor").setOrigin(0, 0).setDepth(DEPTH_OVERLAY + 1);
    if (!this.state.reducedMotion) {
      this.tweens.add({ targets: this.cursor, y: top - 7, duration: 1, hold: 400, repeatDelay: 400, yoyo: true, repeat: -1 });
    }
  }

  private dayAt(pointer: Phaser.Input.Pointer): number | null {
    if (!this.ids) return null;
    const x = Math.floor(pointer.x);
    const y = Math.floor(pointer.y);
    if (x < 0 || y < 0 || x >= this.idWidth || y >= this.ids.length / this.idWidth) return null;
    const id = this.ids[y * this.idWidth + x];
    return id === NO_ID ? null : id;
  }

  private onPointer(pointer: Phaser.Input.Pointer, press: boolean): void {
    const day = this.dayAt(pointer);
    this.setHovered(day);
    if (press && day !== null) this.hooks.select?.(day);
  }

  private setHovered(day: number | null): void {
    if (day === this.hovered) return;
    this.hovered = day;
    this.renderHighlight();
    if (day === null) {
      this.hooks.hover?.(null, null);
      return;
    }
    const { i, j } = cellOfDay(day);
    const { x, y } = cellXY(i, j);
    const level = this.levels[day] ?? 0;
    const top = level ? piecePosition(x, y, level, spriteSize(LEVEL_PIECES[level - 1].sprite).h).y : y;
    this.hooks.hover?.(day, { x: x + 8, y: top - 8 });
  }
}
