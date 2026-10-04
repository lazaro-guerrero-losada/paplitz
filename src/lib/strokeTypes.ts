export type StrokeExerciseCategory =
  | 'single_stroke_line' // Trazo único: línea recta dinámica
  | 'single_stroke_curve'// Trazo único: arco en C u onda en S
  | 'parallel_lines'     // Ejercicios 1.1, 1.3
  | 'contour_lines'      // Ejercicios 1.2
  | 'angles_zigzags'     // Ejercicio 1.4
  | 'curved_s_waves'     // Ejercicio 1.5
  | 'radial_focal'       // Ejercicio 1.6
  | 'trailing_flicks'    // Ejercicios 1.7, 1.8
  | 'basic_strokes'      // Ejercicios 1.9, 1.10
  | 'hatching_params'    // Ejercicios 1.11, 1.12, 1.13
  | 'cross_contour_blob' // Ejercicios 2.5, 2.6, 2.7, 2.8
  | 'even_value_strip'   // Ejercicios 2.9, 2.10
  | 'direction_gradation'// Ejercicios 2.19, 2.20
  | 'revealing_planes'   // Ejercicios 2.21, 2.22
  | 'isometric_rhombille'// Ejercicio 2.23
  | 'polyhedron_shading' // Ejercicios 2.25, 2.26, 2.27, 2.28, 2.29, 2.30, 2.31, 2.32
  | 'curved_surfaces'    // Ejercicios 2.33, 2.34
  | 'cylinder_shading'   // Ejercicios 2.35, 2.36
  | 'sphere_shading'     // Ejercicio 2.37
  | 'composition_forms'  // Ejercicios 2.38, 2.39, 2.40
  | 'local_value'        // Ejercicio 2.41
  | 'cross_hatch_density'// Densidad de trama y retícula
  | 'compound_forms';    // Ejercicios 2.45, 2.46

export type StrokeDirection =
  | 'bottom_up_left_right'   // ↗ D1: Abajo a Arriba, Izquierda a Derecha (35° a 75°)
  | 'top_down_right_left'    // ↙ D2: Arriba a Abajo, Derecha a Izquierda (215° a 255°)
  | 'top_down_left_right'    // ↘ D3: Arriba a Abajo, Izquierda a Derecha (305° a 345°)
  | 'bottom_up_right_left'   // ↖ D4: Abajo a Arriba, Derecha a Izquierda (125° a 165°)
  | 'horizontal_left_right'  // → D5: Horizontal de Izquierda a Derecha (~0°)
  | 'horizontal_right_left'  // ← D6: Horizontal de Derecha a Izquierda (~0°)
  | 'vertical_bottom_up'     // ↑ D7: Vertical de Abajo a Arriba (~90°)
  | 'vertical_top_down'      // ↓ D8: Vertical de Arriba a Abajo (~90°)
  | 'shallow_up_left_right'  // ↗ D9: Fuga suave ~15°-20° Abajo a Arriba, Izquierda a Derecha
  | 'shallow_up_right_left'  // ↖ D10: Fuga suave ~15°-20° Abajo a Arriba, Derecha a Izquierda
  | 'radial_outward'         // ☼ D11: Roseta Radial de Dentro hacia Afuera
  | 'radial_inward'          // ❂ D12: Roseta Radial de Fuera hacia Adentro
  | 'curve_c'                // Arco C
  | 'curve_s';               // Onda S

export interface KeyPoint {
  x: number;
  y: number;
  order: number; // 1, 2, 3...
  label?: string; // "①", "②", "③"
  type?: 'start' | 'mid' | 'end';
}

export interface TargetLineDef {
  id: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  idealPath: { x: number; y: number }[];
  angleDeg: number;
  lengthPx: number;
  order: number;
  startKeyPointOrder: number;
  endKeyPointOrder: number;
}

export interface SingleStrokeConfig {
  direction: StrokeDirection;
  variationType: 'fixed' | 'length' | 'rotation' | 'rotation_length' | 'position' | 'position_length' | 'total_random' | 'multi_line';
  guideType: 'gray_line' | 'points_only';
  curvature?: 'subtle' | 'medium' | 'pronounced';
  baseAngleDeg?: number;
  baseLengthPx?: number;
  multiLineCount?: number;
  spokeCount?: 8 | 12;
}

export interface SpacingTrackConfig {
  bandCount: 1 | 2 | 4;
  spacingMultiplier: 1 | 0.5; // 1 = paso x, 0.5 = paso x/2
  baseSpacingPx: number;      // ej: 16px
  baseHeightPx: number;       // ej: 130px
  angleDeg?: number;          // 90 (vertical) o ~75 (diagonal)
  direction?: StrokeDirection;
  kinkType?: 'none' | 'triangle_left' | 'triangle_right' | 'chevron_left';
  hasBlocksWithGaps?: boolean;
}

export interface SpacingTrackBlock {
  id: string;
  xStart: number;
  xEnd: number;
  width: number;
  startLinePoints: { x: number; y: number }[];
  finalLinePoints: { x: number; y: number }[];
  targetInteriorLineCount: number;
}

export interface LabExerciseDef {
  id?: string;
  family?: 'calisthenics_single' | 'workbook_page';
  page?: number;
  code: string;
  title: string;
  block: string;
  category: StrokeExerciseCategory;
  difficulty: 'Fácil' | 'Media' | 'Difícil' | 'Experto';
  metrics: string;
  desc: string;
  instruction: string;
  isSingleStroke?: boolean;
  singleStrokeConfig?: SingleStrokeConfig;
  spacingTrackConfig?: SpacingTrackConfig;
}

export type WorkbookExerciseDef = LabExerciseDef;

export interface PointWithMeta {
  x: number;
  y: number;
  pressure: number;
  time: number;
}

export interface RawStroke {
  points: PointWithMeta[];
}

export interface PolyFace {
  id: string;
  name: string;
  vertices: { x: number; y: number }[];
  normal: { x: number; y: number; z: number };
  targetValueLevel: number; // 0: Luz, 1: Mediotono, 2: Sombra
  targetDensityPct: number; // Ej: 5%, 25%, 60%
}

export interface ProceduralStrokeChallenge {
  id: string;
  pageNumber: number;
  code: string;
  category: StrokeExerciseCategory;
  title: string;
  subtitle: string;
  blockTitle: string;
  seed: number;
  instruction: string;
  targetMetricsText: string;

  // Parámetros procedurales
  targetAngleDeg: number;
  targetSpacingPx: number;
  targetLengthPx: number;
  minRequiredStrokes: number;

  // Trazo Único y Multi-Líneas Dinámicas, Fases y Solución Fantasma
  isSingleStrokeAutoEval?: boolean;
  multiLineCount?: number;
  targetLines?: TargetLineDef[];
  directionKey?: StrokeDirection;
  activePhase?: 1 | 2 | 3;
  guideMode?: 'gray_line' | 'points_only';
  keyPoints?: KeyPoint[];
  ghostSolutionStrokes?: { points: { x: number; y: number }[] }[];
  idealPath?: { x: number; y: number }[];
  expectedDirectionAngleDeg?: number;
  directionToleranceDeg?: number;

  // Guías visuales 2D
  guideLines: { x1: number; y1: number; x2: number; y2: number; dashed?: boolean }[];
  guideBounds?: { x: number; y: number; width: number; height: number };

  // Curvas S y Arcos
  waveParams?: {
    amplitude: number;
    wavelength: number;
    phase: number;
    startPoint: { x: number; y: number };
    endPoint: { x: number; y: number };
  };

  // Blobs orgánicos
  blobShape?: {
    splinePoints: { x: number; y: number }[];
    axisLine: { x1: number; y1: number; x2: number; y2: number };
  };

  // Sólidos poliédricos 3D
  polySolid?: {
    sunPosition: { x: number; y: number };
    faces: PolyFace[];
  };

  // Red Isométrica / Panal
  rhombilleFaces?: {
    orientation: 'top' | 'left' | 'right';
    vertices: { x: number; y: number }[];
    targetAngleDeg: number;
  }[];

  // Franjas y Carriles de Espaciado (Consistencia 1.1)
  spacingTrackParams?: {
    bands: {
      id: string;
      yTop: number;
      yBottom: number;
      height: number;
    }[];
    samplePattern: {
      xStart: number;
      xEnd: number;
      stepX: number;
      lines: { x?: number; x1?: number; x2?: number; y1?: number; y2?: number; points?: { x: number; y: number }[]; hasArrow?: boolean }[];
    };
    trackXStart: number;
    trackXEnd: number;
    targetSpacingPx: number;
    subdivisionLabel: string;
    angleDeg?: number;
    direction?: StrokeDirection;
    dxOffset?: number;
    kinkType?: 'none' | 'triangle_left' | 'triangle_right' | 'chevron_left';
    blocks?: SpacingTrackBlock[];
  };
}

export interface StrokeEvaluation {
  overallScore: number;
  passed: boolean;
  metrics: {
    parallelismScore: number;
    spacingScore: number;
    straightnessScore: number;
    tonalDensityScore: number;
    boundaryScore: number;
  };
  detectedStats: {
    strokeCount: number;
    measuredAvgSpacingPx: number;
    spacingVariance: number;
    measuredAvgAngleDeg: number;
    measuredOpticalDensityPct: number;
  };
  feedbackTitle: string;
  feedbackMessage: string;
  tipMessage: string;
  isSingleStroke?: boolean;
  isReversed?: boolean;
  streak?: number;
  directionWarning?: string;
  solutionOverlay?: {
    points: { x: number; y: number }[];
    multiLines?: { points: { x: number; y: number }[] }[];
    color: string;
    label: string;
  };
  avatarMood?: import('./avatarTypes').AvatarMood;
  kinematics?: import('./strokeKinematics').StrokeKinematicsResult;
  currentPhase?: 1 | 2 | 3;
  phasePassed?: boolean;
}

function buildSingleStrokeLevel(
  id: string,
  code: string,
  title: string,
  block: string,
  direction: StrokeDirection,
  variationType: SingleStrokeConfig['variationType'],
  guideType: 'gray_line' | 'points_only',
  difficulty: 'Fácil' | 'Media' | 'Difícil' | 'Experto',
  desc: string,
  instruction: string,
  curvature?: 'subtle' | 'medium' | 'pronounced',
  baseAngleDeg?: number,
  multiLineCount?: number,
  spokeCount?: 8 | 12
): LabExerciseDef {
  const isRadial = direction === 'radial_outward' || direction === 'radial_inward';
  return {
    id,
    family: 'calisthenics_single',
    code,
    title,
    block,
    category: isRadial
      ? 'radial_focal'
      : direction === 'curve_c' || direction === 'curve_s'
      ? 'single_stroke_curve'
      : 'single_stroke_line',
    difficulty,
    metrics: isRadial
      ? `Confluencia radial (${spokeCount || 8} radios), puntería en dianas y rectitud`
      : multiLineCount
      ? `Coordinación multi-trazo (${multiLineCount} líneas), precisión en dianas y rectitud`
      : guideType === 'gray_line'
      ? 'Seguimiento de guía, rectitud y dirección'
      : 'Puntería en dianas ① y ②, rectitud y dirección',
    desc,
    instruction,
    isSingleStroke: true,
    singleStrokeConfig: {
      direction,
      variationType,
      guideType,
      curvature,
      baseAngleDeg,
      multiLineCount,
      spokeCount,
    },
  };
}

function buildSpacingTrackLevel(
  id: string,
  code: string,
  title: string,
  block: string,
  bandCount: 1 | 2 | 4,
  spacingMultiplier: 1 | 0.5,
  difficulty: 'Fácil' | 'Media' | 'Difícil' | 'Experto',
  desc: string,
  instruction: string,
  baseSpacingPx = 16,
  baseHeightPx = 130,
  direction: StrokeDirection = 'vertical_top_down',
  angleDeg = 90,
  kinkType: 'none' | 'triangle_left' | 'triangle_right' | 'chevron_left' = 'none',
  hasBlocksWithGaps = false
): LabExerciseDef {
  const stepLabel = spacingMultiplier === 1 ? 'x' : 'x/2';
  const isDiagonal = angleDeg !== 90;
  const isKink = kinkType !== 'none';
  const isChevron = kinkType === 'chevron_left';
  const metrics = isChevron
    ? `Espaciado constante (${stepLabel} = ${baseSpacingPx * spacingMultiplier}px), contención en carriles y quiebre en chevron ◄`
    : isKink
    ? `Espaciado constante (${stepLabel} = ${baseSpacingPx * spacingMultiplier}px), contención en carriles y quiebre triangular`
    : isDiagonal
    ? `Espaciado constante (${stepLabel} = ${baseSpacingPx * spacingMultiplier}px), contención en carriles y ángulo ~${angleDeg}°`
    : `Espaciado constante (${stepLabel} = ${baseSpacingPx * spacingMultiplier}px), contención en carriles y verticalidad`;

  return {
    id,
    family: 'calisthenics_single',
    code,
    title,
    block,
    category: 'parallel_lines',
    difficulty,
    metrics,
    desc,
    instruction,
    isSingleStroke: true,
    spacingTrackConfig: {
      bandCount,
      spacingMultiplier,
      baseSpacingPx,
      baseHeightPx,
      direction,
      angleDeg,
      kinkType,
      hasBlocksWithGaps,
    },
    singleStrokeConfig: {
      direction,
      variationType: 'fixed',
      guideType: 'gray_line',
      baseAngleDeg: angleDeg,
    },
  };
}

/**
 * 212 Ejercicios de Calistenia Dinámica de Trazo Único y Rosetas (Auto-evaluación instantánea)
 */
export const ALL_SINGLE_STROKE_EXERCISES: LabExerciseDef[] = [
  // DIRECCIÓN 1: Abajo a Arriba, Izquierda a Derecha (↗)
  buildSingleStrokeLevel('d1_01', 'C1.01', 'Línea Fija (↗ Guía Gris)', '⚡ Calistenia: D1 (↗ Abajo-Arriba / Izq-Der)', 'bottom_up_left_right', 'fixed', 'gray_line', 'Fácil', 'Primer contacto: línea fija en el centro con dirección natural ascendente.', 'Traza desde ① hasta ② siguiendo la línea gris.', undefined, 60),
  buildSingleStrokeLevel('d1_02', 'C1.02', 'Longitud Variable (↗ Guía Gris)', '⚡ Calistenia: D1 (↗ Abajo-Arriba / Izq-Der)', 'bottom_up_left_right', 'length', 'gray_line', 'Fácil', 'Mismo ángulo fijo pero longitud aleatoria en cada repetición.', 'Acomoda el alcance del brazo según la longitud indicada.', undefined, 60),
  buildSingleStrokeLevel('d1_03', 'C1.03', 'Rotación Variable (↗ Guía Gris)', '⚡ Calistenia: D1 (↗ Abajo-Arriba / Izq-Der)', 'bottom_up_left_right', 'rotation', 'gray_line', 'Fácil', 'Inclinación variable dentro del cuadrante natural (35° a 75°).', 'Ajusta el ángulo del antebrazo antes de iniciar el trazo.', undefined, 60),
  buildSingleStrokeLevel('d1_04', 'C1.04', 'Rotación & Longitud (↗ Guía Gris)', '⚡ Calistenia: D1 (↗ Abajo-Arriba / Izq-Der)', 'bottom_up_left_right', 'rotation_length', 'gray_line', 'Media', 'Combinación de longitud y ángulo cambiantes en cada intento.', 'Lanza el trazo adaptando longitud y dirección de una sola vez.', undefined, 60),
  buildSingleStrokeLevel('d1_05', 'C1.05', 'Posición Variable (↗ Guía Gris)', '⚡ Calistenia: D1 (↗ Abajo-Arriba / Izq-Der)', 'bottom_up_left_right', 'position', 'gray_line', 'Media', 'Misma inclinación y longitud fija, pero desplazada por distintas zonas de la pantalla.', 'Ubica el punto ① donde aparezca y traza con seguridad.', undefined, 60),
  buildSingleStrokeLevel('d1_06', 'C1.06', 'Posición & Longitud (↗ Guía Gris)', '⚡ Calistenia: D1 (↗ Abajo-Arriba / Izq-Der)', 'bottom_up_left_right', 'position_length', 'gray_line', 'Media', 'Cambia de posición y de longitud simultáneamente.', 'Controla el punto de frenada en cualquier cuadrante del lienzo.', undefined, 60),
  buildSingleStrokeLevel('d1_07', 'C1.07', 'Variación Total (↗ Guía Gris)', '⚡ Calistenia: D1 (↗ Abajo-Arriba / Izq-Der)', 'bottom_up_left_right', 'total_random', 'gray_line', 'Media', 'Posición, longitud y rotación cambian en cada intento sobre guía gris.', 'Máxima agilidad motora antes de retirar la guía continua.', undefined, 60),
  buildSingleStrokeLevel('d1_08', 'C1.08', 'Puntos Clave Fijos (↗ Sin Guía)', '⚡ Calistenia: D1 (↗ Abajo-Arriba / Izq-Der)', 'bottom_up_left_right', 'fixed', 'points_only', 'Media', 'Se retira la línea gris: haz ghosting en el aire y conecta ① con ②.', 'Conecta el punto ① con el ② con un trazo limpio y decidido.', undefined, 60),
  buildSingleStrokeLevel('d1_09', 'C1.09', 'Puntos Clave — Longitud (↗)', '⚡ Calistenia: D1 (↗ Abajo-Arriba / Izq-Der)', 'bottom_up_left_right', 'length', 'points_only', 'Media', 'Solo puntos con distancia variable entre ellos.', 'Calcula la frenada exacta en el punto ②.', undefined, 60),
  buildSingleStrokeLevel('d1_10', 'C1.10', 'Puntos Clave — Rotación (↗)', '⚡ Calistenia: D1 (↗ Abajo-Arriba / Izq-Der)', 'bottom_up_left_right', 'rotation', 'points_only', 'Media', 'Solo puntos con ángulo cambiante dentro del cuadrante.', 'Alinea la trayectoria mentalmente entre ① y ②.', undefined, 60),
  buildSingleStrokeLevel('d1_11', 'C1.11', 'Puntos Clave — Rotación & Longitud (↗)', '⚡ Calistenia: D1 (↗ Abajo-Arriba / Izq-Der)', 'bottom_up_left_right', 'rotation_length', 'points_only', 'Difícil', 'Distancia y ángulo impredecibles sin ninguna línea intermedia.', 'Proyecta el vector visual antes de posar el lápiz.', undefined, 60),
  buildSingleStrokeLevel('d1_12', 'C1.12', 'Puntos Clave — Posición (↗)', '⚡ Calistenia: D1 (↗ Abajo-Arriba / Izq-Der)', 'bottom_up_left_right', 'position', 'points_only', 'Difícil', 'Puntos diana desplazados aleatoriamente por la pantalla.', 'Fija la vista en el objetivo ② mientras inicias en ①.', undefined, 60),
  buildSingleStrokeLevel('d1_13', 'C1.13', 'Puntos Clave — Posición & Longitud (↗)', '⚡ Calistenia: D1 (↗ Abajo-Arriba / Izq-Der)', 'bottom_up_left_right', 'position_length', 'points_only', 'Difícil', 'Solo puntos con salto de posición y escala variable.', 'Acomoda el codo como pivote en cada nuevo punto.', undefined, 60),
  buildSingleStrokeLevel('d1_14', 'C1.14', 'Puntos Clave — Variación Total (↗)', '⚡ Calistenia: D1 (↗ Abajo-Arriba / Izq-Der)', 'bottom_up_left_right', 'total_random', 'points_only', 'Difícil', 'Desafío ciego completo: ángulo, posición y longitud aleatorios.', 'Conecta los dos puntos con precisión milimétrica.', undefined, 60),
  buildSingleStrokeLevel('d1_15', 'C1.15', 'Maestría D1 — Racha Rápida (↗)', '⚡ Calistenia: D1 (↗ Abajo-Arriba / Izq-Der)', 'bottom_up_left_right', 'total_random', 'points_only', 'Experto', 'Evaluación continua instantánea: mantén una racha de más de 80% de precisión.', 'Traza rápido y sin dudar para sostener la racha de fuego.', undefined, 60),
  buildSingleStrokeLevel('d1_16', 'C1.16', '2 Líneas Dispersas (↗)', '⚡ Calistenia: D1 (↗ Abajo-Arriba / Izq-Der)', 'bottom_up_left_right', 'multi_line', 'points_only', 'Difícil', 'Dos líneas en posiciones separadas con longitudes y ángulos distintos. Calibra el salto de dianas sin perder la orientación ↗.', 'Traza las 2 líneas en cualquier orden: de ① a ② y de ③ a ④.', undefined, 60, 2),
  buildSingleStrokeLevel('d1_17', 'C1.17', '3 Líneas Dispersas (↗)', '⚡ Calistenia: D1 (↗ Abajo-Arriba / Izq-Der)', 'bottom_up_left_right', 'multi_line', 'points_only', 'Experto', 'Tres líneas distribuidas por el lienzo con distintas ubicaciones, escalas e inclinaciones.', 'Traza las 3 líneas en cualquier orden: de ① a ②, de ③ a ④ y de ⑤ a ⑥.', undefined, 60, 3),

  // DIRECCIÓN 2: Arriba a Abajo, Derecha a Izquierda (↙)
  buildSingleStrokeLevel('d2_01', 'C2.01', 'Línea Fija (↙ Guía Gris)', '⚡ Calistenia: D2 (↙ Arriba-Abajo / Der-Izq)', 'top_down_right_left', 'fixed', 'gray_line', 'Fácil', 'Flexión controlada hacia el cuerpo. Posición central fija.', 'Traza desde ① arriba-derecha hacia ② abajo-izquierda.', undefined, 240),
  buildSingleStrokeLevel('d2_02', 'C2.02', 'Longitud Variable (↙ Guía Gris)', '⚡ Calistenia: D2 (↙ Arriba-Abajo / Der-Izq)', 'top_down_right_left', 'length', 'gray_line', 'Fácil', 'Mismo ángulo pero longitud variable en cada tirada.', 'Adapta la recogida del brazo a la distancia requerida.', undefined, 240),
  buildSingleStrokeLevel('d2_03', 'C2.03', 'Rotación Variable (↙ Guía Gris)', '⚡ Calistenia: D2 (↙ Arriba-Abajo / Der-Izq)', 'top_down_right_left', 'rotation', 'gray_line', 'Fácil', 'Ángulo variable en el cuadrante de recogida hacia el pecho (215° a 255°).', 'Orienta el trazo hacia tu cuerpo con naturalidad.', undefined, 240),
  buildSingleStrokeLevel('d2_04', 'C2.04', 'Rotación & Longitud (↙ Guía Gris)', '⚡ Calistenia: D2 (↙ Arriba-Abajo / Der-Izq)', 'top_down_right_left', 'rotation_length', 'gray_line', 'Media', 'Inclinación y recorrido variables.', 'Tira de la línea suavemente con la muñeca.', undefined, 240),
  buildSingleStrokeLevel('d2_05', 'C2.05', 'Posición Variable (↙ Guía Gris)', '⚡ Calistenia: D2 (↙ Arriba-Abajo / Der-Izq)', 'top_down_right_left', 'position', 'gray_line', 'Media', 'Desplazamiento por el lienzo manteniendo vector fijo.', 'Ubica la diana ① y tira hacia ②.', undefined, 240),
  buildSingleStrokeLevel('d2_06', 'C2.06', 'Posición & Longitud (↙ Guía Gris)', '⚡ Calistenia: D2 (↙ Arriba-Abajo / Der-Izq)', 'top_down_right_left', 'position_length', 'gray_line', 'Media', 'Cambio simultáneo de zona y longitud.', 'Controla el frenado final sin pasar de largo.', undefined, 240),
  buildSingleStrokeLevel('d2_07', 'C2.07', 'Variación Total (↙ Guía Gris)', '⚡ Calistenia: D2 (↙ Arriba-Abajo / Der-Izq)', 'top_down_right_left', 'total_random', 'gray_line', 'Media', 'Aleatoriedad total sobre guía gris.', 'Consistencia biomecánica en cualquier sector de la pantalla.', undefined, 240),
  buildSingleStrokeLevel('d2_08', 'C2.08', 'Puntos Clave Fijos (↙ Sin Guía)', '⚡ Calistenia: D2 (↙ Arriba-Abajo / Der-Izq)', 'top_down_right_left', 'fixed', 'points_only', 'Media', 'Se retira la guía continua: conecta mentalmente ① con ② hacia abajo-izquierda.', 'Conecta los puntos con una trayectoria recta e ininterrumpida.', undefined, 240),
  buildSingleStrokeLevel('d2_09', 'C2.09', 'Puntos Clave — Longitud (↙)', '⚡ Calistenia: D2 (↙ Arriba-Abajo / Der-Izq)', 'top_down_right_left', 'length', 'points_only', 'Media', 'Distancia variable entre los dos puntos sin línea guía.', 'Ajusta la velocidad del trazo para frenar en la diana ②.', undefined, 240),
  buildSingleStrokeLevel('d2_10', 'C2.10', 'Puntos Clave — Rotación (↙)', '⚡ Calistenia: D2 (↙ Arriba-Abajo / Der-Izq)', 'top_down_right_left', 'rotation', 'points_only', 'Media', 'Inclinación variable entre ① y ②.', 'Proyecta mentalmente la recta antes de posar el puntero.', undefined, 240),
  buildSingleStrokeLevel('d2_11', 'C2.11', 'Puntos Clave — Rotación & Longitud (↙)', '⚡ Calistenia: D2 (↙ Arriba-Abajo / Der-Izq)', 'top_down_right_left', 'rotation_length', 'points_only', 'Difícil', 'Ángulo y longitud variables en puntos ciegos.', 'Confía en la memoria muscular de recogida.', undefined, 240),
  buildSingleStrokeLevel('d2_12', 'C2.12', 'Puntos Clave — Posición (↙)', '⚡ Calistenia: D2 (↙ Arriba-Abajo / Der-Izq)', 'top_down_right_left', 'position', 'points_only', 'Difícil', 'Puntos flotando en distintas esquinas de la pantalla.', 'No pierdas de vista la diana ② al trazar.', undefined, 240),
  buildSingleStrokeLevel('d2_13', 'C2.13', 'Puntos Clave — Posición & Longitud (↙)', '⚡ Calistenia: D2 (↙ Arriba-Abajo / Der-Izq)', 'top_down_right_left', 'position_length', 'points_only', 'Difícil', 'Salto continuo de escala y posición.', 'Sincroniza la postura antes de cada línea.', undefined, 240),
  buildSingleStrokeLevel('d2_14', 'C2.14', 'Puntos Clave — Variación Total (↙)', '⚡ Calistenia: D2 (↙ Arriba-Abajo / Der-Izq)', 'top_down_right_left', 'total_random', 'points_only', 'Difícil', 'Reto dinámico completo de recogida hacia el cuerpo.', 'Precisión absoluta en diana de entrada y salida.', undefined, 240),
  buildSingleStrokeLevel('d2_15', 'C2.15', 'Maestría D2 — Racha Rápida (↙)', '⚡ Calistenia: D2 (↙ Arriba-Abajo / Der-Izq)', 'top_down_right_left', 'total_random', 'points_only', 'Experto', 'Modo infinito rápido: acumula la mayor racha de aciertos en D2.', 'Traza sin vacilar al primer contacto.', undefined, 240),
  buildSingleStrokeLevel('d2_16', 'C2.16', '2 Líneas Dispersas (↙)', '⚡ Calistenia: D2 (↙ Arriba-Abajo / Der-Izq)', 'top_down_right_left', 'multi_line', 'points_only', 'Difícil', 'Dos líneas de flexión hacia el cuerpo en sectores distintos con longitudes e inclinaciones independientes.', 'Traza las 2 líneas en cualquier orden: de ① a ② y de ③ a ④.', undefined, 240, 2),
  buildSingleStrokeLevel('d2_17', 'C2.17', '3 Líneas Dispersas (↙)', '⚡ Calistenia: D2 (↙ Arriba-Abajo / Der-Izq)', 'top_down_right_left', 'multi_line', 'points_only', 'Experto', 'Tres líneas en flexión hacia el pecho en ubicaciones separadas con rotaciones y escalas variadas.', 'Traza las 3 líneas en cualquier orden: de ① a ②, de ③ a ④ y de ⑤ a ⑥.', undefined, 240, 3),

  // DIRECCIÓN 3: Arriba a Abajo, Izquierda a Derecha (↘)
  buildSingleStrokeLevel('d3_01', 'C3.01', 'Línea Fija (↘ Guía Gris)', '⚡ Calistenia: D3 (↘ Arriba-Abajo / Izq-Der)', 'top_down_left_right', 'fixed', 'gray_line', 'Fácil', 'Trazo descendente diagonal hacia afuera. Posición central.', 'Traza desde ① arriba-izquierda hacia ② abajo-derecha.', undefined, 315),
  buildSingleStrokeLevel('d3_02', 'C3.02', 'Longitud Variable (↘ Guía Gris)', '⚡ Calistenia: D3 (↘ Arriba-Abajo / Izq-Der)', 'top_down_left_right', 'length', 'gray_line', 'Fácil', 'Recorrido cambiante sobre guía gris.', 'Modula el desplazamiento descendente.', undefined, 315),
  buildSingleStrokeLevel('d3_03', 'C3.03', 'Rotación Variable (↘ Guía Gris)', '⚡ Calistenia: D3 (↘ Arriba-Abajo / Izq-Der)', 'top_down_left_right', 'rotation', 'gray_line', 'Fácil', 'Rotación dentro del sector (305° a 345°).', 'Gira suavemente la muñeca para acompañar el ángulo.', undefined, 315),
  buildSingleStrokeLevel('d3_04', 'C3.04', 'Rotación & Longitud (↘ Guía Gris)', '⚡ Calistenia: D3 (↘ Arriba-Abajo / Izq-Der)', 'top_down_left_right', 'rotation_length', 'gray_line', 'Media', 'Inclinación y distancia combinadas.', 'Mantén una presión uniforme durante el barrido.', undefined, 315),
  buildSingleStrokeLevel('d3_05', 'C3.05', 'Posición Variable (↘ Guía Gris)', '⚡ Calistenia: D3 (↘ Arriba-Abajo / Izq-Der)', 'top_down_left_right', 'position', 'gray_line', 'Media', 'Desplazamiento por el espacio de trabajo.', 'Asegura el apoyo del canto de la mano.', undefined, 315),
  buildSingleStrokeLevel('d3_06', 'C3.06', 'Posición & Longitud (↘ Guía Gris)', '⚡ Calistenia: D3 (↘ Arriba-Abajo / Izq-Der)', 'top_down_left_right', 'position_length', 'gray_line', 'Media', 'Líneas cortas y largas en distintos cuadrantes.', 'Frena con nitidez en el extremo ②.', undefined, 315),
  buildSingleStrokeLevel('d3_07', 'C3.07', 'Variación Total (↘ Guía Gris)', '⚡ Calistenia: D3 (↘ Arriba-Abajo / Izq-Der)', 'top_down_left_right', 'total_random', 'gray_line', 'Media', 'Variación completa con guía gris visible.', 'Máxima fluidez en diagonal descendente.', undefined, 315),
  buildSingleStrokeLevel('d3_08', 'C3.08', 'Puntos Clave Fijos (↘ Sin Guía)', '⚡ Calistenia: D3 (↘ Arriba-Abajo / Izq-Der)', 'top_down_left_right', 'fixed', 'points_only', 'Media', 'Sin línea guía continua: conecta los puntos ① y ② en diagonal.', 'Conecta ambas dianas con un movimiento resuelto.', undefined, 315),
  buildSingleStrokeLevel('d3_09', 'C3.09', 'Puntos Clave — Longitud (↘)', '⚡ Calistenia: D3 (↘ Arriba-Abajo / Izq-Der)', 'top_down_left_right', 'length', 'points_only', 'Media', 'Solo puntos con separación aleatoria.', 'Controla la inercia del movimiento.', undefined, 315),
  buildSingleStrokeLevel('d3_10', 'C3.10', 'Puntos Clave — Rotación (↘)', '⚡ Calistenia: D3 (↘ Arriba-Abajo / Izq-Der)', 'top_down_left_right', 'rotation', 'points_only', 'Media', 'Solo puntos con rotación de eje.', 'Calcula la pendiente antes de disparar el trazo.', undefined, 315),
  buildSingleStrokeLevel('d3_11', 'C3.11', 'Puntos Clave — Rotación & Longitud (↘)', '⚡ Calistenia: D3 (↘ Arriba-Abajo / Izq-Der)', 'top_down_left_right', 'rotation_length', 'points_only', 'Difícil', 'Distancia y ángulo impredecibles.', 'Sincroniza vista y mano en la trayectoria.', undefined, 315),
  buildSingleStrokeLevel('d3_12', 'C3.12', 'Puntos Clave — Posición (↘)', '⚡ Calistenia: D3 (↘ Arriba-Abajo / Izq-Der)', 'top_down_left_right', 'position', 'points_only', 'Difícil', 'Dianas distribuidas por la pantalla.', 'Focaliza la puntería en el objetivo final.', undefined, 315),
  buildSingleStrokeLevel('d3_13', 'C3.13', 'Puntos Clave — Posición & Longitud (↘)', '⚡ Calistenia: D3 (↘ Arriba-Abajo / Izq-Der)', 'top_down_left_right', 'position_length', 'points_only', 'Difícil', 'Desplazamiento y escala libre.', 'No titubees a mitad del recorrido.', undefined, 315),
  buildSingleStrokeLevel('d3_14', 'C3.14', 'Puntos Clave — Variación Total (↘)', '⚡ Calistenia: D3 (↘ Arriba-Abajo / Izq-Der)', 'top_down_left_right', 'total_random', 'points_only', 'Difícil', 'Reto ciego de precisión en diagonal descendente.', 'Clava ambos extremos con precisión.', undefined, 315),
  buildSingleStrokeLevel('d3_15', 'C3.15', 'Maestría D3 — Racha Rápida (↘)', '⚡ Calistenia: D3 (↘ Arriba-Abajo / Izq-Der)', 'top_down_left_right', 'total_random', 'points_only', 'Experto', 'Racha continua de alta velocidad en D3.', 'Mantén el fuego activo sin fallar ninguna diana.', undefined, 315),
  buildSingleStrokeLevel('d3_16', 'C3.16', '2 Líneas Dispersas (↘)', '⚡ Calistenia: D3 (↘ Arriba-Abajo / Izq-Der)', 'top_down_left_right', 'multi_line', 'points_only', 'Difícil', 'Dos líneas en diagonal descendente hacia afuera en posiciones distintas con longitud y pendiente cambiantes.', 'Traza las 2 líneas en cualquier orden: de ① a ② y de ③ a ④.', undefined, 315, 2),
  buildSingleStrokeLevel('d3_17', 'C3.17', '3 Líneas Dispersas (↘)', '⚡ Calistenia: D3 (↘ Arriba-Abajo / Izq-Der)', 'top_down_left_right', 'multi_line', 'points_only', 'Experto', 'Tres líneas descendentes en cuadrantes distintos con diferentes escalas y grados de inclinación.', 'Traza las 3 líneas en cualquier orden: de ① a ②, de ③ a ④ y de ⑤ a ⑥.', undefined, 315, 3),

  // DIRECCIÓN 4: Abajo a Arriba, Derecha a Izquierda (↖)
  buildSingleStrokeLevel('d4_01', 'C4.01', 'Línea Fija (↖ Guía Gris)', '⚡ Calistenia: D4 (↖ Abajo-Arriba / Der-Izq)', 'bottom_up_right_left', 'fixed', 'gray_line', 'Fácil', 'Empuje ascendente hacia la izquierda. Posición central.', 'Traza desde ① abajo-derecha hacia ② arriba-izquierda.', undefined, 135),
  buildSingleStrokeLevel('d4_02', 'C4.02', 'Longitud Variable (↖ Guía Gris)', '⚡ Calistenia: D4 (↖ Abajo-Arriba / Der-Izq)', 'bottom_up_right_left', 'length', 'gray_line', 'Fácil', 'Misma orientación pero longitud variable.', 'Empuja con el codo para alcanzar la longitud.', undefined, 135),
  buildSingleStrokeLevel('d4_03', 'C4.03', 'Rotación Variable (↖ Guía Gris)', '⚡ Calistenia: D4 (↖ Abajo-Arriba / Der-Izq)', 'bottom_up_right_left', 'rotation', 'gray_line', 'Fácil', 'Ángulo cambiante en el cuadrante (125° a 165°).', 'Acomoda el hombro como pivote auxiliar.', undefined, 135),
  buildSingleStrokeLevel('d4_04', 'C4.04', 'Rotación & Longitud (↖ Guía Gris)', '⚡ Calistenia: D4 (↖ Abajo-Arriba / Der-Izq)', 'bottom_up_right_left', 'rotation_length', 'gray_line', 'Media', 'Inclinación y alcance variables.', 'Evita arquear el trazo por tensión.', undefined, 135),
  buildSingleStrokeLevel('d4_05', 'C4.05', 'Posición Variable (↖ Guía Gris)', '⚡ Calistenia: D4 (↖ Abajo-Arriba / Der-Izq)', 'bottom_up_right_left', 'position', 'gray_line', 'Media', 'Salto por el lienzo con vector constante.', 'Traza sin doblar la muñeca.', undefined, 135),
  buildSingleStrokeLevel('d4_06', 'C4.06', 'Posición & Longitud (↖ Guía Gris)', '⚡ Calistenia: D4 (↖ Abajo-Arriba / Der-Izq)', 'bottom_up_right_left', 'position_length', 'gray_line', 'Media', 'Cambio combinado de sitio y tamaño.', 'Frenado seco en la punta ②.', undefined, 135),
  buildSingleStrokeLevel('d4_07', 'C4.07', 'Variación Total (↖ Guía Gris)', '⚡ Calistenia: D4 (↖ Abajo-Arriba / Der-Izq)', 'bottom_up_right_left', 'total_random', 'gray_line', 'Media', 'Aleatoriedad total en la cuarta dirección.', 'Dominio completo del cuarto cuadrante motor.', undefined, 135),
  buildSingleStrokeLevel('d4_08', 'C4.08', 'Puntos Clave Fijos (↖ Sin Guía)', '⚡ Calistenia: D4 (↖ Abajo-Arriba / Der-Izq)', 'bottom_up_right_left', 'fixed', 'points_only', 'Media', 'Sin guía continua: conecta los puntos ① y ② en empuje diagonal.', 'Lanza la línea desde ① y frena en seco sobre ②.', undefined, 135),
  buildSingleStrokeLevel('d4_09', 'C4.09', 'Puntos Clave — Longitud (↖)', '⚡ Calistenia: D4 (↖ Abajo-Arriba / Der-Izq)', 'bottom_up_right_left', 'length', 'points_only', 'Media', 'Solo puntos con separación aleatoria.', 'Calibra la fuerza del impulso según la distancia.', undefined, 135),
  buildSingleStrokeLevel('d4_10', 'C4.10', 'Puntos Clave — Rotación (↖)', '⚡ Calistenia: D4 (↖ Abajo-Arriba / Der-Izq)', 'bottom_up_right_left', 'rotation', 'points_only', 'Media', 'Pendiente variable entre los puntos.', 'Apunta con la mirada al punto de llegada.', undefined, 135),
  buildSingleStrokeLevel('d4_11', 'C4.11', 'Puntos Clave — Rotación & Longitud (↖)', '⚡ Calistenia: D4 (↖ Abajo-Arriba / Der-Izq)', 'bottom_up_right_left', 'rotation_length', 'points_only', 'Difícil', 'Ángulo y distancia variables.', 'Trazo rápido y firme sin temblor.', undefined, 135),
  buildSingleStrokeLevel('d4_12', 'C4.12', 'Puntos Clave — Posición (↖)', '⚡ Calistenia: D4 (↖ Abajo-Arriba / Der-Izq)', 'bottom_up_right_left', 'position', 'points_only', 'Difícil', 'Puntos desplazados en los cuatro márgenes.', 'Consistencia biomecánica en cualquier punto.', undefined, 135),
  buildSingleStrokeLevel('d4_13', 'C4.13', 'Puntos Clave — Posición & Longitud (↖)', '⚡ Calistenia: D4 (↖ Abajo-Arriba / Der-Izq)', 'bottom_up_right_left', 'position_length', 'points_only', 'Difícil', 'Salto continuo de escala y posición.', 'Conserva la misma velocidad de trazo.', undefined, 135),
  buildSingleStrokeLevel('d4_14', 'C4.14', 'Puntos Clave — Variación Total (↖)', '⚡ Calistenia: D4 (↖ Abajo-Arriba / Der-Izq)', 'bottom_up_right_left', 'total_random', 'points_only', 'Difícil', 'Reto ciego completo en la dirección 4.', 'Máxima precisión sin apoyos visuales.', undefined, 135),
  buildSingleStrokeLevel('d4_15', 'C4.15', 'Maestría D4 — Racha Rápida (↖)', '⚡ Calistenia: D4 (↖ Abajo-Arriba / Der-Izq)', 'bottom_up_right_left', 'total_random', 'points_only', 'Experto', 'Racha de fuego continuo en la cuarta dirección motora.', 'Acumula aciertos consecutivos a alta velocidad.', undefined, 135),
  buildSingleStrokeLevel('d4_16', 'C4.16', '2 Líneas Dispersas (↖)', '⚡ Calistenia: D4 (↖ Abajo-Arriba / Der-Izq)', 'bottom_up_right_left', 'multi_line', 'points_only', 'Difícil', 'Dos líneas en empuje diagonal ascendente hacia la izquierda con saltos de posición y escala.', 'Traza las 2 líneas en cualquier orden: de ① a ② y de ③ a ④.', undefined, 135, 2),
  buildSingleStrokeLevel('d4_17', 'C4.17', '3 Líneas Dispersas (↖)', '⚡ Calistenia: D4 (↖ Abajo-Arriba / Der-Izq)', 'bottom_up_right_left', 'multi_line', 'points_only', 'Experto', 'Tres líneas en empuje ↖ distribuidas por la pantalla con diferentes distancias e inclinaciones.', 'Traza las 3 líneas en cualquier orden: de ① a ②, de ③ a ④ y de ⑤ a ⑥.', undefined, 135, 3),

  // DIRECCIÓN 5: Horizontales de Izquierda a Derecha (→)
  buildSingleStrokeLevel('d5_01', 'C5.01', 'Línea Fija (→ Guía Gris)', '⚡ Calistenia: D5 (→ Horizontal / Izq-Der)', 'horizontal_left_right', 'fixed', 'gray_line', 'Fácil', 'Línea horizontal recta de izquierda a derecha. Posición central.', 'Traza desde ① a la izquierda hacia ② a la derecha siguiendo la línea gris.', undefined, 0),
  buildSingleStrokeLevel('d5_02', 'C5.02', 'Longitud Variable (→ Guía Gris)', '⚡ Calistenia: D5 (→ Horizontal / Izq-Der)', 'horizontal_left_right', 'length', 'gray_line', 'Fácil', 'Mismo vector horizontal pero longitud variable en cada tirada.', 'Adapta el barrido horizontal de la muñeca y el antebrazo.', undefined, 0),
  buildSingleStrokeLevel('d5_03', 'C5.03', 'Posición Variable (→ Guía Gris)', '⚡ Calistenia: D5 (→ Horizontal / Izq-Der)', 'horizontal_left_right', 'position', 'gray_line', 'Media', 'Desplazamiento horizontal por distintas alturas de la pantalla.', 'Fija la postura y apoya el canto de la mano a diferentes alturas.', undefined, 0),
  buildSingleStrokeLevel('d5_04', 'C5.04', 'Posición & Longitud (→ Guía Gris)', '⚡ Calistenia: D5 (→ Horizontal / Izq-Der)', 'horizontal_left_right', 'position_length', 'gray_line', 'Media', 'Cambio simultáneo de altura, posición y longitud.', 'Controla la frenada exacta en el objetivo ②.', undefined, 0),
  buildSingleStrokeLevel('d5_05', 'C5.05', 'Variación Total (→ Guía Gris)', '⚡ Calistenia: D5 (→ Horizontal / Izq-Der)', 'horizontal_left_right', 'total_random', 'gray_line', 'Media', 'Posición y longitud variables sobre guía gris continua.', 'Control motor pleno en trazo horizontal de izquierda a derecha.', undefined, 0),
  buildSingleStrokeLevel('d5_06', 'C5.06', 'Puntos Clave Fijos (→ Sin Guía)', '⚡ Calistenia: D5 (→ Horizontal / Izq-Der)', 'horizontal_left_right', 'fixed', 'points_only', 'Media', 'Se retira la guía gris: conecta mentalmente ① con ② hacia la derecha.', 'Conecta los puntos con un trazo recto horizontal sin temblor.', undefined, 0),
  buildSingleStrokeLevel('d5_07', 'C5.07', 'Puntos Clave — Longitud (→)', '⚡ Calistenia: D5 (→ Horizontal / Izq-Der)', 'horizontal_left_right', 'length', 'points_only', 'Media', 'Distancia variable entre los dos puntos sin línea guía.', 'Ajusta la inercia del movimiento horizontal.', undefined, 0),
  buildSingleStrokeLevel('d5_08', 'C5.08', 'Puntos Clave — Posición (→)', '⚡ Calistenia: D5 (→ Horizontal / Izq-Der)', 'horizontal_left_right', 'position', 'points_only', 'Difícil', 'Puntos flotando en distintas alturas y sectores de la pantalla.', 'Enfoca la diana final ② al iniciar el barrido horizontal.', undefined, 0),
  buildSingleStrokeLevel('d5_09', 'C5.09', 'Puntos Clave — Posición & Longitud (→)', '⚡ Calistenia: D5 (→ Horizontal / Izq-Der)', 'horizontal_left_right', 'position_length', 'points_only', 'Difícil', 'Salto continuo de posición y longitud.', 'Adapta el pivote de antebrazo a cada nueva posición.', undefined, 0),
  buildSingleStrokeLevel('d5_10', 'C5.10', 'Puntos Clave — Variación Total (→)', '⚡ Calistenia: D5 (→ Horizontal / Izq-Der)', 'horizontal_left_right', 'total_random', 'points_only', 'Difícil', 'Reto dinámico completo horizontal sin guía visual.', 'Precisión milimétrica conectando de izquierda a derecha.', undefined, 0),
  buildSingleStrokeLevel('d5_11', 'C5.11', 'Maestría D5 — Racha Rápida (→)', '⚡ Calistenia: D5 (→ Horizontal / Izq-Der)', 'horizontal_left_right', 'total_random', 'points_only', 'Experto', 'Modo continuo rápido: acumula la mayor racha de aciertos en trazos horizontales (→).', 'Traza rápido y sin dudar para mantener la racha activa.', undefined, 0),
  buildSingleStrokeLevel('d5_12', 'C5.12', '2 Líneas Dispersas (→)', '⚡ Calistenia: D5 (→ Horizontal / Izq-Der)', 'horizontal_left_right', 'multi_line', 'points_only', 'Difícil', 'Dos líneas horizontales en sectores distintos con longitudes independientes.', 'Traza las 2 líneas en cualquier orden: de ① a ② y de ③ a ④.', undefined, 0, 2),
  buildSingleStrokeLevel('d5_13', 'C5.13', '3 Líneas Dispersas (→)', '⚡ Calistenia: D5 (→ Horizontal / Izq-Der)', 'horizontal_left_right', 'multi_line', 'points_only', 'Experto', 'Tres líneas horizontales distribuidas por el lienzo con diferentes posiciones y escalas.', 'Traza las 3 líneas en cualquier orden: de ① a ②, de ③ a ④ y de ⑤ a ⑥.', undefined, 0, 3),

  // DIRECCIÓN 6: Horizontales de Derecha a Izquierda (←)
  buildSingleStrokeLevel('d6_01', 'C6.01', 'Línea Fija (← Guía Gris)', '⚡ Calistenia: D6 (← Horizontal / Der-Izq)', 'horizontal_right_left', 'fixed', 'gray_line', 'Fácil', 'Línea horizontal inversa de derecha a izquierda. Posición central.', 'Traza desde ① a la derecha hacia ② a la izquierda siguiendo la guía gris.', undefined, 0),
  buildSingleStrokeLevel('d6_02', 'C6.02', 'Longitud Variable (← Guía Gris)', '⚡ Calistenia: D6 (← Horizontal / Der-Izq)', 'horizontal_right_left', 'length', 'gray_line', 'Fácil', 'Recorrido cambiante de derecha a izquierda con longitud variable.', 'Modula la recogida horizontal hacia la izquierda.', undefined, 0),
  buildSingleStrokeLevel('d6_03', 'C6.03', 'Posición Variable (← Guía Gris)', '⚡ Calistenia: D6 (← Horizontal / Der-Izq)', 'horizontal_right_left', 'position', 'gray_line', 'Media', 'Línea horizontal inversa ubicada en distintas alturas del lienzo.', 'Apoya el canto y sitúa el inicio en el punto ①.', undefined, 0),
  buildSingleStrokeLevel('d6_04', 'C6.04', 'Posición & Longitud (← Guía Gris)', '⚡ Calistenia: D6 (← Horizontal / Der-Izq)', 'horizontal_right_left', 'position_length', 'gray_line', 'Media', 'Posición y longitud variables simultáneamente.', 'Frena con precisión sobre el punto ② a la izquierda.', undefined, 0),
  buildSingleStrokeLevel('d6_05', 'C6.05', 'Variación Total (← Guía Gris)', '⚡ Calistenia: D6 (← Horizontal / Der-Izq)', 'horizontal_right_left', 'total_random', 'gray_line', 'Media', 'Posición y longitud variables sobre guía gris de derecha a izquierda.', 'Máxima regularidad en el recorrido horizontal inverso.', undefined, 0),
  buildSingleStrokeLevel('d6_06', 'C6.06', 'Puntos Clave Fijos (← Sin Guía)', '⚡ Calistenia: D6 (← Horizontal / Der-Izq)', 'horizontal_right_left', 'fixed', 'points_only', 'Media', 'Sin línea continua: conecta ① y ② de derecha a izquierda.', 'Lanza la línea desde ① y frena en seco sobre ②.', undefined, 0),
  buildSingleStrokeLevel('d6_07', 'C6.07', 'Puntos Clave — Longitud (←)', '⚡ Calistenia: D6 (← Horizontal / Der-Izq)', 'horizontal_right_left', 'length', 'points_only', 'Media', 'Puntos con separación aleatoria sin guía.', 'Calcula la fuerza de recogida según la distancia.', undefined, 0),
  buildSingleStrokeLevel('d6_08', 'C6.08', 'Puntos Clave — Posición (←)', '⚡ Calistenia: D6 (← Horizontal / Der-Izq)', 'horizontal_right_left', 'position', 'points_only', 'Difícil', 'Dianas distribuidas por la pantalla para trazo inverso.', 'Focaliza la puntería en el objetivo ② a la izquierda.', undefined, 0),
  buildSingleStrokeLevel('d6_09', 'C6.09', 'Puntos Clave — Posición & Longitud (←)', '⚡ Calistenia: D6 (← Horizontal / Der-Izq)', 'horizontal_right_left', 'position_length', 'points_only', 'Difícil', 'Desplazamiento y escala libres en sentido inverso.', 'Trazo decidido y limpio sin vacilaciones intermedias.', undefined, 0),
  buildSingleStrokeLevel('d6_10', 'C6.10', 'Puntos Clave — Variación Total (←)', '⚡ Calistenia: D6 (← Horizontal / Der-Izq)', 'horizontal_right_left', 'total_random', 'points_only', 'Difícil', 'Reto ciego de precisión horizontal inversa.', 'Clava ambos extremos con exactitud.', undefined, 0),
  buildSingleStrokeLevel('d6_11', 'C6.11', 'Maestría D6 — Racha Rápida (←)', '⚡ Calistenia: D6 (← Horizontal / Der-Izq)', 'horizontal_right_left', 'total_random', 'points_only', 'Experto', 'Racha rápida de alta velocidad en D6.', 'Mantén la racha activa conectando de derecha a izquierda.', undefined, 0),
  buildSingleStrokeLevel('d6_12', 'C6.12', '2 Líneas Dispersas (←)', '⚡ Calistenia: D6 (← Horizontal / Der-Izq)', 'horizontal_right_left', 'multi_line', 'points_only', 'Difícil', 'Dos líneas horizontales de derecha a izquierda en zonas separadas.', 'Traza las 2 líneas en cualquier orden: de ① a ② y de ③ a ④.', undefined, 0, 2),
  buildSingleStrokeLevel('d6_13', 'C6.13', '3 Líneas Dispersas (←)', '⚡ Calistenia: D6 (← Horizontal / Der-Izq)', 'horizontal_right_left', 'multi_line', 'points_only', 'Experto', 'Tres líneas horizontales de derecha a izquierda con ubicaciones distintas.', 'Traza las 3 líneas en cualquier orden: de ① a ②, de ③ a ④ y de ⑤ a ⑥.', undefined, 0, 3),

  // DIRECCIÓN 7: Verticales de Abajo a Arriba (↑)
  buildSingleStrokeLevel('d7_01', 'C7.01', 'Línea Fija (↑ Guía Gris)', '⚡ Calistenia: D7 (↑ Vertical / Abajo-Arriba)', 'vertical_bottom_up', 'fixed', 'gray_line', 'Fácil', 'Línea vertical recta ascendente de abajo hacia arriba. Posición central.', 'Traza desde ① abajo hacia ② arriba siguiendo la línea gris vertical.', undefined, 90),
  buildSingleStrokeLevel('d7_02', 'C7.02', 'Longitud Variable (↑ Guía Gris)', '⚡ Calistenia: D7 (↑ Vertical / Abajo-Arriba)', 'vertical_bottom_up', 'length', 'gray_line', 'Fácil', 'Mismo eje vertical con longitud variable en cada tirada.', 'Extiende el brazo verticalmente hacia arriba según la longitud.', undefined, 90),
  buildSingleStrokeLevel('d7_03', 'C7.03', 'Posición Variable (↑ Guía Gris)', '⚡ Calistenia: D7 (↑ Vertical / Abajo-Arriba)', 'vertical_bottom_up', 'position', 'gray_line', 'Media', 'Línea vertical desplazada a distintos anchos de la pantalla.', 'Ubica la diana ① y asciende hacia ② con decisión.', undefined, 90),
  buildSingleStrokeLevel('d7_04', 'C7.04', 'Posición & Longitud (↑ Guía Gris)', '⚡ Calistenia: D7 (↑ Vertical / Abajo-Arriba)', 'vertical_bottom_up', 'position_length', 'gray_line', 'Media', 'Cambio simultáneo de posición horizontal y longitud vertical.', 'Controla el frenado en la parte superior sin pasarte.', undefined, 90),
  buildSingleStrokeLevel('d7_05', 'C7.05', 'Variación Total (↑ Guía Gris)', '⚡ Calistenia: D7 (↑ Vertical / Abajo-Arriba)', 'vertical_bottom_up', 'total_random', 'gray_line', 'Media', 'Posición y longitud variables sobre guía gris vertical ascendente.', 'Fluidez y verticalidad perfecta en cualquier parte del lienzo.', undefined, 90),
  buildSingleStrokeLevel('d7_06', 'C7.06', 'Puntos Clave Fijos (↑ Sin Guía)', '⚡ Calistenia: D7 (↑ Vertical / Abajo-Arriba)', 'vertical_bottom_up', 'fixed', 'points_only', 'Media', 'Se retira la guía continua: conecta ① abajo con ② arriba.', 'Conecta los puntos con un trazo vertical recto y firme.', undefined, 90),
  buildSingleStrokeLevel('d7_07', 'C7.07', 'Puntos Clave — Longitud (↑)', '⚡ Calistenia: D7 (↑ Vertical / Abajo-Arriba)', 'vertical_bottom_up', 'length', 'points_only', 'Media', 'Separación vertical variable entre puntos sin línea guía.', 'Ajusta la velocidad del impulso vertical para frenar en ②.', undefined, 90),
  buildSingleStrokeLevel('d7_08', 'C7.08', 'Puntos Clave — Posición (↑)', '⚡ Calistenia: D7 (↑ Vertical / Abajo-Arriba)', 'vertical_bottom_up', 'position', 'points_only', 'Difícil', 'Puntos verticales en distintas columnas del lienzo.', 'Conserva el movimiento de empuje vertical en cualquier zona.', undefined, 90),
  buildSingleStrokeLevel('d7_09', 'C7.09', 'Puntos Clave — Posición & Longitud (↑)', '⚡ Calistenia: D7 (↑ Vertical / Abajo-Arriba)', 'vertical_bottom_up', 'position_length', 'points_only', 'Difícil', 'Salto continuo de columna y longitud vertical.', 'Acomoda el antebrazo como guía recta vertical.', undefined, 90),
  buildSingleStrokeLevel('d7_10', 'C7.10', 'Puntos Clave — Variación Total (↑)', '⚡ Calistenia: D7 (↑ Vertical / Abajo-Arriba)', 'vertical_bottom_up', 'total_random', 'points_only', 'Difícil', 'Reto dinámico completo de vertical ascendente.', 'Precisión absoluta en dianas de abajo hacia arriba.', undefined, 90),
  buildSingleStrokeLevel('d7_11', 'C7.11', 'Maestría D7 — Racha Rápida (↑)', '⚡ Calistenia: D7 (↑ Vertical / Abajo-Arriba)', 'vertical_bottom_up', 'total_random', 'points_only', 'Experto', 'Maestría D7 — Racha Rápida vertical (↑).', 'Traza con rapidez hacia arriba para sumar aciertos consecutivos.', undefined, 90),
  buildSingleStrokeLevel('d7_12', 'C7.12', '2 Líneas Dispersas (↑)', '⚡ Calistenia: D7 (↑ Vertical / Abajo-Arriba)', 'vertical_bottom_up', 'multi_line', 'points_only', 'Difícil', 'Dos líneas verticales ascendentes en distintas columnas.', 'Traza las 2 líneas en cualquier orden: de ① a ② y de ③ a ④.', undefined, 90, 2),
  buildSingleStrokeLevel('d7_13', 'C7.13', '3 Líneas Dispersas (↑)', '⚡ Calistenia: D7 (↑ Vertical / Abajo-Arriba)', 'vertical_bottom_up', 'multi_line', 'points_only', 'Experto', 'Tres líneas verticales ascendentes con diferentes alturas y escalas.', 'Traza las 3 líneas en cualquier orden: de ① a ②, de ③ a ④ y de ⑤ a ⑥.', undefined, 90, 3),

  // DIRECCIÓN 8: Verticales de Arriba a Abajo (↓)
  buildSingleStrokeLevel('d8_01', 'C8.01', 'Línea Fija (↓ Guía Gris)', '⚡ Calistenia: D8 (↓ Vertical / Arriba-Abajo)', 'vertical_top_down', 'fixed', 'gray_line', 'Fácil', 'Línea vertical recta descendente de arriba hacia abajo. Posición central.', 'Traza desde ① arriba hacia ② abajo siguiendo la guía gris vertical.', undefined, 90),
  buildSingleStrokeLevel('d8_02', 'C8.02', 'Longitud Variable (↓ Guía Gris)', '⚡ Calistenia: D8 (↓ Vertical / Arriba-Abajo)', 'vertical_top_down', 'length', 'gray_line', 'Fácil', 'Mismo vector vertical hacia abajo con longitud variable.', 'Recoge el brazo hacia tu cuerpo controlando la distancia.', undefined, 90),
  buildSingleStrokeLevel('d8_03', 'C8.03', 'Posición Variable (↓ Guía Gris)', '⚡ Calistenia: D8 (↓ Vertical / Arriba-Abajo)', 'vertical_top_down', 'position', 'gray_line', 'Media', 'Línea vertical descendente en diferentes columnas del lienzo.', 'Apoya el lápiz arriba en ① y desciende verticalmente a ②.', undefined, 90),
  buildSingleStrokeLevel('d8_04', 'C8.04', 'Posición & Longitud (↓ Guía Gris)', '⚡ Calistenia: D8 (↓ Vertical / Arriba-Abajo)', 'vertical_top_down', 'position_length', 'gray_line', 'Media', 'Columna y longitud variables simultáneamente.', 'Frena en seco en la diana inferior ②.', undefined, 90),
  buildSingleStrokeLevel('d8_05', 'C8.05', 'Variación Total (↓ Guía Gris)', '⚡ Calistenia: D8 (↓ Vertical / Arriba-Abajo)', 'vertical_top_down', 'total_random', 'gray_line', 'Media', 'Posición y longitud variables sobre guía vertical descendente.', 'Control biomecánico absoluto bajando en vertical.', undefined, 90),
  buildSingleStrokeLevel('d8_06', 'C8.06', 'Puntos Clave Fijos (↓ Sin Guía)', '⚡ Calistenia: D8 (↓ Vertical / Arriba-Abajo)', 'vertical_top_down', 'fixed', 'points_only', 'Media', 'Sin línea gris: conecta ① arriba con ② abajo.', 'Traza la vertical hacia abajo de forma limpia y directa.', undefined, 90),
  buildSingleStrokeLevel('d8_07', 'C8.07', 'Puntos Clave — Longitud (↓)', '⚡ Calistenia: D8 (↓ Vertical / Arriba-Abajo)', 'vertical_top_down', 'length', 'points_only', 'Media', 'Distancia variable entre puntos en caída vertical.', 'Calibra la frenada inferior sin deformar la trayectoria.', undefined, 90),
  buildSingleStrokeLevel('d8_08', 'C8.08', 'Puntos Clave — Posición (↓)', '⚡ Calistenia: D8 (↓ Vertical / Arriba-Abajo)', 'vertical_top_down', 'position', 'points_only', 'Difícil', 'Puntos diana en distintas alturas y márgenes.', 'No pierdas de vista la diana inferior ② durante el descenso.', undefined, 90),
  buildSingleStrokeLevel('d8_09', 'C8.09', 'Puntos Clave — Posición & Longitud (↓)', '⚡ Calistenia: D8 (↓ Vertical / Arriba-Abajo)', 'vertical_top_down', 'position_length', 'points_only', 'Difícil', 'Salto de posición y tamaño en vertical descendente.', 'Sincroniza la postura antes de cada trazo hacia abajo.', undefined, 90),
  buildSingleStrokeLevel('d8_10', 'C8.10', 'Puntos Clave — Variación Total (↓)', '⚡ Calistenia: D8 (↓ Vertical / Arriba-Abajo)', 'vertical_top_down', 'total_random', 'points_only', 'Difícil', 'Reto ciego de precisión vertical descendente.', 'Impacta ambas dianas con máxima exactitud.', undefined, 90),
  buildSingleStrokeLevel('d8_11', 'C8.11', 'Maestría D8 — Racha Rápida (↓)', '⚡ Calistenia: D8 (↓ Vertical / Arriba-Abajo)', 'vertical_top_down', 'total_random', 'points_only', 'Experto', 'Maestría D8 — Racha Rápida vertical (↓).', 'Baja el trazo con velocidad y ritmo constante.', undefined, 90),
  buildSingleStrokeLevel('d8_12', 'C8.12', '2 Líneas Dispersas (↓)', '⚡ Calistenia: D8 (↓ Vertical / Arriba-Abajo)', 'vertical_top_down', 'multi_line', 'points_only', 'Difícil', 'Dos líneas verticales descendentes en zonas separadas.', 'Traza las 2 líneas en cualquier orden: de ① a ② y de ③ a ④.', undefined, 90, 2),
  buildSingleStrokeLevel('d8_13', 'C8.13', '3 Líneas Dispersas (↓)', '⚡ Calistenia: D8 (↓ Vertical / Arriba-Abajo)', 'vertical_top_down', 'multi_line', 'points_only', 'Experto', 'Tres líneas verticales descendentes con ubicaciones y longitudes distintas.', 'Traza las 3 líneas en cualquier orden: de ① a ②, de ③ a ④ y de ⑤ a ⑥.', undefined, 90, 3),

  // DIRECCIÓN 9: Líneas a ~15°-20° (Fuga Suave) de Abajo hacia Arriba, Izquierda a Derecha (↗)
  buildSingleStrokeLevel('d9_01', 'C9.01', 'Línea Fija (↗ Fuga Suave Guía Gris)', '⚡ Calistenia: D9 (↗ Fuga Suave ~15°-20° / Izq-Der)', 'shallow_up_left_right', 'fixed', 'gray_line', 'Fácil', 'Línea de fuga suave a ~18° ascendente de izquierda a derecha. Posición central.', 'Traza desde ① abajo-izquierda hacia ② arriba-derecha siguiendo la suave pendiente de fuga.', undefined, 18),
  buildSingleStrokeLevel('d9_02', 'C9.02', 'Longitud Variable (↗ Fuga Suave Guía Gris)', '⚡ Calistenia: D9 (↗ Fuga Suave ~15°-20° / Izq-Der)', 'shallow_up_left_right', 'length', 'gray_line', 'Fácil', 'Misma pendiente suave (~18°) pero longitud cambiante.', 'Adapta el alcance a lo largo del plano de fuga.', undefined, 18),
  buildSingleStrokeLevel('d9_03', 'C9.03', 'Rotación Variable (↗ Fuga Suave Guía Gris)', '⚡ Calistenia: D9 (↗ Fuga Suave ~15°-20° / Izq-Der)', 'shallow_up_left_right', 'rotation', 'gray_line', 'Fácil', 'Inclinación variable en ángulo bajo de perspectiva (12° a 24°).', 'Ajusta el ángulo del plano de fuga hacia el horizonte.', undefined, 18),
  buildSingleStrokeLevel('d9_04', 'C9.04', 'Rotación & Longitud (↗ Fuga Suave Guía Gris)', '⚡ Calistenia: D9 (↗ Fuga Suave ~15°-20° / Izq-Der)', 'shallow_up_left_right', 'rotation_length', 'gray_line', 'Media', 'Pendiente baja y longitud variables.', 'Mantén el vector de fuga sin curvar hacia arriba.', undefined, 18),
  buildSingleStrokeLevel('d9_05', 'C9.05', 'Posición Variable (↗ Fuga Suave Guía Gris)', '⚡ Calistenia: D9 (↗ Fuga Suave ~15°-20° / Izq-Der)', 'shallow_up_left_right', 'position', 'gray_line', 'Media', 'Línea de fuga suave desplazada por distintos planos del espacio.', 'Ubica la arista del cubo y proyéctala hacia la derecha.', undefined, 18),
  buildSingleStrokeLevel('d9_06', 'C9.06', 'Posición & Longitud (↗ Fuga Suave Guía Gris)', '⚡ Calistenia: D9 (↗ Fuga Suave ~15°-20° / Izq-Der)', 'shallow_up_left_right', 'position_length', 'gray_line', 'Media', 'Cambio de posición y escala en ángulo suave.', 'Frena limpiamente en la fuga ②.', undefined, 18),
  buildSingleStrokeLevel('d9_07', 'C9.07', 'Variación Total (↗ Fuga Suave Guía Gris)', '⚡ Calistenia: D9 (↗ Fuga Suave ~15°-20° / Izq-Der)', 'shallow_up_left_right', 'total_random', 'gray_line', 'Media', 'Variación total de fuga suave sobre guía continua.', 'Dominio de las fugas de cubos hacia el punto derecho.', undefined, 18),
  buildSingleStrokeLevel('d9_08', 'C9.08', 'Puntos Clave Fijos (↗ Fuga Suave Sin Guía)', '⚡ Calistenia: D9 (↗ Fuga Suave ~15°-20° / Izq-Der)', 'shallow_up_left_right', 'fixed', 'points_only', 'Media', 'Se retira la guía gris: conecta ① con ② en fuga suave ~18°.', 'Proyecta mentalmente la arista en fuga hacia arriba-derecha.', undefined, 18),
  buildSingleStrokeLevel('d9_09', 'C9.09', 'Puntos Clave — Longitud (↗ Fuga Suave)', '⚡ Calistenia: D9 (↗ Fuga Suave ~15°-20° / Izq-Der)', 'shallow_up_left_right', 'length', 'points_only', 'Media', 'Distancia variable entre puntos en pendiente suave.', 'Ajusta la velocidad según la profundidad de la línea.', undefined, 18),
  buildSingleStrokeLevel('d9_10', 'C9.10', 'Puntos Clave — Rotación (↗ Fuga Suave)', '⚡ Calistenia: D9 (↗ Fuga Suave ~15°-20° / Izq-Der)', 'shallow_up_left_right', 'rotation', 'points_only', 'Media', 'Pendiente sutil variable (12° a 24°) entre puntos.', 'Alinea la vista con el punto de fuga derecho.', undefined, 18),
  buildSingleStrokeLevel('d9_11', 'C9.11', 'Puntos Clave — Rotación & Longitud (↗ Fuga Suave)', '⚡ Calistenia: D9 (↗ Fuga Suave ~15°-20° / Izq-Der)', 'shallow_up_left_right', 'rotation_length', 'points_only', 'Difícil', 'Ángulo y longitud variables en perspectiva baja.', 'Trazo tenso y definido como arista de volumen.', undefined, 18),
  buildSingleStrokeLevel('d9_12', 'C9.12', 'Puntos Clave — Posición (↗ Fuga Suave)', '⚡ Calistenia: D9 (↗ Fuga Suave ~15°-20° / Izq-Der)', 'shallow_up_left_right', 'position', 'points_only', 'Difícil', 'Puntos de fuga distribuidos por la pantalla.', 'Mantén la consistencia de perspectiva en cualquier sector.', undefined, 18),
  buildSingleStrokeLevel('d9_13', 'C9.13', 'Puntos Clave — Posición & Longitud (↗ Fuga Suave)', '⚡ Calistenia: D9 (↗ Fuga Suave ~15°-20° / Izq-Der)', 'shallow_up_left_right', 'position_length', 'points_only', 'Difícil', 'Salto continuo de plano y longitud en fuga suave.', 'Adapta el codo para trazar pendientes bajas con soltura.', undefined, 18),
  buildSingleStrokeLevel('d9_14', 'C9.14', 'Puntos Clave — Variación Total (↗ Fuga Suave)', '⚡ Calistenia: D9 (↗ Fuga Suave ~15°-20° / Izq-Der)', 'shallow_up_left_right', 'total_random', 'points_only', 'Difícil', 'Reto ciego completo de aristas en fuga suave (↗).', 'Conecta las dianas con la precisión de una regla mental.', undefined, 18),
  buildSingleStrokeLevel('d9_15', 'C9.15', 'Maestría D9 — Racha Rápida (↗ Fuga Suave)', '⚡ Calistenia: D9 (↗ Fuga Suave ~15°-20° / Izq-Der)', 'shallow_up_left_right', 'total_random', 'points_only', 'Experto', 'Maestría D9 — Racha Rápida en aristas de fuga (↗).', 'Lanza aristas precisas a alta velocidad.', undefined, 18),
  buildSingleStrokeLevel('d9_16', 'C9.16', '2 Líneas Dispersas (↗ Fuga Suave)', '⚡ Calistenia: D9 (↗ Fuga Suave ~15°-20° / Izq-Der)', 'shallow_up_left_right', 'multi_line', 'points_only', 'Difícil', 'Dos líneas en fuga suave hacia la derecha en posiciones separadas.', 'Traza las 2 líneas en cualquier orden: de ① a ② y de ③ a ④.', undefined, 18, 2),
  buildSingleStrokeLevel('d9_17', 'C9.17', '3 Líneas Dispersas (↗ Fuga Suave)', '⚡ Calistenia: D9 (↗ Fuga Suave ~15°-20° / Izq-Der)', 'shallow_up_left_right', 'multi_line', 'points_only', 'Experto', 'Tres líneas en fuga suave hacia la derecha con pendientes y escalas independientes.', 'Traza las 3 líneas en cualquier orden: de ① a ②, de ③ a ④ y de ⑤ a ⑥.', undefined, 18, 3),

  // DIRECCIÓN 10: Líneas a ~15°-20° (Fuga Suave) de Abajo hacia Arriba, Derecha a Izquierda (↖)
  buildSingleStrokeLevel('d10_01', 'C10.01', 'Línea Fija (↖ Fuga Suave Guía Gris)', '⚡ Calistenia: D10 (↖ Fuga Suave ~15°-20° / Der-Izq)', 'shallow_up_right_left', 'fixed', 'gray_line', 'Fácil', 'Línea de fuga suave a ~18° ascendente de derecha a izquierda. Posición central.', 'Traza desde ① abajo-derecha hacia ② arriba-izquierda siguiendo la arista de fuga izquierda.', undefined, 18),
  buildSingleStrokeLevel('d10_02', 'C10.02', 'Longitud Variable (↖ Fuga Suave Guía Gris)', '⚡ Calistenia: D10 (↖ Fuga Suave ~15°-20° / Der-Izq)', 'shallow_up_right_left', 'length', 'gray_line', 'Fácil', 'Misma pendiente de fuga izquierda pero longitud cambiante.', 'Modula el impulso ascendente suave hacia la izquierda.', undefined, 18),
  buildSingleStrokeLevel('d10_03', 'C10.03', 'Rotación Variable (↖ Fuga Suave Guía Gris)', '⚡ Calistenia: D10 (↖ Fuga Suave ~15°-20° / Der-Izq)', 'shallow_up_right_left', 'rotation', 'gray_line', 'Fácil', 'Inclinación variable en perspectiva baja izquierda (12° a 24°).', 'Ajusta el ángulo de fuga hacia el punto izquierdo.', undefined, 18),
  buildSingleStrokeLevel('d10_04', 'C10.04', 'Rotación & Longitud (↖ Fuga Suave Guía Gris)', '⚡ Calistenia: D10 (↖ Fuga Suave ~15°-20° / Der-Izq)', 'shallow_up_right_left', 'rotation_length', 'gray_line', 'Media', 'Inclinación y alcance variables en fuga izquierda.', 'Traza con firmeza sin dejar que la línea caiga.', undefined, 18),
  buildSingleStrokeLevel('d10_05', 'C10.05', 'Posición Variable (↖ Fuga Suave Guía Gris)', '⚡ Calistenia: D10 (↖ Fuga Suave ~15°-20° / Der-Izq)', 'shallow_up_right_left', 'position', 'gray_line', 'Media', 'Línea de fuga suave izquierda en distintas zonas del lienzo.', 'Sitúa el origen ① y proyecta la arista hacia ②.', undefined, 18),
  buildSingleStrokeLevel('d10_06', 'C10.06', 'Posición & Longitud (↖ Fuga Suave Guía Gris)', '⚡ Calistenia: D10 (↖ Fuga Suave ~15°-20° / Der-Izq)', 'shallow_up_right_left', 'position_length', 'gray_line', 'Media', 'Posición y longitud variables simultáneamente.', 'Frena con exactitud en el extremo fugado ②.', undefined, 18),
  buildSingleStrokeLevel('d10_07', 'C10.07', 'Variación Total (↖ Fuga Suave Guía Gris)', '⚡ Calistenia: D10 (↖ Fuga Suave ~15°-20° / Der-Izq)', 'shallow_up_right_left', 'total_random', 'gray_line', 'Media', 'Variación total en fuga suave izquierda sobre guía continua.', 'Control motor para caras y planos en perspectiva izquierda.', undefined, 18),
  buildSingleStrokeLevel('d10_08', 'C10.08', 'Puntos Clave Fijos (↖ Fuga Suave Sin Guía)', '⚡ Calistenia: D10 (↖ Fuga Suave ~15°-20° / Der-Izq)', 'shallow_up_right_left', 'fixed', 'points_only', 'Media', 'Sin guía continua: conecta ① con ② en fuga suave izquierda.', 'Conecta las dianas con una trayectoria recta a bajo ángulo.', undefined, 18),
  buildSingleStrokeLevel('d10_09', 'C10.09', 'Puntos Clave — Longitud (↖ Fuga Suave)', '⚡ Calistenia: D10 (↖ Fuga Suave ~15°-20° / Der-Izq)', 'shallow_up_right_left', 'length', 'points_only', 'Media', 'Separación variable entre puntos de fuga izquierda.', 'Calibra la distancia de proyección de la arista.', undefined, 18),
  buildSingleStrokeLevel('d10_10', 'C10.10', 'Puntos Clave — Rotación (↖ Fuga Suave)', '⚡ Calistenia: D10 (↖ Fuga Suave ~15°-20° / Der-Izq)', 'shallow_up_right_left', 'rotation', 'points_only', 'Media', 'Pendiente variable (12° a 24°) hacia arriba-izquierda.', 'Enfoca la diana ② al lanzar desde ①.', undefined, 18),
  buildSingleStrokeLevel('d10_11', 'C10.11', 'Puntos Clave — Rotación & Longitud (↖ Fuga Suave)', '⚡ Calistenia: D10 (↖ Fuga Suave ~15°-20° / Der-Izq)', 'shallow_up_right_left', 'rotation_length', 'points_only', 'Difícil', 'Distancia y ángulo cambiantes en fuga baja izquierda.', 'Línea limpia y decidida sin titubear.', undefined, 18),
  buildSingleStrokeLevel('d10_12', 'C10.12', 'Puntos Clave — Posición (↖ Fuga Suave)', '⚡ Calistenia: D10 (↖ Fuga Suave ~15°-20° / Der-Izq)', 'shallow_up_right_left', 'position', 'points_only', 'Difícil', 'Puntos flotando en distintos cuadrantes del lienzo.', 'Conserva la misma dirección de fuga en todo el espacio.', undefined, 18),
  buildSingleStrokeLevel('d10_13', 'C10.13', 'Puntos Clave — Posición & Longitud (↖ Fuga Suave)', '⚡ Calistenia: D10 (↖ Fuga Suave ~15°-20° / Der-Izq)', 'shallow_up_right_left', 'position_length', 'points_only', 'Difícil', 'Salto de posición y tamaño en fuga izquierda.', 'Acomoda el antebrazo para proyectar hacia la izquierda.', undefined, 18),
  buildSingleStrokeLevel('d10_14', 'C10.14', 'Puntos Clave — Variación Total (↖ Fuga Suave)', '⚡ Calistenia: D10 (↖ Fuga Suave ~15°-20° / Der-Izq)', 'shallow_up_right_left', 'total_random', 'points_only', 'Difícil', 'Reto dinámico completo de aristas fugadas (↖).', 'Máxima puntería conectando hacia la fuga izquierda.', undefined, 18),
  buildSingleStrokeLevel('d10_15', 'C10.15', 'Maestría D10 — Racha Rápida (↖ Fuga Suave)', '⚡ Calistenia: D10 (↖ Fuga Suave ~15°-20° / Der-Izq)', 'shallow_up_right_left', 'total_random', 'points_only', 'Experto', 'Maestría D10 — Racha Rápida en aristas de fuga (↖).', 'Encadena trazos rápidos en fuga izquierda sin errar.', undefined, 18),
  buildSingleStrokeLevel('d10_16', 'C10.16', '2 Líneas Dispersas (↖ Fuga Suave)', '⚡ Calistenia: D10 (↖ Fuga Suave ~15°-20° / Der-Izq)', 'shallow_up_right_left', 'multi_line', 'points_only', 'Difícil', 'Dos líneas en fuga suave hacia la izquierda en sectores distintos.', 'Traza las 2 líneas en cualquier orden: de ① a ② y de ③ a ④.', undefined, 18, 2),
  buildSingleStrokeLevel('d10_17', 'C10.17', '3 Líneas Dispersas (↖ Fuga Suave)', '⚡ Calistenia: D10 (↖ Fuga Suave ~15°-20° / Der-Izq)', 'shallow_up_right_left', 'multi_line', 'points_only', 'Experto', 'Tres líneas en fuga suave hacia la izquierda con diferentes ubicaciones y pendientes.', 'Traza las 3 líneas en cualquier orden: de ① a ②, de ③ a ④ y de ⑤ a ⑥.', undefined, 18, 3),

  // DIRECCIÓN 11: Roseta Radial de Dentro hacia Afuera (☼ Centro → Perímetro / 8 y 12 Radios)
  buildSingleStrokeLevel('d11_01', 'C11.01', 'Roseta 8 Radios Fija (☼ Guía Gris)', '⚡ Calistenia: D11 (☼ Roseta Dentro-Fuera / 8-12 Radios)', 'radial_outward', 'fixed', 'gray_line', 'Fácil', 'Roseta básica de 8 líneas desde el centro hacia afuera (cada 45°). Posición central fija con guía gris.', 'Traza los 8 radios desde el centro hacia cada diana exterior (de dentro hacia afuera).', undefined, undefined, undefined, 8),
  buildSingleStrokeLevel('d11_02', 'C11.02', 'Roseta 8 Radios — Longitud Variable (☼ Guía Gris)', '⚡ Calistenia: D11 (☼ Roseta Dentro-Fuera / 8-12 Radios)', 'radial_outward', 'length', 'gray_line', 'Fácil', '8 radios con radio/escala variable en cada intento sobre guía gris.', 'Adapta el alcance del brazo desde el centro hacia las dianas exteriores.', undefined, undefined, undefined, 8),
  buildSingleStrokeLevel('d11_03', 'C11.03', 'Roseta 8 Radios — Rotación Variable (☼ Guía Gris)', '⚡ Calistenia: D11 (☼ Roseta Dentro-Fuera / 8-12 Radios)', 'radial_outward', 'rotation', 'gray_line', 'Fácil', 'Roseta de 8 radios girada en un ángulo arbitrario en cada repetición.', 'Acomoda la orientación motora de los 8 trazos según el ángulo de giro.', undefined, undefined, undefined, 8),
  buildSingleStrokeLevel('d11_04', 'C11.04', 'Roseta 8 Radios — Rotación & Longitud (☼ Guía Gris)', '⚡ Calistenia: D11 (☼ Roseta Dentro-Fuera / 8-12 Radios)', 'radial_outward', 'rotation_length', 'gray_line', 'Media', 'Radio y rotación combinados sobre guía gris continua.', 'Proyecta los 8 radios con longitud y orientación cambiantes.', undefined, undefined, undefined, 8),
  buildSingleStrokeLevel('d11_05', 'C11.05', 'Roseta 8 Radios — Posición Variable (☼ Guía Gris)', '⚡ Calistenia: D11 (☼ Roseta Dentro-Fuera / 8-12 Radios)', 'radial_outward', 'position', 'gray_line', 'Media', 'El centro de la roseta aparece desplazado en distintas zonas del lienzo.', 'Ubica el centro donde aparezca y dispara los 8 radios hacia afuera.', undefined, undefined, undefined, 8),
  buildSingleStrokeLevel('d11_06', 'C11.06', 'Roseta 8 Radios — Posición & Longitud (☼ Guía Gris)', '⚡ Calistenia: D11 (☼ Roseta Dentro-Fuera / 8-12 Radios)', 'radial_outward', 'position_length', 'gray_line', 'Media', 'Centro y longitud variables simultáneamente sobre guía gris.', 'Frena con precisión en el perímetro de cada diana exterior.', undefined, undefined, undefined, 8),
  buildSingleStrokeLevel('d11_07', 'C11.07', 'Roseta 8 Radios — Variación Total (☼ Guía Gris)', '⚡ Calistenia: D11 (☼ Roseta Dentro-Fuera / 8-12 Radios)', 'radial_outward', 'total_random', 'gray_line', 'Media', 'Posición, radio y rotación variables sobre guía gris.', 'Dominio de proyección radial en cualquier punto del espacio.', undefined, undefined, undefined, 8),
  buildSingleStrokeLevel('d11_08', 'C11.08', 'Roseta 8 Radios — Puntos Clave Fijos (☼ Sin Guía)', '⚡ Calistenia: D11 (☼ Roseta Dentro-Fuera / 8-12 Radios)', 'radial_outward', 'fixed', 'points_only', 'Media', 'Se retira la guía gris: conecta mentalmente el centro ① con las 8 dianas exteriores.', 'Traza los 8 radios en abanico desde ① hacia las dianas exteriores sin titubear.', undefined, undefined, undefined, 8),
  buildSingleStrokeLevel('d11_09', 'C11.09', 'Roseta 8 Radios — Puntos Clave: Longitud (☼)', '⚡ Calistenia: D11 (☼ Roseta Dentro-Fuera / 8-12 Radios)', 'radial_outward', 'length', 'points_only', 'Media', 'Solo puntos diana con radio variable sin líneas guía.', 'Calcula la frenada perimetral en cada uno de los 8 puntos.', undefined, undefined, undefined, 8),
  buildSingleStrokeLevel('d11_10', 'C11.10', 'Roseta 8 Radios — Puntos Clave: Rotación (☼)', '⚡ Calistenia: D11 (☼ Roseta Dentro-Fuera / 8-12 Radios)', 'radial_outward', 'rotation', 'points_only', 'Media', 'Solo puntos con la constelación de 8 dianas rotada.', 'Alinea el vector desde el centro ① hacia cada diana exterior.', undefined, undefined, undefined, 8),
  buildSingleStrokeLevel('d11_11', 'C11.11', 'Roseta 8 Radios — Puntos Clave: Posición & Longitud (☼)', '⚡ Calistenia: D11 (☼ Roseta Dentro-Fuera / 8-12 Radios)', 'radial_outward', 'position_length', 'points_only', 'Difícil', 'Centro flotando en distintas zonas con escala cambiante.', 'Sincroniza la postura antes de lanzar los 8 radios.', undefined, undefined, undefined, 8),
  buildSingleStrokeLevel('d11_12', 'C11.12', 'Roseta 8 Radios — Puntos Clave: Variación Total (☼)', '⚡ Calistenia: D11 (☼ Roseta Dentro-Fuera / 8-12 Radios)', 'radial_outward', 'total_random', 'points_only', 'Difícil', 'Desafío ciego completo de 8 radios sin líneas intermedias.', 'Conecta el centro con los 8 puntos exteriores con máxima precisión.', undefined, undefined, undefined, 8),
  buildSingleStrokeLevel('d11_13', 'C11.13', 'Roseta 12 Radios Fija (☼ Guía Gris)', '⚡ Calistenia: D11 (☼ Roseta Dentro-Fuera / 8-12 Radios)', 'radial_outward', 'fixed', 'gray_line', 'Media', 'Aumento de densidad a 12 radios regulares (cada 30°). Posición central con guía gris.', 'Traza los 12 radios desde el centro hacia afuera distribuidos uniformemente.', undefined, undefined, undefined, 12),
  buildSingleStrokeLevel('d11_14', 'C11.14', 'Roseta 12 Radios — Longitud Variable (☼ Guía Gris)', '⚡ Calistenia: D11 (☼ Roseta Dentro-Fuera / 8-12 Radios)', 'radial_outward', 'length', 'gray_line', 'Media', '12 radios con escala y alcance variables sobre guía gris.', 'Modula el alcance motor de los 12 trazos radiales.', undefined, undefined, undefined, 12),
  buildSingleStrokeLevel('d11_15', 'C11.15', 'Roseta 12 Radios — Rotación Variable (☼ Guía Gris)', '⚡ Calistenia: D11 (☼ Roseta Dentro-Fuera / 8-12 Radios)', 'radial_outward', 'rotation', 'gray_line', 'Media', 'Roseta densa de 12 radios girada en cualquier orientación.', 'Mantén la regularidad angular en los 12 sectores.', undefined, undefined, undefined, 12),
  buildSingleStrokeLevel('d11_16', 'C11.16', 'Roseta 12 Radios — Posición Variable (☼ Guía Gris)', '⚡ Calistenia: D11 (☼ Roseta Dentro-Fuera / 8-12 Radios)', 'radial_outward', 'position', 'gray_line', 'Media', 'Roseta de 12 radios ubicada en distintos puntos del lienzo.', 'Dispara los 12 radios desde el nuevo núcleo central.', undefined, undefined, undefined, 12),
  buildSingleStrokeLevel('d11_17', 'C11.17', 'Roseta 12 Radios — Puntos Clave (☼ Sin Guía)', '⚡ Calistenia: D11 (☼ Roseta Dentro-Fuera / 8-12 Radios)', 'radial_outward', 'fixed', 'points_only', 'Difícil', 'Sin guía gris: 12 dianas perimetrales y centro común.', 'Conecta el centro ① con las 12 dianas perimetrales sin ayuda visual.', undefined, undefined, undefined, 12),
  buildSingleStrokeLevel('d11_18', 'C11.18', 'Roseta 12 Radios — Puntos Clave: Variación Total (☼)', '⚡ Calistenia: D11 (☼ Roseta Dentro-Fuera / 8-12 Radios)', 'radial_outward', 'total_random', 'points_only', 'Difícil', 'Reto ciego de 12 radios con posición, escala y rotación aleatorias.', 'Clava los 12 radios con consistencia milimétrica.', undefined, undefined, undefined, 12),
  buildSingleStrokeLevel('d11_19', 'C11.19', 'Maestría D11 — Roseta Rápida (☼ Dentro hacia Afuera)', '⚡ Calistenia: D11 (☼ Roseta Dentro-Fuera / 8-12 Radios)', 'radial_outward', 'total_random', 'points_only', 'Experto', 'Modo continuo rápido: acumula la mayor racha de aciertos en rosetas divergentes (☼).', 'Traza los 12 radios a alta velocidad sin perder la confluencia en el centro.', undefined, undefined, undefined, 12),

  // DIRECCIÓN 12: Roseta Radial de Fuera hacia Adentro (❂ Perímetro → Centro / 8 y 12 Radios)
  buildSingleStrokeLevel('d12_01', 'C12.01', 'Roseta 8 Radios Fija (❂ Guía Gris)', '⚡ Calistenia: D12 (❂ Roseta Fuera-Dentro / 8-12 Radios)', 'radial_inward', 'fixed', 'gray_line', 'Fácil', 'Roseta de 8 líneas convergentes desde el exterior hacia el centro común (de fuera hacia adentro).', 'Traza desde cada diana perimetral hacia el centro común (de fuera hacia adentro).', undefined, undefined, undefined, 8),
  buildSingleStrokeLevel('d12_02', 'C12.02', 'Roseta 8 Radios — Longitud Variable (❂ Guía Gris)', '⚡ Calistenia: D12 (❂ Roseta Fuera-Dentro / 8-12 Radios)', 'radial_inward', 'length', 'gray_line', 'Fácil', '8 radios convergentes con radio/escala variable en cada repetición sobre guía gris.', 'Adapta la recogida del brazo desde el perímetro hacia el centro.', undefined, undefined, undefined, 8),
  buildSingleStrokeLevel('d12_03', 'C12.03', 'Roseta 8 Radios — Rotación Variable (❂ Guía Gris)', '⚡ Calistenia: D12 (❂ Roseta Fuera-Dentro / 8-12 Radios)', 'radial_inward', 'rotation', 'gray_line', 'Fácil', 'Roseta convergente girada en ángulo variable sobre guía gris.', 'Orienta cada trazo desde la periferia hacia el núcleo común.', undefined, undefined, undefined, 8),
  buildSingleStrokeLevel('d12_04', 'C12.04', 'Roseta 8 Radios — Rotación & Longitud (❂ Guía Gris)', '⚡ Calistenia: D12 (❂ Roseta Fuera-Dentro / 8-12 Radios)', 'radial_inward', 'rotation_length', 'gray_line', 'Media', 'Radio y rotación cambiantes hacia el centro.', 'Modula la fuerza de recogida convergiendo en el punto central.', undefined, undefined, undefined, 8),
  buildSingleStrokeLevel('d12_05', 'C12.05', 'Roseta 8 Radios — Posición Variable (❂ Guía Gris)', '⚡ Calistenia: D12 (❂ Roseta Fuera-Dentro / 8-12 Radios)', 'radial_inward', 'position', 'gray_line', 'Media', 'Núcleo central ubicado en distintos sectores del lienzo.', 'Apunta los 8 trazos hacia el centro donde se encuentre.', undefined, undefined, undefined, 8),
  buildSingleStrokeLevel('d12_06', 'C12.06', 'Roseta 8 Radios — Posición & Longitud (❂ Guía Gris)', '⚡ Calistenia: D12 (❂ Roseta Fuera-Dentro / 8-12 Radios)', 'radial_inward', 'position_length', 'gray_line', 'Media', 'Cambio simultáneo de escala y posición en convergencia.', 'Frena en seco exactamente en el centro.', undefined, undefined, undefined, 8),
  buildSingleStrokeLevel('d12_07', 'C12.07', 'Roseta 8 Radios — Variación Total (❂ Guía Gris)', '⚡ Calistenia: D12 (❂ Roseta Fuera-Dentro / 8-12 Radios)', 'radial_inward', 'total_random', 'gray_line', 'Media', 'Variación total convergente sobre guía gris continua.', 'Control motor pleno convergiendo desde cualquier ángulo.', undefined, undefined, undefined, 8),
  buildSingleStrokeLevel('d12_08', 'C12.08', 'Roseta 8 Radios — Puntos Clave Fijos (❂ Sin Guía)', '⚡ Calistenia: D12 (❂ Roseta Fuera-Dentro / 8-12 Radios)', 'radial_inward', 'fixed', 'points_only', 'Media', 'Se retira la guía gris: conecta las 8 dianas exteriores hacia el centro común.', 'Lanza cada trazo desde su diana exterior hacia el centro sin dudar.', undefined, undefined, undefined, 8),
  buildSingleStrokeLevel('d12_09', 'C12.09', 'Roseta 8 Radios — Puntos Clave: Longitud (❂)', '⚡ Calistenia: D12 (❂ Roseta Fuera-Dentro / 8-12 Radios)', 'radial_inward', 'length', 'points_only', 'Media', 'Distancia variable de los puntos exteriores hacia el centro.', 'Ajusta la inercia para no pasarte de largo del punto central.', undefined, undefined, undefined, 8),
  buildSingleStrokeLevel('d12_10', 'C12.10', 'Roseta 8 Radios — Puntos Clave: Rotación (❂)', '⚡ Calistenia: D12 (❂ Roseta Fuera-Dentro / 8-12 Radios)', 'radial_inward', 'rotation', 'points_only', 'Media', 'Puntos exteriores rotados en el plano sin guía.', 'Calcula la trayectoria hacia el centro para cada posición perimetral.', undefined, undefined, undefined, 8),
  buildSingleStrokeLevel('d12_11', 'C12.11', 'Roseta 8 Radios — Puntos Clave: Posición & Longitud (❂)', '⚡ Calistenia: D12 (❂ Roseta Fuera-Dentro / 8-12 Radios)', 'radial_inward', 'position_length', 'points_only', 'Difícil', 'Salto continuo de núcleo y escala en convergencia.', 'Adapta el pivote de la mano según el cuadrante exterior.', undefined, undefined, undefined, 8),
  buildSingleStrokeLevel('d12_12', 'C12.12', 'Roseta 8 Radios — Puntos Clave: Variación Total (❂)', '⚡ Calistenia: D12 (❂ Roseta Fuera-Dentro / 8-12 Radios)', 'radial_inward', 'total_random', 'points_only', 'Difícil', 'Reto ciego de 8 radios convergentes sin apoyo visual.', 'Precisión absoluta convergiendo en el núcleo común.', undefined, undefined, undefined, 8),
  buildSingleStrokeLevel('d12_13', 'C12.13', 'Roseta 12 Radios Fija (❂ Guía Gris)', '⚡ Calistenia: D12 (❂ Roseta Fuera-Dentro / 8-12 Radios)', 'radial_inward', 'fixed', 'gray_line', 'Media', 'Densidad de 12 radios convergiendo al centro (cada 30°). Posición fija con guía gris.', 'Traza los 12 radios perimetrales hacia el centro con cadencia uniforme.', undefined, undefined, undefined, 12),
  buildSingleStrokeLevel('d12_14', 'C12.14', 'Roseta 12 Radios — Longitud Variable (❂ Guía Gris)', '⚡ Calistenia: D12 (❂ Roseta Fuera-Dentro / 8-12 Radios)', 'radial_inward', 'length', 'gray_line', 'Media', '12 radios convergentes con escala variable sobre guía gris.', 'Calibra la frenada de los 12 trazos en el núcleo central.', undefined, undefined, undefined, 12),
  buildSingleStrokeLevel('d12_15', 'C12.15', 'Roseta 12 Radios — Rotación Variable (❂ Guía Gris)', '⚡ Calistenia: D12 (❂ Roseta Fuera-Dentro / 8-12 Radios)', 'radial_inward', 'rotation', 'gray_line', 'Media', 'Roseta convergente de 12 radios girada en ángulo arbitrario.', 'Conserva la separación angular uniforme convergiendo al centro.', undefined, undefined, undefined, 12),
  buildSingleStrokeLevel('d12_16', 'C12.16', 'Roseta 12 Radios — Posición Variable (❂ Guía Gris)', '⚡ Calistenia: D12 (❂ Roseta Fuera-Dentro / 8-12 Radios)', 'radial_inward', 'position', 'gray_line', 'Media', 'Roseta densa de 12 radios convergentes en cualquier cuadrante.', 'Focaliza la puntería en el centro desplazado.', undefined, undefined, undefined, 12),
  buildSingleStrokeLevel('d12_17', 'C12.17', 'Roseta 12 Radios — Puntos Clave (❂ Sin Guía)', '⚡ Calistenia: D12 (❂ Roseta Fuera-Dentro / 8-12 Radios)', 'radial_inward', 'fixed', 'points_only', 'Difícil', 'Sin guía gris: 12 dianas exteriores convergiendo en el centro.', 'Conecta las 12 dianas perimetrales hacia el centro común.', undefined, undefined, undefined, 12),
  buildSingleStrokeLevel('d12_18', 'C12.18', 'Roseta 12 Radios — Puntos Clave: Variación Total (❂)', '⚡ Calistenia: D12 (❂ Roseta Fuera-Dentro / 8-12 Radios)', 'radial_inward', 'total_random', 'points_only', 'Difícil', 'Reto ciego de 12 radios convergentes con variación total.', 'Clava los 12 impactos en el centro común con máxima regularidad.', undefined, undefined, undefined, 12),
  buildSingleStrokeLevel('d12_19', 'C12.19', 'Maestría D12 — Roseta Rápida (❂ Fuera hacia Adentro)', '⚡ Calistenia: D12 (❂ Roseta Fuera-Dentro / 8-12 Radios)', 'radial_inward', 'total_random', 'points_only', 'Experto', 'Modo infinito rápido: acumula la mayor racha de aciertos en rosetas convergentes (❂).', 'Traza los 12 radios de fuera a dentro a gran velocidad con máxima precisión.', undefined, undefined, undefined, 12),

  // ESPACIADO Y CARRILES (CONSISTENCIA 1.1 — RITMO Y ESPACIADO x, x/2)
  buildSpacingTrackLevel('sp_01', 'E1.1', 'Carril Único — Espaciado Base (x)', '⚡ Calistenia: Espaciado & Carriles (Ritmo)', 1, 1, 'Fácil', 'Una franja de altura y. Observa el patrón de muestra a la izquierda y dibuja líneas verticales hacia la derecha manteniendo el espaciado x entre los carriles.', 'Dibuja líneas verticales de arriba a abajo entre las dos guías horizontales manteniendo la separación x del patrón.'),
  buildSpacingTrackLevel('sp_02', 'E1.2', 'Carril Único — Espaciado Fino (x/2)', '⚡ Calistenia: Espaciado & Carriles (Ritmo)', 1, 0.5, 'Media', 'Una franja de altura y con el doble de densidad. Imita la muestra reduciendo el espaciado a x/2 con cadencia regular.', 'Dibuja líneas verticales con la mitad de espaciado (x/2) manteniendo el paralelismo y los límites.'),
  buildSpacingTrackLevel('sp_03', 'E2.1', 'Doble Carril — Espaciado Base (x)', '⚡ Calistenia: Espaciado & Carriles (Ritmo)', 2, 1, 'Media', 'Dos franjas horizontales de altura y/2 separadas por un margen blanco. Completa ambas bandas con espaciado x constante.', 'Llena las dos franjas horizontales con trazos verticales de altura y/2 al paso x de la muestra.'),
  buildSpacingTrackLevel('sp_04', 'E2.2', 'Doble Carril — Espaciado Fino (x/2)', '⚡ Calistenia: Espaciado & Carriles (Ritmo)', 2, 0.5, 'Difícil', 'Dos franjas de altura y/2 con densidad x/2. Requiere gran control de muñeca y detención precisa en cada carril.', 'Dibuja líneas verticales densas (x/2) en ambas franjas respetando el margen intermedio.'),
  buildSpacingTrackLevel('sp_05', 'E3.1', 'Cuádruple Carril — Espaciado Base (x)', '⚡ Calistenia: Espaciado & Carriles (Ritmo)', 4, 1, 'Difícil', 'Cuatro franjas horizontales de altura y/4. Trazos verticales cortos y rápidos con ritmo continuo al paso x.', 'Dibuja trazos verticales cortos en las 4 franjas manteniendo el mismo espaciado x en todas.'),
  buildSpacingTrackLevel('sp_06', 'E3.2', 'Cuádruple Carril — Espaciado Fino (x/2)', '⚡ Calistenia: Espaciado & Carriles (Ritmo)', 4, 0.5, 'Experto', 'Cuatro franjas de altura y/4 con espaciado fino x/2. Máxima concentración rítmica y motriz sobre micro-franjas.', 'Completa las 4 franjas con trazos cortos ultradensos (x/2) sin desbordar los carriles.'),
  buildSpacingTrackLevel('sp_07', 'E4.1', 'Carril Diagonal ↗ D1 (Abajo-Arriba / Izq-Der · 75°)', '⚡ Calistenia: Espaciado & Carriles (Ritmo)', 1, 0.5, 'Media', 'Franja de altura y con diagonales ascendentes a ~75°. Traza de abajo hacia arriba y de izquierda a derecha al paso x/2.', 'Traza líneas diagonales ascendentes (↗) de abajo a arriba al paso fino x/2.', 16, 130, 'bottom_up_left_right', 75),
  buildSpacingTrackLevel('sp_08', 'E4.2', 'Carril Diagonal ↙ D2 (Arriba-Abajo / Der-Izq · 75°)', '⚡ Calistenia: Espaciado & Carriles (Ritmo)', 1, 0.5, 'Media', 'Franja de altura y con diagonales descendentes inversas a ~75°. Traza de arriba hacia abajo y de derecha a izquierda al paso x/2.', 'Traza líneas diagonales descendentes (↙) de arriba a abajo al paso fino x/2.', 16, 130, 'top_down_right_left', 75),
  buildSpacingTrackLevel('sp_09', 'E4.3', 'Carril Diagonal ↘ D3 (Arriba-Abajo / Izq-Der · 75°)', '⚡ Calistenia: Espaciado & Carriles (Ritmo)', 1, 0.5, 'Media', 'Franja de altura y con diagonales descendentes a ~75° (espejo D3). Traza de arriba hacia abajo y de izquierda a derecha al paso x/2.', 'Traza líneas diagonales descendentes (↘) de arriba a abajo al paso fino x/2.', 16, 130, 'top_down_left_right', 75),
  buildSpacingTrackLevel('sp_10', 'E4.4', 'Carril Diagonal ↖ D4 (Abajo-Arriba / Der-Izq · 75°)', '⚡ Calistenia: Espaciado & Carriles (Ritmo)', 1, 0.5, 'Media', 'Franja de altura y con diagonales ascendentes inversas a ~75° (espejo D4). Traza de abajo hacia arriba y de derecha a izquierda al paso x/2.', 'Traza líneas diagonales ascendentes (↖) de abajo a arriba al paso fino x/2.', 16, 130, 'bottom_up_right_left', 75),
  buildSpacingTrackLevel('sp_11', 'E5.1', 'Carril Quiebre Triangular ◄ (Bloques & Gaps · x/2)', '⚡ Calistenia: Espaciado & Carriles (Ritmo)', 1, 0.5, 'Difícil', 'Líneas verticales con quiebre triangular a la izquierda (◄). Bloques de ancho y separados por pausas. Rellena cada bloque entre la línea de inicio y final.', 'Dibuja líneas con quiebre triangular hacia la izquierda (◄) al paso fino x/2 rellenando cada bloque entre la línea de inicio y final.', 16, 130, 'vertical_top_down', 90, 'triangle_left', true),
  buildSpacingTrackLevel('sp_12', 'E5.2', 'Carril Quiebre Triangular ► (Bloques & Gaps · x/2)', '⚡ Calistenia: Espaciado & Carriles (Ritmo)', 1, 0.5, 'Difícil', 'Líneas verticales con quiebre triangular hacia la derecha (►, espejo). Bloques de ancho y separados por pausas y líneas de inicio y final.', 'Dibuja líneas con quiebre triangular hacia la derecha (►) al paso fino x/2 rellenando cada bloque entre la línea de inicio y final.', 16, 130, 'vertical_top_down', 90, 'triangle_right', true),
  buildSpacingTrackLevel('sp_13', 'E6.1', 'Carril Quiebre en Chevron ◄ (Bloques & Pausas · x/2)', '⚡ Calistenia: Espaciado & Carriles (Ritmo)', 1, 0.5, 'Difícil', 'Líneas en ángulo chevron con quiebre hacia la izquierda (◄). Bloques de ancho y separados por pausas. Rellena cada bloque entre la línea de inicio y final.', 'Dibuja líneas en chevron hacia la izquierda (◄) al paso fino x/2 rellenando cada bloque entre la línea de inicio y final.', 16, 130, 'vertical_top_down', 90, 'chevron_left', true),

  // CURVAS Y ARCOS (C & S)
  buildSingleStrokeLevel('cc_01', 'CC.01', 'Arco en C Fijo (Guía Gris)', '⚡ Calistenia: Trazos Curvos & Arcos (C & S)', 'curve_c', 'fixed', 'gray_line', 'Fácil', 'Curva suave en arco de parábola con guía gris visible.', 'Sigue la trayectoria curvada desde ① hasta ②.', 'subtle'),
  buildSingleStrokeLevel('cc_02', 'CC.02', 'Arco en C — Longitud Variable (Guía Gris)', '⚡ Calistenia: Trazos Curvos & Arcos (C & S)', 'curve_c', 'length', 'gray_line', 'Fácil', 'Arco con cuerda y longitud variable en cada repetición.', 'Adapta el barrido circular de la muñeca.', 'subtle'),
  buildSingleStrokeLevel('cc_03', 'CC.03', 'Arco en C — Rotación Variable (Guía Gris)', '⚡ Calistenia: Trazos Curvos & Arcos (C & S)', 'curve_c', 'rotation', 'gray_line', 'Fácil', 'Arco orientado en distintas direcciones espaciales.', 'Gira la orientación del movimiento en el plano.', 'subtle'),
  buildSingleStrokeLevel('cc_04', 'CC.04', 'Arco en C — Curvatura Media (Guía Gris)', '⚡ Calistenia: Trazos Curvos & Arcos (C & S)', 'curve_c', 'rotation_length', 'gray_line', 'Media', 'Arco con mayor bombeo y curvatura intermedia.', 'Acentúa la flexión continua sin perder suavidad.', 'medium'),
  buildSingleStrokeLevel('cc_05', 'CC.05', 'Arco en C — Curvatura Pronunciada (Guía Gris)', '⚡ Calistenia: Trazos Curvos & Arcos (C & S)', 'curve_c', 'total_random', 'gray_line', 'Media', 'Arco cerrado con curvatura muy acusada (gancho / herradura).', 'Curvatura intensa sin quebrar el trazo.', 'pronounced'),
  buildSingleStrokeLevel('cc_06', 'CC.06', 'Arco en C — Variación Total (Guía Gris)', '⚡ Calistenia: Trazos Curvos & Arcos (C & S)', 'curve_c', 'total_random', 'gray_line', 'Media', 'Posición, cuerda y curvatura aleatorias sobre guía gris.', 'Flexibilidad motora en curvas libres.', 'medium'),
  buildSingleStrokeLevel('cc_07', 'CC.07', 'Arco en C — 3 Puntos (①, ② Vértice, ③) Curvatura Sutil', '⚡ Calistenia: Trazos Curvos & Arcos (C & S)', 'curve_c', 'fixed', 'points_only', 'Media', 'Solo 3 puntos: inicio ①, vértice del arco ② y fin ③.', 'Pasa exactamente por el punto intermedio ② curvando el trazo.', 'subtle'),
  buildSingleStrokeLevel('cc_08', 'CC.08', 'Arco en C — 3 Puntos (Curvatura Media)', '⚡ Calistenia: Trazos Curvos & Arcos (C & S)', 'curve_c', 'rotation_length', 'points_only', 'Difícil', '3 puntos con arco más bombeado y orientación aleatoria.', 'Curva el trazo tocando el punto intermedio ②.', 'medium'),
  buildSingleStrokeLevel('cc_09', 'CC.09', 'Arco en C — 3 Puntos (Curvatura Pronunciada)', '⚡ Calistenia: Trazos Curvos & Arcos (C & S)', 'curve_c', 'position_length', 'points_only', 'Difícil', '3 puntos con arco profundo y salto de posición.', 'Ajusta la trayectoria parabólica entre los 3 puntos.', 'pronounced'),
  buildSingleStrokeLevel('cc_10', 'CC.10', 'Arco en C — 3 Puntos (Variación Total)', '⚡ Calistenia: Trazos Curvos & Arcos (C & S)', 'curve_c', 'total_random', 'points_only', 'Difícil', 'Desafío ciego de arcos en C en cualquier dirección y radio.', 'Conecta los 3 puntos en un único movimiento orgánico.', 'medium'),

  buildSingleStrokeLevel('cs_11', 'CS.11', 'Onda en S Fija (Guía Gris)', '⚡ Calistenia: Trazos Curvos & Arcos (C & S)', 'curve_s', 'fixed', 'gray_line', 'Fácil', 'Curva sinusoidal en S con punto de inflexión central.', 'Traza la onda en S desde ① hasta ② siguiendo la línea gris.', 'subtle'),
  buildSingleStrokeLevel('cs_12', 'CS.12', 'Onda en S — Longitud Variable (Guía Gris)', '⚡ Calistenia: Trazos Curvos & Arcos (C & S)', 'curve_s', 'length', 'gray_line', 'Media', 'Onda en S con longitud de ciclo variable.', 'Acompasa el ritmo ondulante a lo largo de la guía.', 'subtle'),
  buildSingleStrokeLevel('cs_13', 'CS.13', 'Onda en S — Rotación Variable (Guía Gris)', '⚡ Calistenia: Trazos Curvos & Arcos (C & S)', 'curve_s', 'rotation', 'gray_line', 'Media', 'Onda en S orientada en distintos ángulos.', 'Mantén la simetría de la onda en cualquier inclinación.', 'medium'),
  buildSingleStrokeLevel('cs_14', 'CS.14', 'Onda en S — Amplitud Media (Guía Gris)', '⚡ Calistenia: Trazos Curvos & Arcos (C & S)', 'curve_s', 'rotation_length', 'gray_line', 'Media', 'Amplitud de onda más pronunciada.', 'Modula la aceleración en el punto de inflexión.', 'medium'),
  buildSingleStrokeLevel('cs_15', 'CS.15', 'Onda en S — Amplitud Pronunciada (Guía Gris)', '⚡ Calistenia: Trazos Curvos & Arcos (C & S)', 'curve_s', 'total_random', 'gray_line', 'Difícil', 'Onda serpenteante con crestas y valles profundos.', 'Curvas pronunciadas sin frenar bruscamente.', 'pronounced'),
  buildSingleStrokeLevel('cs_16', 'CS.16', 'Onda en S — Variación Total (Guía Gris)', '⚡ Calistenia: Trazos Curvos & Arcos (C & S)', 'curve_s', 'total_random', 'gray_line', 'Difícil', 'Parámetros aleatorios de onda completa sobre guía gris.', 'Control total del gesto sinusoidal.', 'medium'),
  buildSingleStrokeLevel('cs_17', 'CS.17', 'Onda en S — 5 Puntos (①, ② Cresta, ③ Inflexión, ④ Valle, ⑤)', '⚡ Calistenia: Trazos Curvos & Arcos (C & S)', 'curve_s', 'fixed', 'points_only', 'Difícil', '5 puntos clave para guiar la onda sinusoidal sin línea continua.', 'Atraviesa los 5 puntos en orden dibujando la onda suave.', 'subtle'),
  buildSingleStrokeLevel('cs_18', 'CS.18', 'Onda en S — 5 Puntos (Amplitud Media)', '⚡ Calistenia: Trazos Curvos & Arcos (C & S)', 'curve_s', 'rotation_length', 'points_only', 'Difícil', '5 puntos con mayor oscilación y ángulo rotado.', 'Calcula la parábola de cada cresta y valle.', 'medium'),
  buildSingleStrokeLevel('cs_19', 'CS.19', 'Onda en S — 5 Puntos (Amplitud Pronunciada)', '⚡ Calistenia: Trazos Curvos & Arcos (C & S)', 'curve_s', 'total_random', 'points_only', 'Experto', '5 puntos con ondulación extrema en cualquier posición.', 'Enlaza los 5 puntos en un trazo elástico y armónico.', 'pronounced'),
  buildSingleStrokeLevel('cs_20', 'CS.20', 'Maestría de Curvas & Arcos (Racha Rápida)', '⚡ Calistenia: Trazos Curvos & Arcos (C & S)', 'curve_s', 'total_random', 'points_only', 'Experto', 'Desafío supremo de curvas dinámicas con racha de fuego.', 'Mantén la fluidez y precisión en arcos y sinusoides.', 'pronounced'),
];

/**
 * Registro completo de las 42 páginas del cuaderno
 */
export const ALL_42_EXERCISES: WorkbookExerciseDef[] = [
  { page: 1, code: '1.1', title: 'Consistency (Making Strokes Consistent)', block: 'Bloque 1: Consistencia & Calistenia', category: 'parallel_lines', difficulty: 'Fácil', metrics: 'Espaciado, longitud, grosor y ángulo', desc: 'Cuatro filas de entrenamiento: espaciado, longitud, grosor y dirección. La base del sombreado.', instruction: 'Traza líneas paralelas con espaciado constante y longitud uniforme entre los carriles.' },
  { page: 2, code: '1.2', title: 'Consistency across Contours', block: 'Bloque 1: Consistencia & Calistenia', category: 'contour_lines', difficulty: 'Media', metrics: 'Anclaje en bordes, progresión de curvatura', desc: 'Siluetas orgánicas (cintas, cuñas, caracol) con tramas que siguen la curvatura.', instruction: 'Rellena la silueta siguiendo su curvatura de borde a borde sin salirse.' },
  { page: 3, code: '1.3', title: 'Pen Control — Straight Lines', block: 'Bloque 1: Consistencia & Calistenia', category: 'parallel_lines', difficulty: 'Media', metrics: 'Rectitud de cuerda, precisión angular', desc: 'Líneas rectas en 8 cuadrantes espaciales para entrenar el codo y hombro como pivote.', instruction: 'Traza líneas rectas firmes sin titubear en la dirección indicada.' },
  { page: 4, code: '1.4', title: 'Pen Control — Angles & Zigzags', block: 'Bloque 1: Consistencia & Calistenia', category: 'angles_zigzags', difficulty: 'Media', metrics: 'Radio de esquina R -> 0, alineación de cúspides', desc: 'Quiebros secos: bayonetas, chevrones, vértices en V y relámpagos Z/N.', instruction: 'Dibuja quiebros angulares secos frenando en seco sin redondear las esquinas.' },
  { page: 5, code: '1.5', title: 'Pen Control — Curved Lines', block: 'Bloque 1: Consistencia & Calistenia', category: 'curved_s_waves', difficulty: 'Media', metrics: 'Continuidad C², punto de inflexión suave', desc: 'Curvas en C en 4 orientaciones y curvas en S sinusoidales horizontales y verticales.', instruction: 'Traza ondas suaves en S manteniendo una cadencia y amplitud constante.' },
  { page: 6, code: '1.6', title: 'Pen Control — Radial & Organic Strokes', block: 'Bloque 1: Consistencia & Calistenia', category: 'radial_focal', difficulty: 'Difícil', metrics: 'Confluencia focal al centro, paso angular', desc: 'Molinetes en espiral, estrella de radios divergentes, llamas y ojos concéntricos.', instruction: 'Conecta o proyecta los trazos hacia el núcleo central con ritmo regular.' },
  { page: 7, code: '1.7', title: 'Pen Control — Trailing Lines (Flicks)', block: 'Bloque 1: Consistencia & Calistenia', category: 'trailing_flicks', difficulty: 'Difícil', metrics: 'Desvanecimiento terminal, ángulo de inserción', desc: 'Líneas con escape de pluma (flick): soltar presión al final del trazo.', instruction: 'Ejecuta trazos rápidos que se desvanezcan en una punta afilada al despegar.' },
  { page: 8, code: '1.8', title: 'Pen Control — Advanced Spines', block: 'Bloque 1: Consistencia & Calistenia', category: 'trailing_flicks', difficulty: 'Difícil', metrics: 'Normalidad ortogonal a la curva rectora', desc: 'Espinas complejas: tubos en U, cintas onduladas y espinas simétricas.', instruction: 'Dibuja costillas ortogonales a lo largo de la trayectoria curvada.' },
  { page: 9, code: '1.9', title: 'The Basic Strokes (Los 7 Trazos)', block: 'Bloque 2: Trazos Fundamentales & Trama', category: 'basic_strokes', difficulty: 'Fácil', metrics: 'Clasificador morfológico, confinamiento en marco', desc: 'Los 7 estilos: Hatching, Cross-hatch, Uneven, Curved, Scribble, Stipple, Flowing.', instruction: 'Aplica el estilo de trazo indicado dentro del marco sin desbordar los bordes.' },
  { page: 10, code: '1.10', title: 'Basic Strokes Variations', block: 'Bloque 2: Trazos Fundamentales & Trama', category: 'basic_strokes', difficulty: 'Media', metrics: 'Homogeneidad textural, densidad de cobertura', desc: 'Variaciones de trama: abanicos, diamante fino, pelaje arremolinado, lazos cerrados.', instruction: 'Modula la textura de trama para crear un campo visual uniforme.' },
  { page: 11, code: '1.11', title: 'Stroke Variations — Hatching Parameters', block: 'Bloque 2: Trazos Fundamentales & Trama', category: 'hatching_params', difficulty: 'Media', metrics: 'Paso interlineal d, longitud de trazo L', desc: 'Aislamiento de variables en trama recta: Tamaño, Espaciado, Capas, Dirección y Grosor.', instruction: 'Ajusta la separación de las líneas para alcanzar la densidad objetivo.' },
  { page: 12, code: '1.12', title: 'Cross-Hatching Parameters', block: 'Bloque 2: Trazos Fundamentales & Trama', category: 'hatching_params', difficulty: 'Difícil', metrics: 'Ángulo entre capas Δθ ≈ 45° o 90°', desc: 'Variaciones de trama cruzada: tamaño, paso, capas (2 a 4) y ángulo.', instruction: 'Cruza dos o más capas de líneas paralelas en ángulos contrastantes.' },
  { page: 13, code: '1.13', title: 'Uneven Hatching Parameters', block: 'Bloque 2: Trazos Fundamentales & Trama', category: 'hatching_params', difficulty: 'Media', metrics: 'Distribución aperiódica sin costuras', desc: 'Trama discontinua traslapada para corteza de árbol, hierba y pelaje orgánico.', instruction: 'Dibuja trazos cortos entrecortados evitando crear líneas continuas accidentales.' },
  { page: 14, code: '2.5', title: 'Cross-Contour Lines (Contornos Cruzados)', block: 'Bloque 3: Contornos Cruzados (3D)', category: 'cross_contour_blob', difficulty: 'Media', metrics: 'Curvatura volumétrica, anclaje en perímetro', desc: 'Líneas transversales envolventes sobre peras, cantos rodados y alubias.', instruction: 'Traza anillos de contorno cruzado que abracen el volumen de borde a borde.' },
  { page: 15, code: '2.6', title: 'Cross-Contours on Freeform Blobs', block: 'Bloque 3: Contornos Cruzados (3D)', category: 'cross_contour_blob', difficulty: 'Media', metrics: 'Ortogonalidad al eje central (90° ± 15°)', desc: '8 siluetas orgánicas libres atravesadas por una varilla de orientación 3D.', instruction: 'Dibuja secciones transversales que crucen perpendicularmente la varilla interior.' },
  { page: 16, code: '2.7', title: 'Curved Sheets & Hollow Shells', block: 'Bloque 3: Contornos Cruzados (3D)', category: 'cross_contour_blob', difficulty: 'Difícil', metrics: 'Coherencia cóncavo/convexo en láminas alabeadas', desc: 'Láminas curvadas, canalones, sillas de montar y conchas cóncavas.', instruction: 'Sigue la curvatura de la lámina para definir claramente qué cara mira hacia ti.' },
  { page: 17, code: '2.8', title: 'Advanced Twisted Forms', block: 'Bloque 3: Contornos Cruzados (3D)', category: 'cross_contour_blob', difficulty: 'Difícil', metrics: 'Interpolación de elipses a lo largo de spline 3D', desc: 'Cintas dobladas, tubos torcidos en U, salchichas en S y cojines hinchados.', instruction: 'Modula la orientación de las elipses a medida que el tubo se curva en el espacio.' },
  { page: 18, code: '2.9', title: 'Creating Even Value (Valor Plano)', block: 'Bloque 4: Valor Plano & Gradación', category: 'even_value_strip', difficulty: 'Media', metrics: 'Varianza espacial de densidad σ² ≈ 0', desc: '7 franjas rectangulares. Mantener un tono gris completamente uniforme sin bandas.', instruction: 'Rellena la franja con un valor tonal homogéneo de izquierda a derecha.' },
  { page: 19, code: '2.10', title: 'Topographical Value Map', block: 'Bloque 4: Valor Plano & Gradación', category: 'even_value_strip', difficulty: 'Media', metrics: 'Monotonía de estratos: ρ(0) < ρ(1) < ... < ρ(5)', desc: 'Franjas curvas orográficas numeradas 0 a 5 con límites quebrados.', instruction: 'Aplica el valor plano asignado en cada estrato respetando los límites divisorios.' },
  { page: 20, code: '2.19', title: 'Direction of Gradation', block: 'Bloque 4: Valor Plano & Gradación', category: 'direction_gradation', difficulty: 'Difícil', metrics: 'Alineación de gradiente ∇ρ con vector director', desc: 'Gradientes que siguen la forma: pétalo curvo, toroide concéntrico y rampa.', instruction: 'Sombrea en degradado continuo fluyendo en la dirección que indican las flechas.' },
  { page: 21, code: '2.20', title: 'Direction of Gradation (Formas Complejas)', block: 'Bloque 4: Valor Plano & Gradación', category: 'direction_gradation', difficulty: 'Difícil', metrics: 'Gradiente de densidad longitudinal y transversal', desc: 'Collar en C, cúpula campaniforme, piragua cóncava y cono truncado.', instruction: 'Abre o cierra el espaciado para crear un degradado que acompañe el ensanchamiento.' },
  { page: 22, code: '2.21', title: 'Revealing Planes (Facetado Low-Poly)', block: 'Bloque 5: Planos, Facetas & Isometría', category: 'revealing_planes', difficulty: 'Media', metrics: 'Rectitud de facetas, cierre de polígonos', desc: 'Deconstrucción de formas redondeadas (rocas, melón) en bloques poliédricos.', instruction: 'Convierte la forma redondeada en un conjunto de facetas planas bien definidas.' },
  { page: 23, code: '2.22', title: 'Shading via Plane Breaks', block: 'Bloque 5: Planos, Facetas & Isometría', category: 'revealing_planes', difficulty: 'Media', metrics: 'Salto de valor tonal en la cresta de corte', desc: 'Sombreado de curvas orgánicas donde el valor cambia en la arista de corte.', instruction: 'Diferencia el tono a ambos lados de la cresta divisoria para acusar el plano.' },
  { page: 24, code: '2.23', title: 'Line Direction & Structure (Red Isométrica)', block: 'Bloque 5: Planos, Facetas & Isometría', category: 'isometric_rhombille', difficulty: 'Media', metrics: 'Ángulo por orientación de plano: 0°, 60°, 120°', desc: 'Panal isométrico de cubos entrelazados. La dirección de trama genera la ilusión 3D.', instruction: 'Raya las caras superiores en horizontal, las izquierdas a 60° y las derechas a 120°.' },
  { page: 25, code: '2.25', title: '3-Value Shading on Block Forms (Muestra)', block: 'Bloque 6: Sombreado de Poliedros', category: 'polyhedron_shading', difficulty: 'Media', metrics: 'Fidelidad a valores 0 (Luz), 1 (Medio), 2 (Sombra)', desc: '8 prismas en círculo alrededor de un foco solar central sombreados a 3 valores.', instruction: 'Calcula el ángulo de cada cara respecto al sol y aplica el valor 0, 1 o 2.' },
  { page: 26, code: '2.26', title: '3-Value Shading on Block Forms (Práctica)', block: 'Bloque 6: Sombreado de Poliedros', category: 'polyhedron_shading', difficulty: 'Media', metrics: 'Densidad óptica en cada cara según número', desc: 'Plantilla de práctica con números en cada cara guiados por la luz.', instruction: 'Sombrea cada plano del poliedro según el número de valor asignado.' },
  { page: 27, code: '2.27', title: 'Shading Block Forms (6-Value Range)', block: 'Bloque 6: Sombreado de Poliedros', category: 'polyhedron_shading', difficulty: 'Difícil', metrics: 'Precisión tonal en escala de 6 niveles (0 a 5)', desc: 'Poliedros complejos (caja abierta, fuelle, dodecaedro) a 6 valores tonales.', instruction: 'Aplica la escala de 6 tonos en función de la orientación tridimensional del plano.' },
  { page: 28, code: '2.28', title: 'Shading Block Forms (6-Value Practice)', block: 'Bloque 6: Sombreado de Poliedros', category: 'polyhedron_shading', difficulty: 'Difícil', metrics: 'Cumplimiento de valores 0 a 5 en cada cara', desc: 'Plantilla de práctica con poliedros complejos numerados de 0 a 5.', instruction: 'Completa el sombreado de todas las caras siguiendo la jerarquía numérica.' },
  { page: 29, code: '2.29', title: 'Clustered Cityscape (Ciudadela de Bloques)', block: 'Bloque 6: Sombreado de Poliedros', category: 'polyhedron_shading', difficulty: 'Media', metrics: 'Consistencia global de luz lejana, oclusiones', desc: 'Skyline denso de cajas solapadas bajo luz solar en la esquina superior izquierda.', instruction: 'Sombrea todos los edificios bajo una misma fuente de luz lejana común.' },
  { page: 30, code: '2.30', title: 'Complex Geometric Still Life (Sin Números)', block: 'Bloque 6: Sombreado de Poliedros', category: 'polyhedron_shading', difficulty: 'Difícil', metrics: 'Orden relativo de densidades según normales', desc: 'Bodegón de poliedros sin números guía. Deducción autónoma de valores.', instruction: 'Deduce mentalmente la orientación de cada plano respecto a la luz y sombréalo.' },
  { page: 31, code: '2.31', title: 'Dominant Form Composition (Con Números)', block: 'Bloque 6: Sombreado de Poliedros', category: 'polyhedron_shading', difficulty: 'Difícil', metrics: 'Jerarquía de valor tonal entre forma madre y satélites', desc: 'Gran caja cúbica central con solapas y cajas secundarias adheridas.', instruction: 'Sombrea el monolito central y sus elementos satélite manteniendo coherencia.' },
  { page: 32, code: '2.32', title: 'Dominant Form Composition (Sin Números)', block: 'Bloque 6: Sombreado de Poliedros', category: 'polyhedron_shading', difficulty: 'Difícil', metrics: 'Deducción autónoma bajo luz superior derecha', desc: 'Cubo dominante con poliedros encastrados y tuerca hexagonal sin guía.', instruction: 'Determina las caras en luz directa, planos oblicuos y zonas en sombra propia.' },
  { page: 33, code: '2.33', title: 'Shading Curved Surfaces (Cinta Curva)', block: 'Bloque 7: Superficies Curvas, Cilindro, Esfera', category: 'curved_surfaces', difficulty: 'Media', metrics: 'Gradiente continuo suave sin cortes duros', desc: 'Sombreado en 4 pasos de una cinta curva: base clara -> mediotono -> sombra núcleo.', instruction: 'Construye un degradado continuo que describa el alabeo de la cinta en el espacio.' },
  { page: 34, code: '2.34', title: 'Multi-Technique Ribbon Shading', block: 'Bloque 7: Superficies Curvas, Cilindro, Esfera', category: 'curved_surfaces', difficulty: 'Media', metrics: 'Gradiente continuo ejecutado en distintos estilos', desc: 'Práctica de la cinta curva con Hatching, Cross-hatch, Scribbling, Stippling, Flowing.', instruction: 'Aplica el estilo de trazo indicado manteniendo una gradación tonal fluida.' },
  { page: 35, code: '2.35', title: 'Shading Cylinders in Perspective', block: 'Bloque 7: Superficies Curvas, Cilindro, Esfera', category: 'cylinder_shading', difficulty: 'Media', metrics: 'Sombra núcleo, franja de luz reflejada', desc: 'Cilindros en perspectiva: líneas axiales vs de contorno elíptico cruzado.', instruction: 'Ubica la sombra núcleo en la generatriz opuesta y deja luz reflejada en el borde.' },
  { page: 36, code: '2.36', title: 'Shading Cylinders (6 Estilos de Tinta)', block: 'Bloque 7: Superficies Curvas, Cilindro, Esfera', category: 'cylinder_shading', difficulty: 'Media', metrics: 'Centro de masas de tinta en la sombra núcleo', desc: '6 cilindros sombreados con técnicas diversas manteniendo la física de luz.', instruction: 'Sombrea el cilindro con la técnica solicitada respetando el volumen cilíndrico.' },
  { page: 37, code: '2.37', title: 'Shading Spherical Forms (La Esfera)', block: 'Bloque 7: Superficies Curvas, Cilindro, Esfera', category: 'sphere_shading', difficulty: 'Difícil', metrics: 'Trazos en arcos elípticos meridianos, sombra terminadora', desc: 'La esfera perfecta: trazos que siguen la red de latitud/longitud esférica.', instruction: 'Curva los trazos en arcos esféricos divergiendo del brillo hacia el polo en sombra.' },
  { page: 38, code: '2.38', title: 'Simple Forms Composition', block: 'Bloque 8: Composiciones & Síntesis', category: 'composition_forms', difficulty: 'Difícil', metrics: 'Coherencia lumínica global en todas las piezas', desc: 'Bodegón de cono, cubo, esferas con varillas, cilindros y peana bajo luz.', instruction: 'Sombrea todas las primitivas de la escena bajo el mismo foco de luz unificado.' },
  { page: 39, code: '2.40', title: 'Advanced Forms Composition', block: 'Bloque 8: Composiciones & Síntesis', category: 'composition_forms', difficulty: 'Difícil', metrics: 'Sombreado mixto de caras planas y caras curvas', desc: 'Bodegón con jarrón curvo, caja de cartón con esferas, icosaedro y cilindro.', instruction: 'Integra planos rígidos facetados con superficies curvas de transición suave.' },
  { page: 40, code: '2.41', title: 'Local Value (Albedo y Material)', block: 'Bloque 8: Composiciones & Síntesis', category: 'local_value', difficulty: 'Difícil', metrics: 'Offset de albedo: Densidad = Albedo + Sombreado', desc: 'Cubos blanco, gris y negro bajo la misma luz. Sombra de blanco vs luz de negro.', instruction: 'Aplica el tono base del material antes de calcular su modulación por la luz.' },
  { page: 41, code: '2.45', title: 'Compound Forms (Fusión de Piezas)', block: 'Bloque 8: Composiciones & Síntesis', category: 'compound_forms', difficulty: 'Difícil', metrics: 'Continuidad de contornos en zonas de soldadura', desc: 'Piezas orgánicas simples que se ensamblan en una escultura única.', instruction: 'Envuelve con contornos cruzados las costuras de unión entre las piezas fusionadas.' },
  { page: 42, code: '2.46', title: 'Compound Forms — Creative Assembly', block: 'Bloque 8: Composiciones & Síntesis', category: 'compound_forms', difficulty: 'Experto', metrics: 'Fusión e interpretación guiada por silueta fantasma', desc: 'Formas flotantes para ensamblaje libre. Síntesis y creatividad pura.', instruction: 'Conecta las formas flotantes siguiendo la silueta guía y aplica luz coherente.' },
];

/**
 * Catálogo Maestro Completo: 225 Calistenias Dinámicas + 42 Páginas del Cuaderno (267 Ejercicios)
 */
export const ALL_LAB_EXERCISES: LabExerciseDef[] = [
  ...ALL_SINGLE_STROKE_EXERCISES,
  ...ALL_42_EXERCISES,
];
