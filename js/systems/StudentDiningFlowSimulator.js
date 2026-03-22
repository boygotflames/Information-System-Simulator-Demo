import { generateStudentIdentity } from "../data/namePools.js";
import * as CanteenLayout from "../data/canteenLayout.js";
import {
  ALL_DINING_SEATS
} from "../data/diningAreaLayout.js";
import NpcPathRouter from "./NpcPathRouter.js";

export default class StudentDiningFlowSimulator {
  constructor(controller, traySystem) {
    this.controller = controller;
    this.traySystem = traySystem;
    this.pathRouter = new NpcPathRouter();

    this.students = [];
    this.nextStudentId = 1;

    this.spawnTimer = 0;
    this.spawnIntervalMin = 2.6;
    this.spawnIntervalMax = 4.1;
    this.nextSpawnInterval = this.rollSpawnInterval();
    this.burstChance = 0.16;
    this.maxStudents = 14;

    this.servicePoints = CanteenLayout.SERVICE_POINT_LIST || Object.values(CanteenLayout.SERVICE_POINTS || {});
    this.servicePointMap = Object.fromEntries(
      this.servicePoints.map((point) => [point.id, point])
    );

    this.exitX = 950;
    this.exitY = 520;

    this.allSeats = ALL_DINING_SEATS;
    this.npcSeatAssignments = new Map();

    // Seed a small opening crowd so the simulation doesn't look broken on first load.
    this.spawnStudent();
    this.spawnStudent();
  }

  moveToward(student, targetX, targetY, deltaTime) {
    const dx = targetX - student.x;
    const dy = targetY - student.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 0.75) {
      student.x = targetX;
      student.y = targetY;
      return true;
    }

    const moveDistance = student.speed * deltaTime;
    const ratio = Math.min(1, moveDistance / distance);

    student.x += dx * ratio;
    student.y += dy * ratio;

    return false;
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

  setRoute(student, route) {
    student.route = route;
    student.routeIndex = 0;
  }

  getSeatById(seatId) {
    return this.allSeats.find((seat) => seat.id === seatId) || null;
  }

  getServicePointForStall(stallId) {
    return (CanteenLayout.getServicePointByStallId
      ? CanteenLayout.getServicePointByStallId(stallId)
      : this.servicePoints.find((point) => point.stallId === stallId)) || this.servicePoints[0];
  }

  getServicePointForStudent(student) {
    return (CanteenLayout.getServicePointById
      ? CanteenLayout.getServicePointById(student.servicePointId)
      : this.servicePoints.find((point) => point.id === student.servicePointId)) || this.servicePoints[0];
  }

  getQueueTargetForStudent(student, queueIndex) {
    const servicePoint = this.getServicePointForStudent(student);

    return {
      x: servicePoint.queueFrontX - queueIndex * servicePoint.queueSpacing,
      y: servicePoint.queueY + student.queueOffsetY
    };
  }

  getHoldingTargetForServicePoint(servicePoint) {
    return {
      x: servicePoint.holdingX + (Math.random() * 28 - 14),
      y: servicePoint.holdingY + (Math.random() * 28 - 14)
    };
  }

  getQueueBreakdown() {
    const counts = {
      ramen_stall: 0,
      dry_noodle_stall: 0,
      soup_station: 0
    };

    this.students.forEach((student) => {
      if (
        student.state === "queueing" ||
        student.state === "moving_to_counter" ||
        student.state === "paying" ||
        student.state === "waiting_for_seat"
      ) {
        counts[student.scenario.stallId] = (counts[student.scenario.stallId] || 0) + 1;
      }
    });

    return counts;
  }

  rollSpawnInterval() {
    return this.spawnIntervalMin + Math.random() * (this.spawnIntervalMax - this.spawnIntervalMin);
  }

  pickSeatPreference() {
    const roll = Math.random();

    if (roll < 0.36) return "solo";
    if (roll < 0.60) return "social";
    if (roll < 0.82) return "far";
    return "random";
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

  getAvailableSeats(playerOccupiedSeatId = null) {
    const blocked = this.getOccupiedSeatIds(playerOccupiedSeatId);
    return this.allSeats.filter((seat) => !blocked.has(seat.id));
  }

  findAvailableSeat(student, playerOccupiedSeatId = null) {
    const availableSeats = this.getAvailableSeats(playerOccupiedSeatId);
    if (availableSeats.length === 0) return null;

    const tableOccupancy = this.getTableOccupancyMap(playerOccupiedSeatId);
    const servicePoint = this.getServicePointForStudent(student);

    const scoredSeats = availableSeats.map((seat) => {
      const tableLoad = tableOccupancy.get(seat.tableId) || 0;
      const distanceFromCounter = Math.hypot(seat.actorX - servicePoint.x, seat.actorY - servicePoint.y);
      const randomBias = Math.random() * 18;

      let score = randomBias;

      switch (student?.seatPreference) {
        case "solo":
          score += tableLoad === 0 ? 92 : Math.max(0, 16 - tableLoad * 4);
          score += distanceFromCounter * 0.05;
          break;

        case "social":
          score += tableLoad > 0 && tableLoad < 4 ? 82 - Math.abs(2 - tableLoad) * 8 : 10;
          score += Math.random() * 16;
          break;

        case "far":
          score += distanceFromCounter * 0.12;
          score += tableLoad === 0 ? 22 : 6;
          break;

        case "random":
        default:
          score += Math.random() * 75;
          score += tableLoad === 0 ? 12 : 0;
          break;
      }

      return { seat, score };
    });

    scoredSeats.sort((a, b) => b.score - a.score);

    const candidatePool = scoredSeats.slice(0, Math.min(5, scoredSeats.length));
    const chosen = candidatePool[Math.floor(Math.random() * candidatePool.length)];

    return chosen ? chosen.seat : availableSeats[0];
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

  operationalMetricsSafeToBurst() {
    const activeStudents = this.students.filter((student) => !student.remove).length;
    return activeStudents <= Math.floor(this.maxStudents * 0.7);
  }

  applyTimingProfile(student, stallId, { resetCurrentStallWait = false } = {}) {
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
    student.rerouteCheckInterval = timingProfile.rerouteCheckInterval;
    student.rerouteMinAdvantage = timingProfile.rerouteMinAdvantage;
    student.maxReroutes = timingProfile.maxReroutes;
    student.abandonAtGlobalQueue = timingProfile.abandonAtGlobalQueue;
    student.queueDecisionTimer = 0;

    if (resetCurrentStallWait) {
      student.currentStallWaitTime = 0;
    }
  }

  updateQueuePatience(student, deltaTime) {
    if (student.state !== "queueing") {
      return;
    }

    student.totalQueueTime += deltaTime;
    student.currentStallWaitTime += deltaTime;
    student.queueDecisionTimer += deltaTime;

    if (student.queueDecisionTimer < student.rerouteCheckInterval) {
      return;
    }

    student.queueDecisionTimer = 0;

    const decision = this.controller.resolveNpcQueuePatience
      ? this.controller.resolveNpcQueuePatience({
          stallId: student.scenario.stallId,
          recipeKey: student.scenario.recipeKey,
          totalQueueTime: student.totalQueueTime,
          currentStallWaitTime: student.currentStallWaitTime,
          rerouteCount: student.rerouteCount,
          excludedStallIds: student.excludedStallIds,
          patienceDuration: student.patienceDuration,
          abandonmentDuration: student.abandonmentDuration,
          rerouteMinAdvantage: student.rerouteMinAdvantage,
          maxReroutes: student.maxReroutes,
          abandonAtGlobalQueue: student.abandonAtGlobalQueue
        })
      : { action: "wait" };

    if (!decision || decision.action === "wait") {
      return;
    }

    if (decision.action === "reroute") {
      const previousStallId = student.scenario.stallId;
      const reroutedServicePoint = this.getServicePointForStall(decision.stallId);

      student.scenario = {
        ...student.scenario,
        stallId: decision.stallId,
        recipeKey: decision.recipeKey
      };

      student.servicePointId = reroutedServicePoint.id;
      student.waitingTarget = this.getHoldingTargetForServicePoint(reroutedServicePoint);
      student.queueOffsetY = (Math.floor(Math.random() * 5) - 2) * 6;
      student.rerouteCount += 1;
      student.excludedStallIds = Array.from(
        new Set([...student.excludedStallIds, previousStallId])
      );

      this.applyTimingProfile(student, decision.stallId, {
        resetCurrentStallWait: true
      });

      return;
    }

    if (decision.action === "abandon") {
      this.setRoute(student, this.pathRouter.buildExitPath());
      student.state = "exiting";
    }
  }

  spawnStudent() {
    if (this.students.length >= this.maxStudents) return;

    const scenario = this.controller.createRandomTransactionScenario();
    const identity = generateStudentIdentity();
    const servicePoint = this.getServicePointForStall(scenario.stallId);

    scenario.studentId = identity.studentId;
    scenario.studentDisplayName = identity.displayName;

    const queueOffsetY = (Math.floor(Math.random() * 5) - 2) * 6;

    const student = {
      id: `sim_student_${this.nextStudentId++}`,
      x: 46 + Math.random() * 26,
      y: servicePoint.queueY + 16 + Math.random() * 26,
      size: 18,
      speed: 92 + Math.random() * 18,
      state: "queueing",
      payTimer: 0,
      eatingTimer: 0,
      eatDuration: 7 + Math.random() * 9,
      remove: false,
      hasProcessedTransaction: false,
      scenario,
      displayName: identity.displayName,
      originType: identity.originType,
      servicePointId: servicePoint.id,
      seatId: null,
      seatLabel: null,
      seatPreference: this.pickSeatPreference(),
      queueOffsetY,
      waitingTarget: this.getHoldingTargetForServicePoint(servicePoint),
      route: [],
      routeIndex: 0,
      totalQueueTime: 0,
      currentStallWaitTime: 0,
      queueDecisionTimer: 0,
      rerouteCount: 0,
      excludedStallIds: [],
      serviceDuration: 1.2,
      patienceDuration: 9,
      abandonmentDuration: 15,
      rerouteCheckInterval: 1.6,
      rerouteMinAdvantage: 2,
      maxReroutes: 1,
      abandonAtGlobalQueue: 9,
      color: identity.originType === "domestic_pinyin" ? "#60a5fa" : "#f87171"
    };

    this.applyTimingProfile(student, scenario.stallId, {
      resetCurrentStallWait: true
    });

    this.students.push(student);
  }

  update(deltaTime, { playerOccupiedSeatId = null } = {}) {
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
      this.updateQueuePatience(student, deltaTime);
    });

    this.servicePoints.forEach((servicePoint) => {
      const queueingStudents = this.students.filter(
        (student) =>
          student.state === "queueing" &&
          student.servicePointId === servicePoint.id
      );

      queueingStudents.forEach((student, index) => {
        const target = this.getQueueTargetForStudent(student, index);
        this.moveToward(student, target.x, target.y, deltaTime);
      });

      const activeServiceStudent = this.students.find(
        (student) =>
          student.servicePointId === servicePoint.id &&
          (
            student.state === "moving_to_counter" ||
            student.state === "paying" ||
            student.state === "waiting_for_seat"
          )
      );

      if (!activeServiceStudent && queueingStudents.length > 0) {
        const firstStudent = queueingStudents[0];
        const target = this.getQueueTargetForStudent(firstStudent, 0);

        const readyForService =
          Math.abs(firstStudent.x - target.x) < 3 &&
          Math.abs(firstStudent.y - target.y) < 3;

        if (readyForService) {
          firstStudent.state = "moving_to_counter";
        }
      }
    });

    this.students.forEach((student) => {
      if (student.state === "moving_to_counter") {
        const servicePoint = this.getServicePointForStudent(student);
        const arrived = this.moveToward(student, servicePoint.x, servicePoint.y, deltaTime);

        if (arrived) {
          student.state = "paying";
          student.payTimer = 0;
        }

        return;
      }

      if (student.state === "paying") {
        student.payTimer += deltaTime;

        if (student.payTimer >= student.serviceDuration && !student.hasProcessedTransaction) {
          const serviceResolution = this.controller.resolveNpcServiceAttempt
            ? this.controller.resolveNpcServiceAttempt(student.scenario)
            : {
                ok: true,
                action: "serve",
                scenario: student.scenario
              };

          if (!serviceResolution.ok) {
            this.setRoute(student, this.pathRouter.buildExitPath());
            student.state = "exiting";
            return;
          }

          if (serviceResolution.action === "reroute") {
            const previousStallId = student.scenario.stallId;
            const reroutedServicePoint = this.getServicePointForStall(
              serviceResolution.scenario.stallId
            );

            student.scenario = serviceResolution.scenario;
            student.servicePointId = reroutedServicePoint.id;
            student.waitingTarget = this.getHoldingTargetForServicePoint(reroutedServicePoint);
            student.queueOffsetY = (Math.floor(Math.random() * 5) - 2) * 6;
            student.rerouteCount += 1;
            student.excludedStallIds = Array.from(
              new Set([...student.excludedStallIds, previousStallId])
            );
            student.payTimer = 0;
            student.state = "queueing";

            this.applyTimingProfile(student, student.scenario.stallId, {
              resetCurrentStallWait: true
            });

            return;
          }

          student.scenario = serviceResolution.scenario;

          const transaction = this.controller.processTransaction({
            ...student.scenario,
            source: "auto_queue"
          });

          if (!transaction) {
            this.setRoute(student, this.pathRouter.buildExitPath());
            student.state = "exiting";
            return;
          }

          student.hasProcessedTransaction = true;

          const seat = this.findAvailableSeat(student, playerOccupiedSeatId);

          if (seat) {
            this.occupySeat(seat.id, student.id);
            student.seatId = seat.id;
            student.seatLabel = seat.label;
            this.setRoute(student, this.pathRouter.buildPathToSeat(seat));
            student.state = "moving_to_seat";
          } else {
            student.state = "waiting_for_seat";
          }
        }

        return;
      }

      if (student.state === "waiting_for_seat") {
        const servicePoint = this.getServicePointForStudent(student);

        if (!student.waitingTarget) {
          student.waitingTarget = this.getHoldingTargetForServicePoint(servicePoint);
        }

        this.moveToward(
          student,
          student.waitingTarget.x,
          student.waitingTarget.y,
          deltaTime
        );

        const seat = this.findAvailableSeat(student, playerOccupiedSeatId);

        if (seat) {
          this.occupySeat(seat.id, student.id);
          student.seatId = seat.id;
          student.seatLabel = seat.label;
          this.setRoute(student, this.pathRouter.buildPathToSeat(seat));
          student.state = "moving_to_seat";
        }

        return;
      }

      if (student.state === "moving_to_seat") {
        const seat = this.getSeatById(student.seatId);

        if (!seat) {
          student.state = "waiting_for_seat";
          return;
        }

        const arrived = this.followRoute(student, deltaTime);

        if (arrived) {
          student.state = "eating";
          student.eatingTimer = 0;
          student.route = [];
          student.routeIndex = 0;
        }

        return;
      }

      if (student.state === "eating") {
        student.eatingTimer += deltaTime;

        if (student.eatingTimer >= student.eatDuration) {
          const seat = this.getSeatById(student.seatId);

          this.releaseSeat(student.seatId, student.id);

          if (seat) {
            this.setRoute(student, this.pathRouter.buildPathToTrayReturn(seat));
          }

          student.state = "returning_tray";
        }

        return;
      }

      if (student.state === "returning_tray") {
        const arrived = this.followRoute(student, deltaTime);

        if (arrived) {
          this.traySystem.enqueueTray({
            dishName: student.scenario.recipeKey
          });

          student.seatId = null;
          student.seatLabel = null;
          this.setRoute(student, this.pathRouter.buildExitPath());
          student.state = "exiting";
        }

        return;
      }

      if (student.state === "exiting") {
        const exited = this.followRoute(student, deltaTime);

        if (exited) {
          student.remove = true;
        }
      }
    });

    this.students = this.students.filter((student) => !student.remove);

    this.traySystem.update(deltaTime);

    const liveQueueLength = this.students.filter((student) =>
      student.state === "queueing" ||
      student.state === "moving_to_counter" ||
      student.state === "paying" ||
      student.state === "waiting_for_seat"
    ).length;

    const seatedStudentCount = this.students.filter(
      (student) => student.state === "eating"
    ).length;

    const occupiedDiningSeats = this.getOccupiedSeatIds(playerOccupiedSeatId).size;

    this.controller.updateOperationalMetrics(
      liveQueueLength,
      this.getQueueBreakdown()
    );
    this.controller.updateDiningMetrics({
      occupiedDiningSeats,
      totalDiningSeats: this.allSeats.length,
      seatedStudentCount,
      trayReturnCount: this.traySystem.getActiveTrayCount(),
      washedTrayCount: this.traySystem.getCompletedWashCount()
    });
  }

  draw(ctx) {
    ctx.save();

    this.servicePoints.forEach((servicePoint) => {
      ctx.fillStyle = servicePoint.color;
      ctx.fillRect(servicePoint.x - 16, servicePoint.y - 16, 32, 32);

      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 2;
      ctx.strokeRect(servicePoint.x - 16, servicePoint.y - 16, 32, 32);

      ctx.fillStyle = "#e2e8f0";
      ctx.font = "11px Arial";
      ctx.fillText(servicePoint.label, servicePoint.x - 38, servicePoint.y - 22);
    });

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "14px Arial";
    ctx.fillText("Live Service Queues", 120, 295);

    this.students.forEach((student) => {
      ctx.fillStyle = student.color;
      ctx.fillRect(student.x, student.y, student.size, student.size);

      const nameLabel =
        student.displayName.length > 10
          ? `${student.displayName.slice(0, 10)}...`
          : student.displayName;

      ctx.fillStyle = "#e2e8f0";
      ctx.font = "10px Arial";
      ctx.fillText(nameLabel, student.x - 4, student.y - 8);

      if (student.state === "paying") {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(student.x - 2, student.y - 2, student.size + 4, student.size + 4);
      }

      if (student.state === "eating") {
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(student.x + 5, student.y - 5, 8, 4);
      }
    });

    ctx.restore();
  }
}
