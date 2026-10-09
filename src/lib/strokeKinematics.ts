import { RawStroke, StrokeDirection } from './strokeTypes';

export interface DirectionKinematicStat {
  count: number;
  avgSpeedPxPerSec: number;
  fastestSpeedPxPerSec: number;
  lastUpdated: number;
}

export interface UserSpeedProfile {
  directions: Record<string, DirectionKinematicStat>;
  totalStrokesRecorded: number;
  globalAvgSpeedPxPerSec: number;
}

export interface StrokeKinematicsResult {
  durationMs: number;
  lengthPx: number;
  avgSpeedPxPerSec: number;
  peakSpeedPxPerSec: number;
  fluencyScore: number; // 0 a 100: regularidad sin titubeos ni micro-paradas
  microStopCount: number;
  userBaselineSpeedPxPerSec: number;
  speedRatioVsBaseline: number; // Ej: 1.15 significa 15% más rápido que su media
  phasePassed: boolean;
  phaseRequirementText: string;
  speedDiagnosisLabel: string;
}

const STORAGE_KEY = 'paplitz_stroke_kinematics_v1';

// Velocidad base de referencia inicial en px/s para un lápiz/pantalla típica
const DEFAULT_INITIAL_SPEED = 450;

/**
 * Obtiene el perfil cinemático adaptativo del usuario desde localStorage
 */
export function getUserSpeedProfile(): UserSpeedProfile {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      directions: {},
      totalStrokesRecorded: 0,
      globalAvgSpeedPxPerSec: DEFAULT_INITIAL_SPEED,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        directions: {},
        totalStrokesRecorded: 0,
        globalAvgSpeedPxPerSec: DEFAULT_INITIAL_SPEED,
      };
    }
    const parsed: UserSpeedProfile = JSON.parse(raw);
    return parsed;
  } catch {
    return {
      directions: {},
      totalStrokesRecorded: 0,
      globalAvgSpeedPxPerSec: DEFAULT_INITIAL_SPEED,
    };
  }
}

/**
 * Guarda y actualiza la media adaptativa del usuario por dirección biomecánica
 */
export function recordStrokeSpeed(direction: StrokeDirection | string, speedPxPerSec: number): UserSpeedProfile {
  const profile = getUserSpeedProfile();
  if (speedPxPerSec <= 40 || speedPxPerSec > 3500) {
    // Descartar valores atípicos (clicks erróneos o saltos de puntero)
    return profile;
  }

  const dirKey = direction || 'general';
  const existing = profile.directions[dirKey] || {
    count: 0,
    avgSpeedPxPerSec: speedPxPerSec,
    fastestSpeedPxPerSec: speedPxPerSec,
    lastUpdated: Date.now(),
  };

  // Media móvil ponderada exponencial: da más peso al historial a medida que acumula intentos
  const alpha = existing.count < 5 ? 0.35 : 0.18;
  const newAvg = Math.round(existing.avgSpeedPxPerSec * (1 - alpha) + speedPxPerSec * alpha);
  const fastest = Math.max(existing.fastestSpeedPxPerSec, Math.round(speedPxPerSec));

  profile.directions[dirKey] = {
    count: existing.count + 1,
    avgSpeedPxPerSec: newAvg,
    fastestSpeedPxPerSec: fastest,
    lastUpdated: Date.now(),
  };

  profile.totalStrokesRecorded += 1;

  // Actualizar promedio global
  const allDirs = Object.values(profile.directions);
  if (allDirs.length > 0) {
    const sum = allDirs.reduce((acc, d) => acc + d.avgSpeedPxPerSec, 0);
    profile.globalAvgSpeedPxPerSec = Math.round(sum / allDirs.length);
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    }
  } catch {
    // Ignorar si el almacenamiento está restringido
  }

  return profile;
}

/**
 * Obtiene la velocidad base esperada para un usuario en una dirección específica
 */
export function getUserBaselineSpeed(direction: StrokeDirection | string): number {
  const profile = getUserSpeedProfile();
  const dirKey = direction || 'general';
  if (profile.directions[dirKey] && profile.directions[dirKey].count >= 2) {
    return profile.directions[dirKey].avgSpeedPxPerSec;
  }
  return profile.globalAvgSpeedPxPerSec || DEFAULT_INITIAL_SPEED;
}

/**
 * Analiza la cinemática física (primera y segunda derivada) de un trazo
 */
export function analyzeStrokeKinematics(
  stroke: RawStroke,
  direction: StrokeDirection | string,
  currentPhase: 1 | 2 | 3 = 1,
  targetLengthPx: number = 220
): StrokeKinematicsResult {
  const pts = stroke.points;

  // Fallback si hay menos de 2 muestras
  if (!pts || pts.length < 2) {
    const baseline = getUserBaselineSpeed(direction);
    return {
      durationMs: 300,
      lengthPx: targetLengthPx,
      avgSpeedPxPerSec: baseline,
      peakSpeedPxPerSec: baseline,
      fluencyScore: 80,
      microStopCount: 0,
      userBaselineSpeedPxPerSec: baseline,
      speedRatioVsBaseline: 1.0,
      phasePassed: true,
      phaseRequirementText: 'Puntería diana',
      speedDiagnosisLabel: 'Ritmo normal',
    };
  }

  const startTime = pts[0].time;
  const endTime = pts[pts.length - 1].time;
  // Duración total en milisegundos (mínimo 16ms para evitar división por cero en eventos agrupados)
  const durationMs = Math.max(16, endTime - startTime);

  // 1. Longitud real recorrida y cálculo de derivadas locales
  let totalLength = 0;
  const segmentSpeeds: number[] = [];
  let microStopCount = 0;

  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    const ds = Math.sqrt(dx * dx + dy * dy);
    totalLength += ds;

    const dt = Math.max(1, pts[i].time - pts[i - 1].time);
    const speed = (ds / dt) * 1000; // px/s
    segmentSpeeds.push(speed);

    // Detección de micro-frenazo (cuando la mano se detiene o titubea en pleno vuelo)
    if (speed < 70 && dt > 25) {
      microStopCount++;
    }
  }

  const avgSpeedPxPerSec = Math.round((totalLength / (durationMs / 1000)));
  const peakSpeedPxPerSec = Math.round(Math.max(...segmentSpeeds, avgSpeedPxPerSec));

  // 2. Cálculo del Índice de Fluidez Cinemática
  // En un trazo seguro, la velocidad forma una parábola o meseta constante; si hay titubeo, la varianza se dispara
  let speedVariance = 0;
  for (const s of segmentSpeeds) {
    const diff = s - avgSpeedPxPerSec;
    speedVariance += diff * diff;
  }
  const speedStdDev = segmentSpeeds.length > 0 ? Math.sqrt(speedVariance / segmentSpeeds.length) : 0;
  const coefficientOfVariation = avgSpeedPxPerSec > 0 ? speedStdDev / avgSpeedPxPerSec : 1;

  // Puntuación de fluidez: penaliza variación caótica y micro-paradas
  let fluencyScore = Math.round(Math.max(0, 100 - coefficientOfVariation * 40 - microStopCount * 12));
  fluencyScore = Math.min(100, Math.max(0, fluencyScore));

  // 3. Comparativa adaptativa con la media del usuario
  const userBaseline = getUserBaselineSpeed(direction);
  const speedRatioVsBaseline = Math.round((avgSpeedPxPerSec / userBaseline) * 100) / 100;

  // 4. Verificación de Fase (1, 2 o 3)
  let phasePassed = false;
  let phaseRequirementText = '';
  let speedDiagnosisLabel = '';

  if (currentPhase === 1) {
    // FASE 1: PRECISIÓN / APRENDIZAJE
    // No penaliza lentitud (mientras sea < 4.5 segundos). El objetivo es calibrar coordinación ojo-mano
    phaseRequirementText = 'Fase 1: Puntería en dianas (ritmo libre)';
    phasePassed = durationMs < 4500;
    if (avgSpeedPxPerSec < userBaseline * 0.5) {
      speedDiagnosisLabel = 'Trazo calmado y meditado';
    } else {
      speedDiagnosisLabel = 'Ritmo adecuado';
    }
  } else if (currentPhase === 2) {
    // FASE 2: RITMO Y FLUIDEZ
    // Exige velocidad continua de dibujo sin titubeos ni micro-paradas (fluidez >= 60% y velocidad sostenida >= 220 px/s o 60% baseline)
    const minSpeed = Math.max(220, Math.round(userBaseline * 0.60));
    phaseRequirementText = `Fase 2: Trazo continuo y fluido (≥${minSpeed} px/s sin vacilaciones)`;
    phasePassed = fluencyScore >= 60 && avgSpeedPxPerSec >= minSpeed && microStopCount <= 2;

    if (fluencyScore < 60 || microStopCount > 2) {
      speedDiagnosisLabel = 'Se detectó titubeo o micro-paradas';
    } else if (avgSpeedPxPerSec < minSpeed) {
      speedDiagnosisLabel = `Demasiado lento para Fase 2 (${avgSpeedPxPerSec} px/s, requieres ≥${minSpeed} px/s)`;
    } else {
      speedDiagnosisLabel = 'Fluidez constante excelente';
    }
  } else {
    // FASE 3: VELOCIDAD Y DISPARO BALÍSTICO
    // Exige golpe decidido y rápido con buen impulso reflejo (>= 360 px/s o 95% baseline)
    const targetFastSpeed = Math.max(360, Math.round(userBaseline * 0.95));
    const maxDurationMs = Math.max(700, Math.round(totalLength * 1.8));
    phaseRequirementText = `Fase 3: Trazo balístico rápido (≥${targetFastSpeed} px/s en ≤${maxDurationMs}ms)`;
    phasePassed = avgSpeedPxPerSec >= targetFastSpeed && durationMs <= maxDurationMs;

    if (phasePassed) {
      speedDiagnosisLabel = '¡Disparo balístico certero a gran velocidad!';
    } else if (avgSpeedPxPerSec < targetFastSpeed) {
      speedDiagnosisLabel = `Velocidad insuficiente: vas a ${avgSpeedPxPerSec} px/s (requieres ≥${targetFastSpeed} px/s)`;
    } else {
      speedDiagnosisLabel = `Demasiado tiempo en el lienzo: ${durationMs}ms (requieres impulso rápido ≤${maxDurationMs}ms)`;
    }
  }

  return {
    durationMs,
    lengthPx: Math.round(totalLength),
    avgSpeedPxPerSec,
    peakSpeedPxPerSec,
    fluencyScore,
    microStopCount,
    userBaselineSpeedPxPerSec: userBaseline,
    speedRatioVsBaseline,
    phasePassed,
    phaseRequirementText,
    speedDiagnosisLabel,
  };
}

/**
 * Obtiene la etiqueta amigable en español de una dirección biomecánica
 */
export function getDirectionDisplayLabel(dir: StrokeDirection | string): string {
  switch (dir) {
    case 'bottom_up_left_right':
      return 'D1 (↗ Ascendente Der)';
    case 'top_down_right_left':
      return 'D2 (↙ Descendente Izq)';
    case 'top_down_left_right':
      return 'D3 (↘ Descendente Der)';
    case 'bottom_up_right_left':
      return 'D4 (↖ Ascendente Izq)';
    case 'horizontal_left_right':
      return 'D5 (→ Horizontal Der)';
    case 'horizontal_right_left':
      return 'D6 (← Horizontal Izq)';
    case 'vertical_bottom_up':
      return 'D7 (↑ Vertical Arriba)';
    case 'vertical_top_down':
      return 'D8 (↓ Vertical Abajo)';
    case 'shallow_up_left_right':
      return 'D9 (↗ Fuga Suave Der)';
    case 'shallow_up_right_left':
      return 'D10 (↖ Fuga Suave Izq)';
    case 'radial_outward':
      return 'D11 (☼ Roseta Dentro-Fuera)';
    case 'radial_inward':
      return 'D12 (❂ Roseta Fuera-Dentro)';
    case 'curve_c':
      return 'Curva Arco C';
    case 'curve_s':
      return 'Curva Onda S';
    default:
      return 'Líneas Generales';
  }
}

/**
 * Analiza comparativamente la velocidad entre direcciones para dar insights biomecánicos al dibujante
 */
export function getBiomechanicalComparison(profile: UserSpeedProfile): string | null {
  const dirs = profile.directions;
  const d1 = dirs['bottom_up_left_right']?.avgSpeedPxPerSec;
  const d2 = dirs['top_down_right_left']?.avgSpeedPxPerSec;
  const d3 = dirs['top_down_left_right']?.avgSpeedPxPerSec;
  const d4 = dirs['bottom_up_right_left']?.avgSpeedPxPerSec;
  const d5 = dirs['horizontal_left_right']?.avgSpeedPxPerSec;
  const d6 = dirs['horizontal_right_left']?.avgSpeedPxPerSec;
  const d7 = dirs['vertical_bottom_up']?.avgSpeedPxPerSec;
  const d8 = dirs['vertical_top_down']?.avgSpeedPxPerSec;
  const d9 = dirs['shallow_up_left_right']?.avgSpeedPxPerSec;
  const d10 = dirs['shallow_up_right_left']?.avgSpeedPxPerSec;
  const d11 = dirs['radial_outward']?.avgSpeedPxPerSec;
  const d12 = dirs['radial_inward']?.avgSpeedPxPerSec;

  const entries: { name: string; speed: number }[] = [];
  if (d1) entries.push({ name: '↗ D1 (Ascendente Der)', speed: d1 });
  if (d2) entries.push({ name: '↙ D2 (Descendente Izq)', speed: d2 });
  if (d3) entries.push({ name: '↘ D3 (Descendente Der)', speed: d3 });
  if (d4) entries.push({ name: '↖ D4 (Ascendente Izq)', speed: d4 });
  if (d5) entries.push({ name: '→ D5 (Horizontal Der)', speed: d5 });
  if (d6) entries.push({ name: '← D6 (Horizontal Izq)', speed: d6 });
  if (d7) entries.push({ name: '↑ D7 (Vertical Arriba)', speed: d7 });
  if (d8) entries.push({ name: '↓ D8 (Vertical Abajo)', speed: d8 });
  if (d9) entries.push({ name: '↗ D9 (Fuga Suave Der)', speed: d9 });
  if (d10) entries.push({ name: '↖ D10 (Fuga Suave Izq)', speed: d10 });
  if (d11) entries.push({ name: '☼ D11 (Roseta Dentro-Fuera)', speed: d11 });
  if (d12) entries.push({ name: '❂ D12 (Roseta Fuera-Dentro)', speed: d12 });

  if (entries.length < 2) return null;

  entries.sort((a, b) => b.speed - a.speed);
  const fastest = entries[0];
  const slowest = entries[entries.length - 1];
  const diffPct = Math.round(((fastest.speed - slowest.speed) / slowest.speed) * 100);

  if (diffPct < 8) {
    return 'Tu ritmo es notablemente uniforme en todas las direcciones de trazo.';
  }

  return `Trazas ${fastest.name} un ${diffPct}% más rápido que ${slowest.name}. Esto refleja la rotación biomecánica del antebrazo hacia el exterior.`;
}
