import type * as Phaser from "phaser";
import { LEVEL_PIECES } from "../art/board";
import { BLOCK, drawDiamondOutline, drawTower, TH, TW } from "../art/iso";
import { tokenColor } from "../art/palette";
import { Frame } from "../art/raster";
import { spriteBitmap } from "../art/render";
import type { PaletteName, SpriteId } from "../art/sprites";

/** Đưa một Frame raster vào Phaser thành canvas texture (v4 đã bỏ textures.generate). */
export function putFrameTexture(scene: Phaser.Scene, key: string, frame: Frame): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const texture = scene.textures.createCanvas(key, frame.w, frame.h);
  if (!texture) return;
  const ctx = texture.getContext();
  ctx.putImageData(new ImageData(frame.rgba(), frame.w, frame.h), 0, 0);
  texture.refresh();
}

export function spriteFrame(id: SpriteId, palette: PaletteName): Frame {
  const bmp = spriteBitmap(id, palette);
  const frame = new Frame(bmp.w, bmp.h);
  frame.blit(bmp, 0, 0);
  return frame;
}

export const towerKey = (level: number) => `tower-${level}`;
export const pieceKey = (level: number) => `piece-${level}`;

/** Texture dùng chung: 6 tầng tháp, 6 quân, viền ô (vàng = hôm nay, xanh = đang chọn), cờ, đồng hồ cát, con trỏ. */
export function buildStaticTextures(scene: Phaser.Scene): void {
  for (let level = 1; level <= 6; level++) {
    const h = level * BLOCK;
    const tower = new Frame(TW, h + TH);
    drawTower(tower, 0, h, level);
    putFrameTexture(scene, towerKey(level), tower);
    const piece = LEVEL_PIECES[level - 1];
    putFrameTexture(scene, pieceKey(level), spriteFrame(piece.sprite, piece.palette));
  }
  const today = new Frame(TW, TH);
  drawDiamondOutline(today, 0, 0, tokenColor("gold-300"));
  putFrameTexture(scene, "outline-today", today);
  const selected = new Frame(TW, TH);
  drawDiamondOutline(selected, 0, 0, tokenColor("sky-300"));
  putFrameTexture(scene, "outline-selected", selected);
  putFrameTexture(scene, "flag", spriteFrame("flag", "flag"));
  putFrameTexture(scene, "hourglass", spriteFrame("hourglass", "gold"));
  putFrameTexture(scene, "cursor", spriteFrame("cursor", "sky"));
}
