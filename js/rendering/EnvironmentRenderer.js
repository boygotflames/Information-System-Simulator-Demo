import PALETTE from "./palette.js";
import {
  TILE_SIZE,
  STALL_BLOCK_WIDTH,
  STALL_BLOCK_HEIGHT,
  COUNTER_DEPTH,
  SERVICE_BLOCK_SIZE,
  TABLE_DEPTH,
  UI_FONT_FAMILY,
  DISPLAY_FONT_FAMILY,
  WALL_BAND_HEIGHT,
  getCounterTheme
} from "./visualTheme.js";
import {
  drawCounterSkin,
  drawDecor,
  drawFramedPanel,
  drawSpriteOrFallback,
  drawTableSkin,
  drawTiledArea
} from "./renderSkin.js";

function formatStallLabel(stallId) {
  return stallId
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getDiningBounds(diningTables) {
  const tableXs = diningTables.map((table) => table.x);
  const tableYs = diningTables.map((table) => table.y);
  const tableWidths = diningTables.map((table) => table.width);
  const tableHeights = diningTables.map((table) => table.height + TABLE_DEPTH);

  return {
    minX: Math.min(...tableXs) - 38,
    minY: Math.min(...tableYs) - 54,
    maxX: Math.max(...tableXs.map((x, index) => x + tableWidths[index])) + 38,
    maxY: Math.max(...tableYs.map((y, index) => y + tableHeights[index])) + 54
  };
}

function getServiceBounds(servicePoints) {
  const stallRects = servicePoints.map((point) => point.stallRect);

  return {
    minX: Math.min(...stallRects.map((rect) => rect.x)) - 54,
    minY: Math.min(...stallRects.map((rect) => rect.y)) - 48,
    maxX: Math.max(...stallRects.map((rect) => rect.x + rect.w)) + 54,
    maxY: Math.max(...stallRects.map((rect) => rect.y + rect.h)) + 74
  };
}

function getCounterRoleBase(stallId) {
  switch (stallId) {
    case "ramen_stall":
      return "counter.ramen";
    case "dry_noodle_stall":
      return "counter.dry";
    case "soup_station":
      return "counter.soup";
    default:
      return null;
  }
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
      trayPath,
      trayDropSlots = [],
      time = 0
    } = scene;

    const diningBounds = getDiningBounds(diningTables);
    const serviceBounds = getServiceBounds(servicePoints);
    const utilityBounds = {
      minX: trayReturnStation.x - 48,
      minY: trayReturnStation.y - 70,
      maxX: washingArea.x + washingArea.width + 20,
      maxY: washingArea.y + washingArea.height + 30
    };

    this.drawRoomShell(ctx, canvas, servicePoints, diningBounds, utilityBounds, time);
    this.drawFloor(ctx, canvas, diningBounds, serviceBounds, utilityBounds);
    this.drawQueueLanes(ctx, servicePoints);
    this.drawCounters(ctx, servicePoints);
    this.drawDiningTableTops(ctx, diningTables, occupiedSeatIds, playerSeatId);
    this.drawTrayStations(ctx, trayReturnStation, washingArea, trayPath, trayDropSlots);
    this.drawAmbientLife(ctx, canvas, time);
  }

  drawForeground(ctx, scene) {
    this.drawDiningTableFronts(ctx, scene.diningTables);
  }

  drawRoomShell(ctx, canvas, servicePoints, diningBounds, utilityBounds, time) {
    ctx.save();

    ctx.fillStyle = PALETTE.canvasBackground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = PALETTE.roomShell;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawTiledArea(ctx, {
      role: "wall.band",
      x: 0,
      y: 0,
      width: canvas.width,
      height: WALL_BAND_HEIGHT,
      tileWidth: 48,
      tileHeight: 48,
      drawFallbackTile: ({ tileX, tileY, tileWidth, tileHeight }) => {
        ctx.fillStyle = PALETTE.wallTop;
        ctx.fillRect(tileX, tileY, tileWidth, tileHeight);
      }
    });

    ctx.fillStyle = "rgba(19, 37, 58, 0.56)";
    ctx.fillRect(0, 0, canvas.width, WALL_BAND_HEIGHT);

    ctx.fillStyle = PALETTE.wallInset;
    ctx.fillRect(0, WALL_BAND_HEIGHT, canvas.width, 96);

    this.drawWallWindows(ctx, servicePoints);

    servicePoints.forEach((point, index) => {
      const stallX = point.stallRect.x - 18;
      const panelY = 92;
      const panelW = point.stallRect.w + 36;
      const pulse = 0.05 + (Math.sin(time * 1.2 + index) + 1) * 0.015;

      ctx.fillStyle = PALETTE.wallGlow;
      ctx.globalAlpha = pulse;
      ctx.fillRect(stallX, panelY, panelW, 96);
      ctx.globalAlpha = 1;

      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(stallX, panelY, panelW, 96);
      ctx.setLineDash([]);

      ctx.fillStyle = PALETTE.plaque;
      ctx.fillRect(stallX + 10, panelY + 10, panelW - 20, 18);
      ctx.strokeStyle = PALETTE.plaqueStroke;
      ctx.lineWidth = 1;
      ctx.strokeRect(stallX + 10, panelY + 10, panelW - 20, 18);
    });

    drawTiledArea(ctx, {
      role: "wall.trim",
      x: 0,
      y: WALL_BAND_HEIGHT + 95,
      width: canvas.width,
      height: 12,
      tileWidth: 48,
      tileHeight: 12,
      drawFallbackTile: ({ tileX, tileY, tileWidth, tileHeight }) => {
        ctx.fillStyle = PALETTE.divider;
        ctx.fillRect(tileX, tileY, tileWidth, tileHeight);
      }
    });

    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(diningBounds.minX, diningBounds.minY - 12, diningBounds.maxX - diningBounds.minX, 6);
    ctx.fillRect(utilityBounds.minX, utilityBounds.minY - 12, utilityBounds.maxX - utilityBounds.minX, 6);

    for (let i = 0; i < 3; i += 1) {
      const lampX = 180 + i * 290;
      const glowAlpha = 0.06 + (Math.sin(time * 2 + i) + 1) * 0.02;

      ctx.fillStyle = "rgba(255,243,208,0.14)";
      ctx.fillRect(lampX - 2, 0, 4, 36);

      ctx.globalAlpha = glowAlpha;
      ctx.fillStyle = "#f8dca0";
      ctx.fillRect(lampX - 34, 40, 68, 10);
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#d8a95b";
      ctx.fillRect(lampX - 20, 36, 40, 8);
    }

    drawFramedPanel(ctx, {
      x: 22,
      y: 18,
      width: 182,
      height: 44,
      title: "Campus Canteen",
      subtitle: "Live operations floor"
    });

    drawFramedPanel(ctx, {
      x: diningBounds.minX + 12,
      y: diningBounds.minY + 12,
      width: 152,
      height: 30,
      title: "Dining Commons",
      subtitle: "Student seating",
      titleSize: 14,
      subtitleSize: 9
    });

    drawFramedPanel(ctx, {
      x: utilityBounds.minX + 10,
      y: utilityBounds.minY + 12,
      width: 142,
      height: 30,
      title: "Return Corner",
      subtitle: "Tray + wash lane",
      titleSize: 14,
      subtitleSize: 9
    });

    ctx.restore();
  }

  drawWallWindows(ctx, servicePoints) {
    servicePoints.forEach((point) => {
      const windowX = point.x - 30;

      drawDecor(ctx, {
        role: "wall.window",
        x: windowX,
        y: 14,
        width: 60,
        height: 48,
        drawFallback: () => {
          ctx.fillStyle = "rgba(255,255,255,0.035)";
          ctx.fillRect(windowX, 18, 60, 40);
        }
      });
    });
  }

  drawFloor(ctx, canvas, diningBounds, serviceBounds, utilityBounds) {
    ctx.save();

    drawTiledArea(ctx, {
      role: "floor.base",
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
      tileWidth: TILE_SIZE,
      originX: 0,
      originY: 0,
      drawFallbackTile: ({ tileX, tileY }) => {
        this.drawFloorTileFallback(ctx, tileX, tileY, PALETTE.floorTileA, PALETTE.floorTileB);
      }
    });

    this.drawFloorZone(ctx, serviceBounds, "floor.service", PALETTE.serviceFloorA, PALETTE.serviceFloorB);
    this.drawFloorZone(ctx, diningBounds, "floor.dining", PALETTE.diningFloorA, PALETTE.diningFloorB);
    this.drawFloorZone(ctx, utilityBounds, "floor.utility", PALETTE.utilityFloorA, PALETTE.utilityFloorB);

    ctx.fillStyle = PALETTE.serviceZone;
    ctx.fillRect(
      serviceBounds.minX,
      serviceBounds.minY,
      serviceBounds.maxX - serviceBounds.minX,
      serviceBounds.maxY - serviceBounds.minY
    );

    ctx.fillStyle = PALETTE.diningZone;
    ctx.fillRect(
      diningBounds.minX,
      diningBounds.minY,
      diningBounds.maxX - diningBounds.minX,
      diningBounds.maxY - diningBounds.minY
    );

    ctx.fillStyle = PALETTE.washZone;
    ctx.fillRect(
      utilityBounds.minX,
      utilityBounds.minY,
      utilityBounds.maxX - utilityBounds.minX,
      utilityBounds.maxY - utilityBounds.minY
    );

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

    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      diningBounds.minX,
      diningBounds.minY,
      diningBounds.maxX - diningBounds.minX,
      diningBounds.maxY - diningBounds.minY
    );

    ctx.strokeRect(
      utilityBounds.minX,
      utilityBounds.minY,
      utilityBounds.maxX - utilityBounds.minX,
      utilityBounds.maxY - utilityBounds.minY
    );

    ctx.strokeStyle = PALETTE.utilityStripe;
    ctx.lineWidth = 3;
    for (let x = utilityBounds.minX + 10; x < utilityBounds.maxX; x += 26) {
      ctx.beginPath();
      ctx.moveTo(x, utilityBounds.minY + 18);
      ctx.lineTo(x + 12, utilityBounds.minY + 6);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawFloorZone(ctx, bounds, role, primaryColor, secondaryColor) {
    drawTiledArea(ctx, {
      role,
      x: bounds.minX,
      y: bounds.minY,
      width: bounds.maxX - bounds.minX,
      height: bounds.maxY - bounds.minY,
      tileWidth: TILE_SIZE,
      originX: 0,
      originY: 0,
      drawFallbackTile: ({ tileX, tileY }) => {
        this.drawFloorTileFallback(ctx, tileX, tileY, primaryColor, secondaryColor);
      }
    });
  }

  drawFloorTileFallback(ctx, tileX, tileY, primaryColor, secondaryColor) {
    const fill = ((tileX / TILE_SIZE) + (tileY / TILE_SIZE)) % 2 === 0
      ? primaryColor
      : secondaryColor;

    ctx.fillStyle = fill;
    ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);

    ctx.fillStyle = PALETTE.floorSpeck;
    ctx.fillRect(tileX + 6, tileY + 7, 2, 2);
    ctx.fillRect(tileX + 21, tileY + 18, 2, 2);
  }

  drawQueueLanes(ctx, servicePoints) {
    ctx.save();

    servicePoints.forEach((point) => {
      ctx.strokeStyle = PALETTE.queueLane;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y + 10);
      ctx.lineTo(point.queueFrontX, point.queueY - 14);
      ctx.stroke();

      const slotCount = point.queueSlots ?? 4;

      for (let i = 0; i < slotCount; i += 1) {
        const markerX = point.queueFrontX;
        const markerY = point.queueY + i * point.queueSpacing;

        drawDecor(ctx, {
          role: "queue.slot",
          x: markerX - 13,
          y: markerY - 13,
          width: 26,
          height: 26,
          drawFallback: () => {
            this.drawQueuePadFallback(ctx, markerX, markerY);
          }
        });
      }
    });

    ctx.restore();
  }

  drawQueuePadFallback(ctx, markerX, markerY) {
    ctx.fillStyle = PALETTE.queueLaneSoft;
    ctx.fillRect(markerX - 13, markerY - 13, 26, 26);

    ctx.fillStyle = PALETTE.queuePad;
    ctx.fillRect(markerX - 9, markerY - 9, 18, 18);

    ctx.strokeStyle = PALETTE.queuePadEdge;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(markerX - 9, markerY - 9, 18, 18);

    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(markerX - 3, markerY - 6, 6, 12);
  }

  drawCounters(ctx, servicePoints) {
    ctx.save();

    servicePoints.forEach((point) => {
      const stallX = point.x - Math.floor(STALL_BLOCK_WIDTH / 2);
      const stallY = point.y - 104;
      const smallCounterX = point.x - Math.floor(SERVICE_BLOCK_SIZE / 2);
      const smallCounterY = point.y - Math.floor(SERVICE_BLOCK_SIZE / 2);
      const signY = stallY - 24;
      const theme = getCounterTheme(point.color);
      const roleBase = getCounterRoleBase(point.stallId);

      this.shadowRenderer.drawSoftRectShadow(
        ctx,
        stallX,
        stallY - 14,
        STALL_BLOCK_WIDTH,
        STALL_BLOCK_HEIGHT + COUNTER_DEPTH + 14,
        { offsetX: 12, offsetY: 12, alpha: 0.16 }
      );

      drawCounterSkin(ctx, {
        bodyRole: roleBase ? `${roleBase}.body` : null,
        frontRole: roleBase ? `${roleBase}.front` : null,
        serviceRole: roleBase ? `${roleBase}.service` : null,
        x: stallX,
        y: stallY,
        width: STALL_BLOCK_WIDTH,
        height: STALL_BLOCK_HEIGHT,
        frontDepth: COUNTER_DEPTH,
        serviceBox: {
          x: smallCounterX,
          y: smallCounterY,
          width: SERVICE_BLOCK_SIZE,
          height: SERVICE_BLOCK_SIZE + 10
        },
        drawFallback: () => {
          this.drawCounterFallback(ctx, theme, stallX, stallY, signY, smallCounterX, smallCounterY);
        }
      });

      this.drawCounterSignPlate(ctx, theme, stallX, signY);

      ctx.fillStyle = PALETTE.label;
      ctx.font = `700 17px ${DISPLAY_FONT_FAMILY}`;
      ctx.fillText(point.displayName || formatStallLabel(point.stallId), stallX + 14, signY + 14);

      ctx.fillStyle = PALETTE.subLabel;
      ctx.font = `600 11px ${UI_FONT_FAMILY}`;
      ctx.fillText(point.label, stallX + 16, stallY + STALL_BLOCK_HEIGHT + 12);

      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.fillRect(point.x - 3, point.y - 3, 6, 6);
    });

    ctx.restore();
  }

  drawCounterSignPlate(ctx, theme, stallX, signY) {
    ctx.fillStyle = PALETTE.plaque;
    ctx.fillRect(stallX - 10, signY - 8, STALL_BLOCK_WIDTH + 20, 12);

    ctx.fillStyle = theme.sign;
    ctx.fillRect(stallX + 10, signY, STALL_BLOCK_WIDTH - 20, 18);
    ctx.strokeStyle = PALETTE.plaqueStroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(stallX + 10, signY, STALL_BLOCK_WIDTH - 20, 18);
  }

  drawCounterFallback(ctx, theme, stallX, stallY, signY, smallCounterX, smallCounterY) {
    ctx.fillStyle = theme.top;
    ctx.fillRect(stallX, stallY, STALL_BLOCK_WIDTH, STALL_BLOCK_HEIGHT);

    ctx.fillStyle = theme.stripe;
    ctx.fillRect(stallX + 6, stallY + 8, STALL_BLOCK_WIDTH - 12, 12);

    ctx.fillStyle = theme.front;
    ctx.fillRect(stallX, stallY + STALL_BLOCK_HEIGHT, STALL_BLOCK_WIDTH, COUNTER_DEPTH);

    ctx.fillStyle = theme.edge;
    ctx.fillRect(stallX, stallY + STALL_BLOCK_HEIGHT + COUNTER_DEPTH - 4, STALL_BLOCK_WIDTH, 4);

    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(stallX + 10, stallY + 28, STALL_BLOCK_WIDTH - 20, 2);
    ctx.fillRect(stallX + 10, stallY + 40, STALL_BLOCK_WIDTH - 20, 2);

    ctx.strokeStyle = PALETTE.outline;
    ctx.lineWidth = 2;
    ctx.strokeRect(stallX, stallY, STALL_BLOCK_WIDTH, STALL_BLOCK_HEIGHT);
    ctx.strokeRect(stallX, stallY + STALL_BLOCK_HEIGHT, STALL_BLOCK_WIDTH, COUNTER_DEPTH);

    ctx.fillStyle = theme.trim;
    ctx.fillRect(smallCounterX, smallCounterY, SERVICE_BLOCK_SIZE, SERVICE_BLOCK_SIZE);

    ctx.fillStyle = theme.edge;
    ctx.fillRect(smallCounterX, smallCounterY + SERVICE_BLOCK_SIZE, SERVICE_BLOCK_SIZE, 10);

    ctx.fillStyle = theme.glow;
    ctx.globalAlpha = 0.22;
    ctx.fillRect(smallCounterX - 6, smallCounterY - 6, SERVICE_BLOCK_SIZE + 12, 10);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = PALETTE.outline;
    ctx.lineWidth = 2;
    ctx.strokeRect(smallCounterX, smallCounterY, SERVICE_BLOCK_SIZE, SERVICE_BLOCK_SIZE);
    ctx.strokeRect(smallCounterX, smallCounterY + SERVICE_BLOCK_SIZE, SERVICE_BLOCK_SIZE, 10);
  }

  drawDiningTableTops(ctx, diningTables, occupiedSeatIds, playerSeatId) {
    ctx.save();

    diningTables.forEach((table) => {
      this.shadowRenderer.drawTableShadow(ctx, table.x, table.y, table.width, table.height);

      drawTableSkin(ctx, {
        phase: "top",
        x: table.x,
        y: table.y,
        width: table.width,
        height: table.height,
        frontDepth: TABLE_DEPTH,
        drawFallback: () => {
          this.drawDiningTableTopFallback(ctx, table);
        }
      });

      table.seats.forEach((seat) => {
        const isPlayerSeat = playerSeatId === seat.id;
        const isOccupied = occupiedSeatIds.has(seat.id);

        drawSpriteOrFallback(ctx, {
          role: "chair.visible",
          x: seat.x,
          y: seat.y,
          width: seat.width,
          height: seat.height + 2,
          drawFallback: () => {
            this.drawSeatFallback(ctx, seat, isPlayerSeat, isOccupied);
          }
        });
      });
    });

    ctx.restore();
  }

  drawDiningTableTopFallback(ctx, table) {
    ctx.fillStyle = PALETTE.tableTop;
    ctx.fillRect(table.x, table.y, table.width, table.height);

    ctx.fillStyle = PALETTE.tableInset;
    ctx.fillRect(table.x + 8, table.y + 6, table.width - 16, table.height - 16);

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(table.x + 10, table.y + 8, table.width - 20, 4);

    ctx.strokeStyle = PALETTE.tableEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(table.x, table.y, table.width, table.height);
  }

  drawSeatFallback(ctx, seat, isPlayerSeat, isOccupied) {
    ctx.fillStyle = PALETTE.seatBack;
    ctx.fillRect(seat.x, seat.y + seat.height - 2, seat.width, 4);

    ctx.fillStyle = isPlayerSeat
      ? PALETTE.seatPlayer
      : isOccupied
        ? PALETTE.seatNpc
        : PALETTE.seatFree;
    ctx.fillRect(seat.x, seat.y, seat.width, seat.height - 2);

    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(seat.x + 2, seat.y + 1, seat.width - 4, 2);

    ctx.strokeStyle = PALETTE.outline;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(seat.x, seat.y, seat.width, seat.height);

    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(seat.mealX, seat.mealY, 10, 4);
  }

  drawDiningTableFronts(ctx, diningTables) {
    ctx.save();

    diningTables.forEach((table) => {
      drawTableSkin(ctx, {
        phase: "front",
        x: table.x,
        y: table.y,
        width: table.width,
        height: table.height,
        frontDepth: TABLE_DEPTH,
        drawFallback: () => {
          this.drawDiningTableFrontFallback(ctx, table);
        }
      });
    });

    ctx.restore();
  }

  drawDiningTableFrontFallback(ctx, table) {
    ctx.fillStyle = PALETTE.tableFront;
    ctx.fillRect(table.x, table.y + table.height, table.width, TABLE_DEPTH);

    ctx.fillStyle = PALETTE.tableLeg;
    ctx.fillRect(table.x + 8, table.y + table.height + 2, 8, TABLE_DEPTH - 2);
    ctx.fillRect(table.x + table.width - 16, table.y + table.height + 2, 8, TABLE_DEPTH - 2);

    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(table.x, table.y + table.height + TABLE_DEPTH - 4, table.width, 4);

    ctx.strokeStyle = PALETTE.tableEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(table.x, table.y + table.height, table.width, TABLE_DEPTH);
  }

  drawTrayStations(ctx, trayReturnStation, washingArea, trayPath, trayDropSlots) {
    ctx.save();

    ctx.strokeStyle = PALETTE.utilityStripe;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(trayPath[0].x, trayPath[0].y);
    for (let i = 1; i < trayPath.length; i += 1) {
      ctx.lineTo(trayPath[i].x, trayPath[i].y);
    }
    ctx.stroke();

    trayDropSlots.forEach((slot, index) => {
      drawDecor(ctx, {
        role: "tray.slot",
        x: slot.x - 10,
        y: slot.y - 10,
        width: 20,
        height: 20,
        drawFallback: () => {
          this.drawTraySlotFallback(ctx, slot, index);
        }
      });
    });

    this.shadowRenderer.drawSoftRectShadow(
      ctx,
      trayReturnStation.x,
      trayReturnStation.y,
      trayReturnStation.width,
      trayReturnStation.height + 14,
      { offsetX: 10, offsetY: 12, alpha: 0.18 }
    );

    drawSpriteOrFallback(ctx, {
      role: "tray.return",
      x: trayReturnStation.x,
      y: trayReturnStation.y,
      width: trayReturnStation.width,
      height: trayReturnStation.height + 14,
      drawFallback: () => {
        this.drawTrayReturnFallback(ctx, trayReturnStation);
      }
    });

    this.shadowRenderer.drawSoftRectShadow(
      ctx,
      washingArea.x,
      washingArea.y,
      washingArea.width,
      washingArea.height + 16,
      { offsetX: 10, offsetY: 10, alpha: 0.18 }
    );

    drawSpriteOrFallback(ctx, {
      role: "wash.station",
      x: washingArea.x,
      y: washingArea.y,
      width: washingArea.width,
      height: washingArea.height + 16,
      drawFallback: () => {
        this.drawWashStationFallback(ctx, washingArea);
      }
    });

    ctx.fillStyle = PALETTE.label;
    ctx.font = `700 14px ${DISPLAY_FONT_FAMILY}`;
    ctx.fillText("Tray Return", trayReturnStation.x - 24, trayReturnStation.y - 14);
    ctx.fillText("Wash Station", washingArea.x - 12, washingArea.y - 14);

    ctx.fillStyle = PALETTE.subLabel;
    ctx.font = `600 10px ${UI_FONT_FAMILY}`;
    ctx.fillText("Drop point", trayReturnStation.x - 18, trayReturnStation.y - 2);
    ctx.fillText("Rinse + cycle", washingArea.x - 2, washingArea.y - 2);

    ctx.restore();
  }

  drawTraySlotFallback(ctx, slot, index) {
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(slot.x - 10, slot.y - 10, 20, 20);

    ctx.strokeStyle = index === 1 ? PALETTE.divider : PALETTE.queuePadEdge;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(slot.x - 10, slot.y - 10, 20, 20);
  }

  drawTrayReturnFallback(ctx, trayReturnStation) {
    ctx.fillStyle = PALETTE.returnTop;
    ctx.fillRect(
      trayReturnStation.x,
      trayReturnStation.y,
      trayReturnStation.width,
      trayReturnStation.height
    );

    ctx.fillStyle = PALETTE.steelDark;
    ctx.fillRect(trayReturnStation.x - 4, trayReturnStation.y + 8, trayReturnStation.width + 8, 10);
    ctx.fillRect(trayReturnStation.x - 4, trayReturnStation.y + 26, trayReturnStation.width + 8, 10);

    ctx.fillStyle = PALETTE.returnFront;
    ctx.fillRect(
      trayReturnStation.x,
      trayReturnStation.y + trayReturnStation.height,
      trayReturnStation.width,
      14
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
      14
    );
  }

  drawWashStationFallback(ctx, washingArea) {
    ctx.fillStyle = PALETTE.washingTop;
    ctx.fillRect(washingArea.x, washingArea.y, washingArea.width, washingArea.height);

    ctx.fillStyle = PALETTE.steelLight;
    ctx.fillRect(washingArea.x + 8, washingArea.y + 8, washingArea.width - 16, 10);
    ctx.fillRect(washingArea.x + 8, washingArea.y + 24, 18, 8);
    ctx.fillRect(washingArea.x + 34, washingArea.y + 24, 18, 8);

    ctx.fillStyle = PALETTE.washingFront;
    ctx.fillRect(washingArea.x, washingArea.y + washingArea.height, washingArea.width, 16);

    ctx.strokeStyle = PALETTE.outline;
    ctx.lineWidth = 2;
    ctx.strokeRect(washingArea.x, washingArea.y, washingArea.width, washingArea.height);
    ctx.strokeRect(washingArea.x, washingArea.y + washingArea.height, washingArea.width, 16);
  }

  drawAmbientLife(ctx, canvas, time) {
    ctx.save();

    drawDecor(ctx, {
      role: "plant.small",
      x: 48,
      y: 110,
      width: 22,
      height: 34,
      drawFallback: () => {
        this.drawPlant(ctx, 48, 110, 1);
      }
    });

    drawDecor(ctx, {
      role: "plant.small",
      x: canvas.width - 96,
      y: 118,
      width: 20,
      height: 30,
      drawFallback: () => {
        this.drawPlant(ctx, canvas.width - 96, 118, 0.9);
      }
    });

    drawDecor(ctx, {
      role: "poster.small",
      x: 698,
      y: 24,
      width: 96,
      height: 48,
      drawFallback: () => {
        this.drawPoster(ctx, 698, 24, 96, 38, "OPEN LAB", "Queue data live");
      }
    });

    drawDecor(ctx, {
      role: "poster.banner",
      x: 810,
      y: 24,
      width: 108,
      height: 48,
      drawFallback: () => {
        this.drawPoster(ctx, 810, 24, 108, 38, "CAMPUS SPECIAL", "Fresh soup today");
      }
    });

    drawDecor(ctx, {
      role: "prop.decor.small",
      x: canvas.width - 104,
      y: 108,
      width: 18,
      height: 54,
      drawFallback: () => {
        this.drawLampFallback(ctx, canvas.width - 104, 108);
      }
    });

    drawDecor(ctx, {
      role: "pet.cat.static",
      x: 52,
      y: canvas.height - 62,
      width: 40,
      height: 40,
      drawFallback: () => {
        this.drawCat(ctx, 52, canvas.height - 62, time);
      }
    });

    drawDecor(ctx, {
      role: "pet.dog.static",
      x: 146,
      y: canvas.height - 54,
      width: 30,
      height: 30,
      drawFallback: () => {
        this.drawDogFallback(ctx, 146, canvas.height - 54);
      }
    });

    ctx.restore();
  }

  drawPlant(ctx, x, y, scale = 1) {
    const w = Math.round(22 * scale);
    const h = Math.round(20 * scale);

    ctx.fillStyle = PALETTE.plantPot;
    ctx.fillRect(x, y + h + 4, w, 10);

    ctx.fillStyle = PALETTE.plantLeaf;
    ctx.fillRect(x + 4, y + 10, 6, h);
    ctx.fillRect(x + 10, y + 2, 6, h + 8);
    ctx.fillRect(x + 16, y + 12, 6, h - 2);

    ctx.fillStyle = PALETTE.plantLeafDark;
    ctx.fillRect(x + 1, y + 16, 6, h - 4);
    ctx.fillRect(x + 18, y + 16, 5, h - 4);
  }

  drawPoster(ctx, x, y, width, height, title, subline) {
    ctx.fillStyle = PALETTE.posterBg;
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = PALETTE.posterAccent;
    ctx.fillRect(x, y, width, 6);

    ctx.strokeStyle = PALETTE.plaqueStroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = PALETTE.label;
    ctx.font = `700 12px ${DISPLAY_FONT_FAMILY}`;
    ctx.fillText(title, x + 8, y + 18);

    ctx.fillStyle = PALETTE.subLabel;
    ctx.font = `600 9px ${UI_FONT_FAMILY}`;
    ctx.fillText(subline, x + 8, y + 30);
  }

  drawCat(ctx, x, y, time) {
    const tailOffset = Math.round(Math.sin(time * 2.2) * 3);

    ctx.fillStyle = PALETTE.catBody;
    ctx.fillRect(x + 8, y + 10, 24, 12);
    ctx.fillRect(x + 22, y + 2, 12, 10);
    ctx.fillRect(x, y + 12, 12, 6);

    ctx.fillStyle = PALETTE.catStripe;
    ctx.fillRect(x + 12, y + 14, 4, 8);
    ctx.fillRect(x + 22, y + 14, 4, 8);
    ctx.fillRect(x - 2, y + 8 + tailOffset, 12, 3);

    ctx.fillStyle = PALETTE.outline;
    ctx.fillRect(x + 26, y + 6, 2, 2);
    ctx.fillRect(x + 30, y + 6, 2, 2);
  }

  drawDogFallback(ctx, x, y) {
    ctx.fillStyle = "#d7bf94";
    ctx.fillRect(x + 8, y + 10, 18, 10);
    ctx.fillRect(x + 18, y + 4, 10, 8);
    ctx.fillRect(x + 2, y + 12, 8, 4);

    ctx.fillStyle = "#8a5a3d";
    ctx.fillRect(x + 10, y + 14, 4, 6);
    ctx.fillRect(x + 18, y + 14, 4, 6);
    ctx.fillRect(x + 2, y + 10, 8, 2);

    ctx.fillStyle = PALETTE.outline;
    ctx.fillRect(x + 22, y + 7, 2, 2);
  }

  drawLampFallback(ctx, x, y) {
    ctx.fillStyle = "#f3d29c";
    ctx.fillRect(x + 2, y, 14, 8);
    ctx.fillRect(x + 5, y + 8, 8, 28);

    ctx.fillStyle = "#7d5231";
    ctx.fillRect(x + 3, y + 36, 12, 4);
  }

  drawSignPlaque(ctx, x, y, width, height, title, subtitle) {
    drawFramedPanel(ctx, {
      x,
      y,
      width,
      height,
      title,
      subtitle
    });
  }
}
