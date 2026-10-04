import { RawStroke, ProceduralStrokeChallenge, StrokeEvaluation, StrokeDirection } from './strokeTypes';
import { AvatarMood } from './avatarTypes';
import { analyzeStrokeKinematics, recordStrokeSpeed } from './strokeKinematics';

/**
 * Distancia euclídea entre dos puntos
 */
function dist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Distancia perpendicular de un punto P al segmento A-B
 */
function distPointToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const l2 = (bx - ax) * (bx - ax) + (by - ay) * (by - ay);
  if (l2 === 0) return dist(px, py, ax, ay);
  let t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist(px, py, ax + t * (bx - ax), ay + t * (by - ay));
}

/**
 * Mide la rectitud de un trazo individual (desviación de sagita)
 */
function evaluateStrokeStraightness(stroke: RawStroke): number {
  if (stroke.points.length < 3) return 100;
  const pStart = stroke.points[0];
  const pEnd = stroke.points[stroke.points.length - 1];
  const length = dist(pStart.x, pStart.y, pEnd.x, pEnd.y);
  if (length < 15) return 90;

  let maxDev = 0;
  let sumDev = 0;
  for (let i = 1; i < stroke.points.length - 1; i++) {
    const d = distPointToSegment(
      stroke.points[i].x,
      stroke.points[i].y,
      pStart.x,
      pStart.y,
      pEnd.x,
      pEnd.y
    );
    if (d > maxDev) maxDev = d;
    sumDev += d;
  }
  const avgDev = sumDev / (stroke.points.length - 2);

  // Sagita menor a 2.5px es excelente (100)
  const score = Math.max(0, 100 - avgDev * 12 - maxDev * 4);
  return Math.min(100, score);
}

/**
 * Calcula el ángulo en grados de un trazo (de 0° a 180° no orientado)
 */
function getStrokeAngleDeg(stroke: RawStroke): number {
  const p1 = stroke.points[0];
  const p2 = stroke.points[stroke.points.length - 1];
  let angle = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
  if (angle < 0) angle += 180;
  return angle;
}

/**
 * Evalúa el paralelismo y la consistencia angular entre trazos
 */
function evaluateAnglesAndParallelism(
  strokes: RawStroke[],
  targetAngleDeg?: number
): { parallelismScore: number; avgAngleDeg: number; angleVariance: number } {
  if (strokes.length < 2) {
    return { parallelismScore: 80, avgAngleDeg: targetAngleDeg || 90, angleVariance: 0 };
  }

  const angles = strokes.map(getStrokeAngleDeg);
  let sum = 0;
  for (const a of angles) sum += a;
  const avgAngle = sum / angles.length;

  let variance = 0;
  for (const a of angles) {
    let diff = Math.abs(a - avgAngle);
    if (diff > 90) diff = 180 - diff;
    variance += diff * diff;
  }
  const stdDev = Math.sqrt(variance / angles.length);

  // Puntuación de paralelismo interno
  let internalScore = Math.max(0, 100 - stdDev * 8);

  // Si hay un ángulo diana, contrastar también con el objetivo
  if (targetAngleDeg !== undefined) {
    let targetDiff = Math.abs(avgAngle - targetAngleDeg);
    if (targetDiff > 90) targetDiff = 180 - targetDiff;
    const targetScore = Math.max(0, 100 - targetDiff * 4);
    internalScore = internalScore * 0.65 + targetScore * 0.35;
  }

  return {
    parallelismScore: Math.round(Math.min(100, internalScore)),
    avgAngleDeg: Math.round(avgAngle * 10) / 10,
    angleVariance: Math.round(stdDev * 10) / 10,
  };
}

/**
 * Evalúa el espaciado y ritmo entre trazos consecutivos
 */
function evaluateSpacing(
  strokes: RawStroke[],
  targetSpacingPx: number
): { spacingScore: number; avgSpacingPx: number; spacingStdDev: number } {
  if (strokes.length < 3) {
    return { spacingScore: 75, avgSpacingPx: targetSpacingPx, spacingStdDev: 0 };
  }

  // Proyectar el centroide de cada trazo sobre el eje perpendicular
  const avgAngle = getStrokeAngleDeg(strokes[0]);
  const perpRad = ((avgAngle + 90) * Math.PI) / 180;

  const centers = strokes.map((s) => {
    let sx = 0;
    let sy = 0;
    for (const p of s.points) {
      sx += p.x;
      sy += p.y;
    }
    const cx = sx / s.points.length;
    const cy = sy / s.points.length;
    // Proyección escalar
    const proj = cx * Math.cos(perpRad) + cy * Math.sin(perpRad);
    return { cx, cy, proj };
  });

  centers.sort((a, b) => a.proj - b.proj);

  const deltas: number[] = [];
  for (let i = 0; i < centers.length - 1; i++) {
    deltas.push(centers[i + 1].proj - centers[i].proj);
  }

  const sumD = deltas.reduce((acc, v) => acc + v, 0);
  const avgD = sumD / deltas.length;

  let varD = 0;
  for (const d of deltas) {
    varD += (d - avgD) * (d - avgD);
  }
  const stdD = Math.sqrt(varD / deltas.length);

  // Coeficiente de variación: CV = std / avg
  const cv = avgD > 0 ? stdD / avgD : 1;
  const consistencyScore = Math.max(0, 100 - cv * 180);

  // Proximidad al objetivo
  const targetDiff = Math.abs(avgD - targetSpacingPx) / targetSpacingPx;
  const targetAccuracy = Math.max(0, 100 - targetDiff * 80);

  const finalSpacingScore = Math.round(consistencyScore * 0.7 + targetAccuracy * 0.3);

  return {
    spacingScore: Math.min(100, Math.max(0, finalSpacingScore)),
    avgSpacingPx: Math.round(avgD * 10) / 10,
    spacingStdDev: Math.round(stdD * 10) / 10,
  };
}

/**
 * Calcula la densidad óptica de tinta dentro de un polígono 2D
 */
export function calculateOpticalDensity(
  strokes: RawStroke[],
  polygonVertices: { x: number; y: number }[],
  canvasWidth = 640,
  canvasHeight = 520
): number {
  if (typeof document === 'undefined' || strokes.length === 0) return 0;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 0;

    // 1. Limpiar en blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. Definir máscara poligonal
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(polygonVertices[0].x, polygonVertices[0].y);
    for (let i = 1; i < polygonVertices.length; i++) {
      ctx.lineTo(polygonVertices[i].x, polygonVertices[i].y);
    }
    ctx.closePath();
    ctx.clip();

    // 3. Dibujar los trazos del usuario dentro de la máscara
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const s of strokes) {
      if (s.points.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y);
      }
      ctx.stroke();
    }
    ctx.restore();

    // 4. Muestrear los píxeles dentro del bounding box del polígono
    let minX = canvasWidth;
    let maxX = 0;
    let minY = canvasHeight;
    let maxY = 0;
    for (const v of polygonVertices) {
      if (v.x < minX) minX = Math.floor(v.x);
      if (v.x > maxX) maxX = Math.ceil(v.x);
      if (v.y < minY) minY = Math.floor(v.y);
      if (v.y > maxY) maxY = Math.ceil(v.y);
    }

    minX = Math.max(0, minX);
    maxX = Math.min(canvasWidth - 1, maxX);
    minY = Math.max(0, minY);
    maxY = Math.min(canvasHeight - 1, maxY);

    const w = maxX - minX;
    const h = maxY - minY;
    if (w <= 0 || h <= 0) return 0;

    const imgData = ctx.getImageData(minX, minY, w, h);
    const data = imgData.data;

    let inkedPixels = 0;
    let polygonPixels = 0;

    // Canvas auxiliar para comprobar pertenencia al polígono
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvasWidth;
    maskCanvas.height = canvasHeight;
    const mctx = maskCanvas.getContext('2d');
    if (!mctx) return 0;
    mctx.fillStyle = '#000000';
    mctx.beginPath();
    mctx.moveTo(polygonVertices[0].x, polygonVertices[0].y);
    for (let i = 1; i < polygonVertices.length; i++) {
      mctx.lineTo(polygonVertices[i].x, polygonVertices[i].y);
    }
    mctx.closePath();
    mctx.fill();
    const maskData = mctx.getImageData(minX, minY, w, h).data;

    for (let i = 0; i < data.length; i += 4) {
      if (maskData[i + 3] > 128) {
        polygonPixels++;
        // Píxel oscuro (tinta)
        if (data[i] < 180) {
          inkedPixels++;
        }
      }
    }

    return polygonPixels > 0 ? (inkedPixels / polygonPixels) * 100 : 0;
  } catch {
    return 20; // Fallback seguro
  }
}

/**
 * Evaluación instantánea de Calistenia de Trazo Único (Línea o Curva)
 */
export function evaluateSingleStrokeSubmission(
  strokes: RawStroke[],
  challenge: ProceduralStrokeChallenge
): StrokeEvaluation {
  if (strokes.length === 0 || strokes[0].points.length === 0) {
    return {
      overallScore: 0,
      passed: false,
      isSingleStroke: true,
      metrics: {
        parallelismScore: 0,
        spacingScore: 0,
        straightnessScore: 0,
        tonalDensityScore: 0,
        boundaryScore: 0,
      },
      detectedStats: {
        strokeCount: 0,
        measuredAvgSpacingPx: 0,
        spacingVariance: 0,
        measuredAvgAngleDeg: 0,
        measuredOpticalDensityPct: 0,
      },
      feedbackTitle: 'Sin trazo detectado',
      feedbackMessage: 'Dibuja una línea o curva para evaluar.',
      tipMessage: 'Pulsa y arrastra desde el punto ① hacia el ②.',
    };
  }

  const userStroke = strokes[0];
  const pts = userStroke.points;
  const userStart = pts[0];
  const userEnd = pts[pts.length - 1];

  const keyPoints = challenge.keyPoints || [];
  const targetStart = keyPoints[0] || { x: 0, y: 0 };
  const targetEnd = keyPoints[keyPoints.length - 1] || { x: 100, y: 100 };

  // 1. Vector diana ideal (del punto 1 al punto 2)
  const targetDx = targetEnd.x - targetStart.x;
  const targetDy = targetEnd.y - targetStart.y;
  let targetVectorAngleDeg = (Math.atan2(targetDy, targetDx) * 180) / Math.PI;
  if (targetVectorAngleDeg < 0) targetVectorAngleDeg += 360;

  // 2. Vector real del usuario (de inicio a fin del trazo)
  const userDx = userEnd.x - userStart.x;
  const userDy = userEnd.y - userStart.y;
  let userAngleDeg = (Math.atan2(userDy, userDx) * 180) / Math.PI;
  if (userAngleDeg < 0) userAngleDeg += 360;

  let angleDiff = Math.abs(userAngleDeg - targetVectorAngleDeg);
  if (angleDiff > 180) angleDiff = 360 - angleDiff;
  let parallelismScore = Math.round(Math.max(0, 100 - angleDiff * 3.2));

  // 3. Verificación de dirección biomecánica (¿trazó de ① hacia ②, o al revés?)
  const distStartTo1 = Math.hypot(userStart.x - targetStart.x, userStart.y - targetStart.y);
  const distStartTo2 = Math.hypot(userStart.x - targetEnd.x, userStart.y - targetEnd.y);
  const distEndTo2 = Math.hypot(userEnd.x - targetEnd.x, userEnd.y - targetEnd.y);
  const distEndTo1 = Math.hypot(userEnd.x - targetStart.x, userEnd.y - targetStart.y);

  // Es invertido si empezó cerca de ② y terminó cerca de ①, o si el vector apunta en sentido opuesto (>90°)
  let isReversed = false;
  if ((distStartTo2 < distStartTo1 && distEndTo1 < distEndTo2) || angleDiff > 90) {
    isReversed = true;
  }

  // 4. Puntería en los puntos diana (Inicio en ① y Fin en ②)
  const startErr = isReversed ? distStartTo2 : distStartTo1;
  const endErr = isReversed ? distEndTo1 : distEndTo2;
  const avgEndpointErr = (startErr + endErr) / 2;
  // Margen de gracia de 6px; después penalización firme
  let boundaryScore = Math.round(
    Math.max(0, 100 - Math.max(0, avgEndpointErr - 6) * 2.4)
  );

  // 5. Rectitud / Curvatura
  let straightnessScore = 100;
  let maxPerpDev = 0;
  let sumDev = 0;
  const isCurve = challenge.category === 'single_stroke_curve';

  if (!isCurve) {
    for (let i = 1; i < pts.length - 1; i++) {
      const d = distPointToSegment(pts[i].x, pts[i].y, targetStart.x, targetStart.y, targetEnd.x, targetEnd.y);
      if (d > maxPerpDev) maxPerpDev = d;
      sumDev += d;
    }
    const avgDev = pts.length > 2 ? sumDev / (pts.length - 2) : 0;
    // Si la sagita supera 12px penaliza sensiblemente
    straightnessScore = Math.round(Math.max(0, 100 - avgDev * 5 - maxPerpDev * 2.8));
  } else {
    const ideal = challenge.idealPath || [];
    if (ideal.length > 0) {
      let totalDist = 0;
      for (const p of pts) {
        let minDist = Infinity;
        for (const ip of ideal) {
          const d = Math.hypot(p.x - ip.x, p.y - ip.y);
          if (d < minDist) minDist = d;
        }
        totalDist += minDist;
      }
      const avgCurveDist = totalDist / pts.length;
      straightnessScore = Math.round(Math.max(0, 100 - avgCurveDist * 2.8));
    }
  }

  // 6. Cálculo Global Ponderado
  let overallScore = Math.round(
    boundaryScore * 0.40 + straightnessScore * 0.35 + parallelismScore * 0.25
  );
  let directionWarning: string | undefined;

  if (isReversed) {
    overallScore = 0;
    boundaryScore = 0;
    straightnessScore = 0;
    parallelismScore = 0;
    directionWarning = '⚠️ DIRECCIÓN INVERTIDA: Has trazado en sentido contrario (de ② hacia ①). Debes iniciar en ① y proyectar hacia ②.';
  }

  // Criterios estrictos de aprobación (evitar falsos positivos)
  let passed = overallScore >= 70;
  if (isReversed) {
    passed = false;
  }
  // No se aprueba si erró excesivamente los puntos diana o se torció
  if (startErr > 38 || endErr > 44) {
    passed = false;
  }
  if (!isCurve && angleDiff > 20) {
    passed = false;
  }
  if (!isCurve && straightnessScore < 60) {
    passed = false;
  }

  // 7. Análisis Cinemático y Derivadas (Velocidad, Aceleración, Fluidez y Fase)
  const activePhase = challenge.activePhase || 1;
  const directionKey =
    challenge.directionKey || (challenge.category === 'single_stroke_curve' ? 'curve_c' : 'general');
  const kinematics = analyzeStrokeKinematics(
    userStroke,
    directionKey,
    activePhase,
    challenge.targetLengthPx || 220
  );

  // Si no está invertido y tiene un anclaje razonable, registrar la velocidad para nutrir el perfil adaptativo del usuario
  if (!isReversed && boundaryScore >= 60) {
    recordStrokeSpeed(directionKey, kinematics.avgSpeedPxPerSec);
  }

  // La fase se aprueba si cumple tanto la geometría como el criterio de velocidad/fluidez de su fase
  const phasePassed = passed && kinematics.phasePassed;

  let feedbackTitle = '¡Buen Trazo!';
  let feedbackMessage = `Puntería: ${boundaryScore}%, Rectitud: ${straightnessScore}%, Ángulo: ${parallelismScore}%.`;
  let tipMessage = 'Mantén la velocidad de trazo constante sin titubeos.';
  let avatarMood: AvatarMood = 'wink';

  if (isReversed) {
    feedbackTitle = 'Dirección Invertida 🔄';
    feedbackMessage = directionWarning || 'Inicia siempre en el punto ① y termina en el ②.';
    tipMessage = 'Observa el número 1 antes de apoyar el lápiz.';
    avatarMood = 'fail-spiral';
  } else if (!passed) {
    if (overallScore >= 50) {
      feedbackTitle = 'Cerca de la Diana 🏹';
      feedbackMessage = `Desviación en extremos (error: ${Math.round(avgEndpointErr)}px) o ángulo desviado (${Math.round(angleDiff)}°).`;
      tipMessage = 'Haz 1 o 2 pasadas en el aire antes de tocar la pantalla (Ghosting).';
      avatarMood = 'curious';
    } else {
      feedbackTitle = 'Desviación en Trayectoria 💨';
      feedbackMessage = `El trazo se desvió del objetivo (${overallScore}%).`;
      tipMessage = 'Fija la mirada en el punto ② antes de iniciar el movimiento en ①.';
      avatarMood = 'fail-spiral';
    }
  } else if (!kinematics.phasePassed) {
    // Geometría aprobada, pero no cumplió la velocidad/fluidez requerida para esta fase
    if (activePhase === 2) {
      feedbackTitle = 'Línea Precisa pero Falta Fluidez 〰️';
      feedbackMessage = `${kinematics.speedDiagnosisLabel}. Fluidez: ${kinematics.fluencyScore}%. ${kinematics.phaseRequirementText}.`;
      tipMessage = 'Bloquea la muñeca y mueve el antebrazo en un único impulso sin corregir a mitad de camino.';
      avatarMood = 'curious';
    } else if (activePhase === 3) {
      feedbackTitle = 'Buena Línea pero Requiere Velocidad ⚡';
      feedbackMessage = `Velocidad: ${kinematics.avgSpeedPxPerSec} px/s (${kinematics.speedDiagnosisLabel}). ${kinematics.phaseRequirementText}.`;
      tipMessage = 'Proyecta el movimiento con dos pasadas rápidas en el aire y dispara sin miedo a fallar.';
      avatarMood = 'wink';
    }
  } else {
    // Fase plenamente superada (Geometría + Cinemática)
    if (activePhase === 1) {
      feedbackTitle = '¡Fase 1 Superada: Puntería Diáfana! 🎯';
      feedbackMessage = `Anclaje exacto (${boundaryScore}% puntería). ${kinematics.durationMs}ms a ${kinematics.avgSpeedPxPerSec} px/s.`;
      tipMessage = '¡Excelente! Ahora avanza a la Fase 2 (Fluidez) para mecanizar el ritmo.';
      avatarMood = overallScore >= 90 ? 'success-stars' : 'wink';
    } else if (activePhase === 2) {
      feedbackTitle = '¡Fase 2 Superada: Ritmo & Fluidez! 〰️';
      feedbackMessage = `Trazo continuo sin titubeos (Fluidez: ${kinematics.fluencyScore}%, ${kinematics.avgSpeedPxPerSec} px/s).`;
      tipMessage = '¡Gran soltura! Listo para la Fase 3: Disparo balístico a máxima velocidad.';
      avatarMood = 'success-stars';
    } else {
      feedbackTitle = '¡Fase 3 Dominada: Velocidad Pura! ⚡';
      feedbackMessage = `Trazo balístico magistral (${kinematics.avgSpeedPxPerSec} px/s, ${kinematics.durationMs}ms) sin perder puntería (${boundaryScore}%).`;
      tipMessage = '¡Memoria muscular forjada! Tienes este ángulo dominado en todos los registros.';
      avatarMood = 'success-stars';
    }
  }

  return {
    overallScore,
    passed,
    isSingleStroke: true,
    isReversed,
    directionWarning,
    currentPhase: activePhase,
    phasePassed,
    kinematics,
    solutionOverlay: {
      points: challenge.idealPath || [],
      color: '#000000', // Estricto blanco y negro
      label: 'Solución Guía',
    },
    metrics: {
      parallelismScore,
      spacingScore: 100,
      straightnessScore,
      tonalDensityScore: 100,
      boundaryScore,
    },
    detectedStats: {
      strokeCount: 1,
      measuredAvgSpacingPx: 0,
      spacingVariance: 0,
      measuredAvgAngleDeg: Math.round(userAngleDeg),
      measuredOpticalDensityPct: 0,
    },
    feedbackTitle,
    feedbackMessage,
    tipMessage,
    avatarMood,
  };
}

/**
 * Evaluación de Calistenia Multi-Línea (2 o 3 líneas independientes dispersas)
 * Permite al usuario trazar las líneas en cualquier orden.
 */
export function evaluateMultiLineSubmission(
  strokes: RawStroke[],
  challenge: ProceduralStrokeChallenge
): StrokeEvaluation {
  const targetLines = challenge.targetLines || [];
  const requiredCount = challenge.minRequiredStrokes || targetLines.length || 2;

  if (strokes.length === 0 || strokes.every((s) => s.points.length === 0)) {
    return {
      overallScore: 0,
      passed: false,
      isSingleStroke: true,
      metrics: {
        parallelismScore: 0,
        spacingScore: 0,
        straightnessScore: 0,
        tonalDensityScore: 0,
        boundaryScore: 0,
      },
      detectedStats: {
        strokeCount: 0,
        measuredAvgSpacingPx: 0,
        spacingVariance: 0,
        measuredAvgAngleDeg: 0,
        measuredOpticalDensityPct: 0,
      },
      feedbackTitle: 'Sin trazos detectados',
      feedbackMessage: `Dibuja las ${requiredCount} líneas requeridas para evaluar.`,
      tipMessage: 'Traza cada línea desde el punto de menor número al de mayor número.',
    };
  }

  // 1. Emparejamiento óptimo entre trazos del usuario y líneas diana
  const numTargets = targetLines.length;
  const numUserStrokes = strokes.length;

  function strokeDistanceCost(uStroke: RawStroke, target: typeof targetLines[0]): number {
    const pts = uStroke.points;
    if (pts.length < 2) return 9999;
    const uStart = pts[0];
    const uEnd = pts[pts.length - 1];
    const tStart = target.start;
    const tEnd = target.end;

    const dFwd = Math.hypot(uStart.x - tStart.x, uStart.y - tStart.y) + Math.hypot(uEnd.x - tEnd.x, uEnd.y - tEnd.y);
    const dRev = Math.hypot(uStart.x - tEnd.x, uStart.y - tEnd.y) + Math.hypot(uEnd.x - tStart.x, uEnd.y - tStart.y);
    return Math.min(dFwd, dRev);
  }

  let assignment: number[] = [];

  if (numTargets <= 3) {
    const permutations: number[][] = [];
    if (numTargets === 2) {
      permutations.push([0, 1], [1, 0]);
    } else {
      permutations.push(
        [0, 1, 2], [0, 2, 1],
        [1, 0, 2], [1, 2, 0],
        [2, 0, 1], [2, 1, 0]
      );
    }

    let bestPermutation = permutations[0] || [0];
    let minTotalCost = Infinity;

    for (const perm of permutations) {
      let currentCost = 0;
      for (let uIdx = 0; uIdx < Math.min(numUserStrokes, numTargets); uIdx++) {
        const tIdx = perm[uIdx];
        currentCost += strokeDistanceCost(strokes[uIdx], targetLines[tIdx]);
      }
      if (currentCost < minTotalCost) {
        minTotalCost = currentCost;
        bestPermutation = perm;
      }
    }
    assignment = bestPermutation;
  } else {
    // Para rosetas o retos con > 3 líneas (8 o 12 radios):
    // Matching voraz por distancia mínima
    const pairs: { uIdx: number; tIdx: number; cost: number }[] = [];
    for (let u = 0; u < numUserStrokes; u++) {
      for (let t = 0; t < numTargets; t++) {
        pairs.push({ uIdx: u, tIdx: t, cost: strokeDistanceCost(strokes[u], targetLines[t]) });
      }
    }
    pairs.sort((a, b) => a.cost - b.cost);

    const usedU = new Set<number>();
    const usedT = new Set<number>();
    assignment = new Array(numUserStrokes).fill(-1);

    for (const pair of pairs) {
      if (!usedU.has(pair.uIdx) && !usedT.has(pair.tIdx)) {
        usedU.add(pair.uIdx);
        usedT.add(pair.tIdx);
        assignment[pair.uIdx] = pair.tIdx;
        if (usedU.size === Math.min(numUserStrokes, numTargets)) break;
      }
    }
  }

  // 2. Evaluar cada par (trazo usuario -> línea objetivo asignada)
  interface LineResult {
    targetIndex: number;
    userStrokeIndex: number;
    boundaryScore: number;
    straightnessScore: number;
    angleScore: number;
    overallLineScore: number;
    isReversed: boolean;
    startErr: number;
    endErr: number;
    angleDiff: number;
    stroke: RawStroke;
    target: typeof targetLines[0];
  }

  const lineResults: LineResult[] = [];
  const directionWarnings: string[] = [];

  for (let uIdx = 0; uIdx < numUserStrokes; uIdx++) {
    const tIdx = assignment[uIdx];
    if (tIdx === undefined || tIdx === -1) continue;
    const target = targetLines[tIdx];
    const uStroke = strokes[uIdx];
    const pts = uStroke.points;
    const uStart = pts[0];
    const uEnd = pts[pts.length - 1];
    const tStart = target.start;
    const tEnd = target.end;

    const tDx = tEnd.x - tStart.x;
    const tDy = tEnd.y - tStart.y;
    let targetAngle = (Math.atan2(tDy, tDx) * 180) / Math.PI;
    if (targetAngle < 0) targetAngle += 360;

    const uDx = uEnd.x - uStart.x;
    const uDy = uEnd.y - uStart.y;
    let userAngle = (Math.atan2(uDy, uDx) * 180) / Math.PI;
    if (userAngle < 0) userAngle += 360;

    let angleDiff = Math.abs(userAngle - targetAngle);
    if (angleDiff > 180) angleDiff = 360 - angleDiff;
    const angleScore = Math.round(Math.max(0, 100 - angleDiff * 3.2));

    const distStartToStart = Math.hypot(uStart.x - tStart.x, uStart.y - tStart.y);
    const distStartToEnd = Math.hypot(uStart.x - tEnd.x, uStart.y - tEnd.y);
    const distEndToEnd = Math.hypot(uEnd.x - tEnd.x, uEnd.y - tEnd.y);
    const distEndToStart = Math.hypot(uEnd.x - tStart.x, uEnd.y - tStart.y);

    let isReversed = false;
    if ((distStartToEnd < distStartToStart && distEndToStart < distEndToEnd) || angleDiff > 90) {
      isReversed = true;
    }

    const startErr = isReversed ? distStartToEnd : distStartToStart;
    const endErr = isReversed ? distEndToStart : distEndToEnd;
    const avgErr = (startErr + endErr) / 2;
    const boundaryScore = Math.round(Math.max(0, 100 - Math.max(0, avgErr - 6) * 2.4));

    let maxDev = 0;
    let sumDev = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = distPointToSegment(pts[i].x, pts[i].y, tStart.x, tStart.y, tEnd.x, tEnd.y);
      if (d > maxDev) maxDev = d;
      sumDev += d;
    }
    const avgDev = pts.length > 2 ? sumDev / (pts.length - 2) : 0;
    const straightnessScore = Math.round(Math.max(0, 100 - avgDev * 5 - maxDev * 2.8));

    let overallLine = Math.round(boundaryScore * 0.40 + straightnessScore * 0.35 + angleScore * 0.25);
    if (isReversed) {
      overallLine = 0;
      directionWarnings.push(
        `L${target.order} (pts ${target.startKeyPointOrder}→${target.endKeyPointOrder}) fue trazada en sentido inverso.`
      );
    }

    lineResults.push({
      targetIndex: tIdx,
      userStrokeIndex: uIdx,
      boundaryScore,
      straightnessScore,
      angleScore,
      overallLineScore: overallLine,
      isReversed,
      startErr,
      endErr,
      angleDiff,
      stroke: uStroke,
      target,
    });
  }

  // Si faltan trazos para completar el reto
  if (lineResults.length < numTargets) {
    const missing = numTargets - lineResults.length;
    return {
      overallScore: Math.round(lineResults.reduce((a, b) => a + b.overallLineScore, 0) / numTargets),
      passed: false,
      isSingleStroke: true,
      metrics: {
        parallelismScore: Math.round(lineResults.reduce((a, b) => a + b.angleScore, 0) / numTargets),
        spacingScore: 100,
        straightnessScore: Math.round(lineResults.reduce((a, b) => a + b.straightnessScore, 0) / numTargets),
        tonalDensityScore: 100,
        boundaryScore: Math.round(lineResults.reduce((a, b) => a + b.boundaryScore, 0) / numTargets),
      },
      detectedStats: {
        strokeCount: numUserStrokes,
        measuredAvgSpacingPx: 0,
        spacingVariance: 0,
        measuredAvgAngleDeg: 0,
        measuredOpticalDensityPct: 0,
      },
      feedbackTitle: `Falta${missing > 1 ? 'n' : ''} ${missing} línea${missing > 1 ? 's' : ''}`,
      feedbackMessage: `Has dibujado ${lineResults.length} de ${numTargets} líneas. Dibuja las restantes.`,
      tipMessage: 'Dibuja todas las líneas marcadas con sus puntos antes de evaluar.',
      solutionOverlay: {
        points: targetLines[0]?.idealPath || [],
        multiLines: targetLines.map((t) => ({ points: t.idealPath })),
        color: '#000000',
        label: `Solución (${numTargets} Radios)`,
      },
    };
  }

  // 3. Puntuación agregada
  const avgBoundary = Math.round(lineResults.reduce((a, b) => a + b.boundaryScore, 0) / lineResults.length);
  const avgStraightness = Math.round(lineResults.reduce((a, b) => a + b.straightnessScore, 0) / lineResults.length);
  const avgAngle = Math.round(lineResults.reduce((a, b) => a + b.angleScore, 0) / lineResults.length);
  let overallScore = Math.round(lineResults.reduce((a, b) => a + b.overallLineScore, 0) / lineResults.length);

  const hasAnyReversed = lineResults.some((r) => r.isReversed);
  if (hasAnyReversed) {
    overallScore = 0;
  }

  // Criterios estrictos de aprobación
  let passed = overallScore >= 70 && !hasAnyReversed;
  for (const r of lineResults) {
    if (r.startErr > 40 || r.endErr > 46 || r.angleDiff > 22 || r.straightnessScore < 55) {
      passed = false;
      break;
    }
  }

  // 4. Cinemática de cada trazo y agregación
  const activePhase = challenge.activePhase || 1;
  const directionKey = challenge.directionKey || 'general';

  const kinematicResults = lineResults.map((r) =>
    analyzeStrokeKinematics(r.stroke, directionKey, activePhase, r.target.lengthPx)
  );

  for (let i = 0; i < lineResults.length; i++) {
    if (!lineResults[i].isReversed && lineResults[i].boundaryScore >= 60) {
      recordStrokeSpeed(directionKey, kinematicResults[i].avgSpeedPxPerSec);
    }
  }

  const avgSpeed = Math.round(
    kinematicResults.reduce((a, b) => a + b.avgSpeedPxPerSec, 0) / kinematicResults.length
  );
  const peakSpeed = Math.max(...kinematicResults.map((k) => k.peakSpeedPxPerSec));
  const avgFluency = Math.round(
    kinematicResults.reduce((a, b) => a + b.fluencyScore, 0) / kinematicResults.length
  );
  const totalMicroStops = kinematicResults.reduce((a, b) => a + b.microStopCount, 0);
  const totalDuration = kinematicResults.reduce((a, b) => a + b.durationMs, 0);
  const userBaseline = kinematicResults[0]?.userBaselineSpeedPxPerSec || 450;
  const speedRatio = Math.round((avgSpeed / userBaseline) * 100) / 100;

  const allPhasesPassed = kinematicResults.every((k) => k.phasePassed);
  const phasePassed = passed && allPhasesPassed;

  let speedDiagnosis = 'Ritmo constante en todas las líneas';
  if (avgSpeed < userBaseline * 0.5) speedDiagnosis = 'Ritmo calmado de calibración';
  else if (avgSpeed > userBaseline * 1.3) speedDiagnosis = 'Trazo veloz y decidido';

  const aggregatedKinematics: import('./strokeKinematics').StrokeKinematicsResult = {
    durationMs: totalDuration,
    lengthPx: targetLines.reduce((a, b) => a + b.lengthPx, 0),
    avgSpeedPxPerSec: avgSpeed,
    peakSpeedPxPerSec: peakSpeed,
    fluencyScore: avgFluency,
    microStopCount: totalMicroStops,
    userBaselineSpeedPxPerSec: userBaseline,
    speedRatioVsBaseline: speedRatio,
    phasePassed: allPhasesPassed,
    phaseRequirementText: kinematicResults[0]?.phaseRequirementText || 'Ritmo uniforme',
    speedDiagnosisLabel: speedDiagnosis,
  };

  const sortedResults = [...lineResults].sort((a, b) => a.target.order - b.target.order);
  const linesDetail = sortedResults
    .map(
      (r) =>
        `L${r.target.order} (pts ${r.target.startKeyPointOrder}→${r.target.endKeyPointOrder}): ${r.overallLineScore}%`
    )
    .join(' · ');

  let feedbackTitle = '¡Multi-Trazo Completado!';
  let feedbackMessage = `${linesDetail}. Puntería: ${avgBoundary}%, Rectitud: ${avgStraightness}%.`;
  let tipMessage = 'Mantén la misma velocidad y soltura al pasar de una línea a la siguiente.';
  let avatarMood: AvatarMood = 'wink';

  let directionWarning: string | undefined;
  if (hasAnyReversed) {
    feedbackTitle = 'Dirección Invertida 🔄';
    directionWarning = `⚠️ ${directionWarnings.join(' ')}`;
    feedbackMessage = directionWarning;
    tipMessage = 'Recuerda: inicia siempre en el punto de menor número y termina en el de mayor número.';
    avatarMood = 'fail-spiral';
  } else if (!passed) {
    if (overallScore >= 50) {
      feedbackTitle = 'Cerca del Objetivo 🏹';
      feedbackMessage = `${linesDetail}. Ajusta la puntería en los extremos de cada línea.`;
      tipMessage = 'Haz una pasada rápida en el aire (ghosting) antes de apoyar el lápiz en cada línea.';
      avatarMood = 'curious';
    } else {
      feedbackTitle = 'Desviación en las Líneas 💨';
      feedbackMessage = `${linesDetail}. Desviación angular o error de longitud en los trazos.`;
      tipMessage = 'Fija la mirada en el punto de llegada antes de disparar cada trazo.';
      avatarMood = 'fail-spiral';
    }
  } else if (!allPhasesPassed) {
    feedbackTitle = 'Buena Geometría pero Falta Fluidez/Velocidad ⚡';
    feedbackMessage = `${linesDetail}. Velocidad media: ${avgSpeed} px/s. Fluidez: ${avgFluency}%.`;
    tipMessage = 'Realiza cada una de las líneas con un movimiento decidido sin dudar.';
    avatarMood = 'curious';
  } else {
    feedbackTitle = `¡Reto de ${numTargets} Líneas Superado! 🎯`;
    feedbackMessage = `${linesDetail}. Excelente coordinación espacial y consistencia motora.`;
    tipMessage = '¡Consistencia perfecta en múltiples sectores!';
    avatarMood = 'success-stars';
  }

  const solutionMultiLines = targetLines.map((t) => ({ points: t.idealPath }));

  return {
    overallScore,
    passed,
    isSingleStroke: true,
    isReversed: hasAnyReversed,
    directionWarning,
    currentPhase: activePhase,
    phasePassed,
    kinematics: aggregatedKinematics,
    solutionOverlay: {
      points: targetLines[0]?.idealPath || [],
      multiLines: solutionMultiLines,
      color: '#000000',
      label: `Solución (${numTargets} Líneas)`,
    },
    metrics: {
      parallelismScore: avgAngle,
      spacingScore: 100,
      straightnessScore: avgStraightness,
      tonalDensityScore: 100,
      boundaryScore: avgBoundary,
    },
    detectedStats: {
      strokeCount: numUserStrokes,
      measuredAvgSpacingPx: 0,
      spacingVariance: 0,
      measuredAvgAngleDeg: Math.round(
        lineResults.reduce((a, b) => a + b.target.angleDeg, 0) / lineResults.length
      ),
      measuredOpticalDensityPct: 0,
    },
    feedbackTitle,
    feedbackMessage,
    tipMessage,
    avatarMood,
  };
}

/**
 * Genera un informe detallado en texto / markdown de la evaluación para depuración y revisión
 */
export function buildStrokeDebugReport(
  challenge: ProceduralStrokeChallenge,
  strokes: RawStroke[],
  evaluation: StrokeEvaluation
): string {
  const isMulti = challenge.targetLines && challenge.targetLines.length > 1;

  if (isMulti) {
    const targets = challenge.targetLines || [];
    const targetLinesDesc = targets
      .map(
        (t) =>
          `  - Línea ${t.order} (pts ${t.startKeyPointOrder}→${t.endKeyPointOrder}): Start (${Math.round(t.start.x)}, ${Math.round(t.start.y)}) -> End (${Math.round(t.end.x)}, ${Math.round(t.end.y)}), L: ${Math.round(t.lengthPx)}px, θ: ${t.angleDeg}°`
      )
      .join('\n');

    return [
      `=== REPORTE DE DEPURACIÓN MULTI-TRAZO (PAPLITZ LAB) ===`,
      `Fecha: ${new Date().toISOString()}`,
      `Reto: [${challenge.code}] ${challenge.title} (Semilla: #${challenge.seed})`,
      `Subtítulo: ${challenge.subtitle}`,
      ``,
      `--- OBJETIVO MULTI-LÍNEA (${targets.length} LÍNEAS) ---`,
      targetLinesDesc,
      ``,
      `--- TRAZOS DEL USUARIO ---`,
      `Trazos recibidos: ${strokes.length} (requeridos: ${challenge.minRequiredStrokes})`,
      ...strokes.map((s, i) => {
        const p0 = s.points[0] || { x: 0, y: 0 };
        const pN = s.points[s.points.length - 1] || { x: 0, y: 0 };
        return `  - Trazo ${i + 1}: ${s.points.length} puntos. Start (${Math.round(p0.x)}, ${Math.round(p0.y)}) -> End (${Math.round(pN.x)}, ${Math.round(pN.y)}), L: ${Math.round(Math.hypot(pN.x - p0.x, pN.y - p0.y))}px`;
      }),
      ``,
      `--- RESULTADO DE EVALUACIÓN ---`,
      `Nota Global: ${evaluation.overallScore}% (Superado: ${evaluation.passed ? 'SÍ' : 'NO'})`,
      evaluation.currentPhase ? `Fase Activa: Fase ${evaluation.currentPhase} (Fase Superada: ${evaluation.phasePassed ? 'SÍ' : 'NO'})` : '',
      `Puntería en Dianas: ${evaluation.metrics.boundaryScore}%`,
      `Rectitud Media: ${evaluation.metrics.straightnessScore}%`,
      `Paralelismo / Vector: ${evaluation.metrics.parallelismScore}%`,
      ``,
      evaluation.kinematics
        ? [
            `--- CINEMÁTICA Y BIOMECÁNICA ---`,
            `Duración acumulada: ${evaluation.kinematics.durationMs}ms`,
            `Velocidad Media: ${evaluation.kinematics.avgSpeedPxPerSec} px/s (Pico: ${evaluation.kinematics.peakSpeedPxPerSec} px/s)`,
            `Media Adaptativa del Usuario: ${evaluation.kinematics.userBaselineSpeedPxPerSec} px/s`,
            `Índice de Fluidez: ${evaluation.kinematics.fluencyScore}% (Micro-frenazos: ${evaluation.kinematics.microStopCount})`,
            `Diagnóstico Velocidad: ${evaluation.kinematics.speedDiagnosisLabel}`,
          ].join('\n')
        : '',
      ``,
      evaluation.directionWarning ? `Aviso Dirección: ${evaluation.directionWarning}` : `Dirección: Correcta`,
      `Diagnóstico: ${evaluation.feedbackTitle} - ${evaluation.feedbackMessage}`,
      `================================================`,
    ].filter(Boolean).join('\n');
  }

  if (challenge.spacingTrackParams) {
    const sp = challenge.spacingTrackParams;
    return [
      `=== REPORTE DE DEPURACIÓN DE CARRILES Y ESPACIADO (PAPLITZ LAB) ===`,
      `Fecha: ${new Date().toISOString()}`,
      `Reto: [${challenge.code}] ${challenge.title} (Semilla: #${challenge.seed})`,
      `Subtítulo: ${challenge.subtitle}`,
      ``,
      `--- OBJETIVO ---`,
      `Bandas: ${sp.bands.length} (Altura: ${sp.bands[0].height}px)`,
      `Paso Objetivo: ${sp.targetSpacingPx}px (${sp.subdivisionLabel})`,
      `Ángulo Objetivo: ${sp.angleDeg ?? 90}°`,
      `Dirección Objetivo: ${sp.direction || 'vertical_top_down'}`,
      `Carril X: de ${sp.trackXStart}px a ${sp.trackXEnd}px`,
      ``,
      `--- TRAZOS DEL USUARIO ---`,
      `Trazos detectados en carril: ${evaluation.detectedStats.strokeCount}`,
      `Espaciado Medio Medido: ${evaluation.detectedStats.measuredAvgSpacingPx}px (Objetivo: ${sp.targetSpacingPx}px)`,
      `Varianza / Dispersión: ±${evaluation.detectedStats.spacingVariance}px`,
      ``,
      `--- RESULTADO DE EVALUACIÓN ---`,
      `Nota Global: ${evaluation.overallScore}% (Superado: ${evaluation.passed ? 'SÍ' : 'NO'})`,
      evaluation.currentPhase ? `Fase Activa: Fase ${evaluation.currentPhase} (Fase Superada: ${evaluation.phasePassed ? 'SÍ' : 'NO'})` : '',
      `Espaciado y Ritmo: ${evaluation.metrics.spacingScore}%`,
      `Contención en Carriles: ${evaluation.metrics.boundaryScore}%`,
      `Rectitud: ${evaluation.metrics.straightnessScore}%`,
      `Ángulo / Paralelismo: ${evaluation.metrics.parallelismScore}%`,
      `Cobertura de Franjas: ${evaluation.metrics.tonalDensityScore}%`,
      ``,
      evaluation.kinematics
        ? [
            `--- CINEMÁTICA Y BIOMECÁNICA ---`,
            `Duración: ${evaluation.kinematics.durationMs}ms`,
            `Velocidad Media: ${evaluation.kinematics.avgSpeedPxPerSec} px/s (Pico: ${evaluation.kinematics.peakSpeedPxPerSec} px/s)`,
            `Índice de Fluidez: ${evaluation.kinematics.fluencyScore}%`,
            `Diagnóstico Velocidad: ${evaluation.kinematics.speedDiagnosisLabel}`,
          ].join('\n')
        : '',
      ``,
      evaluation.directionWarning ? `Aviso Dirección: ${evaluation.directionWarning}` : `Dirección: Correcta`,
      `Diagnóstico: ${evaluation.feedbackTitle} - ${evaluation.feedbackMessage}`,
      `================================================`,
    ].filter(Boolean).join('\n');
  }

  const s0 = strokes[0];
  const pts = s0?.points || [];
  const uStart = pts[0] || { x: 0, y: 0 };
  const uEnd = pts[pts.length - 1] || { x: 0, y: 0 };
  const kp = challenge.keyPoints || [];
  const tStart = kp[0] || { x: 0, y: 0 };
  const tEnd = kp[kp.length - 1] || { x: 0, y: 0 };

  const startErr = Math.hypot(uStart.x - tStart.x, uStart.y - tStart.y);
  const endErr = Math.hypot(uEnd.x - tEnd.x, uEnd.y - tEnd.y);
  const uLen = Math.hypot(uEnd.x - uStart.x, uEnd.y - uStart.y);
  const tLen = Math.hypot(tEnd.x - tStart.x, tEnd.y - tStart.y);

  return [
    `=== REPORTE DE DEPURACIÓN DE TRAZO (PAPLITZ LAB) ===`,
    `Fecha: ${new Date().toISOString()}`,
    `Reto: [${challenge.code}] ${challenge.title} (Semilla: #${challenge.seed})`,
    `Subtítulo: ${challenge.subtitle}`,
    ``,
    `--- OBJETIVO ---`,
    `Punto ① Objetivo: (${Math.round(tStart.x)}, ${Math.round(tStart.y)})`,
    `Punto ② Objetivo: (${Math.round(tEnd.x)}, ${Math.round(tEnd.y)})`,
    `Longitud Objetivo: ${Math.round(tLen)}px`,
    `Ángulo Objetivo: ${Math.round(challenge.targetAngleDeg)}°`,
    ``,
    `--- TRAZO DEL USUARIO ---`,
    `Puntos muestreados: ${pts.length}`,
    `Punto Inicio: (${Math.round(uStart.x)}, ${Math.round(uStart.y)}) -> Error en ①: ${Math.round(startErr)}px`,
    `Punto Fin: (${Math.round(uEnd.x)}, ${Math.round(uEnd.y)}) -> Error en ②: ${Math.round(endErr)}px`,
    `Longitud Real: ${Math.round(uLen)}px (Δ: ${Math.round(uLen - tLen)}px)`,
    `Ángulo Medido: ${evaluation.detectedStats.measuredAvgAngleDeg}°`,
    ``,
    `--- RESULTADO DE EVALUACIÓN ---`,
    `Nota Global: ${evaluation.overallScore}% (Superado: ${evaluation.passed ? 'SÍ' : 'NO'})`,
    evaluation.currentPhase ? `Fase Activa: Fase ${evaluation.currentPhase} (Fase Superada: ${evaluation.phasePassed ? 'SÍ' : 'NO'})` : '',
    `Puntería en Dianas: ${evaluation.metrics.boundaryScore}%`,
    `Rectitud / Curva: ${evaluation.metrics.straightnessScore}%`,
    `Paralelismo / Vector: ${evaluation.metrics.parallelismScore}%`,
    ``,
    evaluation.kinematics
      ? [
          `--- CINEMÁTICA Y BIOMECÁNICA ---`,
          `Duración: ${evaluation.kinematics.durationMs}ms`,
          `Velocidad Media: ${evaluation.kinematics.avgSpeedPxPerSec} px/s (Pico: ${evaluation.kinematics.peakSpeedPxPerSec} px/s)`,
          `Media Adaptativa del Usuario: ${evaluation.kinematics.userBaselineSpeedPxPerSec} px/s (${Math.round(evaluation.kinematics.speedRatioVsBaseline * 100)}% de tu media)`,
          `Índice de Fluidez: ${evaluation.kinematics.fluencyScore}% (Micro-frenazos: ${evaluation.kinematics.microStopCount})`,
          `Diagnóstico Velocidad: ${evaluation.kinematics.speedDiagnosisLabel}`,
        ].join('\n')
      : '',
    ``,
    evaluation.directionWarning ? `Aviso Dirección: ${evaluation.directionWarning}` : `Dirección: Correcta`,
    `Diagnóstico: ${evaluation.feedbackTitle} - ${evaluation.feedbackMessage}`,
    `================================================`,
  ].filter(Boolean).join('\n');
}

function isStrokeReversedInTrack(s: RawStroke, dir: StrokeDirection): boolean {
  if (s.points.length < 2) return false;
  const p1 = s.points[0];
  const p2 = s.points[s.points.length - 1];
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  switch (dir) {
    case 'vertical_top_down':
      return dy < -10;
    case 'vertical_bottom_up':
      return dy > 10;
    case 'bottom_up_left_right': // ↗ D1
      return dy > 10 || dx < -10;
    case 'top_down_right_left': // ↙ D2
      return dy < -10 || dx > 10;
    case 'top_down_left_right': // ↘ D3
      return dy < -10 || dx < -10;
    case 'bottom_up_right_left': // ↖ D4
      return dy > 10 || dx > 10;
    case 'horizontal_left_right':
      return dx < -10;
    case 'horizontal_right_left':
      return dx > 10;
    default:
      return false;
  }
}

function getStrokeSlopeAngle(stroke: RawStroke): { angleFromHorizontalDeg: number; isSlash: boolean } {
  const p1 = stroke.points[0];
  const p2 = stroke.points[stroke.points.length - 1];
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const acuteAngle = (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI;
  // En coordenadas de pantalla:
  // dx * dy < 0 => sube hacia la derecha o baja hacia la izquierda (slash /)
  // dx * dy > 0 => baja hacia la derecha o sube hacia la izquierda (backslash \)
  const isSlash = dx * dy < 0;
  return { angleFromHorizontalDeg: acuteAngle, isSlash };
}

/**
 * Evalúa la fidelidad del quiebre triangular (knee/corner) en trazos de E5.1 (izq) y E5.2 (der)
 * - Altura nominal h = yBottom - yTop (aprox 130px)
 * - El quiebre debe producirse en la mitad inferior: yRel aprox 0.50 a 0.82, vértice en yRel ≈ 0.67
 * - Desviación horizontal del vértice respecto al eje de la línea: target 16px (negativo para izq, positivo para der)
 */
function evaluateKinkFidelity(
  stroke: RawStroke,
  kinkType: 'triangle_left' | 'triangle_right',
  yTop: number,
  yBottom: number
): {
  score: number;
  hasKink: boolean;
  isCorrectDirection: boolean;
  apexDeflection: number;
  apexYRel: number;
} {
  if (stroke.points.length < 4) {
    return { score: 10, hasKink: false, isCorrectDirection: false, apexDeflection: 0, apexYRel: 0 };
  }

  const h = yBottom - yTop;
  const pStart = stroke.points[0];
  const pEnd = stroke.points[stroke.points.length - 1];

  // Eje de referencia X: promedio de X en el tercio superior
  const topPoints = stroke.points.filter((p) => p.y <= yTop + h * 0.45);
  const refX = topPoints.length > 0
    ? topPoints.reduce((acc, p) => acc + p.x, 0) / topPoints.length
    : (pStart.x + pEnd.x) / 2;

  // Buscar el punto con mayor desviación horizontal
  let maxTargetDeflection = 0;
  let maxOppositeDeflection = 0;
  let apexPoint = stroke.points[0];

  const sign = kinkType === 'triangle_left' ? -1 : 1;

  for (const p of stroke.points) {
    const dx = p.x - refX; // positivo hacia la derecha, negativo hacia la izquierda
    const directedDx = dx * sign; // positivo si es en la dirección esperada del quiebre
    if (directedDx > maxTargetDeflection) {
      maxTargetDeflection = directedDx;
      apexPoint = p;
    }
    if (-directedDx > maxOppositeDeflection) {
      maxOppositeDeflection = -directedDx;
    }
  }

  const hasKink = maxTargetDeflection >= 5.0;
  const isCorrectDirection = maxTargetDeflection >= maxOppositeDeflection && hasKink;

  if (!hasKink) {
    // Es una línea recta vertical o con variación mínima
    return {
      score: 15,
      hasKink: false,
      isCorrectDirection: false,
      apexDeflection: maxTargetDeflection,
      apexYRel: 0,
    };
  }

  if (!isCorrectDirection) {
    // Quiebre en la dirección contraria (p. ej. a la derecha cuando debía ser a la izquierda)
    return {
      score: 25,
      hasKink: true,
      isCorrectDirection: false,
      apexDeflection: maxTargetDeflection,
      apexYRel: 0,
    };
  }

  // Medir qué tan cerca está la desviación del objetivo (16px)
  const deflectionDiff = Math.abs(maxTargetDeflection - 16);
  const deflectionScore = Math.max(0, 100 - deflectionDiff * 5);

  // Medir la altura vertical del vértice: debe estar cerca de yTop + 0.67 * h
  const apexYRel = h > 0 ? (apexPoint.y - yTop) / h : 0.67;
  const idealYRel = 0.67;
  const yRelDiff = Math.abs(apexYRel - idealYRel);
  const yLocationScore = Math.max(0, 100 - yRelDiff * 160);

  // Retorno a la vertical en el extremo inferior: pEnd.x debe estar cerca de refX
  const returnDiff = Math.abs(pEnd.x - refX);
  const returnScore = Math.max(0, 100 - returnDiff * 5);

  const score = Math.round(
    deflectionScore * 0.45 +
    yLocationScore * 0.35 +
    returnScore * 0.20
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    hasKink,
    isCorrectDirection,
    apexDeflection: maxTargetDeflection,
    apexYRel,
  };
}

/**
 * Evalúa el reto de Carriles y Espaciado Rítmico (Consistencia 1.1)
 */
export function evaluateSpacingTrackSubmission(
  strokes: RawStroke[],
  challenge: ProceduralStrokeChallenge
): StrokeEvaluation {
  const params = challenge.spacingTrackParams!;
  const bands = params.bands;
  const targetSpacing = params.targetSpacingPx;
  const trackXStart = params.trackXStart;
  const targetDir: StrokeDirection = params.direction || 'vertical_top_down';
  const targetAngle: number = params.angleDeg ?? 90;

  if (strokes.length === 0) {
    return {
      overallScore: 0,
      passed: false,
      metrics: {
        parallelismScore: 0,
        spacingScore: 0,
        straightnessScore: 0,
        tonalDensityScore: 0,
        boundaryScore: 0,
      },
      detectedStats: {
        strokeCount: 0,
        measuredAvgSpacingPx: 0,
        spacingVariance: 0,
        measuredAvgAngleDeg: 0,
        measuredOpticalDensityPct: 0,
      },
      feedbackTitle: '¡Lienzo Vacío!',
      feedbackMessage: 'No has dibujado líneas en el carril. Observa la muestra a la izquierda y dibuja las líneas requeridas hacia la derecha.',
      tipMessage: 'Mantén un pulso constante y busca que el espacio entre trazos sea idéntico al del patrón de muestra.',
      avatarMood: 'surprised',
      solutionOverlay: {
        points: [],
        multiLines: challenge.ghostSolutionStrokes || [],
        color: '#000000',
        label: 'Patrón Objetivo',
      },
    };
  }

  // 1. Filtrar trazos válidos (en el área del carril de dibujo)
  const trackStrokes: { stroke: RawStroke; avgX: number; avgY: number; topY: number; botY: number; len: number }[] = [];
  for (const s of strokes) {
    if (s.points.length < 2) continue;
    let sumX = 0;
    let sumY = 0;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of s.points) {
      sumX += p.x;
      sumY += p.y;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const avgX = sumX / s.points.length;
    const avgY = sumY / s.points.length;
    // Permitir trazos que estén dentro o muy cerca de la zona del carril (x >= trackXStart - 15)
    if (avgX >= trackXStart - 15) {
      const p1 = s.points[0];
      const pEnd = s.points[s.points.length - 1];
      trackStrokes.push({
        stroke: s,
        avgX,
        avgY,
        topY: minY,
        botY: maxY,
        len: Math.hypot(pEnd.x - p1.x, pEnd.y - p1.y),
      });
    }
  }

  if (trackStrokes.length === 0) {
    return {
      overallScore: 10,
      passed: false,
      metrics: {
        parallelismScore: 20,
        spacingScore: 10,
        straightnessScore: 20,
        tonalDensityScore: 10,
        boundaryScore: 10,
      },
      detectedStats: {
        strokeCount: strokes.length,
        measuredAvgSpacingPx: 0,
        spacingVariance: 0,
        measuredAvgAngleDeg: 0,
        measuredOpticalDensityPct: 0,
      },
      feedbackTitle: '¡Trazos fuera de los carriles!',
      feedbackMessage: 'Has dibujado en la zona de la muestra o fuera del carril derecho. Dibuja entre las líneas horizontales guía.',
      tipMessage: 'Comienza a la derecha de la muestra, entre las guías horizontales.',
      avatarMood: 'curious',
      solutionOverlay: {
        points: [],
        multiLines: challenge.ghostSolutionStrokes || [],
        color: '#000000',
        label: 'Patrón Objetivo',
      },
    };
  }

  // 1.5 Detección de trazos en dirección invertida
  let reversedCount = 0;
  for (const ts of trackStrokes) {
    if (isStrokeReversedInTrack(ts.stroke, targetDir)) {
      reversedCount++;
    }
  }
  const isReversed = trackStrokes.length > 0 && reversedCount >= Math.max(1, Math.ceil(trackStrokes.length * 0.3));

  const kinkType = params.kinkType;
  const isKinked = kinkType && kinkType !== 'none';
  const blocks = params.blocks;

  // 1.8 Rama de evaluación específica para carriles con quiebre triangular y bloques delimitados (E5.1 / E5.2)
  if (isKinked && blocks && blocks.length > 0) {
    const singleBand = bands[0];
    const b1 = blocks[0];
    const b2 = blocks[1];

    // Clasificar trazos por bloque y detectar trazos en el gap de pausa
    const b1Strokes: typeof trackStrokes = [];
    const b2Strokes: typeof trackStrokes = [];
    const gapStrokes: typeof trackStrokes = [];

    for (const ts of trackStrokes) {
      if (ts.avgX >= b1.xStart - 6 && ts.avgX <= b1.xEnd + 6) {
        b1Strokes.push(ts);
      } else if (b2 && ts.avgX >= b2.xStart - 6 && ts.avgX <= b2.xEnd + 6) {
        b2Strokes.push(ts);
      } else if (b2 && ts.avgX > b1.xEnd + 6 && ts.avgX < b2.xStart - 6) {
        gapStrokes.push(ts);
      }
    }

    const blockList = [
      { def: b1, strokes: b1Strokes },
      ...(b2 ? [{ def: b2, strokes: b2Strokes }] : []),
    ];

    let totalBlockSpacingScore = 0;
    let totalBlockBoundaryScore = 0;
    let totalBlockKinkScore = 0;
    let totalBlockParallelismScore = 0;
    let blocksDrawnCount = 0;
    let missingKinkCount = 0;
    let wrongDirKinkCount = 0;
    const allSpacings: number[] = [];

    for (const blk of blockList) {
      const bStrokes = blk.strokes;
      if (bStrokes.length < 2) {
        continue;
      }
      blocksDrawnCount++;

      // Ordenar trazos de izquierda a derecha
      bStrokes.sort((a, b) => a.avgX - b.avgX);

      // Espaciados en el bloque: incluyendo la distancia desde la línea inicial y hasta la línea final
      const spacings: number[] = [];
      const dStart = bStrokes[0].avgX - blk.def.xStart;
      if (dStart > 0) {
        spacings.push(dStart);
        allSpacings.push(dStart);
      }
      for (let i = 0; i < bStrokes.length - 1; i++) {
        const dx = bStrokes[i + 1].avgX - bStrokes[i].avgX;
        spacings.push(dx);
        allSpacings.push(dx);
      }
      const dEnd = blk.def.xEnd - bStrokes[bStrokes.length - 1].avgX;
      if (dEnd > 0) {
        spacings.push(dEnd);
        allSpacings.push(dEnd);
      }

      const meanDx = spacings.reduce((a, b) => a + b, 0) / (spacings.length || 1);
      let varDx = 0;
      for (const d of spacings) {
        varDx += (d - meanDx) * (d - meanDx);
      }
      const stdDx = Math.sqrt(varDx / (spacings.length || 1));

      const accuracyVsTarget = Math.max(0, 100 - Math.abs(meanDx - targetSpacing) * 7.5);
      const regularity = Math.max(0, 100 - stdDx * 12);
      const blockSpacingScore = accuracyVsTarget * 0.45 + regularity * 0.55;
      totalBlockSpacingScore += blockSpacingScore;

      // Contención en carriles
      let blockBoundarySum = 0;
      for (const s of bStrokes) {
        const topErr = Math.abs(s.topY - singleBand.yTop);
        const botErr = Math.abs(s.botY - singleBand.yBottom);
        const strokeBoundary = Math.max(0, 100 - (Math.max(0, topErr - 4) + Math.max(0, botErr - 4)) * 4);
        blockBoundarySum += strokeBoundary;
      }
      totalBlockBoundaryScore += blockBoundarySum / bStrokes.length;

      // Fidelidad del quiebre y paralelismo vertical
      let blockKinkSum = 0;
      let blockAngleSum = 0;
      for (const s of bStrokes) {
        const kinkEval = evaluateKinkFidelity(s.stroke, kinkType as 'triangle_left' | 'triangle_right', singleBand.yTop, singleBand.yBottom);
        blockKinkSum += kinkEval.score;
        if (!kinkEval.hasKink) missingKinkCount++;
        if (kinkEval.hasKink && !kinkEval.isCorrectDirection) wrongDirKinkCount++;

        const p1 = s.stroke.points[0];
        const pEnd = s.stroke.points[s.stroke.points.length - 1];
        const acuteAngle = (Math.atan2(Math.abs(pEnd.y - p1.y), Math.abs(pEnd.x - p1.x)) * 180) / Math.PI;
        const angleDev = Math.abs(acuteAngle - 90);
        blockAngleSum += Math.max(0, 100 - angleDev * 4.0);
      }
      totalBlockKinkScore += blockKinkSum / bStrokes.length;
      totalBlockParallelismScore += blockAngleSum / bStrokes.length;
    }

    const coverageRatio = blocksDrawnCount / blockList.length;
    const avgSpacingScore = blocksDrawnCount > 0 ? (totalBlockSpacingScore / blocksDrawnCount) * coverageRatio : 0;
    const avgBoundaryScore = blocksDrawnCount > 0 ? (totalBlockBoundaryScore / blocksDrawnCount) * coverageRatio : 0;
    const avgKinkScore = blocksDrawnCount > 0 ? totalBlockKinkScore / blocksDrawnCount : 0;
    const avgParallelismScore = blocksDrawnCount > 0 ? totalBlockParallelismScore / blocksDrawnCount : 0;

    const measuredAvgSpacingPx = allSpacings.length > 0 ? Math.round((allSpacings.reduce((a, b) => a + b, 0) / allSpacings.length) * 10) / 10 : 0;
    let allVar = 0;
    if (allSpacings.length > 0) {
      for (const d of allSpacings) allVar += (d - measuredAvgSpacingPx) * (d - measuredAvgSpacingPx);
    }
    const measuredSpacingVariance = allSpacings.length > 0 ? Math.round(Math.sqrt(allVar / allSpacings.length) * 10) / 10 : 0;

    const strokeCountPenalty = trackStrokes.length < challenge.minRequiredStrokes
      ? Math.min(30, (challenge.minRequiredStrokes - trackStrokes.length) * 4)
      : 0;

    const gapPenalty = Math.min(20, gapStrokes.length * 5);

    // Cinemática
    const activePhase = challenge.activePhase || 1;
    const kinematicsList = trackStrokes.map((ts) =>
      analyzeStrokeKinematics(ts.stroke, targetDir, activePhase, challenge.targetLengthPx || 141)
    );
    const avgSpeed = Math.round(
      kinematicsList.reduce((acc, k) => acc + k.avgSpeedPxPerSec, 0) / (kinematicsList.length || 1)
    );
    const avgFluency = Math.round(
      kinematicsList.reduce((acc, k) => acc + k.fluencyScore, 0) / (kinematicsList.length || 1)
    );
    const avgDuration = Math.round(
      kinematicsList.reduce((acc, k) => acc + k.durationMs, 0) / (kinematicsList.length || 1)
    );
    const allPhasePassed = kinematicsList.length > 0 && kinematicsList.every((k) => k.phasePassed);
    const kinematics = kinematicsList[0]
      ? {
          ...kinematicsList[0],
          durationMs: avgDuration,
          avgSpeedPxPerSec: avgSpeed,
          fluencyScore: avgFluency,
          phasePassed: allPhasePassed,
        }
      : undefined;

    // Ponderación geométrica con fidelidad de quiebre
    let geometricScore =
      avgSpacingScore * 0.35 +
      avgKinkScore * 0.30 +
      avgBoundaryScore * 0.20 +
      avgParallelismScore * 0.15 -
      strokeCountPenalty -
      gapPenalty;

    geometricScore = Math.max(0, Math.min(100, Math.round(geometricScore)));

    const isMissingKinks = trackStrokes.length > 0 && missingKinkCount >= Math.max(2, Math.ceil(trackStrokes.length * 0.4));
    const isWrongDirKinks = trackStrokes.length > 0 && wrongDirKinkCount >= Math.max(2, Math.ceil(trackStrokes.length * 0.4));

    if (isMissingKinks) {
      geometricScore = Math.min(geometricScore, 30);
    } else if (isWrongDirKinks) {
      geometricScore = Math.min(geometricScore, 40);
    }

    let overallScore = geometricScore;
    let phasePassed = false;
    if (activePhase === 1) {
      overallScore = geometricScore;
      phasePassed = overallScore >= 75;
    } else if (activePhase === 2) {
      const fluency = kinematics?.fluencyScore || 80;
      overallScore = Math.round(geometricScore * 0.80 + fluency * 0.20);
      phasePassed = overallScore >= 75 && fluency >= 70;
    } else {
      const speedPassed = kinematics?.phasePassed ?? true;
      const speedScore = speedPassed ? 100 : 50;
      overallScore = Math.round(geometricScore * 0.70 + speedScore * 0.30);
      phasePassed = overallScore >= 75 && speedPassed;
    }

    let passed = overallScore >= 75;

    const solutionOverlay = {
      points: [],
      multiLines: challenge.ghostSolutionStrokes || [],
      color: '#000000',
      label: `Paso Objetivo: ${targetSpacing}px con Quiebre`,
    };

    let feedbackTitle = '¡Quiebres y Espaciado Logrados!';
    let feedbackMessage = `Has conseguido un paso medio de ${measuredAvgSpacingPx}px (objetivo: ${targetSpacing}px) con buena reproducción del quiebre triangular.`;
    let tipMessage = 'Mantén la altura del vértice alineada visualmente en todos los trazos.';
    let avatarMood: AvatarMood = 'wink';
    let directionWarning: string | undefined;

    if (isReversed) {
      directionWarning = '⚠️ DIRECCIÓN INVERTIDA: Has trazado de abajo a arriba. Debes trazar de arriba a abajo (↓).';
      overallScore = 0;
      phasePassed = false;
      passed = false;
      feedbackTitle = 'Dirección Invertida 🔄';
      feedbackMessage = directionWarning;
      tipMessage = 'Traza de arriba a abajo (↓): empieza en el carril superior y desciende hacia el inferior realizando el quiebre.';
      avatarMood = 'fail-spiral';
    } else if (isMissingKinks) {
      const dirText = kinkType === 'triangle_left' ? 'hacia la izquierda (◄)' : 'hacia la derecha (►)';
      feedbackTitle = kinkType === 'triangle_left' ? '¡Falta el Quiebre Triangular! ◄' : '¡Falta el Quiebre Triangular! ►';
      feedbackMessage = `Has trazado líneas verticales rectas. Este ejercicio requiere realizar el quiebre triangular ${dirText} en la zona inferior de cada línea, idéntico a las líneas de INICIO y FIN.`;
      tipMessage = `Baja verticalmente, desvíate en triángulo ${dirText} a 2/3 de la altura, y retorna a la vertical.`;
      avatarMood = 'curious';
      passed = false;
      phasePassed = false;
    } else if (isWrongDirKinks) {
      const expectedDir = kinkType === 'triangle_left' ? 'izquierda ◄' : 'derecha ►';
      feedbackTitle = '¡Quiebre en Sentido Opuesto!';
      feedbackMessage = `Has dirigido el vértice hacia el lado contrario. El quiebre debe apuntar hacia la ${expectedDir}.`;
      tipMessage = `Compara con el patrón de muestra a la izquierda antes de trazar.`;
      avatarMood = 'curious';
      passed = false;
      phasePassed = false;
    } else if (blocksDrawnCount < blockList.length) {
      feedbackTitle = 'Bloques Incompletos';
      feedbackMessage = `Has completado ${blocksDrawnCount} de los ${blockList.length} bloques requeridos. Rellena tanto el Bloque 1 como el Bloque 2, respetando el espacio de pausa central.`;
      tipMessage = 'Usa la pausa entre bloques para descansar la mano sin tocar el lienzo.';
      avatarMood = 'curious';
      passed = false;
      phasePassed = false;
    } else if (gapStrokes.length > 2) {
      feedbackTitle = 'Trazos en Zona de Pausa ⚠️';
      feedbackMessage = `Has dibujado ${gapStrokes.length} líneas en la zona de separación central. Los bloques deben estar separados por un espacio vacío de pausa.`;
      tipMessage = 'Respeta la zona de separación entre el Bloque 1 y el Bloque 2.';
      avatarMood = 'curious';
    } else if (overallScore >= 90) {
      feedbackTitle = '¡Precisión Magistral! 🌟';
      feedbackMessage = `Quiebres nítidos y espaciado de ${measuredAvgSpacingPx}px (±${measuredSpacingVariance}px). Ambos bloques ejecutados con maestría.`;
      tipMessage = 'Excelente control rítmico. Intenta ahora superar las fases de fluidez y velocidad.';
      avatarMood = 'success-stars';
    } else if (overallScore >= 75) {
      feedbackTitle = '¡Nivel Superado! ✅';
      feedbackMessage = `Buen control de la forma con quiebre (${overallScore}%). El paso se mantiene constante a lo largo de los dos bloques.`;
      tipMessage = 'Busca que todos los vértices del quiebre queden a la misma altura horizontal.';
      avatarMood = 'wink';
    } else {
      feedbackTitle = 'Falta de Consistencia 💨';
      feedbackMessage = trackStrokes.length < challenge.minRequiredStrokes
        ? `Has trazado muy pocas líneas (${trackStrokes.length} de al menos ${challenge.minRequiredStrokes}). Rellena ambos bloques.`
        : `La regularidad del espaciado o la definición del quiebre necesitan más ajuste (${overallScore}%).`;
      tipMessage = 'Fíjate en las líneas guía de INICIO y FIN para calibrar la distancia y el ángulo del quiebre.';
      avatarMood = 'fail-spiral';
    }

    return {
      overallScore,
      passed: passed && !isReversed,
      isReversed,
      directionWarning,
      metrics: {
        parallelismScore: Math.round(avgParallelismScore),
        spacingScore: Math.round(avgSpacingScore),
        straightnessScore: Math.round(avgKinkScore),
        tonalDensityScore: Math.round(coverageRatio * 100),
        boundaryScore: Math.round(avgBoundaryScore),
      },
      detectedStats: {
        strokeCount: trackStrokes.length,
        measuredAvgSpacingPx,
        spacingVariance: measuredSpacingVariance,
        measuredAvgAngleDeg: 90,
        measuredOpticalDensityPct: 0,
      },
      feedbackTitle,
      feedbackMessage,
      tipMessage,
      solutionOverlay,
      avatarMood,
      kinematics,
      currentPhase: activePhase,
      phasePassed: phasePassed && !isReversed,
    };
  }

  // 2. Asignar trazos a cada franja/carril según cercanía en Y
  const bandStrokesMap = new Map<string, typeof trackStrokes>();
  for (const b of bands) {
    bandStrokesMap.set(b.id, []);
  }

  for (const ts of trackStrokes) {
    let closestBand = bands[0];
    let minDiff = Infinity;
    for (const b of bands) {
      const bandMid = (b.yTop + b.yBottom) / 2;
      const diff = Math.abs(ts.avgY - bandMid);
      if (diff < minDiff) {
        minDiff = diff;
        closestBand = b;
      }
    }
    bandStrokesMap.get(closestBand.id)!.push(ts);
  }

  // 3. Evaluar cada franja
  let totalSpacingScore = 0;
  let totalBoundaryScore = 0;
  let totalStraightnessScore = 0;
  let totalParallelismScore = 0;

  const allSpacings: number[] = [];
  let evaluatedBandsCount = 0;

  for (const b of bands) {
    const bStrokes = bandStrokesMap.get(b.id)!;
    if (bStrokes.length < 2) {
      // Franja sin suficientes trazos
      continue;
    }
    evaluatedBandsCount++;

    // Ordenar de izquierda a derecha
    bStrokes.sort((a, b) => a.avgX - b.avgX);

    // Calcular espaciados interlineales
    const spacings: number[] = [];
    for (let i = 0; i < bStrokes.length - 1; i++) {
      const dx = bStrokes[i + 1].avgX - bStrokes[i].avgX;
      spacings.push(dx);
      allSpacings.push(dx);
    }

    const meanDx = spacings.reduce((a, b) => a + b, 0) / spacings.length;
    let varDx = 0;
    for (const d of spacings) {
      varDx += (d - meanDx) * (d - meanDx);
    }
    const stdDx = Math.sqrt(varDx / spacings.length);

    // Puntuación de espaciado: fidelidad al paso objetivo (targetSpacing) + regularidad interna
    const accuracyVsTarget = Math.max(0, 100 - Math.abs(meanDx - targetSpacing) * 7.5);
    const regularity = Math.max(0, 100 - stdDx * 12);
    const bandSpacingScore = accuracyVsTarget * 0.45 + regularity * 0.55;
    totalSpacingScore += bandSpacingScore;

    // Contención en carriles (altura y bordes superior/inferior)
    let bandBoundarySum = 0;
    for (const s of bStrokes) {
      const topErr = Math.abs(s.topY - b.yTop);
      const botErr = Math.abs(s.botY - b.yBottom);
      // Tolerancia de 6px
      const strokeBoundary = Math.max(0, 100 - (Math.max(0, topErr - 4) + Math.max(0, botErr - 4)) * 4);
      bandBoundarySum += strokeBoundary;
    }
    totalBoundaryScore += bandBoundarySum / bStrokes.length;

    // Rectitud y angularidad de los trazos de esta banda
    let bandStraightSum = 0;
    let bandAngleSum = 0;
    for (const s of bStrokes) {
      bandStraightSum += evaluateStrokeStraightness(s.stroke);
      const { angleFromHorizontalDeg, isSlash } = getStrokeSlopeAngle(s.stroke);
      let strokeAngleScore = 100;
      if (targetAngle === 90) {
        const angleDev = Math.abs(angleFromHorizontalDeg - 90);
        strokeAngleScore = Math.max(0, 100 - angleDev * 3.5);
      } else {
        const angleDev = Math.abs(angleFromHorizontalDeg - targetAngle);
        const expectedSlash =
          targetDir === 'bottom_up_left_right' || targetDir === 'top_down_right_left';
        if (isSlash !== expectedSlash) {
          strokeAngleScore = 0;
        } else {
          strokeAngleScore = Math.max(0, 100 - angleDev * 4.0);
        }
      }
      bandAngleSum += strokeAngleScore;
    }
    totalStraightnessScore += bandStraightSum / bStrokes.length;
    totalParallelismScore += bandAngleSum / bStrokes.length;
  }

  // Si alguna banda quedó completamente sin dibujar en retos multi-banda
  const missingBands = bands.length - evaluatedBandsCount;
  const coverageRatio = evaluatedBandsCount / bands.length;

  const avgSpacingScore = evaluatedBandsCount > 0 ? (totalSpacingScore / evaluatedBandsCount) * coverageRatio : 0;
  const avgBoundaryScore = evaluatedBandsCount > 0 ? (totalBoundaryScore / evaluatedBandsCount) * coverageRatio : 0;
  const avgStraightnessScore = evaluatedBandsCount > 0 ? totalStraightnessScore / evaluatedBandsCount : 0;
  const avgParallelismScore = evaluatedBandsCount > 0 ? totalParallelismScore / evaluatedBandsCount : 0;

  const measuredAvgSpacingPx = allSpacings.length > 0 ? Math.round((allSpacings.reduce((a, b) => a + b, 0) / allSpacings.length) * 10) / 10 : 0;
  let allVar = 0;
  if (allSpacings.length > 0) {
    for (const d of allSpacings) allVar += (d - measuredAvgSpacingPx) * (d - measuredAvgSpacingPx);
  }
  const measuredSpacingVariance = allSpacings.length > 0 ? Math.round(Math.sqrt(allVar / allSpacings.length) * 10) / 10 : 0;

  // Penalización por pocos trazos
  const strokeCountPenalty = trackStrokes.length < challenge.minRequiredStrokes
    ? Math.min(30, (challenge.minRequiredStrokes - trackStrokes.length) * 5)
    : 0;

  // Cinemática en los trazos dibujados: evaluamos cada trazo y promediamos
  const activePhase = challenge.activePhase || 1;
  const kinematicsList = trackStrokes.map((ts) =>
    analyzeStrokeKinematics(ts.stroke, targetDir, activePhase, challenge.targetLengthPx || 120)
  );

  const avgSpeed = Math.round(
    kinematicsList.reduce((acc, k) => acc + k.avgSpeedPxPerSec, 0) / (kinematicsList.length || 1)
  );
  const avgFluency = Math.round(
    kinematicsList.reduce((acc, k) => acc + k.fluencyScore, 0) / (kinematicsList.length || 1)
  );
  const avgDuration = Math.round(
    kinematicsList.reduce((acc, k) => acc + k.durationMs, 0) / (kinematicsList.length || 1)
  );
  const allPhasePassed = kinematicsList.length > 0 && kinematicsList.every((k) => k.phasePassed);

  const kinematics = kinematicsList[0]
    ? {
        ...kinematicsList[0],
        durationMs: avgDuration,
        avgSpeedPxPerSec: avgSpeed,
        fluencyScore: avgFluency,
        phasePassed: allPhasePassed,
      }
    : undefined;

  // Ponderación base de geometría
  let geometricScore =
    avgSpacingScore * 0.40 +
    avgBoundaryScore * 0.25 +
    avgStraightnessScore * 0.20 +
    avgParallelismScore * 0.15 -
    strokeCountPenalty;

  geometricScore = Math.max(0, Math.min(100, Math.round(geometricScore)));

  // Ponderación por Fase
  let overallScore = geometricScore;
  let phasePassed = false;

  if (activePhase === 1) {
    // Fase 1: Precisión Pura
    overallScore = geometricScore;
    phasePassed = overallScore >= 75;
  } else if (activePhase === 2) {
    // Fase 2: Fluidez (80% geom, 20% fluidez)
    const fluency = kinematics?.fluencyScore || 80;
    overallScore = Math.round(geometricScore * 0.80 + fluency * 0.20);
    phasePassed = overallScore >= 75 && fluency >= 70;
  } else {
    // Fase 3: Velocidad (70% geom, 30% velocidad)
    const speedPassed = kinematics?.phasePassed ?? true;
    const speedScore = speedPassed ? 100 : 50;
    overallScore = Math.round(geometricScore * 0.70 + speedScore * 0.30);
    phasePassed = overallScore >= 75 && speedPassed;
  }

  let passed = overallScore >= 75;

  // Solución overlay con las líneas ideales
  const solutionOverlay = {
    points: [],
    multiLines: challenge.ghostSolutionStrokes || [],
    color: '#000000',
    label: `Paso Objetivo: ${targetSpacing}px`,
  };

  let feedbackTitle = '¡Ritmo y Espaciado Logrado!';
  let feedbackMessage = `Has conseguido un paso medio de ${measuredAvgSpacingPx}px (objetivo: ${targetSpacing}px) con una regularidad de ±${measuredSpacingVariance}px.`;
  let tipMessage = 'Mantén la mirada un paso por delante de la mano para anticipar la separación uniforme.';
  let avatarMood: AvatarMood = 'wink';
  let directionWarning: string | undefined;

  if (isReversed) {
    const dirNames: Record<StrokeDirection, string> = {
      bottom_up_left_right: 'de abajo a arriba hacia la derecha (↗)',
      top_down_right_left: 'de arriba a abajo hacia la izquierda (↙)',
      top_down_left_right: 'de arriba a abajo hacia la derecha (↘)',
      bottom_up_right_left: 'de abajo a arriba hacia la izquierda (↖)',
      vertical_top_down: 'de arriba a abajo (↓)',
      vertical_bottom_up: 'de abajo a arriba (↑)',
      horizontal_left_right: 'de izquierda a derecha (→)',
      horizontal_right_left: 'de derecha a izquierda (←)',
      shallow_up_left_right: 'de izquierda a derecha (~15° ↗)',
      shallow_up_right_left: 'de derecha a izquierda (~15° ↖)',
      radial_outward: 'de dentro hacia afuera (☼)',
      radial_inward: 'de fuera hacia dentro (❂)',
      curve_c: 'siguiendo el arco en C',
      curve_s: 'siguiendo la onda en S',
    };
    const expectedText = dirNames[targetDir] || 'en la dirección indicada';
    directionWarning = `⚠️ DIRECCIÓN INVERTIDA: Has trazado en sentido contrario. Debes trazar ${expectedText}.`;
    overallScore = 0;
    phasePassed = false;
    passed = false;
    feedbackTitle = 'Dirección Invertida 🔄';
    feedbackMessage = directionWarning;
    tipMessage = `Respeta el sentido del trazo: ${expectedText}.`;
    avatarMood = 'fail-spiral';
  } else if (missingBands > 0) {
    feedbackTitle = 'Franjas Incompletas';
    feedbackMessage = `Has dibujado en ${evaluatedBandsCount} de las ${bands.length} franjas requeridas. Completa todas las franjas.`;
    tipMessage = 'Recorre cada carril horizontal de izquierda a derecha antes de calificar.';
    avatarMood = 'curious';
  } else if (overallScore >= 90) {
    feedbackTitle = '¡Consistencia Magistral! 🌟';
    feedbackMessage = `Ritmo milimétrico: espaciado de ${measuredAvgSpacingPx}px (desviación solo ±${measuredSpacingVariance}px) y ajuste perfecto entre los carriles horizontales.`;
    tipMessage = 'Excelente memoria muscular. Intenta mantener este ritmo aumentando la fluidez o con el paso fino x/2.';
    avatarMood = 'success-stars';
  } else if (overallScore >= 75) {
    feedbackTitle = '¡Nivel Superado! ✅';
    feedbackMessage = `Buen control de espaciado (${overallScore}%). El patrón se mantiene regular a lo largo del carril.`;
    tipMessage = 'Cuida que las líneas no se queden cortas ni rebasen las dos líneas horizontales.';
    avatarMood = 'wink';
  } else if (overallScore >= 50) {
    feedbackTitle = 'Regularidad Inestable ⚠️';
    feedbackMessage = `El espaciado varió (media ${measuredAvgSpacingPx}px vs objetivo ${targetSpacing}px, ±${measuredSpacingVariance}px).`;
    tipMessage = 'No aceleres ni frenes entre trazos; mantén una cadencia rítmica como un metrónomo.';
    avatarMood = 'curious';
  } else {
    feedbackTitle = 'Falta de Consistencia 💨';
    feedbackMessage = trackStrokes.length < challenge.minRequiredStrokes
      ? `Has trazado muy pocas líneas (${trackStrokes.length} de al menos ${challenge.minRequiredStrokes}). Llena el carril de izquierda a derecha.`
      : `La distancia entre líneas se desvió demasiado del patrón de muestra.`;
    tipMessage = 'Fíjate continuamente en la muestra a la izquierda para calibrar la distancia entre cada trazo.';
    avatarMood = 'fail-spiral';
  }

  return {
    overallScore,
    passed: passed && !isReversed,
    isReversed,
    directionWarning,
    metrics: {
      parallelismScore: Math.round(avgParallelismScore),
      spacingScore: Math.round(avgSpacingScore),
      straightnessScore: Math.round(avgStraightnessScore),
      tonalDensityScore: Math.round(coverageRatio * 100),
      boundaryScore: Math.round(avgBoundaryScore),
    },
    detectedStats: {
      strokeCount: trackStrokes.length,
      measuredAvgSpacingPx,
      spacingVariance: measuredSpacingVariance,
      measuredAvgAngleDeg: Math.round(targetAngle),
      measuredOpticalDensityPct: 0,
    },
    feedbackTitle,
    feedbackMessage,
    tipMessage,
    solutionOverlay,
    avatarMood,
    kinematics,
    currentPhase: activePhase,
    phasePassed: phasePassed && !isReversed,
  };
}

/**
 * Validador principal para evaluar cualquier reto del laboratorio
 */
export function evaluateStrokeSubmission(
  strokes: RawStroke[],
  challenge: ProceduralStrokeChallenge
): StrokeEvaluation {
  // Si es un reto de carriles y espaciado (Consistencia 1.1)
  if (challenge.spacingTrackParams) {
    return evaluateSpacingTrackSubmission(strokes, challenge);
  }

  // Si es un reto multi-línea (2 o 3 líneas dispersas)
  if (
    (challenge.multiLineCount && challenge.multiLineCount > 1) ||
    (challenge.targetLines && challenge.targetLines.length > 1)
  ) {
    return evaluateMultiLineSubmission(strokes, challenge);
  }

  // Si es un reto de trazo único, usar el evaluador de calistenia instantánea
  if (
    challenge.isSingleStrokeAutoEval ||
    challenge.category === 'single_stroke_line' ||
    challenge.category === 'single_stroke_curve'
  ) {
    return evaluateSingleStrokeSubmission(strokes, challenge);
  }

  if (strokes.length === 0) {
    return {
      overallScore: 0,
      passed: false,
      metrics: {
        parallelismScore: 0,
        spacingScore: 0,
        straightnessScore: 0,
        tonalDensityScore: 0,
        boundaryScore: 0,
      },
      detectedStats: {
        strokeCount: 0,
        measuredAvgSpacingPx: 0,
        spacingVariance: 0,
        measuredAvgAngleDeg: 0,
        measuredOpticalDensityPct: 0,
      },
      feedbackTitle: '¡Lienzo Vacío!',
      feedbackMessage: 'No has dibujado ningún trazo todavía. Toma el lápiz o ratón y practica el ejercicio.',
      tipMessage: 'Recuerda bloquear la muñeca y pivotar con el antebrazo para lograr líneas seguras.',
      avatarMood: 'surprised',
    };
  }

  // 1. Rectitud promedio
  let sumStraightness = 0;
  for (const s of strokes) {
    sumStraightness += evaluateStrokeStraightness(s);
  }
  const straightnessScore = Math.round(sumStraightness / strokes.length);

  // 2. Paralelismo y ángulos
  const angleMetrics = evaluateAnglesAndParallelism(strokes, challenge.targetAngleDeg);

  // 3. Espaciado y ritmo
  const spacingMetrics = evaluateSpacing(strokes, challenge.targetSpacingPx);

  // 4. Métrica específica según categoría
  let tonalDensityScore = 80;
  let measuredDensity = 0;
  let boundaryScore = 90;

  if (challenge.category === 'cross_hatch_density' && challenge.guideBounds) {
    const gb = challenge.guideBounds;
    const poly = [
      { x: gb.x, y: gb.y },
      { x: gb.x + gb.width, y: gb.y },
      { x: gb.x + gb.width, y: gb.y + gb.height },
      { x: gb.x, y: gb.y + gb.height },
    ];
    measuredDensity = calculateOpticalDensity(strokes, poly);
    const targetDensity = (challenge.subtitle.match(/(\d+)%/) || [])[1]
      ? parseInt((challenge.subtitle.match(/(\d+)%/) || [])[1], 10)
      : 30;

    const densityDiff = Math.abs(measuredDensity - targetDensity);
    tonalDensityScore = Math.round(Math.max(0, 100 - densityDiff * 3.5));
  } else if (challenge.category === 'polyhedron_shading' && challenge.polySolid) {
    // Evaluar cada cara del prisma
    let faceScoreSum = 0;
    for (const face of challenge.polySolid.faces) {
      const faceDensity = calculateOpticalDensity(strokes, face.vertices);
      const faceDiff = Math.abs(faceDensity - face.targetDensityPct);
      faceScoreSum += Math.max(0, 100 - faceDiff * 3);
    }
    tonalDensityScore = Math.round(faceScoreSum / challenge.polySolid.faces.length);
  } else if (challenge.category === 'cross_contour_blob' && challenge.blobShape) {
    // Evaluar que las líneas cruzan perpendicularmente el eje
    const axis = challenge.blobShape.axisLine;
    const axisAngle = Math.atan2(axis.y2 - axis.y1, axis.x2 - axis.x1) * 180 / Math.PI;
    const targetAngle = axisAngle + 90;
    const blobAngleMetrics = evaluateAnglesAndParallelism(strokes, targetAngle);
    tonalDensityScore = blobAngleMetrics.parallelismScore;
  }

  // Comprobar cantidad mínima de trazos
  const strokeCountPenalty = strokes.length < challenge.minRequiredStrokes ? 25 : 0;

  // Ponderación global según la naturaleza del reto
  let overallScore = 0;
  if (challenge.category === 'parallel_lines') {
    overallScore =
      angleMetrics.parallelismScore * 0.35 +
      spacingMetrics.spacingScore * 0.35 +
      straightnessScore * 0.30 -
      strokeCountPenalty;
  } else if (challenge.category === 'curved_s_waves') {
    overallScore =
      spacingMetrics.spacingScore * 0.40 +
      straightnessScore * 0.30 + // En curvas mide suavidad de curvatura
      angleMetrics.parallelismScore * 0.30 -
      strokeCountPenalty;
  } else if (challenge.category === 'cross_hatch_density') {
    overallScore =
      tonalDensityScore * 0.55 +
      angleMetrics.parallelismScore * 0.25 +
      straightnessScore * 0.20 -
      strokeCountPenalty;
  } else if (challenge.category === 'cross_contour_blob') {
    overallScore =
      tonalDensityScore * 0.50 +
      spacingMetrics.spacingScore * 0.30 +
      straightnessScore * 0.20 -
      strokeCountPenalty;
  } else {
    // polyhedron_shading
    overallScore =
      tonalDensityScore * 0.60 +
      angleMetrics.parallelismScore * 0.25 +
      straightnessScore * 0.15 -
      strokeCountPenalty;
  }

  overallScore = Math.min(100, Math.max(0, Math.round(overallScore)));
  const passed = overallScore >= 70;

  let feedbackTitle = '¡Buen Trabajo!';
  let feedbackMessage = 'Has demostrado buen control rítmico y pulso.';
  let tipMessage = 'Mantén la velocidad de trazo constante para evitar engrosamientos en los extremos.';
  let avatarMood: AvatarMood = 'wink';

  if (overallScore >= 90) {
    feedbackTitle = '¡Precisión de Maestro! 🌟';
    feedbackMessage = `Dominio excepcional: espaciado de ${spacingMetrics.avgSpacingPx}px (±${spacingMetrics.spacingStdDev}px) y paralelismo de ${angleMetrics.avgAngleDeg}° con desviación casi nula.`;
    tipMessage = 'Intenta ahora el siguiente reto aleatorio para forzar tu vista en un nuevo ángulo.';
    avatarMood = 'success-stars';
  } else if (overallScore >= 75) {
    feedbackTitle = '¡Nivel Superado! ✅';
    feedbackMessage = `Buen control general (${overallScore}%). El ritmo se mantuvo uniforme durante la mayoría de los trazos.`;
    tipMessage = 'Afina la rectitud de los primeros y últimos trazos de la serie.';
    avatarMood = 'wink';
  } else if (overallScore >= 55) {
    feedbackTitle = '¡Casi lo Tienes! ⚠️';
    feedbackMessage = `Se observa ligera dispersión: el espaciado varió ±${spacingMetrics.spacingStdDev}px y la desviación angular fue de ±${angleMetrics.angleVariance}°.`;
    tipMessage = 'Respira hondo antes de cada trazo y bloquea la muñeca; deja que el movimiento fluya desde el hombro.';
    avatarMood = 'curious';
  } else {
    feedbackTitle = 'Requiere Más Calma 💨';
    feedbackMessage = strokes.length < challenge.minRequiredStrokes
      ? `Has trazado solo ${strokes.length} líneas de las ${challenge.minRequiredStrokes} requeridas para este reto.`
      : `El ritmo de las líneas o el ángulo se dispersó significativamente (${overallScore}%).`;
    tipMessage = 'Activa las guías visuales y practica a velocidad más moderada.';
    avatarMood = 'fail-spiral';
  }

  return {
    overallScore,
    passed,
    metrics: {
      parallelismScore: angleMetrics.parallelismScore,
      spacingScore: spacingMetrics.spacingScore,
      straightnessScore,
      tonalDensityScore,
      boundaryScore,
    },
    detectedStats: {
      strokeCount: strokes.length,
      measuredAvgSpacingPx: spacingMetrics.avgSpacingPx,
      spacingVariance: spacingMetrics.spacingStdDev,
      measuredAvgAngleDeg: angleMetrics.avgAngleDeg,
      measuredOpticalDensityPct: Math.round(measuredDensity * 10) / 10,
    },
    feedbackTitle,
    feedbackMessage,
    tipMessage,
    avatarMood,
  };
}
