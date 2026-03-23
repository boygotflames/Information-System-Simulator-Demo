import InformationSystemController from "./core/InformationSystemController.js";
import { INSPECTABLES } from "./data/inspectables.js";
import CanvasInspector from "./systems/CanvasInspector.js";
import StudentDiningFlowSimulator from "./systems/StudentDiningFlowSimulator.js";
import PlayerAvatar from "./entities/PlayerAvatar.js";
import * as CanteenLayout from "./data/canteenLayout.js";
import { DINING_TABLES_8, ALL_DINING_SEATS } from "./data/diningAreaLayout.js";
import TrayReturnSystem from "./systems/TrayReturnSystem.js";
import { STATIC_OBSTACLES } from "./data/collisionLayout.js";
import { initDashboardToggle } from "./ui/dashboardToggle.js";

const simulateBtn = document.getElementById("simulateTransactionBtn");
const managerModeBtn = document.getElementById("managerModeBtn");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const controller = new InformationSystemController();
controller.bootstrapDashboard();
initDashboardToggle();

const inspector = new CanvasInspector(canvas, INSPECTABLES);
const traySystem = new TrayReturnSystem();
const studentFlow = new StudentDiningFlowSimulator(controller, traySystem);
let lastTime = performance.now();
const player = new PlayerAvatar({ x: 90, y: 430, label: "Player" });
const allSeats = ALL_DINING_SEATS;
const worldObstacles = STATIC_OBSTACLES;

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

function drawDiningTables(ctx) {
  ctx.save();

  const occupiedSeatIds = studentFlow.getOccupiedSeatIds(player.seatedSeatId);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "14px Arial";
  ctx.fillText("Dining Area", 650, 284);

  DINING_TABLES_8.forEach((table) => {
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(table.x, table.y, table.width, table.height);

    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.strokeRect(table.x, table.y, table.width, table.height);

    table.seats.forEach((seat) => {
      const isPlayerSeat = player.seatedSeatId === seat.id;
      const isOccupied = occupiedSeatIds.has(seat.id);

      ctx.fillStyle = isPlayerSeat
        ? "#f8fafc"
        : isOccupied
          ? "#f59e0b"
          : "#94a3b8";

      ctx.fillRect(seat.x, seat.y, seat.width, seat.height);
      ctx.strokeStyle = "#0f172a";
      ctx.strokeRect(seat.x, seat.y, seat.width, seat.height);
    });
  });

  ctx.restore();
}

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

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // background floor
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // simple grid for canteen floor
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;

  for (let x = 0; x < canvas.width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y < canvas.height; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // title on canvas
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "18px Arial";
  ctx.fillText("Canteen Operations Floor - IS Simulation View", 20, 30);

  // draw clickable educational zones
  inspector.drawDebugZones(ctx);
  drawDiningTables(ctx);
  traySystem.draw(ctx);
  studentFlow.draw(ctx);
  player.draw(ctx);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "14px Arial";
  ctx.fillText("Player: move with WASD / Arrow Keys, press E near a service counter to buy, press E near seats to sit/eat", 20, canvas.height - 20);
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

  drawScene();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
