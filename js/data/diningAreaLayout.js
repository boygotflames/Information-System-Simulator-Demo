import {
  CANVAS_W,
  CANVAS_H,
  DINING_GRID,
  EXIT_POINT
} from "./LayoutConstants.js";

const DINING_AREA_GRID = {
  ...DINING_GRID,
  gapX: DINING_GRID.gapX + 22,
  gapY: DINING_GRID.gapY + 20,
  originX: DINING_GRID.originX - 90,
  originY: DINING_GRID.originY + 20
};

function createSeatSet(tableId, tableLabel, tableX, tableY, tableW, tableH) {
  const seatSize = DINING_AREA_GRID.seatSize;
  const seatOffset = DINING_AREA_GRID.seatOffset;

  const horizontalGap = Math.floor((tableW - seatSize * 3) / 4);
  const seatXs = [
    tableX + horizontalGap,
    tableX + horizontalGap * 2 + seatSize,
    tableX + horizontalGap * 3 + seatSize * 2
  ];

  const visibleSeatY = tableY - seatSize - seatOffset;
  const mealY = tableY + 8;

  return seatXs.map((seatX, index) => {
    const seatNumber = index + 1;
    const actorX = seatX - 4;
    const actorY = visibleSeatY - 12;

    return {
      id: `${tableId}_top_${seatNumber}`,
      tableId,
      label: `${tableLabel}-S${seatNumber}`,
      side: "top",
      x: seatX,
      y: visibleSeatY,
      width: seatSize,
      height: seatSize,

      actorX,
      actorY,
      anchorX: actorX + 9,
      anchorY: actorY + 9,

      mealX: seatX,
      mealY
    };
  });
}

function createDiningTable(col, row) {
  const x = DINING_AREA_GRID.originX + col * (DINING_AREA_GRID.tableW + DINING_AREA_GRID.gapX);
  const y = DINING_AREA_GRID.originY + row * (DINING_AREA_GRID.tableH + DINING_AREA_GRID.gapY);
  const id = `table_${row * DINING_AREA_GRID.cols + col + 1}`;
  const label = `T${row * DINING_AREA_GRID.cols + col + 1}`;

  return {
    id,
    label,
    col,
    row,
    x,
    y,
    width: DINING_AREA_GRID.tableW,
    height: DINING_AREA_GRID.tableH,
    seats: createSeatSet(id, label, x, y, DINING_AREA_GRID.tableW, DINING_AREA_GRID.tableH)
  };
}

export const DINING_TABLES = Array.from({ length: DINING_AREA_GRID.rows }, (_, row) =>
  Array.from({ length: DINING_AREA_GRID.cols }, (_, col) => createDiningTable(col, row))
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

export const TRAY_DROP_SLOTS = [
  { id: "tray-slot-1", x: 881, y: 341 },
  { id: "tray-slot-2", x: 905, y: 341 },
  { id: "tray-slot-3", x: 929, y: 341 }
];

export const TRAY_DROP_ANCHOR = {
  x: TRAY_DROP_SLOTS[1].x,
  y: TRAY_DROP_SLOTS[1].y
};

export const TRAY_EXIT_ANCHOR = {
  x: 945,
  y: 341
};

const NORTH_WALK_Y = Math.max(72, DINING_AREA_GRID.originY - 26);
const CENTER_WALK_Y =
  DINING_AREA_GRID.originY +
  DINING_AREA_GRID.tableH +
  Math.floor(DINING_AREA_GRID.gapY / 2);
const SOUTH_WALK_Y = Math.min(
  CANVAS_H - 32,
  DINING_AREA_GRID.originY +
    (DINING_AREA_GRID.tableH + DINING_AREA_GRID.gapY) * DINING_AREA_GRID.rows -
    8
);

const FIRST_TABLE = DINING_TABLES[0];
const SECOND_TABLE = DINING_TABLES[1];
const THIRD_TABLE = DINING_TABLES[2];

const WEST_ENTRY_X = FIRST_TABLE.x - 34;
const AISLE_1_X = FIRST_TABLE.x + FIRST_TABLE.width + Math.floor(DINING_AREA_GRID.gapX / 2);
const AISLE_2_X = SECOND_TABLE.x + SECOND_TABLE.width + Math.floor(DINING_AREA_GRID.gapX / 2);
const AISLE_3_X = THIRD_TABLE.x + THIRD_TABLE.width + Math.floor(DINING_AREA_GRID.gapX / 2);
const TRAY_LANE_X = TRAY_DROP_SLOTS[0].x;

export const DINING_ENTRY_ANCHOR = {
  x: WEST_ENTRY_X,
  y: CENTER_WALK_Y
};

export const DINING_NAV_POINTS = [
  { id: "north-west-entry", x: WEST_ENTRY_X, y: NORTH_WALK_Y },
  { id: "north-aisle-1", x: AISLE_1_X, y: NORTH_WALK_Y },
  { id: "north-aisle-2", x: AISLE_2_X, y: NORTH_WALK_Y },
  { id: "north-aisle-3", x: AISLE_3_X, y: NORTH_WALK_Y },

  { id: "center-west-entry", x: WEST_ENTRY_X, y: CENTER_WALK_Y },
  { id: "center-aisle-1", x: AISLE_1_X, y: CENTER_WALK_Y },
  { id: "center-aisle-2", x: AISLE_2_X, y: CENTER_WALK_Y },
  { id: "center-aisle-3", x: AISLE_3_X, y: CENTER_WALK_Y },

  { id: "south-west-entry", x: WEST_ENTRY_X, y: SOUTH_WALK_Y },
  { id: "south-aisle-1", x: AISLE_1_X, y: SOUTH_WALK_Y },
  { id: "south-aisle-2", x: AISLE_2_X, y: SOUTH_WALK_Y },
  { id: "south-aisle-3", x: AISLE_3_X, y: SOUTH_WALK_Y },

  { id: "tray-lane", x: TRAY_LANE_X, y: CENTER_WALK_Y },
  { id: "tray-slot-1", x: TRAY_DROP_SLOTS[0].x, y: TRAY_DROP_SLOTS[0].y },
  { id: "tray-slot-2", x: TRAY_DROP_SLOTS[1].x, y: TRAY_DROP_SLOTS[1].y },
  { id: "tray-slot-3", x: TRAY_DROP_SLOTS[2].x, y: TRAY_DROP_SLOTS[2].y },
  { id: "tray-exit", x: TRAY_EXIT_ANCHOR.x, y: TRAY_EXIT_ANCHOR.y }
];

export const DINING_ROUTE_LANES = {
  entryX: WEST_ENTRY_X,
  northY: NORTH_WALK_Y,
  middleY: CENTER_WALK_Y,
  southY: SOUTH_WALK_Y,
  trayLaneX: TRAY_LANE_X,
  exitLaneX: TRAY_EXIT_ANCHOR.x,
  exitY: TRAY_EXIT_ANCHOR.y
};

export function getSeatById(seatId) {
  return ALL_DINING_SEATS.find((seat) => seat.id === seatId) || null;
}
