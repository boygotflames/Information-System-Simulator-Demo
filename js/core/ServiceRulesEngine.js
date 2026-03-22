export default class ServiceRulesEngine {
  constructor({ catalog, recipeBook }) {
    this.catalog = catalog;
    this.recipeBook = recipeBook;
  }

  getMissingIngredients(inventory, recipeKey) {
    const recipe = this.recipeBook[recipeKey];
    if (!recipe) return ["unknown_recipe"];

    return Object.entries(recipe.ingredients)
      .filter(([ingredient, amount]) => (inventory[ingredient] ?? 0) < amount)
      .map(([ingredient]) => ingredient);
  }

  canServeRecipe(inventory, recipeKey) {
    return this.getMissingIngredients(inventory, recipeKey).length === 0;
  }

  getAvailableRecipeKeysForStall(inventory, stallId) {
    const stall = this.catalog[stallId];
    if (!stall) return [];

    return stall.menu.filter((recipeKey) => this.canServeRecipe(inventory, recipeKey));
  }

  getQueueLoad(queueBreakdown, stallId) {
    return Number(queueBreakdown?.[stallId] ?? 0);
  }

  getStallState({ inventory, stallId, queueBreakdown }) {
    const stall = this.catalog[stallId];
    if (!stall) {
      return {
        code: "unknown",
        label: "Unknown",
        queueLoad: 0,
        availableRecipes: []
      };
    }

    const availableRecipes = this.getAvailableRecipeKeysForStall(inventory, stallId);
    const queueLoad = this.getQueueLoad(queueBreakdown, stallId);

    if (availableRecipes.length === 0) {
      return {
        code: "unavailable",
        label: "Unavailable",
        queueLoad,
        availableRecipes
      };
    }

    if (queueLoad >= 6) {
      return {
        code: "busy",
        label: "Busy",
        queueLoad,
        availableRecipes
      };
    }

    if (availableRecipes.length < stall.menu.length || queueLoad >= 3) {
      return {
        code: "constrained",
        label: "Constrained",
        queueLoad,
        availableRecipes
      };
    }

    return {
      code: "open",
      label: "Open",
      queueLoad,
      availableRecipes
    };
  }

  evaluateExactRecipeRequest({ inventory, stallId, recipeKey }) {
    const missingIngredients = this.getMissingIngredients(inventory, recipeKey);

    if (missingIngredients.length === 0) {
      return {
        ok: true,
        stallId,
        recipeKey,
        missingIngredients: [],
        alternativeRecipeKey: null
      };
    }

    const alternativeRecipeKey =
      this.getAvailableRecipeKeysForStall(inventory, stallId)
        .find((key) => key !== recipeKey) ?? null;

    return {
      ok: false,
      stallId,
      recipeKey,
      missingIngredients,
      alternativeRecipeKey
    };
  }

  findLeastLoadedAlternative({ inventory, queueBreakdown, excludedStallIds = [] }) {
    const excluded = new Set(excludedStallIds);

    const candidates = Object.values(this.catalog)
      .filter((stall) => !excluded.has(stall.id))
      .map((stall) => {
        const availableRecipes = this.getAvailableRecipeKeysForStall(inventory, stall.id);

        return {
          stallId: stall.id,
          availableRecipes,
          queueLoad: this.getQueueLoad(queueBreakdown, stall.id)
        };
      })
      .filter((candidate) => candidate.availableRecipes.length > 0)
      .sort((a, b) =>
        a.queueLoad - b.queueLoad ||
        b.availableRecipes.length - a.availableRecipes.length ||
        a.stallId.localeCompare(b.stallId)
      );

    if (candidates.length === 0) return null;

    return {
      stallId: candidates[0].stallId,
      recipeKey: candidates[0].availableRecipes[0],
      queueLoad: candidates[0].queueLoad
    };
  }

  findQueueReliefAlternative({ inventory, queueBreakdown, preferredStallId }) {
    const currentQueue = this.getQueueLoad(queueBreakdown, preferredStallId);
    if (currentQueue < 5) return null;

    const alternative = this.findLeastLoadedAlternative({
      inventory,
      queueBreakdown,
      excludedStallIds: [preferredStallId]
    });

    if (!alternative) return null;
    if (alternative.queueLoad + 2 > currentQueue) return null;

    return alternative;
  }

  planNpcScenario({ inventory, queueBreakdown, stallId, recipeKey }) {
    const exactRequest = this.evaluateExactRecipeRequest({
      inventory,
      stallId,
      recipeKey
    });

    if (exactRequest.ok) {
      const queueRelief = this.findQueueReliefAlternative({
        inventory,
        queueBreakdown,
        preferredStallId: stallId
      });

      if (queueRelief) {
        return {
          action: "reroute",
          stallId: queueRelief.stallId,
          recipeKey: queueRelief.recipeKey,
          reason: "queue_rebalance"
        };
      }

      return {
        action: "serve",
        stallId,
        recipeKey,
        reason: null
      };
    }

    const sameStallAlternatives =
      this.getAvailableRecipeKeysForStall(inventory, stallId)
        .filter((key) => key !== recipeKey);

    if (sameStallAlternatives.length > 0) {
      return {
        action: "switch_recipe",
        stallId,
        recipeKey: sameStallAlternatives[0],
        reason: "recipe_unavailable"
      };
    }

    const alternative = this.findLeastLoadedAlternative({
      inventory,
      queueBreakdown,
      excludedStallIds: [stallId]
    });

    if (alternative) {
      return {
        action: "reroute",
        stallId: alternative.stallId,
        recipeKey: alternative.recipeKey,
        reason: "stall_unavailable"
      };
    }

    return {
      action: "reject",
      stallId,
      recipeKey,
      reason: "no_fulfillable_menu"
    };
  }

  resolveNpcServiceAttempt({ inventory, queueBreakdown, stallId, recipeKey }) {
    const exactRequest = this.evaluateExactRecipeRequest({
      inventory,
      stallId,
      recipeKey
    });

    if (exactRequest.ok) {
      return {
        action: "serve",
        stallId,
        recipeKey,
        reason: null,
        missingIngredients: []
      };
    }

    const sameStallAlternatives =
      this.getAvailableRecipeKeysForStall(inventory, stallId)
        .filter((key) => key !== recipeKey);

    if (sameStallAlternatives.length > 0) {
      return {
        action: "switch_recipe",
        stallId,
        recipeKey: sameStallAlternatives[0],
        reason: "recipe_unavailable",
        missingIngredients: exactRequest.missingIngredients
      };
    }

    const alternative = this.findLeastLoadedAlternative({
      inventory,
      queueBreakdown,
      excludedStallIds: [stallId]
    });

    if (alternative) {
      return {
        action: "reroute",
        stallId: alternative.stallId,
        recipeKey: alternative.recipeKey,
        reason: "stall_unavailable",
        missingIngredients: exactRequest.missingIngredients
      };
    }

    return {
      action: "reject",
      stallId,
      recipeKey,
      reason: "no_fulfillable_menu",
      missingIngredients: exactRequest.missingIngredients
    };
  }
}