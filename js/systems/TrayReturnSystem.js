import {
  TRAY_RETURN_STATION,
  WASHING_AREA,
  TRAY_RETURN_PATH
} from "../data/diningAreaLayout.js";

export default class TrayReturnSystem {
  constructor() {
    this.trays = [];
    this.nextTrayId = 1;
    this.completedWashCount = 0;
  }

  enqueueTray({ dishName = "Meal Tray" } = {}) {
    const start = TRAY_RETURN_PATH[0];

    this.trays.push({
      id: `tray_${this.nextTrayId++}`,
      dishName,
      x: start.x,
      y: start.y,
      waypointIndex: 1,
      speed: 90,
      remove: false
    });
  }

  update(deltaTime) {
    this.trays.forEach((tray) => {
      const target = TRAY_RETURN_PATH[tray.waypointIndex];

      if (!target) {
        tray.remove = true;
        this.completedWashCount += 1;
        return;
      }

      const dx = target.x - tray.x;
      const dy = target.y - tray.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 1) {
        tray.x = target.x;
        tray.y = target.y;
        tray.waypointIndex += 1;
        return;
      }

      const step = tray.speed * deltaTime;
      const ratio = Math.min(1, step / distance);

      tray.x += dx * ratio;
      tray.y += dy * ratio;
    });

    this.trays = this.trays.filter((tray) => !tray.remove);
  }

  getActiveTrayCount() {
    return this.trays.length;
  }

  getCompletedWashCount() {
    return this.completedWashCount;
  }

  draw(ctx) {
    ctx.save();

    // tray return station
    ctx.fillStyle = "#64748b";
    ctx.fillRect(
      TRAY_RETURN_STATION.x,
      TRAY_RETURN_STATION.y,
      TRAY_RETURN_STATION.width,
      TRAY_RETURN_STATION.height
    );
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      TRAY_RETURN_STATION.x,
      TRAY_RETURN_STATION.y,
      TRAY_RETURN_STATION.width,
      TRAY_RETURN_STATION.height
    );

    // washing area
    ctx.fillStyle = "#0ea5e9";
    ctx.fillRect(
      WASHING_AREA.x,
      WASHING_AREA.y,
      WASHING_AREA.width,
      WASHING_AREA.height
    );
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      WASHING_AREA.x,
      WASHING_AREA.y,
      WASHING_AREA.width,
      WASHING_AREA.height
    );

    // path
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(TRAY_RETURN_PATH[0].x, TRAY_RETURN_PATH[0].y);
    for (let i = 1; i < TRAY_RETURN_PATH.length; i++) {
      ctx.lineTo(TRAY_RETURN_PATH[i].x, TRAY_RETURN_PATH[i].y);
    }
    ctx.stroke();

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "12px Arial";
    ctx.fillText("Tray Return", TRAY_RETURN_STATION.x - 16, TRAY_RETURN_STATION.y - 8);
    ctx.fillText("Washing Area", WASHING_AREA.x - 10, WASHING_AREA.y - 8);

    // trays
    this.trays.forEach((tray) => {
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(tray.x - 6, tray.y - 4, 12, 8);
      ctx.strokeStyle = "#334155";
      ctx.strokeRect(tray.x - 6, tray.y - 4, 12, 8);
    });

    ctx.restore();
  }
}