import { PerspectiveMode, AxesMode, BoxType, ViewpointMode, RotationAngleMode } from './geometry';
import { ALL_SINGLE_STROKE_EXERCISES, LabExerciseDef } from './strokeTypes';

export interface LessonNode {
  id: string;
  code: string; // '1.1', '1.2', '1.3', '1.4', '2.1', 'C1.01', 'E1.1', etc.
  title: string;
  subtitle: string;
  type: 'warmup' | 'standard' | 'rush' | 'exam';
  difficulty: 'easy' | 'medium' | 'hard';
  perspectiveMode: PerspectiveMode;
  axesMode: AxesMode;
  forceSide?: 'left' | 'right';
  status: 'completed' | 'current' | 'locked';
  score?: number;
  masteryLevel?: 1 | 2 | 3; // 1: Bronce (Precisión), 2: Plata (Fluidez), 3: Oro / Corona (Velocidad)
  xpReward: number;
  isShadowLevel?: boolean;
  hasGroundGrid?: boolean;
  isCalisthenics?: boolean;
  exerciseDef?: LabExerciseDef;
  variants?: LabExerciseDef[];
  boxType?: BoxType;
  viewpoint?: ViewpointMode;
  rotationAngle?: RotationAngleMode;
  hasHeightGuide?: boolean;
  hasHorizonGuide?: boolean;
}

export interface Unit {
  id: string;
  number: number;
  title: string;
  description: string;
  bookChapter: string;
  guidebookContent: {
    title: string;
    axioms: string[];
    diagramNotes: string;
  };
  nodes: LessonNode[];
}

export interface ModuleTrack {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  units: Unit[];
}

function createGroupedCalisthenicsNode(
  id: string,
  code: string,
  title: string,
  subtitle: string,
  variants: LabExerciseDef[],
  indexInModule: number,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  xpReward: number = 35
): LessonNode {
  const isFirst = indexInModule === 0;
  const primaryEx = variants[0] || ALL_SINGLE_STROKE_EXERCISES[0];
  return {
    id,
    code,
    title,
    subtitle: `${variants.length} versiones · ${subtitle}`,
    type: 'standard',
    difficulty,
    perspectiveMode: 'gentle',
    axesMode: 'none',
    status: isFirst ? 'current' : 'locked',
    xpReward,
    isCalisthenics: true,
    exerciseDef: primaryEx,
    variants,
  };
}

function isCoreGuidedVariant(e: LabExerciseDef): boolean {
  if (e.singleStrokeConfig?.guideType === 'points_only') return false;
  // En direcciones horizontales y verticales puras (D5, D6, D7, D8),
  // la versión 5 (total_random) es matemáticamente idéntica a la 4 (position_length)
  // porque la rotación angular está bloqueada a 0°/90°.
  // La excluimos para eliminar la repetición redundante.
  const id = e.id || '';
  if (
    (id.startsWith('d5_') || id.startsWith('d6_') || id.startsWith('d7_') || id.startsWith('d8_')) &&
    id.endsWith('_05')
  ) {
    return false;
  }
  return true;
}

/**
 * Construye las 5 Unidades Pedagógicas de Calistenia Agrupadas (Fading Scaffolding: Fase 3 es el test sin guía)
 */
function buildCalisthenicsModuleUnits(): Unit[] {
  const all = ALL_SINGLE_STROKE_EXERCISES;
  let globalIndex = 0;

  return [
    {
      id: 'unit-cal-1',
      number: 1,
      title: 'Trazos Fundamentales Ortogonales (Horizontales y Verticales)',
      description: 'Dominio de los ejes absolutos X e Y: estabilidad de muñeca, aceleración uniforme y consistencia de longitud.',
      bookChapter: 'Paplitz Calisthenics — Ejes Ortogonales D5 (→), D6 (←), D7 (↑), D8 (↓)',
      guidebookContent: {
        title: 'Estabilidad de Ejes Ortogonales',
        axioms: [
          'Bloquea la muñeca y utiliza el hombro y antebrazo como compás para garantizar rectitud.',
          'Traza con velocidad controlada desde el punto de inicio ① hasta el punto de fin ②.',
          'Mantén una presión constante de pluma durante todo el recorrido.',
          'Ajusta la postura antes de cada trazo para alinearte con la dirección solicitada.',
        ],
        diagramNotes: 'Domina los ejes ortogonales naturales (→ y ↑) antes de abordar los recorridos inversos (↓ y ←).',
      },
      nodes: [
        createGroupedCalisthenicsNode(
          'cal_u1_d5',
          'C1.1',
          'Horizontales Naturales (→)',
          'Deslizamiento de izquierda a derecha con control de inercia y longitud',
          all.filter((e) => e.id?.startsWith('d5_') && isCoreGuidedVariant(e) && e.singleStrokeConfig?.variationType !== 'multi_line'),
          globalIndex++,
          'easy',
          25
        ),
        createGroupedCalisthenicsNode(
          'cal_u1_d7',
          'C1.2',
          'Verticales Ascendentes (↑)',
          'Empuje vertical de abajo a arriba con alineación del antebrazo',
          all.filter((e) => e.id?.startsWith('d7_') && isCoreGuidedVariant(e) && e.singleStrokeConfig?.variationType !== 'multi_line'),
          globalIndex++,
          'easy',
          25
        ),
        createGroupedCalisthenicsNode(
          'cal_u1_d8',
          'C1.3',
          'Verticales Descendentes (↓)',
          'Tirón vertical hacia el cuerpo con parada milimétrica',
          all.filter((e) => e.id?.startsWith('d8_') && isCoreGuidedVariant(e) && e.singleStrokeConfig?.variationType !== 'multi_line'),
          globalIndex++,
          'medium',
          30
        ),
        createGroupedCalisthenicsNode(
          'cal_u1_d6',
          'C1.4',
          'Horizontales Inversas (←)',
          'Recogida de derecha a izquierda con frenado seco en diana',
          all.filter((e) => e.id?.startsWith('d6_') && isCoreGuidedVariant(e) && e.singleStrokeConfig?.variationType !== 'multi_line'),
          globalIndex++,
          'medium',
          30
        ),
        createGroupedCalisthenicsNode(
          'cal_u1_d_long',
          'C1.5',
          'Trazos Largos de Hombro (→ / ↑)',
          'Líneas extensas de borde a borde para soltar el brazo entero',
          all.filter((e) => e.id?.startsWith('d_long_h') || e.id?.startsWith('d_long_v')),
          globalIndex++,
          'medium',
          40
        ),
      ],
    },
    {
      id: 'unit-cal-2',
      number: 2,
      title: 'Diagonales Principales y Fugas de Perspectiva',
      description: 'Líneas dinámicas a 45° y fugas sutiles a 15°-20° para proyectar aristas en escorzo y planos oblicuos.',
      bookChapter: 'Paplitz Calisthenics — Cuadrantes Diagonales D1 (↗), D3 (↘), D2 (↙), D4 (↖), Fugas D9, D10 y Gran Diagonal C2.7',
      guidebookContent: {
        title: 'Cuadrantes Diagonales y Líneas de Fuga',
        axioms: [
          'El cuadrante natural de subida (35° a 75° ↗) requiere soltar el brazo con decisión.',
          'Las fugas suaves (~15°-20°) entrenan la convergencia hacia puntos de fuga muy lejanos.',
          'Ajusta la trayectoria en el aire antes de tocar el papel (técnica del fantasma o ghosting).',
        ],
        diagramNotes: 'En ángulos descendentes o inversos, rota mentalmente el hombro para mantener la fluidez.',
      },
      nodes: [
        createGroupedCalisthenicsNode(
          'cal_u2_d1',
          'C2.1',
          'Diagonal Ascendente Natural (↗)',
          'Lanzamiento a 45°-60° de abajo-izquierda a arriba-derecha',
          all.filter((e) => e.id?.startsWith('d1_') && isCoreGuidedVariant(e) && e.singleStrokeConfig?.variationType !== 'multi_line'),
          globalIndex++,
          'easy',
          30
        ),
        createGroupedCalisthenicsNode(
          'cal_u2_d2',
          'C2.2',
          'Diagonal Inversa al Pecho (↙)',
          'Flexión de arriba-derecha a abajo-izquierda con muñeca libre',
          all.filter((e) => e.id?.startsWith('d2_') && isCoreGuidedVariant(e) && e.singleStrokeConfig?.variationType !== 'multi_line'),
          globalIndex++,
          'medium',
          30
        ),
        createGroupedCalisthenicsNode(
          'cal_u2_d3',
          'C2.3',
          'Diagonal Descendente Externa (↘)',
          'Empuje diagonal hacia afuera de arriba-izquierda a abajo-derecha',
          all.filter((e) => e.id?.startsWith('d3_') && isCoreGuidedVariant(e) && e.singleStrokeConfig?.variationType !== 'multi_line'),
          globalIndex++,
          'medium',
          30
        ),
        createGroupedCalisthenicsNode(
          'cal_u2_d4',
          'C2.4',
          'Diagonal de Empuje Superior (↖)',
          'Ascenso hacia la esquina superior izquierda de abajo-derecha',
          all.filter((e) => e.id?.startsWith('d4_') && isCoreGuidedVariant(e) && e.singleStrokeConfig?.variationType !== 'multi_line'),
          globalIndex++,
          'medium',
          35
        ),
        createGroupedCalisthenicsNode(
          'cal_u2_d9',
          'C2.5',
          'Aristas en Fuga Suave Derecha (↗ ~18°)',
          'Pendiente baja de perspectiva cónica hacia el punto de fuga derecho',
          all.filter((e) => e.id?.startsWith('d9_') && isCoreGuidedVariant(e) && e.singleStrokeConfig?.variationType !== 'multi_line'),
          globalIndex++,
          'hard',
          40
        ),
        createGroupedCalisthenicsNode(
          'cal_u2_d10',
          'C2.6',
          'Aristas en Fuga Suave Izquierda (↖ ~18°)',
          'Pendiente baja de perspectiva cónica hacia el punto de fuga izquierdo',
          all.filter((e) => e.id?.startsWith('d10_') && isCoreGuidedVariant(e) && e.singleStrokeConfig?.variationType !== 'multi_line'),
          globalIndex++,
          'hard',
          40
        ),
        createGroupedCalisthenicsNode(
          'cal_u2_d_long',
          'C2.7',
          'Gran Diagonal Ascendente (↗)',
          'Trazo continuo de esquina a esquina cruzando todo el lienzo',
          all.filter((e) => e.id?.startsWith('d_long_diag')),
          globalIndex++,
          'medium',
          45
        ),
      ],
    },
    {
      id: 'unit-cal-3',
      number: 3,
      title: 'Multi-Líneas y Rosetas Radiales (Convergencia Focal)',
      description: 'Control de paralelismo simultáneo y proyección focal 360° desde y hacia centros de gravedad.',
      bookChapter: 'Paplitz Calisthenics — Multi-Trazo y Rosetas D11 (☼ Fuera) y D12 (❂ Dentro)',
      guidebookContent: {
        title: 'Paralelismo y Confluencia Radial',
        axioms: [
          'Mantén constante el paso interlineal en las secuencias de 2 y 3 líneas paralelas.',
          'En las rosetas divergentes (☼), proyecta cada radio a partir del núcleo con espaciado angular regular.',
          'En las rosetas convergentes (❂), apunta al punto central como blanco sin frenar antes de tiempo.',
        ],
        diagramNotes: 'Usa el centro focal como punto de anclaje visual constante en todas las direcciones.',
      },
      nodes: [
        createGroupedCalisthenicsNode(
          'cal_u3_d11',
          'C3.1',
          'Roseta Radial Divergente 360° (☼)',
          'Disparo de 8 y 12 radios regulares desde el centro hacia las dianas exteriores',
          all.filter((e) => e.id?.startsWith('d11_') && isCoreGuidedVariant(e)),
          globalIndex++,
          'medium',
          40
        ),
        createGroupedCalisthenicsNode(
          'cal_u3_d12',
          'C3.2',
          'Roseta Radial Convergente 360° (❂)',
          'Recogida de radios perimetrales hacia el núcleo central común',
          all.filter((e) => e.id?.startsWith('d12_') && isCoreGuidedVariant(e)),
          globalIndex++,
          'medium',
          40
        ),
        createGroupedCalisthenicsNode(
          'cal_u3_multi',
          'C3.3',
          'Constelaciones Multi-Línea Dispersas',
          '2 y 3 trazos independientes en cuadrantes y pendientes distintas',
          all.filter((e) => e.singleStrokeConfig?.variationType === 'multi_line'),
          globalIndex++,
          'hard',
          45
        ),
      ],
    },
    {
      id: 'unit-cal-4',
      number: 4,
      title: 'Carriles de Ritmo, Espaciado y Polígonos Concéntricos',
      description: 'Consistencia de trama en bandas y figuras concéntricas: espaciado x y x/2, quiebros, ondas y polígonos anidados.',
      bookChapter: 'Paplitz Calisthenics — Carriles y Polígonos Concéntricos C4.1 a C4.4',
      guidebookContent: {
        title: 'Espaciado Interlineal y Polígonos Concéntricos',
        axioms: [
          'Observa la muestra entintada a la izquierda y replica el paso exacto dentro de los carriles.',
          'En quiebros angulares (V, chevron, zigzag), detén el trazo secamente en el vértice antes de cambiar de dirección.',
          'En los polígonos concéntricos (△ / ▢ / ⬡), ancla cada vértice en los ejes radiales y mantén el paso constante.',
          'Respeta los límites de cada figura sin salirte ni deformar el paralelismo entre caras.',
        ],
        diagramNotes: 'El espaciado regular y el paralelismo concéntrico crean ritmos tonales y geométricos homogéneos.',
      },
      nodes: [
        createGroupedCalisthenicsNode(
          'cal_u4_straight',
          'C4.1',
          'Espaciado Ortogonal y Cuñas Angulares',
          'Bandas paralelas rectas, diagonales, quiebros en V y chevron',
          all.filter(
            (e) =>
              e.id?.startsWith('sp_') &&
              (e.spacingTrackConfig?.kinkType === 'none' ||
                e.spacingTrackConfig?.kinkType?.includes('chevron') ||
                e.spacingTrackConfig?.kinkType?.includes('v_') ||
                e.spacingTrackConfig?.kinkType?.includes('triangle') ||
                e.spacingTrackConfig?.kinkType?.includes('zigzag')) &&
              !e.spacingTrackConfig?.hasBlocksWithGaps &&
              e.spacingTrackConfig?.spacingMultiplier === 1
          ),
          globalIndex++,
          'medium',
          40
        ),
        createGroupedCalisthenicsNode(
          'cal_u4_curves',
          'C4.2',
          'Espaciado de Arcos y Ondas Curvas',
          'Ondas sinusoidales, arcos en bóveda y curvas de nivel en carril',
          all.filter((e) => e.id?.startsWith('sp_') && e.spacingTrackConfig?.kinkType?.startsWith('curve_')),
          globalIndex++,
          'hard',
          45
        ),
        createGroupedCalisthenicsNode(
          'cal_u4_density',
          'C4.3',
          'Fraccionamiento y Densidad de Trama',
          'Subdivisión de paso a la mitad (paso x/2), bloques discontinuos y densidad graduada',
          all.filter(
            (e) =>
              e.id?.startsWith('sp_') &&
              (e.spacingTrackConfig?.spacingMultiplier === 0.5 || e.spacingTrackConfig?.hasBlocksWithGaps)
          ),
          globalIndex++,
          'hard',
          50
        ),
        createGroupedCalisthenicsNode(
          'cal_u4_concentric',
          'C4.4',
          'Polígonos Concéntricos y Fugas Radiales (△ / ▢ / ⬡)',
          'Triángulos, cuadrados, diamantes y trapecios con paso y ángulos variables',
          all.filter((e) => e.id?.startsWith('cp_')),
          globalIndex++,
          'hard',
          55
        ),
      ],
    },
    {
      id: 'unit-cal-5',
      number: 5,
      title: 'Arcos y Ondas Biomecánicas (Curvas en C y S)',
      description: 'Transición a la forma orgánica: arcos parabólicos en C y curvas sinusoidales en S de cadencia continua.',
      bookChapter: 'Paplitz Calisthenics — Arcos en C (CC.01-10) y Ondas en S (CS.11-20)',
      guidebookContent: {
        title: 'Curvatura Biomecánica Continua',
        axioms: [
          'Las curvas demandan una sincronía entre el codo y la muñeca sin tirones angulares.',
          'En la onda en S, el punto de inflexión debe ser suave y continuo, sin formar esquinas.',
          'Conecta con elasticidad los puntos de cresta y valle marcados en la trayectoria.',
        ],
        diagramNotes: 'Comienza despacio en Fase 1 (Precisión) y acelera a Fase 2 (Fluidez) y Fase 3 (Velocidad).',
      },
      nodes: [
        createGroupedCalisthenicsNode(
          'cal_u5_c',
          'C5.1',
          'Control de Curvatura: Arcos en C (⌒)',
          'Arcos cóncavos y convexos de flecha suave, media y pronunciada',
          all.filter((e) => e.id?.startsWith('cc_') && isCoreGuidedVariant(e)),
          globalIndex++,
          'medium',
          35
        ),
        createGroupedCalisthenicsNode(
          'cal_u5_s',
          'C5.2',
          'Puntos de Inflexión: Ondas en S (∿)',
          'Transición de doble curvatura continua sin aristas vivas ni saltos',
          all.filter((e) => e.id?.startsWith('cs_') && isCoreGuidedVariant(e)),
          globalIndex++,
          'hard',
          45
        ),
      ],
    },
  ];
}

export const MODULE_CALISTHENICS: ModuleTrack = {
  id: 'module-calisthenics',
  name: 'Líneas, Trazos & Calistenia',
  subtitle: 'Retos dinámicos de biomecánica: precisión, fluidez, velocidad y andamiaje sin guía',
  icon: 'pen-tool',
  units: buildCalisthenicsModuleUnits(),
};

export const MODULE_PARALLELEPIPEDS: ModuleTrack = {
  id: 'module-cubes',
  name: 'Paralelepípedos & Cajas',
  subtitle: 'Completa las aristas que faltan de un cubo sólido en perspectiva',
  icon: 'cube',
  units: [
    {
      id: 'unit-1',
      number: 1,
      title: 'Iniciación al Cubo Angular (Fuga Suave)',
      description: 'Aprende las 3 direcciones espaciales con ejes X, Y, Z y completa la cara contigua y la tapa.',
      bookChapter: 'Koos Eissen — Capítulo 2: Drawing Approach & Perspective Basics',
      guidebookContent: {
        title: 'El Cubo Angular y los Ejes X, Y, Z',
        axioms: [
          'El Eje Z marca la vertical frontal del cubo.',
          'Los Ejes X e Y parten del vértice frontal hacia los puntos de fuga izquierdo y derecho.',
          'Tú decides la longitud de las aristas a lo largo de estos ejes para formar un cubo proporcionado.',
          'Cierra la tapa uniendo las esquinas traseras hacia los puntos de fuga opuestos.',
        ],
        diagramNotes: 'Primero proyecta la base sobre el eje correspondiente, levanta la vertical y une la tapa superior.',
      },
      nodes: [
        {
          id: 'u1-n1',
          code: '1.1',
          title: 'Cubo con Ejes X, Y, Z',
          subtitle: '3 ejes de apoyo proyectados (Fuga Suave)',
          type: 'warmup',
          difficulty: 'easy',
          perspectiveMode: 'gentle',
          axesMode: 'xyz',
          forceSide: 'left',
          status: 'current',
          xpReward: 15,
        },
        {
          id: 'u1-n2',
          code: '1.2',
          title: 'Cubo con Ejes (Cara Inversa)',
          subtitle: 'Ejes X, Y, Z con orientación derecha',
          type: 'standard',
          difficulty: 'easy',
          perspectiveMode: 'gentle',
          axesMode: 'xyz',
          forceSide: 'right',
          status: 'locked',
          xpReward: 20,
        },
        {
          id: 'u1-n3',
          code: '1.3',
          title: 'Ejes de Base (X e Y)',
          subtitle: 'Guía de suelo: tú proyectas la vertical Z',
          type: 'standard',
          difficulty: 'easy',
          perspectiveMode: 'gentle',
          axesMode: 'base_axes',
          status: 'locked',
          xpReward: 25,
        },
        {
          id: 'u1-n4',
          code: '1.4',
          title: 'Reto Isométrico Suave (Sin Ejes)',
          subtitle: 'Cubo sereno sin guías a 2 puntos (Ángulos paralelos ~14°)',
          type: 'rush',
          difficulty: 'easy',
          perspectiveMode: 'gentle',
          axesMode: 'none',
          status: 'locked',
          xpReward: 30,
        },
      ],
    },
    {
      id: 'unit-2',
      number: 2,
      title: 'Perspectiva Cónica (2 Puntos de Fuga)',
      description: 'Convergencia cónica acentuada, contrastes de punto de vista y rotaciones angulares asimétricas.',
      bookChapter: 'Koos Eissen — Capítulo 3: Viewpoint & Convergence',
      guidebookContent: {
        title: 'Control del Escorzo y Puntos de Fuga',
        axioms: [
          'Cuanto más se aleja una cara hacia su punto de fuga, más se estrechan sus aristas verticales.',
          'Comprueba que las líneas de la misma familia converjan visiblemente hacia la línea de horizonte.',
          'En vista cenital (ojo de pájaro), la tapa superior se abre ampliamente.',
          'En contrapicado (ojo de hormiga), la tapa se aplana en un escorzo rasante extremo.',
        ],
        diagramNotes: 'La inclinación asimétrica de caras (30°/60°) resalta una cara frontal mientras la otra se comprime.',
      },
      nodes: [
        {
          id: 'u2-n1',
          code: '2.1',
          title: 'Convergencia Cónica Natural',
          subtitle: '2 puntos de fuga marcados con convergencia visible al horizonte',
          type: 'standard',
          difficulty: 'medium',
          perspectiveMode: 'normal',
          viewpoint: 'normal',
          axesMode: 'none',
          hasHorizonGuide: true,
          status: 'locked',
          xpReward: 30,
        },
        {
          id: 'u2-n2',
          code: '2.2',
          title: 'Puntos de Vista Opuestos',
          subtitle: 'Cenital amplio (ojo de pájaro) vs Contrapicado rasante (ojo de hormiga)',
          type: 'standard',
          difficulty: 'medium',
          perspectiveMode: 'normal',
          viewpoint: 'dynamic',
          axesMode: 'none',
          hasHorizonGuide: true,
          status: 'locked',
          xpReward: 35,
        },
        {
          id: 'u2-n3',
          code: '2.3',
          title: 'Giro Angular Asimétrico (30°/60°)',
          subtitle: 'Una cara frontal dominante y la otra en escorzo pronunciado',
          type: 'standard',
          difficulty: 'medium',
          perspectiveMode: 'normal',
          rotationAngle: 'dynamic',
          axesMode: 'none',
          hasHorizonGuide: true,
          status: 'locked',
          xpReward: 40,
        },
        {
          id: 'u2-n4',
          code: '2.4',
          title: 'Examen de Perspectiva Cónica',
          subtitle: 'Supera el reto clásico a 2 puntos con >70% de precisión',
          type: 'exam',
          difficulty: 'medium',
          perspectiveMode: 'normal',
          axesMode: 'none',
          hasHorizonGuide: true,
          status: 'locked',
          xpReward: 60,
        },
      ],
    },
    {
      id: 'unit-3',
      number: 3,
      title: 'Tipologías, Alturas & Bloques Compuestos',
      description: 'Domina torres con eje de cota, losas bajas, cierre de tapas y bloques compuestos con cubo adyacente.',
      bookChapter: 'Koos Eissen — Capítulo 6: Fast and Fearless & Proportion Control',
      guidebookContent: {
        title: 'Proporciones Volumétricas & Bloques Compuestos',
        axioms: [
          'Un monolito o torre vertical (1:1:3) incluye un eje de cota H para delimitar con exactitud su coronación.',
          'Una losa o plataforma horizontal (3:3:1) entrena el control de planos de apoyo amplios y escorzo horizontal.',
          'En el cierre de tapa, une los 4 vértices superiores manteniendo la convergencia estricta hacia VPL y VPR.',
          'En bloques compuestos (escalonados), el cubo secundario comparte el plano de suelo y la pared de unión del volumen principal.',
        ],
        diagramNotes: 'En cajas esbeltas, alinea la vertical central antes de proyectar las aristas de profundidad.',
      },
      nodes: [
        {
          id: 'u3-n1',
          code: '3.1',
          title: 'Torre con Eje de Altura (H)',
          subtitle: 'Proporción esbelta 1:1:3 guiada por eje de cota vertical',
          type: 'standard',
          difficulty: 'medium',
          perspectiveMode: 'normal',
          boxType: 'tower',
          hasHeightGuide: true,
          hasHorizonGuide: true,
          axesMode: 'height_axis',
          status: 'locked',
          xpReward: 45,
        },
        {
          id: 'u3-n2',
          code: '3.2',
          title: 'Losa / Plataforma Horizontal',
          subtitle: 'Proporción apaisada 3:3:1 (Superficie de apoyo ancha)',
          type: 'standard',
          difficulty: 'medium',
          perspectiveMode: 'normal',
          boxType: 'slab',
          axesMode: 'none',
          hasHorizonGuide: true,
          status: 'locked',
          xpReward: 50,
        },
        {
          id: 'u3-n3',
          code: '3.3',
          title: 'Cierre de Tapa Superior',
          subtitle: 'Estructura vertical dada: completa el techo en fuga exacta',
          type: 'standard',
          difficulty: 'medium',
          perspectiveMode: 'normal',
          boxType: 'missing_lid',
          axesMode: 'none',
          hasHorizonGuide: true,
          status: 'locked',
          xpReward: 55,
        },
        {
          id: 'u3-n4',
          code: '3.4',
          title: 'Bloque Escalonado (Cubo Doble)',
          subtitle: 'Cubo principal con cubo chico acoplado en el suelo lateral',
          type: 'rush',
          difficulty: 'hard',
          perspectiveMode: 'normal',
          boxType: 'step_block',
          axesMode: 'none',
          hasHorizonGuide: true,
          status: 'locked',
          xpReward: 70,
        },
        {
          id: 'u3-n5',
          code: '3.5',
          title: 'Examen de Proporción Espacial',
          subtitle: 'Supera el reto de monolitos, losas y cajas libres con >70%',
          type: 'exam',
          difficulty: 'hard',
          perspectiveMode: 'dynamic',
          boxType: 'dynamic',
          axesMode: 'none',
          hasHorizonGuide: true,
          status: 'locked',
          xpReward: 85,
        },
      ],
    },
    {
      id: 'unit-4',
      number: 4,
      title: 'Sombras Arrojadas & Iluminación Técnica',
      description: 'Proyecta la sombra exacta sobre el plano horizontal a partir de un foco de luz L y su base L\'.',
      bookChapter: 'Scott Robertson & Koos Eissen — Capítulo 8: Shadow Projection in Perspective',
      guidebookContent: {
        title: 'Sombras Arrojadas en Perspectiva sobre Plano Horizontal',
        axioms: [
          'El Foco L en el aire emite los rayos de luz a través de las esquinas superiores de la caja.',
          'La Base L\' en el suelo proyecta los rayos de suelo a través de las esquinas de apoyo.',
          'El punto donde se cortan el rayo de luz (desde L) y el de suelo (desde L\') es el vértice de sombra (S).',
          'En torres altas la sombra se estira longitudinalmente; en losas bajas la sombra es compacta.',
        ],
        diagramNotes: 'El mallado cuadrado del suelo te ayuda a calibrar la profundidad antes de proyectar.',
      },
      nodes: [
        {
          id: 'u4-n1',
          code: '4.1',
          title: 'Sombra del Cubo Equilibrado (1:1:1)',
          subtitle: 'Proyección sobre cuadrícula de suelo para un cubo puro de lados iguales',
          type: 'standard',
          difficulty: 'medium',
          perspectiveMode: 'normal',
          boxType: 'cube',
          axesMode: 'none',
          hasHorizonGuide: true,
          status: 'locked',
          xpReward: 70,
          isShadowLevel: true,
          hasGroundGrid: true,
        },
        {
          id: 'u4-n2',
          code: '4.2',
          title: 'Sombra de Torre Vertical',
          subtitle: 'Proyección alargada para volumen esbelto sobre mallado de suelo',
          type: 'standard',
          difficulty: 'hard',
          perspectiveMode: 'normal',
          boxType: 'tower',
          axesMode: 'none',
          hasHorizonGuide: true,
          status: 'locked',
          xpReward: 80,
          isShadowLevel: true,
          hasGroundGrid: true,
        },
        {
          id: 'u4-n3',
          code: '4.3',
          title: 'Sombra de Losa Horizontal',
          subtitle: 'Proyección ancha y concentrada para plataforma plana sobre suelo',
          type: 'standard',
          difficulty: 'hard',
          perspectiveMode: 'normal',
          boxType: 'slab',
          axesMode: 'none',
          hasHorizonGuide: true,
          status: 'locked',
          xpReward: 85,
          isShadowLevel: true,
          hasGroundGrid: true,
        },
        {
          id: 'u4-n4',
          code: '4.4',
          title: 'Examen de Sombra Libre (Maestría)',
          subtitle: 'Proyección sin mallado de suelo con proporciones de caja variadas',
          type: 'exam',
          difficulty: 'hard',
          perspectiveMode: 'normal',
          boxType: 'dynamic',
          axesMode: 'none',
          hasHorizonGuide: true,
          status: 'locked',
          xpReward: 110,
          isShadowLevel: true,
          hasGroundGrid: false,
        },
      ],
    },
  ],
};

export const ALL_MODULES: ModuleTrack[] = [
  MODULE_CALISTHENICS,
  MODULE_PARALLELEPIPEDS,
];

