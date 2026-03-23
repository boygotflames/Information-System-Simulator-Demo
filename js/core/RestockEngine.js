import {
  RESTOCK_PROFILES,
  getRestockProfile,
  getRestockSeverity
} from "../data/restockProfiles.js";

export default class RestockEngine {
  constructor({ profiles = RESTOCK_PROFILES } = {}) {
    this.profiles = profiles;
  }

  createDeliveryId(ingredient) {
    if (crypto?.randomUUID) {
      return `restock_${ingredient}_${crypto.randomUUID()}`;
    }

    return `restock_${ingredient}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }

  getIngredientState(inventory, ingredient) {
    const profile = getRestockProfile(ingredient);
    if (!profile) return null;

    const currentLevel = Number(inventory[ingredient] ?? 0);
    const severity = getRestockSeverity(currentLevel, profile);
    const neededAmount = Math.max(0, profile.targetStock - currentLevel);

    return {
      ingredient,
      label: profile.label,
      currentLevel,
      severity,
      neededAmount,
      targetStock: profile.targetStock,
      deliverySeconds: profile.defaultDeliverySeconds,
      priorityWeight: profile.priorityWeight
    };
  }

  prioritizeRequests(requests = []) {
    const severityRank = {
      Critical: 3,
      Low: 2,
      Stable: 1,
      Unknown: 0
    };

    return [...requests].sort((a, b) =>
      (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0) ||
      (b.priorityWeight || 0) - (a.priorityWeight || 0) ||
      (b.neededAmount || 0) - (a.neededAmount || 0) ||
      a.label.localeCompare(b.label)
    );
  }

  reconcilePendingRequests(inventory, pendingRequests = [], activeDeliveries = []) {
    const activeIngredients = new Set(
      activeDeliveries.map((delivery) => delivery.ingredient)
    );

    return pendingRequests.filter((request) => {
      if (activeIngredients.has(request.ingredient)) {
        return false;
      }

      const state = this.getIngredientState(inventory, request.ingredient);
      return state && state.severity !== "Stable" && state.neededAmount > 0;
    });
  }

  buildPendingRequests(
    inventory,
    { existingRequests = [], activeDeliveries = [] } = {}
  ) {
    const trackedIngredients = new Set([
      ...existingRequests.map((request) => request.ingredient),
      ...activeDeliveries.map((delivery) => delivery.ingredient)
    ]);

    const generated = Object.keys(this.profiles)
      .filter((ingredient) => !trackedIngredients.has(ingredient))
      .map((ingredient) => this.getIngredientState(inventory, ingredient))
      .filter((state) => state && state.severity !== "Stable" && state.neededAmount > 0)
      .map((state) => ({
        id: this.createDeliveryId(state.ingredient),
        ingredient: state.ingredient,
        label: state.label,
        severity: state.severity,
        neededAmount: state.neededAmount,
        targetStock: state.targetStock,
        requestedAtLevel: state.currentLevel,
        deliverySeconds: state.deliverySeconds,
        etaRemaining: state.deliverySeconds,
        priorityWeight: state.priorityWeight
      }));

    return this.prioritizeRequests(generated);
  }

  approveRequests(pendingRequests = [], maxApprovals = 2) {
    const prioritized = this.prioritizeRequests(pendingRequests);

    const approved = prioritized.slice(0, maxApprovals).map((request) => ({
      ...request,
      status: "in_transit"
    }));

    const remaining = prioritized.slice(maxApprovals);

    return { approved, remaining };
  }

  tickActiveDeliveries(activeDeliveries = [], deltaTime = 0) {
    const nextActive = [];
    const completed = [];

    activeDeliveries.forEach((delivery) => {
      const nextEta = Math.max(0, (delivery.etaRemaining ?? delivery.deliverySeconds) - deltaTime);
      const nextDelivery = {
        ...delivery,
        etaRemaining: nextEta
      };

      if (nextEta <= 0) {
        completed.push({
          ...nextDelivery,
          status: "delivered"
        });
      } else {
        nextActive.push(nextDelivery);
      }
    });

    return {
      activeDeliveries: nextActive,
      completedDeliveries: completed
    };
  }

  applyCompletedDelivery(inventory, delivery) {
    const profile = getRestockProfile(delivery.ingredient);
    if (!profile) return { ...inventory };

    const nextInventory = { ...inventory };
    const currentLevel = Number(nextInventory[delivery.ingredient] ?? 0);

    nextInventory[delivery.ingredient] = Math.min(
      profile.targetStock,
      currentLevel + Number(delivery.neededAmount ?? 0)
    );

    return nextInventory;
  }

  getPipelineSeverity({ inventory, pendingRequests = [], activeDeliveries = [] }) {
    const rawStates = Object.keys(this.profiles)
      .map((ingredient) => this.getIngredientState(inventory, ingredient))
      .filter(Boolean);

    const hasCriticalPending = pendingRequests.some((request) => request.severity === "Critical");
    const hasCriticalInventory = rawStates.some((state) => state.severity === "Critical");
    const hasLowInventory = rawStates.some((state) => state.severity === "Low");

    if (hasCriticalPending || (hasCriticalInventory && activeDeliveries.length === 0)) {
      return { code: "critical", label: "Critical" };
    }

    if (activeDeliveries.length > 0 || pendingRequests.length > 0 || hasLowInventory) {
      return { code: "watch", label: "Watch" };
    }

    return { code: "stable", label: "Stable" };
  }

  formatPendingSummary(pendingRequests = []) {
    if (pendingRequests.length === 0) {
      return "No pending restocks";
    }

    return pendingRequests
      .map((request) => `${request.label} (${request.severity})`)
      .join(" | ");
  }

  formatActiveSummary(activeDeliveries = []) {
    if (activeDeliveries.length === 0) {
      return "No active deliveries";
    }

    return activeDeliveries
      .map((delivery) => `${delivery.label} (${Math.ceil(delivery.etaRemaining)}s)`)
      .join(" | ");
  }
}