export const CANVAS_W = 960;
export const CANVAS_H = 540;

export const LAYOUT_GRID = {
  canvasW: CANVAS_W,
  canvasH: CANVAS_H,
  stallZoneY: 60,
  stallZoneH: 180,
  queueZoneY: 240,
  queueZoneH: 80,
  diningZoneY: 330,
  diningZoneH: 180
};

export const STALL_METRICS = {
  count: 3,
  bodyW: 170,
  bodyH: 82,
  serviceOffsetY: 42,
  queueSlotSpacing: 28,
  maxQueueSlots: 6
};

export const DINING_GRID = {
  cols: 4,
  rows: 2,
  tableW: 88,
  tableH: 44,
  gapX: 28,
  gapY: 36,
  originX: 472,
  originY: 338,
  seatSize: 10,
  seatOffset: 4
};

export const EXIT_POINT = {
  x: CANVAS_W - 10,
  y: CANVAS_H - 16
};

export const AISLE_WAYPOINTS = [
  { id: "queue-left", x: 220, y: 282 },
  { id: "queue-center", x: 420, y: 282 },
  { id: "dining-entry", x: 520, y: 320 },
  { id: "dining-mid-top", x: 520, y: 390 },
  { id: "dining-mid-bottom", x: 520, y: 488 },
  { id: "tray-lane", x: 900, y: 390 }
];