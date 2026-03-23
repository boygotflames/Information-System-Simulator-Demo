import { AISLE_WAYPOINTS } from "../data/LayoutConstants.js";
import { isPointBlocked } from "./CollisionSystem.js";

function expandObstacle(obstacle, padding = 4) {
  return {
    x: obstacle.x - padding,
    y: obstacle.y - padding,
    w: obstacle.w + padding * 2,
    h: obstacle.h + padding * 2
  };
}

function segmentBlocked(fromX, fromY, toX, toY, obstacles) {
  const expanded = obstacles.map((obstacle) => expandObstacle(obstacle, 4));
  const distance = Math.hypot(toX - fromX, toY - fromY);
  const steps = Math.max(2, Math.ceil(distance / 8));

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = fromX + (toX - fromX) * t;
    const y = fromY + (toY - fromY) * t;

    if (isPointBlocked(x, y, expanded)) {
      return true;
    }
  }

  return false;
}

export function routePath(fromX, fromY, toX, toY, obstacles = []) {
  if (!segmentBlocked(fromX, fromY, toX, toY, obstacles)) {
    return [{ x: toX, y: toY }];
  }

  const candidateWaypoints = AISLE_WAYPOINTS
    .slice()
    .sort((a, b) => {
      const scoreA =
        Math.hypot(a.x - fromX, a.y - fromY) + Math.hypot(toX - a.x, toY - a.y);
      const scoreB =
        Math.hypot(b.x - fromX, b.y - fromY) + Math.hypot(toX - b.x, toY - b.y);

      return scoreA - scoreB;
    })
    .slice(0, 3);

  for (const waypoint of candidateWaypoints) {
    const firstBlocked = segmentBlocked(fromX, fromY, waypoint.x, waypoint.y, obstacles);
    const secondBlocked = segmentBlocked(waypoint.x, waypoint.y, toX, toY, obstacles);

    if (!firstBlocked && !secondBlocked) {
      return [
        { x: waypoint.x, y: waypoint.y },
        { x: toX, y: toY }
      ];
    }
  }

  return [{ x: toX, y: toY }];
}