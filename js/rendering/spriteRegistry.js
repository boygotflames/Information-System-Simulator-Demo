import ASSET_INVENTORY from "./assetInventory.js";

function entry(path, options = {}) {
  return Object.freeze({
    path,
    ...options
  });
}

const FLOOR_SHEET = "assets/tiles/floor/floorswalls_LRK.png";
const KITCHEN_SHEET = "assets/tiles/interior/kitchen_LRK.png";
const CABINET_SHEET = "assets/tiles/interior/cabinets_LRK.png";
const LIVINGROOM_SHEET = "assets/tiles/interior/livingroom_LRK.png";
const WALL_SHEET = "assets/tiles/walls/doorswindowsstairs_LRK.png";
const DECOR_SHEET = "assets/sprites/props/decorations_LRK.png";
const CAT_SHEET = "assets/sprites/pets/cat/Cat Sprite Sheet.png";
const DOG_SHEET = "assets/sprites/pets/dog/48DogSpriteSheet.png";
const UI_PANEL = "assets/sprites/ui/Kenny/9-Slice/space.png";
const UI_CARD = "assets/sprites/ui/Kenny/9-Slice/space_inlay.png";
const UI_PRIMARY = "assets/sprites/ui/Kenny/9-Slice/Colored/blue.png";
const UI_SECONDARY = "assets/sprites/ui/Kenny/9-Slice/Colored/yellow.png";
const UI_GHOST = "assets/sprites/ui/Kenny/9-Slice/Outline/blue.png";

const SPRITE_REGISTRY = Object.freeze({
  "floor.base": entry(FLOOR_SHEET, {
    category: "floor",
    source: { x: 88, y: 164, w: 48, h: 48 },
    description: "Neutral stone base floor swatch"
  }),
  "floor.service": entry(FLOOR_SHEET, {
    category: "floor",
    source: { x: 88, y: 20, w: 48, h: 48 },
    description: "Service zone floor swatch"
  }),
  "floor.dining": entry(FLOOR_SHEET, {
    category: "floor",
    source: { x: 24, y: 20, w: 48, h: 48 },
    description: "Dining zone floor swatch"
  }),
  "floor.utility": entry(FLOOR_SHEET, {
    category: "floor",
    source: { x: 152, y: 20, w: 48, h: 48 },
    description: "Utility zone floor swatch"
  }),
  "wall.band": entry(FLOOR_SHEET, {
    category: "furniture",
    source: { x: 152, y: 20, w: 48, h: 48 },
    description: "Top wall band tile"
  }),
  "wall.trim": entry(WALL_SHEET, {
    category: "furniture",
    source: { x: 208, y: 17, w: 48, h: 30 },
    description: "Wood trim strip"
  }),
  "wall.window": entry(WALL_SHEET, {
    category: "furniture",
    source: { x: 113, y: 16, w: 30, h: 48 },
    description: "Inset window"
  }),
  "queue.slot": entry(null, {
    category: "props",
    description: "Queue standing pad remains procedural for clarity"
  }),
  "tray.slot": entry(null, {
    category: "props",
    description: "Tray drop standing pad remains procedural for clarity"
  }),
  "tray.path.accent": entry(null, {
    category: "props",
    description: "Tray path accent remains procedural"
  }),
  "counter.ramen.body": entry(KITCHEN_SHEET, {
    category: "furniture",
    source: { x: 23, y: 11, w: 145, h: 52 },
    description: "Ramen counter body"
  }),
  "counter.ramen.front": entry(KITCHEN_SHEET, {
    category: "furniture",
    source: { x: 23, y: 63, w: 145, h: 13 },
    description: "Ramen counter front apron"
  }),
  "counter.ramen.service": entry(KITCHEN_SHEET, {
    category: "furniture",
    source: { x: 192, y: 80, w: 32, h: 42 },
    description: "Ramen service block"
  }),
  "counter.dry.body": entry(KITCHEN_SHEET, {
    category: "furniture",
    source: { x: 23, y: 139, w: 145, h: 52 },
    description: "Dry noodle counter body"
  }),
  "counter.dry.front": entry(KITCHEN_SHEET, {
    category: "furniture",
    source: { x: 23, y: 191, w: 145, h: 13 },
    description: "Dry noodle counter front apron"
  }),
  "counter.dry.service": entry(KITCHEN_SHEET, {
    category: "furniture",
    source: { x: 192, y: 208, w: 32, h: 42 },
    description: "Dry noodle service block"
  }),
  "counter.soup.body": entry(KITCHEN_SHEET, {
    category: "furniture",
    source: { x: 23, y: 267, w: 145, h: 52 },
    description: "Soup counter body"
  }),
  "counter.soup.front": entry(KITCHEN_SHEET, {
    category: "furniture",
    source: { x: 23, y: 319, w: 145, h: 13 },
    description: "Soup counter front apron"
  }),
  "counter.soup.service": entry(KITCHEN_SHEET, {
    category: "furniture",
    source: { x: 192, y: 336, w: 32, h: 42 },
    description: "Soup service block"
  }),
  "table.top": entry(LIVINGROOM_SHEET, {
    category: "furniture",
    source: { x: 16, y: 160, w: 48, h: 20 },
    description: "Dining table top"
  }),
  "table.front": entry(LIVINGROOM_SHEET, {
    category: "furniture",
    source: { x: 16, y: 180, w: 48, h: 12 },
    description: "Dining table front"
  }),
  "chair.visible": entry(null, {
    category: "furniture",
    description: "Seat markers stay procedural to preserve occupancy readability"
  }),
  "dining.signage": entry(DECOR_SHEET, {
    category: "props",
    source: { x: 112, y: 96, w: 32, h: 16 },
    description: "Dining wall art"
  }),
  "tray.return": entry(KITCHEN_SHEET, {
    category: "props",
    source: { x: 356, y: 104, w: 28, h: 56 },
    description: "Tray return rack"
  }),
  "wash.station": entry(KITCHEN_SHEET, {
    category: "props",
    source: { x: 23, y: 139, w: 145, h: 65 },
    description: "Wash station counter"
  }),
  "tray.moving": entry(null, {
    category: "props",
    description: "Moving tray remains procedural"
  }),
  "plant.small": entry(DECOR_SHEET, {
    category: "props",
    source: { x: 16, y: 81, w: 16, h: 30 },
    description: "Potted plant"
  }),
  "poster.small": entry(DECOR_SHEET, {
    category: "props",
    source: { x: 112, y: 64, w: 32, h: 16 },
    description: "Small framed poster"
  }),
  "poster.banner": entry(DECOR_SHEET, {
    category: "props",
    source: { x: 112, y: 96, w: 32, h: 16 },
    description: "Wide framed poster"
  }),
  "prop.decor.small": entry(DECOR_SHEET, {
    category: "props",
    source: { x: 16, y: 16, w: 16, h: 46 },
    description: "Standing lamp decor"
  }),
  "pet.cat.static": entry(CAT_SHEET, {
    category: "pets",
    source: { x: 0, y: 0, w: 32, h: 32 },
    chromaKey: { r: 255, g: 255, b: 255, tolerance: 12 },
    description: "Static cat frame"
  }),
  "pet.dog.static": entry(DOG_SHEET, {
    category: "pets",
    source: { x: 0, y: 0, w: 16, h: 16 },
    chromaKey: { r: 255, g: 255, b: 255, tolerance: 12 },
    description: "Static dog frame"
  }),
  "plaque.title": entry(null, {
    category: "ui",
    description: "Canvas title plaque remains procedural"
  }),
  "plaque.small": entry(null, {
    category: "ui",
    description: "Canvas small plaque remains procedural"
  }),
  "ui.panel": entry(UI_PANEL, {
    category: "ui",
    description: "Kenney panel frame"
  }),
  "ui.card": entry(UI_CARD, {
    category: "ui",
    description: "Kenney card frame"
  }),
  "ui.button.primary": entry(UI_PRIMARY, {
    category: "ui",
    description: "Kenney primary button frame"
  }),
  "ui.button.secondary": entry(UI_SECONDARY, {
    category: "ui",
    description: "Kenney secondary button frame"
  }),
  "ui.button.ghost": entry(UI_GHOST, {
    category: "ui",
    description: "Kenney ghost button frame"
  }),
  "ui.pill": entry(UI_PANEL, {
    category: "ui",
    description: "Kenney pill frame"
  }),
  "ui.frame": entry(UI_PANEL, {
    category: "ui",
    description: "Kenney generic frame"
  }),
  "ui.badge": entry(UI_SECONDARY, {
    category: "ui",
    description: "Kenney badge frame"
  }),
  "ui.plaque": entry(null, {
    category: "ui",
    description: "Canvas plaque remains procedural"
  }),
  "ui.panelFrame": entry(UI_PANEL, {
    category: "ui",
    description: "Panel frame treatment"
  })
});

export function getSpriteDefinition(role) {
  return SPRITE_REGISTRY[role] || null;
}

export function getSpritePath(role) {
  return getSpriteDefinition(role)?.path || null;
}

export function hasRegisteredSprite(role) {
  return Boolean(getSpritePath(role));
}

export function listSpriteRoles() {
  return Object.keys(SPRITE_REGISTRY);
}

export const SPRITE_REGISTRY_SUMMARY = Object.freeze({
  registeredRoles: listSpriteRoles().length,
  discoveredAssetFiles: ASSET_INVENTORY.files.length,
  hasUsableSprites: listSpriteRoles().some((role) => hasRegisteredSprite(role))
});

export default SPRITE_REGISTRY;
