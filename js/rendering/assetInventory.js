/*
 * Canonical asset scan for the current workspace.
 *
 * Scan performed on 2026-03-25 against d:\canteen-IS-game\assets.
 * Result: the repository currently contains asset directories only and no
 * discovered image files. The render layer stays fully operational by using
 * procedural fallbacks until real sprite files are added under assets/.
 */

const ASSET_DIRECTORIES = Object.freeze([
  "assets/tiles",
  "assets/tiles/sprites",
  "assets/tiles/sprites/ui"
]);

const EMPTY_CATEGORY = Object.freeze([]);

export const ASSET_INVENTORY = Object.freeze({
  assetRoot: "assets",
  scannedAt: "2026-03-25",
  directories: ASSET_DIRECTORIES,
  files: Object.freeze([]),
  categories: Object.freeze({
    floor: EMPTY_CATEGORY,
    furniture: EMPTY_CATEGORY,
    props: EMPTY_CATEGORY,
    characters: EMPTY_CATEGORY,
    pets: EMPTY_CATEGORY,
    ui: EMPTY_CATEGORY
  }),
  notes: Object.freeze([
    "No image files were present under assets/ at scan time.",
    "Sprite registry roles are kept semantic so future asset drops only require mapping updates."
  ])
});

export function listDiscoveredAssets(category = null) {
  if (!category) {
    return ASSET_INVENTORY.files;
  }

  return ASSET_INVENTORY.categories[category] || EMPTY_CATEGORY;
}

export function hasDiscoveredAssets() {
  return ASSET_INVENTORY.files.length > 0;
}

export default ASSET_INVENTORY;
