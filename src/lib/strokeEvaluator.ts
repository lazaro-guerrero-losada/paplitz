import { RawStroke, ProceduralStrokeChallenge, StrokeEvaluation } from './strokeTypes';
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
  const parallelismScore = Math.round(Math.max(0, 100 - angleDiff * 3.2));

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
  const boundaryScore = Math.round(
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
    overallScore = Math.min(overallScore, 35);
    directionWarning = '⚠️ DIRECCIÓN INVERTIDA: Has trazado de ② hacia ①. Debes iniciar en ① y proyectar hacia ②.';
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
 * Genera un informe detallado en texto / markdown de la evaluación para depuración y revisión
 */
export function buildStrokeDebugReport(
  challenge: ProceduralStrokeChallenge,
  strokes: RawStroke[],
  evaluation: StrokeEvaluation
): string {
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

/**
 * Validador principal para evaluar cualquier reto del laboratorio
 */
export function evaluateStrokeSubmission(
  strokes: RawStroke[],
  challenge: ProceduralStrokeChallenge
): StrokeEvaluation {
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
