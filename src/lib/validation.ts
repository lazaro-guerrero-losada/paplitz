import { Point2D, Edge, CubeChallenge } from './geometry';

export interface UserStroke {
  points: { x: number; y: number; pressure?: number; time: number }[];
}

export interface ValidationFeedback {
  score: number; // 0 - 100 puntuación base geométrica
  totalScore?: number; // 0 - 100 con bonus de velocidad incluido
  passed: boolean; // score >= 80
  strokeCount: number;
  expectedEdgeCount: number;
  angleErrors: number[];
  mainIssueMessage: string;
  tipMessage: string;
  matchedEdges: {
    targetEdge: Edge;
    userStart: Point2D;
    userEnd: Point2D;
    errorScore: number;
  }[];
  straightnessScore: number;
  vertexAccuracyScore: number;
  perspectiveScore: number;
  timeRemainingSeconds?: number;
  speedBonus?: number;
}

function dist(p1: Point2D, p2: Point2D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function segmentAngle(p1: Point2D, p2: Point2D): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

function minAngleDiff(a1: number, a2: number): number {
  const diff = Math.abs(a1 - a2) % Math.PI;
  return diff > Math.PI / 2 ? Math.PI - diff : diff;
}

/**
 * Distancia perpendicular de un punto P al segmento ideal A-B
 */
function distPointToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const l2 = (b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y);
  if (l2 === 0) return dist(p, a);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}

/**
 * Mide la curvatura y desviación de rectitud de un trazo libre respecto a su cuerda recta.
 * En dibujo en perspectiva tradicional (Koos Eissen / Roselien Steur), las aristas deben ser
 * líneas rectas tensas y no arcos curvos ni trazos ondulados.
 */
function measureStrokeCurvature(stroke: UserStroke): { maxDeviation: number; avgDeviation: number } {
  if (stroke.points.length < 3) return { maxDeviation: 0, avgDeviation: 0 };
  const pStart = stroke.points[0];
  const pEnd = stroke.points[stroke.points.length - 1];
  const lineDist = dist(pStart, pEnd);
  if (lineDist < 12) return { maxDeviation: 0, avgDeviation: 0 };

  let maxDev = 0;
  let sumDev = 0;

  for (let i = 1; i < stroke.points.length - 1; i++) {
    const d = distPointToSegment(stroke.points[i], pStart, pEnd);
    if (d > maxDev) maxDev = d;
    sumDev += d;
  }

  return {
    maxDeviation: maxDev,
    avgDeviation: sumDev / (stroke.points.length - 2),
  };
}

/**
 * Descompone un trazo continuo en segmentos lineales cuando detecta esquinas o vértices
 * (por ejemplo, si el usuario traza la tapa superior o una vertical sin levantar el lápiz).
 */
export function splitStrokeAtCorners(
  points: { x: number; y: number; pressure?: number; time: number }[],
  cornerThresholdPx = 13,
  minSegmentLength = 16
): { x: number; y: number; pressure?: number; time: number }[][] {
  if (points.length < 5) return [points];

  const pStart = points[0];
  const pEnd = points[points.length - 1];

  let maxDist = 0;
  let splitIdx = -1;

  for (let i = 2; i < points.length - 2; i++) {
    const d = distPointToSegment(points[i], pStart, pEnd);
    if (d > maxDist) {
      maxDist = d;
      splitIdx = i;
    }
  }

  if (maxDist >= cornerThresholdPx && splitIdx !== -1) {
    const len1 = dist(pStart, points[splitIdx]);
    const len2 = dist(points[splitIdx], pEnd);

    if (len1 >= minSegmentLength && len2 >= minSegmentLength) {
      const v1x = points[splitIdx].x - pStart.x;
      const v1y = points[splitIdx].y - pStart.y;
      const v2x = pEnd.x - points[splitIdx].x;
      const v2y = pEnd.y - points[splitIdx].y;
      const dot = v1x * v2x + v1y * v2y;
      const m1 = Math.hypot(v1x, v1y);
      const m2 = Math.hypot(v2x, v2y);
      const cosAngle = m1 * m2 > 0 ? dot / (m1 * m2) : 1;

      // Si el ángulo de giro es mayor a ~15° (cosAngle < 0.96) o la desviación perpendicular es >= 18px
      if (cosAngle < 0.96 || maxDist >= 18) {
        const leftPoints = points.slice(0, splitIdx + 1);
        const rightPoints = points.slice(splitIdx);
        return [
          ...splitStrokeAtCorners(leftPoints, cornerThresholdPx, minSegmentLength),
          ...splitStrokeAtCorners(rightPoints, cornerThresholdPx, minSegmentLength),
        ];
      }
    }
  }

  return [points];
}

/**
 * Cuenta cuántas aristas individuales detectables contiene el conjunto de trazos del usuario.
 */
export function countDetectedAristas(strokes: UserStroke[]): number {
  let count = 0;
  strokes.forEach((s) => {
    if (s.points.length >= 2) {
      const segments = splitStrokeAtCorners(s.points);
      count += segments.filter((seg) => {
        if (seg.length < 2) return false;
        const p1 = seg[0];
        const p2 = seg[seg.length - 1];
        return dist(p1, p2) > 15;
      }).length;
    }
  });
  return count;
}

// Tolerancias y límites geométricos basados en los axiomas de Koos Eissen:
export const GEOMETRIC_TOLERANCES = {
  // 1. Rectitud: margen de fluctuación natural de la mano antes de penalizar curvatura
  STRAIGHTNESS_TOLERANCE_PX: 3.5,
  // 2. Margen de maniobra angular en oblicuas (fugas hacia el horizonte):
  MAX_OBLIQUE_ANGLE_TOLERANCE_DEG: 7.5,
  // 3. Margen de tolerancia en la vertical (perpendicular a 90° en perspectiva a 2 puntos):
  MAX_VERTICAL_ANGLE_TOLERANCE_DEG: 5.5,
  // 4. Margen de proporción en longitud para que siga considerándose un cubo:
  MIN_CUBE_LENGTH_RATIO: 0.72,
  MAX_CUBE_LENGTH_RATIO: 1.30,
  // 5. Umbral de aprobado global
  PASS_SCORE_THRESHOLD: 80,
};

/**
 * Algoritmo de validación formativo y riguroso de dibujo de perspectiva:
 * Evalúa:
 * 1. Segmentación inteligente de trazos continuos en aristas individuales.
 * 2. Asignación justa con crédito parcial proporcional (reconoce trazos acertados).
 * 3. Rectitud del trazo (aislada para premiar el pulso firme sin castigar el temblor natural del ratón).
 * 4. Fuga angular y verticalidad.
 * 5. Cierre de vértices y diagnóstico exacto del error cuando una arista está desplazada.
 */
export function validateCubeDrawing(
  challenge: CubeChallenge,
  strokes: UserStroke[],
  timeRemainingSeconds?: number
): ValidationFeedback {
  if (challenge.isShadowLevel && challenge.shadowData) {
    return validateShadowDrawing(challenge, strokes, timeRemainingSeconds);
  }

  const evalEdges = challenge.targetEdges;

  if (strokes.length === 0) {
    return {
      score: 0,
      totalScore: 0,
      passed: false,
      strokeCount: 0,
      expectedEdgeCount: evalEdges.length,
      angleErrors: [],
      mainIssueMessage: 'No se detectaron trazos.',
      tipMessage: 'Dibuja las aristas que faltan para completar el cubo.',
      matchedEdges: [],
      straightnessScore: 0,
      vertexAccuracyScore: 0,
      perspectiveScore: 0,
      timeRemainingSeconds,
      speedBonus: 0,
    };
  }

  // 1. Descomponer trazos continuos si el usuario giró en esquinas sin levantar el lápiz
  const decomposedStrokes: UserStroke[] = [];
  strokes.forEach((s) => {
    if (s.points.length < 2) return;
    const subPointArrays = splitStrokeAtCorners(s.points);
    subPointArrays.forEach((pts) => {
      if (pts.length >= 2) {
        decomposedStrokes.push({ points: pts });
      }
    });
  });

  // 2. Analizar y filtrar trazos válidos
  const userStrokesData = decomposedStrokes
    .map((stroke) => {
      const start = stroke.points[0];
      const end = stroke.points[stroke.points.length - 1];
      const length = dist(start, end);
      const angle = segmentAngle(start, end);
      const curvature = measureStrokeCurvature(stroke);
      return {
        stroke,
        start,
        end,
        length,
        angle,
        curvature,
      };
    })
    .filter((s) => s.length > 15); // Descartar pequeños puntos o pulsaciones accidentales

  const matchedEdges: ValidationFeedback['matchedEdges'] = [];
  const angleErrors: number[] = [];
  const usedStrokeIndices = new Set<number>();

  let totalEdgeScore = 0;
  const edgeWeight = 100 / evalEdges.length; // ej. 20 puntos por arista si son 5

  let hasDisplacedVertical = false;
  let hasCrookedVertical = false;
  let hasBrokenObliqueAngle = false;
  let hasSquashedProportion = false;

  let sumStraightQuality = 0;
  let sumPosQuality = 0;
  let sumAngleQuality = 0;

  evalEdges.forEach((targetEdge) => {
    const idealP1 = challenge.vertices2D[targetEdge.start];
    const idealP2 = challenge.vertices2D[targetEdge.end];
    const idealAngle = segmentAngle(idealP1, idealP2);
    const idealLength = dist(idealP1, idealP2);
    const isVertical = targetEdge.family === 'height';
    const isOblique = targetEdge.family === 'depth' || targetEdge.family === 'width';

    let bestMatchIdx = -1;
    let bestQuality = 0;
    let bestAvgEndpointDist = Infinity;
    let bestAngleDiffDeg = Infinity;
    let bestPosQuality = 0;
    let bestAngleQuality = 0;
    let bestStraightQuality = 0;

    userStrokesData.forEach((seg, idx) => {
      if (usedStrokeIndices.has(idx)) return; // Evitar asignar el mismo trazo a dos aristas

      // A) Error en extremos (distancia media de los vértices inicial y final)
      const dDirect = dist(seg.start, idealP1) + dist(seg.end, idealP2);
      const dInverted = dist(seg.start, idealP2) + dist(seg.end, idealP1);
      const endpointDist = Math.min(dDirect, dInverted);
      const avgEndpointDist = endpointDist / 2;

      // B) Error angular
      const angleDiff = minAngleDiff(seg.angle, idealAngle);
      const angleDiffDeg = (angleDiff * 180) / Math.PI;

      // C) Proporción en longitud
      const lengthRatio = seg.length / idealLength;

      // D) Curvatura del trazo libre (desviación respecto a su propia cuerda)
      const curv = seg.curvature.maxDeviation;
      const avgCurv = seg.curvature.avgDeviation;

      // E) Desviación real de TODOS los puntos del trazo respecto al segmento ideal 3D
      let sumIdealDist = 0;
      let maxIdealDist = 0;
      const pts = seg.stroke.points;
      for (let pIdx = 0; pIdx < pts.length; pIdx++) {
        const dIdeal = distPointToSegment(pts[pIdx], idealP1, idealP2);
        sumIdealDist += dIdeal;
        if (dIdeal > maxIdealDist) maxIdealDist = dIdeal;
      }
      const avgIdealDist = pts.length > 0 ? sumIdealDist / pts.length : avgEndpointDist;

      // --- CÁLCULO DE CALIDADES PROPORCIONALES ESTRICTAS (0.0 a 1.0) ---
      // 1. Calidad de posición en vértices (exigente: margen libre solo 2.5px):
      const posQuality = Math.max(0, Math.min(1, 1 - Math.max(0, avgEndpointDist - 2.5) / 24));

      // 2. Calidad angular (convergencia a puntos de fuga):
      const maxAngleTol = isVertical ? 7.0 : 10.0;
      const angleQuality = Math.max(0, Math.min(1, 1 - Math.max(0, angleDiffDeg - 1.5) / maxAngleTol));

      // 3. Calidad de rectitud y firmeza (castiga ondulaciones, temblores y zig-zags):
      const straightQuality = Math.max(0, Math.min(1, 1 - Math.max(0, curv - 1.5) / 7.0));

      // 4. Calidad de adherencia a la trayectoria teórica:
      const trajectoryQuality = Math.max(0, Math.min(1, 1 - Math.max(0, avgIdealDist - 2.0) / 12.0));

      // 5. Calidad de longitud y proporción:
      const lengthDiffRatio = Math.abs(lengthRatio - 1);
      const lengthQuality = Math.max(0, Math.min(1, 1 - Math.max(0, lengthDiffRatio - 0.05) / 0.28));

      let quality =
        posQuality * 0.28 +
        angleQuality * 0.24 +
        straightQuality * 0.24 +
        trajectoryQuality * 0.14 +
        lengthQuality * 0.10;

      // Limitadores estrictos si el trazo presenta defectos visibles:
      if (curv > 4.5 || avgCurv > 2.0) {
        // Trazo ondulado / con temblor visible (como en trazos inseguros)
        quality = Math.min(quality, 0.65);
      } else if (avgEndpointDist > 14) {
        // Vértices abiertos o desplazados
        quality = Math.min(quality, 0.40);
      } else if (angleDiffDeg > 5.5) {
        // Desviación angular notable
        quality = Math.min(quality, 0.45);
      } else if (lengthRatio < 0.72) {
        // Arista acortada
        quality = Math.min(quality, 0.48);
      }

      // Debe cumplir una orientación y proximidad mínimas para considerarse coincidencia válida
      if (posQuality > 0.10 && angleQuality > 0.15 && quality > bestQuality) {
        bestQuality = quality;
        bestMatchIdx = idx;
        bestAvgEndpointDist = avgEndpointDist;
        bestAngleDiffDeg = angleDiffDeg;
        bestPosQuality = posQuality;
        bestAngleQuality = angleQuality;
        bestStraightQuality = straightQuality;
      }
    });

    if (bestMatchIdx !== -1 && bestQuality >= 0.20) {
      usedStrokeIndices.add(bestMatchIdx);
      const matched = userStrokesData[bestMatchIdx];
      angleErrors.push((bestAngleDiffDeg * Math.PI) / 180);

      const edgeScore = edgeWeight * bestQuality;
      totalEdgeScore += edgeScore;

      sumStraightQuality += bestStraightQuality;
      sumPosQuality += bestPosQuality;
      sumAngleQuality += bestAngleQuality;

      matchedEdges.push({
        targetEdge,
        userStart: matched.start,
        userEnd: matched.end,
        errorScore: Math.round(bestAvgEndpointDist),
      });

      // Registrar anomalías específicas
      if (isVertical && bestAvgEndpointDist > 14) {
        hasDisplacedVertical = true;
      }
      if (isVertical && bestAngleDiffDeg > 5.0) {
        hasCrookedVertical = true;
      }
      if (isOblique && bestAngleDiffDeg > 6.0) {
        hasBrokenObliqueAngle = true;
      }
      if (matched.length / idealLength < 0.72) {
        hasSquashedProportion = true;
      }
    }
  });

  // Penalización leve por líneas sobrantes
  let extraStrokesPenalty = 0;
  if (userStrokesData.length > evalEdges.length) {
    extraStrokesPenalty = (userStrokesData.length - evalEdges.length) * 5;
  }

  // Subpuntuaciones analíticas normalizadas (0 a 100)
  const allEdgesMatched = matchedEdges.length === evalEdges.length;
  const straightnessScore = matchedEdges.length > 0 && allEdgesMatched
    ? Math.round((sumStraightQuality / matchedEdges.length) * 100)
    : 0;
  const vertexAccuracyScore = matchedEdges.length > 0 && allEdgesMatched
    ? Math.round((sumPosQuality / matchedEdges.length) * 100)
    : 0;
  const perspectiveScore = matchedEdges.length > 0 && allEdgesMatched
    ? Math.round((sumAngleQuality / matchedEdges.length) * 100)
    : 0;

  const hasWobblyStroke = straightnessScore < 75;

  // Penalización por distorsión de volumen cuando una arista estructural está desplazada o torcida
  let distortionPenalty = 0;
  if (hasDisplacedVertical) {
    distortionPenalty += 15;
  }
  if (hasCrookedVertical) {
    distortionPenalty += 14;
  }
  if (hasBrokenObliqueAngle) {
    distortionPenalty += 12;
  }
  if (hasWobblyStroke) {
    distortionPenalty += 12;
  }

  let finalScore = Math.max(0, Math.min(100, Math.round(totalEdgeScore - extraStrokesPenalty - distortionPenalty)));
  const hasStructuralFlaw = hasDisplacedVertical || hasCrookedVertical || hasBrokenObliqueAngle;

  // REGLA FUNDAMENTAL DE GEOMETRÍA:
  // Si falta aunque sea una sola arista obligatoria para cerrar el cubo -> 0% (incompleto).
  if (!allEdgesMatched) {
    finalScore = 0;
  } else if ((hasStructuralFlaw || hasWobblyStroke) && finalScore >= 80) {
    // Si existe un defecto evidente o trazos ondulados, la nota no puede superar el 74% (no superado)
    finalScore = 74;
  }

  const passed = finalScore >= GEOMETRIC_TOLERANCES.PASS_SCORE_THRESHOLD && allEdgesMatched && !hasStructuralFlaw && !hasWobblyStroke;

  // Diagnóstico pedagógico preciso
  let mainIssueMessage = '¡Muy buena precisión y perspectiva!';
  let tipMessage = 'Trazos rectos, esquinas cerradas y fuga milimétrica.';

  if (finalScore >= 92 && passed) {
    mainIssueMessage = '¡Cubo sobresaliente! Perspectiva impecable.';
    tipMessage = 'Trazos firmes y tensos, proporciones de cubo reales y fuga exacta.';
  } else if (passed) {
    mainIssueMessage = 'Cubo aprobado ✓ Buena proporción.';
    tipMessage = 'Estructura correcta dentro de los márgenes admisibles de fuga y proporción.';
  } else {
    // Si no ha aprobado, explicar el motivo exacto reconociendo lo que sí estuvo bien:
    if (!allEdgesMatched) {
      const missingCount = evalEdges.length - matchedEdges.length;
      mainIssueMessage = `Cubo incompleto: falta${missingCount > 1 ? 'n' : ''} ${missingCount} arista${missingCount > 1 ? 's' : ''}.`;
      tipMessage = `Has trazado ${matchedEdges.length} de las ${evalEdges.length} aristas requeridas. Si falta aunque sea una sola arista, el volumen no existe (0%). Completa todas las aristas para poder evaluar la perspectiva.`;
    } else if (hasWobblyStroke) {
      mainIssueMessage = 'Líneas curvadas u onduladas (trazo no tenso).';
      tipMessage = 'En dibujo de perspectiva las aristas deben ser rectas y seguras. Bloquea la muñeca y lanza el trazo continuo con el antebrazo.';
    } else if (hasDisplacedVertical) {
      mainIssueMessage = 'Trazos rectos, pero la arista vertical está desplazada.';
      tipMessage = 'Has resuelto bien las líneas de la tapa superior y la base, pero la vertical no coincide con la esquina del cubo. Ajusta la posición de la arista vertical para cerrar la perspectiva.';
    } else if (hasCrookedVertical) {
      mainIssueMessage = 'Trazos rectos, pero la vertical está inclinada.';
      tipMessage = 'La arista de altura no es perpendicular a 90°. Si inclinas la vertical, la caja se deforma en cuña.';
    } else if (hasBrokenObliqueAngle) {
      mainIssueMessage = 'Trazos rectos, pero la fuga oblicua supera el margen.';
      tipMessage = 'El ángulo de la oblicua se desvía de la fuga y arrastra el resto de las esquinas del cubo.';
    } else if (hasSquashedProportion) {
      mainIssueMessage = 'Trazos rectos, pero la arista es demasiado corta.';
      tipMessage = 'La arista ha quedado por debajo de la proporción ideal. Deja de parecer un cubo y se convierte en una caja aplastada.';
    } else {
      mainIssueMessage = 'Cubo desproporcionado o impreciso.';
      tipMessage = 'Apóyate en los ejes proyectados y en la cara dada para calcular las proporciones antes de trazar.';
    }
  }

  // Bonus de velocidad: solo bonifica si el cubo es técnicamente impecable (>= 85% y aprobado)
  const MAX_SPEED_BONUS = 10;
  const speedBonus = passed && finalScore >= 85 && timeRemainingSeconds && timeRemainingSeconds > 0
    ? Math.min(MAX_SPEED_BONUS, Math.round((timeRemainingSeconds / 30) * MAX_SPEED_BONUS))
    : 0;
  const totalScore = Math.min(100, finalScore + speedBonus);

  if (passed && speedBonus > 0) {
    if (totalScore >= 95) {
      mainIssueMessage = '¡Cubo legendario a toda velocidad!';
      tipMessage = `Estructura impecable completada en tiempo récord (+${speedBonus}% rapidez con ${timeRemainingSeconds?.toFixed(1)}s restantes).`;
    } else if (totalScore >= 85) {
      mainIssueMessage = '¡Excelente cubo con bonus de velocidad!';
      tipMessage = `Trazos firmes y ejecución rápida (+${speedBonus}% de rapidez con ${timeRemainingSeconds?.toFixed(1)}s restantes).`;
    } else {
      mainIssueMessage = 'Cubo aprobado con bonus de rapidez ✓';
      tipMessage = `Superado el umbral técnico con +${speedBonus}% extra por agilidad (${timeRemainingSeconds?.toFixed(1)}s restantes).`;
    }
  } else if (!passed && timeRemainingSeconds && timeRemainingSeconds > 15) {
    tipMessage += ' (Nota: El bonus de velocidad requiere un cubo aprobado con al menos 85% de precisión).';
  }

  return {
    score: finalScore,
    totalScore,
    passed,
    strokeCount: userStrokesData.length,
    expectedEdgeCount: evalEdges.length,
    angleErrors,
    mainIssueMessage,
    tipMessage,
    matchedEdges,
    straightnessScore,
    vertexAccuracyScore,
    perspectiveScore,
    timeRemainingSeconds,
    speedBonus,
  };
}

/**
 * Validación para el nivel final de Sombras Arrojadas sobre Plano Horizontal:
 * Evalúa:
 * 1. Cobertura de las aristas del contorno de la sombra (rayos de suelo y crestas).
 * 2. Posicionamiento en el suelo en la dirección correcta según el foco de luz L.
 * 3. Proximidad a los vértices de sombra calculados (S).
 */
export function validateShadowDrawing(
  challenge: CubeChallenge,
  strokes: UserStroke[],
  timeRemainingSeconds?: number
): ValidationFeedback {
  const shadowData = challenge.shadowData;
  if (!shadowData || strokes.length === 0) {
    return {
      score: 0,
      totalScore: 0,
      passed: false,
      strokeCount: 0,
      expectedEdgeCount: shadowData ? shadowData.targetEdges.length : 4,
      angleErrors: [],
      mainIssueMessage: 'No se detectaron trazos de sombra.',
      tipMessage: 'Proyecta los rayos desde L\' a través del suelo y desde L por las esquinas superiores.',
      matchedEdges: [],
      straightnessScore: 0,
      vertexAccuracyScore: 0,
      perspectiveScore: 0,
      timeRemainingSeconds,
      speedBonus: 0,
    };
  }

  const targetEdges = shadowData.targetEdges;

  // Descomponer trazos continuos si hay esquinas
  const decomposedStrokes: UserStroke[] = [];
  strokes.forEach((s) => {
    if (s.points.length < 2) return;
    const subPointArrays = splitStrokeAtCorners(s.points);
    subPointArrays.forEach((pts) => {
      if (pts.length >= 2) {
        decomposedStrokes.push({ points: pts });
      }
    });
  });

  const validStrokes = decomposedStrokes.filter((s) => {
    const p1 = s.points[0];
    const p2 = s.points[s.points.length - 1];
    return dist(p1, p2) > 15;
  });

  if (validStrokes.length === 0) {
    return {
      score: 0,
      totalScore: 0,
      passed: false,
      strokeCount: 0,
      expectedEdgeCount: targetEdges.length,
      angleErrors: [],
      mainIssueMessage: 'Trazos demasiado cortos.',
      tipMessage: 'Traza con decisión desde la base del cubo hacia los puntos de sombra.',
      matchedEdges: [],
      straightnessScore: 0,
      vertexAccuracyScore: 0,
      perspectiveScore: 0,
      timeRemainingSeconds,
      speedBonus: 0,
    };
  }

  // 1. Coincidencia de aristas de contorno de sombra
  let matchedTargetCount = 0;
  let totalAngleErrorDeg = 0;
  const matchedEdgesInfo: {
    targetEdge: Edge;
    userStart: Point2D;
    userEnd: Point2D;
    errorScore: number;
  }[] = [];

  targetEdges.forEach((target) => {
    let bestDist = Infinity;
    let bestStroke: { start: Point2D; end: Point2D } = { start: target.start, end: target.end };
    let bestAngleDiff = 0;

    validStrokes.forEach((stroke) => {
      const pStart = stroke.points[0];
      const pEnd = stroke.points[stroke.points.length - 1];

      // Probar orientación directa e inversa
      const dDirect = (dist(pStart, target.start) + dist(pEnd, target.end)) / 2;
      const dReverse = (dist(pStart, target.end) + dist(pEnd, target.start)) / 2;
      const minD = Math.min(dDirect, dReverse);

      const targetAngle = segmentAngle(target.start, target.end);
      const strokeAngle = segmentAngle(pStart, pEnd);
      const angleDiff = minAngleDiff(targetAngle, strokeAngle);

      if (minD < bestDist) {
        bestDist = minD;
        bestStroke = { start: pStart, end: pEnd };
        bestAngleDiff = angleDiff;
      }
    });

    // Margen de tolerancia generoso para reconocer la sombra trazada libremente
    if (bestDist <= 38) {
      matchedTargetCount++;
      totalAngleErrorDeg += (bestAngleDiff * 180) / Math.PI;
      matchedEdgesInfo.push({
        targetEdge: { start: 0, end: 1, family: 'depth' as const },
        userStart: bestStroke.start,
        userEnd: bestStroke.end,
        errorScore: Math.round(bestDist),
      });
    }
  });

  // 2. Comprobar cuántos puntos caen dentro o sobre la zona de sombra proyectada
  let pointsInShadowZone = 0;
  let totalSamplePoints = 0;
  validStrokes.forEach((stroke) => {
    stroke.points.forEach((pt) => {
      totalSamplePoints++;
      const distToEdges = Math.min(
        ...targetEdges.map((e) => distPointToSegment(pt, e.start, e.end))
      );
      if (distToEdges <= 36) {
        pointsInShadowZone++;
      }
    });
  });

  const edgeCoverageRatio = targetEdges.length > 0 ? matchedTargetCount / targetEdges.length : 0;
  const zoneAccuracyRatio = totalSamplePoints > 0 ? pointsInShadowZone / totalSamplePoints : 0;

  const allShadowEdgesMatched = matchedTargetCount === targetEdges.length;
  // Puntuación base: 70% por aristas del contorno + 30% por coherencia de zona en el suelo
  const rawScore = Math.round(edgeCoverageRatio * 70 + zoneAccuracyRatio * 30);
  let score = Math.min(100, Math.max(0, rawScore));
  if (!allShadowEdgesMatched) {
    score = 0;
  }
  const passed = score >= 70 && allShadowEdgesMatched;

  // Bonus de velocidad si está aprobado
  let speedBonus = 0;
  let totalScore = score;
  if (passed && timeRemainingSeconds !== undefined && timeRemainingSeconds > 0) {
    const rawBonus = (timeRemainingSeconds / 30) * 10;
    speedBonus = Math.round(rawBonus * 10) / 10;
    totalScore = Math.min(100, Math.round((score + speedBonus) * 10) / 10);
  }

  let mainIssueMessage = '';
  let tipMessage = '';

  if (passed) {
    mainIssueMessage = '¡Excelente sombra en perspectiva!';
    tipMessage = 'Has proyectado con rigor la silueta sobre el plano horizontal usando el foco L y su base L\'.';
  } else if (!allShadowEdgesMatched) {
    const missingShadowCount = targetEdges.length - matchedTargetCount;
    mainIssueMessage = `Sombra incompleta: falta${missingShadowCount > 1 ? 'n' : ''} ${missingShadowCount} arista${missingShadowCount > 1 ? 's' : ''} de contorno.`;
    tipMessage = 'Debes trazar todas las aristas que forman la silueta de la sombra en el suelo. Si falta alguna arista, la sombra no se cierra (0%).';
  } else {
    mainIssueMessage = 'Las líneas no coinciden con la proyección del foco L.';
    tipMessage = 'Traza líneas desde la base del cubo (proyectadas desde L\') y conéctalas donde corten los rayos del foco L.';
  }

  return {
    score,
    totalScore,
    passed,
    strokeCount: strokes.length,
    expectedEdgeCount: targetEdges.length,
    angleErrors: [totalAngleErrorDeg],
    mainIssueMessage,
    tipMessage,
    matchedEdges: matchedEdgesInfo,
    straightnessScore: Math.round(zoneAccuracyRatio * 100),
    vertexAccuracyScore: Math.round(edgeCoverageRatio * 100),
    perspectiveScore: score,
    timeRemainingSeconds,
    speedBonus,
  };
}


