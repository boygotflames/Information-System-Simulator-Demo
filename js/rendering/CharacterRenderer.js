import PALETTE from "./palette.js";
import { UI_FONT_FAMILY } from "./VisualTheme.js";

const SKIN_TONES = [PALETTE.headA, PALETTE.headB, PALETTE.headC];

function hashText(value = "") {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

function truncateLabel(label, maxLength = 11) {
  return label.length > maxLength ? `${label.slice(0, maxLength)}...` : label;
}

export default class CharacterRenderer {
  constructor({ shadowRenderer }) {
    this.shadowRenderer = shadowRenderer;
  }

  draw(ctx, { students = [], player = null, playerProfile = null, seatLookup = new Map() }) {
    const actors = [];

    students.forEach((student) => {
      actors.push({
        type: "student",
        sortY: this.getSortY(student, seatLookup),
        entity: student
      });
    });

    if (player) {
      actors.push({
        type: "player",
        sortY: this.getSortY(player, seatLookup),
        entity: player
      });
    }

    actors.sort((a, b) => a.sortY - b.sortY);

    actors.forEach((actor) => {
      if (actor.type === "student") {
        this.drawStudent(ctx, actor.entity, seatLookup);
        return;
      }

      this.drawPlayer(ctx, actor.entity, playerProfile, seatLookup);
    });
  }

  getSortY(entity, seatLookup) {
    const logicState = entity?.logicState ?? entity?.state;

    if (entity?.seatedSeatId && (logicState === "SEATED" || logicState === "eating")) {
      const seat = seatLookup.get(entity.seatedSeatId);
      if (seat) {
        return seat.actorY + 20;
      }
    }

    return (entity?.y ?? 0) + (entity?.size ?? 18);
  }

  getSkinTone(seed) {
    return SKIN_TONES[hashText(seed) % SKIN_TONES.length];
  }

  drawStudent(ctx, student, seatLookup) {
    const seat = student.seatedSeatId ? seatLookup.get(student.seatedSeatId) : null;
    const logicState = student.logicState ?? student.state;
    const isSeated = Boolean(seat && logicState === "SEATED");

    const mealPosition = isSeated && student.hasMeal && seat
      ? { x: seat.mealX, y: seat.mealY }
      : null;

    this.drawPerson(ctx, {
      x: student.x,
      y: student.y,
      size: student.size,
      label: student.displayName,
      bodyColor: student.color,
      skinColor: this.getSkinTone(student.displayName),
      isSeated,
      hasMeal: Boolean(student.hasMeal),
      mealPosition,
      highlight: logicState === "IN_QUEUE" && student.beingServed
    });
  }

  drawPlayer(ctx, player, playerProfile, seatLookup) {
    const seat = player.seatedSeatId ? seatLookup.get(player.seatedSeatId) : null;
    const hasMeal = Boolean(playerProfile?.currentMeal);

    const mealPosition = player.seatedSeatId && hasMeal && seat
      ? { x: seat.mealX, y: seat.mealY }
      : null;

    this.drawPerson(ctx, {
      x: player.x,
      y: player.y,
      size: player.size,
      label: player.label || "Player",
      bodyColor: PALETTE.playerBody,
      skinColor: PALETTE.headA,
      isSeated: Boolean(player.seatedSeatId),
      hasMeal,
      mealPosition,
      isPlayer: true,
      highlight: false
    });
  }

  drawPerson(ctx, config) {
    const {
      x,
      y,
      size = 18,
      label,
      bodyColor,
      skinColor,
      isSeated = false,
      hasMeal = false,
      mealPosition = null,
      isPlayer = false,
      highlight = false
    } = config;

    const torsoWidth = Math.round(size * 0.72);
    const torsoHeight = Math.round(size * (isSeated ? 0.42 : 0.5));
    const torsoX = x + Math.round((size - torsoWidth) / 2);
    const torsoY = y + Math.round(size * (isSeated ? 0.28 : 0.22));

    const headSize = Math.max(7, Math.round(size * 0.38));
    const headX = x + Math.round((size - headSize) / 2);
    const headY = y;

    const footShadowCenterX = x + size / 2;
    const footShadowCenterY = y + (isSeated ? size * 0.72 : size + 5);

    this.shadowRenderer.drawFootShadow(ctx, footShadowCenterX, footShadowCenterY, {
      width: isSeated ? 16 : 22,
      height: isSeated ? 6 : 8,
      alpha: isPlayer ? 0.3 : 0.24
    });

    ctx.save();

    if (!isSeated) {
      const legWidth = Math.max(3, Math.round(size * 0.18));
      const legHeight = Math.max(4, Math.round(size * 0.25));
      const leftLegX = x + Math.round(size * 0.26);
      const rightLegX = x + Math.round(size * 0.56);
      const legY = y + size - legHeight;

      ctx.fillStyle = PALETTE.leg;
      ctx.fillRect(leftLegX, legY, legWidth, legHeight);
      ctx.fillRect(rightLegX, legY, legWidth, legHeight);
    }

    ctx.fillStyle = bodyColor;
    ctx.fillRect(torsoX, torsoY, torsoWidth, torsoHeight);

    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(torsoX + 2, torsoY + 2, Math.max(4, torsoWidth - 4), 3);

    ctx.fillStyle = isPlayer ? PALETTE.playerAccent : PALETTE.leg;
    ctx.fillRect(
      torsoX + 2,
      torsoY + torsoHeight - 4,
      Math.max(6, torsoWidth - 4),
      4
    );

    ctx.fillStyle = skinColor;
    ctx.fillRect(headX, headY, headSize, headSize);

    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(headX + 2, headY + headSize - 3, headSize - 4, 2);

    ctx.strokeStyle = highlight ? "#ffffff" : PALETTE.outline;
    ctx.lineWidth = highlight ? 2.2 : 1.4;
    ctx.strokeRect(torsoX, torsoY, torsoWidth, torsoHeight);
    ctx.strokeRect(headX, headY, headSize, headSize);

    if (hasMeal) {
      let mealX = x + size + 2;
      let mealY = y + Math.round(size * 0.42);

      if (mealPosition) {
        mealX = mealPosition.x;
        mealY = mealPosition.y;
      }

      this.drawMealAt(ctx, mealX, mealY);
    }

    const safeLabel = truncateLabel(label || "Actor");
    const labelWidth = Math.max(28, safeLabel.length * 6 + 10);
    const labelX = x + Math.round(size / 2) - Math.round(labelWidth / 2);
    const labelY = y - 12;

    ctx.fillStyle = PALETTE.plaque;
    ctx.fillRect(labelX, labelY - 8, labelWidth, 12);

    ctx.strokeStyle = PALETTE.plaqueStroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(labelX, labelY - 8, labelWidth, 12);

    ctx.fillStyle = PALETTE.label;
    ctx.font = `600 9px ${UI_FONT_FAMILY}`;
    ctx.fillText(safeLabel, labelX + 5, labelY + 1);

    ctx.restore();
  }

  drawMealAt(ctx, x, y) {
    this.shadowRenderer.drawFootShadow(ctx, x + 5, y + 5, {
      width: 12,
      height: 4,
      alpha: 0.14
    });

    ctx.save();

    ctx.fillStyle = PALETTE.bowl;
    ctx.fillRect(x, y, 10, 4);

    ctx.strokeStyle = PALETTE.outline;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, 10, 4);

    ctx.fillStyle = PALETTE.food;
    ctx.fillRect(x + 2, y - 2, 6, 2);

    ctx.restore();
  }
}
