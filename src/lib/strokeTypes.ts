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
  | 'curve_c'                // Arco C
  | 'curve_s';               // Onda S

export interface KeyPoint {
  x: number;
  y: number;
  order: number; // 1, 2, 3...
  label?: string; // "①", "②", "③"
  type?: 'start' | 'mid' | 'end';
}

export interface SingleStrokeConfig {
  direction: StrokeDirection;
  variationType: 'fixed' | 'length' | 'rotation' | 'rotation_length' | 'position' | 'position_length' | 'total_random';
  guideType: 'gray_line' | 'points_only';
  curvature?: 'subtle' | 'medium' | 'pronounced';
  baseAngleDeg?: number;
  baseLengthPx?: number;
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

  // Trazo Único Dinámico y Solución Fantasma
  isSingleStrokeAutoEval?: boolean;
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
  streak?: number;
  directionWarning?: string;
  solutionOverlay?: { points: { x: number; y: number }[]; color: string; label: string };
  avatarMood?: import('./avatarTypes').AvatarMood;
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
  baseAngleDeg?: number
): LabExerciseDef {
  return {
    id,
    family: 'calisthenics_single',
    code,
    title,
    block,
    category: direction === 'curve_c' || direction === 'curve_s' ? 'single_stroke_curve' : 'single_stroke_line',
    difficulty,
    metrics: guideType === 'gray_line' ? 'Seguimiento de guía, rectitud y dirección' : 'Puntería en dianas ① y ②, rectitud y dirección',
    desc,
    instruction,
    isSingleStroke: true,
    singleStrokeConfig: {
      direction,
      variationType,
      guideType,
      curvature,
      baseAngleDeg,
    },
  };
}

/**
 * 80 Ejercicios de Calistenia Dinámica de Trazo Único (Auto-evaluación instantánea)
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
 * Catálogo Maestro Completo: 80 Calistenias de Trazo Único + 42 Páginas del Cuaderno (122 Ejercicios)
 */
export const ALL_LAB_EXERCISES: LabExerciseDef[] = [
  ...ALL_SINGLE_STROKE_EXERCISES,
  ...ALL_42_EXERCISES,
];
