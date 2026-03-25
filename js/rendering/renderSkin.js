import PALETTE from "./palette.js";
import { DISPLAY_FONT_FAMILY, UI_FONT_FAMILY } from "./VisualTheme.js";
import { getSprite } from "./spriteLoader.js";
import { getSpriteDefinition } from "./spriteRegistry.js";

const preparedRoleCache = new Map();

function createWorkingCanvas(width, height) {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }

  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  return null;
}

function applyChromaKey(canvas, chromaKey) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { r, g, b, tolerance = 8 } = chromaKey;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    const deltaR = Math.abs(data[index] - r);
    const deltaG = Math.abs(data[index + 1] - g);
    const deltaB = Math.abs(data[index + 2] - b);

    if (deltaR <= tolerance && deltaG <= tolerance && deltaB <= tolerance) {
      data[index + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function getResolvedSpriteData(roleOrPath) {
  if (!roleOrPath) {
    return null;
  }

  if (roleOrPath.includes("/")) {
    const image = getSprite(roleOrPath);
    return image ? { image, source: null } : null;
  }

  const definition = getSpriteDefinition(roleOrPath);
  if (!definition?.path) {
    return null;
  }

  const image = getSprite(definition.path);
  if (!image) {
    return null;
  }

  if (definition.chromaKey) {
    if (preparedRoleCache.has(roleOrPath)) {
      return {
        image: preparedRoleCache.get(roleOrPath),
        source: null
      };
    }

    const source = definition.source || { x: 0, y: 0, w: image.width, h: image.height };
    const workingCanvas = createWorkingCanvas(source.w, source.h);

    if (!workingCanvas) {
      return {
        image,
        source
      };
    }

    const workingContext = workingCanvas.getContext("2d", { willReadFrequently: true });
    workingContext.drawImage(
      image,
      source.x,
      source.y,
      source.w,
      source.h,
      0,
      0,
      source.w,
      source.h
    );
    applyChromaKey(workingCanvas, definition.chromaKey);
    preparedRoleCache.set(roleOrPath, workingCanvas);

    return {
      image: workingCanvas,
      source: null
    };
  }

  return {
    image,
    source: definition.source || null
  };
}

function drawImage(ctx, image, x, y, width, height, options = {}) {
  const {
    alpha = 1,
    smoothing = false,
    source = null
  } = options;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = smoothing;

  if (source) {
    ctx.drawImage(
      image,
      source.x,
      source.y,
      source.w,
      source.h,
      x,
      y,
      width,
      height
    );
  } else {
    ctx.drawImage(image, x, y, width, height);
  }

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

  const spriteData = getResolvedSpriteData(role);
  if (spriteData?.image) {
    drawImage(ctx, spriteData.image, x, y, width, height, {
      alpha,
      smoothing,
      source: spriteData.source
    });
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

  const spriteData = getResolvedSpriteData(role);
  const startX = originX + Math.floor((x - originX) / tileWidth) * tileWidth;
  const startY = originY + Math.floor((y - originY) / tileHeight) * tileHeight;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  for (let tileY = startY; tileY < y + height; tileY += tileHeight) {
    for (let tileX = startX; tileX < x + width; tileX += tileWidth) {
      if (spriteData?.image) {
        drawImage(ctx, spriteData.image, tileX, tileY, tileWidth, tileHeight, {
          alpha: 1,
          smoothing,
          source: spriteData.source
        });
      } else if (typeof drawFallbackTile === "function") {
        drawFallbackTile({ tileX, tileY, tileWidth, tileHeight });
      }
    }
  }

  ctx.restore();
  return Boolean(spriteData?.image);
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
    frontRole = null,
    serviceRole = null,
    x,
    y,
    width,
    height,
    frontDepth = 0,
    serviceBox = null,
    drawFallback = null
  } = options;

  const bodySprite = getResolvedSpriteData(bodyRole);
  const frontSprite = getResolvedSpriteData(frontRole);
  const serviceSprite = getResolvedSpriteData(serviceRole);

  if (!bodySprite?.image && !frontSprite?.image && !serviceSprite?.image) {
    if (typeof drawFallback === "function") {
      drawFallback();
    }
    return false;
  }

  if (bodySprite?.image) {
    drawImage(ctx, bodySprite.image, x, y, width, height, {
      smoothing: false,
      source: bodySprite.source
    });
  }

  if (frontSprite?.image && frontDepth > 0) {
    drawImage(ctx, frontSprite.image, x, y + height, width, frontDepth, {
      smoothing: false,
      source: frontSprite.source
    });
  }

  if (serviceSprite?.image && serviceBox) {
    drawImage(
      ctx,
      serviceSprite.image,
      serviceBox.x,
      serviceBox.y,
      serviceBox.width,
      serviceBox.height,
      {
        smoothing: false,
        source: serviceSprite.source
      }
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
