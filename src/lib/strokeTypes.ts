export type StrokeExerciseCategory =
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

export interface WorkbookExerciseDef {
  page: number;
  code: string;
  title: string;
  block: string;
  category: StrokeExerciseCategory;
  difficulty: 'Fácil' | 'Media' | 'Difícil' | 'Experto';
  metrics: string;
  desc: string;
  instruction: string;
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
  avatarMood?: import('./avatarTypes').AvatarMood;
}

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
