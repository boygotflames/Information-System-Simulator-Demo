function intersects(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function moveRectWithCollisions(rect, deltaX, deltaY, bounds, obstacles = []) {
  const minX = bounds.minX ?? 0;
  const minY = bounds.minY ?? 0;
  const maxX = (bounds.maxX ?? Infinity) - rect.width;
  const maxY = (bounds.maxY ?? Infinity) - rect.height;

  let nextX = clamp(rect.x + deltaX, minX, maxX);
  let nextRectX = { ...rect, x: nextX };

  for (const obstacle of obstacles) {
    if (!intersects(nextRectX, obstacle)) continue;

    if (deltaX > 0) {
      nextX = Math.min(nextX, obstacle.x - rect.width);
    } else if (deltaX < 0) {
      nextX = Math.max(nextX, obstacle.x + obstacle.width);
    }

    nextRectX.x = nextX;
  }

  let nextY = clamp(rect.y + deltaY, minY, maxY);
  let nextRectY = { ...rect, x: nextX, y: nextY };

  for (const obstacle of obstacles) {
    if (!intersects(nextRectY, obstacle)) continue;

    if (deltaY > 0) {
      nextY = Math.min(nextY, obstacle.y - rect.height);
    } else if (deltaY < 0) {
      nextY = Math.max(nextY, obstacle.y + obstacle.height);
    }

    nextRectY.y = nextY;
  }

  return { x: nextX, y: nextY };
}