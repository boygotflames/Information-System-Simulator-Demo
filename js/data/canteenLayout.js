export const SERVICE_POINTS = {
  ramenCounter: {
    id: "ramen_counter",
    x: 330,
    y: 220,
    stallId: "ramen_stall",
    defaultRecipeKey: "tonkotsu_ramen",
    label: "Ramen Counter",
    queueFrontX: 250,
    queueY: 320,
    queueSpacing: 34,
    holdingX: 375,
    holdingY: 246,
    color: "#38bdf8"
  },

  dryNoodleCounter: {
    id: "dry_noodle_counter",
    x: 555,
    y: 220,
    stallId: "dry_noodle_stall",
    defaultRecipeKey: "sesame_noodles",
    label: "Dry Noodle Counter",
    queueFrontX: 475,
    queueY: 320,
    queueSpacing: 34,
    holdingX: 600,
    holdingY: 246,
    color: "#f59e0b"
  },

  soupCounter: {
    id: "soup_counter",
    x: 780,
    y: 220,
    stallId: "soup_station",
    defaultRecipeKey: "egg_drop_soup",
    label: "Soup Counter",
    queueFrontX: 700,
    queueY: 320,
    queueSpacing: 34,
    holdingX: 825,
    holdingY: 246,
    color: "#a78bfa"
  }
};

export const SERVICE_POINT_LIST = Object.values(SERVICE_POINTS);

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
    const distance = Math.hypot(point.x - x, point.y - y);

    if (distance <= maxDistance && distance < nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
  }

  return nearest;
}

// legacy export kept to avoid accidental breakage in untouched files
export const DINING_TABLES = [];

export function getAllSeats() {
  return [];
}