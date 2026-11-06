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
  vertices: number[];
}

export type PerspectiveMode = 'guided' | 'gentle' | 'normal' | 'dynamic';
export type AxesMode = 'xyz' | 'base_axes' | 'height_axis' | 'none';
export type BoxType = 'cube' | 'tower' | 'slab' | 'step_block' | 'missing_lid' | 'dynamic';
export type ViewpointMode = 'normal' | 'high' | 'low' | 'dynamic';
export type RotationAngleMode = 'symmetric' | 'steep_left' | 'steep_right' | 'dynamic';

export interface HeightGuide {
  x: number;
  yBottom: number;
  yTop: number;
  label: string;
}

export interface CubeChallengeOptions {
  mode?: PerspectiveMode;
  axesMode?: AxesMode;
  forceSide?: 'left' | 'right';
  isShadowLevel?: boolean;
  hasGroundGrid?: boolean;
  boxType?: BoxType;
  viewpoint?: ViewpointMode;
  rotationAngle?: RotationAngleMode;
  hasHeightGuide?: boolean;
  hasHorizonGuide?: boolean;
}

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
  vanishingPointLeft?: Point2D;
  vanishingPointRight?: Point2D;
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
  boxType?: BoxType;
  viewpoint?: ViewpointMode;
  rotationAngle?: RotationAngleMode;
  heightGuide?: HeightGuide;
  hasHorizonGuide?: boolean;
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
 * Genera un paralelepípedo / cubo mediante proyección 3D cónica estricta (2 Puntos de Fuga):
 * - Modela un prisma euclidiano 3D auténtico y lo proyecta mediante una cámara pinhole horizontal.
 * - Toda cara es rigurosamente coplanar y todos los conjuntos de aristas paralelas convergen
 *   al mismo punto de fuga exacto en la línea de horizonte (VPL y VPR).
 * - Cero distorsiones, cero paralelogramos forzados: cubos 100% físicos y creíbles.
 * - Soporta Cubo 1:1:1 puro, Torre con Eje de Altura, Losa Horizontal, Cierre de Tapa y Bloque Escalonado.
 * - En sombras: proyección tridimensional coherente sobre el plano de suelo con rayos L y L\'.
 * - Confinamiento geométrico que garantiza que ningún vértice caiga bajo toolbars ni HUDs.
 */
export function generateCubeChallenge(
  seed: number = Math.floor(Math.random() * 1000000),
  canvasWidth: number = 600,
  canvasHeight: number = 540,
  options: CubeChallengeOptions = {}
): CubeChallenge {
  const rnd = pseudoRandom(seed);
  const isShadow = !!options.isShadowLevel;
  const hasGroundGrid = isShadow ? (options.hasGroundGrid !== undefined ? options.hasGroundGrid : true) : false;
  const mode: PerspectiveMode = isShadow ? 'normal' : (options.mode || (options.axesMode && options.axesMode !== 'none' ? 'guided' : 'normal'));
  const axesMode: AxesMode = isShadow ? 'none' : (options.axesMode !== undefined 
    ? options.axesMode 
    : (mode === 'guided' ? 'xyz' : 'none'));

  // Determinar boxType efectivo
  let rawBoxType: BoxType = options.boxType || 'cube';
  if (rawBoxType === 'dynamic') {
    const val = rnd();
    rawBoxType = val < 0.30 ? 'tower' : val < 0.60 ? 'slab' : val < 0.80 ? 'missing_lid' : 'cube';
  }

  // Determinar viewpoint efectivo (altura de horizonte / picado-contrapicado)
  let rawViewpoint: ViewpointMode = options.viewpoint || 'normal';
  if (rawViewpoint === 'dynamic') {
    rawViewpoint = rnd() > 0.5 ? 'high' : 'low';
  }

  // Determinar rotationAngle efectivo (giro asimétrico de caras 30°/60°)
  let rawRotation: RotationAngleMode = options.rotationAngle || 'symmetric';
  if (rawRotation === 'dynamic') {
    rawRotation = rnd() > 0.5 ? 'steep_left' : 'steep_right';
  }

  const lightSide: 'left' | 'right' = options.forceSide || (rnd() > 0.5 ? 'left' : 'right');

  // Parámetros de Cámara y Perspectiva 3D:
  let D = 4.0;
  let f = 620;
  let cy = 110;
  let Hcam = 1.62;
  let thetaDeg = 45;

  if (mode === 'gentle' || mode === 'guided') {
    // 1.4 Fuga suave: cámara lejana con teleobjetivo (isometría serena y paralela)
    D = 8.5;
    f = 1380;
    Hcam = 1.60;
    cy = 110;
    thetaDeg = 45;
  } else {
    // Perspectiva cónica natural a 2 puntos
    D = 4.0;
    f = 620;

    // Viewpoint (altura de la cámara sobre el objeto):
    if (rawViewpoint === 'high') {
      Hcam = 2.45;
      cy = 65;
    } else if (rawViewpoint === 'low') {
      Hcam = 1.12;
      cy = 215;
    } else {
      Hcam = 1.62;
      cy = 110;
    }

    // Rotación angular de caras (30°/60°):
    if (rawRotation === 'steep_left') {
      thetaDeg = 28 + rnd() * 4; // Cara izquierda empinada y escorzada, derecha frontal amplia
    } else if (rawRotation === 'steep_right') {
      thetaDeg = 62 - rnd() * 4; // Cara derecha empinada y escorzada, izquierda frontal amplia
    } else {
      thetaDeg = 45;
    }
  }

  // Dimensiones del prisma 3D:
  let WL = 1.0;
  let WR = 1.0;
  let H = 1.0;

  if (rawBoxType === 'tower') {
    WL = isShadow ? 0.55 : 0.65;
    WR = isShadow ? 0.55 : 0.65;
    H = isShadow ? 1.25 : 1.70;
    if (rawViewpoint === 'normal' && !isShadow) {
      Hcam = 2.2;
      cy = 90;
      f = 580;
    }
  } else if (rawBoxType === 'slab') {
    WL = isShadow ? 1.25 : 1.45;
    WR = isShadow ? 1.25 : 1.45;
    H = isShadow ? 0.48 : 0.52;
    if (rawViewpoint === 'normal' && !isShadow) {
      Hcam = 1.4;
      cy = 110;
      f = 600;
    }
  } else if (rawBoxType === 'step_block') {
    WL = 0.95;
    WR = 0.95;
    H = 1.0;
    f = 580;
  } else if (isShadow) {
    // 1:1:1 puro perfecto en sombras para cubos normales
    WL = 0.85;
    WR = 0.85;
    H = 0.85;
  }

  // Centro en X: desplazado para acomodar sombras o bloque compuesto
  let cx = isShadow
    ? (lightSide === 'left' ? 240 : 360)
    : (rawBoxType === 'step_block' ? 260 : canvasWidth / 2);

  // Vértices 3D del prisma rotado:
  const theta = (thetaDeg * Math.PI) / 180;

  // Calibración de distancia focal (f) y distancia de cámara (D):
  // Si tiene guía de horizonte (Bloque 2 en adelante) o es perspectiva cónica a 2 puntos,
  // calibramos f analíticamente para que ambos puntos de fuga (VPL y VPR) caigan 100% VISIBLES
  // dentro del lienzo con un margen técnico seguro sobre la línea de horizonte.
  if (options.hasHorizonGuide || (mode !== 'gentle' && mode !== 'guided')) {
    const marginVp = 45;
    const maxFL = (cx - marginVp) * Math.tan(theta);
    const maxFR = (canvasWidth - marginVp - cx) / Math.tan(theta);
    f = Math.min(maxFL, maxFR) * 0.95;
    // Calibramos la distancia de cámara D para mantener una escala generosa y cómoda de dibujo
    D = 0.45 + f / 200;
  }

  const Z0 = -0.45;

  const pFront = { x: 0, z: Z0 };
  const pLeft  = { x: -WL * Math.cos(theta), z: Z0 + WL * Math.sin(theta) };
  const pRight = { x:  WR * Math.sin(theta), z: Z0 + WR * Math.cos(theta) };
  const pBack  = {
    x: -WL * Math.cos(theta) + WR * Math.sin(theta),
    z: Z0 + WL * Math.sin(theta) + WR * Math.cos(theta),
  };

  const project3D = (pt: { x: number; z: number }, y: number): Point2D => {
    const Zcam = pt.z + D;
    return {
      x: Math.round((cx + f * (pt.x / Zcam)) * 10) / 10,
      y: Math.round((cy - f * ((y - Hcam) / Zcam)) * 10) / 10,
    };
  };

  let v0 = project3D(pFront, 0); // Frontal Abajo
  let v1 = project3D(pFront, H); // Frontal Arriba
  let v2 = project3D(pLeft,  0); // Izquierda Abajo
  let v3 = project3D(pLeft,  H); // Izquierda Arriba
  let v4 = project3D(pRight, 0); // Derecha Abajo
  let v5 = project3D(pRight, H); // Derecha Arriba
  let v6 = project3D(pBack,  H); // Trasero Arriba (Tapa)

  let vertices2D: Point2D[] = [v0, v1, v2, v3, v4, v5, v6];

  // Confinamiento seguro en lienzo: garantiza que todos los vértices y elementos visibles
  // se mantengan con márgenes confortables
  const safeBox: BoundingBox2D = {
    left: 40,
    right: canvasWidth - 40,
    top: 35,
    bottom: canvasHeight - 45,
  };

  const isHorizonVisible = options.hasHorizonGuide !== undefined ? options.hasHorizonGuide : false;

  const xs = vertices2D.map((p) => p.x);
  // Si la guía de horizonte está activa, incluimos la línea de horizonte (cy) en el confinamiento vertical
  // para asegurar que NUNCA salga disparada fuera del lienzo (ej. en vistas cenitales o de contrapicado)
  const ys = isHorizonVisible ? [...vertices2D.map((p) => p.y), cy] : vertices2D.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const maxSpanX = safeBox.right - safeBox.left;
  const maxSpanY = safeBox.bottom - safeBox.top;

  let scaleFit = 1.0;
  if (spanX > maxSpanX || spanY > maxSpanY) {
    scaleFit = Math.min(maxSpanX / spanX, maxSpanY / spanY) * 0.94;
  }

  const currentMidY = (minY + maxY) / 2;
  const targetMidY = (safeBox.top + safeBox.bottom) / 2;
  const shiftY = Math.round(targetMidY - currentMidY * scaleFit);
  const shiftX = Math.round(cx * (1 - scaleFit));

  if (scaleFit !== 1.0 || Math.abs(shiftY) > 2) {
    vertices2D = vertices2D.map((p) => ({
      x: Math.round(p.x * scaleFit + shiftX),
      y: Math.round(p.y * scaleFit + shiftY),
    }));
    cy = Math.round(cy * scaleFit + shiftY);
  }

  // Puntos de Fuga teóricos calculados analíticamente sobre el horizonte
  const vplRaw = cx - f / Math.tan(theta);
  const vprRaw = cx + f * Math.tan(theta);
  const vanishingPointLeft: Point2D = {
    x: Math.round(vplRaw * scaleFit + shiftX),
    y: cy,
  };
  const vanishingPointRight: Point2D = {
    x: Math.round(vprRaw * scaleFit + shiftX),
    y: cy,
  };

  const givenSide: 'left' | 'right' = options.forceSide || (rnd() > 0.5 ? 'left' : 'right');

  let givenFace: Face;
  let givenEdges: Edge[];
  let allTargetEdges: Edge[];
  const hintEdges: Edge[] = [];

  if (rawBoxType === 'missing_lid') {
    // Modo Cierre de Tapa: Estructura de pilares y base dadas, el alumno dibuja el techo completo en fuga
    givenFace = {
      name: 'Estructura Base & Pilares',
      vertices: [0, 1, 2, 3, 4, 5],
    };

    givenEdges = [
      { start: 0, end: 1, family: 'height' }, // Vertical frontal
      { start: 2, end: 3, family: 'height' }, // Vertical izquierda
      { start: 4, end: 5, family: 'height' }, // Vertical derecha
      { start: 0, end: 2, family: 'width' },  // Base izquierda
      { start: 0, end: 4, family: 'depth' },  // Base derecha
    ];

    allTargetEdges = [
      { start: 1, end: 3, family: 'width' },  // Techo frontal izquierdo
      { start: 1, end: 5, family: 'depth' },  // Techo frontal derecho
      { start: 3, end: 6, family: 'depth' },  // Tapa trasera hacia la derecha
      { start: 5, end: 6, family: 'width' },  // Tapa trasera hacia la izquierda
    ];
  } else if (rawBoxType === 'step_block') {
    // Modo Bloque Escalonado: Cubo principal dado completo + cubo chico adyacente a completar
    // Vértices 0..6 son el cubo principal. Agregamos vértices 7..12 para el cubo menor
    const Wstep = WR * 0.62;
    const Hstep = H * 0.52;
    const pStepFar = { x: (WR + Wstep) * Math.sin(theta), z: Z0 + (WR + Wstep) * Math.cos(theta) };
    const pStepNear = { x: Wstep * Math.sin(theta), z: Z0 + Wstep * Math.cos(theta) };

    const rawS0 = project3D(pStepNear, 0);     // 7: Base frontal adyacente
    const rawS1 = project3D(pStepNear, Hstep); // 8: Techo frontal adyacente
    const rawS2 = project3D(pStepFar, 0);      // 9: Base posterior adyacente
    const rawS3 = project3D(pStepFar, Hstep);  // 10: Techo posterior adyacente
    const rawJ1 = project3D(pFront, Hstep);    // 11: Unión en vertical frontal
    const rawJ2 = project3D(pRight, Hstep);    // 12: Unión en vertical derecha

    const s0 = { x: Math.round(rawS0.x * scaleFit + shiftX), y: Math.round(rawS0.y * scaleFit + shiftY) };
    const s1 = { x: Math.round(rawS1.x * scaleFit + shiftX), y: Math.round(rawS1.y * scaleFit + shiftY) };
    const s2 = { x: Math.round(rawS2.x * scaleFit + shiftX), y: Math.round(rawS2.y * scaleFit + shiftY) };
    const s3 = { x: Math.round(rawS3.x * scaleFit + shiftX), y: Math.round(rawS3.y * scaleFit + shiftY) };
    const j1 = { x: Math.round(rawJ1.x * scaleFit + shiftX), y: Math.round(rawJ1.y * scaleFit + shiftY) };
    const j2 = { x: Math.round(rawJ2.x * scaleFit + shiftX), y: Math.round(rawJ2.y * scaleFit + shiftY) };

    vertices2D.push(s0, s1, s2, s3, j1, j2);

    givenFace = {
      name: 'Bloque Principal',
      vertices: [0, 1, 2, 3, 4, 5, 6],
    };

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

    allTargetEdges = [
      { start: 0, end: 7, family: 'depth' },   // Extensión base frontal
      { start: 7, end: 9, family: 'width' },   // Base lateral del bloque chico
      { start: 7, end: 8, family: 'height' },  // Pilar vertical del bloque chico
      { start: 11, end: 8, family: 'depth' },  // Techo frontal del bloque chico
      { start: 8, end: 10, family: 'width' },  // Arista superior exterior
      { start: 12, end: 10, family: 'depth' }, // Arista de unión posterior
    ];
  } else if (givenSide === 'left') {
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

  const targetEdges = isShadow ? [] : allTargetEdges;

  let shadowData: ShadowChallengeData | undefined = undefined;

  if (isShadow) {
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

    const lightX = lightSide === 'left' ? 75 : 525;
    const lightY = 20;
    const groundStationY = Math.round(cy + 45);

    const light2D: Point2D = { x: lightX, y: lightY };
    const groundStation2D: Point2D = { x: lightX, y: groundStationY };
    const lightSource: LightSource = { light2D, groundStation2D, side: lightSide };

    const H_light = groundStationY - lightY;

    const clampShadowPt = (p: Point2D): Point2D => ({
      x: Math.round(Math.max(45, Math.min(canvasWidth - 45, p.x))),
      y: Math.round(Math.max(50, Math.min(canvasHeight - 80, p.y))),
    });

    if (lightSide === 'left') {
      const H_edge1 = vertices2D[2].y - vertices2D[3].y;
      const u1 = H_light / (H_light - H_edge1);
      const S1 = clampShadowPt({
        x: Math.round(lightX + u1 * (vertices2D[2].x - lightX)),
        y: Math.round(groundStationY + u1 * (vertices2D[2].y - groundStationY)),
      });

      const H_edge2 = vertices2D[0].y - vertices2D[1].y;
      const u2 = H_light / (H_light - H_edge2);
      const S2 = clampShadowPt({
        x: Math.round(lightX + u2 * (vertices2D[0].x - lightX)),
        y: Math.round(groundStationY + u2 * (vertices2D[0].y - groundStationY)),
      });

      const H_edge3 = vertices2D[4].y - vertices2D[5].y;
      const u3 = H_light / (H_light - H_edge3);
      const S3 = clampShadowPt({
        x: Math.round(lightX + u3 * (vertices2D[4].x - lightX)),
        y: Math.round(groundStationY + u3 * (vertices2D[4].y - groundStationY)),
      });

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
      const H_edge1 = vertices2D[4].y - vertices2D[5].y;
      const u1 = H_light / (H_light - H_edge1);
      const S1 = clampShadowPt({
        x: Math.round(lightX + u1 * (vertices2D[4].x - lightX)),
        y: Math.round(groundStationY + u1 * (vertices2D[4].y - groundStationY)),
      });

      const H_edge2 = vertices2D[0].y - vertices2D[1].y;
      const u2 = H_light / (H_light - H_edge2);
      const S2 = clampShadowPt({
        x: Math.round(lightX + u2 * (vertices2D[0].x - lightX)),
        y: Math.round(groundStationY + u2 * (vertices2D[0].y - groundStationY)),
      });

      const H_edge3 = vertices2D[2].y - vertices2D[3].y;
      const u3 = H_light / (H_light - H_edge3);
      const S3 = clampShadowPt({
        x: Math.round(lightX + u3 * (vertices2D[2].x - lightX)),
        y: Math.round(groundStationY + u3 * (vertices2D[2].y - groundStationY)),
      });

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

  // Ejes cartesianos técnicos con confinamiento seguro
  const safeCanvasBox: BoundingBox2D = {
    left: 45,
    right: canvasWidth - 45,
    top: 55,
    bottom: canvasHeight - 75,
  };

  const axes: CoordinateAxis[] = [];
  const frontHeight = vertices2D[0].y - vertices2D[1].y;
  const rawAxisZFar = { x: vertices2D[0].x, y: vertices2D[0].y - (frontHeight + 60) };
  const rawAxisXFar = {
    x: vertices2D[0].x + (vertices2D[2].x - vertices2D[0].x) * 1.55,
    y: vertices2D[0].y + (vertices2D[2].y - vertices2D[0].y) * 1.55,
  };
  const rawAxisYFar = {
    x: vertices2D[0].x + (vertices2D[4].x - vertices2D[0].x) * 1.55,
    y: vertices2D[0].y + (vertices2D[4].y - vertices2D[0].y) * 1.55,
  };

  const axisZ: CoordinateAxis = {
    id: 'Z',
    label: 'Z',
    origin: vertices2D[0],
    farPoint: clampRayToBox(vertices2D[0].x, vertices2D[0].y, rawAxisZFar.x, rawAxisZFar.y, safeCanvasBox, 10),
  };

  const axisX: CoordinateAxis = {
    id: 'X',
    label: 'X',
    origin: vertices2D[0],
    farPoint: clampRayToBox(vertices2D[0].x, vertices2D[0].y, rawAxisXFar.x, rawAxisXFar.y, safeCanvasBox, 10),
  };

  const axisY: CoordinateAxis = {
    id: 'Y',
    label: 'Y',
    origin: vertices2D[0],
    farPoint: clampRayToBox(vertices2D[0].x, vertices2D[0].y, rawAxisYFar.x, rawAxisYFar.y, safeCanvasBox, 10),
  };

  if (!isShadow && axesMode === 'xyz') {
    axes.push(axisX, axisY, axisZ);
  } else if (!isShadow && axesMode === 'base_axes') {
    axes.push(axisX, axisY);
  } else if (!isShadow && axesMode === 'height_axis') {
    axes.push(axisZ);
  }

  // Guía de cota de altura (especialmente útil para torres):
  let heightGuide: HeightGuide | undefined = undefined;
  if (rawBoxType === 'tower' || options.hasHeightGuide) {
    heightGuide = {
      x: vertices2D[0].x,
      yBottom: vertices2D[0].y,
      yTop: vertices2D[1].y,
      label: 'H (Cota)',
    };
  }

  const givenVertexSet = new Set(givenFace.vertices);

  const targetVertices2D: { [key: number]: Point2D } = {};
  vertices2D.forEach((p, idx) => {
    if (!givenVertexSet.has(idx)) {
      targetVertices2D[idx] = p;
    }
  });

  const horizonY = cy;

  return {
    id: `cube-${seed}`,
    seed,
    mode,
    axesMode,
    axes,
    horizonY,
    vanishingPointLeft,
    vanishingPointRight,
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
    boxType: rawBoxType,
    viewpoint: rawViewpoint,
    rotationAngle: rawRotation,
    heightGuide,
    hasHorizonGuide: options.hasHorizonGuide !== undefined ? options.hasHorizonGuide : false,
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
