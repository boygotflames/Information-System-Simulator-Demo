import { generateStudentIdentity } from "../data/namePools.js";
import * as CanteenLayout from "../data/canteenLayout.js";
import {
  ALL_DINING_SEATS,
  DINING_NAV_POINTS,
  TRAY_DROP_ANCHOR
} from "../data/diningAreaLayout.js";
import {
  CANVAS_W,
  CANVAS_H,
  EXIT_POINT
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
          abandonmentDuration: 15,
          rerouteCheckInterval: 1.6,
          rerouteMinAdvantage: 2,
          maxReroutes: 1,
          abandonAtGlobalQueue: 9
        };

    student.serviceDuration = timingProfile.serviceDuration;
    student.patienceDuration = timingProfile.patienceDuration;
    student.abandonmentDuration = timingProfile.abandonmentDuration;
  }

  getSeatById(seatId) {
    return this.allSeats.find((seat) => seat.id === seatId) || null;
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

  findAvailableSeat(student, playerOccupiedSeatId = null) {
    const availableSeats = this.getAvailableSeats(playerOccupiedSeatId);
    if (availableSeats.length === 0) return null;

    const tableOccupancy = this.getTableOccupancyMap(playerOccupiedSeatId);
    const servicePoint = this.queueSystem.getServicePoint(student.scenario.stallId);
    const serviceX = servicePoint?.anchorX ?? servicePoint?.x ?? 0;
    const serviceY = servicePoint?.anchorY ?? servicePoint?.y ?? 0;

    const scoredSeats = availableSeats.map((seat) => {
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
    });

    scoredSeats.sort((a, b) => b.score - a.score);
    return scoredSeats[0]?.seat || null;
  }

  occupySeat(seatId, studentId) {
    this.npcSeatAssignments.set(seatId, studentId);
  }

  releaseSeat(seatId, studentId) {
    if (!seatId) return;

    const owner = this.npcSeatAssignments.get(seatId);
    if (owner === studentId) {
      this.npcSeatAssignments.delete(seatId);
    }
  }

  operationalMetricsSafeToBurst() {
    const activeStudents = this.students.filter((student) => !student.remove).length;
    return activeStudents <= Math.floor(this.maxStudents * 0.7);
  }

  hasRouteTarget(student, x, y) {
    const last = student.route[student.route.length - 1];
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
    return routePath(student.x, student.y, targetX, targetY, STATIC_OBSTACLES, {
      entitySize: student.size,
      candidateWaypoints: this.getRoutingWaypoints(student)
    });
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
    return this.anchorToActorTopLeft(seat.anchorX, seat.anchorY, student.size);
  }

  getTrayDropTarget(student) {
    return this.anchorToActorTopLeft(
      TRAY_DROP_ANCHOR.x,
      TRAY_DROP_ANCHOR.y,
      student.size
    );
  }

  getExitTarget(student) {
    return this.anchorToActorTopLeft(EXIT_POINT.x, EXIT_POINT.y, student.size);
  }

  setRoute(student, waypoints = []) {
    student.route = waypoints.slice();
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
      return true;
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

  routeStudentToExit(student) {
    const exitTarget = this.getExitTarget(student);

    this.setRoute(
      student,
      this.buildRouteForStudent(student, exitTarget.x, exitTarget.y)
    );

    student.state = "DONE";
  }

  sendStudentToQueue(student) {
    const slot = this.queueSystem.joinQueue(student.scenario.stallId, student.id);

    if (!slot) {
      this.controller.recordAbandonedTransaction?.();
      this.routeStudentToExit(student);
      return;
    }

    const slotTarget = this.getQueueTarget(student, slot);

    if (isBlocked(slotTarget.x, slotTarget.y, student.size)) {
      this.controller.recordAbandonedTransaction?.();
      this.queueSystem.leaveQueue(student.scenario.stallId, student.id);
      this.routeStudentToExit(student);
      return;
    }

    student.state = "MOVING_TO_QUEUE";
    student.queueStuckTime = 0;
    student.lastQueueIndex = slot.index;
    student.serviceTimer = 0;
    student.beingServed = false;

    if (!this.hasRouteTarget(student, slotTarget.x, slotTarget.y)) {
      this.setRoute(
        student,
        this.buildRouteForStudent(student, slotTarget.x, slotTarget.y)
      );
    }
  }

  assignSeatToStudent(student, seat) {
    this.occupySeat(seat.id, student.id);
    const seatTarget = this.getSeatTarget(student, seat);

    student.seatId = seat.id;
    student.seatedSeatId = seat.id;
    student.seatLabel = seat.label;
    student.pendingSeat = false;
    student.state = "MOVING_TO_SEAT";

    this.setRoute(
      student,
      this.buildRouteForStudent(student, seatTarget.x, seatTarget.y)
    );
  }

  completeService(student) {
    const stallId = student.scenario.stallId;

    this.activeServiceByStall.delete(stallId);
    student.beingServed = false;
    student.serviceTimer = 0;

    const serviceResolution = this.controller.resolveNpcServiceAttempt
      ? this.controller.resolveNpcServiceAttempt(student.scenario)
      : {
          ok: true,
          action: "serve",
          scenario: student.scenario
        };

    if (!serviceResolution.ok) {
      this.queueSystem.leaveQueue(stallId, student.id);
      this.routeStudentToExit(student);
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
      this.routeStudentToExit(student);
      return;
    }

    student.currentMeal = transaction.dishName;
    student.hasMeal = true;

    const seat = this.findAvailableSeat(student, this.currentPlayerOccupiedSeatId);

    if (seat) {
      this.assignSeatToStudent(student, seat);
      return;
    }

    student.pendingSeat = true;
    student.state = "MOVING_TO_SEAT";
    student.route = [];
    student.routeIndex = 0;
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
      this.routeStudentToExit(student);
      return;
    }

    if (student.lastQueueIndex !== assignment.index) {
      student.lastQueueIndex = assignment.index;
      student.queueStuckTime = 0;
    } else {
      student.queueStuckTime += deltaTime;
    }

    if (student.queueStuckTime >= 12 && !student.beingServed) {
      this.controller.recordAbandonedTransaction?.();
      this.queueSystem.leaveQueue(assignment.stallId, student.id);
      this.routeStudentToExit(student);
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
          this.setRoute(
            student,
            this.buildRouteForStudent(student, serviceTarget.x, serviceTarget.y)
          );
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

    const slot = this.queueSystem.getAssignedSlot(student.id);
    if (!slot) {
      this.routeStudentToExit(student);
      return;
    }

    const slotTarget = this.getQueueTarget(student, slot);

    if (!this.hasRouteTarget(student, slotTarget.x, slotTarget.y)) {
      this.setRoute(
        student,
        this.buildRouteForStudent(student, slotTarget.x, slotTarget.y)
      );
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
      if (student.state === "MOVING_TO_QUEUE") {
        const slot = this.queueSystem.getAssignedSlot(student.id);

        if (!slot) {
          this.routeStudentToExit(student);
          return;
        }

        const slotTarget = this.getQueueTarget(student, slot);

        if (!this.hasRouteTarget(student, slotTarget.x, slotTarget.y)) {
          this.setRoute(
            student,
            this.buildRouteForStudent(student, slotTarget.x, slotTarget.y)
          );
        }

        const arrived = this.followRoute(student, deltaTime);

        if (arrived) {
          student.state = "IN_QUEUE";
        }

        return;
      }

      if (student.state === "IN_QUEUE") {
        this.updateQueueState(student, deltaTime);
        return;
      }

      if (student.state === "MOVING_TO_SEAT") {
        if (!student.seatId) {
          const seat = this.findAvailableSeat(student, playerOccupiedSeatId);

          if (!seat) {
            return;
          }

          this.assignSeatToStudent(student, seat);
        }

        const seat = this.getSeatById(student.seatId);
        if (!seat) {
          student.seatId = null;
          student.seatedSeatId = null;
          return;
        }

        const seatTarget = this.getSeatTarget(student, seat);

        if (!this.hasRouteTarget(student, seatTarget.x, seatTarget.y)) {
          this.setRoute(
            student,
            this.buildRouteForStudent(student, seatTarget.x, seatTarget.y)
          );
        }

        const arrived = this.followRoute(student, deltaTime);

        if (arrived) {
          student.x = seatTarget.x;
          student.y = seatTarget.y;
          student.state = "SEATED";
          student.seatedTimer = 0;
        }

        return;
      }

      if (student.state === "SEATED") {
        student.seatedTimer += deltaTime;

        if (student.seatedTimer >= student.eatDuration) {
          const trayTarget = this.getTrayDropTarget(student);

          this.releaseSeat(student.seatId, student.id);

          student.seatId = null;
          student.seatedSeatId = null;
          student.seatLabel = null;

          this.setRoute(
            student,
            this.buildRouteForStudent(student, trayTarget.x, trayTarget.y)
          );

          student.state = "MOVING_TO_TRAY";
        }

        return;
      }

      if (student.state === "MOVING_TO_TRAY") {
        const arrived = this.followRoute(student, deltaTime);

        if (arrived) {
          this.traySystem.enqueueTray({
            dishName: student.scenario.recipeKey
          });

          student.hasMeal = false;
          student.currentMeal = null;
          this.routeStudentToExit(student);
        }

        return;
      }

      if (student.state === "DONE") {
        const exited = this.followRoute(student, deltaTime);

        if (exited) {
          student.remove = true;
        }
      }
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
      let renderState = "queueing";

      if (student.state === "IN_QUEUE" && student.beingServed) {
        renderState = "paying";
      } else if (student.state === "MOVING_TO_SEAT") {
        renderState = "moving_to_seat";
      } else if (student.state === "SEATED") {
        renderState = "eating";
      } else if (student.state === "MOVING_TO_TRAY") {
        renderState = "moving_to_seat";
      }

      return {
        ...student,
        state: renderState,
        seatedSeatId: student.seatedSeatId
      };
    });
  }

  draw() {
    // rendering moved elsewhere on purpose
  }
}
