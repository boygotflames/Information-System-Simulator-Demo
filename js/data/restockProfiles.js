export const RESTOCK_PROFILES = {
  noodles: {
    ingredient: "noodles",
    label: "Noodles",
    targetStock: 100,
    lowThreshold: 20,
    criticalThreshold: 10,
    defaultDeliverySeconds: 10,
    priorityWeight: 3
  },
  broth: {
    ingredient: "broth",
    label: "Broth",
    targetStock: 80,
    lowThreshold: 15,
    criticalThreshold: 8,
    defaultDeliverySeconds: 9,
    priorityWeight: 2
  },
  eggs: {
    ingredient: "eggs",
    label: "Eggs",
    targetStock: 60,
    lowThreshold: 12,
    criticalThreshold: 6,
    defaultDeliverySeconds: 8,
    priorityWeight: 2
  },
  scallions: {
    ingredient: "scallions",
    label: "Scallions",
    targetStock: 50,
    lowThreshold: 10,
    criticalThreshold: 5,
    defaultDeliverySeconds: 7,
    priorityWeight: 4
  }
};

export function getRestockProfile(ingredient) {
  return RESTOCK_PROFILES[ingredient] || null;
}

export function getRestockSeverity(currentLevel, profile) {
  if (!profile) return "Unknown";
  if (currentLevel <= profile.criticalThreshold) return "Critical";
  if (currentLevel <= profile.lowThreshold) return "Low";
  return "Stable";
}