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

  getUnavailableRecipeKeysForStall(inventory, stallId) {
    const stall = this.catalog[stallId];
    if (!stall) return [];

    return stall.menu.filter((recipeKey) => !this.canServeRecipe(inventory, recipeKey));
  }

  getMenuAvailabilitySnapshot(inventory, stallId) {
    const stall = this.catalog[stallId];
    if (!stall) {
      return {
        availableRecipeKeys: [],
        unavailableRecipeKeys: [],
        availableLabels: [],
        unavailableLabels: []
      };
    }

    const availableRecipeKeys = this.getAvailableRecipeKeysForStall(inventory, stallId);
    const unavailableRecipeKeys = this.getUnavailableRecipeKeysForStall(inventory, stallId);

    return {
      availableRecipeKeys,
      unavailableRecipeKeys,
      availableLabels: availableRecipeKeys.map(
        (recipeKey) => this.recipeBook[recipeKey]?.label || recipeKey
      ),
      unavailableLabels: unavailableRecipeKeys.map(
        (recipeKey) => this.recipeBook[recipeKey]?.label || recipeKey
      )
    };
  }

  buildCounterRecommendation({ inventory, queueBreakdown }) {
    const stallViews = Object.values(this.catalog).map((stall) => {
      const state = this.getStallState({
        inventory,
        stallId: stall.id,
        queueBreakdown
      });

      const menuSnapshot = this.getMenuAvailabilitySnapshot(inventory, stall.id);

      return {
        stallId: stall.id,
        stallName: stall.name,
        queueLoad: state.queueLoad,
        stateCode: state.code,
        stateLabel: state.label,
        availableRecipeKeys: menuSnapshot.availableRecipeKeys,
        availableLabels: menuSnapshot.availableLabels,
        unavailableLabels: menuSnapshot.unavailableLabels
      };
    });

    const availableCounters = stallViews
      .filter((view) => view.availableRecipeKeys.length > 0)
      .sort((a, b) =>
        a.queueLoad - b.queueLoad ||
        a.stallName.localeCompare(b.stallName)
      );

    if (availableCounters.length === 0) {
      return {
        code: "recovery_required",
        text: "All counters blocked - restore minimum stock."
      };
    }

    const busiestCounter = [...availableCounters].sort((a, b) => b.queueLoad - a.queueLoad)[0];
    const lightestCounter = availableCounters[0];

    if (
      busiestCounter &&
      lightestCounter &&
      busiestCounter.stallId !== lightestCounter.stallId &&
      busiestCounter.queueLoad - lightestCounter.queueLoad >= 3
    ) {
      return {
        code: "rebalance",
        text: `Redirect overflow from ${busiestCounter.stallName} to ${lightestCounter.stallName}.`
      };
    }

    const constrainedCounter = stallViews.find(
      (view) =>
        view.stateCode === "constrained" &&
        view.availableRecipeKeys.length > 0 &&
        view.unavailableLabels.length > 0
    );

    if (constrainedCounter) {
      return {
        code: "limited_menu",
        text: `${constrainedCounter.stallName} limited menu: ${constrainedCounter.availableLabels.join(" / ")}.`
      };
    }

    return {
      code: "stable",
      text: "Counters balanced."
    };
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

  findStrategicAlternative({
    inventory,
    queueBreakdown,
    currentStallId,
    excludedStallIds = [],
    minQueueAdvantage = 2
  }) {
    const currentQueue = this.getQueueLoad(queueBreakdown, currentStallId);

    const alternative = this.findLeastLoadedAlternative({
      inventory,
      queueBreakdown,
      excludedStallIds: [currentStallId, ...excludedStallIds]
    });

    if (!alternative) {
      return null;
    }

    if (currentQueue - alternative.queueLoad < minQueueAdvantage) {
      return null;
    }

    return alternative;
  }

  findQueueReliefAlternative({ inventory, queueBreakdown, preferredStallId }) {
    const currentQueue = this.getQueueLoad(queueBreakdown, preferredStallId);

    if (currentQueue < 5) {
      return null;
    }

    return this.findStrategicAlternative({
      inventory,
      queueBreakdown,
      currentStallId: preferredStallId,
      minQueueAdvantage: 2
    });
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
