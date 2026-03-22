import {
  DINING_ROUTE_LANES,
  TRAY_RETURN_STATION
} from "../data/diningAreaLayout.js";

export default class NpcPathRouter {
  buildPathToSeat(seat) {
    return [
      { x: DINING_ROUTE_LANES.entryX, y: seat.approachY },
      { x: seat.actorX, y: seat.approachY },
      { x: seat.actorX, y: seat.actorY }
    ];
  }

  buildPathToTrayReturn(seat) {
    const trayTargetX = TRAY_RETURN_STATION.x + 2;
    const trayTargetY = TRAY_RETURN_STATION.y + 18;

    return [
      { x: seat.actorX, y: seat.approachY },
      { x: DINING_ROUTE_LANES.trayLaneX, y: seat.approachY },
      { x: DINING_ROUTE_LANES.trayLaneX, y: trayTargetY },
      { x: trayTargetX, y: trayTargetY }
    ];
  }

  buildExitPath() {
    const trayTargetY = TRAY_RETURN_STATION.y + 18;

    return [
      { x: DINING_ROUTE_LANES.exitLaneX, y: trayTargetY },
      { x: DINING_ROUTE_LANES.exitLaneX, y: DINING_ROUTE_LANES.exitY }
    ];
  }
}