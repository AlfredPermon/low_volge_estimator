export interface Point2D {
  x: number;
  y: number;
}

export interface PathwayNodeItem {
  id: string;
  x: number;
  y: number;
}

export interface PathwaySegmentItem {
  id: string;
  fromId: string;
  toId: string;
}

/**
 * Verfica si un punto P está contenido estrictamente dentro del segmento de recta AB
 */
function isPointOnSegment(p: Point2D, a: Point2D, b: Point2D, epsilon = 1e-4): boolean {
  const cross = (p.y - a.y) * (b.x - a.x) - (p.x - a.x) * (b.y - a.y);
  if (Math.abs(cross) > epsilon) return false;

  const dot = (p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y);
  if (dot < 0) return false;

  const squaredLengthAB = (b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y);
  if (dot > squaredLengthAB) return false;

  return true;
}

/**
 * Test de orientación ccw (counter-clockwise)
 */
function ccw(p1: Point2D, p2: Point2D, p3: Point2D): number {
  const val = (p2.y - p1.y) * (p3.x - p2.x) - (p2.x - p1.x) * (p3.y - p2.y);
  if (Math.abs(val) < 1e-6) return 0; // Colineal
  return val > 0 ? 1 : 2; // 1 = Horario, 2 = Antihorario
}

/**
 * Verifica si los segmentos AB y CD se cruzan o se solapan geométricamente
 */
export function checkSegmentsIntersectOrOverlap(
  a: Point2D,
  b: Point2D,
  c: Point2D,
  d: Point2D
): boolean {
  const sharesEndpoint =
    (a.x === c.x && a.y === c.y) ||
    (a.x === d.x && a.y === d.y) ||
    (b.x === c.x && b.y === c.y) ||
    (b.x === d.x && b.y === d.y);

  if (sharesEndpoint) {
    // Si comparten un extremo, verificar si son colineales y apuntan en la misma dirección (solapamiento)
    const o1 = ccw(a, b, c);
    const o2 = ccw(a, b, d);
    if (o1 === 0 && o2 === 0) {
      const shared = (a.x === c.x && a.y === c.y) || (a.x === d.x && a.y === d.y) ? a : b;
      const nonShared1 = (a.x === c.x && a.y === c.y) || (a.x === d.x && a.y === d.y) ? b : a;
      const nonShared2 = (c.x === a.x && c.y === a.y) || (c.x === b.x && c.y === b.y) ? d : c;

      const v1x = nonShared1.x - shared.x;
      const v1y = nonShared1.y - shared.y;
      const v2x = nonShared2.x - shared.x;
      const v2y = nonShared2.y - shared.y;
      const dot = v1x * v2x + v1y * v2y;
      // Si el producto punto es positivo, se solapan en la misma dirección
      if (dot > 1e-4) {
        return true;
      }
    }
    return false;
  }

  // Intersección general
  const o1 = ccw(a, b, c);
  const o2 = ccw(a, b, d);
  const o3 = ccw(c, d, a);
  const o4 = ccw(c, d, b);

  if (o1 !== o2 && o3 !== o4) {
    return true;
  }

  // Casos colineales
  if (o1 === 0 && isPointOnSegment(c, a, b)) return true;
  if (o2 === 0 && isPointOnSegment(d, a, b)) return true;
  if (o3 === 0 && isPointOnSegment(a, c, d)) return true;
  if (o4 === 0 && isPointOnSegment(b, c, d)) return true;

  return false;
}

/**
 * Valida un nuevo segmento de charola contra solapamientos, cruces o discontinuidades
 */
export function validateNewPathwaySegment(
  fromNode: Point2D,
  toNode: Point2D,
  existingNodes: PathwayNodeItem[],
  existingSegments: PathwaySegmentItem[],
  fromId: string,
  toId: string
): { isValid: boolean; reason?: string } {
  if (fromId === toId || (fromNode.x === toNode.x && fromNode.y === toNode.y)) {
    return { isValid: false, reason: "No se puede conectar un nodo consigo mismo." };
  }

  const nodeMap = new Map(existingNodes.map((n) => [n.id, n]));

  // 1. Verificación de segmento duplicado
  const isDuplicate = existingSegments.some(
    (s) =>
      (s.fromId === fromId && s.toId === toId) ||
      (s.fromId === toId && s.toId === fromId)
  );

  if (isDuplicate) {
    return {
      isValid: false,
      reason: "⚠️ Tramo duplicado: Ya existe un segmento de charola entre estos dos puntos.",
    };
  }

  // 2. Verificación de intersección o solapamiento geométrico
  for (const seg of existingSegments) {
    const segFrom = nodeMap.get(seg.fromId);
    const segTo = nodeMap.get(seg.toId);
    if (!segFrom || !segTo) continue;

    const intersects = checkSegmentsIntersectOrOverlap(
      fromNode,
      toNode,
      { x: segFrom.x, y: segFrom.y },
      { x: segTo.x, y: segTo.y }
    );

    if (intersects) {
      return {
        isValid: false,
        reason:
          "⚠️ Restricción de no superposición: El tramo se solapa o cruza una charola existente. Seleccione una ruta despejada o enganche a un punto de empalme.",
      };
    }
  }

  return { isValid: true };
}
