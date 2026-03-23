import {
  STALL_METRICS
} from "../data/LayoutConstants.js";

export default class QueueSystem {
  constructor(servicePoints, { maxSlots = STALL_METRICS.maxQueueSlots, slotSpacing = STALL_METRICS.queueSlotSpacing } = {}) {
    this.maxSlots = maxSlots;
    this.slotSpacing = slotSpacing;

    this.records = new Map();
    this.assignments = new Map();

    servicePoints.forEach((point) => {
      const slots = Array.from({ length: this.maxSlots }, (_, index) => ({
        index,
        stallId: point.stallId,
        servicePointId: point.id,
        x: point.servicePointX ?? point.x,
        y: (point.servicePointY ?? point.y) + (index + 1) * this.slotSpacing,
        occupied: false,
        occupantId: null
      }));

      this.records.set(point.stallId, {
        stallId: point.stallId,
        servicePoint: {
          x: point.servicePointX ?? point.x,
          y: point.servicePointY ?? point.y
        },
        slots,
        queue: []
      });
    });
  }

  normalizeAssignments(stallId) {
    const record = this.records.get(stallId);
    if (!record) return;

    record.slots.forEach((slot) => {
      slot.occupied = false;
      slot.occupantId = null;
    });

    record.queue = record.queue.slice(0, this.maxSlots);

    record.queue.forEach((npcId, index) => {
      const slot = record.slots[index];
      if (!slot) return;

      slot.occupied = true;
      slot.occupantId = npcId;

      this.assignments.set(npcId, {
        stallId,
        index
      });
    });
  }

  joinQueue(stallId, npcId) {
    const existing = this.assignments.get(npcId);
    if (existing?.stallId === stallId) {
      return this.getAssignedSlot(npcId);
    }

    if (existing) {
      this.leaveQueue(existing.stallId, npcId);
    }

    const record = this.records.get(stallId);
    if (!record) return null;
    if (record.queue.length >= this.maxSlots) return null;

    record.queue.push(npcId);
    this.normalizeAssignments(stallId);

    return this.getAssignedSlot(npcId);
  }

  leaveQueue(stallId, npcId) {
    const record = this.records.get(stallId);
    if (!record) return;

    const index = record.queue.indexOf(npcId);
    if (index === -1) return;

    record.queue.splice(index, 1);
    this.assignments.delete(npcId);
    this.normalizeAssignments(stallId);
  }

  getAssignedSlot(npcId) {
    const assignment = this.assignments.get(npcId);
    if (!assignment) return null;

    const record = this.records.get(assignment.stallId);
    if (!record) return null;

    return record.slots[assignment.index] || null;
  }

  getAssignment(npcId) {
    return this.assignments.get(npcId) || null;
  }

  getQueueLength(stallId) {
    return this.records.get(stallId)?.queue.length || 0;
  }

  getServicePoint(stallId) {
    return this.records.get(stallId)?.servicePoint || null;
  }

  peekFrontOccupant(stallId) {
    return this.records.get(stallId)?.queue[0] || null;
  }

  isFrontOfQueue(npcId) {
    const assignment = this.assignments.get(npcId);
    return assignment ? assignment.index === 0 : false;
  }

  getQueueSnapshot() {
    const snapshot = {};

    this.records.forEach((record, stallId) => {
      snapshot[stallId] = record.queue.length;
    });

    return snapshot;
  }
}