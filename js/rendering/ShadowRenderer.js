import PALETTE from "./palette.js";

export default class ShadowRenderer {
  drawFootShadow(ctx, centerX, centerY, { width = 22, height = 8, alpha = 0.24 } = {}) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawSoftRectShadow(
    ctx,
    x,
    y,
    width,
    height,
    { offsetX = 8, offsetY = 10, alpha = 0.18 } = {}
  ) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = PALETTE.shadow;
    ctx.fillRect(x + offsetX, y + offsetY, width, height);
    ctx.restore();
  }

  drawTableShadow(ctx, x, y, width, height) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = PALETTE.shadowSoft;
    ctx.fillRect(x + 8, y + 10, width, height + 10);
    ctx.restore();
  }
}