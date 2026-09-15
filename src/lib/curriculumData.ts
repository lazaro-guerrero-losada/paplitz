import { PerspectiveMode, AxesMode } from './geometry';

export interface LessonNode {
  id: string;
  code: string; // '1.1', '1.2', '1.3', '1.4', '2.1', etc.
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
