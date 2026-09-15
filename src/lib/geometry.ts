/**
 * Paplitz - Motor de Geometría en Perspectiva con Pistas y Guías Didácticas
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface Edge {
  start: number;
  end: number;
  family: 'width' | 'height' | 'depth';
}

export interface Face {
  name: string;
  vertices: [number, number, number, number];
}

export type PerspectiveMode = 'guided' | 'gentle' | 'normal' | 'dynamic';
export type AxesMode = 'xyz' | 'base_axes' | 'none';

export interface CoordinateAxis {
  id: 'X' | 'Y' | 'Z';
  label: string;
  origin: Point2D;
  farPoint: Point2D;
}

export interface LightSource {
  light2D: Point2D;          // Foco de luz en el aire (L)
  groundStation2D: Point2D;  // Base del foco en el plano horizontal (L')
  side: 'left' | 'right';
}

export interface ShadowTargetEdge {
  start: Point2D;
  end: Point2D;
  label: string;
}

export interface ShadowChallengeData {
  light: LightSource;
  shadowVertices2D: Point2D[];
  shadowPolygon: Point2D[];
  targetEdges: ShadowTargetEdge[];
  constructionRays: {
    fromLight: { start: Point2D; end: Point2D };
    fromGround: { start: Point2D; end: Point2D };
    intersection: Point2D;
  }[];
}

export interface CubeChallenge {
  id: string;
  seed: number;
  mode: PerspectiveMode;
  axesMode: AxesMode;
  axes: CoordinateAxis[];
  horizonY: number;
  givenSide: 'left' | 'right';
  vertices2D: Point2D[];
  edges: Edge[];
  givenFace: Face;
  givenEdges: Edge[];
  hintEdges: Edge[]; // Mantenido para retrocompatibilidad
  targetEdges: Edge[];
  targetVertices2D: { [key: number]: Point2D };
  isShadowLevel?: boolean;
  hasGroundGrid?: boolean;
  shadowData?: ShadowChallengeData;
}

function pseudoRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Genera un cubo con proporciones calibradas:
 * - El cubo ocupa ~270 x 240 px, centrado en el lienzo.
 * - Soporta ejes de coordenadas finos y largos X, Y, Z para guiar la fuga sin fijar la longitud de las aristas.
 */
export function generateCubeChallenge(
  seed: number = Math.floor(Math.random() * 1000000),
  canvasWidth: number = 600,
  canvasHeight: number = 540,
  options: {
    mode?: PerspectiveMode;
    axesMode?: AxesMode;
    forceSide?: 'left' | 'right';
    isShadowLevel?: boolean;
    hasGroundGrid?: boolean;
  } = {}
): CubeChallenge {
  const rnd = pseudoRandom(seed);
  const isShadow = !!options.isShadowLevel;
  const hasGroundGrid = isShadow ? (options.hasGroundGrid !== undefined ? options.hasGroundGrid : true) : false;
  const mode: PerspectiveMode = isShadow ? 'normal' : (options.mode || (options.axesMode && options.axesMode !== 'none' ? 'guided' : 'normal'));
  const axesMode: AxesMode = isShadow ? 'none' : (options.axesMode !== undefined 
    ? options.axesMode 
    : (mode === 'guided' ? 'xyz' : 'none'));

  const lightSide: 'left' | 'right' = options.forceSide || (rnd() > 0.5 ? 'left' : 'right');
  const cx = isShadow ? (lightSide === 'left' ? 260 : 340) : canvasWidth / 2;
  const cy = isShadow ? 245 : canvasHeight / 2;

  // Proporciones calibradas (en sombras un cubo ligeramente más compacto para holgura de sombra)
  const height = isShadow ? 95 : 150 + rnd() * 18;
  const leftWidth = isShadow ? 85 : 115 + rnd() * 20;
  const rightWidth = isShadow ? 85 : 115 + rnd() * 20;

  const slopeFactor = isShadow ? 0.17 : (mode === 'guided' || mode === 'gentle' ? 0.18 : mode === 'dynamic' ? 0.28 : 0.22);
  const leftSlope = leftWidth * slopeFactor;
  const rightSlope = rightWidth * slopeFactor;

  const frontX = cx;
  const frontYBottom = cy + height * 0.38;
  const frontYTop = frontYBottom - height;

  const leftX = frontX - leftWidth;
  const leftYTop = frontYTop - leftSlope;
  const leftYBottom = frontYBottom - leftSlope * 0.85;

  const rightX = frontX + rightWidth;
  const rightYTop = frontYTop - rightSlope;
  const rightYBottom = frontYBottom - rightSlope * 0.85;

  const backX = frontX - leftWidth + rightWidth;
  const backYTop = leftYTop - rightSlope;

  // Vértices:
  // 0: Frontal Abajo
  // 1: Frontal Arriba
  // 2: Izquierda Abajo
  // 3: Izquierda Arriba
  // 4: Derecha Abajo
  // 5: Derecha Arriba
  // 6: Trasero Arriba (Tapa)
  const vertices2D: Point2D[] = [
    { x: frontX, y: frontYBottom }, // 0
    { x: frontX, y: frontYTop },    // 1
    { x: leftX,  y: leftYBottom },  // 2
    { x: leftX,  y: leftYTop },     // 3
    { x: rightX, y: rightYBottom }, // 4
    { x: rightX, y: rightYTop },    // 5
    { x: backX,  y: backYTop },     // 6
  ];

  const givenSide: 'left' | 'right' = options.forceSide || (rnd() > 0.5 ? 'left' : 'right');

  let givenFace: Face;
  let givenEdges: Edge[];
  let allTargetEdges: Edge[];
  const hintEdges: Edge[] = [];

  if (givenSide === 'left') {
    givenFace = {
      name: 'Cara Izquierda',
      vertices: [0, 1, 3, 2],
    };

    givenEdges = [
      { start: 0, end: 1, family: 'height' },
      { start: 1, end: 3, family: 'width' },
      { start: 3, end: 2, family: 'height' },
      { start: 2, end: 0, family: 'width' },
    ];

    allTargetEdges = [
      { start: 0, end: 4, family: 'depth' },  // Base derecha
      { start: 1, end: 5, family: 'depth' },  // Techo derecho
      { start: 4, end: 5, family: 'height' }, // Vertical derecha
      { start: 3, end: 6, family: 'depth' },  // Tapa hacia atrás-der
      { start: 5, end: 6, family: 'width' },  // Tapa hacia atrás-izq
    ];
  } else {
    givenFace = {
      name: 'Cara Derecha',
      vertices: [0, 1, 5, 4],
    };

    givenEdges = [
      { start: 0, end: 1, family: 'height' },
      { start: 1, end: 5, family: 'depth' },
      { start: 5, end: 4, family: 'height' },
      { start: 4, end: 0, family: 'depth' },
    ];

    allTargetEdges = [
      { start: 0, end: 2, family: 'width' },  // Base izquierda
      { start: 1, end: 3, family: 'width' },  // Techo izquierdo
      { start: 2, end: 3, family: 'height' }, // Vertical izquierda
      { start: 5, end: 6, family: 'width' },  // Tapa hacia atrás-izq
      { start: 3, end: 6, family: 'depth' },  // Tapa hacia atrás-der
    ];
  }

  // Las aristas que debe dibujar el usuario: las 5 aristas faltantes (o vacío en nivel de sombras)
  const targetEdges = isShadow ? [] : allTargetEdges;

  let shadowData: ShadowChallengeData | undefined = undefined;

  if (isShadow) {
    // En nivel de sombra, el cubo ya está completamente construido (las 9 aristas visibles dadas)
    givenEdges = [
      { start: 0, end: 1, family: 'height' },
      { start: 1, end: 3, family: 'width' },
      { start: 3, end: 2, family: 'height' },
      { start: 2, end: 0, family: 'width' },
      { start: 1, end: 5, family: 'depth' },
      { start: 5, end: 4, family: 'height' },
      { start: 4, end: 0, family: 'depth' },
      { start: 3, end: 6, family: 'depth' },
      { start: 5, end: 6, family: 'width' },
    ];

    const lightX = lightSide === 'left' ? 95 : 505;
    const lightY = 28;
    const groundStationY = 230;

    const light2D: Point2D = { x: lightX, y: lightY };
    const groundStation2D: Point2D = { x: lightX, y: groundStationY };
    const lightSource: LightSource = { light2D, groundStation2D, side: lightSide };

    const H_light = groundStationY - lightY;

    if (lightSide === 'left') {
      // 3 postes verticales que delimitan la silueta de sombra (de izq a der):
      // 1. Poste izquierdo: V2 (suelo) -> V3 (techo)
      const H_edge1 = vertices2D[2].y - vertices2D[3].y;
      const u1 = H_light / (H_light - H_edge1);
      const S1: Point2D = {
        x: Math.round(lightX + u1 * (vertices2D[2].x - lightX)),
        y: Math.round(groundStationY + u1 * (vertices2D[2].y - groundStationY)),
      };

      // 2. Poste frontal central: V0 (suelo) -> V1 (techo)
      const H_edge2 = vertices2D[0].y - vertices2D[1].y;
      const u2 = H_light / (H_light - H_edge2);
      const S2: Point2D = {
        x: Math.round(lightX + u2 * (vertices2D[0].x - lightX)),
        y: Math.round(groundStationY + u2 * (vertices2D[0].y - groundStationY)),
      };

      // 3. Poste derecho: V4 (suelo) -> V5 (techo)
      const H_edge3 = vertices2D[4].y - vertices2D[5].y;
      const u3 = H_light / (H_light - H_edge3);
      const S3: Point2D = {
        x: Math.round(lightX + u3 * (vertices2D[4].x - lightX)),
        y: Math.round(groundStationY + u3 * (vertices2D[4].y - groundStationY)),
      };

      const shadowVertices2D = [S1, S2, S3];
      const shadowPolygon = [vertices2D[2], S1, S2, S3, vertices2D[4], vertices2D[0]];
      const targetShadowEdges: ShadowTargetEdge[] = [
        { start: vertices2D[2], end: S1, label: 'Rayo Suelo Izquierdo' },
        { start: S1, end: S2, label: 'Cresta Superior Izquierda' },
        { start: S2, end: S3, label: 'Cresta Superior Derecha' },
        { start: S3, end: vertices2D[4], label: 'Rayo Suelo Derecho' },
      ];

      const constructionRays = [
        { fromLight: { start: light2D, end: S1 }, fromGround: { start: groundStation2D, end: S1 }, intersection: S1 },
        { fromLight: { start: light2D, end: S2 }, fromGround: { start: groundStation2D, end: S2 }, intersection: S2 },
        { fromLight: { start: light2D, end: S3 }, fromGround: { start: groundStation2D, end: S3 }, intersection: S3 },
      ];

      shadowData = {
        light: lightSource,
        shadowVertices2D,
        shadowPolygon,
        targetEdges: targetShadowEdges,
        constructionRays,
      };
    } else {
      // Luz desde la derecha: los postes proyectan la sombra hacia la izquierda
      // 1. Poste derecho: V4 (suelo) -> V5 (techo)
      const H_edge1 = vertices2D[4].y - vertices2D[5].y;
      const u1 = H_light / (H_light - H_edge1);
      const S1: Point2D = {
        x: Math.round(lightX + u1 * (vertices2D[4].x - lightX)),
        y: Math.round(groundStationY + u1 * (vertices2D[4].y - groundStationY)),
      };

      // 2. Poste frontal central: V0 (suelo) -> V1 (techo)
      const H_edge2 = vertices2D[0].y - vertices2D[1].y;
      const u2 = H_light / (H_light - H_edge2);
      const S2: Point2D = {
        x: Math.round(lightX + u2 * (vertices2D[0].x - lightX)),
        y: Math.round(groundStationY + u2 * (vertices2D[0].y - groundStationY)),
      };

      // 3. Poste izquierdo: V2 (suelo) -> V3 (techo)
      const H_edge3 = vertices2D[2].y - vertices2D[3].y;
      const u3 = H_light / (H_light - H_edge3);
      const S3: Point2D = {
        x: Math.round(lightX + u3 * (vertices2D[2].x - lightX)),
        y: Math.round(groundStationY + u3 * (vertices2D[2].y - groundStationY)),
      };

      const shadowVertices2D = [S1, S2, S3];
      const shadowPolygon = [vertices2D[4], S1, S2, S3, vertices2D[2], vertices2D[0]];
      const targetShadowEdges: ShadowTargetEdge[] = [
        { start: vertices2D[4], end: S1, label: 'Rayo Suelo Derecho' },
        { start: S1, end: S2, label: 'Cresta Superior Derecha' },
        { start: S2, end: S3, label: 'Cresta Superior Izquierda' },
        { start: S3, end: vertices2D[2], label: 'Rayo Suelo Izquierdo' },
      ];

      const constructionRays = [
        { fromLight: { start: light2D, end: S1 }, fromGround: { start: groundStation2D, end: S1 }, intersection: S1 },
        { fromLight: { start: light2D, end: S2 }, fromGround: { start: groundStation2D, end: S2 }, intersection: S2 },
        { fromLight: { start: light2D, end: S3 }, fromGround: { start: groundStation2D, end: S3 }, intersection: S3 },
      ];

      shadowData = {
        light: lightSource,
        shadowVertices2D,
        shadowPolygon,
        targetEdges: targetShadowEdges,
        constructionRays,
      };
    }
  }

  // Cálculo de los ejes de referencia proyectados X, Y, Z (proporción óptima)
  const axes: CoordinateAxis[] = [];
  const axisZ: CoordinateAxis = {
    id: 'Z',
    label: 'Z',
    origin: vertices2D[0],
    farPoint: { x: vertices2D[0].x, y: vertices2D[0].y - (height + 65) },
  };

  const axisX: CoordinateAxis = {
    id: 'X',
    label: 'X',
    origin: vertices2D[0],
    farPoint: {
      x: vertices2D[0].x + (vertices2D[2].x - vertices2D[0].x) * 1.55,
      y: vertices2D[0].y + (vertices2D[2].y - vertices2D[0].y) * 1.55,
    },
  };

  const axisY: CoordinateAxis = {
    id: 'Y',
    label: 'Y',
    origin: vertices2D[0],
    farPoint: {
      x: vertices2D[0].x + (vertices2D[4].x - vertices2D[0].x) * 1.55,
      y: vertices2D[0].y + (vertices2D[4].y - vertices2D[0].y) * 1.55,
    },
  };

  if (!isShadow && axesMode === 'xyz') {
    axes.push(axisX, axisY, axisZ);
  } else if (!isShadow && axesMode === 'base_axes') {
    axes.push(axisX, axisY);
  }

  const givenVertexSet = new Set(givenFace.vertices);

  const targetVertices2D: { [key: number]: Point2D } = {};
  vertices2D.forEach((p, idx) => {
    if (!givenVertexSet.has(idx)) {
      targetVertices2D[idx] = p;
    }
  });

  const horizonY = frontYTop - 45;

  return {
    id: `cube-${seed}`,
    seed,
    mode,
    axesMode,
    axes,
    horizonY,
    givenSide,
    vertices2D,
    edges: [...givenEdges, ...targetEdges],
    givenFace,
    givenEdges,
    hintEdges,
    targetEdges,
    targetVertices2D,
    isShadowLevel: isShadow,
    hasGroundGrid,
    shadowData,
  };
}

export interface BoundingBox2D {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Confinamiento geométrico estricto:
 * Recorta un eje o vector de proyección desde su origen para que permanezca
 * dentro de un rectángulo delimitador, dejando holgura perimetral para flechas y texto.
 */
export function clampRayToBox(
  ox: number,
  oy: number,
  rawFx: number,
  rawFy: number,
  box: BoundingBox2D,
  endPadding: number = 0
): Point2D {
  const dx = rawFx - ox;
  const dy = rawFy - oy;
  const rawDist = Math.hypot(dx, dy);
  if (rawDist < 0.001) return { x: rawFx, y: rawFy };

  const ux = dx / rawDist;
  const uy = dy / rawDist;

  let maxDist = rawDist;

  // Intersección con los bordes horizontales del recuadro
  if (ux > 0.0001) {
    maxDist = Math.min(maxDist, (box.right - ox) / ux);
  } else if (ux < -0.0001) {
    maxDist = Math.min(maxDist, (box.left - ox) / ux);
  }

  // Intersección con los bordes verticales del recuadro
  if (uy > 0.0001) {
    maxDist = Math.min(maxDist, (box.bottom - oy) / uy);
  } else if (uy < -0.0001) {
    maxDist = Math.min(maxDist, (box.top - oy) / uy);
  }

  const safeDist = Math.max(5, Math.min(rawDist, maxDist - endPadding));

  return {
    x: ox + ux * safeDist,
    y: oy + uy * safeDist,
  };
}
