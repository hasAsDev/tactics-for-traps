import * as Phaser from "phaser";
import { boardSize } from "../art/iso";
import type { WorldEvents, WorldHandle, WorldState } from "../world";
import { BoardScene } from "./scenes/BoardScene";

/**
 * Tạo thế giới Phaser (chỉ gọi ở client, qua import động trong GameView).
 * Game có kích thước bằng độ phân giải art; CSS phóng to theo `zoom` = số điểm ảnh thiết bị / dpr.
 */
export function createWorld(parent: HTMLElement, state: WorldState, events: WorldEvents, zoom: number): WorldHandle {
  const { w, h } = boardSize(state.board.weeks);
  const scene = new BoardScene(state, events);
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent,
    width: w,
    height: h,
    transparent: true,
    pixelArt: true,
    banner: false,
    autoFocus: false,
    disableContextMenu: false,
    audio: { noAudio: true },
    input: {
      // Bàn phím do React (YearGrid) lo; không bắt phím trên window.
      keyboard: false,
      // Không chặn cuộn trang khi vuốt trên canvas.
      touch: { capture: false },
      mouse: { preventDefaultWheel: false, preventDefaultDown: false, preventDefaultUp: false, preventDefaultMove: false },
      gamepad: false,
      windowEvents: false,
    },
    scale: { mode: Phaser.Scale.NONE, width: w, height: h, zoom },
    fps: { target: 30, limit: 30 },
    scene: [scene],
  });

  return {
    update(next) {
      if (next.board && next.board.weeks !== state.board.weeks) {
        const size = boardSize(next.board.weeks);
        game.scale.resize(size.w, size.h);
      }
      state = { ...state, ...next };
      scene.applyState(next);
    },
    setZoom(value) {
      game.scale.setZoom(value);
    },
    sleep() {
      game.loop.sleep();
    },
    wake() {
      game.loop.wake();
    },
    destroy() {
      // destroy() của Phaser chỉ chạy ở step kế tiếp: nếu vòng lặp đang ngủ (bàn cờ ngoài màn hình)
      // thì phải đánh thức, nếu không game (và WebGL context) sẽ không bao giờ được giải phóng.
      game.loop.wake();
      game.destroy(true);
    },
  };
}
