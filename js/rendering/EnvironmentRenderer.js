import PALETTE from "./palette.js";
import {
  TILE_SIZE,
  STALL_BLOCK_WIDTH,
  STALL_BLOCK_HEIGHT,
  COUNTER_DEPTH,
  SERVICE_BLOCK_SIZE,
  TABLE_DEPTH,
  getCounterTheme
} from "./visualTheme.js";

function formatStallLabel(stallId) {
  return stallId
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default class EnvironmentRenderer {
  constructor({ shadowRenderer }) {
    this.shadowRenderer = shadowRenderer;
  }

  drawBase(ctx, scene) {
    const {
      canvas,
      servicePoints,
      diningTables,
      occupiedSeatIds,
      playerSeatId,
      trayReturnStation,
      washingArea,
      trayPath
    } = scene;

    this.drawFloor(ctx, canvas);
    this.drawZones(ctx, servicePoints, diningTables, trayReturnStation, washingArea);
    this.drawQueueLanes(ctx, servicePoints);
    this.drawCounters(ctx, servicePoints);
    this.drawDiningTableTops(ctx, diningTables, occupiedSeatIds, playerSeatId);
    this.drawTrayStations(ctx, trayReturnStation, washingArea, trayPath);
  }

  drawForeground(ctx, scene) {
    this.drawDiningTableFronts(ctx, scene.diningTables);
  }

  drawFloor(ctx, canvas) {
    ctx.save();

    ctx.fillStyle = PALETTE.canvasBackground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = PALETTE.floorBase;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y += TILE_SIZE) {
      for (let x = 0; x < canvas.width; x += TILE_SIZE) {
        const isAlt = ((x / TILE_SIZE) + (y / TILE_SIZE)) % 2 === 0;
        ctx.fillStyle = isAlt ? PALETTE.floorTileA : PALETTE.floorTileB;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      }
    }

    ctx.strokeStyle = PALETTE.floorGrid;
    ctx.lineWidth = 1;

    for (let x = 0; x <= canvas.width; x += TILE_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += TILE_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawZones(ctx, servicePoints, diningTables, trayReturnStation, washingArea) {
    ctx.save();

    const serviceXs = servicePoints.map((point) => point.x);
    const serviceYs = servicePoints.map((point) => point.y);

    const serviceMinX = Math.min(...serviceXs) - 120;
    const serviceMaxX = Math.max(...serviceXs) + 120;
    const serviceMinY = Math.min(...serviceYs) - 150;
    const serviceMaxY = Math.max(...serviceYs) + 80;

    ctx.fillStyle = PALETTE.serviceZone;
    ctx.fillRect(
      serviceMinX,
      serviceMinY,
      serviceMaxX - serviceMinX,
      serviceMaxY - serviceMinY
    );

    const tableXs = diningTables.map((table) => table.x);
    const tableYs = diningTables.map((table) => table.y);
    const tableWidths = diningTables.map((table) => table.width);
    const tableHeights = diningTables.map((table) => table.height + TABLE_DEPTH);

    const diningMinX = Math.min(...tableXs) - 34;
    const diningMinY = Math.min(...tableYs) - 46;
    const diningMaxX = Math.max(...tableXs.map((x, index) => x + tableWidths[index])) + 34;
    const diningMaxY = Math.max(...tableYs.map((y, index) => y + tableHeights[index])) + 56;

    ctx.fillStyle = PALETTE.diningZone;
    ctx.fillRect(
      diningMinX,
      diningMinY,
      diningMaxX - diningMinX,
      diningMaxY - diningMinY
    );

    ctx.fillStyle = PALETTE.washZone;
    ctx.fillRect(
      trayReturnStation.x - 34,
      trayReturnStation.y - 24,
      washingArea.x + washingArea.width - (trayReturnStation.x - 34) + 18,
      washingArea.y + washingArea.height - (trayReturnStation.y - 24) + 16
    );

    ctx.fillStyle = PALETTE.label;
    ctx.font = "14px Arial";
    ctx.fillText("Live Service Queues", 120, 295);

    ctx.font = "15px Arial";
    ctx.fillText("Dining Area", 650, 282);

    ctx.restore();
  }

  drawQueueLanes(ctx, servicePoints) {
    ctx.save();

    servicePoints.forEach((point) => {
      ctx.strokeStyle = PALETTE.queueLane;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(point.queueFrontX + 18, point.queueY);
      ctx.lineTo(point.x, point.y + 6);
      ctx.stroke();

      for (let i = 0; i < 5; i += 1) {
        const markerX = point.queueFrontX - i * point.queueSpacing;
        const markerY = point.queueY;

        ctx.fillStyle = PALETTE.queueLaneSoft;
        ctx.fillRect(markerX - 10, markerY - 10, 20, 20);

        ctx.strokeStyle = PALETTE.queueLane;
        ctx.lineWidth = 1;
        ctx.strokeRect(markerX - 10, markerY - 10, 20, 20);
      }
    });

    ctx.restore();
  }

  drawCounters(ctx, servicePoints) {
    ctx.save();

    servicePoints.forEach((point) => {
      const stallX = point.x - Math.floor(STALL_BLOCK_WIDTH / 2);
      const stallY = point.y - 104;
      const smallCounterX = point.x - Math.floor(SERVICE_BLOCK_SIZE / 2);
      const smallCounterY = point.y - Math.floor(SERVICE_BLOCK_SIZE / 2);
      const theme = getCounterTheme(point.color);

      this.shadowRenderer.drawSoftRectShadow(
        ctx,
        stallX,
        stallY,
        STALL_BLOCK_WIDTH,
        STALL_BLOCK_HEIGHT + COUNTER_DEPTH,
        { offsetX: 12, offsetY: 12, alpha: 0.16 }
      );

      ctx.fillStyle = theme.top;
      ctx.fillRect(stallX, stallY, STALL_BLOCK_WIDTH, STALL_BLOCK_HEIGHT);

      ctx.fillStyle = theme.front;
      ctx.fillRect(stallX, stallY + STALL_BLOCK_HEIGHT, STALL_BLOCK_WIDTH, COUNTER_DEPTH);

      ctx.strokeStyle = PALETTE.outline;
      ctx.lineWidth = 2;
      ctx.strokeRect(stallX, stallY, STALL_BLOCK_WIDTH, STALL_BLOCK_HEIGHT);
      ctx.strokeRect(stallX, stallY + STALL_BLOCK_HEIGHT, STALL_BLOCK_WIDTH, COUNTER_DEPTH);

      this.shadowRenderer.drawSoftRectShadow(
        ctx,
        smallCounterX,
        smallCounterY,
        SERVICE_BLOCK_SIZE,
        SERVICE_BLOCK_SIZE + 10,
        { offsetX: 6, offsetY: 8, alpha: 0.18 }
      );

      ctx.fillStyle = theme.trim;
      ctx.fillRect(smallCounterX, smallCounterY, SERVICE_BLOCK_SIZE, SERVICE_BLOCK_SIZE);

      ctx.fillStyle = theme.edge;
      ctx.fillRect(smallCounterX, smallCounterY + SERVICE_BLOCK_SIZE, SERVICE_BLOCK_SIZE, 10);

      ctx.strokeStyle = PALETTE.outline;
      ctx.lineWidth = 2;
      ctx.strokeRect(smallCounterX, smallCounterY, SERVICE_BLOCK_SIZE, SERVICE_BLOCK_SIZE);
      ctx.strokeRect(smallCounterX, smallCounterY + SERVICE_BLOCK_SIZE, SERVICE_BLOCK_SIZE, 10);

      ctx.fillStyle = PALETTE.label;
      ctx.font = "bold 12px Arial";
      ctx.fillText(formatStallLabel(point.stallId), stallX + 12, stallY + 28);

      ctx.fillStyle = PALETTE.subLabel;
      ctx.font = "11px Arial";
      ctx.fillText(point.label, point.x - 44, point.y - 22);
    });

    ctx.restore();
  }

  drawDiningTableTops(ctx, diningTables, occupiedSeatIds, playerSeatId) {
    ctx.save();

    diningTables.forEach((table) => {
      this.shadowRenderer.drawTableShadow(ctx, table.x, table.y, table.width, table.height);

      ctx.fillStyle = PALETTE.tableTop;
      ctx.fillRect(table.x, table.y, table.width, table.height);

      ctx.strokeStyle = PALETTE.tableEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(table.x, table.y, table.width, table.height);

      table.seats.forEach((seat) => {
        const isPlayerSeat = playerSeatId === seat.id;
        const isOccupied = occupiedSeatIds.has(seat.id);

        ctx.fillStyle = isPlayerSeat
          ? PALETTE.seatPlayer
          : isOccupied
            ? PALETTE.seatNpc
            : PALETTE.seatFree;

        ctx.fillRect(seat.x, seat.y, seat.width, seat.height);

        ctx.strokeStyle = PALETTE.outline;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(seat.x, seat.y, seat.width, seat.height);
      });
    });

    ctx.restore();
  }

  drawDiningTableFronts(ctx, diningTables) {
    ctx.save();

    diningTables.forEach((table) => {
      ctx.fillStyle = PALETTE.tableFront;
      ctx.fillRect(table.x, table.y + table.height, table.width, TABLE_DEPTH);

      ctx.strokeStyle = PALETTE.tableEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(table.x, table.y + table.height, table.width, TABLE_DEPTH);
    });

    ctx.restore();
  }

  drawTrayStations(ctx, trayReturnStation, washingArea, trayPath) {
    ctx.save();

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(trayPath[0].x, trayPath[0].y);
    for (let i = 1; i < trayPath.length; i += 1) {
      ctx.lineTo(trayPath[i].x, trayPath[i].y);
    }
    ctx.stroke();

    this.shadowRenderer.drawSoftRectShadow(
      ctx,
      trayReturnStation.x,
      trayReturnStation.y,
      trayReturnStation.width,
      trayReturnStation.height + 12,
      { offsetX: 8, offsetY: 10, alpha: 0.16 }
    );

    ctx.fillStyle = PALETTE.returnTop;
    ctx.fillRect(
      trayReturnStation.x,
      trayReturnStation.y,
      trayReturnStation.width,
      trayReturnStation.height
    );

    ctx.fillStyle = PALETTE.returnFront;
    ctx.fillRect(
      trayReturnStation.x,
      trayReturnStation.y + trayReturnStation.height,
      trayReturnStation.width,
      12
    );

    ctx.strokeStyle = PALETTE.outline;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      trayReturnStation.x,
      trayReturnStation.y,
      trayReturnStation.width,
      trayReturnStation.height
    );
    ctx.strokeRect(
      trayReturnStation.x,
      trayReturnStation.y + trayReturnStation.height,
      trayReturnStation.width,
      12
    );

    this.shadowRenderer.drawSoftRectShadow(
      ctx,
      washingArea.x,
      washingArea.y,
      washingArea.width,
      washingArea.height + 12,
      { offsetX: 10, offsetY: 10, alpha: 0.16 }
    );

    ctx.fillStyle = PALETTE.washingTop;
    ctx.fillRect(washingArea.x, washingArea.y, washingArea.width, washingArea.height);

    ctx.fillStyle = PALETTE.washingFront;
    ctx.fillRect(washingArea.x, washingArea.y + washingArea.height, washingArea.width, 12);

    ctx.strokeStyle = PALETTE.outline;
    ctx.lineWidth = 2;
    ctx.strokeRect(washingArea.x, washingArea.y, washingArea.width, washingArea.height);
    ctx.strokeRect(washingArea.x, washingArea.y + washingArea.height, washingArea.width, 12);

    ctx.fillStyle = PALETTE.label;
    ctx.font = "12px Arial";
    ctx.fillText("Tray Return", trayReturnStation.x - 18, trayReturnStation.y - 10);
    ctx.fillText("Washing Area", washingArea.x - 12, washingArea.y - 10);

    ctx.restore();
  }
}