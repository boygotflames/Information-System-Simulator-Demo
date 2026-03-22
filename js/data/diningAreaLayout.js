export const DINING_ROUTE_LANES = {
  entryX: 470,
  northY: 296,
  middleY: 394,
  southY: 492,
  trayLaneX: 922,
  exitLaneX: 950,
  exitY: 520
};

function createHorizontalTable(id, label, x, y, rowIndex) {
  const width = 80;
  const height = 32;
  const seatWidth = 10;
  const seatHeight = 10;

  const topSeatY = y - 18;
  const bottomSeatY = y + height + 8;
  const seatXs = [x + 12, x + 35, x + 58];

  const seats = [];

  seatXs.forEach((seatX, index) => {
    const topApproachY =
      rowIndex === 0 ? DINING_ROUTE_LANES.northY : DINING_ROUTE_LANES.middleY;

    const bottomApproachY =
      rowIndex === 0 ? DINING_ROUTE_LANES.middleY : DINING_ROUTE_LANES.southY;

    seats.push({
      id: `${id}_T${index + 1}`,
      label: `${label}-T${index + 1}`,
      tableId: id,
      rowIndex,
      side: "top",
      x: seatX,
      y: topSeatY,
      width: seatWidth,
      height: seatHeight,
      actorX: seatX,
      actorY: topSeatY,
      anchorX: seatX + seatWidth / 2,
      anchorY: topSeatY + seatHeight / 2,
      approachY: topApproachY
    });

    seats.push({
      id: `${id}_B${index + 1}`,
      label: `${label}-B${index + 1}`,
      tableId: id,
      rowIndex,
      side: "bottom",
      x: seatX,
      y: bottomSeatY,
      width: seatWidth,
      height: seatHeight,
      actorX: seatX,
      actorY: bottomSeatY,
      anchorX: seatX + seatWidth / 2,
      anchorY: bottomSeatY + seatHeight / 2,
      approachY: bottomApproachY
    });
  });

  return {
    id,
    label,
    rowIndex,
    x,
    y,
    width,
    height,
    seats
  };
}

export const DINING_TABLES_8 = [
  createHorizontalTable("table_1", "T1", 500, 326, 0),
  createHorizontalTable("table_2", "T2", 602, 326, 0),
  createHorizontalTable("table_3", "T3", 704, 326, 0),
  createHorizontalTable("table_4", "T4", 806, 326, 0),

  createHorizontalTable("table_5", "T5", 500, 430, 1),
  createHorizontalTable("table_6", "T6", 602, 430, 1),
  createHorizontalTable("table_7", "T7", 704, 430, 1),
  createHorizontalTable("table_8", "T8", 806, 430, 1)
];

export const ALL_DINING_SEATS = DINING_TABLES_8.flatMap((table) => table.seats);

export const TRAY_RETURN_STATION = {
  x: 908,
  y: 350,
  width: 18,
  height: 48,
  label: "Tray Return"
};

export const WASHING_AREA = {
  x: 890,
  y: 468,
  width: 56,
  height: 38,
  label: "Washing Area"
};

export const TRAY_RETURN_PATH = [
  { x: 917, y: 374 },
  { x: 917, y: 426 },
  { x: 917, y: 487 }
];