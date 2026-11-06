/**
 * Motor de Evaluación y Puntuación Riguroso para Lab 3D
 * Compara los trazos del usuario contra las curvas objetivo proyectadas en perspectiva 3D.
 * 
 * Características clave:
 * 1. Alineación direccional por cosenos de tangentes (|cos theta| >= 0.65): evita que trazos verticales
 *    crucen elipses horizontales y sumen aciertos indebidos.
 * 2. Umbral de proximidad MATCH_THRESHOLD calibrado a 18.0px (penaliza líneas paralelas o divergentes
 *    que no convergen hacia los puntos de fuga).
 * 3. Integridad estructural curva a curva: evalúa cada contorno independientemente. Si una arista
 *    o elipse esencial queda sin dibujar (< 35% de cobertura), la figura se penaliza drásticamente
 *    (tope en Grado D / C-) y se identifica explícitamente en el mensaje de feedback didáctico.
 */

import {
  Point2D,
  CurveSegment2D,
  UserStroke3D,
  EvaluationResult3D,
  GradeLevel,
  CurveEvaluationDetail,
} from './types';

function distSq(p1: Point2D, p2: Point2D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return dx * dx + dy * dy;
}

function dist(p1: Point2D, p2: Point2D): number {
  return Math.sqrt(distSq(p1, p2));
}

function pointToSegmentDistance(p: Point2D, a: Point2D, b: Point2D): number {
  const l2 = distSq(a, b);
  if (l2 < 0.0001) return dist(p, a);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}

interface UserSegment {
  a: Point2D;
  b: Point2D;
  mid: Point2D;
  dir: Point2D; // Vector unitario de dirección
  length: number;
  assignedCurveIds: string[]; // IDs de curvas objetivo a las que se asigna exclusivamente
}

function computeCurveLength(points: Point2D[]): number {
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) {
    len += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
  }
  return len;
}

function findDistanceAndTangentToCurve(
  p: Point2D,
  curvePoints: Point2D[],
  curveTangents: Point2D[]
): { dist: number; tangent: Point2D } {
  let bestDist = Infinity;
  let bestTangent: Point2D = { x: 1, y: 0 };

  for (let i = 0; i < curvePoints.length - 1; i++) {
    const pA = curvePoints[i];
    const pB = curvePoints[i + 1];
    const d = pointToSegmentDistance(p, pA, pB);
    if (d < bestDist) {
      bestDist = d;
      bestTangent = curveTangents[i] || { x: 1, y: 0 };
    }
  }

  return { dist: bestDist, tangent: bestTangent };
}

/**
 * Calcula los vectores unitarios tangentes en cada punto de una curva objetivo.
 * Detecta si la curva es un ciclo cerrado (elipse, anillo) para envolver los extremos suavemente.
 */
function computeCurveTangents(points: Point2D[]): Point2D[] {
  const n = points.length;
  if (n === 0) return [];
  if (n === 1) return [{ x: 1, y: 0 }];

  // Si el primer y último punto están a menos de 5px, tratamos como ciclo cerrado
  const isClosed = distSq(points[0], points[n - 1]) < 25;

  const tangents: Point2D[] = new Array(n);
  for (let i = 0; i < n; i++) {
    let prev: Point2D;
    let next: Point2D;

    if (i === 0) {
      prev = isClosed ? points[n - 2] : points[0];
      next = points[1];
    } else if (i === n - 1) {
      prev = points[n - 2];
      next = isClosed ? points[1] : points[n - 1];
    } else {
      prev = points[i - 1];
      next = points[i + 1];
    }

    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy);
    if (len > 0.0001) {
      tangents[i] = { x: dx / len, y: dy / len };
    } else {
      tangents[i] = { x: 1, y: 0 };
    }
  }
  return tangents;
}

export function evaluate3DSubmission(
  userStrokes: UserStroke3D[],
  targetCurves: CurveSegment2D[]
): EvaluationResult3D {
  // Filtrar exclusivamente los trazos evaluables de la forma:
  // Las líneas de construcción auxiliares del usuario se ignoran en la evaluación
  const evaluableStrokes = userStrokes.filter((s) => !s.isConstruction);

  // Si no hay trazos evaluables de la forma
  if (evaluableStrokes.length === 0) {
    const emptyCurveDetails: CurveEvaluationDetail[] = targetCurves.map((c) => ({
      id: c.id,
      label: c.label || c.id,
      coverage: 0,
      precision: 0,
      score: 0,
      isCompleted: false,
      role: c.role || 'form',
    }));

    return {
      score: 0,
      passed: false,
      grade: 'D',
      feedbackMessage:
        userStrokes.length > 0
          ? 'Solo se han detectado líneas de construcción. Traza los contornos de la forma con la herramienta de forma/tinta.'
          : 'No se han detectado trazos: dibuja los contornos de la forma en perspectiva.',
      matchedSegments: [],
      missingSegments: targetCurves.map((c) => ({ points: c.points })),
      userStrokes,
      drawnCount: 0,
      targetCount: targetCurves.length,
      curveDetails: emptyCurveDetails,
    };
  }

  // Pre-aplanar los segmentos de todos los trazos evaluables de la forma
  const userSegments: UserSegment[] = [];
  let totalUserPoints = 0;
  let totalUserDrawnLength = 0;

  evaluableStrokes.forEach((s) => {
    totalUserPoints += s.points.length;
    for (let i = 0; i < s.points.length - 1; i++) {
      const a = s.points[i];
      const b = s.points[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = Math.hypot(dx, dy);
      if (length >= 0.5) {
        totalUserDrawnLength += length;
        userSegments.push({
          a,
          b,
          mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          dir: { x: dx / length, y: dy / length },
          length,
          assignedCurveIds: [],
        });
      }
    }
  });

  // Precalcular tangentes, longitudes y parámetros de cada curva objetivo
  const curveTangentsList: Point2D[][] = targetCurves.map((c) => computeCurveTangents(c.points));
  const curveLengths: number[] = targetCurves.map((c) => computeCurveLength(c.points));
  const curveThresholds: { matchThreshold: number; minAlignmentCos: number }[] = targetCurves.map((curve) => {
    const isCurved =
      curve.points.length > 24 ||
      curve.id.includes('ellipse') ||
      curve.id.includes('dome') ||
      curve.id.includes('ring') ||
      curve.id.includes('envelope') ||
      curve.id.includes('silhouette') ||
      curve.id.includes('meridian') ||
      curve.role === 'construction';

    return {
      matchThreshold: isCurved ? 24.0 : 22.0,
      minAlignmentCos: isCurved ? 0.60 : 0.65,
    };
  });

  // ASIGNACIÓN EXCLUSIVA DE SEGMENTOS:
  // Cada trazo del alumno debe asociarse a la arista objetivo con la que tiene mayor correspondencia
  // geométrica y angular. Esto evita que una línea vertical lateral de un cilindro satisfaga a la vez
  // la elipse superior, o que un amago de 18px cubra el 76% de un círculo.
  userSegments.forEach((seg) => {
    let bestCurveId: string | null = null;
    let bestFitness = 0;

    targetCurves.forEach((curve, idx) => {
      const { matchThreshold, minAlignmentCos } = curveThresholds[idx];
      const { dist: d, tangent } = findDistanceAndTangentToCurve(
        seg.mid,
        curve.points,
        curveTangentsList[idx]
      );

      if (d <= matchThreshold) {
        const dot = seg.dir.x * tangent.x + seg.dir.y * tangent.y;
        const absCos = Math.abs(dot);

        if (absCos >= minAlignmentCos) {
          const fitness = absCos / (1.0 + d / 4.0);
          if (fitness > bestFitness) {
            bestFitness = fitness;
            bestCurveId = curve.id;
          }
        }
      }
    });

    if (bestCurveId) {
      seg.assignedCurveIds.push(bestCurveId);

      // Si se encuentra en una unión o vértice exacto (distancia <= 8px y fitness cercano al óptimo),
      // se permite asistir a la arista adyacente para no penalizar vértices compartidos
      targetCurves.forEach((curve, idx) => {
        if (curve.id === bestCurveId) return;
        const { matchThreshold, minAlignmentCos } = curveThresholds[idx];
        const { dist: d, tangent } = findDistanceAndTangentToCurve(
          seg.mid,
          curve.points,
          curveTangentsList[idx]
        );

        if (d <= 8.0 && d <= matchThreshold) {
          const dot = seg.dir.x * tangent.x + seg.dir.y * tangent.y;
          const absCos = Math.abs(dot);
          if (absCos >= minAlignmentCos) {
            const fitness = absCos / (1.0 + d / 4.0);
            if (fitness >= bestFitness * 0.85) {
              seg.assignedCurveIds.push(curve.id);
            }
          }
        }
      });
    }
  });

  const matchedSegments: { points: Point2D[]; accuracy: number }[] = [];
  const missingSegments: { points: Point2D[] }[] = [];

  const curveDetails: CurveEvaluationDetail[] = [];
  let totalTargetSamplePoints = 0;
  let totalMatchedPoints = 0;
  let totalDistanceErrors = 0;

  targetCurves.forEach((curve, curveIdx) => {
    if (curve.points.length < 2) return;

    const { matchThreshold, minAlignmentCos } = curveThresholds[curveIdx];
    const tangents = curveTangentsList[curveIdx];
    const targetLength = curveLengths[curveIdx];

    // Obtener los segmentos de usuario que han sido asignados a esta curva
    const assignedSegments = userSegments.filter((s) => s.assignedCurveIds.includes(curve.id));
    const assignedLength = assignedSegments.reduce((sum, s) => sum + s.length, 0);

    // Límite físico: la cobertura no puede superar la longitud real trazada por el alumno para esta arista
    const maxPossibleCoverage =
      targetLength > 0 ? Math.min(1.0, (assignedLength + 1.5 * matchThreshold) / targetLength) : 1.0;

    let curveMatchedCount = 0;
    let curveDistanceErrorSum = 0;

    let currentSegment: Point2D[] = [];
    let currentIsMatched: boolean | null = null;

    curve.points.forEach((targetPt, ptIdx) => {
      totalTargetSamplePoints++;
      const targetTangent = tangents[ptIdx];

      // Buscar distancia mínima únicamente entre segmentos asignados a esta curva
      let bestDist = Infinity;

      for (let j = 0; j < assignedSegments.length; j++) {
        const seg = assignedSegments[j];
        const d = pointToSegmentDistance(targetPt, seg.a, seg.b);

        if (d <= matchThreshold) {
          const dot = targetTangent.x * seg.dir.x + targetTangent.y * seg.dir.y;
          const absCos = Math.abs(dot);

          if (absCos >= minAlignmentCos) {
            if (d < bestDist) {
              bestDist = d;
              if (bestDist < 2.0) break; // Optimización de salida temprana
            }
          }
        }
      }

      const isMatched = bestDist <= matchThreshold;

      if (isMatched) {
        totalMatchedPoints++;
        totalDistanceErrors += bestDist;
        curveMatchedCount++;
        curveDistanceErrorSum += bestDist;
      }

      // Agrupación contigua en segmentos para el renderizado coloreado (Verde / Rojo)
      if (currentIsMatched === null) {
        currentIsMatched = isMatched;
        currentSegment.push(targetPt);
      } else if (currentIsMatched === isMatched) {
        currentSegment.push(targetPt);
      } else {
        if (currentSegment.length > 1) {
          if (currentIsMatched) {
            matchedSegments.push({ points: currentSegment, accuracy: 1.0 });
          } else {
            missingSegments.push({ points: currentSegment });
          }
        }
        currentSegment = [currentSegment[currentSegment.length - 1], targetPt];
        currentIsMatched = isMatched;
      }
    });

    if (currentSegment.length > 1) {
      if (currentIsMatched) {
        matchedSegments.push({ points: currentSegment, accuracy: 1.0 });
      } else {
        missingSegments.push({ points: currentSegment });
      }
    }

    // Métricas específicas de esta curva individual
    const curveTotal = curve.points.length;
    const rawCoverage = curveTotal > 0 ? curveMatchedCount / curveTotal : 0;
    // Cobertura real acotada por la longitud efectiva de trazos dedicados a esta curva
    const curveCoverage = Math.min(rawCoverage, maxPossibleCoverage);
    const curveAvgDist = curveMatchedCount > 0 ? curveDistanceErrorSum / curveMatchedCount : matchThreshold;

    // Precisión no lineal calibrada para trazo manual libre en pantalla táctil / tableta:
    // Trazos precisos (< 5px) obtienen precisión >= 0.85
    // Trazos con leve oscilación manual (~8-11px) obtienen precisión ~0.60 - 0.75
    // Trazos que se desvían de la perspectiva real (> 16px) decaen a < 0.40
    const curvePrecision = Math.max(0, 1 - Math.pow(curveAvgDist / matchThreshold, 1.25));

    // Puntuación de la curva (0 - 100):
    const curveScore = curveCoverage * 100 * Math.pow(curvePrecision, 1.05);

    // Se considera completada si tiene al menos 55% de cobertura y 40% de precisión geométrica
    const isCompleted = curveCoverage >= 0.55 && curvePrecision >= 0.40;

    curveDetails.push({
      id: curve.id,
      label: curve.label || curve.id,
      coverage: curveCoverage,
      precision: curvePrecision,
      score: Math.round(curveScore * 10) / 10,
      isCompleted,
      role: curve.role || 'form',
    });
  });

  // Separar curvas de la Forma (siluetas y aristas visibles esenciales) vs Curvas de Construcción (meridianos, secciones)
  const formCurves = curveDetails.filter((c) => c.role !== 'construction');
  const constructionCurves = curveDetails.filter((c) => c.role === 'construction');

  // Aristas de la forma omitidas o gravemente defectuosas (< 35% de cobertura o nota mínima < 30)
  const missingFormCurves = formCurves.filter((c) => c.coverage < 0.35 || (c.coverage < 0.50 && c.score < 30));
  const avgFormScore =
    formCurves.length > 0
      ? formCurves.reduce((sum, c) => sum + c.score, 0) / formCurves.length
      : 0;

  // Evaluación de Líneas de Construcción:
  // En esferas o toroides, el usuario dibuja líneas de soporte para proyectar el volumen.
  // No se requiere dibujar TODAS las secciones generadas:
  // - Para esfera (2 meridianos): dibujar 1 meridiano satisface el requisito de construcción.
  // - Para toroide/anillo (4+ secciones): dibujar 2 secciones satisface el requisito.
  let avgConstructionScore = 0;
  const hasConstruction = constructionCurves.length > 0;

  if (hasConstruction) {
    const sortedConstruction = [...constructionCurves].sort((a, b) => b.score - a.score);
    const requiredCount = Math.min(
      constructionCurves.length,
      constructionCurves.length >= 4 ? 2 : 1
    );
    const topConstruction = sortedConstruction.slice(0, requiredCount);
    avgConstructionScore =
      topConstruction.reduce((sum, c) => sum + c.score, 0) / requiredCount;
  }

  // Ponderación de la Nota:
  // - Si la figura tiene líneas de construcción: 70% siluetas/aristas de la forma + 30% líneas de construcción
  // - Si no tiene líneas de construcción (poliedros, cilindros): 100% aristas de la forma
  let rawScore = hasConstruction
    ? avgFormScore * 0.70 + avgConstructionScore * 0.30
    : avgFormScore;

  // Penalización leve por exceso masivo de garabateo descontrolado
  const totalTargetLength = curveLengths.reduce((sum, l) => sum + l, 0);
  const excessFactor = totalTargetLength > 0 && totalUserDrawnLength > totalTargetLength * 3.5 ? 0.90 : 1.0;
  rawScore *= excessFactor;

  // CONTROL DE INTEGRIDAD ESTRUCTURAL (exclusivo para aristas de la FORMA):
  // Si falta una arista o tapa de la forma visible (< 35% cobertura), no se puede aprobar.
  if (missingFormCurves.length > 0) {
    if (missingFormCurves.length >= 2) {
      rawScore = Math.min(rawScore, 30.0);
    } else {
      rawScore = Math.min(rawScore, 48.0);
    }
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));
  const passed = finalScore >= 70;

  // Asignación de Calificación por Letra (mantenida internamente por compatibilidad)
  let grade: GradeLevel = 'D';
  if (finalScore >= 90 && missingFormCurves.length === 0) grade = 'S';
  else if (finalScore >= 80 && missingFormCurves.length === 0) grade = 'A';
  else if (finalScore >= 65 && missingFormCurves.length === 0) grade = 'B';
  else if (finalScore >= 50) grade = 'C';
  else grade = 'D';

  const completedCurvesCount = curveDetails.filter((c) => c.isCompleted).length;
  const overallCoverage = totalTargetSamplePoints > 0 ? totalMatchedPoints / totalTargetSamplePoints : 0;
  const avgPrecision = curveDetails.length > 0 ? curveDetails.reduce((sum, c) => sum + c.precision, 0) / curveDetails.length : 0;

  // Mensaje de diagnóstico didáctico en español
  let feedbackMessage = '';
  if (completedCurvesCount === 0 || overallCoverage < 0.15) {
    feedbackMessage = 'No se han detectado trazos suficientes. Dibuja los contornos de la figura en perspectiva.';
  } else if (missingFormCurves.length > 0) {
    if (missingFormCurves.length === 1) {
      feedbackMessage = `Figura incompleta: falta dibujar "${missingFormCurves[0].label}" (en rojo).`;
    } else {
      feedbackMessage = `Figura incompleta: faltan ${missingFormCurves.length} contornos esenciales (en rojo).`;
    }
  } else if (hasConstruction && avgConstructionScore < 40) {
    feedbackMessage = 'Forma dibujada. Traza las líneas de construcción (meridianos / secciones) para consolidar el volumen 3D.';
  } else if (avgPrecision < 0.50) {
    feedbackMessage = 'Perspectiva desalineada: los trazos no convergen correctamente a los puntos de fuga.';
  } else if (overallCoverage < 0.70) {
    feedbackMessage = 'Figura parcial: completa el recorrido entero de cada contorno en perspectiva.';
  } else if (finalScore >= 90) {
    feedbackMessage = '¡Construcción en perspectiva impecable! Convergencia exacta a los puntos de fuga.';
  } else if (finalScore >= 80) {
    feedbackMessage = '¡Gran ejecución de perspectiva! Buena alineación espacial y proporciones.';
  } else if (finalScore >= 70) {
    feedbackMessage = 'Aprobado. Intuición espacial correcta; afina la convergencia para mayor solidez.';
  } else {
    feedbackMessage = 'Los trazos se alejan de la perspectiva real: ajusta la fuga y proporción hacia la retícula 3D.';
  }

  return {
    score: finalScore,
    passed,
    grade,
    feedbackMessage,
    matchedSegments,
    missingSegments,
    userStrokes,
    drawnCount: completedCurvesCount,
    targetCount: targetCurves.length,
    curveDetails,
  };
}
