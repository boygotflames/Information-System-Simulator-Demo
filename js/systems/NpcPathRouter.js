import { isRectBlocked } from "./CollisionSystem.js";

function expandObstacle(obstacle, padding = 4) {
  return {
    x: obstacle.x - padding,
    y: obstacle.y - padding,
    w: obstacle.w + padding * 2,
    h: obstacle.h + padding * 2
  };
}

function buildExpandedObstacles(obstacles) {
  return obstacles.map((obstacle) => expandObstacle(obstacle, 4));
}

function pointBlocked(x, y, expandedObstacles, entitySize) {
  return isRectBlocked(
    {
      x,
      y,
      w: entitySize,
      h: entitySize
    },
    expandedObstacles
  );
}

function segmentBlocked(fromX, fromY, toX, toY, expandedObstacles, entitySize) {
  const distance = Math.hypot(toX - fromX, toY - fromY);
  const steps = Math.max(2, Math.ceil(distance / 6));

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = fromX + (toX - fromX) * t;
    const y = fromY + (toY - fromY) * t;

    if (pointBlocked(x, y, expandedObstacles, entitySize)) {
      return true;
    }
  }

  return false;
}

function scoreWaypoint(point, fromX, fromY, toX, toY) {
  return (
    Math.hypot(point.x - fromX, point.y - fromY) +
    Math.hypot(toX - point.x, toY - point.y)
  );
}

export function routePath(fromX, fromY, toX, toY, obstacles = [], options = {}) {
  const {
    entitySize = 18,
    candidateWaypoints = []
  } = options;

  const expandedObstacles = buildExpandedObstacles(obstacles);

  if (
    pointBlocked(fromX, fromY, expandedObstacles, entitySize) ||
    pointBlocked(toX, toY, expandedObstacles, entitySize)
  ) {
    return null;
  }

  if (!segmentBlocked(fromX, fromY, toX, toY, expandedObstacles, entitySize)) {
    return [{ x: toX, y: toY }];
  }

  const ordered = candidateWaypoints
    .filter((point) => !pointBlocked(point.x, point.y, expandedObstacles, entitySize))
    .slice()
    .sort((a, b) => scoreWaypoint(a, fromX, fromY, toX, toY) - scoreWaypoint(b, fromX, fromY, toX, toY))
    .slice(0, 8);

  for (const waypoint of ordered) {
    const firstBlocked = segmentBlocked(
      fromX,
      fromY,
      waypoint.x,
      waypoint.y,
      expandedObstacles,
      entitySize
    );

    const secondBlocked = segmentBlocked(
      waypoint.x,
      waypoint.y,
      toX,
      toY,
      expandedObstacles,
      entitySize
    );

    if (!firstBlocked && !secondBlocked) {
      return [
        { x: waypoint.x, y: waypoint.y },
        { x: toX, y: toY }
      ];
    }
  }

  for (let i = 0; i < ordered.length; i += 1) {
    for (let j = 0; j < ordered.length; j += 1) {
      if (i === j) continue;

      const a = ordered[i];
      const b = ordered[j];

      const firstBlocked = segmentBlocked(fromX, fromY, a.x, a.y, expandedObstacles, entitySize);
      const secondBlocked = segmentBlocked(a.x, a.y, b.x, b.y, expandedObstacles, entitySize);
      const thirdBlocked = segmentBlocked(b.x, b.y, toX, toY, expandedObstacles, entitySize);

      if (!firstBlocked && !secondBlocked && !thirdBlocked) {
        return [
          { x: a.x, y: a.y },
          { x: b.x, y: b.y },
          { x: toX, y: toY }
        ];
      }
    }
  }

  return null;
}
