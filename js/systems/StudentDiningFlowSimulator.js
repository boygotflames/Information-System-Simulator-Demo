import { generateStudentIdentity } from "../data/namePools.js";
import * as CanteenLayout from "../data/canteenLayout.js";
import {
  ALL_DINING_SEATS,
  DINING_NAV_POINTS,
  TRAY_DROP_ANCHOR,
  TRAY_DROP_SLOTS,
  TRAY_EXIT_ANCHOR
} from "../data/diningAreaLayout.js";
import {
  CANVAS_W,
  CANVAS_H
} from "../data/LayoutConstants.js";
import {
  STATIC_OBSTACLES,
  isBlocked
} from "../data/collisionLayout.js";
import {
  resolveMovement
} from "./CollisionSystem.js";
import {
  routePath
} from "./NpcPathRouter.js";
import QueueSystem from "./QueueSystem.js";

const STATE_TIMEOUTS = {
  MOVING_TO_QUEUE: 8,
  MOVING_TO_SEAT: 8,
  MOVING_TO_TRAY: 6,
  DONE: 3
};

export default class StudentDiningFlowSimulator {
  constructor(controller, traySystem) {
    this.controller = controller;
    this.traySystem = traySystem;

    this.students = [];
    this.nextStudentId = 1;

    this.spawnTimer = 0;
    this.spawnIntervalMin = 2.6;
    this.spawnIntervalMax = 4.1;
    this.nextSpawnInterval = this.rollSpawnInterval();
    this.burstChance = 0.16;
    this.maxStudents = 14;

    this.servicePoints =
      CanteenLayout.SERVICE_POINT_LIST ||
      Object.values(CanteenLayout.SERVICE_POINTS || {});

    this.queueSystem = new QueueSystem(this.servicePoints);
    this.activeServiceByStall = new Map();

    this.allSeats = ALL_DINING_SEATS;
    this.npcSeatAssignments = new Map();
    this.traySlotAssignments = new Map();
    this.currentPlayerOccupiedSeatId = null;

    this.spawnStudent();
    this.spawnStudent();
  }

  rollSpawnInterval() {
    return this.spawnIntervalMin + Math.random() * (this.spawnIntervalMax - this.spawnIntervalMin);
  }

  syncRuntimeDemandProfile() {
    const runtimeProfile = this.controller.getRuntimeDemandProfile
      ? this.controller.getRuntimeDemandProfile()
      : null;

    if (!runtimeProfile) return;

    const nextMin = Math.max(0.8, Number(runtimeProfile.spawnIntervalMin ?? this.spawnIntervalMin));
    const nextMax = Math.max(nextMin + 0.2, Number(runtimeProfile.spawnIntervalMax ?? this.spawnIntervalMax));
    const nextBurst = Math.max(0, Math.min(0.6, Number(runtimeProfile.burstChance ?? this.burstChance)));
    const nextMaxStudents = Math.max(4, Math.round(Number(runtimeProfile.maxStudents ?? this.maxStudents)));

    this.spawnIntervalMin = nextMin;
    this.spawnIntervalMax = nextMax;
    this.burstChance = nextBurst;
    this.maxStudents = nextMaxStudents;

    if (
      this.nextSpawnInterval < this.spawnIntervalMin ||
      this.nextSpawnInterval > this.spawnIntervalMax
    ) {
      this.nextSpawnInterval = this.rollSpawnInterval();
    }
  }

  createStudentIdentityPayload() {
    const identity = generateStudentIdentity();

    return {
      displayName: identity.displayName,
      originType: identity.originType,
      color: identity.originType === "domestic_pinyin" ? "#60a5fa" : "#f87171"
    };
  }

  applyTimingProfile(student, stallId) {
    const timingProfile = this.controller.createNpcTimingProfile
      ? this.controller.createNpcTimingProfile(stallId)
      : {
          serviceDuration: 1.2,
          patienceDuration: 9,
          abandonmentDuration: 15
        };

    student.serviceDuration = timingProfile.serviceDuration;
    student.patienceDuration = timingProfile.patienceDuration;
    student.abandonmentDuration = timingProfile.abandonmentDuration;
  }

  getSeatById(seatId) {
    return this.allSeats.find((seat) => seat.id === seatId) || null;
  }

  getTraySlotById(slotId) {
    return TRAY_DROP_SLOTS.find((slot) => slot.id === slotId) || null;
  }

  getTableOccupancyMap(playerOccupiedSeatId = null) {
    const tableOccupancy = new Map();

    this.allSeats.forEach((seat) => {
      if (!tableOccupancy.has(seat.tableId)) {
        tableOccupancy.set(seat.tableId, 0);
      }
    });

    this.npcSeatAssignments.forEach((_, seatId) => {
      const seat = this.getSeatById(seatId);
      if (seat) {
        tableOccupancy.set(seat.tableId, (tableOccupancy.get(seat.tableId) || 0) + 1);
      }
    });

    if (playerOccupiedSeatId) {
      const playerSeat = this.getSeatById(playerOccupiedSeatId);
      if (playerSeat) {
        tableOccupancy.set(playerSeat.tableId, (tableOccupancy.get(playerSeat.tableId) || 0) + 1);
      }
    }

    return tableOccupancy;
  }

  getOccupiedSeatIds(playerOccupiedSeatId = null) {
    const occupied = new Set(this.npcSeatAssignments.keys());

    if (playerOccupiedSeatId) {
      occupied.add(playerOccupiedSeatId);
    }

    return occupied;
  }

  isSeatOccupiedByNpc(seatId) {
    return this.npcSeatAssignments.has(seatId);
  }

  getAvailableSeats(playerOccupiedSeatId = null) {
    const blocked = this.getOccupiedSeatIds(playerOccupiedSeatId);
    return this.allSeats.filter((seat) => !blocked.has(seat.id));
  }

  pickSeatPreference() {
    const roll = Math.random();

    if (roll < 0.36) return "solo";
    if (roll < 0.6) return "social";
    if (roll < 0.82) return "far";
    return "random";
  }

  scoreAvailableSeats(student, playerOccupiedSeatId = null) {
    const availableSeats = this.getAvailableSeats(playerOccupiedSeatId);
    const tableOccupancy = this.getTableOccupancyMap(playerOccupiedSeatId);
    const servicePoint = this.queueSystem.getServicePoint(student.scenario.stallId);
    const serviceX = servicePoint?.anchorX ?? servicePoint?.x ?? 0;
    const serviceY = servicePoint?.anchorY ?? servicePoint?.y ?? 0;

    return availableSeats
      .map((seat) => {
        const tableLoad = tableOccupancy.get(seat.tableId) || 0;
        const distanceFromCounter = Math.hypot(
          seat.anchorX - serviceX,
          seat.anchorY - serviceY
        );

        let score = Math.random() * 12;

        switch (student.seatPreference) {
          case "solo":
            score += tableLoad === 0 ? 90 : Math.max(0, 16 - tableLoad * 5);
            score += distanceFromCounter * 0.04;
            break;

          case "social":
            score += tableLoad > 0 && tableLoad < 4 ? 82 - Math.abs(2 - tableLoad) * 8 : 8;
            break;

          case "far":
            score += distanceFromCounter * 0.11;
            score += tableLoad === 0 ? 20 : 4;
            break;

          case "random":
          default:
            score += Math.random() * 50;
            score += tableLoad === 0 ? 10 : 0;
            break;
        }

        return { seat, score };
      })
      .sort((a, b) => b.score - a.score);
  }

  findAvailableSeat(student, playerOccupiedSeatId = null) {
    return this.scoreAvailableSeats(student, playerOccupiedSeatId)[0]?.seat || null;
  }

  occupySeat(seatId, studentId) {
    const owner = this.npcSeatAssignments.get(seatId);

    if (owner && owner !== studentId) {
      return false;
    }

    this.npcSeatAssignments.set(seatId, studentId);
    return true;
  }

  releaseSeat(seatId, studentId) {
    if (!seatId) return;

    const owner = this.npcSeatAssignments.get(seatId);
    if (owner === studentId) {
      this.npcSeatAssignments.delete(seatId);
    }
  }

  clearStudentSeat(student) {
    if (!student.seatId) return;

    this.releaseSeat(student.seatId, student.id);
    student.seatId = null;
    student.seatedSeatId = null;
    student.seatLabel = null;
  }

  releaseServiceLock(student) {
    if (student?.scenario?.stallId) {
      const activeServiceId = this.activeServiceByStall.get(student.scenario.stallId);

      if (activeServiceId === student.id) {
        this.activeServiceByStall.delete(student.scenario.stallId);
      }
    }

    student.beingServed = false;
    student.serviceTimer = 0;
  }

  clearStudentQueueAssignment(student) {
    this.queueSystem.leaveAssignedQueue(student.id);
    this.releaseServiceLock(student);
    student.lastQueueIndex = null;
    student.queueStuckTime = 0;
  }

  releaseTraySlot(student) {
    if (!student.traySlotId) return;

    const owner = this.traySlotAssignments.get(student.traySlotId);
    if (owner === student.id) {
      this.traySlotAssignments.delete(student.traySlotId);
    }

    student.traySlotId = null;
  }

  claimTraySlot(student, excludedSlotIds = []) {
    const excluded = new Set(excludedSlotIds);

    if (
      student.traySlotId &&
      !excluded.has(student.traySlotId) &&
      this.traySlotAssignments.get(student.traySlotId) === student.id
    ) {
      return this.getTraySlotById(student.traySlotId);
    }

    this.releaseTraySlot(student);

    for (const slot of TRAY_DROP_SLOTS) {
      if (excluded.has(slot.id)) continue;

      const owner = this.traySlotAssignments.get(slot.id);
      if (owner && owner !== student.id) continue;

      this.traySlotAssignments.set(slot.id, student.id);
      student.traySlotId = slot.id;
      return slot;
    }

    return null;
  }

  enqueueTrayForStudent(student, traySlot = null) {
    if (!student.hasMeal) return;

    const fallbackSlot = TRAY_DROP_SLOTS[1] || TRAY_DROP_SLOTS[0];

    this.traySystem.enqueueTray({
      dishName: student.scenario.recipeKey,
      startX: traySlot?.x ?? fallbackSlot?.x ?? TRAY_DROP_ANCHOR.x,
      startY: traySlot?.y ?? fallbackSlot?.y ?? TRAY_DROP_ANCHOR.y
    });
  }

  removeStudentSafely(
    student,
    {
      enqueueTray = false,
      releaseQueue = true,
      releaseSeat = true,
      releaseTraySlot = true
    } = {}
  ) {
    const traySlot = student.traySlotId ? this.getTraySlotById(student.traySlotId) : null;

    if (enqueueTray && student.hasMeal) {
      this.enqueueTrayForStudent(student, traySlot);
      student.hasMeal = false;
      student.currentMeal = null;
    }

    if (releaseQueue) {
      this.clearStudentQueueAssignment(student);
    } else {
      this.releaseServiceLock(student);
    }

    if (releaseSeat) {
      this.clearStudentSeat(student);
    }

    if (releaseTraySlot) {
      this.releaseTraySlot(student);
    }

    student.pendingSeat = false;
    student.route = [];
    student.routeIndex = 0;
    student.remove = true;
  }

  exitStudent(
    student,
    {
      enqueueTray = false,
      releaseQueue = false,
      releaseSeat = false,
      releaseTraySlot = false
    } = {}
  ) {
    const traySlot = student.traySlotId ? this.getTraySlotById(student.traySlotId) : null;

    if (enqueueTray && student.hasMeal) {
      this.enqueueTrayForStudent(student, traySlot);
      student.hasMeal = false;
      student.currentMeal = null;
    }

    if (releaseQueue) {
      this.clearStudentQueueAssignment(student);
    } else {
      this.releaseServiceLock(student);
    }

    if (releaseSeat) {
      this.clearStudentSeat(student);
    }

    if (releaseTraySlot) {
      this.releaseTraySlot(student);
    }

    student.pendingSeat = false;

    const exitTarget = this.getExitTarget(student);
    const exitRoute = this.buildRouteForStudent(student, exitTarget.x, exitTarget.y);

    if (!exitRoute) {
      this.removeStudentSafely(student, {
        enqueueTray: false,
        releaseQueue: false,
        releaseSeat: false,
        releaseTraySlot: false
      });
      return false;
    }

    this.setRoute(student, exitRoute);
    this.setStudentState(student, "DONE");
    return true;
  }

  operationalMetricsSafeToBurst() {
    const activeStudents = this.students.filter((student) => !student.remove).length;
    return activeStudents <= Math.floor(this.maxStudents * 0.7);
  }

  hasRouteTarget(student, x, y) {
    const last = Array.isArray(student.route)
      ? student.route[student.route.length - 1]
      : null;

    if (!last) return false;

    return Math.abs(last.x - x) < 1 && Math.abs(last.y - y) < 1;
  }

  anchorToActorTopLeft(anchorX, anchorY, size) {
    return {
      x: Math.round(anchorX - size / 2),
      y: Math.round(anchorY - size / 2)
    };
  }

  getRoutingWaypoints(student) {
    return DINING_NAV_POINTS.map((point) => ({
      id: point.id,
      ...this.anchorToActorTopLeft(point.x, point.y, student.size)
    }));
  }

  buildRouteForStudent(student, targetX, targetY) {
    const route = routePath(student.x, student.y, targetX, targetY, STATIC_OBSTACLES, {
      entitySize: student.size,
      candidateWaypoints: this.getRoutingWaypoints(student)
    });

    return Array.isArray(route) && route.length > 0 ? route : null;
  }

  getQueueTarget(student, slot) {
    return this.anchorToActorTopLeft(slot.anchorX, slot.anchorY, student.size);
  }

  getServiceTarget(student, servicePoint) {
    return this.anchorToActorTopLeft(
      servicePoint.anchorX ?? servicePoint.x,
      servicePoint.anchorY ?? servicePoint.y,
      student.size
    );
  }

  getSeatTarget(student, seat) {
    return {
      x: seat.actorX,
      y: seat.actorY
    };
  }

  getTraySlotTarget(student, slot) {
    return this.anchorToActorTopLeft(slot.x, slot.y, student.size);
  }

  getTrayDropTarget(student) {
    return this.anchorToActorTopLeft(
      TRAY_DROP_ANCHOR.x,
      TRAY_DROP_ANCHOR.y,
      student.size
    );
  }

  getExitTarget(student) {
    return this.anchorToActorTopLeft(
      TRAY_EXIT_ANCHOR.x,
      TRAY_EXIT_ANCHOR.y,
      student.size
    );
  }

  setStudentState(student, state) {
    student.state = state;
    student.stateTimer = 0;
  }

  setRoute(student, waypoints = null) {
    student.route = Array.isArray(waypoints) ? waypoints.slice() : [];
    student.routeIndex = 0;
  }

  buildRoute(fromX, fromY, toX, toY) {
    return routePath(fromX, fromY, toX, toY, STATIC_OBSTACLES, {
      entitySize: 18,
      candidateWaypoints: []
    });
  }

  moveToward(student, targetX, targetY, deltaTime) {
    const dx = targetX - student.x;
    const dy = targetY - student.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 1.2) {
      student.x = targetX;
      student.y = targetY;
      return true;
    }

    const moveDistance = student.speed * deltaTime;
    const ratio = Math.min(1, moveDistance / distance);

    const resolved = resolveMovement(
      {
        x: student.x,
        y: student.y,
        w: student.size,
        h: student.size
      },
      dx * ratio,
      dy * ratio,
      STATIC_OBSTACLES,
      {
        minX: 0,
        minY: 40,
        maxX: CANVAS_W,
        maxY: CANVAS_H
      }
    );

    student.x = resolved.x;
    student.y = resolved.y;

    return Math.hypot(targetX - student.x, targetY - student.y) < 1.2;
  }

  followRoute(student, deltaTime) {
    if (!student.route || student.route.length === 0) {
      return false;
    }

    const waypoint = student.route[student.routeIndex];
    if (!waypoint) {
      return true;
    }

    const arrived = this.moveToward(student, waypoint.x, waypoint.y, deltaTime);

    if (!arrived) {
      return false;
    }

    student.routeIndex += 1;
    return student.routeIndex >= student.route.length;
  }

  sendStudentToQueue(student) {
    const slot = this.queueSystem.joinQueue(student.scenario.stallId, student.id);

    if (!slot) {
      this.controller.recordAbandonedTransaction?.();
      this.exitStudent(student);
      return;
    }

    const slotTarget = this.getQueueTarget(student, slot);

    if (isBlocked(slotTarget.x, slotTarget.y, student.size)) {
      this.controller.recordAbandonedTransaction?.();
      this.clearStudentQueueAssignment(student);
      this.exitStudent(student);
      return;
    }

    const route = this.buildRouteForStudent(student, slotTarget.x, slotTarget.y);

    if (!route) {
      this.controller.recordAbandonedTransaction?.();
      this.clearStudentQueueAssignment(student);
      this.exitStudent(student);
      return;
    }

    student.lastQueueIndex = slot.index;
    student.queueStuckTime = 0;
    student.serviceTimer = 0;
    student.pendingSeat = false;
    this.setRoute(student, route);
    this.setStudentState(student, "MOVING_TO_QUEUE");
  }

  assignSeatToStudent(student, seat) {
    if (!seat) return false;

    if (this.getOccupiedSeatIds(this.currentPlayerOccupiedSeatId).has(seat.id)) {
      return false;
    }

    const seatTarget = this.getSeatTarget(student, seat);

    if (isBlocked(seatTarget.x, seatTarget.y, student.size)) {
      return false;
    }

    const route = this.buildRouteForStudent(student, seatTarget.x, seatTarget.y);

    if (!route) {
      return false;
    }

    if (!this.occupySeat(seat.id, student.id)) {
      return false;
    }

    student.seatId = seat.id;
    student.seatedSeatId = seat.id;
    student.seatLabel = seat.label;
    student.pendingSeat = false;
    student.seatedTimer = 0;

    this.setRoute(student, route);
    this.setStudentState(student, "MOVING_TO_SEAT");
    return true;
  }

  tryAssignSeat(student, playerOccupiedSeatId = null) {
    const scoredSeats = this.scoreAvailableSeats(student, playerOccupiedSeatId);

    for (const { seat } of scoredSeats) {
      if (this.assignSeatToStudent(student, seat)) {
        return true;
      }
    }

    return false;
  }

  prepareTrayRoute(student, excludedSlotIds = []) {
    const excluded = new Set(excludedSlotIds);

    while (excluded.size < TRAY_DROP_SLOTS.length) {
      const slot = this.claimTraySlot(student, Array.from(excluded));
      if (!slot) {
        return false;
      }

      const trayTarget = this.getTraySlotTarget(student, slot);
      const route = this.buildRouteForStudent(student, trayTarget.x, trayTarget.y);

      if (route) {
        this.setRoute(student, route);
        return true;
      }

      excluded.add(slot.id);
      this.releaseTraySlot(student);
    }

    return false;
  }

  startTrayPhase(student) {
    this.clearStudentSeat(student);
    this.releaseTraySlot(student);
    student.pendingSeat = false;

    if (!student.hasMeal) {
      this.exitStudent(student);
      return false;
    }

    this.setStudentState(student, "MOVING_TO_TRAY");

    if (this.prepareTrayRoute(student)) {
      return true;
    }

    this.exitStudent(student, {
      enqueueTray: true,
      releaseTraySlot: true
    });
    return false;
  }

  completeService(student) {
    const stallId = student.scenario.stallId;

    this.releaseServiceLock(student);

    const serviceResolution = this.controller.resolveNpcServiceAttempt
      ? this.controller.resolveNpcServiceAttempt(student.scenario)
      : {
          ok: true,
          action: "serve",
          scenario: student.scenario
        };

    if (!serviceResolution.ok) {
      this.clearStudentQueueAssignment(student);
      this.exitStudent(student);
      return;
    }

    if (serviceResolution.action === "reroute") {
      this.queueSystem.leaveQueue(stallId, student.id);
      student.scenario = serviceResolution.scenario;
      this.applyTimingProfile(student, student.scenario.stallId);
      this.sendStudentToQueue(student);
      return;
    }

    student.scenario = serviceResolution.scenario;

    const transaction = this.controller.processTransaction({
      ...student.scenario,
      source: "auto_queue"
    });

    this.queueSystem.leaveQueue(stallId, student.id);

    if (!transaction) {
      this.exitStudent(student);
      return;
    }

    student.currentMeal = transaction.dishName;
    student.hasMeal = true;

    if (this.tryAssignSeat(student, this.currentPlayerOccupiedSeatId)) {
      return;
    }

    this.startTrayPhase(student);
  }

  spawnStudent() {
    if (this.students.length >= this.maxStudents) return;

    const scenario = this.controller.createRandomTransactionScenario();
    const identity = this.createStudentIdentityPayload();

    const student = {
      id: `sim_student_${this.nextStudentId++}`,
      x: 34 + Math.random() * 20,
      y: 268 + Math.random() * 26,
      size: 18,
      speed: 88 + Math.random() * 16,
      state: "IDLE",
      stateTimer: 0,
      remove: false,
      displayName: identity.displayName,
      originType: identity.originType,
      color: identity.color,
      scenario: {
        ...scenario,
        studentDisplayName: identity.displayName
      },
      seatId: null,
      seatedSeatId: null,
      seatLabel: null,
      traySlotId: null,
      seatPreference: this.pickSeatPreference(),
      route: [],
      routeIndex: 0,
      queueStuckTime: 0,
      lastQueueIndex: null,
      serviceTimer: 0,
      serviceDuration: 1.2,
      patienceDuration: 9,
      abandonmentDuration: 15,
      eatDuration: 7 + Math.random() * 9,
      seatedTimer: 0,
      beingServed: false,
      pendingSeat: false,
      currentMeal: null,
      hasMeal: false
    };

    this.applyTimingProfile(student, scenario.stallId);
    this.students.push(student);
    this.sendStudentToQueue(student);
  }

  getQueueBreakdown() {
    return this.queueSystem.getQueueSnapshot();
  }

  updateQueueState(student, deltaTime) {
    const assignment = this.queueSystem.getAssignment(student.id);

    if (!assignment) {
      this.exitStudent(student);
      return;
    }

    if (student.lastQueueIndex !== assignment.index) {
      student.lastQueueIndex = assignment.index;
      student.queueStuckTime = 0;
    } else if (!student.beingServed) {
      student.queueStuckTime += deltaTime;
    }

    if (student.queueStuckTime >= 12 && !student.beingServed) {
      this.controller.recordAbandonedTransaction?.();
      this.clearStudentQueueAssignment(student);
      this.exitStudent(student);
      return;
    }

    if (assignment.index === 0) {
      const servicePoint = this.queueSystem.getServicePoint(assignment.stallId);
      const serviceTarget = this.getServiceTarget(student, servicePoint);
      const activeServiceId = this.activeServiceByStall.get(assignment.stallId);

      if (!activeServiceId || activeServiceId === student.id) {
        this.activeServiceByStall.set(assignment.stallId, student.id);
        student.beingServed = true;

        if (!this.hasRouteTarget(student, serviceTarget.x, serviceTarget.y)) {
          const route = this.buildRouteForStudent(student, serviceTarget.x, serviceTarget.y);

          if (!route) {
            this.clearStudentQueueAssignment(student);
            this.exitStudent(student);
            return;
          }

          this.setRoute(student, route);
        }

        const arrived = this.followRoute(student, deltaTime);

        if (arrived) {
          student.serviceTimer += deltaTime;

          if (student.serviceTimer >= student.serviceDuration) {
            this.completeService(student);
          }
        }

        return;
      }
    }

    student.beingServed = false;

    const slot = this.queueSystem.getAssignedSlot(student.id);
    if (!slot) {
      this.exitStudent(student);
      return;
    }

    const slotTarget = this.getQueueTarget(student, slot);

    if (!this.hasRouteTarget(student, slotTarget.x, slotTarget.y)) {
      const route = this.buildRouteForStudent(student, slotTarget.x, slotTarget.y);

      if (!route) {
        this.clearStudentQueueAssignment(student);
        this.exitStudent(student);
        return;
      }

      this.setRoute(student, route);
    }

    this.followRoute(student, deltaTime);
  }

  update(deltaTime, { playerOccupiedSeatId = null } = {}) {
    this.currentPlayerOccupiedSeatId = playerOccupiedSeatId;
    this.syncRuntimeDemandProfile();

    this.spawnTimer += deltaTime;

    if (this.spawnTimer >= this.nextSpawnInterval) {
      this.spawnTimer = 0;
      this.spawnStudent();

      if (
        Math.random() < this.burstChance &&
        this.students.length < this.maxStudents &&
        this.operationalMetricsSafeToBurst()
      ) {
        this.spawnStudent();
      }

      this.nextSpawnInterval = this.rollSpawnInterval();
    }

    this.students.forEach((student) => {
      student.stateTimer = (student.stateTimer || 0) + deltaTime;

      if (student.state === "MOVING_TO_QUEUE") {
        if (student.stateTimer > STATE_TIMEOUTS.MOVING_TO_QUEUE) {
          this.controller.recordAbandonedTransaction?.();
          this.clearStudentQueueAssignment(student);
          this.exitStudent(student);
          return;
        }

        const slot = this.queueSystem.getAssignedSlot(student.id);

        if (!slot) {
          this.exitStudent(student);
          return;
        }

        const slotTarget = this.getQueueTarget(student, slot);

        if (!this.hasRouteTarget(student, slotTarget.x, slotTarget.y)) {
          const route = this.buildRouteForStudent(student, slotTarget.x, slotTarget.y);

          if (!route) {
            this.controller.recordAbandonedTransaction?.();
            this.clearStudentQueueAssignment(student);
            this.exitStudent(student);
            return;
          }

          this.setRoute(student, route);
        }

        const arrived = this.followRoute(student, deltaTime);

        if (arrived) {
          this.setStudentState(student, "IN_QUEUE");
        }

        return;
      }

      if (student.state === "IN_QUEUE") {
        this.updateQueueState(student, deltaTime);
        return;
      }

      if (student.state === "MOVING_TO_SEAT") {
        if (student.stateTimer > STATE_TIMEOUTS.MOVING_TO_SEAT) {
          this.startTrayPhase(student);
          return;
        }

        if (!student.seatId) {
          if (!this.tryAssignSeat(student, playerOccupiedSeatId)) {
            this.startTrayPhase(student);
          }
          return;
        }

        const seat = this.getSeatById(student.seatId);
        if (!seat) {
          this.clearStudentSeat(student);
          this.startTrayPhase(student);
          return;
        }

        const seatTarget = this.getSeatTarget(student, seat);

        if (!this.hasRouteTarget(student, seatTarget.x, seatTarget.y)) {
          const route = this.buildRouteForStudent(student, seatTarget.x, seatTarget.y);

          if (!route) {
            this.clearStudentSeat(student);
            this.startTrayPhase(student);
            return;
          }

          this.setRoute(student, route);
        }

        const arrived = this.followRoute(student, deltaTime);

        if (arrived) {
          student.x = seat.actorX;
          student.y = seat.actorY;
          student.seatedTimer = 0;
          this.setStudentState(student, "SEATED");
        }

        return;
      }

      if (student.state === "SEATED") {
        student.seatedTimer += deltaTime;

        if (student.seatedTimer >= student.eatDuration) {
          this.startTrayPhase(student);
        }

        return;
      }

      if (student.state === "MOVING_TO_TRAY") {
        if (student.stateTimer > STATE_TIMEOUTS.MOVING_TO_TRAY) {
          this.exitStudent(student, {
            enqueueTray: true,
            releaseTraySlot: true
          });
          return;
        }

        const traySlot = student.traySlotId ? this.getTraySlotById(student.traySlotId) : null;

        if (!traySlot) {
          if (!this.prepareTrayRoute(student)) {
            this.exitStudent(student, {
              enqueueTray: true,
              releaseTraySlot: true
            });
          }
          return;
        }

        const trayTarget = this.getTraySlotTarget(student, traySlot);

        if (!this.hasRouteTarget(student, trayTarget.x, trayTarget.y)) {
          const route = this.buildRouteForStudent(student, trayTarget.x, trayTarget.y);

          if (!route) {
            const failedSlotId = traySlot.id;
            this.releaseTraySlot(student);

            if (!this.prepareTrayRoute(student, [failedSlotId])) {
              this.exitStudent(student, {
                enqueueTray: true,
                releaseTraySlot: true
              });
            }

            return;
          }

          this.setRoute(student, route);
        }

        const arrived = this.followRoute(student, deltaTime);

        if (arrived) {
          this.enqueueTrayForStudent(student, traySlot);
          student.hasMeal = false;
          student.currentMeal = null;
          this.releaseTraySlot(student);
          this.exitStudent(student);
        }

        return;
      }

      if (student.state === "DONE") {
        if (!student.route || student.route.length === 0 || student.stateTimer > STATE_TIMEOUTS.DONE) {
          this.removeStudentSafely(student, {
            releaseQueue: false,
            releaseSeat: false,
            releaseTraySlot: true
          });
          return;
        }

        const exited = this.followRoute(student, deltaTime);

        if (exited) {
          this.removeStudentSafely(student, {
            releaseQueue: false,
            releaseSeat: false,
            releaseTraySlot: true
          });
        }

        return;
      }

      if (student.state === "IDLE") {
        this.sendStudentToQueue(student);
        return;
      }

      this.removeStudentSafely(student, {
        enqueueTray: student.hasMeal,
        releaseQueue: true,
        releaseSeat: true,
        releaseTraySlot: true
      });
    });

    this.students = this.students.filter((student) => !student.remove);
    this.traySystem.update(deltaTime);

    const queueBreakdown = this.getQueueBreakdown();
    const liveQueueLength = Object.values(queueBreakdown).reduce((sum, value) => sum + value, 0);
    const seatedStudentCount = this.students.filter((student) => student.state === "SEATED").length;
    const occupiedDiningSeats = this.getOccupiedSeatIds(playerOccupiedSeatId).size;

    this.controller.updateOperationalMetrics(liveQueueLength, queueBreakdown);
    this.controller.updateDiningMetrics({
      occupiedDiningSeats,
      totalDiningSeats: this.allSeats.length,
      seatedStudentCount,
      trayReturnCount: this.traySystem.getActiveTrayCount(),
      washedTrayCount: this.traySystem.getCompletedWashCount()
    });
  }

  getRenderableStudents() {
    return this.students.map((student) => {
      const logicState = student.state;
      let renderState = "queueing";

      if (logicState === "IN_QUEUE" && student.beingServed) {
        renderState = "paying";
      } else if (logicState === "MOVING_TO_SEAT" || logicState === "MOVING_TO_TRAY") {
        renderState = "moving_to_seat";
      } else if (logicState === "SEATED") {
        renderState = "eating";
      }

      return {
        ...student,
        state: renderState,
        logicState
      };
    });
  }

  draw() {
    // rendering moved elsewhere on purpose
  }
}
