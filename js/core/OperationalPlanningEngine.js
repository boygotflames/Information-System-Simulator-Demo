const BASE_RUNTIME_PROFILE = Object.freeze({
  spawnIntervalMin: 2.6,
  spawnIntervalMax: 4.1,
  burstChance: 0.16,
  maxStudents: 14,
  stallDemandWeights: {
    ramen_stall: 0.44,
    dry_noodle_stall: 0.33,
    soup_station: 0.23
  }
});

export default class OperationsPlanningEngine {
  getBaseProfile() {
    return {
      spawnIntervalMin: BASE_RUNTIME_PROFILE.spawnIntervalMin,
      spawnIntervalMax: BASE_RUNTIME_PROFILE.spawnIntervalMax,
      burstChance: BASE_RUNTIME_PROFILE.burstChance,
      maxStudents: BASE_RUNTIME_PROFILE.maxStudents,
      stallDemandWeights: {
        ...BASE_RUNTIME_PROFILE.stallDemandWeights
      }
    };
  }

  humanizeStallLabel(stallId) {
    const labels = {
      ramen_stall: "Ramen Stall",
      dry_noodle_stall: "Dry Noodle Stall",
      soup_station: "Soup Station"
    };

    return labels[stallId] || stallId;
  }

  normalizeWeights(weights = {}) {
    const safeWeights = {
      ramen_stall: Math.max(0, Number(weights.ramen_stall ?? 0)),
      dry_noodle_stall: Math.max(0, Number(weights.dry_noodle_stall ?? 0)),
      soup_station: Math.max(0, Number(weights.soup_station ?? 0))
    };

    const total = Object.values(safeWeights).reduce((sum, value) => sum + value, 0);

    if (total <= 0) {
      return { ...BASE_RUNTIME_PROFILE.stallDemandWeights };
    }

    return Object.fromEntries(
      Object.entries(safeWeights).map(([stallId, value]) => [stallId, value / total])
    );
  }

  getTopStallId(stalls = {}) {
    const ranked = Object.values(stalls)
      .slice()
      .sort((a, b) =>
        (b.orders || 0) - (a.orders || 0) ||
        (b.sales || 0) - (a.sales || 0)
      );

    return ranked[0]?.id || "ramen_stall";
  }

  buildPromotionWeights(topStallId) {
    const base = this.getBaseProfile().stallDemandWeights;

    const weights = {
      ...base,
      [topStallId]: (base[topStallId] ?? 0.33) + 0.12
    };

    const otherIds = Object.keys(weights).filter((stallId) => stallId !== topStallId);

    otherIds.forEach((stallId) => {
      weights[stallId] = Math.max(0.12, weights[stallId] - 0.06);
    });

    return this.normalizeWeights(weights);
  }

  formatDemandProfile(runtimeProfile) {
    const weights = this.normalizeWeights(runtimeProfile?.stallDemandWeights || {});
    const demandParts = Object.entries(weights).map(
      ([stallId, value]) => `${this.humanizeStallLabel(stallId)} ${Math.round(value * 100)}%`
    );

    return `Arrival ${runtimeProfile.spawnIntervalMin.toFixed(1)}-${runtimeProfile.spawnIntervalMax.toFixed(1)}s | ${demandParts.join(" | ")}`;
  }

  buildPlan({
    stalls = {},
    operationalMetrics = {},
    restockState = {},
    reportingState = {},
    efficiencyScore = 0
  } = {}) {
    const archivedReportCount = reportingState?.archivedReports?.length ?? 0;
    const peakQueueLength = operationalMetrics?.peakQueueLength ?? 0;
    const blockedTransactions = operationalMetrics?.blockedTransactions ?? 0;
    const abandonedTransactions = operationalMetrics?.abandonedTransactions ?? 0;
    const reroutedTransactions = operationalMetrics?.reroutedTransactions ?? 0;
    const pendingRestocks = restockState?.pendingRequests?.length ?? 0;
    const activeDeliveries = restockState?.activeDeliveries?.length ?? 0;
    const continuityStatus = operationalMetrics?.continuityStatus ?? "Stable";
    const restockSeverity = operationalMetrics?.restockSeverity ?? "Stable";

    let runtimeProfile = this.getBaseProfile();
    let planCode = "baseline";
    let planLabel = "Baseline Plan";
    let topPriority = "Keep counters balanced and watch queue growth.";
    let managerBrief = archivedReportCount > 0
      ? `Planning uses ${archivedReportCount} archived report(s) plus current live metrics.`
      : "Planning uses current live metrics only because no archived reports exist yet.";

    const recoveryRisk =
      continuityStatus === "Recovery Applied" ||
      restockSeverity === "High";

    const queueRisk =
      peakQueueLength >= 8 ||
      blockedTransactions >= 3 ||
      abandonedTransactions >= 2;

    const healthyHighFlow =
      efficiencyScore >= 78 &&
      blockedTransactions === 0 &&
      abandonedTransactions === 0 &&
      pendingRestocks === 0 &&
      activeDeliveries === 0;

    if (recoveryRisk) {
      planCode = "recovery";
      planLabel = "Recovery Plan";
      topPriority = "Protect continuity first: slow arrivals and spread demand away from a single hot counter.";
      managerBrief = `${managerBrief} Recovery signals detected from stock or continuity stress.`;

      runtimeProfile = {
        spawnIntervalMin: 3.3,
        spawnIntervalMax: 4.9,
        burstChance: 0.08,
        maxStudents: 11,
        stallDemandWeights: this.normalizeWeights({
          ramen_stall: 0.30,
          dry_noodle_stall: 0.35,
          soup_station: 0.35
        })
      };
    } else if (queueRisk) {
      planCode = "queue_relief";
      planLabel = "Queue Relief Plan";
      topPriority = "Reduce crowding pressure and redistribute arrivals toward lighter counters.";
      managerBrief = `${managerBrief} Queue stress detected from peak load, blocked orders, or abandonment.`;

      runtimeProfile = {
        spawnIntervalMin: 2.9,
        spawnIntervalMax: 4.4,
        burstChance: 0.10,
        maxStudents: 12,
        stallDemandWeights: this.normalizeWeights({
          ramen_stall: 0.28,
          dry_noodle_stall: 0.36,
          soup_station: 0.36
        })
      };
    } else if (healthyHighFlow) {
      const topStallId = this.getTopStallId(stalls);

      planCode = "promotion";
      planLabel = "Peak Service Plan";
      topPriority = `System is healthy: allow stronger demand and lean into ${this.humanizeStallLabel(topStallId)}.`;
      managerBrief = `${managerBrief} Good efficiency and low friction justify a higher-throughput plan.`;

      runtimeProfile = {
        spawnIntervalMin: 2.2,
        spawnIntervalMax: 3.5,
        burstChance: 0.22,
        maxStudents: 16,
        stallDemandWeights: this.buildPromotionWeights(topStallId)
      };
    } else if (reroutedTransactions >= 3) {
      planCode = "rebalance";
      planLabel = "Balanced Diversion Plan";
      topPriority = "Keep total flow stable but reduce repeated reroutes by balancing counter demand earlier.";
      managerBrief = `${managerBrief} Frequent reroutes suggest demand should be distributed before queues harden.`;

      runtimeProfile = {
        spawnIntervalMin: 2.6,
        spawnIntervalMax: 4.0,
        burstChance: 0.14,
        maxStudents: 13,
        stallDemandWeights: this.normalizeWeights({
          ramen_stall: 0.31,
          dry_noodle_stall: 0.35,
          soup_station: 0.34
        })
      };
    }

    return {
      generatedAt: new Date().toLocaleTimeString(),
      planCode,
      planLabel,
      topPriority,
      managerBrief,
      runtimeProfile,
      demandProfileText: this.formatDemandProfile(runtimeProfile)
    };
  }
}