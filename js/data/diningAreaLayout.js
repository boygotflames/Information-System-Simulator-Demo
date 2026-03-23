import {
  CANVAS_W,
  CANVAS_H,
  DINING_GRID,
  EXIT_POINT
} from "./LayoutConstants.js";

function createSeatSet(tableId, tableLabel, tableX, tableY, tableW, tableH) {
  const seatSize = DINING_GRID.seatSize;
  const seatOffset = DINING_GRID.seatOffset;

  const horizontalGap = Math.floor((tableW - seatSize * 3) / 4);
  const seatXs = [
    tableX + horizontalGap,
    tableX + horizontalGap * 2 + seatSize,
    tableX + horizontalGap * 3 + seatSize * 2
  ];

  const topY = tableY - seatSize - seatOffset;
  const bottomY = tableY + tableH + seatOffset;

  return seatXs.flatMap((seatX, index) => {
    const seatNumber = index + 1;

    return [
      {
        id: `${tableId}_top_${seatNumber}`,
        tableId,
        label: `${tableLabel}-T${seatNumber}`,
        side: "top",
        x: seatX,
        y: topY,
        width: seatSize,
        height: seatSize,
        actorX: seatX,
        actorY: topY,
        anchorX: seatX + seatSize / 2,
        anchorY: topY + seatSize / 2
      },
      {
        id: `${tableId}_bottom_${seatNumber}`,
        tableId,
        label: `${tableLabel}-B${seatNumber}`,
        side: "bottom",
        x: seatX,
        y: bottomY,
        width: seatSize,
        height: seatSize,
        actorX: seatX,
        actorY: bottomY,
        anchorX: seatX + seatSize / 2,
        anchorY: bottomY + seatSize / 2
      }
    ];
  });
}

function createDiningTable(col, row) {
  const x = DINING_GRID.originX + col * (DINING_GRID.tableW + DINING_GRID.gapX);
  const y = DINING_GRID.originY + row * (DINING_GRID.tableH + DINING_GRID.gapY);
  const id = `table_${row * DINING_GRID.cols + col + 1}`;
  const label = `T${row * DINING_GRID.cols + col + 1}`;

  return {
    id,
    label,
    col,
    row,
    x,
    y,
    width: DINING_GRID.tableW,
    height: DINING_GRID.tableH,
    seats: createSeatSet(id, label, x, y, DINING_GRID.tableW, DINING_GRID.tableH)
  };
}

export const DINING_TABLES = Array.from({ length: DINING_GRID.rows }, (_, row) =>
  Array.from({ length: DINING_GRID.cols }, (_, col) => createDiningTable(col, row))
).flat();

export const DINING_TABLES_8 = DINING_TABLES;

export const DINING_TABLE_RECTS = DINING_TABLES.map((table) => ({
  x: table.x,
  y: table.y,
  w: table.width,
  h: table.height,
  label: table.label
}));

export const ALL_DINING_SEATS = DINING_TABLES.flatMap((table) => table.seats);

export const TRAY_RETURN_STATION = {
  x: 918,
  y: 356,
  width: 16,
  height: 56,
  label: "Tray Return"
};

export const WASHING_AREA = {
  x: 886,
  y: 474,
  width: 60,
  height: 36,
  label: "Washing Area"
};

export const TRAY_RETURN_PATH = [
  { x: TRAY_RETURN_STATION.x + Math.floor(TRAY_RETURN_STATION.width / 2), y: 388 },
  { x: TRAY_RETURN_STATION.x + Math.floor(TRAY_RETURN_STATION.width / 2), y: 432 },
  { x: TRAY_RETURN_STATION.x + Math.floor(TRAY_RETURN_STATION.width / 2), y: 488 }
];

export const DINING_ROUTE_LANES = {
  entryX: 520,
  northY: DINING_GRID.originY - 14,
  middleY:
    DINING_GRID.originY +
    DINING_GRID.tableH +
    Math.floor(DINING_GRID.gapY / 2),
  southY:
    DINING_GRID.originY +
    (DINING_GRID.tableH + DINING_GRID.gapY) * DINING_GRID.rows +
    4,
  trayLaneX: TRAY_RETURN_STATION.x + TRAY_RETURN_STATION.width + 10,
  exitLaneX: EXIT_POINT.x,
  exitY: EXIT_POINT.y
};

export function getSeatById(seatId) {
  return ALL_DINING_SEATS.find((seat) => seat.id === seatId) || null;
}