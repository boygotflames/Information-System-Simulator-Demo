/*
 * Canonical asset scan for the current workspace.
 *
 * Scan refreshed on 2026-03-25 against d:\canteen-IS-game\assets.
 * The render layer uses a curated subset of these files through spriteRegistry.js
 * and keeps procedural fallback active for any role we intentionally leave unset.
 */

const FLOOR_FILES = Object.freeze([
  "assets/tiles/floor/floorswalls_LRK.png"
]);

const FURNITURE_FILES = Object.freeze([
  "assets/tiles/interior/cabinets_LRK.png",
  "assets/tiles/interior/kitchen_LRK.png",
  "assets/tiles/interior/livingroom_LRK.png",
  "assets/tiles/walls/doorswindowsstairs_LRK.png"
]);

const PROP_FILES = Object.freeze([
  "assets/sprites/props/decorations_LRK.png"
]);

const PET_FILES = Object.freeze([
  "assets/sprites/pets/cat/Cat Sprite Sheet.png",
  "assets/sprites/pets/dog/48DogSpriteSheet.png"
]);

const UI_FILES = Object.freeze([
  "assets/sprites/ui/Kenny/9-Slice/space.png",
  "assets/sprites/ui/Kenny/9-Slice/space_inlay.png",
  "assets/sprites/ui/Kenny/9-Slice/Colored/blue.png",
  "assets/sprites/ui/Kenny/9-Slice/Colored/yellow.png",
  "assets/sprites/ui/Kenny/9-Slice/Outline/blue.png",
  "assets/sprites/ui/Spritesheet/UIpackSheet_magenta.png",
  "assets/sprites/ui/Spritesheet/UIpackSheet_transparent.png"
]);

const CHARACTER_FILES = Object.freeze([]);

const ALL_FILES = Object.freeze([
  ...FLOOR_FILES,
  ...FURNITURE_FILES,
  ...PROP_FILES,
  ...PET_FILES,
  ...UI_FILES
]);

export const ASSET_INVENTORY = Object.freeze({
  assetRoot: "assets",
  scannedAt: "2026-03-25",
  directories: Object.freeze([
    "assets/tiles/floor",
    "assets/tiles/interior",
    "assets/tiles/walls",
    "assets/sprites/props",
    "assets/sprites/pets/cat",
    "assets/sprites/pets/dog",
    "assets/sprites/ui/Kenny/9-Slice",
    "assets/sprites/ui/Spritesheet"
  ]),
  files: ALL_FILES,
  categories: Object.freeze({
    floor: FLOOR_FILES,
    furniture: FURNITURE_FILES,
    props: PROP_FILES,
    characters: CHARACTER_FILES,
    pets: PET_FILES,
    ui: UI_FILES
  }),
  notes: Object.freeze([
    "Human sprite assets are still not available, so CharacterRenderer remains procedural.",
    "The final visual pass uses a curated subset of real sheets to keep the scene coherent."
  ])
});

export function listDiscoveredAssets(category = null) {
  if (!category) {
    return ASSET_INVENTORY.files;
  }

  return ASSET_INVENTORY.categories[category] || [];
}

export function hasDiscoveredAssets() {
  return ASSET_INVENTORY.files.length > 0;
}

export default ASSET_INVENTORY;
