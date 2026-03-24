import InformationSystemController from "./core/InformationSystemController.js";
import { INSPECTABLES } from "./data/inspectables.js";
import CanvasInspector from "./systems/CanvaInspector.js";
import StudentDiningFlowSimulator from "./systems/StudentDiningFlowSimulator.js";
import PlayerAvatar from "./entities/PlayerAvatar.js";
import * as CanteenLayout from "./data/canteenLayout.js";
import {
  DINING_TABLES_8,
  ALL_DINING_SEATS,
  TRAY_RETURN_STATION,
  WASHING_AREA,
  TRAY_RETURN_PATH,
  TRAY_DROP_SLOTS
} from "./data/diningAreaLayout.js";
import TrayReturnSystem from "./systems/TrayReturnSystem.js";
import { STATIC_OBSTACLES } from "./data/collisionLayout.js";
import { initDashboardToggle } from "./ui/dashboardToggle.js?v=layout-polish-v1";
import WorldRenderer from "./rendering/WorldRenderer.js";
import EnvironmentRenderer from "./rendering/EnvironmentRenderer.js";
import CharacterRenderer from "./rendering/CharacterRenderer.js";
import ShadowRenderer from "./rendering/ShadowRenderer.js";
import { preloadSprites } from "./rendering/spriteLoader.js";

const simulateBtn = document.getElementById("simulateTransactionBtn");
const managerModeBtn = document.getElementById("managerModeBtn");
const archiveReportBtn = document.getElementById("archiveReportBtn");
const planNextDayBtn = document.getElementById("planNextDayBtn");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const controller = new InformationSystemController();
controller.bootstrapDashboard();
initDashboardToggle();
preloadSprites().catch(() => {});

const inspector = new CanvasInspector(canvas, INSPECTABLES);
const traySystem = new TrayReturnSystem();
const studentFlow = new StudentDiningFlowSimulator(controller, traySystem);
let lastTime = performance.now();
const player = new PlayerAvatar({ x: 90, y: 430, label: "Player" });
const allSeats = ALL_DINING_SEATS;
const worldObstacles = STATIC_OBSTACLES;
const shadowRenderer = new ShadowRenderer();
const environmentRenderer = new EnvironmentRenderer({ shadowRenderer });
const characterRenderer = new CharacterRenderer({ shadowRenderer });
const worldRenderer = new WorldRenderer({
  environmentRenderer,
  characterRenderer,
  shadowRenderer
});

const keyState = {
  up: false,
  down: false,
  left: false,
  right: false
};

let interactQueued = false;

function setMovementKey(key, isPressed) {
  const lowerKey = key.toLowerCase();

  if (key === "ArrowUp" || lowerKey === "w") {
    keyState.up = isPressed;
    return true;
  }

  if (key === "ArrowDown" || lowerKey === "s") {
    keyState.down = isPressed;
    return true;
  }

  if (key === "ArrowLeft" || lowerKey === "a") {
    keyState.left = isPressed;
    return true;
  }

  if (key === "ArrowRight" || lowerKey === "d") {
    keyState.right = isPressed;
    return true;
  }

  return false;
}

window.addEventListener("keydown", (event) => {
  const handledMovement = setMovementKey(event.key, true);

  if (handledMovement) {
    event.preventDefault();
  }

  if (event.key.toLowerCase() === "e") {
    interactQueued = true;
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  const handledMovement = setMovementKey(event.key, false);

  if (handledMovement) {
    event.preventDefault();
  }
});

function handlePlayerInteraction() {
  const playerCenterX = player.x + player.size / 2;
  const playerCenterY = player.y + player.size / 2;

  const nearbyServicePoint = CanteenLayout.getNearestServicePoint
    ? CanteenLayout.getNearestServicePoint(playerCenterX, playerCenterY, 72)
    : Object.values(CanteenLayout.SERVICE_POINTS || {}).find((point) =>
        Math.hypot(point.x - playerCenterX, point.y - playerCenterY) <= 72
      ) || null;

  if (nearbyServicePoint) {
    if (controller.processPlayerCounterInteraction) {
      controller.processPlayerCounterInteraction(nearbyServicePoint);
    } else {
      controller.processPlayerPurchase({
        stallId: nearbyServicePoint.stallId,
        recipeKey: nearbyServicePoint.defaultRecipeKey
      });
    }
    return;
  }

  const nearbySeat = allSeats.find((seat) => player.isNear(seat.x, seat.y, 42));

  if (nearbySeat) {
    if (studentFlow.isSeatOccupiedByNpc(nearbySeat.id)) {
      controller.setPlayerStatus(`Seat ${nearbySeat.label} occupied`);
      return;
    }

    player.seatAt(nearbySeat);

    if (controller.getPlayerProfile().currentMeal) {
      controller.playerEatMeal(nearbySeat.label);
    } else {
      controller.seatPlayerAt(nearbySeat.label);
    }

    return;
  }

  controller.setPlayerStatus("Exploring");
}

function drawScene(sceneTime = performance.now()) {
  worldRenderer.draw(ctx, {
    canvas,
    servicePoints: CanteenLayout.SERVICE_POINT_LIST || Object.values(CanteenLayout.SERVICE_POINTS || {}),
    diningTables: DINING_TABLES_8,
    trayReturnStation: TRAY_RETURN_STATION,
    washingArea: WASHING_AREA,
    trayPath: TRAY_RETURN_PATH,
    trayDropSlots: TRAY_DROP_SLOTS,
    occupiedSeatIds: studentFlow.getOccupiedSeatIds(player.seatedSeatId),
    playerSeatId: player.seatedSeatId,
    trays: traySystem.trays,
    students: studentFlow.getRenderableStudents
      ? studentFlow.getRenderableStudents()
      : studentFlow.students,
    player,
    playerProfile: controller.getPlayerProfile(),
    time: sceneTime / 1000
  });

  inspector.drawDebugZones(ctx);
}

canvas.addEventListener("click", (event) => {
  inspector.handleClick(
    event,
    (clickedObject) => {
      controller.inspectObject(clickedObject);
    },
    () => {
      // Optional: clear selection on empty click later
    }
  );
});

canvas.addEventListener("mousemove", (event) => {
  inspector.handleMouseMove(event);
});

simulateBtn.addEventListener("click", () => {
  if (controller.simulateOperationalTransaction) {
    controller.simulateOperationalTransaction();
    return;
  }

  const scenario = controller.createRandomTransactionScenario();
  controller.processTransaction(scenario);
});

managerModeBtn.addEventListener("click", () => {
  const intervention = controller.triggerManagerIntervention
    ? controller.triggerManagerIntervention()
    : null;

  controller.inspectObject({
    name: "Manager Dashboard",
    type: "Management Interface",
    isRole: "MIS / DSS / ESS",
    description: intervention?.message
      ? `This interface summarizes operational data for decisions, forecasting, executive oversight, and restock approvals. Last action: ${intervention.message}`
      : "This interface summarizes operational data for decisions, forecasting, executive oversight, and restock approvals."
  });
});

archiveReportBtn?.addEventListener("click", () => {
  const archiveResult = controller.archiveCurrentOperationalReport
    ? controller.archiveCurrentOperationalReport()
    : null;

  controller.inspectObject({
    name: "Executive Report Archive",
    type: "Management Reporting",
    isRole: "MIS / ESS / Executive Oversight",
    description: archiveResult?.message
      ? `Operational reporting archive. Last archive action: ${archiveResult.message}`
      : "Operational reporting archive for daily executive summaries."
  });
});

planNextDayBtn?.addEventListener("click", () => {
  const planResult = controller.generateNextDayOperationalPlan
    ? controller.generateNextDayOperationalPlan()
    : null;

  controller.inspectObject({
    name: "Operations Planning Console",
    type: "Planning Control",
    isRole: "MIS / DSS / ESS / Planning",
    description: planResult?.message
      ? `Next-day planning applied. ${planResult.message} Priority: ${planResult.plan?.topPriority || "Keep counters balanced."}`
      : "Operational planning console for forecasting and next-day control."
  });
});

function loop(currentTime) {
  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.05);
  lastTime = currentTime;

  const wasSeated = player.seatedSeatId !== null;

  player.update(keyState, deltaTime, {
    minX: 0,
    minY: 40,
    maxX: canvas.width,
    maxY: canvas.height,
    obstacles: worldObstacles
  });

  if (wasSeated && !player.seatedSeatId) {
    controller.playerStandUp();
  }

  if (interactQueued) {
    handlePlayerInteraction();
    interactQueued = false;
  }

  studentFlow.update(deltaTime, {
    playerOccupiedSeatId: player.seatedSeatId
  });

  if (controller.updateRuntimeSystems) {
    controller.updateRuntimeSystems(deltaTime);
  }

  controller.renderOperationalMetrics();

  drawScene(currentTime);
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
