export const TILE_SIZE = 32;

export const STALL_BLOCK_WIDTH = 150;
export const STALL_BLOCK_HEIGHT = 82;
export const COUNTER_DEPTH = 16;
export const SERVICE_BLOCK_SIZE = 36;

export const TABLE_DEPTH = 14;
export const WALL_BAND_HEIGHT = 86;
export const UI_FONT_FAMILY = "\"Space Grotesk\", \"Segoe UI\", sans-serif";
export const DISPLAY_FONT_FAMILY = "\"Barlow Condensed\", \"Arial Narrow\", sans-serif";

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const safe =
    normalized.length === 3
      ? normalized.split("").map((char) => char + char).join("")
      : normalized;

  const intValue = Number.parseInt(safe, 16);

  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255
  };
}

export function darkenHex(hex, factor = 0.82) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${clampChannel(r * factor)}, ${clampChannel(g * factor)}, ${clampChannel(b * factor)})`;
}

export function lightenHex(hex, factor = 1.12) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${clampChannel(r * factor)}, ${clampChannel(g * factor)}, ${clampChannel(b * factor)})`;
}

export function getCounterTheme(baseColor) {
  return {
    top: baseColor,
    front: darkenHex(baseColor, 0.72),
    edge: darkenHex(baseColor, 0.48),
    trim: lightenHex(baseColor, 1.1),
    sign: darkenHex(baseColor, 0.64),
    stripe: lightenHex(baseColor, 1.26),
    glow: lightenHex(baseColor, 1.4)
  };
}
