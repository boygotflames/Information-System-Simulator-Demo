function normalizeRect(rect) {
  return {
    x: rect.x,
    y: rect.y,
    w: rect.w ?? rect.width,
    h: rect.h ?? rect.height
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectsIntersect(a, b) {
  const rectA = normalizeRect(a);
  const rectB = normalizeRect(b);

  return (
    rectA.x < rectB.x + rectB.w &&
    rectA.x + rectA.w > rectB.x &&
    rectA.y < rectB.y + rectB.h &&
    rectA.y + rectA.h > rectB.y
  );
}

export function isRectBlocked(rect, obstacles = []) {
  const target = normalizeRect(rect);
  return obstacles.some((obstacle) => rectsIntersect(target, obstacle));
}

export function isPointBlocked(x, y, obstacles = []) {
  return obstacles.some((obstacle) => {
    const rect = normalizeRect(obstacle);

    return (
      x >= rect.x &&
      x <= rect.x + rect.w &&
      y >= rect.y &&
      y <= rect.y + rect.h
    );
  });
}

export function resolveMovement(entity, dx, dy, obstacles = [], bounds = {}) {
  const rect = normalizeRect(entity);

  const minX = bounds.minX ?? 0;
  const minY = bounds.minY ?? 0;
  const maxX = (bounds.maxX ?? Infinity) - rect.w;
  const maxY = (bounds.maxY ?? Infinity) - rect.h;

  let nextX = clamp(rect.x + dx, minX, maxX);
  let nextRectX = { ...rect, x: nextX };

  for (const obstacle of obstacles) {
    if (!rectsIntersect(nextRectX, obstacle)) continue;

    const block = normalizeRect(obstacle);

    if (dx > 0) {
      nextX = Math.min(nextX, block.x - rect.w);
    } else if (dx < 0) {
      nextX = Math.max(nextX, block.x + block.w);
    }

    nextRectX = { ...nextRectX, x: nextX };
  }

  let nextY = clamp(rect.y + dy, minY, maxY);
  let nextRectY = { ...rect, x: nextX, y: nextY };

  for (const obstacle of obstacles) {
    if (!rectsIntersect(nextRectY, obstacle)) continue;

    const block = normalizeRect(obstacle);

    if (dy > 0) {
      nextY = Math.min(nextY, block.y - rect.h);
    } else if (dy < 0) {
      nextY = Math.max(nextY, block.y + block.h);
    }

    nextRectY = { ...nextRectY, y: nextY };
  }

  return {
    x: nextX,
    y: nextY,
    dx: nextX - rect.x,
    dy: nextY - rect.y
  };
}