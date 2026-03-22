export default class CanvasInspector {
  constructor(canvas, inspectables = []) {
    this.canvas = canvas;
    this.inspectables = inspectables;
    this.hoveredId = null;
  }

  getMousePosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }

  getObjectAt(x, y) {
    return this.inspectables.find(
      (item) =>
        x >= item.x &&
        x <= item.x + item.width &&
        y >= item.y &&
        y <= item.y + item.height
    );
  }

  handleClick(event, onHit, onMiss = null) {
    const { x, y } = this.getMousePosition(event);
    const clickedObject = this.getObjectAt(x, y);

    if (clickedObject) {
      onHit(clickedObject);
    } else if (onMiss) {
      onMiss();
    }
  }

  handleMouseMove(event) {
    const { x, y } = this.getMousePosition(event);
    const hovered = this.getObjectAt(x, y);
    this.hoveredId = hovered ? hovered.id : null;
    return hovered;
  }

  drawDebugZones(ctx) {
    for (const item of this.inspectables) {
      const isHovered = item.id === this.hoveredId;

      ctx.save();

      ctx.fillStyle = item.color;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(item.x, item.y, item.width, item.height);

      ctx.globalAlpha = 1;
      ctx.lineWidth = isHovered ? 4 : 2;
      ctx.strokeStyle = isHovered ? "#ffffff" : "#0f172a";
      ctx.strokeRect(item.x, item.y, item.width, item.height);

      ctx.fillStyle = "#ffffff";
      ctx.font = "14px Arial";
      ctx.fillText(item.name, item.x + 6, item.y + Math.floor(item.height / 2));

      ctx.restore();
    }
  }
}