import PALETTE from "./palette.js";
import { DISPLAY_FONT_FAMILY, UI_FONT_FAMILY } from "./visualTheme.js";
import { getSprite } from "./spriteLoader.js";

function drawImage(ctx, image, x, y, width, height, alpha = 1, smoothing = false) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = smoothing;
  ctx.drawImage(image, x, y, width, height);
  ctx.restore();
}

export function drawSpriteOrFallback(ctx, options) {
  const {
    role = null,
    x,
    y,
    width,
    height,
    alpha = 1,
    smoothing = false,
    drawFallback = null
  } = options;

  const image = getSprite(role);
  if (image) {
    drawImage(ctx, image, x, y, width, height, alpha, smoothing);
    return true;
  }

  if (typeof drawFallback === "function") {
    drawFallback();
  }

  return false;
}

export function drawTiledArea(ctx, options) {
  const {
    role = null,
    x,
    y,
    width,
    height,
    tileWidth,
    tileHeight = tileWidth,
    originX = 0,
    originY = 0,
    smoothing = false,
    drawFallbackTile = null
  } = options;

  const image = getSprite(role);
  const startX = originX + Math.floor((x - originX) / tileWidth) * tileWidth;
  const startY = originY + Math.floor((y - originY) / tileHeight) * tileHeight;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  for (let tileY = startY; tileY < y + height; tileY += tileHeight) {
    for (let tileX = startX; tileX < x + width; tileX += tileWidth) {
      if (image) {
        drawImage(ctx, image, tileX, tileY, tileWidth, tileHeight, 1, smoothing);
      } else if (typeof drawFallbackTile === "function") {
        drawFallbackTile({ tileX, tileY, tileWidth, tileHeight });
      }
    }
  }

  ctx.restore();
  return Boolean(image);
}

export function drawFramedPanel(ctx, options) {
  const {
    role = "ui.plaque",
    x,
    y,
    width,
    height,
    title = "",
    subtitle = "",
    titleSize = 16,
    subtitleSize = 10,
    drawFallback = null
  } = options;

  return drawSpriteOrFallback(ctx, {
    role,
    x,
    y,
    width,
    height,
    drawFallback: () => {
      if (typeof drawFallback === "function") {
        drawFallback();
        return;
      }

      ctx.fillStyle = PALETTE.plaque;
      ctx.fillRect(x, y, width, height);

      ctx.strokeStyle = PALETTE.plaqueStroke;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, height);

      if (title) {
        ctx.fillStyle = PALETTE.label;
        ctx.font = `700 ${titleSize}px ${DISPLAY_FONT_FAMILY}`;
        ctx.fillText(title, x + 10, y + Math.min(height - 8, titleSize + 4));
      }

      if (subtitle) {
        ctx.fillStyle = PALETTE.subLabel;
        ctx.font = `600 ${subtitleSize}px ${UI_FONT_FAMILY}`;
        ctx.fillText(subtitle, x + 10, y + height - 8);
      }
    }
  });
}

export function drawDecor(ctx, options) {
  return drawSpriteOrFallback(ctx, options);
}

export function drawCounterSkin(ctx, options) {
  const {
    bodyRole = null,
    signRole = null,
    serviceRole = null,
    x,
    y,
    width,
    height,
    frontDepth = 0,
    signBox = null,
    serviceBox = null,
    drawFallback = null
  } = options;

  const bodyImage = getSprite(bodyRole);
  const signImage = signRole ? getSprite(signRole) : null;
  const serviceImage = serviceRole ? getSprite(serviceRole) : null;

  if (!bodyImage && !signImage && !serviceImage) {
    if (typeof drawFallback === "function") {
      drawFallback();
    }
    return false;
  }

  if (bodyImage) {
    drawImage(ctx, bodyImage, x, y, width, height + frontDepth, 1, false);
  }

  if (signImage && signBox) {
    drawImage(ctx, signImage, signBox.x, signBox.y, signBox.width, signBox.height, 1, false);
  }

  if (serviceImage && serviceBox) {
    drawImage(
      ctx,
      serviceImage,
      serviceBox.x,
      serviceBox.y,
      serviceBox.width,
      serviceBox.height,
      1,
      false
    );
  }

  return true;
}

export function drawTableSkin(ctx, options) {
  const {
    phase = "top",
    topRole = "table.top",
    frontRole = "table.front",
    x,
    y,
    width,
    height,
    frontDepth = 0,
    drawFallback = null
  } = options;

  const role = phase === "front" ? frontRole : topRole;
  const drawY = phase === "front" ? y + height : y;
  const drawHeight = phase === "front" ? frontDepth : height;

  return drawSpriteOrFallback(ctx, {
    role,
    x,
    y: drawY,
    width,
    height: drawHeight,
    drawFallback
  });
}
