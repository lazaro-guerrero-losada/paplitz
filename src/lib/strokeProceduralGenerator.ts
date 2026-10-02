import {
  ProceduralStrokeChallenge,
  WorkbookExerciseDef,
  LabExerciseDef,
  ALL_LAB_EXERCISES,
  PolyFace,
  KeyPoint,
  TargetLineDef,
} from './strokeTypes';

/**
 * Generador pseudoaleatorio basado en semilla (LCG)
 */
export class SeededRNG {
  private m = 0x80000000; // 2**31
  private a = 1103515245;
  private c = 12345;
  private state: number;

  constructor(seed: number) {
    this.state = (Math.abs(seed) % (this.m - 1)) + 1;
  }

  nextFloat(): number {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state / (this.m - 1);
  }

  range(min: number, max: number): number {
    return min + this.nextFloat() * (max - min);
  }

  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
}

function shuffleWithRNG<T>(array: T[], rng: SeededRNG): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng.rangeInt(0, i);
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * Genera un reto de Calistenia Multi-Línea (2 o 3 líneas independientes dispersas)
 */
export function generateMultiLineChallenge(
  exercise: LabExerciseDef,
  seed: number,
  canvasWidth = 600,
  canvasHeight = 540,
  lineCount: 2 | 3 = 2
): ProceduralStrokeChallenge {
  const rng = new SeededRNG(seed);
  const cfg = exercise.singleStrokeConfig || {
    direction: 'bottom_up_left_right',
    variationType: 'multi_line',
    guideType: 'points_only',
  };

  let dirArrow = '↗';
  let dirLabel = 'Abajo a Arriba, Izquierda a Derecha (↗)';
  if (cfg.direction === 'top_down_right_left') {
    dirArrow = '↙';
    dirLabel = 'Arriba a Abajo, Derecha a Izquierda (↙)';
  } else if (cfg.direction === 'top_down_left_right') {
    dirArrow = '↘';
    dirLabel = 'Arriba a Abajo, Izquierda a Derecha (↘)';
  } else if (cfg.direction === 'bottom_up_right_left') {
    dirArrow = '↖';
    dirLabel = 'Abajo a Arriba, Derecha a Izquierda (↖)';
  } else if (cfg.direction === 'horizontal_left_right') {
    dirArrow = '→';
    dirLabel = 'Horizontal, Izquierda a Derecha (→)';
  } else if (cfg.direction === 'horizontal_right_left') {
    dirArrow = '←';
    dirLabel = 'Horizontal, Derecha a Izquierda (←)';
  } else if (cfg.direction === 'vertical_bottom_up') {
    dirArrow = '↑';
    dirLabel = 'Vertical, Abajo a Arriba (↑)';
  } else if (cfg.direction === 'vertical_top_down') {
    dirArrow = '↓';
    dirLabel = 'Vertical, Arriba a Abajo (↓)';
  } else if (cfg.direction === 'shallow_up_left_right') {
    dirArrow = '↗';
    dirLabel = 'Fuga Suave ~18° (↗ Izq-Der)';
  } else if (cfg.direction === 'shallow_up_right_left') {
    dirArrow = '↖';
    dirLabel = 'Fuga Suave ~18° (↖ Der-Izq)';
  }

  // 1. Asignación de Centros no solapados en distintos cuadrantes
  let centers: { cx: number; cy: number }[] = [];
  if (lineCount === 2) {
    const flip = rng.nextFloat() > 0.5;
    const c1 = {
      cx: rng.range(160, 310),
      cy: rng.range(130, 230),
    };
    const c2 = {
      cx: rng.range(320, 460),
      cy: rng.range(290, 410),
    };
    centers = flip ? [c2, c1] : [c1, c2];
  } else {
    // 3 Líneas en 3 sectores
    const z0 = {
      cx: rng.range(150, 300),
      cy: rng.range(120, 195),
    };
    const z1 = {
      cx: rng.range(330, 460),
      cy: rng.range(210, 330),
    };
    const z2 = {
      cx: rng.range(150, 310),
      cy: rng.range(340, 420),
    };
    centers = shuffleWithRNG([z0, z1, z2], rng);
  }

  // 2. Longitudes diferentes para cada línea
  let lengths: number[] = [];
  if (lineCount === 2) {
    const l1 = Math.round(rng.range(135, 185));
    const l2 = Math.round(rng.range(225, 290));
    lengths = rng.nextFloat() > 0.5 ? [l1, l2] : [l2, l1];
  } else {
    const lShort = Math.round(rng.range(130, 165));
    const lMed = Math.round(rng.range(185, 225));
    const lLong = Math.round(rng.range(250, 295));
    lengths = shuffleWithRNG([lShort, lMed, lLong], rng);
  }

  // 3. Ángulos de rotación diferenciados dentro del sector motor
  let angles: number[] = [];
  const isD1orD2 = cfg.direction === 'bottom_up_left_right' || cfg.direction === 'top_down_right_left';
  const isHorizontal = cfg.direction === 'horizontal_left_right' || cfg.direction === 'horizontal_right_left';
  const isVertical = cfg.direction === 'vertical_bottom_up' || cfg.direction === 'vertical_top_down';
  const isShallow = cfg.direction === 'shallow_up_left_right' || cfg.direction === 'shallow_up_right_left';

  if (lineCount === 2) {
    if (isHorizontal) {
      angles = [0, 0];
    } else if (isVertical) {
      angles = [90, 90];
    } else if (isShallow) {
      const a1 = Math.round(rng.range(13, 17));
      const a2 = Math.round(rng.range(19, 23));
      angles = rng.nextFloat() > 0.5 ? [a1, a2] : [a2, a1];
    } else if (isD1orD2) {
      const a1 = Math.round(rng.range(36, 50));
      const a2 = Math.round(rng.range(60, 74));
      angles = rng.nextFloat() > 0.5 ? [a1, a2] : [a2, a1];
    } else {
      const a1 = Math.round(rng.range(26, 40));
      const a2 = Math.round(rng.range(50, 64));
      angles = rng.nextFloat() > 0.5 ? [a1, a2] : [a2, a1];
    }
  } else {
    if (isHorizontal) {
      angles = [0, 0, 0];
    } else if (isVertical) {
      angles = [90, 90, 90];
    } else if (isShallow) {
      const a1 = Math.round(rng.range(12, 15));
      const a2 = Math.round(rng.range(17, 20));
      const a3 = Math.round(rng.range(21, 24));
      angles = shuffleWithRNG([a1, a2, a3], rng);
    } else if (isD1orD2) {
      const a1 = Math.round(rng.range(35, 46));
      const a2 = Math.round(rng.range(50, 60));
      const a3 = Math.round(rng.range(64, 75));
      angles = shuffleWithRNG([a1, a2, a3], rng);
    } else {
      const a1 = Math.round(rng.range(25, 36));
      const a2 = Math.round(rng.range(40, 50));
      const a3 = Math.round(rng.range(54, 65));
      angles = shuffleWithRNG([a1, a2, a3], rng);
    }
  }

  // 4. Construcción de coordenadas para cada línea
  const keyPoints: KeyPoint[] = [];
  const targetLines: TargetLineDef[] = [];
  const ghostSolutionStrokes: { points: { x: number; y: number }[] }[] = [];
  const guideLines: { x1: number; y1: number; x2: number; y2: number; dashed?: boolean }[] = [];

  for (let k = 0; k < lineCount; k++) {
    const { cx, cy } = centers[k];
    const L = lengths[k];
    const halfL = L / 2;
    const angleDeg = angles[k];
    const thetaRad = (angleDeg * Math.PI) / 180;
    const dx = halfL * Math.cos(thetaRad);
    const dy = halfL * Math.sin(thetaRad);

    let pStart = { x: cx, y: cy };
    let pEnd = { x: cx, y: cy };

    if (cfg.direction === 'bottom_up_left_right') {
      // ↗ D1: Abajo-Izquierda -> Arriba-Derecha
      pStart = { x: cx - dx, y: cy + dy };
      pEnd = { x: cx + dx, y: cy - dy };
    } else if (cfg.direction === 'top_down_right_left') {
      // ↙ D2: Arriba-Derecha -> Abajo-Izquierda
      pStart = { x: cx + dx, y: cy - dy };
      pEnd = { x: cx - dx, y: cy + dy };
    } else if (cfg.direction === 'top_down_left_right') {
      // ↘ D3: Arriba-Izquierda -> Abajo-Derecha
      pStart = { x: cx - dx, y: cy - dy };
      pEnd = { x: cx + dx, y: cy + dy };
    } else if (cfg.direction === 'bottom_up_right_left') {
      // ↖ D4: Abajo-Derecha -> Arriba-Izquierda
      pStart = { x: cx + dx, y: cy + dy };
      pEnd = { x: cx - dx, y: cy - dy };
    } else if (cfg.direction === 'horizontal_left_right') {
      // → D5: Izquierda -> Derecha (completamente horizontal)
      pStart = { x: cx - dx, y: cy };
      pEnd = { x: cx + dx, y: cy };
    } else if (cfg.direction === 'horizontal_right_left') {
      // ← D6: Derecha -> Izquierda (completamente horizontal)
      pStart = { x: cx + dx, y: cy };
      pEnd = { x: cx - dx, y: cy };
    } else if (cfg.direction === 'vertical_bottom_up') {
      // ↑ D7: Abajo -> Arriba (completamente vertical)
      pStart = { x: cx, y: cy + dy };
      pEnd = { x: cx, y: cy - dy };
    } else if (cfg.direction === 'vertical_top_down') {
      // ↓ D8: Arriba -> Abajo (completamente vertical)
      pStart = { x: cx, y: cy - dy };
      pEnd = { x: cx, y: cy + dy };
    } else if (cfg.direction === 'shallow_up_left_right') {
      // ↗ D9: Fuga Suave Izquierda -> Derecha (ascendente)
      pStart = { x: cx - dx, y: cy + dy };
      pEnd = { x: cx + dx, y: cy - dy };
    } else if (cfg.direction === 'shallow_up_right_left') {
      // ↖ D10: Fuga Suave Derecha -> Izquierda (ascendente)
      pStart = { x: cx + dx, y: cy + dy };
      pEnd = { x: cx - dx, y: cy - dy };
    }

    // Margen seguro respecto a los bordes del canvas (45px)
    const minX = Math.min(pStart.x, pEnd.x);
    const maxX = Math.max(pStart.x, pEnd.x);
    const minY = Math.min(pStart.y, pEnd.y);
    const maxY = Math.max(pStart.y, pEnd.y);
    let shiftX = 0;
    let shiftY = 0;
    if (minX < 45) shiftX = 45 - minX;
    else if (maxX > canvasWidth - 45) shiftX = canvasWidth - 45 - maxX;
    if (minY < 45) shiftY = 45 - minY;
    else if (maxY > canvasHeight - 45) shiftY = canvasHeight - 45 - maxY;

    pStart.x = Math.round(pStart.x + shiftX);
    pStart.y = Math.round(pStart.y + shiftY);
    pEnd.x = Math.round(pEnd.x + shiftX);
    pEnd.y = Math.round(pEnd.y + shiftY);

    // Puntos diana numerados: Línea 1 -> 1 y 2; Línea 2 -> 3 y 4; Línea 3 -> 5 y 6
    const startOrder = 2 * k + 1;
    const endOrder = 2 * k + 2;
    keyPoints.push({ x: pStart.x, y: pStart.y, order: startOrder, label: String(startOrder), type: 'start' });
    keyPoints.push({ x: pEnd.x, y: pEnd.y, order: endOrder, label: String(endOrder), type: 'end' });

    // Trayectoria ideal interpolada
    const STEPS = 30;
    const idealPath: { x: number; y: number }[] = [];
    for (let s = 0; s <= STEPS; s++) {
      const t = s / STEPS;
      idealPath.push({
        x: pStart.x + (pEnd.x - pStart.x) * t,
        y: pStart.y + (pEnd.y - pStart.y) * t,
      });
    }

    targetLines.push({
      id: `line-${k + 1}`,
      start: pStart,
      end: pEnd,
      idealPath,
      angleDeg,
      lengthPx: L,
      order: k + 1,
      startKeyPointOrder: startOrder,
      endKeyPointOrder: endOrder,
    });

    ghostSolutionStrokes.push({ points: idealPath });

    if (cfg.guideType === 'gray_line') {
      guideLines.push({ x1: pStart.x, y1: pStart.y, x2: pEnd.x, y2: pEnd.y, dashed: false });
    }
  }

  const avgLength = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);

  return {
    id: `multi-${exercise.code}-${seed}`,
    pageNumber: exercise.page || 0,
    code: exercise.code,
    category: exercise.category,
    title: exercise.title,
    subtitle: `${dirArrow} ${lineCount} Líneas (${dirLabel}) · L: ${lengths.join('/')}px · θ: ${angles.map((a) => `${a}°`).join('/')}`,
    blockTitle: exercise.block,
    seed,
    instruction: exercise.instruction,
    targetMetricsText: exercise.metrics,
    targetAngleDeg: angles[0],
    targetSpacingPx: 0,
    targetLengthPx: avgLength,
    minRequiredStrokes: lineCount,
    multiLineCount: lineCount,
    targetLines,
    isSingleStrokeAutoEval: true,
    directionKey: cfg.direction,
    guideMode: cfg.guideType,
    keyPoints,
    ghostSolutionStrokes,
    idealPath: targetLines[0]?.idealPath || [],
    expectedDirectionAngleDeg: angles[0],
    guideLines,
  };
}

/**
 * Genera un reto de Calistenia Dinámica de Trazo Único (Línea o Curva)
 */
export function generateSingleStrokeChallenge(
  exercise: LabExerciseDef,
  seed: number,
  canvasWidth = 600,
  canvasHeight = 540
): ProceduralStrokeChallenge {
  const cfg = exercise.singleStrokeConfig || {
    direction: 'bottom_up_left_right',
    variationType: 'fixed',
    guideType: 'gray_line',
  };

  // Si el ejercicio está configurado para multi-líneas (2 o 3 líneas dispersas)
  if (cfg.multiLineCount && cfg.multiLineCount > 1) {
    return generateMultiLineChallenge(exercise, seed, canvasWidth, canvasHeight, cfg.multiLineCount);
  }

  const rng = new SeededRNG(seed);
  const isCurve = cfg.direction === 'curve_c' || cfg.direction === 'curve_s';

  // 1. Centro (cx, cy)
  let cx = canvasWidth / 2;
  let cy = canvasHeight / 2;
  if (
    cfg.variationType === 'position' ||
    cfg.variationType === 'position_length' ||
    cfg.variationType === 'total_random'
  ) {
    cx = rng.range(210, canvasWidth - 210);
    cy = rng.range(190, canvasHeight - 190);
  }

  // 2. Longitud L
  let L = 220;
  if (
    cfg.variationType === 'length' ||
    cfg.variationType === 'rotation_length' ||
    cfg.variationType === 'position_length' ||
    cfg.variationType === 'total_random'
  ) {
    L = rng.range(130, 310);
  }

  // 3. Ángulo y coordenadas según dirección biomecánica
  let dirArrow = '↗';
  let dirLabel = 'Abajo a Arriba (↗)';
  let angleDeg = 55;

  const halfL = L / 2;
  let pStart = { x: cx, y: cy };
  let pEnd = { x: cx, y: cy };

  if (cfg.direction === 'bottom_up_left_right') {
    // ↗ D1: Abajo hacia Arriba, Izquierda hacia Derecha
    // Inicio (1) = Abajo-Izquierda (x menor, y mayor en canvas)
    // Fin (2) = Arriba-Derecha (x mayor, y menor en canvas)
    dirArrow = '↗';
    dirLabel = 'Abajo a Arriba, Izquierda a Derecha (↗)';
    angleDeg = 55;
    if (
      cfg.variationType === 'rotation' ||
      cfg.variationType === 'rotation_length' ||
      cfg.variationType === 'total_random'
    ) {
      angleDeg = rng.range(35, 75);
    }
    const thetaRad = (angleDeg * Math.PI) / 180;
    const dx = halfL * Math.cos(thetaRad);
    const dy = halfL * Math.sin(thetaRad);
    pStart = { x: cx - dx, y: cy + dy }; // Abajo-Izquierda
    pEnd = { x: cx + dx, y: cy - dy };   // Arriba-Derecha

  } else if (cfg.direction === 'top_down_right_left') {
    // ↙ D2: Arriba hacia Abajo, Derecha hacia Izquierda
    // Inicio (1) = Arriba-Derecha (x mayor, y menor en canvas)
    // Fin (2) = Abajo-Izquierda (x menor, y mayor en canvas)
    dirArrow = '↙';
    dirLabel = 'Arriba a Abajo, Derecha a Izquierda (↙)';
    angleDeg = 55;
    if (
      cfg.variationType === 'rotation' ||
      cfg.variationType === 'rotation_length' ||
      cfg.variationType === 'total_random'
    ) {
      angleDeg = rng.range(35, 75);
    }
    const thetaRad = (angleDeg * Math.PI) / 180;
    const dx = halfL * Math.cos(thetaRad);
    const dy = halfL * Math.sin(thetaRad);
    pStart = { x: cx + dx, y: cy - dy }; // Arriba-Derecha
    pEnd = { x: cx - dx, y: cy + dy };   // Abajo-Izquierda

  } else if (cfg.direction === 'top_down_left_right') {
    // ↘ D3: Arriba hacia Abajo, Izquierda hacia Derecha
    // Inicio (1) = Arriba-Izquierda (x menor, y menor en canvas)
    // Fin (2) = Abajo-Derecha (x mayor, y mayor en canvas)
    dirArrow = '↘';
    dirLabel = 'Arriba a Abajo, Izquierda a Derecha (↘)';
    angleDeg = 45;
    if (
      cfg.variationType === 'rotation' ||
      cfg.variationType === 'rotation_length' ||
      cfg.variationType === 'total_random'
    ) {
      angleDeg = rng.range(25, 65);
    }
    const thetaRad = (angleDeg * Math.PI) / 180;
    const dx = halfL * Math.cos(thetaRad);
    const dy = halfL * Math.sin(thetaRad);
    pStart = { x: cx - dx, y: cy - dy }; // Arriba-Izquierda
    pEnd = { x: cx + dx, y: cy + dy };   // Abajo-Derecha

  } else if (cfg.direction === 'bottom_up_right_left') {
    // ↖ D4: Abajo hacia Arriba, Derecha hacia Izquierda
    // Inicio (1) = Abajo-Derecha (x mayor, y mayor en canvas)
    // Fin (2) = Arriba-Izquierda (x menor, y menor en canvas)
    dirArrow = '↖';
    dirLabel = 'Abajo a Arriba, Derecha a Izquierda (↖)';
    angleDeg = 45;
    if (
      cfg.variationType === 'rotation' ||
      cfg.variationType === 'rotation_length' ||
      cfg.variationType === 'total_random'
    ) {
      angleDeg = rng.range(25, 65);
    }
    const thetaRad = (angleDeg * Math.PI) / 180;
    const dx = halfL * Math.cos(thetaRad);
    const dy = halfL * Math.sin(thetaRad);
    pStart = { x: cx + dx, y: cy + dy }; // Abajo-Derecha
    pEnd = { x: cx - dx, y: cy - dy };   // Arriba-Izquierda

  } else if (cfg.direction === 'horizontal_left_right') {
    // → D5: Horizontal de Izquierda a Derecha (estrictamente horizontal, 0°)
    // Inicio (1) = Izquierda (x menor)
    // Fin (2) = Derecha (x mayor)
    dirArrow = '→';
    dirLabel = 'Horizontal, Izquierda a Derecha (→)';
    angleDeg = 0;
    const dx = halfL;
    pStart = { x: cx - dx, y: cy }; // Izquierda
    pEnd = { x: cx + dx, y: cy };   // Derecha

  } else if (cfg.direction === 'horizontal_right_left') {
    // ← D6: Horizontal de Derecha a Izquierda (estrictamente horizontal, 0°)
    // Inicio (1) = Derecha (x mayor)
    // Fin (2) = Izquierda (x menor)
    dirArrow = '←';
    dirLabel = 'Horizontal, Derecha a Izquierda (←)';
    angleDeg = 0;
    const dx = halfL;
    pStart = { x: cx + dx, y: cy }; // Derecha
    pEnd = { x: cx - dx, y: cy };   // Izquierda

  } else if (cfg.direction === 'vertical_bottom_up') {
    // ↑ D7: Vertical de Abajo a Arriba (estrictamente vertical, 90°)
    // Inicio (1) = Abajo (y mayor en canvas)
    // Fin (2) = Arriba (y menor en canvas)
    dirArrow = '↑';
    dirLabel = 'Vertical, Abajo a Arriba (↑)';
    angleDeg = 90;
    const dy = halfL;
    pStart = { x: cx, y: cy + dy }; // Abajo
    pEnd = { x: cx, y: cy - dy };   // Arriba

  } else if (cfg.direction === 'vertical_top_down') {
    // ↓ D8: Vertical de Arriba a Abajo (estrictamente vertical, 90°)
    // Inicio (1) = Arriba (y menor en canvas)
    // Fin (2) = Abajo (y mayor en canvas)
    dirArrow = '↓';
    dirLabel = 'Vertical, Arriba a Abajo (↓)';
    angleDeg = 90;
    const dy = halfL;
    pStart = { x: cx, y: cy - dy }; // Arriba
    pEnd = { x: cx, y: cy + dy };   // Abajo

  } else if (cfg.direction === 'shallow_up_left_right') {
    // ↗ D9: Fuga Suave ~15°-20° Abajo a Arriba, Izquierda a Derecha
    // Inicio (1) = Abajo-Izquierda (x menor, y mayor en canvas)
    // Fin (2) = Arriba-Derecha (x mayor, y menor en canvas)
    dirArrow = '↗';
    dirLabel = 'Fuga Suave ~18° (↗ Izq-Der)';
    angleDeg = 18;
    if (
      cfg.variationType === 'rotation' ||
      cfg.variationType === 'rotation_length' ||
      cfg.variationType === 'total_random'
    ) {
      angleDeg = rng.range(12, 24);
    }
    const thetaRad = (angleDeg * Math.PI) / 180;
    const dx = halfL * Math.cos(thetaRad);
    const dy = halfL * Math.sin(thetaRad);
    pStart = { x: cx - dx, y: cy + dy }; // Abajo-Izquierda
    pEnd = { x: cx + dx, y: cy - dy };   // Arriba-Derecha

  } else if (cfg.direction === 'shallow_up_right_left') {
    // ↖ D10: Fuga Suave ~15°-20° Abajo a Arriba, Derecha a Izquierda
    // Inicio (1) = Abajo-Derecha (x mayor, y mayor en canvas)
    // Fin (2) = Arriba-Izquierda (x menor, y menor en canvas)
    dirArrow = '↖';
    dirLabel = 'Fuga Suave ~18° (↖ Der-Izq)';
    angleDeg = 18;
    if (
      cfg.variationType === 'rotation' ||
      cfg.variationType === 'rotation_length' ||
      cfg.variationType === 'total_random'
    ) {
      angleDeg = rng.range(12, 24);
    }
    const thetaRad = (angleDeg * Math.PI) / 180;
    const dx = halfL * Math.cos(thetaRad);
    const dy = halfL * Math.sin(thetaRad);
    pStart = { x: cx + dx, y: cy + dy }; // Abajo-Derecha
    pEnd = { x: cx - dx, y: cy - dy };   // Arriba-Izquierda

  } else if (isCurve) {
    dirArrow = '〜';
    dirLabel = cfg.direction === 'curve_c' ? 'Arco en C' : 'Onda en S';
    angleDeg = 0;
    if (
      cfg.variationType === 'rotation' ||
      cfg.variationType === 'rotation_length' ||
      cfg.variationType === 'total_random'
    ) {
      angleDeg = rng.range(-35, 35);
    }
  }

  const angleRad = (angleDeg * Math.PI) / 180;
  const keyPoints: KeyPoint[] = [];
  const idealPoints: { x: number; y: number }[] = [];

  if (cfg.direction === 'curve_c') {
    // Arco en C: parametrizado a lo largo de una cuerda L
    let sagitta = 35;
    if (cfg.curvature === 'subtle') sagitta = L * 0.14;
    else if (cfg.curvature === 'medium') sagitta = L * 0.28;
    else if (cfg.curvature === 'pronounced') sagitta = L * 0.48;

    const cStart = {
      x: cx - (L / 2) * Math.cos(angleRad),
      y: cy + (L / 2) * Math.sin(angleRad),
    };
    const cEnd = {
      x: cx + (L / 2) * Math.cos(angleRad),
      y: cy - (L / 2) * Math.sin(angleRad),
    };

    const perpAngle = angleRad - Math.PI / 2;
    const cMid = {
      x: (cStart.x + cEnd.x) / 2 + Math.cos(perpAngle) * sagitta,
      y: (cStart.y + cEnd.y) / 2 + Math.sin(perpAngle) * sagitta,
    };

    // Punto de control cuadrático
    const cp = {
      x: 2 * cMid.x - 0.5 * cStart.x - 0.5 * cEnd.x,
      y: 2 * cMid.y - 0.5 * cStart.y - 0.5 * cEnd.y,
    };

    const STEPS = 40;
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const x = (1 - t) * (1 - t) * cStart.x + 2 * (1 - t) * t * cp.x + t * t * cEnd.x;
      const y = (1 - t) * (1 - t) * cStart.y + 2 * (1 - t) * t * cp.y + t * t * cEnd.y;
      idealPoints.push({ x, y });
    }

    keyPoints.push({ x: cStart.x, y: cStart.y, order: 1, label: '1', type: 'start' });
    keyPoints.push({ x: cMid.x, y: cMid.y, order: 2, label: '2', type: 'mid' });
    keyPoints.push({ x: cEnd.x, y: cEnd.y, order: 3, label: '3', type: 'end' });

  } else if (cfg.direction === 'curve_s') {
    // Onda en S: sinusoidal
    let amplitude = 25;
    if (cfg.curvature === 'subtle') amplitude = 18;
    else if (cfg.curvature === 'medium') amplitude = 32;
    else if (cfg.curvature === 'pronounced') amplitude = 52;

    const STEPS = 50;
    const perpAngle = angleRad - Math.PI / 2;

    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const s = (t - 0.5) * L;
      const wave = Math.sin(t * Math.PI * 2) * amplitude;
      const x = cx + s * Math.cos(angleRad) + wave * Math.cos(perpAngle);
      const y = cy - s * Math.sin(angleRad) - wave * Math.sin(perpAngle);
      idealPoints.push({ x, y });
    }

    const sStart = idealPoints[0];
    const sCrest = idealPoints[Math.round(STEPS * 0.25)];
    const sInflection = idealPoints[Math.round(STEPS * 0.5)];
    const sTrough = idealPoints[Math.round(STEPS * 0.75)];
    const sEnd = idealPoints[STEPS];

    keyPoints.push({ x: sStart.x, y: sStart.y, order: 1, label: '1', type: 'start' });
    keyPoints.push({ x: sCrest.x, y: sCrest.y, order: 2, label: '2', type: 'mid' });
    keyPoints.push({ x: sInflection.x, y: sInflection.y, order: 3, label: '3', type: 'mid' });
    keyPoints.push({ x: sTrough.x, y: sTrough.y, order: 4, label: '4', type: 'mid' });
    keyPoints.push({ x: sEnd.x, y: sEnd.y, order: 5, label: '5', type: 'end' });

  } else {
    // Línea Recta: punto inicial 1 y punto final 2
    const STEPS = 30;
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      idealPoints.push({
        x: pStart.x + (pEnd.x - pStart.x) * t,
        y: pStart.y + (pEnd.y - pStart.y) * t,
      });
    }

    keyPoints.push({ x: pStart.x, y: pStart.y, order: 1, label: '1', type: 'start' });
    keyPoints.push({ x: pEnd.x, y: pEnd.y, order: 2, label: '2', type: 'end' });
  }

  return {
    id: `single-${exercise.code}-${seed}`,
    pageNumber: exercise.page || 0,
    code: exercise.code,
    category: exercise.category,
    title: exercise.title,
    subtitle: `${dirArrow} ${dirLabel} · L: ${Math.round(L)}px · ${
      cfg.guideType === 'gray_line' ? 'Guía Gris Continua' : 'Solo Puntos Diana'
    }`,
    blockTitle: exercise.block,
    seed,
    instruction: exercise.instruction,
    targetMetricsText: exercise.metrics,
    targetAngleDeg: angleDeg,
    targetSpacingPx: 0,
    targetLengthPx: L,
    minRequiredStrokes: 1,
    isSingleStrokeAutoEval: true,
    directionKey: cfg.direction,
    guideMode: cfg.guideType,
    keyPoints,
    ghostSolutionStrokes: [{ points: idealPoints }],
    idealPath: idealPoints,
    expectedDirectionAngleDeg: angleDeg,
    guideLines:
      cfg.guideType === 'gray_line' && !isCurve
        ? [{ x1: keyPoints[0].x, y1: keyPoints[0].y, x2: keyPoints[1].x, y2: keyPoints[1].y, dashed: false }]
        : [],
  };
}

/**
 * Genera un reto procedural único según el ejercicio y una semilla
 */
export function generateStrokeChallenge(
  exerciseOrPage: WorkbookExerciseDef | number,
  seed = Math.floor(Math.random() * 100000),
  canvasWidth = 600,
  canvasHeight = 540
): ProceduralStrokeChallenge {
  const exercise: LabExerciseDef =
    typeof exerciseOrPage === 'number'
      ? ALL_LAB_EXERCISES.find((e) => e.page === exerciseOrPage) || ALL_LAB_EXERCISES[0]
      : exerciseOrPage;

  // Si es un ejercicio de trazo único de calistenia, generamos reto de trazo único
  if (
    exercise.isSingleStroke ||
    exercise.family === 'calisthenics_single' ||
    exercise.category === 'single_stroke_line' ||
    exercise.category === 'single_stroke_curve'
  ) {
    return generateSingleStrokeChallenge(exercise, seed, canvasWidth, canvasHeight);
  }

  const rng = new SeededRNG(seed);
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  const baseChallenge: ProceduralStrokeChallenge = {
    id: `stroke-${exercise.page || exercise.code}-${seed}`,
    pageNumber: exercise.page || 0,
    code: exercise.code,
    category: exercise.category,
    title: exercise.title,
    subtitle: `Pág. ${exercise.page} · ${exercise.block}`,
    blockTitle: exercise.block,
    seed,
    instruction: exercise.instruction,
    targetMetricsText: exercise.metrics,
    targetAngleDeg: 90,
    targetSpacingPx: 14,
    targetLengthPx: 120,
    minRequiredStrokes: 6,
    guideLines: [],
    ghostSolutionStrokes: [],
  };

  switch (exercise.category) {
    case 'parallel_lines': {
      const angleDeg = rng.range(35, 145);
      const angleRad = (angleDeg * Math.PI) / 180;
      const targetSpacingPx = rng.rangeInt(10, 20);
      const targetLengthPx = rng.rangeInt(90, 160);
      const corridorWidth = rng.range(220, 320);

      const perpRad = angleRad + Math.PI / 2;
      const halfW = corridorWidth / 2;
      const halfL = targetLengthPx / 2;

      const r1x1 = cx - Math.cos(perpRad) * halfW - Math.cos(angleRad) * halfL;
      const r1y1 = cy - Math.sin(perpRad) * halfW - Math.sin(angleRad) * halfL;
      const r1x2 = cx + Math.cos(perpRad) * halfW - Math.cos(angleRad) * halfL;
      const r1y2 = cy + Math.sin(perpRad) * halfW - Math.sin(angleRad) * halfL;

      const r2x1 = cx - Math.cos(perpRad) * halfW + Math.cos(angleRad) * halfL;
      const r2y1 = cy - Math.sin(perpRad) * halfW + Math.sin(angleRad) * halfL;
      const r2x2 = cx + Math.cos(perpRad) * halfW + Math.cos(angleRad) * halfL;
      const r2y2 = cy + Math.sin(perpRad) * halfW + Math.sin(angleRad) * halfL;

      const expectedStrokes = Math.round(corridorWidth / targetSpacingPx);
      const ghostSolutionStrokes: { points: { x: number; y: number }[] }[] = [];
      const strokeCount = Math.min(expectedStrokes, 16);

      for (let i = 0; i < strokeCount; i++) {
        const offset = -halfW + (i / (strokeCount - 1 || 1)) * corridorWidth;
        ghostSolutionStrokes.push({
          points: [
            {
              x: cx + Math.cos(perpRad) * offset - Math.cos(angleRad) * halfL,
              y: cy + Math.sin(perpRad) * offset - Math.sin(angleRad) * halfL,
            },
            {
              x: cx + Math.cos(perpRad) * offset + Math.cos(angleRad) * halfL,
              y: cy + Math.sin(perpRad) * offset + Math.sin(angleRad) * halfL,
            },
          ],
        });
      }

      return {
        ...baseChallenge,
        subtitle: `Ángulo ${Math.round(angleDeg)}° · Paso ~${targetSpacingPx}px · Longitud ${targetLengthPx}px`,
        targetAngleDeg: angleDeg,
        targetSpacingPx,
        targetLengthPx,
        minRequiredStrokes: Math.max(6, expectedStrokes - 4),
        guideLines: [
          { x1: r1x1, y1: r1y1, x2: r1x2, y2: r1y2, dashed: true },
          { x1: r2x1, y1: r2y1, x2: r2x2, y2: r2y2, dashed: true },
        ],
        ghostSolutionStrokes,
      };
    }

    case 'contour_lines': {
      const w = rng.range(180, 240);
      const h = rng.range(140, 190);
      const leftX = cx - w / 2;
      const rightX = cx + w / 2;

      const ghostSolutionStrokes: { points: { x: number; y: number }[] }[] = [];
      for (let i = 1; i <= 8; i++) {
        const t = i / 9;
        const x = leftX + (rightX - leftX) * t;
        const yTop = cy - h * 0.45;
        const yBot = cy + h * 0.45;
        ghostSolutionStrokes.push({
          points: [
            { x: x - 10, y: yTop },
            { x: x + 5, y: (yTop + yBot) / 2 },
            { x: x - 10, y: yBot },
          ],
        });
      }

      return {
        ...baseChallenge,
        subtitle: `Trama de Contorno · Paso ~14px`,
        targetSpacingPx: 14,
        minRequiredStrokes: 8,
        guideLines: [
          { x1: leftX, y1: cy - h / 2, x2: rightX, y2: cy - h * 0.4, dashed: false },
          { x1: leftX, y1: cy + h / 2, x2: rightX, y2: cy + h * 0.4, dashed: false },
          { x1: leftX, y1: cy - h / 2, x2: leftX, y2: cy + h / 2, dashed: false },
          { x1: rightX, y1: cy - h * 0.4, x2: rightX, y2: cy + h * 0.4, dashed: false },
        ],
        ghostSolutionStrokes,
      };
    }

    case 'angles_zigzags': {
      const apexAngle = rng.range(50, 110);
      const chevronCount = rng.rangeInt(3, 5);
      const chevronH = 80;
      const step = 45;

      const guideLines: { x1: number; y1: number; x2: number; y2: number; dashed?: boolean }[] = [];
      const startX = cx - ((chevronCount - 1) * step) / 2;
      const ghostPts: { x: number; y: number }[] = [];

      for (let i = 0; i < chevronCount; i++) {
        const x = startX + i * step;
        guideLines.push(
          { x1: x - 25, y1: cy + chevronH / 2, x2: x, y2: cy - chevronH / 2, dashed: true },
          { x1: x, y1: cy - chevronH / 2, x2: x + 25, y2: cy + chevronH / 2, dashed: true }
        );
        ghostPts.push({ x: x - 25, y: cy + chevronH / 2 });
        ghostPts.push({ x: x, y: cy - chevronH / 2 });
        ghostPts.push({ x: x + 25, y: cy + chevronH / 2 });
      }

      return {
        ...baseChallenge,
        subtitle: `Vértices en Quiebro · Ángulo de Cúspide ~${Math.round(apexAngle)}°`,
        targetAngleDeg: apexAngle,
        minRequiredStrokes: chevronCount * 2,
        guideLines,
        ghostSolutionStrokes: [{ points: ghostPts }],
      };
    }

    case 'curved_s_waves': {
      const amplitude = rng.range(22, 38);
      const wavelength = rng.range(90, 130);
      const waveLengthTotal = rng.range(250, 320);
      const targetSpacingPx = rng.rangeInt(12, 18);

      const startX = cx - waveLengthTotal / 2;
      const startY = cy;

      const ghostSolutionStrokes: { points: { x: number; y: number }[] }[] = [];
      for (let row = -2; row <= 2; row++) {
        const wavePts: { x: number; y: number }[] = [];
        const yOffset = row * 16;
        for (let x = startX; x <= startX + waveLengthTotal; x += 8) {
          const y = startY + yOffset + amplitude * Math.sin(((x - startX) / wavelength) * Math.PI * 2);
          wavePts.push({ x, y });
        }
        ghostSolutionStrokes.push({ points: wavePts });
      }

      return {
        ...baseChallenge,
        subtitle: `Amplitud ${Math.round(amplitude)}px · Onda ${Math.round(wavelength)}px`,
        targetAngleDeg: 0,
        targetSpacingPx,
        targetLengthPx: amplitude * 3,
        minRequiredStrokes: 6,
        waveParams: {
          amplitude,
          wavelength,
          phase: rng.range(0, Math.PI),
          startPoint: { x: startX, y: startY },
          endPoint: { x: startX + waveLengthTotal, y: startY },
        },
        guideLines: [
          { x1: startX, y1: startY - amplitude * 1.5, x2: startX + waveLengthTotal, y2: startY - amplitude * 1.5, dashed: true },
          { x1: startX, y1: startY + amplitude * 1.5, x2: startX + waveLengthTotal, y2: startY + amplitude * 1.5, dashed: true },
        ],
        ghostSolutionStrokes,
      };
    }

    case 'radial_focal': {
      const spokeCount = rng.rangeInt(10, 16);
      const innerR = 15;
      const outerR = rng.range(110, 150);

      const guideLines: { x1: number; y1: number; x2: number; y2: number; dashed?: boolean }[] = [];
      const ghostSolutionStrokes: { points: { x: number; y: number }[] }[] = [];

      for (let i = 0; i < spokeCount; i++) {
        const a = (i / spokeCount) * Math.PI * 2;
        if (i % 2 === 0) {
          guideLines.push({
            x1: cx + Math.cos(a) * innerR,
            y1: cy + Math.sin(a) * innerR,
            x2: cx + Math.cos(a) * outerR,
            y2: cy + Math.sin(a) * outerR,
            dashed: true,
          });
        }
        ghostSolutionStrokes.push({
          points: [
            { x: cx + Math.cos(a) * innerR, y: cy + Math.sin(a) * innerR },
            { x: cx + Math.cos(a) * outerR, y: cy + Math.sin(a) * outerR },
          ],
        });
      }

      return {
        ...baseChallenge,
        subtitle: `Foco Radial · ${spokeCount} Radios Confluyentes`,
        targetAngleDeg: 0,
        minRequiredStrokes: spokeCount,
        guideLines,
        ghostSolutionStrokes,
      };
    }

    case 'trailing_flicks': {
      const flickCount = 12;
      const guideLines = [
        { x1: cx - 140, y1: cy + 50, x2: cx + 140, y2: cy + 50, dashed: true },
      ];
      const ghostSolutionStrokes: { points: { x: number; y: number }[] }[] = [];
      for (let i = 0; i < flickCount; i++) {
        const x = cx - 120 + i * 22;
        ghostSolutionStrokes.push({
          points: [
            { x, y: cy + 50 },
            { x: x + 12, y: cy - 40 },
          ],
        });
      }

      return {
        ...baseChallenge,
        subtitle: `Flicks · Desvanecimiento Terminal Rápido`,
        minRequiredStrokes: 10,
        guideLines,
        ghostSolutionStrokes,
      };
    }

    case 'basic_strokes':
    case 'hatching_params':
    case 'cross_hatch_density': {
      const boxW = 160;
      const boxH = 140;
      const boxX = cx - boxW / 2;
      const boxY = cy - boxH / 2;

      const ghostSolutionStrokes: { points: { x: number; y: number }[] }[] = [];
      for (let i = 0; i < 14; i++) {
        const offset = -boxW / 2 + (i / 13) * boxW;
        ghostSolutionStrokes.push({
          points: [
            { x: cx + offset - 20, y: boxY + boxH },
            { x: cx + offset + 20, y: boxY },
          ],
        });
      }

      return {
        ...baseChallenge,
        subtitle: `Trama en Ventana · Paso 12px`,
        guideBounds: { x: boxX, y: boxY, width: boxW, height: boxH },
        minRequiredStrokes: 10,
        guideLines: [
          { x1: boxX, y1: boxY, x2: boxX + boxW, y2: boxY, dashed: false },
          { x1: boxX + boxW, y1: boxY, x2: boxX + boxW, y2: boxY + boxH, dashed: false },
          { x1: boxX + boxW, y1: boxY + boxH, x2: boxX, y2: boxY + boxH, dashed: false },
          { x1: boxX, y1: boxY + boxH, x2: boxX, y2: boxY, dashed: false },
        ],
        ghostSolutionStrokes,
      };
    }

    case 'cross_contour_blob': {
      const axisAngleDeg = rng.range(20, 60);
      const axisAngleRad = (axisAngleDeg * Math.PI) / 180;
      const axisLength = 220;

      const ax1 = cx - (Math.cos(axisAngleRad) * axisLength) / 2;
      const ay1 = cy - (Math.sin(axisAngleRad) * axisLength) / 2;
      const ax2 = cx + (Math.cos(axisAngleRad) * axisLength) / 2;
      const ay2 = cy + (Math.sin(axisAngleRad) * axisLength) / 2;

      const splinePoints = [
        { x: ax1 - 35, y: ay1 },
        { x: cx - 55, y: cy - 40 },
        { x: ax2 + 35, y: ay2 - 15 },
        { x: cx + 55, y: cy + 40 },
      ];

      const ghostSolutionStrokes: { points: { x: number; y: number }[] }[] = [];
      for (let i = 1; i <= 6; i++) {
        const t = i / 7;
        const curAx = ax1 + (ax2 - ax1) * t;
        const curAy = ay1 + (ay2 - ay1) * t;
        const perpX = -Math.sin(axisAngleRad) * 45;
        const perpY = Math.cos(axisAngleRad) * 45;
        ghostSolutionStrokes.push({
          points: [
            { x: curAx - perpX, y: curAy - perpY },
            { x: curAx + Math.cos(axisAngleRad) * 15, y: curAy + Math.sin(axisAngleRad) * 15 },
            { x: curAx + perpX, y: curAy + perpY },
          ],
        });
      }

      return {
        ...baseChallenge,
        subtitle: `Silueta Orgánica · Contornos Ortogonales a la Varilla`,
        minRequiredStrokes: 8,
        blobShape: {
          splinePoints,
          axisLine: { x1: ax1, y1: ay1, x2: ax2, y2: ay2 },
        },
        ghostSolutionStrokes,
      };
    }

    case 'even_value_strip':
    case 'direction_gradation': {
      const stripW = 280;
      const stripH = 65;
      const stripX = cx - stripW / 2;
      const stripY = cy - stripH / 2;

      const ghostSolutionStrokes: { points: { x: number; y: number }[] }[] = [];
      for (let i = 0; i < 20; i++) {
        const x = stripX + (i / 19) * stripW;
        ghostSolutionStrokes.push({
          points: [
            { x, y: stripY },
            { x, y: stripY + stripH },
          ],
        });
      }

      return {
        ...baseChallenge,
        subtitle: `Franja Tonal · Densidad Homogénea`,
        guideBounds: { x: stripX, y: stripY, width: stripW, height: stripH },
        minRequiredStrokes: 12,
        guideLines: [
          { x1: stripX, y1: stripY, x2: stripX + stripW, y2: stripY, dashed: false },
          { x1: stripX, y1: stripY + stripH, x2: stripX + stripW, y2: stripY + stripH, dashed: false },
          { x1: stripX, y1: stripY, x2: stripX, y2: stripY + stripH, dashed: false },
          { x1: stripX + stripW, y1: stripY, x2: stripX + stripW, y2: stripY + stripH, dashed: false },
        ],
        ghostSolutionStrokes,
      };
    }

    case 'isometric_rhombille': {
      const r = 55;
      const centerPt = { x: cx, y: cy };
      const topPt = { x: cx, y: cy - r * 1.73 };
      const botPt = { x: cx, y: cy + r * 1.73 };
      const leftPt = { x: cx - r * 1.5, y: cy };
      const rightPt = { x: cx + r * 1.5, y: cy };

      const ghostSolutionStrokes: { points: { x: number; y: number }[] }[] = [];
      for (let i = -3; i <= 3; i++) {
        ghostSolutionStrokes.push({
          points: [
            { x: cx - 25, y: cy - 45 + i * 9 },
            { x: cx + 25, y: cy - 45 + i * 9 },
          ],
        });
      }

      return {
        ...baseChallenge,
        subtitle: `Red Isométrica · Top: 0°, Left: 60°, Right: 120°`,
        minRequiredStrokes: 15,
        rhombilleFaces: [
          { orientation: 'top', vertices: [centerPt, leftPt, topPt, rightPt], targetAngleDeg: 0 },
          { orientation: 'left', vertices: [centerPt, leftPt, { x: cx - r * 1.5, y: cy + r }, botPt], targetAngleDeg: 60 },
          { orientation: 'right', vertices: [centerPt, rightPt, { x: cx + r * 1.5, y: cy + r }, botPt], targetAngleDeg: 120 },
        ],
        ghostSolutionStrokes,
      };
    }

    case 'cylinder_shading': {
      const cylW = 120;
      const cylH = 180;
      const x1 = cx - cylW / 2;
      const x2 = cx + cylW / 2;
      const y1 = cy - cylH / 2;
      const y2 = cy + cylH / 2;

      const ghostSolutionStrokes: { points: { x: number; y: number }[] }[] = [];
      for (let i = 0; i < 14; i++) {
        const x = x1 + cylW * 0.4 + (i / 13) * (cylW * 0.45);
        ghostSolutionStrokes.push({
          points: [
            { x, y: y1 },
            { x, y: y2 },
          ],
        });
      }

      return {
        ...baseChallenge,
        subtitle: `Cilindro · Sombra Núcleo y Luz Reflejada`,
        targetAngleDeg: 90,
        minRequiredStrokes: 12,
        guideLines: [
          { x1, y1, x2, y2: y1, dashed: false },
          { x1, y1, x2: x1, y2, dashed: false },
          { x1: x2, y1, x2, y2, dashed: false },
          { x1, y1: y2, x2, y2, dashed: false },
          { x1: cx + 20, y1, x2: cx + 20, y2, dashed: true },
        ],
        ghostSolutionStrokes,
      };
    }

    case 'sphere_shading': {
      const r = 90;
      const ghostSolutionStrokes: { points: { x: number; y: number }[] }[] = [];
      for (let rad = 25; rad <= 85; rad += 14) {
        const arcPts: { x: number; y: number }[] = [];
        for (let a = Math.PI * 0.2; a <= Math.PI * 0.8; a += 0.1) {
          arcPts.push({ x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad });
        }
        ghostSolutionStrokes.push({ points: arcPts });
      }

      return {
        ...baseChallenge,
        subtitle: `Esfera · Terminador Semilunar y Arcos Geodésicos`,
        minRequiredStrokes: 14,
        guideLines: [
          { x1: cx - r, y1: cy, x2: cx + r, y2: cy, dashed: true },
          { x1: cx, y1: cy - r, x2: cx, y2: cy + r, dashed: true },
        ],
        ghostSolutionStrokes,
      };
    }

    default: {
      const sunX = rng.range(80, canvasWidth - 80);
      const sunY = rng.range(60, 140);

      const size = 110;
      const vCenter = { x: cx, y: cy };
      const vTop = { x: cx, y: cy - size };
      const vBottom = { x: cx, y: cy + size };
      const vMidL = { x: cx - size * 0.86, y: cy - size * 0.5 };
      const vMidR = { x: cx + size * 0.86, y: cy - size * 0.5 };
      const vBotL = { x: cx - size * 0.86, y: cy + size * 0.5 };
      const vBotR = { x: cx + size * 0.86, y: cy + size * 0.5 };

      const faces: PolyFace[] = [
        {
          id: 'face-top',
          name: 'Tapa Superior',
          vertices: [vTop, vMidR, vCenter, vMidL],
          normal: { x: 0, y: -0.85, z: 0.52 },
          targetValueLevel: 0,
          targetDensityPct: 4,
        },
        {
          id: 'face-left',
          name: 'Cara Izquierda',
          vertices: [vMidL, vCenter, vBottom, vBotL],
          normal: { x: -0.8, y: 0.2, z: 0.56 },
          targetValueLevel: sunX < cx ? 1 : 2,
          targetDensityPct: sunX < cx ? 25 : 60,
        },
        {
          id: 'face-right',
          name: 'Cara Derecha',
          vertices: [vCenter, vMidR, vBotR, vBottom],
          normal: { x: 0.8, y: 0.2, z: 0.56 },
          targetValueLevel: sunX >= cx ? 1 : 2,
          targetDensityPct: sunX >= cx ? 25 : 60,
        },
      ];

      const ghostSolutionStrokes: { points: { x: number; y: number }[] }[] = [];
      for (let i = 0; i < 8; i++) {
        ghostSolutionStrokes.push({
          points: [
            { x: cx - 50 + i * 7, y: cy + 15 },
            { x: cx - 20 + i * 7, y: cy + 55 },
          ],
        });
        ghostSolutionStrokes.push({
          points: [
            { x: cx + 10 + i * 7, y: cy + 55 },
            { x: cx + 40 + i * 7, y: cy + 15 },
          ],
        });
      }

      return {
        ...baseChallenge,
        subtitle: `Foco Solar en (${Math.round(sunX)}, ${Math.round(sunY)}) · Ley de Lambert`,
        minRequiredStrokes: 12,
        polySolid: {
          sunPosition: { x: sunX, y: sunY },
          faces,
        },
        ghostSolutionStrokes,
      };
    }
  }
}
