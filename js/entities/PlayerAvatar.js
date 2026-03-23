import { resolveMovement } from "../systems/CollisionSystem.js";

export default class PlayerAvatar {
  constructor({
    x = 90,
    y = 430,
    size = 20,
    speed = 170,
    color = "#f8fafc",
    label = "Player"
  } = {}) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.speed = speed;
    this.color = color;
    this.label = label;
    this.seatedSeatId = null;
  }

  update(keys, deltaTime, world) {
    let dx = 0;
    let dy = 0;

    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;
    if (keys.up) dy -= 1;
    if (keys.down) dy += 1;

    const attemptingMovement = dx !== 0 || dy !== 0;

    if (this.seatedSeatId && attemptingMovement) {
      this.seatedSeatId = null;
    }

    if (!attemptingMovement) return;

    const length = Math.hypot(dx, dy) || 1;
    dx /= length;
    dy /= length;

    const next = resolveMovement(
      {
        x: this.x,
        y: this.y,
        w: this.size,
        h: this.size
      },
      dx * this.speed * deltaTime,
      dy * this.speed * deltaTime,
      world.obstacles ?? [],
      {
        minX: world.minX ?? 0,
        minY: world.minY ?? 40,
        maxX: world.maxX,
        maxY: world.maxY
      }
    );

    this.x = next.x;
    this.y = next.y;
  }

  draw(ctx) {
    ctx.save();

    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);

    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.size, this.size);

    ctx.fillStyle = "#ffffff";
    ctx.font = "12px Arial";
    ctx.fillText(this.label, this.x - 2, this.y - 8);

    ctx.restore();
  }

  seatAt(seat) {
    this.x = seat.actorX ?? seat.x;
    this.y = seat.actorY ?? seat.y;
    this.seatedSeatId = seat.id;
  }

  isNear(targetX, targetY, radius = 42) {
    const centerX = this.x + this.size / 2;
    const centerY = this.y + this.size / 2;
    return Math.hypot(centerX - targetX, centerY - targetY) <= radius;
  }
}
