import { STALL_CATALOG } from "../data/stallCatalog.js";
import { RECIPE_BOOK } from "../data/recipeBook.js";
import { saveState, loadState } from "./LocalStateRepository.js";
import ServiceRulesEngine from "./ServiceRulesEngine.js";

export default class InformationSystemController {
  constructor() {
    this.catalog = STALL_CATALOG;
    this.recipeBook = RECIPE_BOOK;
    this.serviceRules = new ServiceRulesEngine({
      catalog: this.catalog,
      recipeBook: this.recipeBook
    });

    this.transactions = [];
    this.dailySales = 0;

    this.inventory = {
      noodles: 100,
      broth: 80,
      eggs: 60,
      scallions: 50
    };

    this.stalls = {};
    Object.values(this.catalog).forEach((stall) => {
      this.stalls[stall.id] = {
        id: stall.id,
        name: stall.name,
        sales: 0,
        orders: 0,
        menu: stall.menu,
        targetOrdersPerDay: stall.targetOrdersPerDay
      };
    });

    this.educationalCounters = {
      hardware: 2,
      software: 2,
      data: 0,
      people: 4,
      processes: 1
    };

    this.selectedObject = null;
    this.lastRecipeAccessed = "No recipe selected";
    this.operationalMetrics = {
      liveQueueLength: 0,
      peakQueueLength: 0,
      autoTransactionCount: 0,
      demandPressure: "Normal",
      occupiedDiningSeats: 0,
      totalDiningSeats: 48,
      seatedStudentCount: 0,
      seatingPressure: "Low",
      trayReturnCount: 0,
      washedTrayCount: 0,
      queueBreakdown: {
        ramen_stall: 0,
        dry_noodle_stall: 0,
        soup_station: 0
      },
      blockedTransactions: 0,
      reroutedTransactions: 0,
      stallStates: {
        ramen_stall: "Open",
        dry_noodle_stall: "Open",
        soup_station: "Open"
      }
    };
    this.playerProfile = {
      id: "player_001",
      displayName: "Player",
      balance: 100,
      currentMeal: null,
      status: "Exploring",
      totalPurchases: 0,
      totalSpent: 0,
      seatedAt: null,
      hasCampusCard: true
    };

    const savedState = loadState();
    if (savedState) {
      this.hydrateState(savedState);
    }
  }

  hydrateState(savedState) {
    if (Array.isArray(savedState.transactions)) {
      this.transactions = savedState.transactions;
    }

    if (typeof savedState.dailySales === "number") {
      this.dailySales = savedState.dailySales;
    }

    if (savedState.inventory) {
      this.inventory = {
        ...this.inventory,
        ...savedState.inventory
      };
    }

    if (savedState.stalls) {
      Object.keys(savedState.stalls).forEach((stallId) => {
        if (this.stalls[stallId]) {
          this.stalls[stallId] = {
            ...this.stalls[stallId],
            ...savedState.stalls[stallId]
          };
        }
      });
    }

    if (typeof savedState.lastRecipeAccessed === "string") {
      this.lastRecipeAccessed = savedState.lastRecipeAccessed;
    }

    if (savedState.operationalMetrics) {
      this.operationalMetrics = {
        ...this.operationalMetrics,
        ...savedState.operationalMetrics
      };
    }

    if (savedState.playerProfile) {
      this.playerProfile = {
        ...this.playerProfile,
        ...savedState.playerProfile
      };
    }
  }

  persistState() {
    saveState({
      transactions: this.transactions,
      dailySales: this.dailySales,
      inventory: this.inventory,
      stalls: this.stalls,
      lastRecipeAccessed: this.lastRecipeAccessed,
      operationalMetrics: this.operationalMetrics,
      playerProfile: this.playerProfile
    });
  }

  recordBlockedTransaction() {
    this.operationalMetrics.blockedTransactions += 1;
  }

  recordReroutedTransaction() {
    this.operationalMetrics.reroutedTransactions += 1;
  }

  getQueueBreakdownSnapshot() {
    return {
      ...this.operationalMetrics.queueBreakdown
    };
  }

  getStallStateSnapshot() {
    const snapshot = {};

    Object.keys(this.catalog).forEach((stallId) => {
      snapshot[stallId] = this.serviceRules.getStallState({
        inventory: this.inventory,
        stallId,
        queueBreakdown: this.getQueueBreakdownSnapshot()
      }).label;
    });

    return snapshot;
  }

  humanizeRuleReason(reason, missingIngredients = []) {
    if (reason === "queue_rebalance") {
      return "Queue rebalanced to a less crowded counter.";
    }

    if (reason === "recipe_unavailable") {
      return missingIngredients.length
        ? `Preferred recipe unavailable: ${missingIngredients.join(", ")} low.`
        : "Preferred recipe unavailable.";
    }

    if (reason === "stall_unavailable") {
      return "Current stall unavailable, rerouted to another counter.";
    }

    if (reason === "no_fulfillable_menu") {
      return "No fulfillable menu items available right now.";
    }

    return "Operational rules applied.";
  }

  createNpcServiceScenario() {
    const baseScenario = this.createRandomTransactionScenario();

    const plannedScenario = this.serviceRules.planNpcScenario({
      inventory: this.inventory,
      queueBreakdown: this.getQueueBreakdownSnapshot(),
      stallId: baseScenario.stallId,
      recipeKey: baseScenario.recipeKey
    });

    if (plannedScenario.action === "reject") {
      return null;
    }

    if (plannedScenario.action === "reroute") {
      this.recordReroutedTransaction();
    }

    return {
      ...baseScenario,
      stallId: plannedScenario.stallId,
      recipeKey: plannedScenario.recipeKey
    };
  }

  resolveNpcServiceAttempt(scenario) {
    const resolution = this.serviceRules.resolveNpcServiceAttempt({
      inventory: this.inventory,
      queueBreakdown: this.getQueueBreakdownSnapshot(),
      stallId: scenario.stallId,
      recipeKey: scenario.recipeKey
    });

    if (resolution.action === "reject") {
      this.recordBlockedTransaction();
      this.persistState();
      this.updateDashboard();

      return {
        ok: false,
        action: "reject",
        reason: this.humanizeRuleReason(
          resolution.reason,
          resolution.missingIngredients
        )
      };
    }

    if (resolution.action === "reroute") {
      this.recordReroutedTransaction();
    }

    return {
      ok: true,
      action: resolution.action,
      scenario: {
        ...scenario,
        stallId: resolution.stallId,
        recipeKey: resolution.recipeKey
      },
      reason: this.humanizeRuleReason(
        resolution.reason,
        resolution.missingIngredients
      )
    };
  }

  simulateOperationalTransaction() {
    const scenario = this.createNpcServiceScenario();

    if (!scenario) {
      this.recordBlockedTransaction();
      this.persistState();
      this.updateDashboard();
      return null;
    }

    return this.processTransaction({
      ...scenario,
      source: "manual"
    });
  }

  createRandomTransactionScenario() {
    const stallIds = Object.keys(this.catalog);
    const stallId = stallIds[Math.floor(Math.random() * stallIds.length)];
    const stall = this.catalog[stallId];
    const recipeKey = stall.menu[Math.floor(Math.random() * stall.menu.length)];

    return {
      studentId: `student_${Math.floor(Math.random() * 900 + 100)}`,
      stallId,
      recipeKey,
      paymentMethod: Math.random() > 0.5 ? "Campus Card" : "WeChat Pay"
    };
  }

  consumeRecipeIngredients(recipeKey) {
    const recipe = this.recipeBook[recipeKey];
    if (!recipe) return;

    Object.entries(recipe.ingredients).forEach(([ingredient, amount]) => {
      if (typeof this.inventory[ingredient] === "number") {
        this.inventory[ingredient] = Math.max(0, this.inventory[ingredient] - amount);
      }
    });
  }

  generateMisSnapshot() {
    const rankedStalls = Object.values(this.stalls)
      .slice()
      .sort((a, b) => b.sales - a.sales);

    const topStall = rankedStalls[0];

    return {
      topStall: topStall && topStall.orders > 0
        ? `${topStall.name} (¥${topStall.sales.toFixed(2)} / ${topStall.orders} orders)`
        : "No sales yet",
      totalOrders: this.transactions.length
    };
  }

  getRestockList() {
    const restock = [];

    if (this.inventory.noodles <= 20) restock.push("Noodles");
    if (this.inventory.broth <= 15) restock.push("Broth");
    if (this.inventory.eggs <= 12) restock.push("Eggs");
    if (this.inventory.scallions <= 10) restock.push("Scallions");

    return restock;
  }

  getEfficiencyScore() {
    const totalTransactions = this.transactions.length;
    const transactionScore = Math.min(totalTransactions * 4, 40);

    const stockRatios = [
      this.inventory.noodles / 100,
      this.inventory.broth / 80,
      this.inventory.eggs / 60,
      this.inventory.scallions / 50
    ];

    const averageStockRatio =
      stockRatios.reduce((sum, value) => sum + value, 0) / stockRatios.length;

    const stockScore = Math.max(0, Math.min(60, Math.round(averageStockRatio * 60)));

    return transactionScore + stockScore;
  }

  getDemandPressure() {
    const liveQueue = this.operationalMetrics.liveQueueLength;

    if (liveQueue >= 6) return "High";
    if (liveQueue >= 3) return "Medium";
    return "Normal";
  }

  updateOperationalMetrics(queueLength, queueBreakdown = null) {
    this.operationalMetrics.liveQueueLength = queueLength;
    this.operationalMetrics.peakQueueLength = Math.max(
      this.operationalMetrics.peakQueueLength,
      queueLength
    );
    this.operationalMetrics.demandPressure = this.getDemandPressure();

    if (queueBreakdown) {
      this.operationalMetrics.queueBreakdown = {
        ...this.operationalMetrics.queueBreakdown,
        ...queueBreakdown
      };
    }
  }

  getSeatingPressure() {
    const totalSeats = Math.max(1, this.operationalMetrics.totalDiningSeats);
    const occupancyRatio = this.operationalMetrics.occupiedDiningSeats / totalSeats;

    if (occupancyRatio >= 0.75) return "High";
    if (occupancyRatio >= 0.4) return "Medium";
    return "Low";
  }

  updateDiningMetrics({
    occupiedDiningSeats = 0,
    totalDiningSeats = 48,
    seatedStudentCount = 0,
    trayReturnCount = 0,
    washedTrayCount = 0
  } = {}) {
    this.operationalMetrics.occupiedDiningSeats = occupiedDiningSeats;
    this.operationalMetrics.totalDiningSeats = totalDiningSeats;
    this.operationalMetrics.seatedStudentCount = seatedStudentCount;
    this.operationalMetrics.trayReturnCount = trayReturnCount;
    this.operationalMetrics.washedTrayCount = washedTrayCount;
    this.operationalMetrics.seatingPressure = this.getSeatingPressure();
  }

  renderOperationalMetrics() {
    const liveQueueEl = document.getElementById("liveQueueLength");
    const peakQueueEl = document.getElementById("peakQueueLength");
    const demandPressureEl = document.getElementById("demandPressure");
    const autoTransactionCountEl = document.getElementById("autoTransactionCount");
    const occupiedDiningSeatsEl = document.getElementById("occupiedDiningSeats");
    const totalDiningSeatsEl = document.getElementById("totalDiningSeats");
    const seatedStudentCountEl = document.getElementById("seatedStudentCount");
    const seatingPressureEl = document.getElementById("seatingPressure");
    const trayReturnCountEl = document.getElementById("trayReturnCount");
    const washedTrayCountEl = document.getElementById("washedTrayCount");
    const queueRamenEl = document.getElementById("queueRamen");
    const queueDryNoodlesEl = document.getElementById("queueDryNoodles");
    const queueSoupEl = document.getElementById("queueSoup");
    const blockedTransactionsEl = document.getElementById("blockedTransactions");
    const reroutedTransactionsEl = document.getElementById("reroutedTransactions");
    const stateRamenEl = document.getElementById("stateRamen");
    const stateDryNoodlesEl = document.getElementById("stateDryNoodles");
    const stateSoupEl = document.getElementById("stateSoup");
    const statusEl = document.getElementById("systemStatus");

    if (liveQueueEl) liveQueueEl.textContent = this.operationalMetrics.liveQueueLength;
    if (peakQueueEl) peakQueueEl.textContent = this.operationalMetrics.peakQueueLength;
    if (demandPressureEl) demandPressureEl.textContent = this.operationalMetrics.demandPressure;
    if (autoTransactionCountEl) autoTransactionCountEl.textContent = this.operationalMetrics.autoTransactionCount;

    if (occupiedDiningSeatsEl) occupiedDiningSeatsEl.textContent = this.operationalMetrics.occupiedDiningSeats;
    if (totalDiningSeatsEl) totalDiningSeatsEl.textContent = this.operationalMetrics.totalDiningSeats;
    if (seatedStudentCountEl) seatedStudentCountEl.textContent = this.operationalMetrics.seatedStudentCount;
    if (seatingPressureEl) seatingPressureEl.textContent = this.operationalMetrics.seatingPressure;
    if (trayReturnCountEl) trayReturnCountEl.textContent = this.operationalMetrics.trayReturnCount;
    if (washedTrayCountEl) washedTrayCountEl.textContent = this.operationalMetrics.washedTrayCount;
    if (queueRamenEl) queueRamenEl.textContent = this.operationalMetrics.queueBreakdown.ramen_stall ?? 0;
    if (queueDryNoodlesEl) queueDryNoodlesEl.textContent = this.operationalMetrics.queueBreakdown.dry_noodle_stall ?? 0;
    if (queueSoupEl) queueSoupEl.textContent = this.operationalMetrics.queueBreakdown.soup_station ?? 0;

    const stallStates = this.getStallStateSnapshot();
    this.operationalMetrics.stallStates = stallStates;

    if (blockedTransactionsEl) blockedTransactionsEl.textContent = this.operationalMetrics.blockedTransactions;
    if (reroutedTransactionsEl) reroutedTransactionsEl.textContent = this.operationalMetrics.reroutedTransactions;
    if (stateRamenEl) stateRamenEl.textContent = stallStates.ramen_stall;
    if (stateDryNoodlesEl) stateDryNoodlesEl.textContent = stallStates.dry_noodle_stall;
    if (stateSoupEl) stateSoupEl.textContent = stallStates.soup_station;

    if (statusEl) {
      if (
        this.transactions.length === 0 &&
        this.operationalMetrics.liveQueueLength === 0 &&
        this.operationalMetrics.seatedStudentCount === 0 &&
        this.operationalMetrics.trayReturnCount === 0
      ) {
        statusEl.textContent = "System Status: Ready";
      } else if (this.operationalMetrics.liveQueueLength > 0) {
        statusEl.textContent = "System Status: Queue Active";
      } else if (this.operationalMetrics.seatedStudentCount > 0) {
        statusEl.textContent = "System Status: Dining Active";
      } else if (this.operationalMetrics.trayReturnCount > 0) {
        statusEl.textContent = "System Status: Washing Active";
      } else {
        statusEl.textContent = "System Status: Live Operation";
      }
    }
  }

  getPlayerProfile() {
    return this.playerProfile;
  }

  setPlayerStatus(status) {
    this.playerProfile.status = status;
    this.persistState();
    this.renderPlayerProfile();
  }

  playerStandUp() {
    this.playerProfile.seatedAt = null;
    this.playerProfile.status = this.playerProfile.currentMeal
      ? `Carrying ${this.playerProfile.currentMeal}`
      : "Exploring";

    this.persistState();
    this.renderPlayerProfile();
  }

  seatPlayerAt(seatLabel) {
    this.playerProfile.seatedAt = seatLabel;
    this.playerProfile.status = this.playerProfile.currentMeal
      ? `Seated with ${this.playerProfile.currentMeal}`
      : `Seated at ${seatLabel}`;

    this.persistState();
    this.renderPlayerProfile();

    return { ok: true };
  }

  playerEatMeal(seatLabel) {
    if (!this.playerProfile.currentMeal) {
      this.playerProfile.seatedAt = seatLabel;
      this.playerProfile.status = `Seated at ${seatLabel}`;
      this.persistState();
      this.renderPlayerProfile();
      return { ok: false, message: "No meal to eat." };
    }

    const meal = this.playerProfile.currentMeal;

    this.playerProfile.currentMeal = null;
    this.playerProfile.seatedAt = seatLabel;
    this.playerProfile.status = `Finished ${meal} at ${seatLabel}`;

    this.persistState();
    this.updateDashboard();

    return { ok: true, message: `Finished ${meal}` };
  }

  processPlayerPurchase({
    stallId = "ramen_stall",
    recipeKey = "tonkotsu_ramen"
  } = {}) {
    const recipe = this.recipeBook[recipeKey];

    if (!recipe) {
      this.playerProfile.status = "Recipe not found";
      this.persistState();
      this.renderPlayerProfile();
      return { ok: false, message: "Recipe not found." };
    }

    if (this.playerProfile.currentMeal) {
      this.playerProfile.status = `Already carrying ${this.playerProfile.currentMeal}`;
      this.persistState();
      this.renderPlayerProfile();
      return { ok: false, message: "Already carrying a meal." };
    }

    const recipeRequest = this.serviceRules.evaluateExactRecipeRequest({
      inventory: this.inventory,
      stallId,
      recipeKey
    });

    if (!recipeRequest.ok) {
      const suggestedRecipeLabel = recipeRequest.alternativeRecipeKey
        ? this.recipeBook[recipeRequest.alternativeRecipeKey]?.label
        : null;

      const detail = recipeRequest.missingIngredients.length
        ? `Unavailable: ${recipeRequest.missingIngredients.join(", ")} low.`
        : "Selected recipe unavailable.";

      this.playerProfile.status = suggestedRecipeLabel
        ? `${detail} Try ${suggestedRecipeLabel}.`
        : detail;

      this.recordBlockedTransaction();
      this.persistState();
      this.updateDashboard();

      return { ok: false, message: detail };
    }

    if (this.playerProfile.balance < recipe.price) {
      this.playerProfile.status = "Insufficient balance";
      this.persistState();
      this.renderPlayerProfile();
      return { ok: false, message: "Not enough balance." };
    }

    const transaction = this.processTransaction({
      studentId: this.playerProfile.id,
      studentDisplayName: this.playerProfile.displayName,
      stallId,
      recipeKey,
      paymentMethod: this.playerProfile.hasCampusCard ? "Campus Card" : "WeChat Pay",
      source: "player"
    });

    if (!transaction) {
      this.playerProfile.status = "Purchase failed";
      this.persistState();
      this.renderPlayerProfile();
      return { ok: false, message: "Transaction failed." };
    }

    this.playerProfile.balance = Number((this.playerProfile.balance - recipe.price).toFixed(2));
    this.playerProfile.currentMeal = recipe.label;
    this.playerProfile.status = `Carrying ${recipe.label}`;
    this.playerProfile.totalPurchases += 1;
    this.playerProfile.totalSpent = Number((this.playerProfile.totalSpent + recipe.price).toFixed(2));
    this.playerProfile.seatedAt = null;

    this.persistState();
    this.updateDashboard();

    return { ok: true, message: `Bought ${recipe.label}` };
  }

  renderPlayerProfile() {
    const nameEl = document.getElementById("playerName");
    const balanceEl = document.getElementById("playerBalance");
    const mealEl = document.getElementById("playerMeal");
    const statusEl = document.getElementById("playerStatus");
    const purchasesEl = document.getElementById("playerTotalPurchases");
    const spentEl = document.getElementById("playerTotalSpent");
    const seatEl = document.getElementById("playerSeat");

    if (nameEl) nameEl.textContent = this.playerProfile.displayName;
    if (balanceEl) balanceEl.textContent = this.playerProfile.balance.toFixed(2);
    if (mealEl) mealEl.textContent = this.playerProfile.currentMeal || "None";
    if (statusEl) statusEl.textContent = this.playerProfile.status;
    if (purchasesEl) purchasesEl.textContent = this.playerProfile.totalPurchases;
    if (spentEl) spentEl.textContent = this.playerProfile.totalSpent.toFixed(2);
    if (seatEl) seatEl.textContent = this.playerProfile.seatedAt || "None";
  }

  inspectObject(objectData) {
    this.selectedObject = objectData;

    const nameEl = document.getElementById("selectedName");
    const typeEl = document.getElementById("selectedType");
    const roleEl = document.getElementById("selectedRole");
    const descriptionEl = document.getElementById("selectedDescription");
    const kmsRecipeEl = document.getElementById("kmsRecipe");

    if (!objectData) return;

    if (nameEl) nameEl.textContent = objectData.name || "Unknown";
    if (typeEl) typeEl.textContent = objectData.type || "Unknown";
    if (roleEl) roleEl.textContent = objectData.isRole || "Unknown";
    if (descriptionEl) descriptionEl.textContent = objectData.description || "No description available.";

    // KMS hook: if player clicks a recipe/cook station
    if (objectData.recipe) {
      this.lastRecipeAccessed = objectData.recipe;
      if (kmsRecipeEl) kmsRecipeEl.textContent = objectData.recipe;
      this.persistState();
    }

    this.updateEducationalCounters();
  }

  processTransaction({
    studentId = "student_001",
    studentDisplayName = null,
    stallId = "ramen_stall",
    recipeKey = "tonkotsu_ramen",
    paymentMethod = "Campus Card",
    source = "manual"
  } = {}) {
    const recipe = this.recipeBook[recipeKey];
    const stall = this.stalls[stallId];
    const recipeRequest = this.serviceRules.evaluateExactRecipeRequest({
      inventory: this.inventory,
      stallId,
      recipeKey
    });

    if (!recipe || !stall) {
      console.warn("Invalid transaction payload:", { studentId, stallId, recipeKey, paymentMethod });
      return null;
    }

    if (!recipeRequest.ok) {
      this.recordBlockedTransaction();
      this.persistState();
      this.updateDashboard();
      return null;
    }

    const timestamp = new Date().toLocaleTimeString();
    const price = recipe.price;

    const transaction = {
      id: crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now()}`,
      studentId,
      studentDisplayName,
      stallId,
      stallName: stall.name,
      recipeKey,
      dishName: recipe.label,
      price,
      paymentMethod,
      source,
      timestamp
    };

    this.transactions.unshift(transaction);
    this.dailySales += price;

    stall.sales += price;
    stall.orders += 1;

    this.consumeRecipeIngredients(recipeKey);
    this.lastRecipeAccessed = recipe.label;

    if (source === "auto_queue") {
      this.operationalMetrics.autoTransactionCount += 1;
    }

    this.persistState();
    this.updateDashboard();

    return transaction;
  }

  getDssAlert() {
    const alerts = [];
    const restockList = this.getRestockList();
    const stallStates = this.getStallStateSnapshot();

    if (restockList.length > 0) {
      const severity =
        restockList.length >= 3 ? "High" :
        restockList.length === 2 ? "Medium" :
        "Low";

      alerts.push(`${severity} restock alert: ${restockList.join(", ")}`);
    }

    if (this.operationalMetrics.liveQueueLength >= 5) {
      alerts.push("Student surge detected: prepare extra noodles / open extra counter");
    }

    if (this.operationalMetrics.queueBreakdown.ramen_stall >= 5 &&
        this.operationalMetrics.queueBreakdown.soup_station <= 2) {
      alerts.push("Queue balancing recommended: redirect demand toward Soup Counter");
    }

    if (this.operationalMetrics.seatingPressure === "High") {
      alerts.push("Dining area nearing capacity: monitor seat turnover");
    }

    if (this.operationalMetrics.trayReturnCount >= 4) {
      alerts.push("Tray return backlog detected: cleaning support recommended");
    }

    const unavailableStalls = Object.entries(stallStates)
      .filter(([, state]) => state === "Unavailable")
      .map(([stallId]) => this.stalls[stallId]?.name || stallId);

    if (unavailableStalls.length > 0) {
      alerts.push(`Service unavailable: ${unavailableStalls.join(", ")}`);
    }

    if (this.operationalMetrics.blockedTransactions > 0) {
      alerts.push(`Blocked orders observed: ${this.operationalMetrics.blockedTransactions}`);
    }

    return alerts.length ? alerts.join(" | ") : "No alert";
  }

  getEssSummary() {
    const efficiencyScore = this.getEfficiencyScore();
    const totalTransactions = this.transactions.length;
    const averageSale =
      totalTransactions > 0 ? (this.dailySales / totalTransactions).toFixed(2) : "0.00";

    return `Efficiency ${efficiencyScore}/100 | ${totalTransactions} transactions | Avg sale ¥${averageSale}`;
  }

  updateEducationalCounters() {
    const dataCount = this.transactions.length;

    const hardwareEl = document.getElementById("hardwareCount");
    const softwareEl = document.getElementById("softwareCount");
    const dataEl = document.getElementById("dataCount");
    const peopleEl = document.getElementById("peopleCount");
    const processEl = document.getElementById("processCount");

    if (hardwareEl) hardwareEl.textContent = this.educationalCounters.hardware;
    if (softwareEl) softwareEl.textContent = this.educationalCounters.software;
    if (dataEl) dataEl.textContent = dataCount;
    if (peopleEl) peopleEl.textContent = this.educationalCounters.people;
    if (processEl) processEl.textContent = this.educationalCounters.processes;
  }

  updateInventoryDom() {
    const noodlesEl = document.getElementById("inventoryNoodles");
    const brothEl = document.getElementById("inventoryBroth");
    const eggsEl = document.getElementById("inventoryEggs");
    const scallionsEl = document.getElementById("inventoryScallions");

    if (noodlesEl) {
      noodlesEl.textContent = this.inventory.noodles;
      noodlesEl.className = this.getInventoryClass(this.inventory.noodles, 20, 10);
    }

    if (brothEl) {
      brothEl.textContent = this.inventory.broth;
      brothEl.className = this.getInventoryClass(this.inventory.broth, 15, 8);
    }

    if (eggsEl) {
      eggsEl.textContent = this.inventory.eggs;
      eggsEl.className = this.getInventoryClass(this.inventory.eggs, 12, 6);
    }

    if (scallionsEl) {
      scallionsEl.textContent = this.inventory.scallions;
      scallionsEl.className = this.getInventoryClass(this.inventory.scallions, 10, 5);
    }
  }

  getInventoryClass(value, lowThreshold, criticalThreshold) {
    if (value <= criticalThreshold) return "critical-stock";
    if (value <= lowThreshold) return "low-stock";
    return "";
  }

  updateTransactionFeed() {
    const feed = document.getElementById("transactionFeed");
    if (!feed) return;

    if (this.transactions.length === 0) {
      feed.innerHTML = `<p class="feed-placeholder">No transactions yet.</p>`;
      return;
    }

    const latestFive = this.transactions.slice(0, 5);

    feed.innerHTML = latestFive
      .map(
        (tx) => `
          <div class="feed-entry">
            <strong>${tx.timestamp}</strong> — ${tx.studentDisplayName || tx.studentId} bought
            <strong>${tx.dishName}</strong> for ¥${tx.price.toFixed(2)}
            via ${tx.paymentMethod}
          </div>
        `
      )
      .join("");
  }

  updateDashboard() {
    const statusEl = document.getElementById("systemStatus");
    const tpsCountEl = document.getElementById("tpsCount");
    const misSalesEl = document.getElementById("misSales");
    const dssAlertEl = document.getElementById("dssAlert");
    const essSummaryEl = document.getElementById("essSummary");
    const misTopStallEl = document.getElementById("misTopStall");
    const dssRestockListEl = document.getElementById("dssRestockList");
    const essEfficiencyScoreEl = document.getElementById("essEfficiencyScore");
    const kmsLastRecipeEl = document.getElementById("kmsLastRecipe");

    if (tpsCountEl) tpsCountEl.textContent = this.transactions.length;
    if (misSalesEl) misSalesEl.textContent = this.dailySales.toFixed(2);
    if (dssAlertEl) dssAlertEl.textContent = this.getDssAlert();
    if (essSummaryEl) essSummaryEl.textContent = this.getEssSummary();

    const misSnapshot = this.generateMisSnapshot();
    const restockList = this.getRestockList();
    const efficiencyScore = this.getEfficiencyScore();

    if (misTopStallEl) misTopStallEl.textContent = misSnapshot.topStall;
    if (dssRestockListEl) dssRestockListEl.textContent = restockList.length ? restockList.join(", ") : "No restock needed";
    if (essEfficiencyScoreEl) essEfficiencyScoreEl.textContent = `${efficiencyScore}/100`;
    if (kmsLastRecipeEl) kmsLastRecipeEl.textContent = this.lastRecipeAccessed;

    this.updateEducationalCounters();
    this.updateInventoryDom();
    this.updateTransactionFeed();
    this.renderOperationalMetrics();
    this.renderPlayerProfile();
  }

  bootstrapDashboard() {
    this.updateDashboard();
  }
}
