import { INSPECTABLES } from "./inspectables.js";
import {
  DINING_TABLES_8,
  TRAY_RETURN_STATION,
  WASHING_AREA
} from "./diningAreaLayout.js";

function inflateRect(rect, padding = 0) {
  return {
    id: rect.id,
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2
  };
}

const inspectableObstacles = INSPECTABLES.map((item) => {
  const width = item.width ?? item.w ?? 0;
  const height = item.height ?? item.h ?? 0;

  return inflateRect(
    {
      id: `inspectable_${item.id}`,
      x: item.x,
      y: item.y,
      width,
      height
    },
    4
  );
});

const diningTableObstacles = DINING_TABLES_8.map((table) =>
  inflateRect(
    {
      id: `obstacle_${table.id}`,
      x: table.x,
      y: table.y,
      width: table.width,
      height: table.height
    },
    4
  )
);

const utilityObstacles = [
  inflateRect(
    {
      id: "tray_return_station",
      x: TRAY_RETURN_STATION.x,
      y: TRAY_RETURN_STATION.y,
      width: TRAY_RETURN_STATION.width,
      height: TRAY_RETURN_STATION.height
    },
    2
  ),
  inflateRect(
    {
      id: "washing_area",
      x: WASHING_AREA.x,
      y: WASHING_AREA.y,
      width: WASHING_AREA.width,
      height: WASHING_AREA.height
    },
    2
  )
];

export const STATIC_OBSTACLES = [
  ...inspectableObstacles,
  ...diningTableObstacles,
  ...utilityObstacles
];