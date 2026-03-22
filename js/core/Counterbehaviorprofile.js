const DEFAULT_COUNTER_BEHAVIOR = {
  servicePaceLabel: "Medium",
  serviceTimeSeconds: [1.1, 1.7],
  patienceSeconds: [8.5, 12.5],
  abandonSeconds: [14, 18],
  rerouteCheckInterval: 1.7,
  rerouteMinAdvantage: 2,
  maxReroutes: 1,
  abandonAtGlobalQueue: 9
};

export const COUNTER_BEHAVIOR_BY_STALL = {
  ramen_stall: {
    servicePaceLabel: "Slow",
    serviceTimeSeconds: [1.7, 2.4],
    patienceSeconds: [7.0, 10.5],
    abandonSeconds: [12.0, 16.0],
    rerouteCheckInterval: 1.4,
    rerouteMinAdvantage: 2,
    maxReroutes: 1,
    abandonAtGlobalQueue: 8
  },

  dry_noodle_stall: {
    servicePaceLabel: "Medium",
    serviceTimeSeconds: [1.1, 1.7],
    patienceSeconds: [8.5, 12.0],
    abandonSeconds: [13.5, 18.0],
    rerouteCheckInterval: 1.7,
    rerouteMinAdvantage: 2,
    maxReroutes: 1,
    abandonAtGlobalQueue: 9
  },

  soup_station: {
    servicePaceLabel: "Fast",
    serviceTimeSeconds: [0.8, 1.3],
    patienceSeconds: [9.0, 13.5],
    abandonSeconds: [15.0, 20.0],
    rerouteCheckInterval: 2.0,
    rerouteMinAdvantage: 1,
    maxReroutes: 2,
    abandonAtGlobalQueue: 10
  }
};

function rollRange([min, max]) {
  return min + Math.random() * (max - min);
}

export function getCounterBehaviorProfile(stallId) {
  return COUNTER_BEHAVIOR_BY_STALL[stallId] || DEFAULT_COUNTER_BEHAVIOR;
}

export function rollCounterServiceTime(stallId) {
  return rollRange(getCounterBehaviorProfile(stallId).serviceTimeSeconds);
}

export function rollQueuePatienceWindow(stallId) {
  return rollRange(getCounterBehaviorProfile(stallId).patienceSeconds);
}

export function rollQueueAbandonWindow(stallId) {
  return rollRange(getCounterBehaviorProfile(stallId).abandonSeconds);
}