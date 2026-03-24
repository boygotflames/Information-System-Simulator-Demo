import PALETTE from "./palette.js";
import { UI_FONT_FAMILY } from "./visualTheme.js";
import { drawFramedPanel, drawSpriteOrFallback } from "./renderSkin.js";

export default class WorldRenderer {
  constructor({ environmentRenderer, characterRenderer, shadowRenderer }) {
    this.environmentRenderer = environmentRenderer;
    this.characterRenderer = characterRenderer;
    this.shadowRenderer = shadowRenderer;
  }

  draw(ctx, scene) {
    const {
      canvas,
      diningTables = [],
      trays = [],
      students = [],
      player = null,
      playerProfile = null
    } = scene;

    const seatLookup = new Map(
      diningTables.flatMap((table) => table.seats).map((seat) => [seat.id, seat])
    );

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.environmentRenderer.drawBase(ctx, scene);
    this.drawTrays(ctx, trays);
    this.characterRenderer.draw(ctx, {
      students,
      player,
      playerProfile,
      seatLookup
    });
    this.environmentRenderer.drawForeground(ctx, scene);
    this.drawSceneText(ctx, canvas);
  }

  drawTrays(ctx, trays) {
    ctx.save();

    trays.forEach((tray) => {
      this.shadowRenderer.drawFootShadow(ctx, tray.x, tray.y + 4, {
        width: 16,
        height: 5,
        alpha: 0.16
      });

      drawSpriteOrFallback(ctx, {
        role: "tray.moving",
        x: tray.x - 8,
        y: tray.y - 6,
        width: 16,
        height: 12,
        drawFallback: () => {
          ctx.fillStyle = PALETTE.trayFill;
          ctx.fillRect(tray.x - 7, tray.y - 4, 14, 8);

          ctx.strokeStyle = PALETTE.trayEdge;
          ctx.lineWidth = 1.2;
          ctx.strokeRect(tray.x - 7, tray.y - 4, 14, 8);

          ctx.fillStyle = PALETTE.trayMetal;
          ctx.fillRect(tray.x - 4, tray.y - 2, 6, 3);

          ctx.fillStyle = PALETTE.cup;
          ctx.fillRect(tray.x + 2, tray.y - 2, 2, 4);

          ctx.fillStyle = PALETTE.food;
          ctx.fillRect(tray.x - 3, tray.y - 3, 5, 2);
        }
      });
    });

    ctx.restore();
  }

  drawSceneText(ctx, canvas) {
    ctx.save();

    drawFramedPanel(ctx, {
      x: 294,
      y: 18,
      width: 238,
      height: 42,
      title: "Live Canteen Floor",
      subtitle: "Retro-modern operations sim",
      titleSize: 21,
      subtitleSize: 10
    });

    ctx.fillStyle = "rgba(8, 18, 29, 0.76)";
    ctx.fillRect(canvas.width - 178, canvas.height - 34, 160, 18);
    ctx.strokeStyle = "rgba(240, 220, 181, 0.18)";
    ctx.strokeRect(canvas.width - 178, canvas.height - 34, 160, 18);

    ctx.fillStyle = PALETTE.subLabel;
    ctx.font = `600 9px ${UI_FONT_FAMILY}`;
    ctx.fillText("Observe queues, dining, and wash flow", canvas.width - 170, canvas.height - 22);

    ctx.restore();
  }
}
