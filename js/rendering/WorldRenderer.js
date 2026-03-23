import PALETTE from "./palette.js";

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

      ctx.fillStyle = PALETTE.trayMetal;
      ctx.fillRect(tray.x - 6, tray.y - 4, 12, 8);

      ctx.strokeStyle = PALETTE.trayEdge;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(tray.x - 6, tray.y - 4, 12, 8);

      ctx.fillStyle = PALETTE.food;
      ctx.fillRect(tray.x - 2, tray.y - 2, 4, 2);
    });

    ctx.restore();
  }

  drawSceneText(ctx, canvas) {
    ctx.save();

    ctx.fillStyle = PALETTE.label;
    ctx.font = "bold 18px Arial";
    ctx.fillText("Canteen Operations Floor - IS Simulation View", 20, 30);

    ctx.fillStyle = PALETTE.subLabel;
    ctx.font = "14px Arial";
    ctx.fillText(
      "Player: move with WASD / Arrow Keys, press E near a service counter to buy, press E near seats to sit/eat",
      20,
      canvas.height - 20
    );

    ctx.restore();
  }
}