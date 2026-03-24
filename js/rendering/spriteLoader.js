import { getSpritePath, hasRegisteredSprite, listSpriteRoles } from "./spriteRegistry.js";

const spriteCache = new Map();

function createRecord(path) {
  return {
    path,
    status: "idle",
    image: null,
    promise: null
  };
}

function resolveSpritePath(roleOrPath) {
  if (!roleOrPath) {
    return null;
  }

  return roleOrPath.includes("/") ? roleOrPath : getSpritePath(roleOrPath);
}

function getRecord(path) {
  if (!path) {
    return null;
  }

  if (!spriteCache.has(path)) {
    spriteCache.set(path, createRecord(path));
  }

  return spriteCache.get(path);
}

function loadRecord(record) {
  if (!record) {
    return Promise.resolve(null);
  }

  if (record.status === "loaded") {
    return Promise.resolve(record.image);
  }

  if (record.status === "loading" && record.promise) {
    return record.promise;
  }

  if (record.status === "error") {
    return Promise.resolve(null);
  }

  if (typeof Image === "undefined") {
    record.status = "error";
    return Promise.resolve(null);
  }

  record.status = "loading";
  record.promise = new Promise((resolve) => {
    const image = new Image();

    image.addEventListener("load", () => {
      record.status = "loaded";
      record.image = image;
      resolve(image);
    });

    image.addEventListener("error", () => {
      record.status = "error";
      record.image = null;
      resolve(null);
    });

    image.src = record.path;
  });

  return record.promise;
}

export function loadSprite(roleOrPath) {
  const path = resolveSpritePath(roleOrPath);
  if (!path) {
    return Promise.resolve(null);
  }

  return loadRecord(getRecord(path));
}

export function getSprite(roleOrPath) {
  const path = resolveSpritePath(roleOrPath);
  if (!path) {
    return null;
  }

  const record = getRecord(path);
  if (record.status === "idle") {
    loadRecord(record);
  }

  return record.status === "loaded" ? record.image : null;
}

export function getSpriteState(roleOrPath) {
  const path = resolveSpritePath(roleOrPath);
  return getRecord(path)?.status || "missing";
}

export function hasSprite(role) {
  return hasRegisteredSprite(role);
}

export function preloadSprites(roles = listSpriteRoles()) {
  return Promise.allSettled(roles.map((role) => loadSprite(role)));
}

export function resetSpriteCache() {
  spriteCache.clear();
}
