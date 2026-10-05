import { PerspectiveMode, AxesMode } from './geometry';
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
  xpReward: number;
  isShadowLevel?: boolean;
  hasGroundGrid?: boolean;
  isCalisthenics?: boolean;
  exerciseDef?: LabExerciseDef;
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

/**
 * Convierte un ejercicio de calistenia del catálogo a un nodo del Camino
 */
function calisthenicsExerciseToNode(ex: LabExerciseDef, indexInModule: number): LessonNode {
  const isFirst = indexInModule === 0;
  const isExam = ex.title.toLowerCase().includes('maestría') || ex.title.toLowerCase().includes('examen');
  const isRush = ex.title.toLowerCase().includes('racha') || ex.title.toLowerCase().includes('velocidad');
  const isWarmup = ex.title.toLowerCase().includes('fija') || ex.title.toLowerCase().includes('primer contacto');

  return {
    id: `cal-${ex.id || ex.code.toLowerCase().replace('.', '_')}`,
    code: ex.code,
    title: ex.title,
    subtitle: ex.desc || ex.metrics || '',
    type: isExam ? 'exam' : isRush ? 'rush' : isWarmup ? 'warmup' : 'standard',
    difficulty: ex.difficulty === 'Fácil' ? 'easy' : ex.difficulty === 'Media' ? 'medium' : 'hard',
    perspectiveMode: 'gentle',
    axesMode: 'none',
    status: isFirst ? 'current' : 'locked',
    xpReward: ex.difficulty === 'Fácil' ? 20 : ex.difficulty === 'Media' ? 30 : 45,
    isCalisthenics: true,
    exerciseDef: ex,
  };
}

/**
 * Construye las 5 Unidades Pedagógicas de Calistenia (237 Retos Dinámicos)
 */
function buildCalisthenicsModuleUnits(): Unit[] {
  const all = ALL_SINGLE_STROKE_EXERCISES;
  const isMulti = (id: string) =>
    ['d1_15', 'd1_16', 'd1_17', 'd2_15', 'd2_16', 'd2_17', 'd3_15', 'd3_16', 'd3_17', 'd4_15', 'd4_16', 'd4_17'].includes(id);

  // U1: Fundamentos Ortogonales (Horizontales y Verticales) — 52 ejercicios
  const u1Exercises = all.filter((e) => {
    const id = e.id || '';
    return id.startsWith('d5_') || id.startsWith('d6_') || id.startsWith('d7_') || id.startsWith('d8_');
  });

  // U2: Diagonales & Perspectiva — 90 ejercicios
  const u2Exercises = all.filter((e) => {
    const id = e.id || '';
    return (
      ((id.startsWith('d1_') || id.startsWith('d2_') || id.startsWith('d3_') || id.startsWith('d4_')) && !isMulti(id)) ||
      id.startsWith('d9_') ||
      id.startsWith('d10_')
    );
  });

  // U3: Multi-Líneas & Rosetas Radiales — 50 ejercicios
  const u3Exercises = all.filter((e) => {
    const id = e.id || '';
    return isMulti(id) || id.startsWith('d11_') || id.startsWith('d12_');
  });

  // U4: Arcos & Ondas Biomecánicas (C & S) — 20 ejercicios
  const u4Exercises = all.filter((e) => {
    const id = e.id || '';
    return id.startsWith('cc_') || id.startsWith('cs_');
  });

  // U5: Carriles y Espaciado Rítmico — 25 ejercicios
  const u5Exercises = all.filter((e) => {
    const id = e.id || '';
    return id.startsWith('sp_');
  });

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
        diagramNotes: 'Primero domina la dirección natural de izquierda a derecha antes de pasar a la inversa.',
      },
      nodes: u1Exercises.map((e) => calisthenicsExerciseToNode(e, globalIndex++)),
    },
    {
      id: 'unit-cal-2',
      number: 2,
      title: 'Diagonales Principales y Fugas de Perspectiva',
      description: 'Líneas dinámicas a 45° y fugas sutiles a 15°-20° para proyectar aristas en escorzo y planos oblicuos.',
      bookChapter: 'Paplitz Calisthenics — Cuadrantes Diagonales D1 (↗), D3 (↘), D2 (↙), D4 (↖) y Fugas D9, D10',
      guidebookContent: {
        title: 'Cuadrantes Diagonales y Líneas de Fuga',
        axioms: [
          'El cuadrante natural de subida (35° a 75° ↗) requiere soltar el brazo con decisión.',
          'Las fugas suaves (~15°-20°) entrenan la convergencia hacia puntos de fuga muy lejanos.',
          'Ajusta la trayectoria en el aire antes de tocar el papel (técnica del fantasma o ghosting).',
        ],
        diagramNotes: 'En ángulos descendentes o inversos, rota mentalmente el hombro para mantener la fluidez.',
      },
      nodes: u2Exercises.map((e) => calisthenicsExerciseToNode(e, globalIndex++)),
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
      nodes: u3Exercises.map((e) => calisthenicsExerciseToNode(e, globalIndex++)),
    },
    {
      id: 'unit-cal-4',
      number: 4,
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
      nodes: u4Exercises.map((e) => calisthenicsExerciseToNode(e, globalIndex++)),
    },
    {
      id: 'unit-cal-5',
      number: 5,
      title: 'Carriles de Ritmo y Espaciado Interlineal',
      description: 'Consistencia de trama en bandas acotadas: espaciado x y x/2, diagonales, quiebros en V, relámpagos y ondas.',
      bookChapter: 'Paplitz Calisthenics — Carriles y Espaciado Rítmico E1.1 a E17.1',
      guidebookContent: {
        title: 'Espaciado Interlineal y Muros de Carril',
        axioms: [
          'Observa la muestra entintada a la izquierda y replica el paso exacto dentro de los carriles.',
          'En quiebros angulares (V, chevron, zigzag), detén el trazo secamente en el vértice antes de cambiar de dirección.',
          'Respeta los límites superior e inferior de cada franja sin salirte ni quedarte corto.',
        ],
        diagramNotes: 'El espaciado regular crea valores tonales homogéneos fundamentales para el render.',
      },
      nodes: u5Exercises.map((e) => calisthenicsExerciseToNode(e, globalIndex++)),
    },
  ];
}

export const MODULE_CALISTHENICS: ModuleTrack = {
  id: 'module-calisthenics',
  name: 'Líneas, Trazos & Calistenia',
  subtitle: '237 retos dinámicos de biomecánica: precisión, fluidez, velocidad y ritmo',
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
          title: 'Reto Libre (Sin Ejes)',
          subtitle: 'Completa el cubo a 2 puntos sin asistencia',
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
      title: 'Perspectiva Clásica (2 Puntos de Fuga)',
      description: 'El formato estándar: mayor variedad de ángulos, alturas de horizonte y control de escorzo.',
      bookChapter: 'Koos Eissen — Capítulo 3: Viewpoint & Convergence',
      guidebookContent: {
        title: 'Control del Escorzo y Puntos de Fuga',
        axioms: [
          'Cuanto más se aleja una cara hacia su punto de fuga, más se estrechan sus aristas verticales.',
          'Comprueba que las líneas de la misma familia converjan hacia el mismo punto en el horizonte.',
        ],
        diagramNotes: 'La cara superior debe verse como un romboide proporcionado.',
      },
      nodes: [
        {
          id: 'u2-n1',
          code: '2.1',
          title: 'Perspectiva Normal',
          subtitle: 'Convergencia y proporciones naturales',
          type: 'standard',
          difficulty: 'medium',
          perspectiveMode: 'normal',
          axesMode: 'none',
          status: 'locked',
          xpReward: 30,
        },
        {
          id: 'u2-n2',
          code: '2.2',
          title: 'Variaciones de Altura',
          subtitle: 'Cubos vistos desde arriba y abajo',
          type: 'standard',
          difficulty: 'medium',
          perspectiveMode: 'normal',
          axesMode: 'none',
          status: 'locked',
          xpReward: 35,
        },
        {
          id: 'u2-n3',
          code: '2.3',
          title: 'Ángulos Pronunciados',
          subtitle: 'Control del escorzo en caras laterales',
          type: 'standard',
          difficulty: 'medium',
          perspectiveMode: 'normal',
          axesMode: 'none',
          status: 'locked',
          xpReward: 40,
        },
        {
          id: 'u2-n4',
          code: '2.4',
          title: 'Examen de Nivel',
          subtitle: 'Supera el reto clásico con >70% de precisión',
          type: 'exam',
          difficulty: 'medium',
          perspectiveMode: 'normal',
          axesMode: 'none',
          status: 'locked',
          xpReward: 60,
        },
      ],
    },
    {
      id: 'unit-3',
      number: 3,
      title: 'Perspectiva Dinámica y Dramática',
      description: 'Puntos de fuga más cercanos con escorzo pronunciado para bocetado rápido de producto.',
      bookChapter: 'Koos Eissen — Capítulo 6: Fast and Fearless',
      guidebookContent: {
        title: 'Perspectiva Acelerada',
        axioms: [
          'Útil para darle impacto a objetos en diseño de producto.',
          'Requiere trazos firmes sin repasar dos veces la misma línea.',
        ],
        diagramNotes: 'Mantén la calma y confía en el primer trazo.',
      },
      nodes: [
        {
          id: 'u3-n1',
          code: '3.1',
          title: 'Escorzo Acelerado',
          subtitle: 'Puntos de fuga cercanos para bocetado ágil',
          type: 'standard',
          difficulty: 'hard',
          perspectiveMode: 'dynamic',
          axesMode: 'none',
          status: 'locked',
          xpReward: 45,
        },
        {
          id: 'u3-n2',
          code: '3.2',
          title: 'Desafío Dinámico Pro',
          subtitle: 'Trazos firmes en perspectiva extrema',
          type: 'rush',
          difficulty: 'hard',
          perspectiveMode: 'dynamic',
          axesMode: 'none',
          status: 'locked',
          xpReward: 70,
        },
      ],
    },
    {
      id: 'unit-4',
      number: 4,
      title: 'Sombras Arrojadas & Iluminación Técnica',
      description: 'Proyecta la sombra exacta de un cubo sólido sobre el plano horizontal a partir de un foco de luz L y su base L\'.',
      bookChapter: 'Scott Robertson & Koos Eissen — Capítulo 8: Shadow Projection in Perspective',
      guidebookContent: {
        title: 'Sombras Arrojadas en Perspectiva sobre Plano Horizontal',
        axioms: [
          'El Foco L en el aire emite los rayos de luz a través de las esquinas superiores del cubo.',
          'La Base L\' en el suelo proyecta los rayos de suelo a través de las esquinas de la base del cubo.',
          'El punto donde se cortan el rayo de luz (desde L) y el de suelo (desde L\') es el vértice de sombra (S).',
          'Une los vértices de sombra con las esquinas de apoyo del cubo para delimitar la silueta en el plano.',
        ],
        diagramNotes: 'El mallado cuadrado del suelo te ayuda a visualizar la profundidad y el plano horizontal antes de proyectar.',
      },
      nodes: [
        {
          id: 'u4-n1',
          code: '4.1',
          title: 'Sombra con Suelo Guía',
          subtitle: 'Proyección sobre mallado cuadrado de suelo horizontal',
          type: 'standard',
          difficulty: 'medium',
          perspectiveMode: 'normal',
          axesMode: 'none',
          status: 'locked',
          xpReward: 80,
          isShadowLevel: true,
          hasGroundGrid: true,
        },
        {
          id: 'u4-n2',
          code: '4.2',
          title: 'Sombra Libre (Examen de Maestría)',
          subtitle: 'Proyección sobre plano horizontal puro sin mallado de suelo',
          type: 'exam',
          difficulty: 'hard',
          perspectiveMode: 'normal',
          axesMode: 'none',
          status: 'locked',
          xpReward: 100,
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

