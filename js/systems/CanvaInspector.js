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

      if (isHovered) {
        ctx.fillStyle = item.color;
        ctx.globalAlpha = 0.16;
        ctx.fillRect(item.x, item.y, item.width, item.height);
      }

      ctx.globalAlpha = 1;
      ctx.setLineDash(isHovered ? [] : [6, 6]);
      ctx.lineWidth = isHovered ? 2.5 : 1;
      ctx.strokeStyle = isHovered ? "#ffffff" : "rgba(203, 213, 225, 0.18)";
      ctx.strokeRect(item.x, item.y, item.width, item.height);

      if (isHovered) {
        const labelWidth = Math.max(120, item.name.length * 8 + 16);
        const labelX = item.x + 6;
        const labelY = Math.max(18, item.y - 24);

        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.fillRect(labelX, labelY, labelWidth, 18);

        ctx.strokeStyle = "rgba(255,255,255,0.28)";
        ctx.lineWidth = 1;
        ctx.strokeRect(labelX, labelY, labelWidth, 18);

        ctx.fillStyle = "#ffffff";
        ctx.font = "12px Arial";
        ctx.fillText(item.name, labelX + 8, labelY + 12);
      }

      ctx.restore();
    }
  }
}
