import {
  DINING_ROUTE_LANES,
  TRAY_RETURN_STATION
} from "../data/diningAreaLayout.js";

export default class NpcPathRouter {
  buildPathToSeat(seat, fromPoint = null) {
    const path = [];

    if (fromPoint) {
      path.push({ x: DINING_ROUTE_LANES.entryX, y: fromPoint.y });
    }

    path.push(
      { x: DINING_ROUTE_LANES.entryX, y: seat.approachY },
      { x: seat.actorX, y: seat.approachY },
      { x: seat.actorX, y: seat.actorY }
    );

    return path.filter((waypoint, index, items) => {
      if (index === 0) return true;
      const previous = items[index - 1];
      return previous.x !== waypoint.x || previous.y !== waypoint.y;
    });
  }

  buildPathToTrayReturn(seat) {
    const trayDropoffX = TRAY_RETURN_STATION.x + TRAY_RETURN_STATION.width + 10;
    const trayTargetY = TRAY_RETURN_STATION.y + 18;

    return [
      { x: seat.actorX, y: seat.approachY },
      { x: trayDropoffX, y: seat.approachY },
      { x: trayDropoffX, y: trayTargetY }
    ];
  }

  buildExitPath(fromPoint = null) {
    const startY = fromPoint?.y ?? (TRAY_RETURN_STATION.y + 18);

    return [
      { x: DINING_ROUTE_LANES.exitLaneX, y: startY },
      { x: DINING_ROUTE_LANES.exitLaneX, y: DINING_ROUTE_LANES.exitY }
    ];
  }
}
