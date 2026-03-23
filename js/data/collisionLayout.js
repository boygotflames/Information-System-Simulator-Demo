import { isRectBlocked } from "../systems/CollisionSystem.js";
import { STALL_BODY_RECTS } from "./canteenLayout.js";
import {
  DINING_TABLE_RECTS,
  TRAY_RETURN_STATION,
  WASHING_AREA
} from "./diningAreaLayout.js";

function inflateRect(rect, padding = 0) {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    w: rect.w + padding * 2,
    h: rect.h + padding * 2,
    label: rect.label
  };
}

const stallObstacles = STALL_BODY_RECTS.map((rect) => inflateRect(rect, 4));
const tableObstacles = DINING_TABLE_RECTS.map((rect) => inflateRect(rect, 4));

const utilityObstacles = [
  inflateRect(
    {
      x: TRAY_RETURN_STATION.x,
      y: TRAY_RETURN_STATION.y,
      w: TRAY_RETURN_STATION.width,
      h: TRAY_RETURN_STATION.height,
      label: TRAY_RETURN_STATION.label
    },
    2
  ),
  inflateRect(
    {
      x: WASHING_AREA.x,
      y: WASHING_AREA.y,
      w: WASHING_AREA.width,
      h: WASHING_AREA.height,
      label: WASHING_AREA.label
    },
    2
  )
];

export const STATIC_OBSTACLES = [
  ...stallObstacles,
  ...tableObstacles,
  ...utilityObstacles
];

export function isBlocked(x, y, size, obstacles = STATIC_OBSTACLES) {
  return isRectBlocked(
    {
      x,
      y,
      w: size,
      h: size
    },
    obstacles
  );
}