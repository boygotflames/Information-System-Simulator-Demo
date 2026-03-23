export default class ExecutiveReportEngine {
  createReportId(dayNumber) {
    if (crypto?.randomUUID) {
      return `day_report_${dayNumber}_${crypto.randomUUID()}`;
    }

    return `day_report_${dayNumber}_${Date.now()}`;
  }

  formatCurrency(value) {
    return `¥${Number(value || 0).toFixed(2)}`;
  }

  getTopStall(stalls = {}) {
    const ranked = Object.values(stalls)
      .slice()
      .sort((a, b) => b.sales - a.sales || b.orders - a.orders);

    return ranked[0] || null;
  }

  getPeakQueueLabel(queueBreakdown = {}) {
    const ranked = Object.entries(queueBreakdown)
      .slice()
      .sort((a, b) => b[1] - a[1]);

    if (ranked.length === 0 || ranked[0][1] <= 0) {
      return "No queue pressure recorded";
    }

    return `${ranked[0][0]} (${ranked[0][1]})`;
  }

  buildRiskSummary(operationalMetrics = {}) {
    const risks = [];

    if ((operationalMetrics.blockedTransactions ?? 0) > 0) {
      risks.push(`Blocked ${operationalMetrics.blockedTransactions}`);
    }

    if ((operationalMetrics.reroutedTransactions ?? 0) > 0) {
      risks.push(`Rerouted ${operationalMetrics.reroutedTransactions}`);
    }

    if ((operationalMetrics.abandonedTransactions ?? 0) > 0) {
      risks.push(`Abandoned ${operationalMetrics.abandonedTransactions}`);
    }

    if ((operationalMetrics.pendingRestockCount ?? 0) > 0) {
      risks.push(`Pending restocks ${operationalMetrics.pendingRestockCount}`);
    }

    if (operationalMetrics.continuityStatus === "Recovery Applied") {
      risks.push("Continuity recovery applied");
    }

    return risks.length ? risks.join(" | ") : "Stable operations";
  }

  buildExecutiveSummary({
    totalTransactions = 0,
    dailySales = 0,
    efficiencyScore = 0,
    topStallName = "No sales yet",
    demandPressure = "Normal",
    restockSeverity = "Stable"
  }) {
    return [
      `Sales ${this.formatCurrency(dailySales)}`,
      `TPS ${totalTransactions}`,
      `Efficiency ${efficiencyScore}/100`,
      `Top stall ${topStallName}`,
      `Demand ${demandPressure}`,
      `Restock ${restockSeverity}`
    ].join(" | ");
  }

  formatArchiveSummary(report) {
    return `${report.dayLabel} · ${this.formatCurrency(report.dailySales)} · ${report.totalTransactions} TPS · ${report.topStallName}`;
  }

  buildReport({
    dayNumber = 1,
    transactions = [],
    dailySales = 0,
    stalls = {},
    inventory = {},
    operationalMetrics = {},
    efficiencyScore = 0
  }) {
    const topStall = this.getTopStall(stalls);
    const topStallName = topStall && topStall.orders > 0
      ? topStall.name
      : "No sales yet";

    const timestamp = new Date().toLocaleString();
    const totalTransactions = transactions.length;
    const averageSale = totalTransactions > 0 ? dailySales / totalTransactions : 0;

    return {
      id: this.createReportId(dayNumber),
      dayNumber,
      dayLabel: `Day ${dayNumber}`,
      createdAt: timestamp,
      totalTransactions,
      dailySales: Number(dailySales.toFixed(2)),
      averageSale: Number(averageSale.toFixed(2)),
      topStallName,
      topStallOrders: topStall?.orders ?? 0,
      topStallSales: Number((topStall?.sales ?? 0).toFixed(2)),
      peakQueueLabel: this.getPeakQueueLabel(operationalMetrics.queueBreakdown),
      seatedStudentCount: operationalMetrics.seatedStudentCount ?? 0,
      peakQueueLength: operationalMetrics.peakQueueLength ?? 0,
      demandPressure: operationalMetrics.demandPressure ?? "Normal",
      restockSeverity: operationalMetrics.restockSeverity ?? "Stable",
      continuityStatus: operationalMetrics.continuityStatus ?? "Stable",
      blockedTransactions: operationalMetrics.blockedTransactions ?? 0,
      reroutedTransactions: operationalMetrics.reroutedTransactions ?? 0,
      abandonedTransactions: operationalMetrics.abandonedTransactions ?? 0,
      executiveSummary: this.buildExecutiveSummary({
        totalTransactions,
        dailySales,
        efficiencyScore,
        topStallName,
        demandPressure: operationalMetrics.demandPressure,
        restockSeverity: operationalMetrics.restockSeverity
      }),
      riskSummary: this.buildRiskSummary(operationalMetrics),
      inventorySnapshot: {
        noodles: inventory.noodles ?? 0,
        broth: inventory.broth ?? 0,
        eggs: inventory.eggs ?? 0,
        scallions: inventory.scallions ?? 0
      }
    };
  }
}