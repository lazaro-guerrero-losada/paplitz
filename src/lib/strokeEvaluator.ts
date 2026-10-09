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

  // 6. Análisis Cinemático y Derivadas (Velocidad, Aceleración, Fluidez y Fase)
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

  // 7. Cálculo Global Ponderado según Fase de Motricidad
  const geometricScore = Math.round(
    boundaryScore * 0.40 + straightnessScore * 0.35 + parallelismScore * 0.25
  );

  let overallScore = geometricScore;
  let phasePassed = false;

  if (activePhase === 1) {
    // Fase 1: Precisión pura de puntería y rectitud
    overallScore = geometricScore;
    phasePassed = overallScore >= 75 && kinematics.phasePassed;
  } else if (activePhase === 2) {
    // Fase 2: Fluidez (70% Geometría + 30% Fluidez cinemática)
    overallScore = Math.round(geometricScore * 0.70 + kinematics.fluencyScore * 0.30);
    phasePassed = overallScore >= 75 && kinematics.phasePassed;
  } else {
    // Fase 3: Velocidad Balística (60% Geometría + 40% Velocidad Balística ponderada)
    const targetFastSpeed = Math.max(360, Math.round(kinematics.userBaselineSpeedPxPerSec * 0.95));
    const speedRatio = kinematics.avgSpeedPxPerSec / targetFastSpeed;
    const speedScore = Math.min(100, Math.round(Math.max(0, speedRatio * 100)));

    overallScore = Math.round(geometricScore * 0.60 + speedScore * 0.40);
    phasePassed = overallScore >= 75 && kinematics.phasePassed;
  }

  let directionWarning: string | undefined;
  if (isReversed) {
    overallScore = 0;
    boundaryScore = 0;
    straightnessScore = 0;
    parallelismScore = 0;
    phasePassed = false;
    directionWarning = '⚠️ DIRECCIÓN INVERTIDA: Has trazado en sentido contrario (de ② hacia ①). Debes iniciar en ① y proyectar hacia ②.';
  }

  // Criterios estrictos de aprobación (Geometría + Cinemática de Fase cumplida)
  let passed = !isReversed && overallScore >= 75 && phasePassed;
  if (startErr > 38 || endErr > 44) {
    passed = false;
  }
  if (!isCurve && angleDiff > 20) {
    passed = false;
  }
  if (!isCurve && straightnessScore < 60) {
    passed = false;
  }

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
    if (activePhase === 2 && !kinematics.phasePassed) {
      feedbackTitle = 'Línea Precisa pero Falta Fluidez 〰️';
      feedbackMessage = `${kinematics.speedDiagnosisLabel}. Fluidez: ${kinematics.fluencyScore}%. ${kinematics.phaseRequirementText}.`;
      tipMessage = 'Bloquea la muñeca y mueve el antebrazo en un único impulso sin corregir a mitad de camino.';
      avatarMood = 'curious';
    } else if (activePhase === 3 && !kinematics.phasePassed) {
      feedbackTitle = 'Buena Línea pero Requiere Velocidad ⚡';
      feedbackMessage = `${kinematics.speedDiagnosisLabel}. Velocidad: ${kinematics.avgSpeedPxPerSec} px/s. ${kinematics.phaseRequirementText}.`;
      tipMessage = 'Proyecta el movimiento con dos pasadas rápidas en el aire (ghosting) y dispara sin miedo con impulso balístico.';
      avatarMood = 'curious';
    } else if (overallScore >= 50) {
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
  const geometricScore = Math.round(lineResults.reduce((a, b) => a + b.overallLineScore, 0) / lineResults.length);
  const hasAnyReversed = lineResults.some((r) => r.isReversed);

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

  let overallScore = geometricScore;
  if (activePhase === 1) {
    overallScore = geometricScore;
  } else if (activePhase === 2) {
    overallScore = Math.round(geometricScore * 0.70 + avgFluency * 0.30);
  } else {
    const targetFastSpeed = Math.max(360, Math.round(userBaseline * 0.95));
    const speedRatio = avgSpeed / targetFastSpeed;
    const speedScore = Math.min(100, Math.round(Math.max(0, speedRatio * 100)));
    overallScore = Math.round(geometricScore * 0.60 + speedScore * 0.40);
  }

  if (hasAnyReversed) {
    overallScore = 0;
  }

  const phasePassed = !hasAnyReversed && allPhasesPassed && overallScore >= 75;

  // Criterios estrictos de aprobación (Geometría + Cinemática de Fase)
  let passed = !hasAnyReversed && overallScore >= 75 && phasePassed;
  for (const r of lineResults) {
    if (r.startErr > 40 || r.endErr > 46 || r.angleDiff > 22 || r.straightnessScore < 55) {
      passed = false;
      break;
    }
  }

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
/**
 * Evalúa la fidelidad del patrón Zigzag en Onda (◄►◄) (E8.1):
 * - Trazo continuo de arriba a abajo entre rieles con 3 quiebres alternados:
 *   1. Vértice 1 a ~1/4 de altura: pico hacia la izquierda (◄, deflexión objetivo 16px)
 *   2. Vértice 2 a ~1/2 de altura: hendidura hacia la derecha retornando a la vertical nominal
 *   3. Vértice 3 a ~3/4 de altura: pico hacia la izquierda (◄, deflexión objetivo 16px)
 *   4. Retorno al riel inferior en la misma vertical de inicio
 */
function evaluateZigzagWaveFidelity(
  stroke: RawStroke,
  yTop: number,
  yBottom: number
): {
  score: number;
  hasKink: boolean;
  isCorrectDirection: boolean;
  apexDeflection: number;
  apexYRel: number;
} {
  if (stroke.points.length < 5) {
    return { score: 10, hasKink: false, isCorrectDirection: false, apexDeflection: 0, apexYRel: 0 };
  }

  const h = yBottom - yTop;
  const pStart = stroke.points[0];
  const pEnd = stroke.points[stroke.points.length - 1];
  const refX = (pStart.x + pEnd.x) / 2;

  // Segmentar puntos en 3 zonas verticales para detectar los 2 picos izquierdos y la hendidura central
  const zone1Points = stroke.points.filter((p) => p.y >= yTop + h * 0.08 && p.y <= yTop + h * 0.42);
  const zone2Points = stroke.points.filter((p) => p.y >= yTop + h * 0.35 && p.y <= yTop + h * 0.65);
  const zone3Points = stroke.points.filter((p) => p.y >= yTop + h * 0.58 && p.y <= yTop + h * 0.92);

  if (zone1Points.length === 0 || zone3Points.length === 0) {
    return { score: 15, hasKink: false, isCorrectDirection: false, apexDeflection: 0, apexYRel: 0 };
  }

  // Pico 1 (zona 1): punto más a la izquierda (mínimo X)
  let p1Peak = zone1Points[0];
  let p1MinX = Infinity;
  let p1MaxX = -Infinity;
  for (const p of zone1Points) {
    if (p.x < p1MinX) {
      p1MinX = p.x;
      p1Peak = p;
    }
    if (p.x > p1MaxX) {
      p1MaxX = p.x;
    }
  }
  const p1LeftDeflection = refX - p1MinX;
  const p1RightDeflection = p1MaxX - refX;

  // Hendidura central (zona 2): punto más a la derecha (máximo X)
  let pCenterMaxX = -Infinity;
  if (zone2Points.length > 0) {
    for (const p of zone2Points) {
      if (p.x > pCenterMaxX) pCenterMaxX = p.x;
    }
  } else {
    pCenterMaxX = refX;
  }

  // Pico 2 (zona 3): punto más a la izquierda (mínimo X)
  let p2Peak = zone3Points[0];
  let p2MinX = Infinity;
  let p2MaxX = -Infinity;
  for (const p of zone3Points) {
    if (p.x < p2MinX) {
      p2MinX = p.x;
      p2Peak = p;
    }
    if (p.x > p2MaxX) {
      p2MaxX = p.x;
    }
  }
  const p2LeftDeflection = refX - p2MinX;
  const p2RightDeflection = p2MaxX - refX;

  // Condiciones de presencia del zigzag:
  // - Ambos picos se desvían al menos 6px hacia la izquierda
  // - La hendidura central retorna hacia la derecha respecto a los picos al menos 3px
  const hasKink = p1LeftDeflection >= 6.0 && p2LeftDeflection >= 6.0 && (pCenterMaxX - Math.max(p1MinX, p2MinX) >= 3.0 || pCenterMaxX - ((p1MinX + p2MinX) / 2) >= 4.0);

  // Dirección correcta: los picos se desvían a la izquierda (◄), no a la derecha (►)
  const isCorrectDirection = hasKink && p1LeftDeflection >= p1RightDeflection && p2LeftDeflection >= p2RightDeflection;

  if (!hasKink) {
    return {
      score: 15,
      hasKink: false,
      isCorrectDirection: false,
      apexDeflection: Math.max(0, (p1LeftDeflection + p2LeftDeflection) / 2),
      apexYRel: 0.5,
    };
  }

  if (!isCorrectDirection) {
    return {
      score: 25,
      hasKink: true,
      isCorrectDirection: false,
      apexDeflection: (p1LeftDeflection + p2LeftDeflection) / 2,
      apexYRel: 0.5,
    };
  }

  // Puntuación:
  // 1. Deflexión de Pico 1 vs 16px objetivo
  const p1DeflDiff = Math.abs(p1LeftDeflection - 16);
  const p1Score = Math.max(0, 100 - p1DeflDiff * 5.0);

  // 2. Deflexión de Pico 2 vs 16px objetivo
  const p2DeflDiff = Math.abs(p2LeftDeflection - 16);
  const p2Score = Math.max(0, 100 - p2DeflDiff * 5.0);

  // 3. Hendidura central cerca de refX (dx ≈ 0)
  const centerDiff = Math.abs(pCenterMaxX - refX);
  const centerScore = Math.max(0, 100 - centerDiff * 6.0);

  // 4. Ubicación vertical de los picos (p1 ≈ 0.25h, p2 ≈ 0.75h)
  const p1YRel = (p1Peak.y - yTop) / h;
  const p2YRel = (p2Peak.y - yTop) / h;
  const yScore = Math.max(0, 100 - (Math.abs(p1YRel - 0.25) + Math.abs(p2YRel - 0.75)) * 140);

  // 5. Alineación vertical de los extremos (|pEnd.x - pStart.x| cercano a 0)
  const returnDiff = Math.abs(pEnd.x - pStart.x);
  const returnScore = Math.max(0, 100 - returnDiff * 5.0);

  const score = Math.round(
    p1Score * 0.25 +
    p2Score * 0.25 +
    centerScore * 0.20 +
    yScore * 0.15 +
    returnScore * 0.15
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    hasKink: true,
    isCorrectDirection: true,
    apexDeflection: (p1LeftDeflection + p2LeftDeflection) / 2,
    apexYRel: 0.5,
  };
}

/**
 * Evalúa la fidelidad de un trazo relámpago en Z/N horizontal (↗↘↗):
 * - Comienza en xStart, yBase
 * - Asciende en diagonal (↗) hasta el Pico 1 (x ≈ xStart + w/3, y ≈ yBase - 34)
 * - Desciende en diagonal (↘) hasta el Valle (x ≈ xStart + 2w/3, y ≈ yBase)
 * - Asciende en diagonal (↗) hasta el Fin (x ≈ xEnd, y ≈ yBase - 34)
 * - Trazado continuo de izquierda a derecha
 */
function evaluateZNWaveFidelity(
  stroke: RawStroke,
  xStart: number,
  xEnd: number,
  yTop: number,
  yBottom: number
): {
  score: number;
  hasZN: boolean;
  isCorrectDirection: boolean;
  yBase: number;
  ampPeak: number;
  ampValley: number;
} {
  if (stroke.points.length < 4) {
    return {
      score: 10,
      hasZN: false,
      isCorrectDirection: false,
      yBase: (yTop + yBottom) / 2,
      ampPeak: 0,
      ampValley: 0,
    };
  }

  const pStart = stroke.points[0];
  const pEnd = stroke.points[stroke.points.length - 1];
  const w = xEnd - xStart;

  // 1. Dirección: debe trazarse de izquierda a derecha (pEnd.x > pStart.x)
  const isCorrectDirection = (pEnd.x - pStart.x) >= 30;

  // 2. Cobertura horizontal de bloque
  let minX = Infinity;
  let maxX = -Infinity;
  for (const p of stroke.points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
  }
  const spanX = maxX - minX;
  const spanDiff = Math.abs(spanX - w);
  const spanScore = Math.max(0, 100 - spanDiff * 2.5);

  // 3. Buscar Pico 1 (zona primer tercio: x <= xStart + w * 0.55) -> mínimo Y (más alto)
  let peak1 = stroke.points[0];
  let peak1Idx = 0;
  for (let i = 0; i < stroke.points.length; i++) {
    const p = stroke.points[i];
    if (p.x <= xStart + w * 0.55) {
      if (p.y < peak1.y) {
        peak1 = p;
        peak1Idx = i;
      }
    }
  }

  // 4. Buscar Valle 1 (zona segundo tercio: x >= xStart + w * 0.40 && x <= xStart + w * 0.85) -> máximo Y (más bajo)
  let valley1 = stroke.points[Math.min(peak1Idx + 1, stroke.points.length - 1)];
  for (let i = 0; i < stroke.points.length; i++) {
    const p = stroke.points[i];
    if (p.x >= xStart + w * 0.40 && p.x <= xStart + w * 0.85) {
      if (p.y > valley1.y) {
        valley1 = p;
      }
    }
  }

  // 5. Punto final del trazo (extremo derecho)
  const endPoint = pEnd;

  // 6. Estimación de línea base del trazo: promedio entre pStart.y y valley1.y
  const yBase = (pStart.y + valley1.y) / 2;

  // Amplitudes
  const ampPeak = yBase - peak1.y; // debe ser positivo y cercano a 34px
  const ampValley = valley1.y - peak1.y; // debe ser positivo y cercano a 34px
  const ampEnd = yBase - endPoint.y; // debe ser positivo y cercano a 34px

  // Presencia de forma en Z/N (no línea recta ni garabato sin cresta)
  const hasZN = ampPeak >= 12 && ampValley >= 12 && ampEnd >= 10;

  if (!hasZN) {
    return {
      score: 15,
      hasZN: false,
      isCorrectDirection,
      yBase,
      ampPeak,
      ampValley,
    };
  }

  if (!isCorrectDirection) {
    return {
      score: 25,
      hasZN: true,
      isCorrectDirection: false,
      yBase,
      ampPeak,
      ampValley,
    };
  }

  // Puntuación geométrica:
  // a) Amplitud de Pico 1 vs 34px
  const peakDefScore = Math.max(0, 100 - Math.abs(ampPeak - 34) * 3.5);
  // b) Posición X de Pico 1 vs xStart + w/3
  const targetPeakX = xStart + w / 3;
  const peakXScore = Math.max(0, 100 - Math.abs(peak1.x - targetPeakX) * 4.0);

  // c) Amplitud de Valle vs 34px
  const valleyDefScore = Math.max(0, 100 - Math.abs(ampValley - 34) * 3.5);
  // d) Posición X de Valle vs xStart + 2w/3
  const targetValleyX = xStart + (2 * w) / 3;
  const valleyXScore = Math.max(0, 100 - Math.abs(valley1.x - targetValleyX) * 4.0);

  // e) Altura del extremo final: debe ascender de nuevo al nivel del pico (endPoint.y ≈ peak1.y)
  const endLevelDiff = Math.abs(endPoint.y - peak1.y);
  const endLevelScore = Math.max(0, 100 - endLevelDiff * 3.5);

  const score = Math.round(
    peakDefScore * 0.20 +
    peakXScore * 0.15 +
    valleyDefScore * 0.20 +
    valleyXScore * 0.15 +
    endLevelScore * 0.15 +
    spanScore * 0.15
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    hasZN,
    isCorrectDirection,
    yBase,
    ampPeak,
    ampValley,
  };
}

/**
 * Evalúa la fidelidad de un trazo con doble quiebre en corchete [ (bracket_left):
 * - Comienza en el riel superior (xStart, yTop)
 * - Desciende en diagonal hacia la izquierda (↙) hasta el Vértice 1 a 1/3 de altura (xStart - 26, yTop + h/3)
 * - Desciende verticalmente (↓) hasta el Vértice 2 a 2/3 de altura (xStart - 26, yTop + 2h/3)
 * - Desciende en diagonal hacia la derecha (↘) hasta el riel inferior (xStart, yBottom)
 * - Ambos extremos apoyan en la misma vertical X
 */
function evaluateBracketFidelity(
  stroke: RawStroke,
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
    return { score: 10, hasKink: false, isCorrectDirection: false, apexDeflection: 0, apexYRel: 0.5 };
  }

  const h = yBottom - yTop;
  const pStart = stroke.points[0];
  const pEnd = stroke.points[stroke.points.length - 1];

  // Eje de referencia: promedio X de los dos extremos
  const refX = (pStart.x + pEnd.x) / 2;

  let maxTargetDefl1 = 0; // Vértice 1 a 1/3
  let maxOppositeDefl1 = 0;
  let p1Peak = stroke.points[0];

  let maxTargetDefl2 = 0; // Vértice 2 a 2/3
  let maxOppositeDefl2 = 0;
  let p2Peak = stroke.points[stroke.points.length - 1];

  let centerDefl = 0; // Tramo central vertical
  let centerPointsCount = 0;

  for (const p of stroke.points) {
    const leftDefl = refX - p.x;
    const rightDefl = p.x - refX;

    if (p.y >= yTop + h * 0.15 && p.y <= yTop + h * 0.45) {
      if (leftDefl > maxTargetDefl1) {
        maxTargetDefl1 = leftDefl;
        p1Peak = p;
      }
      if (rightDefl > maxOppositeDefl1) maxOppositeDefl1 = rightDefl;
    }

    if (p.y >= yTop + h * 0.40 && p.y <= yTop + h * 0.60) {
      centerDefl += leftDefl;
      centerPointsCount++;
    }

    if (p.y >= yTop + h * 0.55 && p.y <= yTop + h * 0.85) {
      if (leftDefl > maxTargetDefl2) {
        maxTargetDefl2 = leftDefl;
        p2Peak = p;
      }
      if (rightDefl > maxOppositeDefl2) maxOppositeDefl2 = rightDefl;
    }
  }

  const avgCenterDefl = centerPointsCount > 0 ? centerDefl / centerPointsCount : (maxTargetDefl1 + maxTargetDefl2) / 2;

  // Condiciones de presencia de corchete:
  // - Ambos vértices se desvían al menos 7px hacia la izquierda
  // - El tramo central también mantiene deflexión hacia la izquierda
  const hasKink = maxTargetDefl1 >= 7.0 && maxTargetDefl2 >= 7.0 && avgCenterDefl >= 6.0;

  // Dirección correcta: deflexiones hacia la izquierda (◄), no a la derecha
  const isCorrectDirection = hasKink && maxTargetDefl1 >= maxOppositeDefl1 && maxTargetDefl2 >= maxOppositeDefl2;

  if (!hasKink) {
    return {
      score: 15,
      hasKink: false,
      isCorrectDirection: false,
      apexDeflection: Math.max(0, (maxTargetDefl1 + maxTargetDefl2) / 2),
      apexYRel: 0.5,
    };
  }

  if (!isCorrectDirection) {
    return {
      score: 25,
      hasKink: true,
      isCorrectDirection: false,
      apexDeflection: (maxTargetDefl1 + maxTargetDefl2) / 2,
      apexYRel: 0.5,
    };
  }

  // Puntuación geométrica:
  // 1. Deflexión de Vértice 1 vs 26px objetivo
  const p1DeflDiff = Math.abs(maxTargetDefl1 - 26);
  const p1Score = Math.max(0, 100 - p1DeflDiff * 4.5);

  // 2. Deflexión de Vértice 2 vs 26px objetivo
  const p2DeflDiff = Math.abs(maxTargetDefl2 - 26);
  const p2Score = Math.max(0, 100 - p2DeflDiff * 4.5);

  // 3. Rectitud vertical del tramo central (diferencia entre vértices |defl1 - defl2| cercana a 0)
  const spineDiff = Math.abs(maxTargetDefl1 - maxTargetDefl2);
  const spineScore = Math.max(0, 100 - spineDiff * 5.0);

  // 4. Ubicación vertical de los vértices (p1 ≈ 0.33h, p2 ≈ 0.67h)
  const p1YRel = h > 0 ? (p1Peak.y - yTop) / h : 0.33;
  const p2YRel = h > 0 ? (p2Peak.y - yTop) / h : 0.67;
  const yScore = Math.max(0, 100 - (Math.abs(p1YRel - 0.33) + Math.abs(p2YRel - 0.67)) * 140);

  // 5. Alineación vertical de los extremos superior e inferior en el mismo eje (|pEnd.x - pStart.x| cercano a 0)
  const returnDiff = Math.abs(pEnd.x - pStart.x);
  const returnScore = Math.max(0, 100 - returnDiff * 5.0);

  const score = Math.round(
    p1Score * 0.25 +
    p2Score * 0.25 +
    spineScore * 0.20 +
    yScore * 0.15 +
    returnScore * 0.15
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    hasKink: true,
    isCorrectDirection: true,
    apexDeflection: (maxTargetDefl1 + maxTargetDefl2) / 2,
    apexYRel: 0.5,
  };
}

/**
 * Evalúa la fidelidad de un arco en C vertical (curve_c_left o curve_c_right):
 * - Comienza en el riel superior (xStart, yTop) y termina en el inferior (xStart, yBottom)
 * - Ambos extremos caen sobre la misma vertical (|pEnd.x - pStart.x| <= 12px)
 * - Curva continua parabólica/circular con deflexión lateral de ~20px en la mitad del recorrido
 */
function evaluateCArcFidelity(
  stroke: RawStroke,
  yTop: number,
  yBottom: number,
  direction: 'left' | 'right'
): {
  score: number;
  hasKink: boolean;
  isCorrectDirection: boolean;
  apexDeflection: number;
  apexYRel: number;
} {
  if (stroke.points.length < 4) {
    return { score: 10, hasKink: false, isCorrectDirection: false, apexDeflection: 0, apexYRel: 0.5 };
  }
  const h = yBottom - yTop;
  const pStart = stroke.points[0];
  const pEnd = stroke.points[stroke.points.length - 1];
  const refX = (pStart.x + pEnd.x) / 2;

  let maxTargetDefl = 0;
  let maxOppositeDefl = 0;
  let apexPoint = stroke.points[0];

  for (const p of stroke.points) {
    const targetDx = direction === 'left' ? refX - p.x : p.x - refX;
    const oppDx = -targetDx;
    if (p.y >= yTop + h * 0.15 && p.y <= yTop + h * 0.85) {
      if (targetDx > maxTargetDefl) {
        maxTargetDefl = targetDx;
        apexPoint = p;
      }
      if (oppDx > maxOppositeDefl) {
        maxOppositeDefl = oppDx;
      }
    }
  }

  const hasKink = maxTargetDefl >= 6.0;
  const isCorrectDirection = hasKink && maxTargetDefl >= maxOppositeDefl;

  if (!hasKink) {
    return { score: 15, hasKink: false, isCorrectDirection: false, apexDeflection: maxTargetDefl, apexYRel: 0.5 };
  }
  if (!isCorrectDirection) {
    return { score: 25, hasKink: true, isCorrectDirection: false, apexDeflection: maxTargetDefl, apexYRel: 0.5 };
  }

  const deflDiff = Math.abs(maxTargetDefl - 20);
  const deflScore = Math.max(0, 100 - deflDiff * 4.5);

  const apexYRel = h > 0 ? (apexPoint.y - yTop) / h : 0.5;
  const yRelDiff = Math.abs(apexYRel - 0.5);
  const yScore = Math.max(0, 100 - yRelDiff * 150);

  const endDiff = Math.abs(pEnd.x - pStart.x);
  const endScore = Math.max(0, 100 - endDiff * 5);

  const score = Math.round(deflScore * 0.45 + yScore * 0.35 + endScore * 0.20);
  return {
    score: Math.min(100, Math.max(0, score)),
    hasKink,
    isCorrectDirection,
    apexDeflection: maxTargetDefl,
    apexYRel,
  };
}

/**
 * Evalúa la fidelidad de una onda en S vertical (curve_wave_vertical):
 * - Comienza en el riel superior y termina en el riel inferior con extremos alineados en X
 * - Mitad superior: deflexión hacia la izquierda de ~16px
 * - Mitad inferior: deflexión hacia la derecha de ~16px
 */
function evaluateVerticalWaveFidelity(
  stroke: RawStroke,
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
    return { score: 10, hasKink: false, isCorrectDirection: false, apexDeflection: 0, apexYRel: 0.5 };
  }
  const h = yBottom - yTop;
  const pStart = stroke.points[0];
  const pEnd = stroke.points[stroke.points.length - 1];
  const refX = (pStart.x + pEnd.x) / 2;

  let maxLeft = 0;
  let maxRight = 0;

  for (const p of stroke.points) {
    const leftDx = refX - p.x;
    const rightDx = p.x - refX;
    if (p.y >= yTop + h * 0.10 && p.y <= yTop + h * 0.50) {
      if (leftDx > maxLeft) maxLeft = leftDx;
    }
    if (p.y >= yTop + h * 0.50 && p.y <= yTop + h * 0.90) {
      if (rightDx > maxRight) maxRight = rightDx;
    }
  }

  const hasKink = maxLeft >= 5.0 && maxRight >= 5.0;
  const isCorrectDirection = pEnd.y > pStart.y + 40 && hasKink;

  if (!hasKink) {
    return { score: 15, hasKink: false, isCorrectDirection: false, apexDeflection: (maxLeft + maxRight) / 2, apexYRel: 0.5 };
  }
  if (!isCorrectDirection) {
    return { score: 25, hasKink: true, isCorrectDirection: false, apexDeflection: (maxLeft + maxRight) / 2, apexYRel: 0.5 };
  }

  const leftScore = Math.max(0, 100 - Math.abs(maxLeft - 16) * 4.5);
  const rightScore = Math.max(0, 100 - Math.abs(maxRight - 16) * 4.5);
  const endDiff = Math.abs(pEnd.x - pStart.x);
  const endScore = Math.max(0, 100 - endDiff * 6);

  const score = Math.round(leftScore * 0.40 + rightScore * 0.40 + endScore * 0.20);
  return {
    score: Math.min(100, Math.max(0, score)),
    hasKink,
    isCorrectDirection,
    apexDeflection: (maxLeft + maxRight) / 2,
    apexYRel: 0.5,
  };
}

/**
 * Evalúa la fidelidad de una onda en S inclinada / diagonal (curve_wave_slanted):
 * - Comienza en el riel superior en X0 y termina en el riel inferior desplazada a la derecha (~X0 + 36px)
 * - Transición en S suave: tangentes verticales en extremos y pendiente diagonal en el centro
 */
function evaluateSlantedWaveFidelity(
  stroke: RawStroke,
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
    return { score: 10, hasKink: false, isCorrectDirection: false, apexDeflection: 0, apexYRel: 0.5 };
  }
  const pStart = stroke.points[0];
  const pEnd = stroke.points[stroke.points.length - 1];
  const h = yBottom - yTop;

  const actualShift = pEnd.x - pStart.x;
  const isCorrectDirection = pEnd.y > pStart.y + 40 && actualShift >= 10;
  const hasKink = actualShift >= 16;

  if (!hasKink) {
    return { score: 15, hasKink: false, isCorrectDirection: false, apexDeflection: actualShift, apexYRel: 0.5 };
  }
  if (!isCorrectDirection) {
    return { score: 25, hasKink: true, isCorrectDirection: false, apexDeflection: actualShift, apexYRel: 0.5 };
  }

  const shiftScore = Math.max(0, 100 - Math.abs(actualShift - 36) * 3.5);

  // Verificación de punto medio cerca de pStart.x + actualShift / 2
  const midPoints = stroke.points.filter((p) => p.y >= yTop + h * 0.40 && p.y <= yTop + h * 0.60);
  const avgMidX = midPoints.length > 0 ? midPoints.reduce((acc, p) => acc + p.x, 0) / midPoints.length : pStart.x + actualShift / 2;
  const targetMidX = pStart.x + actualShift / 2;
  const midScore = Math.max(0, 100 - Math.abs(avgMidX - targetMidX) * 4.0);

  const score = Math.round(shiftScore * 0.60 + midScore * 0.40);
  return {
    score: Math.min(100, Math.max(0, score)),
    hasKink,
    isCorrectDirection,
    apexDeflection: actualShift,
    apexYRel: 0.5,
  };
}

/**
 * Evalúa la fidelidad de un arco horizontal (curve_arch_up o curve_arch_down):
 * - Se traza de izquierda a derecha (xStart a xEnd)
 * - curve_arch_up: arco convexo hacia arriba (deflexión negativa en Y de ~18px)
 * - curve_arch_down: arco cóncavo hacia abajo (deflexión positiva en Y de ~18px)
 */
function evaluateHorizontalArcFidelity(
  stroke: RawStroke,
  xStart: number,
  xEnd: number,
  direction: 'up' | 'down'
): {
  score: number;
  hasCurve: boolean;
  isCorrectDirection: boolean;
  yBase: number;
  deflection: number;
} {
  if (stroke.points.length < 4) {
    return { score: 10, hasCurve: false, isCorrectDirection: false, yBase: 250, deflection: 0 };
  }
  const pStart = stroke.points[0];
  const pEnd = stroke.points[stroke.points.length - 1];
  const w = xEnd - xStart;
  const yBase = (pStart.y + pEnd.y) / 2;

  let maxTargetDefl = 0;
  let maxOppositeDefl = 0;
  let apexPoint = stroke.points[0];

  for (const p of stroke.points) {
    const targetDy = direction === 'up' ? yBase - p.y : p.y - yBase;
    const oppDy = -targetDy;
    if (p.x >= xStart + w * 0.15 && p.x <= xStart + w * 0.85) {
      if (targetDy > maxTargetDefl) {
        maxTargetDefl = targetDy;
        apexPoint = p;
      }
      if (oppDy > maxOppositeDefl) {
        maxOppositeDefl = oppDy;
      }
    }
  }

  const isLeftToRight = pEnd.x > pStart.x + 40;
  const hasCurve = maxTargetDefl >= 6.0;
  const isCorrectDirection = isLeftToRight && hasCurve && maxTargetDefl >= maxOppositeDefl;

  if (!hasCurve) {
    return { score: 15, hasCurve: false, isCorrectDirection: false, yBase, deflection: maxTargetDefl };
  }
  if (!isCorrectDirection) {
    return { score: 25, hasCurve: true, isCorrectDirection: false, yBase, deflection: maxTargetDefl };
  }

  const deflScore = Math.max(0, 100 - Math.abs(maxTargetDefl - 18) * 4.5);
  const apexXRel = w > 0 ? (apexPoint.x - xStart) / w : 0.5;
  const xScore = Math.max(0, 100 - Math.abs(apexXRel - 0.5) * 150);
  const endYDiff = Math.abs(pEnd.y - pStart.y);
  const endScore = Math.max(0, 100 - endYDiff * 5);

  const score = Math.round(deflScore * 0.45 + xScore * 0.35 + endScore * 0.20);
  return {
    score: Math.min(100, Math.max(0, score)),
    hasCurve,
    isCorrectDirection,
    yBase,
    deflection: maxTargetDefl,
  };
}

/**
 * Evalúa la fidelidad de una onda en S horizontal (curve_wave_horizontal):
 * - Se traza de izquierda a derecha (xStart a xEnd)
 * - Primera mitad: valle / deflexión hacia abajo (~14px)
 * - Segunda mitad: cresta / deflexión hacia arriba (~14px)
 */
function evaluateHorizontalWaveFidelity(
  stroke: RawStroke,
  xStart: number,
  xEnd: number
): {
  score: number;
  hasCurve: boolean;
  isCorrectDirection: boolean;
  yBase: number;
  ampDown: number;
  ampUp: number;
} {
  if (stroke.points.length < 4) {
    return { score: 10, hasCurve: false, isCorrectDirection: false, yBase: 250, ampDown: 0, ampUp: 0 };
  }
  const pStart = stroke.points[0];
  const pEnd = stroke.points[stroke.points.length - 1];
  const w = xEnd - xStart;
  const yBase = (pStart.y + pEnd.y) / 2;

  let maxDown = 0;
  let maxUp = 0;

  for (const p of stroke.points) {
    const downDy = p.y - yBase;
    const upDy = yBase - p.y;
    if (p.x >= xStart + w * 0.10 && p.x <= xStart + w * 0.50) {
      if (downDy > maxDown) maxDown = downDy;
    }
    if (p.x >= xStart + w * 0.50 && p.x <= xStart + w * 0.90) {
      if (upDy > maxUp) maxUp = upDy;
    }
  }

  const isLeftToRight = pEnd.x > pStart.x + 40;
  const hasCurve = maxDown >= 5.0 && maxUp >= 5.0;
  const isCorrectDirection = isLeftToRight && hasCurve;

  if (!hasCurve) {
    return { score: 15, hasCurve: false, isCorrectDirection: false, yBase, ampDown: maxDown, ampUp: maxUp };
  }
  if (!isCorrectDirection) {
    return { score: 25, hasCurve: true, isCorrectDirection: false, yBase, ampDown: maxDown, ampUp: maxUp };
  }

  const downScore = Math.max(0, 100 - Math.abs(maxDown - 14) * 4.5);
  const upScore = Math.max(0, 100 - Math.abs(maxUp - 14) * 4.5);
  const endYDiff = Math.abs(pEnd.y - pStart.y);
  const endScore = Math.max(0, 100 - endYDiff * 6);

  const score = Math.round(downScore * 0.40 + upScore * 0.40 + endScore * 0.20);
  return {
    score: Math.min(100, Math.max(0, score)),
    hasCurve,
    isCorrectDirection,
    yBase,
    ampDown: maxDown,
    ampUp: maxUp,
  };
}

function evaluateKinkFidelity(
  stroke: RawStroke,
  kinkType: 'triangle_left' | 'triangle_right' | 'chevron_left' | 'zigzag_wave' | 'bracket_left' | 'curve_c_left' | 'curve_c_right' | 'curve_wave_vertical' | 'curve_wave_slanted',
  yTop: number,
  yBottom: number
): {
  score: number;
  hasKink: boolean;
  isCorrectDirection: boolean;
  apexDeflection: number;
  apexYRel: number;
} {
  if (kinkType === 'zigzag_wave') {
    return evaluateZigzagWaveFidelity(stroke, yTop, yBottom);
  }
  if (kinkType === 'bracket_left') {
    return evaluateBracketFidelity(stroke, yTop, yBottom);
  }
  if (kinkType === 'curve_c_left') {
    return evaluateCArcFidelity(stroke, yTop, yBottom, 'left');
  }
  if (kinkType === 'curve_c_right') {
    return evaluateCArcFidelity(stroke, yTop, yBottom, 'right');
  }
  if (kinkType === 'curve_wave_vertical') {
    return evaluateVerticalWaveFidelity(stroke, yTop, yBottom);
  }
  if (kinkType === 'curve_wave_slanted') {
    return evaluateSlantedWaveFidelity(stroke, yTop, yBottom);
  }

  if (stroke.points.length < 3) {
    return { score: 10, hasKink: false, isCorrectDirection: false, apexDeflection: 0, apexYRel: 0 };
  }

  const h = yBottom - yTop;
  const pStart = stroke.points[0];
  const pEnd = stroke.points[stroke.points.length - 1];

  if (kinkType === 'chevron_left') {
    // Para chevron: ambos extremos apoyan en la misma vertical x. Eje de referencia = (pStart.x + pEnd.x) / 2
    const refX = (pStart.x + pEnd.x) / 2;
    let maxTargetDeflection = 0; // hacia la izquierda (x < refX)
    let maxOppositeDeflection = 0; // hacia la derecha (x > refX)
    let apexPoint = stroke.points[0];

    for (const p of stroke.points) {
      const dx = refX - p.x; // positivo hacia la izquierda
      if (dx > maxTargetDeflection) {
        maxTargetDeflection = dx;
        apexPoint = p;
      }
      if (-dx > maxOppositeDeflection) {
        maxOppositeDeflection = -dx;
      }
    }

    const hasKink = maxTargetDeflection >= 8.0;
    const isCorrectDirection = maxTargetDeflection >= maxOppositeDeflection && hasKink;

    if (!hasKink) {
      return { score: 15, hasKink: false, isCorrectDirection: false, apexDeflection: maxTargetDeflection, apexYRel: 0 };
    }
    if (!isCorrectDirection) {
      return { score: 25, hasKink: true, isCorrectDirection: false, apexDeflection: maxTargetDeflection, apexYRel: 0 };
    }

    // Objetivo de deflexión hacia la izquierda: 26px
    const deflectionDiff = Math.abs(maxTargetDeflection - 26);
    const deflectionScore = Math.max(0, 100 - deflectionDiff * 4.5);

    // Altura del vértice: debe situarse cerca de la mitad del trazo (yRel ≈ 0.49)
    const apexYRel = h > 0 ? (apexPoint.y - yTop) / h : 0.49;
    const yRelDiff = Math.abs(apexYRel - 0.49);
    const yLocationScore = Math.max(0, 100 - yRelDiff * 160);

    // Alineación vertical de los dos extremos: inicio y fin en la misma vertical (|pEnd.x - pStart.x| cercano a 0)
    const returnDiff = Math.abs(pEnd.x - pStart.x);
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
 * Evalúa la fidelidad de un trazo en V concéntrico (∨):
 * - Comienza en el carril superior (ala izquierda)
 * - Desciende al vértice central
 * - Asciende al carril superior (ala derecha)
 * - Simetría respecto al eje central del bloque
 */
function evaluateVConcentricFidelity(
  stroke: RawStroke,
  centerX: number,
  yTop: number,
  yBottom: number
): {
  score: number;
  hasV: boolean;
  isCorrectDirection: boolean;
  apexX: number;
  apexY: number;
  leftX: number;
  rightX: number;
  halfWidth: number;
  symmetryDiff: number;
} {
  if (stroke.points.length < 3) {
    return {
      score: 10,
      hasV: false,
      isCorrectDirection: false,
      apexX: centerX,
      apexY: yBottom,
      leftX: centerX,
      rightX: centerX,
      halfWidth: 0,
      symmetryDiff: 99,
    };
  }

  const pStart = stroke.points[0];
  const pEnd = stroke.points[stroke.points.length - 1];

  // Encontrar el punto de mayor Y (vértice inferior / ápice de la V)
  let maxPoint = stroke.points[0];
  let maxIdx = 0;
  for (let i = 0; i < stroke.points.length; i++) {
    const p = stroke.points[i];
    if (p.y > maxPoint.y) {
      maxPoint = p;
      maxIdx = i;
    }
  }

  const apexX = maxPoint.x;
  const apexY = maxPoint.y;

  // Un trazo en V genuino desciende significativamente desde los extremos y tiene el vértice en la zona interior
  const depthLeft = apexY - pStart.y;
  const depthRight = apexY - pEnd.y;
  const hasV = depthLeft >= 18 && depthRight >= 18 && maxIdx > 0 && maxIdx < stroke.points.length - 1;

  // Dirección esperada: comenzar en el ala izquierda y terminar en la derecha
  const isCorrectDirection = pStart.x < apexX && pEnd.x > apexX;

  const leftX = Math.min(pStart.x, pEnd.x);
  const rightX = Math.max(pStart.x, pEnd.x);
  const halfWidth = (rightX - leftX) / 2;

  // Simetría respecto a centerX
  const leftDist = centerX - leftX;
  const rightDist = rightX - centerX;
  const symmetryDiff = Math.abs(leftDist - rightDist);
  const apexCenterDiff = Math.abs(apexX - centerX);

  // Puntuación de forma:
  // 1. Alineación del vértice con el eje vertical central (hasta 14px de tolerancia)
  const apexAlignmentScore = Math.max(0, 100 - apexCenterDiff * 6);
  // 2. Simetría de las dos alas respecto a centerX (hasta 12px de tolerancia)
  const symmetryScore = Math.max(0, 100 - symmetryDiff * 7);
  // 3. Los dos extremos descansan cerca del carril superior (yTop)
  const topDiffStart = Math.abs(pStart.y - yTop);
  const topDiffEnd = Math.abs(pEnd.y - yTop);
  const topAnchorScore = Math.max(0, 100 - (topDiffStart + topDiffEnd) * 4);

  const score = hasV
    ? Math.round(apexAlignmentScore * 0.40 + symmetryScore * 0.35 + topAnchorScore * 0.25)
    : 15;

  return {
    score,
    hasV,
    isCorrectDirection,
    apexX,
    apexY,
    leftX,
    rightX,
    halfWidth,
    symmetryDiff,
  };
}

/**
 * Evalúa la fidelidad de un trazo en V invertida / pico concéntrico (∧):
 * - Comienza en el riel inferior (ala izquierda)
 * - Asciende al vértice superior (ápice en la zona de yTop)
 * - Desciende al riel inferior (ala derecha)
 * - Simetría respecto al eje central del bloque
 */
function evaluateVInvertedFidelity(
  stroke: RawStroke,
  centerX: number,
  yTop: number,
  yBottom: number
): {
  score: number;
  hasV: boolean;
  isCorrectDirection: boolean;
  apexX: number;
  apexY: number;
  leftX: number;
  rightX: number;
  halfWidth: number;
  symmetryDiff: number;
} {
  if (stroke.points.length < 3) {
    return {
      score: 10,
      hasV: false,
      isCorrectDirection: false,
      apexX: centerX,
      apexY: yTop,
      leftX: centerX,
      rightX: centerX,
      halfWidth: 0,
      symmetryDiff: 99,
    };
  }

  const pStart = stroke.points[0];
  const pEnd = stroke.points[stroke.points.length - 1];

  // Encontrar el punto de menor Y (vértice superior / ápice de la V invertida)
  let minPoint = stroke.points[0];
  let minIdx = 0;
  for (let i = 0; i < stroke.points.length; i++) {
    const p = stroke.points[i];
    if (p.y < minPoint.y) {
      minPoint = p;
      minIdx = i;
    }
  }

  const apexX = minPoint.x;
  const apexY = minPoint.y;

  // Un trazo en V invertida genuino asciende significativamente desde los extremos inferiores
  const climbLeft = pStart.y - apexY;
  const climbRight = pEnd.y - apexY;
  const hasV = climbLeft >= 18 && climbRight >= 18 && minIdx > 0 && minIdx < stroke.points.length - 1;

  // Dirección esperada: comenzar en el ala izquierda (pStart.x < apexX) y terminar en la derecha (pEnd.x > apexX)
  const isCorrectDirection = pStart.x < apexX && pEnd.x > apexX;

  const leftX = Math.min(pStart.x, pEnd.x);
  const rightX = Math.max(pStart.x, pEnd.x);
  const halfWidth = (rightX - leftX) / 2;

  // Simetría respecto a centerX
  const leftDist = centerX - leftX;
  const rightDist = rightX - centerX;
  const symmetryDiff = Math.abs(leftDist - rightDist);
  const apexCenterDiff = Math.abs(apexX - centerX);

  // Puntuación de forma:
  // 1. Alineación del vértice con el eje vertical central (hasta 14px de tolerancia)
  const apexAlignmentScore = Math.max(0, 100 - apexCenterDiff * 6);
  // 2. Simetría de las dos alas respecto a centerX (hasta 12px de tolerancia)
  const symmetryScore = Math.max(0, 100 - symmetryDiff * 7);
  // 3. Los dos extremos descansan cerca del riel inferior (yBottom)
  const botDiffStart = Math.abs(pStart.y - yBottom);
  const botDiffEnd = Math.abs(pEnd.y - yBottom);
  const botAnchorScore = Math.max(0, 100 - (botDiffStart + botDiffEnd) * 4);

  const score = hasV
    ? Math.round(apexAlignmentScore * 0.40 + symmetryScore * 0.35 + botAnchorScore * 0.25)
    : 15;

  return {
    score,
    hasV,
    isCorrectDirection,
    apexX,
    apexY,
    leftX,
    rightX,
    halfWidth,
    symmetryDiff,
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

  // 1.7 Rama de evaluación específica para carriles de Vértices en V Concéntricos (E7.1)
  if (kinkType === 'v_concentric' && blocks && blocks.length > 0) {
    const singleBand = bands[0];
    const b1 = blocks[0];
    const b2 = blocks[1];

    const b1CenterX = 252;
    const b2CenterX = b2 ? 428 : 0;

    // Clasificar trazos por bloque y detectar trazos en el gap de pausa
    const b1Strokes: { stroke: RawStroke; fidelity: ReturnType<typeof evaluateVConcentricFidelity> }[] = [];
    const b2Strokes: { stroke: RawStroke; fidelity: ReturnType<typeof evaluateVConcentricFidelity> }[] = [];
    const gapStrokes: RawStroke[] = [];

    for (const ts of trackStrokes) {
      const pts = ts.stroke.points;
      let minX = Infinity;
      let maxX = -Infinity;
      for (const p of pts) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
      }
      const midX = (minX + maxX) / 2;

      if (midX >= 180 && midX <= 322) {
        const fidelity = evaluateVConcentricFidelity(ts.stroke, b1CenterX, singleBand.yTop, singleBand.yBottom);
        b1Strokes.push({ stroke: ts.stroke, fidelity });
      } else if (b2 && midX >= 358 && midX <= 500) {
        const fidelity = evaluateVConcentricFidelity(ts.stroke, b2CenterX, singleBand.yTop, singleBand.yBottom);
        b2Strokes.push({ stroke: ts.stroke, fidelity });
      } else if (b2 && midX > 322 && midX < 358) {
        gapStrokes.push(ts.stroke);
      }
    }

    const blockList = [
      { def: b1, centerX: b1CenterX, strokes: b1Strokes },
      ...(b2 ? [{ def: b2, centerX: b2CenterX, strokes: b2Strokes }] : []),
    ];

    let totalBlockSpacingScore = 0;
    let totalBlockVFidelityScore = 0;
    let totalBlockBoundaryScore = 0;
    let blocksDrawnCount = 0;
    let missingVCount = 0;
    let wrongDirCount = 0;
    const allSpacings: number[] = [];

    for (const blk of blockList) {
      const bItems = blk.strokes;
      if (bItems.length < 2) {
        continue;
      }
      blocksDrawnCount++;

      // Ordenar trazos de exterior a interior (por halfWidth descendente)
      bItems.sort((a, b) => b.fidelity.halfWidth - a.fidelity.halfWidth);

      // Espaciados en el bloque: distancia desde la V exterior (hw = 64) y entre trazos consecutivos
      const spacings: number[] = [];
      const outerLeft = blk.centerX - 64;
      const outerRight = blk.centerX + 64;

      const firstItem = bItems[0];
      const dStartLeft = firstItem.fidelity.leftX - outerLeft;
      const dStartRight = outerRight - firstItem.fidelity.rightX;
      const dStart = (dStartLeft + dStartRight) / 2;
      if (dStart > 0) {
        spacings.push(dStart);
        allSpacings.push(dStart);
      }

      for (let i = 0; i < bItems.length - 1; i++) {
        const curr = bItems[i];
        const next = bItems[i + 1];
        const dLeft = next.fidelity.leftX - curr.fidelity.leftX;
        const dRight = curr.fidelity.rightX - next.fidelity.rightX;
        const step = (dLeft + dRight) / 2;
        if (step > 0) {
          spacings.push(step);
          allSpacings.push(step);
        }
      }

      const meanDx = spacings.reduce((a, b) => a + b, 0) / (spacings.length || 1);
      let varDx = 0;
      for (const d of spacings) {
        varDx += (d - meanDx) * (d - meanDx);
      }
      const stdDx = Math.sqrt(varDx / (spacings.length || 1));

      const accuracyVsTarget = Math.max(0, 100 - Math.abs(meanDx - targetSpacing) * 8);
      const regularity = Math.max(0, 100 - stdDx * 12);
      const blockSpacingScore = accuracyVsTarget * 0.45 + regularity * 0.55;
      totalBlockSpacingScore += blockSpacingScore;

      // Fidelidad de la V y contención en carriles
      let blockVFidelitySum = 0;
      let blockBoundarySum = 0;
      for (const item of bItems) {
        blockVFidelitySum += item.fidelity.score;
        if (!item.fidelity.hasV) missingVCount++;
        if (item.fidelity.hasV && !item.fidelity.isCorrectDirection) wrongDirCount++;

        const pStart = item.stroke.points[0];
        const pEnd = item.stroke.points[item.stroke.points.length - 1];
        const topErr = Math.abs(pStart.y - singleBand.yTop) + Math.abs(pEnd.y - singleBand.yTop);
        const apexErr = Math.max(0, item.fidelity.apexY - singleBand.yBottom) + Math.max(0, singleBand.yTop - item.fidelity.apexY);
        const strokeBoundary = Math.max(0, 100 - topErr * 3.5 - apexErr * 4);
        blockBoundarySum += strokeBoundary;
      }
      totalBlockVFidelityScore += blockVFidelitySum / bItems.length;
      totalBlockBoundaryScore += blockBoundarySum / bItems.length;
    }

    const coverageRatio = blocksDrawnCount / blockList.length;
    const avgSpacingScore = blocksDrawnCount > 0 ? (totalBlockSpacingScore / blocksDrawnCount) * coverageRatio : 0;
    const avgVFidelityScore = blocksDrawnCount > 0 ? (totalBlockVFidelityScore / blocksDrawnCount) : 0;
    const avgBoundaryScore = blocksDrawnCount > 0 ? (totalBlockBoundaryScore / blocksDrawnCount) * coverageRatio : 0;

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
      analyzeStrokeKinematics(ts.stroke, targetDir, activePhase, challenge.targetLengthPx || 145)
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

    // Ponderación geométrica
    let geometricScore =
      avgSpacingScore * 0.40 +
      avgVFidelityScore * 0.35 +
      avgBoundaryScore * 0.25 -
      strokeCountPenalty -
      gapPenalty;

    geometricScore = Math.max(0, Math.min(100, Math.round(geometricScore)));

    const isMissingVs = trackStrokes.length > 0 && missingVCount >= Math.max(2, Math.ceil(trackStrokes.length * 0.4));
    const isWrongDirVs = trackStrokes.length > 0 && wrongDirCount >= Math.max(2, Math.ceil(trackStrokes.length * 0.4));

    if (isMissingVs) {
      geometricScore = Math.min(geometricScore, 30);
    } else if (isWrongDirVs) {
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
      label: `Paso Objetivo: ${targetSpacing}px con Vértices en V ∨`,
    };

    let feedbackTitle = '¡Vértices en V y Espaciado Logrados!';
    let feedbackMessage = `Has conseguido un paso medio de ${measuredAvgSpacingPx}px (objetivo: ${targetSpacing}px) con buena reproducción de los vértices en V ∨.`;
    let tipMessage = 'Mantén los vértices alineados verticalmente al centro de cada bloque.';
    let avatarMood: AvatarMood = 'wink';

    if (isMissingVs) {
      feedbackTitle = '¡Faltan los Vértices en V! ∨';
      feedbackMessage = 'Has trazado líneas rectas. Este ejercicio consiste en trazar vértices continuos en V (∨) anidados hacia el centro, partiendo desde la V exterior pre-dibujada (INICIO).';
      tipMessage = 'Baja por el ala izquierda hasta el vértice central y asciende por el ala derecha sin levantar el lápiz.';
      avatarMood = 'curious';
      passed = false;
      phasePassed = false;
    } else if (isWrongDirVs) {
      feedbackTitle = 'Dirección Invertida en V 🔄';
      feedbackMessage = 'Has comenzado por el ala derecha. Debes trazar de izquierda a derecha: descender por el ala izquierda (↘), hacer vértice y ascender por el ala derecha (↗).';
      tipMessage = 'Observa la flecha en la muestra: inicia arriba a la izquierda y termina arriba a la derecha.';
      avatarMood = 'curious';
      passed = false;
      phasePassed = false;
    } else if (blocksDrawnCount < blockList.length) {
      feedbackTitle = 'Bloques Incompletos';
      feedbackMessage = `Has completado ${blocksDrawnCount} de los ${blockList.length} bloques requeridos. Rellena tanto el Bloque 1 como el Bloque 2 con Vértices en V concéntricos, respetando la pausa central.`;
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
      feedbackTitle = '¡Vértices en V Impecables! 🌟';
      feedbackMessage = `Paso medio de ${measuredAvgSpacingPx}px (objetivo: ${targetSpacing}px) con excelente simetría y convergencia al centro en ambos bloques.`;
      tipMessage = 'Excelente control y ritmo. Pasa ahora a las fases de fluidez y velocidad.';
      avatarMood = 'success-stars';
    } else if (overallScore >= 75) {
      feedbackTitle = '¡Nivel Superado! ✅';
      feedbackMessage = `Buen control de los vértices en V (${overallScore}%). El espaciado de ${targetSpacing}px se mantiene regular hacia el centro.`;
      tipMessage = 'Intenta que cada vértice quede exactamente sobre el eje vertical central.';
      avatarMood = 'wink';
    } else {
      feedbackTitle = 'Falta de Consistencia 💨';
      feedbackMessage = trackStrokes.length < challenge.minRequiredStrokes
        ? `Has trazado muy pocas líneas (${trackStrokes.length} de al menos ${challenge.minRequiredStrokes}). Rellena ambos bloques con las V concéntricas.`
        : `La regularidad del paso (${measuredAvgSpacingPx}px) o la simetría de las V no alcanzan el 75%.`;
      tipMessage = 'Mantén la velocidad constante en ambas alas de la V.';
      avatarMood = 'fail-spiral';
    }

    return {
      overallScore,
      passed,
      phasePassed,
      currentPhase: activePhase as (1 | 2 | 3),
      kinematics,
      metrics: {
        parallelismScore: Math.round(avgVFidelityScore),
        spacingScore: Math.round(avgSpacingScore),
        straightnessScore: Math.round(avgVFidelityScore),
        tonalDensityScore: Math.round(avgBoundaryScore),
        boundaryScore: Math.round(avgBoundaryScore),
      },
      detectedStats: {
        strokeCount: trackStrokes.length,
        measuredAvgSpacingPx,
        spacingVariance: measuredSpacingVariance,
        measuredAvgAngleDeg: 64,
        measuredOpticalDensityPct: Math.min(100, Math.round((trackStrokes.length / (7 * blockList.length)) * 100)),
      },
      feedbackTitle,
      feedbackMessage,
      tipMessage,
      avatarMood,
      solutionOverlay,
    };
  }

  // 1.75 Rama de evaluación específica para carriles de Vértices en V Invertida Concéntricos (E7.2)
  if (kinkType === 'v_inverted' && blocks && blocks.length > 0) {
    const singleBand = bands[0];
    const b1 = blocks[0];
    const b2 = blocks[1];

    const b1CenterX = 252;
    const b2CenterX = b2 ? 428 : 0;

    // Clasificar trazos por bloque y detectar trazos en el gap de pausa
    const b1Strokes: { stroke: RawStroke; fidelity: ReturnType<typeof evaluateVInvertedFidelity> }[] = [];
    const b2Strokes: { stroke: RawStroke; fidelity: ReturnType<typeof evaluateVInvertedFidelity> }[] = [];
    const gapStrokes: RawStroke[] = [];

    for (const ts of trackStrokes) {
      const pts = ts.stroke.points;
      let minX = Infinity;
      let maxX = -Infinity;
      for (const p of pts) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
      }
      const midX = (minX + maxX) / 2;

      if (midX >= 180 && midX <= 322) {
        const fidelity = evaluateVInvertedFidelity(ts.stroke, b1CenterX, singleBand.yTop, singleBand.yBottom);
        b1Strokes.push({ stroke: ts.stroke, fidelity });
      } else if (b2 && midX >= 358 && midX <= 500) {
        const fidelity = evaluateVInvertedFidelity(ts.stroke, b2CenterX, singleBand.yTop, singleBand.yBottom);
        b2Strokes.push({ stroke: ts.stroke, fidelity });
      } else if (b2 && midX > 322 && midX < 358) {
        gapStrokes.push(ts.stroke);
      }
    }

    const blockList = [
      { def: b1, centerX: b1CenterX, strokes: b1Strokes },
      ...(b2 ? [{ def: b2, centerX: b2CenterX, strokes: b2Strokes }] : []),
    ];

    let totalBlockSpacingScore = 0;
    let totalBlockVFidelityScore = 0;
    let totalBlockBoundaryScore = 0;
    let blocksDrawnCount = 0;
    let missingVCount = 0;
    let wrongDirCount = 0;
    const allSpacings: number[] = [];

    for (const blk of blockList) {
      const bItems = blk.strokes;
      if (bItems.length < 2) {
        continue;
      }
      blocksDrawnCount++;

      // Ordenar trazos de exterior a interior (por halfWidth descendente)
      bItems.sort((a, b) => b.fidelity.halfWidth - a.fidelity.halfWidth);

      // Espaciados en el bloque: distancia desde la V invertida exterior (hw = 64) y entre trazos consecutivos
      const spacings: number[] = [];
      const outerLeft = blk.centerX - 64;
      const outerRight = blk.centerX + 64;

      const firstItem = bItems[0];
      const dStartLeft = firstItem.fidelity.leftX - outerLeft;
      const dStartRight = outerRight - firstItem.fidelity.rightX;
      const dStart = (dStartLeft + dStartRight) / 2;
      if (dStart > 0) {
        spacings.push(dStart);
        allSpacings.push(dStart);
      }

      for (let i = 0; i < bItems.length - 1; i++) {
        const curr = bItems[i];
        const next = bItems[i + 1];
        const dLeft = next.fidelity.leftX - curr.fidelity.leftX;
        const dRight = curr.fidelity.rightX - next.fidelity.rightX;
        const step = (dLeft + dRight) / 2;
        if (step > 0) {
          spacings.push(step);
          allSpacings.push(step);
        }
      }

      const meanDx = spacings.reduce((a, b) => a + b, 0) / (spacings.length || 1);
      let varDx = 0;
      for (const d of spacings) {
        varDx += (d - meanDx) * (d - meanDx);
      }
      const stdDx = Math.sqrt(varDx / (spacings.length || 1));

      const accuracyVsTarget = Math.max(0, 100 - Math.abs(meanDx - targetSpacing) * 8);
      const regularity = Math.max(0, 100 - stdDx * 12);
      const blockSpacingScore = accuracyVsTarget * 0.45 + regularity * 0.55;
      totalBlockSpacingScore += blockSpacingScore;

      // Fidelidad de la V invertida y contención en carriles
      let blockVFidelitySum = 0;
      let blockBoundarySum = 0;
      for (const item of bItems) {
        blockVFidelitySum += item.fidelity.score;
        if (!item.fidelity.hasV) missingVCount++;
        if (item.fidelity.hasV && !item.fidelity.isCorrectDirection) wrongDirCount++;

        const pStart = item.stroke.points[0];
        const pEnd = item.stroke.points[item.stroke.points.length - 1];
        const botErr = Math.abs(pStart.y - singleBand.yBottom) + Math.abs(pEnd.y - singleBand.yBottom);
        const apexErr = Math.max(0, singleBand.yTop - item.fidelity.apexY) + Math.max(0, item.fidelity.apexY - singleBand.yBottom);
        const strokeBoundary = Math.max(0, 100 - botErr * 3.5 - apexErr * 4);
        blockBoundarySum += strokeBoundary;
      }
      totalBlockVFidelityScore += blockVFidelitySum / bItems.length;
      totalBlockBoundaryScore += blockBoundarySum / bItems.length;
    }

    const coverageRatio = blocksDrawnCount / blockList.length;
    const avgSpacingScore = blocksDrawnCount > 0 ? (totalBlockSpacingScore / blocksDrawnCount) * coverageRatio : 0;
    const avgVFidelityScore = blocksDrawnCount > 0 ? (totalBlockVFidelityScore / blocksDrawnCount) : 0;
    const avgBoundaryScore = blocksDrawnCount > 0 ? (totalBlockBoundaryScore / blocksDrawnCount) * coverageRatio : 0;

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
      analyzeStrokeKinematics(ts.stroke, targetDir, activePhase, challenge.targetLengthPx || 145)
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

    // Ponderación geométrica
    let geometricScore =
      avgSpacingScore * 0.40 +
      avgVFidelityScore * 0.35 +
      avgBoundaryScore * 0.25 -
      strokeCountPenalty -
      gapPenalty;

    geometricScore = Math.max(0, Math.min(100, Math.round(geometricScore)));

    const isMissingVs = trackStrokes.length > 0 && missingVCount >= Math.max(2, Math.ceil(trackStrokes.length * 0.4));
    const isWrongDirVs = trackStrokes.length > 0 && wrongDirCount >= Math.max(2, Math.ceil(trackStrokes.length * 0.4));

    if (isMissingVs) {
      geometricScore = Math.min(geometricScore, 30);
    } else if (isWrongDirVs) {
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
      label: `Paso Objetivo: ${targetSpacing}px con Vértices en V Invertida ∧`,
    };

    let feedbackTitle = '¡Vértices en ∧ y Espaciado Logrados!';
    let feedbackMessage = `Has conseguido un paso medio de ${measuredAvgSpacingPx}px (objetivo: ${targetSpacing}px) con buena reproducción de los vértices en V invertida ∧.`;
    let tipMessage = 'Mantén los vértices superiores alineados verticalmente al centro de cada bloque.';
    let avatarMood: AvatarMood = 'wink';

    if (isMissingVs) {
      feedbackTitle = '¡Faltan los Vértices en V Invertida! ∧';
      feedbackMessage = 'Has trazado líneas rectas. Este ejercicio consiste en trazar vértices continuos en V invertida (∧) anidados hacia el centro, partiendo desde la V invertida exterior pre-dibujada (INICIO).';
      tipMessage = 'Asciende por el ala izquierda hasta el vértice superior y desciende por el ala derecha sin levantar el lápiz.';
      avatarMood = 'curious';
      passed = false;
      phasePassed = false;
    } else if (isWrongDirVs) {
      feedbackTitle = 'Dirección Invertida en ∧ 🔄';
      feedbackMessage = 'Has comenzado por el ala derecha. Debes trazar de izquierda a derecha: ascender por el ala izquierda (↗), hacer vértice superior y descender por el ala derecha (↘).';
      tipMessage = 'Observa la flecha en la muestra: inicia abajo a la izquierda y termina abajo a la derecha.';
      avatarMood = 'curious';
      passed = false;
      phasePassed = false;
    } else if (blocksDrawnCount < blockList.length) {
      feedbackTitle = 'Bloques Incompletos';
      feedbackMessage = `Has completado ${blocksDrawnCount} de los ${blockList.length} bloques requeridos. Rellena tanto el Bloque 1 como el Bloque 2 con Vértices en V invertida concéntricos, respetando la pausa central.`;
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
      feedbackTitle = '¡Vértices en ∧ Impecables! 🌟';
      feedbackMessage = `Paso medio de ${measuredAvgSpacingPx}px (objetivo: ${targetSpacing}px) con excelente simetría y convergencia al centro en ambos bloques.`;
      tipMessage = 'Excelente control y ritmo. Pasa ahora a las fases de fluidez y velocidad.';
      avatarMood = 'success-stars';
    } else if (overallScore >= 75) {
      feedbackTitle = '¡Nivel Superado! ✅';
      feedbackMessage = `Buen control de los vértices en ∧ (${overallScore}%). El espaciado de ${targetSpacing}px se mantiene regular hacia el centro.`;
      tipMessage = 'Intenta que cada vértice quede exactamente sobre el eje vertical central.';
      avatarMood = 'wink';
    } else {
      feedbackTitle = 'Falta de Consistencia 💨';
      feedbackMessage = trackStrokes.length < challenge.minRequiredStrokes
        ? `Has trazado muy pocas líneas (${trackStrokes.length} de al menos ${challenge.minRequiredStrokes}). Rellena ambos bloques con las V invertidas concéntricas.`
        : `La regularidad del paso (${measuredAvgSpacingPx}px) o la simetría de las ∧ no alcanzan el 75%.`;
      tipMessage = 'Mantén la velocidad constante en ambas alas de la ∧.';
      avatarMood = 'fail-spiral';
    }

    return {
      overallScore,
      passed,
      phasePassed,
      currentPhase: activePhase as (1 | 2 | 3),
      kinematics,
      metrics: {
        parallelismScore: Math.round(avgVFidelityScore),
        spacingScore: Math.round(avgSpacingScore),
        straightnessScore: Math.round(avgVFidelityScore),
        tonalDensityScore: Math.round(avgBoundaryScore),
        boundaryScore: Math.round(avgBoundaryScore),
      },
      detectedStats: {
        strokeCount: trackStrokes.length,
        measuredAvgSpacingPx,
        spacingVariance: measuredSpacingVariance,
        measuredAvgAngleDeg: 64,
        measuredOpticalDensityPct: Math.min(100, Math.round((trackStrokes.length / (7 * blockList.length)) * 100)),
      },
      feedbackTitle,
      feedbackMessage,
      tipMessage,
      avatarMood,
      solutionOverlay,
    };
  }

  // 1.78 Rama de evaluación específica para carriles de patrones horizontales (E9.1 Z/N, E13.1 Arco Arriba, E14.1 Arco Abajo, E15.1 Onda Horizontal)
  const isHorizontalPattern = (kinkType === 'zigzag_zn' || kinkType === 'curve_arch_up' || kinkType === 'curve_arch_down' || kinkType === 'curve_wave_horizontal') && blocks && blocks.length > 0;
  if (isHorizontalPattern) {
    const singleBand = bands[0];
    const b1 = blocks[0];
    const b2 = blocks[1];

    type PatternFidelity = { score: number; hasPattern: boolean; isCorrectDirection: boolean; yBase: number };

    const evaluateStrokeFidelity = (stroke: RawStroke, xStart: number, xEnd: number): PatternFidelity => {
      if (kinkType === 'zigzag_zn') {
        const res = evaluateZNWaveFidelity(stroke, xStart, xEnd, singleBand.yTop, singleBand.yBottom);
        return { score: res.score, hasPattern: res.hasZN, isCorrectDirection: res.isCorrectDirection, yBase: res.yBase };
      }
      if (kinkType === 'curve_arch_up') {
        const res = evaluateHorizontalArcFidelity(stroke, xStart, xEnd, 'up');
        return { score: res.score, hasPattern: res.hasCurve, isCorrectDirection: res.isCorrectDirection, yBase: res.yBase };
      }
      if (kinkType === 'curve_arch_down') {
        const res = evaluateHorizontalArcFidelity(stroke, xStart, xEnd, 'down');
        return { score: res.score, hasPattern: res.hasCurve, isCorrectDirection: res.isCorrectDirection, yBase: res.yBase };
      }
      const res = evaluateHorizontalWaveFidelity(stroke, xStart, xEnd);
      return { score: res.score, hasPattern: res.hasCurve, isCorrectDirection: res.isCorrectDirection, yBase: res.yBase };
    };

    // Clasificar trazos por bloque y detectar trazos en el gap de pausa
    const b1Strokes: { stroke: RawStroke; ts: typeof trackStrokes[0]; fidelity: PatternFidelity }[] = [];
    const b2Strokes: { stroke: RawStroke; ts: typeof trackStrokes[0]; fidelity: PatternFidelity }[] = [];
    const gapStrokes: RawStroke[] = [];

    for (const ts of trackStrokes) {
      const pts = ts.stroke.points;
      let minX = Infinity;
      let maxX = -Infinity;
      for (const p of pts) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
      }
      const midX = (minX + maxX) / 2;

      if (midX >= 170 && midX <= 330) {
        const fidelity = evaluateStrokeFidelity(ts.stroke, b1.xStart, b1.xEnd);
        b1Strokes.push({ stroke: ts.stroke, ts, fidelity });
      } else if (b2 && midX >= 346 && midX <= 510) {
        const fidelity = evaluateStrokeFidelity(ts.stroke, b2.xStart, b2.xEnd);
        b2Strokes.push({ stroke: ts.stroke, ts, fidelity });
      } else if (b2 && midX > 322 && midX < 358) {
        gapStrokes.push(ts.stroke);
      }
    }

    const blockList = [
      { def: b1, strokes: b1Strokes },
      ...(b2 ? [{ def: b2, strokes: b2Strokes }] : []),
    ];

    let totalBlockSpacingScore = 0;
    let totalBlockPatternFidelityScore = 0;
    let totalBlockBoundaryScore = 0;
    let blocksDrawnCount = 0;
    let missingPatternCount = 0;
    let wrongDirCount = 0;
    const allSpacings: number[] = [];

    let startBaseY = singleBand.yTop + 34; // 239 (zigzag_zn)
    let finalBaseY = singleBand.yBottom;   // 335
    if (kinkType === 'curve_arch_up') {
      startBaseY = singleBand.yTop + 18;    // 223 -> apex touches 205 (singleBand.yTop)
      finalBaseY = singleBand.yBottom;      // 335 -> ends touch 335 (singleBand.yBottom)
    } else if (kinkType === 'curve_arch_down') {
      startBaseY = singleBand.yTop;         // 205 -> ends touch 205 (singleBand.yTop)
      finalBaseY = singleBand.yBottom - 18; // 317 -> apex touches 335 (singleBand.yBottom)
    } else if (kinkType === 'curve_wave_horizontal') {
      startBaseY = singleBand.yTop + 18;    // 223
      finalBaseY = singleBand.yBottom - 16; // 319
    }

    for (const blk of blockList) {
      const bItems = blk.strokes;
      if (bItems.length < 2) {
        continue;
      }
      blocksDrawnCount++;

      // Ordenar trazos de arriba a abajo por su baseline yBase
      bItems.sort((a, b) => a.fidelity.yBase - b.fidelity.yBase);

      const spacings: number[] = [];

      const dStart = bItems[0].fidelity.yBase - startBaseY;
      if (dStart > 0) {
        spacings.push(dStart);
        allSpacings.push(dStart);
      }

      for (let i = 0; i < bItems.length - 1; i++) {
        const dy = bItems[i + 1].fidelity.yBase - bItems[i].fidelity.yBase;
        if (dy > 0) {
          spacings.push(dy);
          allSpacings.push(dy);
        }
      }

      const dEnd = finalBaseY - bItems[bItems.length - 1].fidelity.yBase;
      if (dEnd > 0) {
        spacings.push(dEnd);
        allSpacings.push(dEnd);
      }

      const meanDy = spacings.reduce((a, b) => a + b, 0) / (spacings.length || 1);
      let varDy = 0;
      for (const d of spacings) {
        varDy += (d - meanDy) * (d - meanDy);
      }
      const stdDy = Math.sqrt(varDy / (spacings.length || 1));

      const accuracyVsTarget = Math.max(0, 100 - Math.abs(meanDy - targetSpacing) * 8);
      const regularity = Math.max(0, 100 - stdDy * 12);
      const blockSpacingScore = accuracyVsTarget * 0.45 + regularity * 0.55;
      totalBlockSpacingScore += blockSpacingScore;

      // Fidelidad del patrón horizontal y contención vertical en carriles
      let blockFidelitySum = 0;
      let blockBoundarySum = 0;
      for (const item of bItems) {
        blockFidelitySum += item.fidelity.score;
        if (!item.fidelity.hasPattern) missingPatternCount++;
        if (item.fidelity.hasPattern && !item.fidelity.isCorrectDirection) wrongDirCount++;

        const topErr = Math.max(0, singleBand.yTop - item.ts.topY);
        const botErr = Math.max(0, item.ts.botY - singleBand.yBottom);
        const strokeBoundary = Math.max(0, 100 - (topErr + botErr) * 4);
        blockBoundarySum += strokeBoundary;
      }
      totalBlockPatternFidelityScore += blockFidelitySum / bItems.length;
      totalBlockBoundaryScore += blockBoundarySum / bItems.length;
    }

    const coverageRatio = blocksDrawnCount / blockList.length;
    const avgSpacingScore = blocksDrawnCount > 0 ? (totalBlockSpacingScore / blocksDrawnCount) * coverageRatio : 0;
    const avgPatternFidelityScore = blocksDrawnCount > 0 ? (totalBlockPatternFidelityScore / blocksDrawnCount) : 0;
    const avgBoundaryScore = blocksDrawnCount > 0 ? (totalBlockBoundaryScore / blocksDrawnCount) * coverageRatio : 0;

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
      analyzeStrokeKinematics(ts.stroke, targetDir, activePhase, challenge.targetLengthPx || 135)
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

    // Ponderación geométrica
    let geometricScore =
      avgSpacingScore * 0.40 +
      avgPatternFidelityScore * 0.35 +
      avgBoundaryScore * 0.25 -
      strokeCountPenalty -
      gapPenalty;

    geometricScore = Math.max(0, Math.min(100, Math.round(geometricScore)));

    const isMissingPatterns = trackStrokes.length > 0 && missingPatternCount >= Math.max(2, Math.ceil(trackStrokes.length * 0.4));
    const isWrongDirPatterns = trackStrokes.length > 0 && wrongDirCount >= Math.max(2, Math.ceil(trackStrokes.length * 0.4));

    if (isMissingPatterns) {
      geometricScore = Math.min(geometricScore, 30);
    } else if (isWrongDirPatterns) {
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

    let patternLabel = `Paso Objetivo: ${targetSpacing}px con Relámpago Z/N ↗↘↗`;
    let successTitle = '¡Relámpagos Z/N y Espaciado Logrados!';
    let successMsg = `Has conseguido un paso medio de ${measuredAvgSpacingPx}px (objetivo: ${targetSpacing}px) con buena reproducción del relámpago horizontal Z/N ↗↘↗.`;
    let defaultTip = 'Mantén los picos a 1/3 y los valles a 2/3 del ancho del bloque, con espaciado constante.';
    let missingTitle = '¡Falta el Relámpago en Z/N! ↗↘↗';
    let missingMsg = 'Has trazado líneas horizontales rectas. Este ejercicio consiste en trazar el patrón continuo de relámpago en Z/N (↗↘↗) con 2 quiebres angulares, idéntico a las líneas de INICIO y FIN.';
    let missingTip = 'Asciende en diagonal (↗) al primer tercio, baja en diagonal (↘) al segundo tercio, y vuelve a ascender (↗) hasta el final sin levantar el lápiz.';
    let wrongDirTitle = 'Dirección Invertida en Z/N 🔄';
    let wrongDirMsg = 'Has comenzado por la derecha. Debes trazar de izquierda a derecha: ascender (↗), descender (↘) y ascender (↗).';
    let wrongDirTip = 'Observa la flecha en la muestra: inicia a la izquierda y termina a la derecha.';
    let title90 = '¡Relámpagos Z/N Impecables! 🌟';
    let msg75 = `Buen control de los relámpagos Z/N (${overallScore}%). El espaciado de ${targetSpacing}px se mantiene regular en vertical.`;

    if (kinkType === 'curve_arch_up') {
      patternLabel = `Paso Objetivo: ${targetSpacing}px con Arco Convexo ⌒`;
      successTitle = '¡Arcos Convexos y Espaciado Logrados!';
      successMsg = `Has conseguido un paso medio de ${measuredAvgSpacingPx}px (objetivo: ${targetSpacing}px) con buena curvatura convexa ⌒.`;
      defaultTip = 'Mantén la curvatura regular con el punto más alto en el centro del bloque sin hacer picos angulares.';
      missingTitle = '¡Falta el Arco Convexo! ⌒';
      missingMsg = 'Has trazado líneas horizontales rectas. Este ejercicio consiste en trazar arcos continuos curvados hacia arriba (⌒), idénticos a las líneas de INICIO y FIN.';
      missingTip = 'Inicia a la izquierda, cúrvate suavemente hacia arriba hasta el centro (~18px de altura) y desciende suavemente a la derecha sin levantar el lápiz.';
      wrongDirTitle = 'Dirección o Curva Invertida 🔄';
      wrongDirMsg = 'Has comenzado por la derecha o curvado hacia abajo. Traza de izquierda a derecha con comba convexa hacia arriba (⌒).';
      wrongDirTip = 'Observa la flecha en la muestra: de izquierda a derecha curvando hacia arriba.';
      title90 = '¡Arcos Convexos Impecables! 🌟';
      msg75 = `Buen control de los arcos convexos (${overallScore}%). El paso de ${targetSpacing}px se mantiene regular en vertical.`;
    } else if (kinkType === 'curve_arch_down') {
      patternLabel = `Paso Objetivo: ${targetSpacing}px con Arco Cóncavo ∪`;
      successTitle = '¡Arcos Cóncavos y Espaciado Logrados!';
      successMsg = `Has conseguido un paso medio de ${measuredAvgSpacingPx}px (objetivo: ${targetSpacing}px) con buena curvatura cóncava ∪.`;
      defaultTip = 'Mantén la curvatura regular con el punto más bajo en el centro del bloque sin hacer quiebres.';
      missingTitle = '¡Falta el Arco Cóncavo! ∪';
      missingMsg = 'Has trazado líneas horizontales rectas. Este ejercicio consiste en trazar arcos continuos curvados hacia abajo (∪), idénticos a las líneas de INICIO y FIN.';
      missingTip = 'Inicia a la izquierda, desciende en comba suave hacia abajo (~18px de profundidad) y asciende a la derecha sin levantar el lápiz.';
      wrongDirTitle = 'Dirección o Curva Invertida 🔄';
      wrongDirMsg = 'Has comenzado por la derecha o curvado hacia arriba. Traza de izquierda a derecha con comba cóncava hacia abajo (∪).';
      wrongDirTip = 'Observa la flecha en la muestra: de izquierda a derecha curvando hacia abajo.';
      title90 = '¡Arcos Cóncavos Impecables! 🌟';
      msg75 = `Buen control de los arcos cóncavos (${overallScore}%). El paso de ${targetSpacing}px se mantiene regular en vertical.`;
    } else if (kinkType === 'curve_wave_horizontal') {
      patternLabel = `Paso Objetivo: ${targetSpacing}px con Onda Horizontal ~`;
      successTitle = '¡Onda Horizontal y Espaciado Logrados!';
      successMsg = `Has conseguido un paso medio de ${measuredAvgSpacingPx}px (objetivo: ${targetSpacing}px) con buena reproducción de la onda en S horizontal ~.`;
      defaultTip = 'Mantén una transición suave entre el valle en la primera mitad y la cresta en la segunda mitad.';
      missingTitle = '¡Falta la Onda Horizontal en S! ~';
      missingMsg = 'Has trazado líneas horizontales rectas. Este ejercicio consiste en trazar ondas continuas en S horizontal (~), idénticas a las líneas de INICIO y FIN.';
      missingTip = 'Inicia a la izquierda, desciende en seno (~14px) en la primera mitad y asciende en cresta (~14px) en la segunda mitad sin levantar el lápiz.';
      wrongDirTitle = 'Dirección u Onda Invertida 🔄';
      wrongDirMsg = 'Has trazado en sentido contrario o invertido las combas. Traza de izquierda a derecha: comba hacia abajo primero, hacia arriba después.';
      wrongDirTip = 'Observa la flecha en la muestra: de izquierda a derecha con ondulación suave.';
      title90 = '¡Ondas Horizontales Impecables! 🌟';
      msg75 = `Buen control de las ondas en S (${overallScore}%). El paso de ${targetSpacing}px se mantiene regular en vertical.`;
    }

    const solutionOverlay = {
      points: [],
      multiLines: challenge.ghostSolutionStrokes || [],
      color: '#000000',
      label: patternLabel,
    };

    let feedbackTitle = successTitle;
    let feedbackMessage = successMsg;
    let tipMessage = defaultTip;
    let avatarMood: AvatarMood = 'wink';

    if (isReversed) {
      feedbackTitle = 'Dirección Invertida 🔄';
      feedbackMessage = '⚠️ DIRECCIÓN INVERTIDA: Has trazado de derecha a izquierda. Debes trazar de izquierda a derecha (→).';
      tipMessage = 'Traza de izquierda a derecha (→): inicia en el extremo izquierdo y avanza hacia la derecha.';
      avatarMood = 'fail-spiral';
      passed = false;
      phasePassed = false;
      overallScore = 0;
    } else if (isMissingPatterns) {
      feedbackTitle = missingTitle;
      feedbackMessage = missingMsg;
      tipMessage = missingTip;
      avatarMood = 'curious';
      passed = false;
      phasePassed = false;
    } else if (isWrongDirPatterns) {
      feedbackTitle = wrongDirTitle;
      feedbackMessage = wrongDirMsg;
      tipMessage = wrongDirTip;
      avatarMood = 'curious';
      passed = false;
      phasePassed = false;
    } else if (blocksDrawnCount < blockList.length) {
      feedbackTitle = 'Bloques Incompletos';
      feedbackMessage = `Has completado ${blocksDrawnCount} de los ${blockList.length} bloques requeridos. Rellena tanto el Bloque 1 como el Bloque 2, respetando la pausa central.`;
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
      feedbackTitle = title90;
      feedbackMessage = `Paso medio de ${measuredAvgSpacingPx}px (objetivo: ${targetSpacing}px) con excelente paralelismo y ritmo en ambos bloques.`;
      tipMessage = 'Excelente control y ritmo. Pasa ahora a las fases de fluidez y velocidad.';
      avatarMood = 'success-stars';
    } else if (overallScore >= 75) {
      feedbackTitle = '¡Nivel Superado! ✅';
      feedbackMessage = msg75;
      tipMessage = defaultTip;
      avatarMood = 'wink';
    } else {
      feedbackTitle = 'Falta de Consistencia 💨';
      feedbackMessage = trackStrokes.length < challenge.minRequiredStrokes
        ? `Has trazado muy pocas líneas (${trackStrokes.length} de al menos ${challenge.minRequiredStrokes}). Rellena ambos bloques con las líneas requeridas.`
        : `La regularidad del paso (${measuredAvgSpacingPx}px) o la fidelidad del patrón no alcanzan el 75%.`;
      tipMessage = 'Mantén la velocidad constante en todo el recorrido.';
      avatarMood = 'fail-spiral';
    }

    return {
      overallScore,
      passed,
      phasePassed,
      currentPhase: activePhase as (1 | 2 | 3),
      kinematics,
      metrics: {
        parallelismScore: Math.round(avgPatternFidelityScore),
        spacingScore: Math.round(avgSpacingScore),
        straightnessScore: Math.round(avgPatternFidelityScore),
        tonalDensityScore: Math.round(avgBoundaryScore),
        boundaryScore: Math.round(avgBoundaryScore),
      },
      detectedStats: {
        strokeCount: trackStrokes.length,
        measuredAvgSpacingPx,
        spacingVariance: measuredSpacingVariance,
        measuredAvgAngleDeg: 0,
        measuredOpticalDensityPct: Math.min(100, Math.round((trackStrokes.length / (((kinkType === 'curve_arch_up' || kinkType === 'curve_arch_down') ? 13 : 11) * blockList.length)) * 100)),
      },
      feedbackTitle,
      feedbackMessage,
      tipMessage,
      avatarMood,
      solutionOverlay,
    };
  }

  // 1.8 Rama de evaluación específica para carriles con quiebre triangular y bloques delimitados (E5.1 / E5.2)
  if (isKinked && blocks && blocks.length > 0) {
    const singleBand = bands[0];
    const b1 = blocks[0];
    const b2 = blocks[1];

    const getPointsAvgX = (pts: { x: number; y: number }[]) =>
      pts.reduce((acc, p) => acc + p.x, 0) / (pts.length || 1);

    const b1StartAvgX = getPointsAvgX(b1.startLinePoints);
    const b1EndAvgX = getPointsAvgX(b1.finalLinePoints);
    const b2StartAvgX = b2 ? getPointsAvgX(b2.startLinePoints) : 0;
    const b2EndAvgX = b2 ? getPointsAvgX(b2.finalLinePoints) : 0;

    // Clasificar trazos por bloque y detectar trazos en el gap de pausa
    const b1Strokes: typeof trackStrokes = [];
    const b2Strokes: typeof trackStrokes = [];
    const gapStrokes: typeof trackStrokes = [];

    for (const ts of trackStrokes) {
      if (ts.avgX >= b1StartAvgX - 8 && ts.avgX <= b1EndAvgX + 8) {
        b1Strokes.push(ts);
      } else if (b2 && ts.avgX >= b2StartAvgX - 8 && ts.avgX <= b2EndAvgX + 8) {
        b2Strokes.push(ts);
      } else if (b2 && ts.avgX > b1EndAvgX + 8 && ts.avgX < b2StartAvgX - 8) {
        gapStrokes.push(ts);
      }
    }

    const blockList = [
      { def: b1, startAvgX: b1StartAvgX, endAvgX: b1EndAvgX, strokes: b1Strokes },
      ...(b2 ? [{ def: b2, startAvgX: b2StartAvgX, endAvgX: b2EndAvgX, strokes: b2Strokes }] : []),
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
      const dStart = bStrokes[0].avgX - blk.startAvgX;
      if (dStart > 0) {
        spacings.push(dStart);
        allSpacings.push(dStart);
      }
      for (let i = 0; i < bStrokes.length - 1; i++) {
        const dx = bStrokes[i + 1].avgX - bStrokes[i].avgX;
        spacings.push(dx);
        allSpacings.push(dx);
      }
      const dEnd = blk.endAvgX - bStrokes[bStrokes.length - 1].avgX;
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
        const kinkEval = evaluateKinkFidelity(s.stroke, kinkType as any, singleBand.yTop, singleBand.yBottom);
        blockKinkSum += kinkEval.score;
        if (!kinkEval.hasKink) missingKinkCount++;
        if (kinkEval.hasKink && !kinkEval.isCorrectDirection) wrongDirKinkCount++;

        const p1 = s.stroke.points[0];
        const pEnd = s.stroke.points[s.stroke.points.length - 1];
        const acuteAngle = (Math.atan2(Math.abs(pEnd.y - p1.y), Math.abs(pEnd.x - p1.x)) * 180) / Math.PI;
        const targetStrokeAngle = kinkType === 'curve_wave_slanted' ? 74.5 : 90;
        const angleDev = Math.abs(acuteAngle - targetStrokeAngle);
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
      label: kinkType === 'zigzag_wave'
        ? `Paso Objetivo: ${targetSpacing}px con Zigzag en Onda ◄►◄`
        : kinkType === 'chevron_left'
        ? `Paso Objetivo: ${targetSpacing}px con Quiebre en Chevron ◄`
        : kinkType === 'bracket_left'
        ? `Paso Objetivo: ${targetSpacing}px con Quiebre en Corchete [`
        : kinkType === 'curve_c_left'
        ? `Paso Objetivo: ${targetSpacing}px con Arco C Izquierda (`
        : kinkType === 'curve_c_right'
        ? `Paso Objetivo: ${targetSpacing}px con Arco C Derecha )`
        : kinkType === 'curve_wave_vertical'
        ? `Paso Objetivo: ${targetSpacing}px con Onda Vertical en S §`
        : kinkType === 'curve_wave_slanted'
        ? `Paso Objetivo: ${targetSpacing}px con Onda Inclinada ∿`
        : `Paso Objetivo: ${targetSpacing}px con Quiebre`,
    };

    let feedbackTitle = kinkType === 'zigzag_wave'
      ? '¡Zigzag en Onda y Espaciado Logrados!'
      : kinkType === 'chevron_left'
      ? '¡Quiebres en Chevron y Espaciado Logrados!'
      : kinkType === 'bracket_left'
      ? '¡Quiebres en Corchete y Espaciado Logrados!'
      : kinkType === 'curve_c_left'
      ? '¡Arcos C a la Izquierda y Espaciado Logrados!'
      : kinkType === 'curve_c_right'
      ? '¡Arcos C a la Derecha y Espaciado Logrados!'
      : kinkType === 'curve_wave_vertical'
      ? '¡Onda Vertical en S y Espaciado Logrados!'
      : kinkType === 'curve_wave_slanted'
      ? '¡Onda Inclinada y Espaciado Logrados!'
      : '¡Quiebres y Espaciado Logrados!';
    let feedbackMessage = kinkType === 'zigzag_wave'
      ? `Has conseguido un paso medio de ${measuredAvgSpacingPx}px (objetivo: ${targetSpacing}px) con buena reproducción del patrón zigzag en onda ◄►◄.`
      : kinkType === 'chevron_left'
      ? `Has conseguido un paso medio de ${measuredAvgSpacingPx}px (objetivo: ${targetSpacing}px) con buena reproducción del patrón chevron ◄.`
      : kinkType === 'bracket_left'
      ? `Has conseguido un paso medio de ${measuredAvgSpacingPx}px (objetivo: ${targetSpacing}px) con buena reproducción del patrón en corchete [.`
      : kinkType === 'curve_c_left'
      ? `Has conseguido un paso medio de ${measuredAvgSpacingPx}px (objetivo: ${targetSpacing}px) con buena curvatura convexa a la izquierda (.`
      : kinkType === 'curve_c_right'
      ? `Has conseguido un paso medio de ${measuredAvgSpacingPx}px (objetivo: ${targetSpacing}px) con buena curvatura convexa a la derecha ).`
      : kinkType === 'curve_wave_vertical'
      ? `Has conseguido un paso medio de ${measuredAvgSpacingPx}px (objetivo: ${targetSpacing}px) con buena ondulación vertical continua §.`
      : kinkType === 'curve_wave_slanted'
      ? `Has conseguido un paso medio de ${measuredAvgSpacingPx}px (objetivo: ${targetSpacing}px) con desplazamiento lateral suave de 36px ∿.`
      : `Has conseguido un paso medio de ${measuredAvgSpacingPx}px (objetivo: ${targetSpacing}px) con buena reproducción del quiebre triangular.`;
    let tipMessage = kinkType === 'zigzag_wave'
      ? 'Mantén los vértices del zigzag alineados a 1/4, 1/2 y 3/4 de la altura de la franja.'
      : kinkType === 'chevron_left'
      ? 'Mantén los vértices del chevron alineados al centro de la franja.'
      : kinkType === 'bracket_left'
      ? 'Mantén los quiebres alineados a 1/3 y 2/3 de altura, con el tramo central vertical.'
      : kinkType === 'curve_c_left' || kinkType === 'curve_c_right'
      ? 'Mantén la máxima comba (~20px) en el centro exacto de la altura del carril.'
      : kinkType === 'curve_wave_vertical'
      ? 'Mantén una transición armónica entre la comba izquierda superior y la comba derecha inferior.'
      : kinkType === 'curve_wave_slanted'
      ? 'Inicia verticalmente arriba y desplázate progresivamente hacia la derecha en curva continua en S.'
      : 'Mantén la altura del vértice alineada visualmente en todos los trazos.';
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
      if (kinkType === 'zigzag_wave') {
        feedbackTitle = '¡Falta el Zigzag en Onda! ◄►◄';
        feedbackMessage = 'Has trazado líneas verticales rectas. Este ejercicio requiere realizar el patrón en zigzag continuo (◄►◄) con quiebres alternados, idéntico a las líneas de INICIO y FIN.';
        tipMessage = 'Baja quebrando hacia la izquierda a 1/4 de altura, regresa al centro a la mitad, quiebra a la izquierda a 3/4 y vuelve al riel inferior.';
      } else if (kinkType === 'chevron_left') {
        feedbackTitle = '¡Falta el Quiebre en Chevron! ◄';
        feedbackMessage = 'Has trazado líneas verticales rectas. Este ejercicio requiere realizar el quiebre en chevron (ángulo <) hacia la izquierda en el centro del trazo, idéntico a las líneas de INICIO y FIN.';
        tipMessage = 'Traza en diagonal hacia la izquierda hasta el centro (~26px) y regresa en diagonal hacia la derecha hasta el carril inferior.';
      } else if (kinkType === 'bracket_left') {
        feedbackTitle = '¡Falta el Quiebre en Corchete! [';
        feedbackMessage = 'Has trazado líneas verticales rectas. Este ejercicio requiere realizar el doble quiebre en corchete ([) hacia la izquierda a 1/3 y 2/3 de la altura con tramo vertical central, idéntico a las líneas de INICIO y FIN.';
        tipMessage = 'Baja en diagonal hacia la izquierda hasta 1/3 de altura (~26px), continúa recto vertical hasta 2/3, y regresa en diagonal hacia la derecha hasta el carril inferior.';
      } else if (kinkType === 'curve_c_left') {
        feedbackTitle = '¡Falta el Arco Curvo en C! (';
        feedbackMessage = 'Has trazado líneas verticales rectas. Este ejercicio requiere trazar arcos curvados convexos hacia la izquierda ((), idénticos a las líneas de INICIO y FIN.';
        tipMessage = 'Inicia arriba, curva suavemente hacia la izquierda con comba de ~20px y regresa al carril inferior verticalmente.';
      } else if (kinkType === 'curve_c_right') {
        feedbackTitle = '¡Falta el Arco Curvo en C Invertido! )';
        feedbackMessage = 'Has trazado líneas verticales rectas. Este ejercicio requiere trazar arcos curvados convexos hacia la derecha ()), idénticos a las líneas de INICIO y FIN.';
        tipMessage = 'Inicia arriba, curva suavemente hacia la derecha con comba de ~20px y regresa al carril inferior verticalmente.';
      } else if (kinkType === 'curve_wave_vertical') {
        feedbackTitle = '¡Falta la Onda Vertical en S! §';
        feedbackMessage = 'Has trazado líneas verticales rectas. Este ejercicio requiere trazar ondas continuas en forma de S vertical (§), idénticas a las líneas de INICIO y FIN.';
        tipMessage = 'Baja curvando primero hacia la izquierda (~16px), cruza el eje al centro y curva hacia la derecha (~16px) antes de llegar a la base.';
      } else if (kinkType === 'curve_wave_slanted') {
        feedbackTitle = '¡Falta la Onda Inclinada en S! ∿';
        feedbackMessage = 'Has trazado líneas verticales rectas. Este ejercicio requiere trazar una onda suave inclinada con desplazamiento hacia la derecha (+36px), idéntica a las líneas de INICIO y FIN.';
        tipMessage = 'Inicia arriba, desciende curvando hacia la derecha hasta terminar desplazado 36px respecto al origen.';
      } else {
        const dirText = kinkType === 'triangle_left' ? 'hacia la izquierda (◄)' : 'hacia la derecha (►)';
        feedbackTitle = kinkType === 'triangle_left' ? '¡Falta el Quiebre Triangular! ◄' : '¡Falta el Quiebre Triangular! ►';
        feedbackMessage = `Has trazado líneas verticales rectas. Este ejercicio requiere realizar el quiebre triangular ${dirText} en la zona inferior de cada línea, idéntico a las líneas de INICIO y FIN.`;
        tipMessage = `Baja verticalmente, desvíate en triángulo ${dirText} a 2/3 de la altura, y retorna a la vertical.`;
      }
      avatarMood = 'curious';
      passed = false;
      phasePassed = false;
    } else if (isWrongDirKinks) {
      if (kinkType === 'zigzag_wave') {
        feedbackTitle = '¡Zigzag en Sentido Opuesto!';
        feedbackMessage = 'Has orientado los picos hacia la derecha. Los picos del zigzag en onda deben apuntar hacia la izquierda (◄►◄).';
        tipMessage = 'Compara con el patrón de muestra a la izquierda antes de trazar.';
      } else if (kinkType === 'chevron_left') {
        feedbackTitle = '¡Chevron en Sentido Opuesto!';
        feedbackMessage = 'Has dirigido el vértice hacia la derecha. El quiebre en chevron debe apuntar hacia la izquierda (◄).';
        tipMessage = 'Compara con el patrón de muestra a la izquierda antes de trazar.';
      } else if (kinkType === 'bracket_left') {
        feedbackTitle = '¡Corchete en Sentido Opuesto!';
        feedbackMessage = 'Has dirigido los quiebres hacia la derecha. El quiebre en corchete debe apuntar hacia la izquierda ([).';
        tipMessage = 'Observa el patrón de muestra a la izquierda: los quiebres entran hacia la izquierda.';
      } else if (kinkType === 'curve_c_left') {
        feedbackTitle = '¡Arco C en Sentido Opuesto!';
        feedbackMessage = 'Has curvado hacia la derecha. La comba del arco C debe apuntar hacia la izquierda (().';
        tipMessage = 'Observa el patrón de muestra a la izquierda: la curva abre hacia la derecha y se comba a la izquierda.';
      } else if (kinkType === 'curve_c_right') {
        feedbackTitle = '¡Arco en Sentido Opuesto!';
        feedbackMessage = 'Has curvado hacia la izquierda. La comba del arco debe apuntar hacia la derecha ()).';
        tipMessage = 'Observa el patrón de muestra a la izquierda: la curva se comba hacia la derecha.';
      } else if (kinkType === 'curve_wave_vertical') {
        feedbackTitle = '¡Onda en Sentido Opuesto!';
        feedbackMessage = 'Has invertido las combas. Debes curvar primero hacia la izquierda y luego hacia la derecha.';
        tipMessage = 'Observa el patrón de muestra: primero comba a la izquierda, después a la derecha.';
      } else if (kinkType === 'curve_wave_slanted') {
        feedbackTitle = '¡Inclinación en Sentido Opuesto!';
        feedbackMessage = 'Has trazado recto o inclinado hacia la izquierda. La onda debe desplazarse progresivamente hacia la derecha (+36px).';
        tipMessage = 'Observa el patrón de muestra: arranca a la izquierda y termina desplazado hacia la derecha.';
      } else {
        const expectedDir = kinkType === 'triangle_left' ? 'izquierda ◄' : 'derecha ►';
        feedbackTitle = '¡Quiebre en Sentido Opuesto!';
        feedbackMessage = `Has dirigido el vértice hacia el lado contrario. El quiebre debe apuntar hacia la ${expectedDir}.`;
        tipMessage = `Compara con el patrón de muestra a la izquierda antes de trazar.`;
      }
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
