import ASSET_INVENTORY from "./assetInventory.js";

function entry(path, options = {}) {
  return Object.freeze({
    path,
    ...options
  });
}

const SPRITE_REGISTRY = Object.freeze({
  "floor.base": entry(null, { category: "floor", description: "Base floor tile" }),
  "floor.service": entry(null, { category: "floor", description: "Service zone floor tile" }),
  "floor.dining": entry(null, { category: "floor", description: "Dining zone floor tile" }),
  "floor.utility": entry(null, { category: "floor", description: "Utility zone floor tile" }),
  "queue.slot": entry(null, { category: "props", description: "Queue standing pad" }),
  "tray.slot": entry(null, { category: "props", description: "Tray drop standing pad" }),
  "counter.ramen.body": entry(null, { category: "furniture", description: "Ramen stall body" }),
  "counter.ramen.sign": entry(null, { category: "ui", description: "Ramen stall sign" }),
  "counter.ramen.service": entry(null, { category: "furniture", description: "Ramen service block" }),
  "counter.dry_noodle.body": entry(null, { category: "furniture", description: "Dry noodle stall body" }),
  "counter.dry_noodle.sign": entry(null, { category: "ui", description: "Dry noodle stall sign" }),
  "counter.dry_noodle.service": entry(null, { category: "furniture", description: "Dry noodle service block" }),
  "counter.soup.body": entry(null, { category: "furniture", description: "Soup stall body" }),
  "counter.soup.sign": entry(null, { category: "ui", description: "Soup stall sign" }),
  "counter.soup.service": entry(null, { category: "furniture", description: "Soup service block" }),
  "table.top": entry(null, { category: "furniture", description: "Dining table top" }),
  "table.front": entry(null, { category: "furniture", description: "Dining table front" }),
  "chair.visible": entry(null, { category: "furniture", description: "Visible seat marker" }),
  "tray.return": entry(null, { category: "props", description: "Tray return station" }),
  "wash.station": entry(null, { category: "props", description: "Wash station" }),
  "tray.moving": entry(null, { category: "props", description: "Moving tray" }),
  "poster.open_lab": entry(null, { category: "ui", description: "Open lab poster" }),
  "poster.campus_special": entry(null, { category: "ui", description: "Campus special poster" }),
  "plant.small": entry(null, { category: "props", description: "Small plant decor" }),
  "cat.ambient": entry(null, { category: "pets", description: "Ambient cat" }),
  "ui.plaque": entry(null, { category: "ui", description: "Small plaque or title plate" }),
  "ui.panelFrame": entry(null, { category: "ui", description: "Panel frame treatment" })
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
