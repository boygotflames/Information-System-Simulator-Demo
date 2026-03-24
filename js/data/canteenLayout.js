import { CANVAS_W, LAYOUT_GRID, STALL_METRICS } from "./LayoutConstants.js";

const STALL_BLUEPRINTS = [
  {
    id: "ramen_counter",
    stallId: "ramen_stall",
    label: "Ramen Counter",
    displayName: "Ramen Stall",
    defaultRecipeKey: "tonkotsu_ramen",
    color: "#38bdf8"
  },
  {
    id: "dry_noodle_counter",
    stallId: "dry_noodle_stall",
    label: "Dry Noodle Counter",
    displayName: "Dry Noodle Stall",
    defaultRecipeKey: "sesame_noodles",
    color: "#f59e0b"
  },
  {
    id: "soup_counter",
    stallId: "soup_station",
    label: "Soup Counter",
    displayName: "Soup Station",
    defaultRecipeKey: "egg_drop_soup",
    color: "#a78bfa"
  }
];

function buildServicePoint(definition, index) {
  const laneWidth = CANVAS_W / STALL_METRICS.count;
  const centerX = Math.round(laneWidth * index + laneWidth / 2);

  const stallX = Math.round(centerX - STALL_METRICS.bodyW / 2);
  const stallY =
    LAYOUT_GRID.stallZoneY +
    Math.round((LAYOUT_GRID.stallZoneH - STALL_METRICS.bodyH) / 2) -
    8;

  const serviceAnchorX = centerX;
  const serviceAnchorY = stallY + STALL_METRICS.bodyH + STALL_METRICS.serviceOffsetY;

  return {
    ...definition,
    x: serviceAnchorX,
    y: serviceAnchorY,
    servicePointX: serviceAnchorX,
    servicePointY: serviceAnchorY,
    serviceAnchorX,
    serviceAnchorY,
    queueDirection: "down",
    queueFrontX: serviceAnchorX,
    queueY: serviceAnchorY + STALL_METRICS.queueSlotSpacing,
    queueSpacing: STALL_METRICS.queueSlotSpacing,
    holdingX: serviceAnchorX,
    holdingY: serviceAnchorY + STALL_METRICS.queueSlotSpacing,
    stallRect: {
      x: stallX,
      y: stallY,
      w: STALL_METRICS.bodyW,
      h: STALL_METRICS.bodyH,
      label: definition.displayName
    }
  };
}

export const SERVICE_POINT_LIST = STALL_BLUEPRINTS.map(buildServicePoint);

export const SERVICE_POINTS = Object.fromEntries(
  SERVICE_POINT_LIST.map((point) => [
    point.id,
    point
  ])
);

export const STALL_BODY_RECTS = SERVICE_POINT_LIST.map((point) => ({
  x: point.stallRect.x,
  y: point.stallRect.y,
  w: point.stallRect.w,
  h: point.stallRect.h,
  label: point.displayName
}));

export function getServicePointById(servicePointId) {
  return SERVICE_POINT_LIST.find((point) => point.id === servicePointId) || null;
}

export function getServicePointByStallId(stallId) {
  return SERVICE_POINT_LIST.find((point) => point.stallId === stallId) || null;
}

export function getNearestServicePoint(x, y, maxDistance = 60) {
  let nearest = null;
  let nearestDistance = Infinity;

  for (const point of SERVICE_POINT_LIST) {
    const anchorX = point.serviceAnchorX ?? point.x;
    const anchorY = point.serviceAnchorY ?? point.y;
    const distance = Math.hypot(anchorX - x, anchorY - y);

    if (distance <= maxDistance && distance < nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
  }

  return nearest;
}

// legacy exports kept so untouched files do not explode
export const DINING_TABLES = [];

export function getAllSeats() {
  return [];
}
