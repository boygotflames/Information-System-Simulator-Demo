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
    const item = this.inspectables.find((inspectable) => inspectable.id === this.hoveredId);
    if (!item) return;

    ctx.save();

    ctx.fillStyle = item.color;
    ctx.globalAlpha = 0.14;
    ctx.fillRect(item.x, item.y, item.width, item.height);

    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff";
    ctx.strokeRect(item.x, item.y, item.width, item.height);

    const labelWidth = Math.max(120, item.name.length * 8 + 16);
    const labelX = item.x + 6;
    const labelY = Math.max(18, item.y - 24);

    ctx.fillStyle = "rgba(8, 18, 29, 0.9)";
    ctx.fillRect(labelX, labelY, labelWidth, 18);

    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 1;
    ctx.strokeRect(labelX, labelY, labelWidth, 18);

    ctx.fillStyle = "#ffffff";
    ctx.font = "12px 'Space Grotesk', Arial";
    ctx.fillText(item.name, labelX + 8, labelY + 12);

    ctx.restore();
  }
}
