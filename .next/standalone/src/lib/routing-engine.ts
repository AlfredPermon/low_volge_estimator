export interface Point {
  x: number;
  y: number;
}

export interface Segment {
  a: Point;
  b: Point;
}

export interface NodeRouteResult {
  totalCableM: number;
  conduitBranchM: number;
  trayMainM: number;
  routePoints: Point[];
}

/**
 * Proyección perpendicular de un punto p a un segmento a-b
 */
export function projectPointOnSegment(
  p: Point,
  a: Point,
  b: Point
): { proj: Point; distPx: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { proj: a, distPx: Math.hypot(p.x - a.x, p.y - a.y) };

  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  const proj = { x: a.x + t * dx, y: a.y + t * dy };
  const distPx = Math.hypot(p.x - proj.x, p.y - proj.y);
  return { proj, distPx };
}

/**
 * Función matemática de Ruteo Troncal (Trunk-and-Branch)
 * Proyecta la posición del dispositivo perpendicularmente a la troncal de pasillo más cercana,
 * calculando el metraje de derivación EMT vs charola principal hasta el Rack IDF.
 */
export function calculateNodeRoute(
  device: Point,
  rack: Point,
  pathwaySegments: Segment[],
  scaleMetersPerPx: number,
  verticalDropM: number = 3.0,
  slackM: number = 4.0
): NodeRouteResult {
  // Si no hay troncales trazadas, fallback a Manhattan 90°
  if (!pathwaySegments || pathwaySegments.length === 0) {
    const dH = (Math.abs(device.x - rack.x) + Math.abs(device.y - rack.y)) * scaleMetersPerPx * 1.15;
    const branchM = verticalDropM + (Math.abs(device.x - rack.x) * scaleMetersPerPx);
    const trayM = Math.abs(device.y - rack.y) * scaleMetersPerPx;
    return {
      totalCableM: Math.round((dH + verticalDropM + slackM) * 100) / 100,
      conduitBranchM: Math.round(branchM * 100) / 100,
      trayMainM: Math.round(trayM * 100) / 100,
      routePoints: [device, { x: device.x, y: rack.y }, rack],
    };
  }

  // 1. Encontrar el punto de entrada a la charola más cercano al dispositivo
  let bestEntry = { proj: rack, distPx: Infinity, segIndex: -1 };
  pathwaySegments.forEach((seg, idx) => {
    const res = projectPointOnSegment(device, seg.a, seg.b);
    if (res.distPx < bestEntry.distPx) {
      bestEntry = { proj: res.proj, distPx: res.distPx, segIndex: idx };
    }
  });

  // 2. Distancia de derivación en tubería EMT (del dispositivo a la charola + bajada vertical)
  const derivacionMetros = (bestEntry.distPx * scaleMetersPerPx) + verticalDropM;

  // 3. Distancia sobre la troncal hasta el Rack
  const distTroncalMetros = (Math.abs(bestEntry.proj.x - rack.x) + Math.abs(bestEntry.proj.y - rack.y)) * scaleMetersPerPx;

  const totalCable = derivacionMetros + distTroncalMetros + slackM;

  return {
    totalCableM: Math.round(totalCable * 100) / 100,
    conduitBranchM: Math.round(derivacionMetros * 100) / 100,
    trayMainM: Math.round(distTroncalMetros * 100) / 100,
    routePoints: [device, bestEntry.proj, rack],
  };
}
