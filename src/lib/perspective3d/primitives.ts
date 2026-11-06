/**
 * Generador de Desafíos y Primitivas 3D para Lab 3D
 * Soporta SPHERE, RING, CUBE, CYLINDER, CONE, PYRAMID, CAPSULE y PRISM
 * con habitación 3D de 6 paredes y perspectivas dinámicas perfectamente calibradas.
 */

import {
  Vector3D,
  Point2D,
  Camera3D,
  CurveSegment2D,
  PrimitiveType,
  Primitive3DChallenge,
  WireframeModel3D,
} from './types';
import {
  v3,
  vAdd,
  vSub,
  vScale,
  vNorm,
  vCross,
  vLen,
  vDot,
  createLookAtMatrix,
  createPerspectiveMatrix,
  multiplyMatrices,
  project3DTo2D,
  calculateVanishingPoints,
  generate6WallRoomGrid,
} from './math3d';

// Generador pseudo-aleatorio con semilla
function seededRng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Genera una cámara 3D con un ángulo de visión inusual / dramático pero geométricamente limpio
 */
export function generateDynamicCamera(
  rng: () => number,
  canvasWidth: number,
  canvasHeight: number
): Camera3D {
  // Elevación: vista picada (+18° a +36°) o contrapicado (-16° a -28°)
  const isWormEye = rng() > 0.65;
  const elevationDeg = isWormEye ? -(16 + rng() * 12) : 18 + rng() * 18;
  const elevRad = (elevationDeg * Math.PI) / 180;

  // Azimut: rotación orbital en el plano horizontal XZ (entre 30° y 60° o 120° y 150°)
  const quadrant = rng() > 0.5 ? 0 : Math.PI / 2;
  const azimuthRad = quadrant + ((30 + rng() * 30) * Math.PI) / 180;

  // Distancia radial al centro del objeto
  const distance = 4.8 + rng() * 0.4;

  const camX = distance * Math.cos(elevRad) * Math.sin(azimuthRad);
  const camY = distance * Math.sin(elevRad);
  const camZ = distance * Math.cos(elevRad) * Math.cos(azimuthRad);

  const eye = v3(camX, camY, camZ);
  // El objetivo es el centro del objeto (0, 0, 0) para una perspectiva realista a 3 puntos focales
  const target = v3(0, 0, 0);

  // Cámara con horizonte perfectamente nivelado (up = (0, 1, 0)),
  // SIN rotación de cámara parásita (cero Dutch roll / sin inclinación ladeada de pantalla)
  const up = v3(0, 1, 0);

  const fov = 54 + rng() * 8;

  return {
    eye,
    target,
    up,
    fov,
    aspectRatio: canvasWidth / canvasHeight,
    near: 0.15,
    far: 50.0,
    shiftY: 0,
  };
}

export function isTangentCurve(curve: { id: string; label: string; isTangent?: boolean }): boolean {
  if (curve.isTangent !== undefined) return curve.isTangent;
  const id = curve.id.toLowerCase();
  const label = curve.label.toLowerCase();
  return (
    id.includes('slant') ||
    id.includes('side') ||
    id.includes('tangent') ||
    id.includes('silhouette') ||
    id.includes('envelope') ||
    id.includes('dome') ||
    label.includes('tangente') ||
    label.includes('tangencial') ||
    label.includes('contorno lateral') ||
    label.includes('cúpula')
  );
}

/**
 * Convierte un conjunto de puntos 3D muestreados a un CurveSegment2D proyectado en pantalla
 */
function sample3DCurveTo2D(
  points3D: Vector3D[],
  viewProjMatrix: number[],
  width: number,
  height: number,
  id: string,
  label: string,
  isGiven: boolean,
  style: 'solid' | 'dashed' | 'faint' = 'solid',
  role: 'form' | 'construction' | 'hidden' = 'form',
  isTangent?: boolean
): CurveSegment2D {
  const points2D: Point2D[] = [];
  const validPoints3D: Vector3D[] = [];
  points3D.forEach((p3) => {
    const proj = project3DTo2D(p3, viewProjMatrix, width, height);
    if (!proj.isBehindCamera) {
      points2D.push(proj.point2D);
      validPoints3D.push(p3);
    }
  });

  const calculatedIsTangent =
    isTangent !== undefined
      ? isTangent
      : isTangentCurve({ id, label });

  return {
    id,
    points: points2D,
    points3D: validPoints3D,
    isGiven,
    label,
    style,
    role,
    isTangent: calculatedIsTangent,
  };
}

/**
 * Muestrea densamente un segmento 3D entre dos puntos pA y pB para evaluación continua de perspectiva
 */
export function sampleDenseSegment3D(pA: Vector3D, pB: Vector3D, count: number = 32): Vector3D[] {
  const pts: Vector3D[] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    pts.push(
      v3(
        pA.x + t * (pB.x - pA.x),
        pA.y + t * (pB.y - pA.y),
        pA.z + t * (pB.z - pA.z)
      )
    );
  }
  return pts;
}

// ==========================================
// Generadores de Primitivas Específicas
// ==========================================

export function createSpherePrimitive(
  camera: Camera3D,
  viewProj: number[],
  W: number,
  H: number
): {
  anchorCurves: CurveSegment2D[];
  targetCurves: CurveSegment2D[];
  previewModel3D: WireframeModel3D;
} {
  const R = 0.95;
  const segments = 48;

  // 1. Ecuador Horizontal Completo (Plano XZ en Y = 0) dado como ancla guía
  const fullEquator: Vector3D[] = [];
  for (let i = 0; i <= segments; i++) {
    const th = (i / segments) * Math.PI * 2;
    fullEquator.push(v3(R * Math.cos(th), 0, R * Math.sin(th)));
  }

  const anchorCurves: CurveSegment2D[] = [
    sample3DCurveTo2D(fullEquator, viewProj, W, H, 'equator', 'Ecuador de la Esfera', true, 'solid'),
  ];

  // 2. Silueta exterior tangencial exacta (Cono tangente desde la cámara a la esfera)
  const distCam = vLen(camera.eye);
  const sinAlpha = Math.min(0.9999, R / Math.max(R + 0.001, distCam));
  const cosAlpha = Math.sqrt(Math.max(0, 1 - sinAlpha * sinAlpha));
  const contactDist = R * sinAlpha;       // R^2 / distCam
  const contactRadius = R * cosAlpha;     // R * sqrt(1 - R^2/distCam^2)

  const camDir = vNorm(camera.eye);
  const contactCenter = vScale(camDir, contactDist);

  let tempUp = camera.up;
  let uDir = vNorm(vCross(camDir, tempUp));
  if (vLen(uDir) < 0.001) uDir = vNorm(vCross(camDir, v3(1, 0, 0)));
  const vDir = vNorm(vCross(camDir, uDir));

  const silhouette3D: Vector3D[] = [];
  for (let i = 0; i <= segments; i++) {
    const th = (i / segments) * Math.PI * 2;
    const offset = vAdd(
      vScale(uDir, contactRadius * Math.cos(th)),
      vScale(vDir, contactRadius * Math.sin(th))
    );
    silhouette3D.push(vAdd(contactCenter, offset));
  }

  // 3. Meridianos ortogonales en los planos canónicos XY (Z = 0) y YZ (X = 0)
  // Muestreamos el arco frontal visible hacia la cámara
  const fullMeridianXY: Vector3D[] = [];
  const frontMeridianXY: Vector3D[] = [];
  for (let i = 0; i <= segments; i++) {
    const th = (i / segments) * Math.PI * 2;
    const pt = v3(R * Math.cos(th), R * Math.sin(th), 0);
    fullMeridianXY.push(pt);
    const normal = vNorm(pt);
    const dirToCam = vSub(camera.eye, pt);
    if (vDot(dirToCam, normal) >= 0) {
      frontMeridianXY.push(pt);
    }
  }

  const fullMeridianYZ: Vector3D[] = [];
  const frontMeridianYZ: Vector3D[] = [];
  for (let i = 0; i <= segments; i++) {
    const th = (i / segments) * Math.PI * 2;
    const pt = v3(0, R * Math.sin(th), R * Math.cos(th));
    fullMeridianYZ.push(pt);
    const normal = vNorm(pt);
    const dirToCam = vSub(camera.eye, pt);
    if (vDot(dirToCam, normal) >= 0) {
      frontMeridianYZ.push(pt);
    }
  }

  const targetCurves: CurveSegment2D[] = [
    sample3DCurveTo2D(silhouette3D, viewProj, W, H, 'silhouette', 'Silueta Exterior Tangencial', false, 'solid', 'form', true),
    sample3DCurveTo2D(frontMeridianXY.length > 1 ? frontMeridianXY : fullMeridianXY, viewProj, W, H, 'meridian-1', 'Meridiano de Construcción XY', false, 'solid', 'construction'),
    sample3DCurveTo2D(frontMeridianYZ.length > 1 ? frontMeridianYZ : fullMeridianYZ, viewProj, W, H, 'meridian-2', 'Meridiano de Construcción YZ', false, 'solid', 'construction'),
  ];

  const previewModel3D: WireframeModel3D = {
    vertices: [],
    edges: [],
    rings: [fullEquator, fullMeridianXY, fullMeridianYZ],
    tangentRings: [silhouette3D],
  };

  return { anchorCurves, targetCurves, previewModel3D };
}

export function createRingPrimitive(
  camera: Camera3D,
  viewProj: number[],
  W: number,
  H: number
): {
  anchorCurves: CurveSegment2D[];
  targetCurves: CurveSegment2D[];
  previewModel3D: WireframeModel3D;
} {
  const R = 1.05;
  const r = 0.28;
  const segments = 48;

  // Eje central del toroide en Y = 0 (ancla dada)
  const centerRing: Vector3D[] = [];
  for (let i = 0; i <= segments; i++) {
    const th = (i / segments) * Math.PI * 2;
    centerRing.push(v3(R * Math.cos(th), 0, R * Math.sin(th)));
  }

  const anchorCurves: CurveSegment2D[] = [
    sample3DCurveTo2D(centerRing, viewProj, W, H, 'center-ring', 'Eje Central del Toroide', true, 'solid'),
  ];

  // Siluetas tangenciales concéntricas exterior e interior del toroide desde el punto de vista de la cámara
  const outerEnvelope3D: Vector3D[] = [];
  const innerEnvelope3D: Vector3D[] = [];

  for (let i = 0; i <= segments; i++) {
    const th = (i / segments) * Math.PI * 2;
    const cX = R * Math.cos(th);
    const cZ = R * Math.sin(th);
    const centerPt = v3(cX, 0, cZ);

    const radDir = v3(Math.cos(th), 0, Math.sin(th));
    const upDir = v3(0, 1, 0);

    // Vector desde el centro del tubo hacia la cámara
    const vToCam = vSub(camera.eye, centerPt);
    const a = vDot(vToCam, radDir);
    const b = vDot(vToCam, upDir);
    const len = Math.hypot(a, b);

    if (len > 0.001) {
      // Normal tangencial a la visual en el plano de la sección
      const cosA = -b / len;
      const sinA = a / len;

      const p1 = vAdd(centerPt, vAdd(vScale(radDir, r * cosA), vScale(upDir, r * sinA)));
      const p2 = vAdd(centerPt, vAdd(vScale(radDir, -r * cosA), vScale(upDir, -r * sinA)));

      // El contorno exterior del donut es aquel cuya distancia radial al origen central es mayor;
      // el contorno interior (agujero del donut) es el de menor distancia radial.
      // Esta coherencia radial continua para todo theta in [0, 2pi] garantiza que ambos
      // anillos se cierren de forma perfectamente continua sin saltos, cruces ni fisuras en los laterales.
      const dist1 = Math.hypot(p1.x, p1.z);
      const dist2 = Math.hypot(p2.x, p2.z);

      if (dist2 >= dist1) {
        outerEnvelope3D.push(p2);
        innerEnvelope3D.push(p1);
      } else {
        outerEnvelope3D.push(p1);
        innerEnvelope3D.push(p2);
      }
    } else {
      outerEnvelope3D.push(vAdd(centerPt, vScale(radDir, r)));
      innerEnvelope3D.push(vAdd(centerPt, vScale(radDir, -r)));
    }
  }

  // 4 secciones transversales circulares
  const crossSections: Vector3D[][] = [];
  const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  angles.forEach((theta) => {
    const ring: Vector3D[] = [];
    const cx = R * Math.cos(theta);
    const cz = R * Math.sin(theta);
    const radDir = v3(Math.cos(theta), 0, Math.sin(theta));
    const upDir = v3(0, 1, 0);

    for (let j = 0; j <= 24; j++) {
      const phi = (j / 24) * Math.PI * 2;
      const pt = vAdd(v3(cx, 0, cz), vAdd(vScale(radDir, r * Math.cos(phi)), vScale(upDir, r * Math.sin(phi))));
      ring.push(pt);
    }
    crossSections.push(ring);
  });

  const targetCurves: CurveSegment2D[] = [
    sample3DCurveTo2D(outerEnvelope3D, viewProj, W, H, 'envelope-outer', 'Silueta Tangencial Exterior', false, 'solid', 'form', true),
    sample3DCurveTo2D(innerEnvelope3D, viewProj, W, H, 'envelope-inner', 'Silueta Tangencial Interior', false, 'solid', 'form', true),
    ...crossSections.map((cs, idx) =>
      sample3DCurveTo2D(cs, viewProj, W, H, `cross-${idx}`, `Sección de Construcción ${idx + 1}`, false, 'solid', 'construction')
    ),
  ];

  const previewModel3D: WireframeModel3D = {
    vertices: [],
    edges: [],
    rings: [centerRing, ...crossSections],
    tangentRings: [outerEnvelope3D, innerEnvelope3D],
  };

  return { anchorCurves, targetCurves, previewModel3D };
}

export function createCubePrimitive(
  camera: Camera3D,
  viewProj: number[],
  W: number,
  H: number
): {
  anchorCurves: CurveSegment2D[];
  targetCurves: CurveSegment2D[];
  previewModel3D: WireframeModel3D;
} {
  const s = 0.8;
  const v: Vector3D[] = [
    v3(-s, -s, -s), // 0: Izq-Abajo-Atrás
    v3(s, -s, -s),  // 1: Der-Abajo-Atrás
    v3(s, -s, s),   // 2: Der-Abajo-Frente
    v3(-s, -s, s),  // 3: Izq-Abajo-Frente
    v3(-s, s, -s),  // 4: Izq-Arriba-Atrás
    v3(s, s, -s),   // 5: Der-Arriba-Atrás
    v3(s, s, s),    // 6: Der-Arriba-Frente
    v3(-s, s, s),   // 7: Izq-Arriba-Frente
  ];

  // Base en el suelo dada
  const basePoints = [v[0], v[1], v[2], v[3], v[0]];
  const anchorCurves: CurveSegment2D[] = [
    sample3DCurveTo2D(basePoints, viewProj, W, H, 'base-quad', 'Plano Base del Cubo', true, 'solid', 'form'),
  ];

  // Visibilidad de caras del cubo respecto a la cámara (Back-Face Culling)
  const isRightVisible = camera.eye.x > 0;
  const isLeftVisible = camera.eye.x < 0;
  const isFrontVisible = camera.eye.z > 0;
  const isBackVisible = camera.eye.z < 0;
  const isTopVisible = camera.eye.y > 0;

  // Cada arista pertenece a 2 caras. Si ambas caras están ocultas, la arista está OCULTA en el cubo sólido
  const rawEdgePairs: [number, number, string, boolean][] = [
    [0, 4, 'Pilar Izq-Atrás', isLeftVisible || isBackVisible],
    [1, 5, 'Pilar Der-Atrás', isRightVisible || isBackVisible],
    [2, 6, 'Pilar Der-Frente', isRightVisible || isFrontVisible],
    [3, 7, 'Pilar Izq-Frente', isLeftVisible || isFrontVisible],
    [4, 5, 'Techo Posterior', isTopVisible || isBackVisible],
    [5, 6, 'Techo Lateral Derecho', isTopVisible || isRightVisible],
    [6, 7, 'Techo Frontal', isTopVisible || isFrontVisible],
    [7, 4, 'Techo Lateral Izquierdo', isTopVisible || isLeftVisible],
  ];

  // Exigir ÚNICAMENTE las aristas visibles para la figura sólida (las aristas ocultas traseras no se exigen)
  const visibleEdgePairs = rawEdgePairs.filter((e) => e[3]);

  const targetCurves: CurveSegment2D[] = visibleEdgePairs.map(([startIdx, endIdx, name], idx) => {
    const densePts = sampleDenseSegment3D(v[startIdx], v[endIdx], 24);
    return sample3DCurveTo2D(densePts, viewProj, W, H, `edge-${idx}`, name, false, 'solid', 'form');
  });

  const previewModel3D: WireframeModel3D = {
    vertices: v,
    edges: [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ],
  };

  return { anchorCurves, targetCurves, previewModel3D };
}

export function createCylinderPrimitive(
  camera: Camera3D,
  viewProj: number[],
  W: number,
  H: number
): {
  anchorCurves: CurveSegment2D[];
  targetCurves: CurveSegment2D[];
  previewModel3D: WireframeModel3D;
} {
  const R = 0.85;
  const halfH = 0.95;
  const segments = 48;

  // Cámara en plano XZ
  const Dxz = Math.hypot(camera.eye.x, camera.eye.z);
  const phi = Math.atan2(camera.eye.z, camera.eye.x);

  // Silueta cilíndrica exacta: cos(theta - phi) = R / Dxz
  const deltaTheta = Math.acos(Math.max(-0.9999, Math.min(0.9999, R / Math.max(R + 0.001, Dxz))));
  const angle1 = phi + deltaTheta;
  const angle2 = phi - deltaTheta;

  // Puntos de contacto en base inferior (Y = -halfH) y tapa superior (Y = +halfH)
  const bContact1 = v3(R * Math.cos(angle1), -halfH, R * Math.sin(angle1));
  const bContact2 = v3(R * Math.cos(angle2), -halfH, R * Math.sin(angle2));
  const tContact1 = v3(R * Math.cos(angle1), halfH, R * Math.sin(angle1));
  const tContact2 = v3(R * Math.cos(angle2), halfH, R * Math.sin(angle2));

  // Ordenar izquierda y derecha en pantalla
  const proj1 = project3DTo2D(bContact1, viewProj, W, H);
  const proj2 = project3DTo2D(bContact2, viewProj, W, H);

  const is1Left = proj1.point2D.x < proj2.point2D.x;
  const bLeft = is1Left ? bContact1 : bContact2;
  const bRight = is1Left ? bContact2 : bContact1;
  const tLeft = is1Left ? tContact1 : tContact2;
  const tRight = is1Left ? tContact2 : tContact1;

  // Aristas laterales densamente muestreadas
  const leftSide = sampleDenseSegment3D(bLeft, tLeft, 32);
  const rightSide = sampleDenseSegment3D(bRight, tRight, 32);

  // 1. Base inferior completa dada como guía ancla sólida en tinta negra
  const bottomRing: Vector3D[] = [];
  for (let i = 0; i <= segments; i++) {
    const th = (i / segments) * Math.PI * 2;
    bottomRing.push(v3(R * Math.cos(th), -halfH, R * Math.sin(th)));
  }

  // 2. Línea vertical finita desde el centro de la base que determina la altura exacta del cilindro
  const heightAxis = sampleDenseSegment3D(v3(0, -halfH, 0), v3(0, halfH, 0), 20);
  const topAxisTick = [v3(-0.08, halfH, 0), v3(0.08, halfH, 0)];

  // Tapa superior
  const topRing: Vector3D[] = [];
  for (let i = 0; i <= segments; i++) {
    const th = (i / segments) * Math.PI * 2;
    topRing.push(v3(R * Math.cos(th), halfH, R * Math.sin(th)));
  }

  const anchorCurves: CurveSegment2D[] = [
    sample3DCurveTo2D(bottomRing, viewProj, W, H, 'bottom-ellipse', 'Elipse Base Inferior', true, 'solid', 'form'),
    sample3DCurveTo2D(heightAxis, viewProj, W, H, 'height-axis', 'Eje de Altura Vertical', true, 'faint', 'construction'),
    sample3DCurveTo2D(topAxisTick, viewProj, W, H, 'height-tick', 'Límite Superior de Altura', true, 'faint', 'construction'),
  ];

  const targetCurves: CurveSegment2D[] = [
    sample3DCurveTo2D(topRing, viewProj, W, H, 'top-ellipse', 'Elipse Superior', false, 'solid', 'form'),
    sample3DCurveTo2D(leftSide, viewProj, W, H, 'left-side', 'Contorno Lateral Tangente Izquierdo', false, 'solid', 'form', true),
    sample3DCurveTo2D(rightSide, viewProj, W, H, 'right-side', 'Contorno Lateral Tangente Derecho', false, 'solid', 'form', true),
  ];

  const previewModel3D: WireframeModel3D = {
    vertices: [bLeft, bRight, tLeft, tRight],
    edges: [],
    rings: [bottomRing, topRing, heightAxis],
    tangentRings: [leftSide, rightSide],
  };

  return { anchorCurves, targetCurves, previewModel3D };
}

export function createConePrimitive(
  camera: Camera3D,
  viewProj: number[],
  W: number,
  H: number
): {
  anchorCurves: CurveSegment2D[];
  targetCurves: CurveSegment2D[];
  previewModel3D: WireframeModel3D;
} {
  const R = 0.95;
  const halfH = 0.95;
  const apexY = halfH + 0.1; // 1.05
  const baseY = -halfH;      // -0.95
  const coneHeight = apexY - baseY; // 2.0
  const apex = v3(0, apexY, 0);

  // Cámara en coordenadas cilíndricas relativas al eje vertical Y
  const Dxz = Math.hypot(camera.eye.x, camera.eye.z);
  const phi = Math.atan2(camera.eye.z, camera.eye.x);

  // Derivación analítica de la silueta tangencial exacta del cono:
  // Condición: (E - A) · N(theta) = 0 donde N(theta) = (cos theta, R / H, sin theta)
  // E_x cos theta + E_z sin theta = (apexY - E_y) * (R / H)
  // Dxz * cos(theta - phi) = (apexY - E_y) * (R / H)
  // cos(theta - phi) = ((apexY - E_y) * R) / (coneHeight * Dxz)
  const ratio = ((apexY - camera.eye.y) * R) / (coneHeight * Math.max(0.001, Dxz));
  const clampedRatio = Math.max(-0.9999, Math.min(0.9999, ratio));
  const deltaTheta = Math.acos(clampedRatio);

  const angle1 = phi + deltaTheta;
  const angle2 = phi - deltaTheta;

  const pContact1 = v3(R * Math.cos(angle1), baseY, R * Math.sin(angle1));
  const pContact2 = v3(R * Math.cos(angle2), baseY, R * Math.sin(angle2));

  // Proyectar para clasificar izquierda vs derecha en la pantalla
  const proj1 = project3DTo2D(pContact1, viewProj, W, H);
  const proj2 = project3DTo2D(pContact2, viewProj, W, H);

  const isP1Left = proj1.point2D.x < proj2.point2D.x;
  const pLeft = isP1Left ? pContact1 : pContact2;
  const pRight = isP1Left ? pContact2 : pContact1;

  // Generatrices tangentes densamente muestreadas desde el ápice hasta la base
  const leftSlant3D = sampleDenseSegment3D(apex, pLeft, 32);
  const rightSlant3D = sampleDenseSegment3D(apex, pRight, 32);

  // 1. Base circular completa dada como guía ancla sólida en tinta negra
  const segments = 48;
  const baseRing: Vector3D[] = [];
  for (let i = 0; i <= segments; i++) {
    const th = (i / segments) * Math.PI * 2;
    baseRing.push(v3(R * Math.cos(th), baseY, R * Math.sin(th)));
  }

  // 2. Línea vertical finita desde el centro de la base hasta el ápice que determina la altura exacta
  const heightAxis = sampleDenseSegment3D(v3(0, baseY, 0), apex, 20);
  const apexTick = [v3(-0.06, apexY, 0), v3(0.06, apexY, 0)];

  const anchorCurves: CurveSegment2D[] = [
    sample3DCurveTo2D(baseRing, viewProj, W, H, 'cone-base', 'Base Circular del Cono', true, 'solid', 'form'),
    sample3DCurveTo2D(heightAxis, viewProj, W, H, 'height-axis', 'Eje de Altura Vertical', true, 'faint', 'construction'),
    sample3DCurveTo2D(apexTick, viewProj, W, H, 'apex-tick', 'Ápice del Cono', true, 'faint', 'construction'),
  ];

  const targetCurves: CurveSegment2D[] = [
    sample3DCurveTo2D(leftSlant3D, viewProj, W, H, 'left-slant', 'Arista Tangente Izquierda', false, 'solid', 'form', true),
    sample3DCurveTo2D(rightSlant3D, viewProj, W, H, 'right-slant', 'Arista Tangente Derecha', false, 'solid', 'form', true),
  ];

  const previewModel3D: WireframeModel3D = {
    vertices: [apex, pLeft, pRight],
    edges: [],
    rings: [baseRing, heightAxis],
    tangentRings: [leftSlant3D, rightSlant3D],
  };

  return { anchorCurves, targetCurves, previewModel3D };
}

export function createPyramidPrimitive(
  camera: Camera3D,
  viewProj: number[],
  W: number,
  H: number
): {
  anchorCurves: CurveSegment2D[];
  targetCurves: CurveSegment2D[];
  previewModel3D: WireframeModel3D;
} {
  const s = 0.9;
  const halfH = 0.95;

  const b0 = v3(-s, -halfH, -s);
  const b1 = v3(s, -halfH, -s);
  const b2 = v3(s, -halfH, s);
  const b3 = v3(-s, -halfH, s);
  const apex = v3(0, halfH + 0.1, 0);

  // 1. Base cuadrada completa dada como guía ancla sólida en tinta negra
  const baseQuad = [b0, b1, b2, b3, b0];

  // 2. Línea vertical finita desde el centro de la base hasta la cúspide que determina la altura
  const heightAxis = sampleDenseSegment3D(v3(0, -halfH, 0), apex, 20);
  const apexTick = [v3(-0.06, halfH + 0.1, 0), v3(0.06, halfH + 0.1, 0)];

  const anchorCurves: CurveSegment2D[] = [
    sample3DCurveTo2D(baseQuad, viewProj, W, H, 'pyramid-base', 'Base Cuadrada en Perspectiva', true, 'solid', 'form'),
    sample3DCurveTo2D(heightAxis, viewProj, W, H, 'height-axis', 'Eje de Altura Vertical', true, 'faint', 'construction'),
    sample3DCurveTo2D(apexTick, viewProj, W, H, 'apex-tick', 'Cúspide de la Pirámide', true, 'faint', 'construction'),
  ];

  // Visibilidad de caras triangulares según la cámara
  const isRightVisible = camera.eye.x > 0;
  const isLeftVisible = camera.eye.x < 0;
  const isFrontVisible = camera.eye.z > 0;
  const isBackVisible = camera.eye.z < 0;

  // Cada arista oblicua conecta una esquina con la cúspide. Si ambas caras adyacentes están ocultas, la arista está OCULTA
  const rawSlants: [Vector3D, string, boolean][] = [
    [b0, 'Arista a la Cúspide (Atrás-Izq)', isLeftVisible || isBackVisible],
    [b1, 'Arista a la Cúspide (Atrás-Der)', isRightVisible || isBackVisible],
    [b2, 'Arista a la Cúspide (Frente-Der)', isRightVisible || isFrontVisible],
    [b3, 'Arista a la Cúspide (Frente-Izq)', isLeftVisible || isFrontVisible],
  ];

  // Exigir ÚNICAMENTE las aristas visibles para la pirámide sólida
  const visibleSlants = rawSlants.filter((e) => e[2]);

  const targetCurves: CurveSegment2D[] = visibleSlants.map(([basePt, name], idx) => {
    return sample3DCurveTo2D(sampleDenseSegment3D(basePt, apex, 24), viewProj, W, H, `slant-${idx}`, name, false, 'solid', 'form');
  });

  const previewModel3D: WireframeModel3D = {
    vertices: [b0, b1, b2, b3, apex],
    edges: [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [0, 4], [1, 4], [2, 4], [3, 4],
    ],
    rings: [heightAxis],
  };

  return { anchorCurves, targetCurves, previewModel3D };
}

export function createCapsulePrimitive(
  camera: Camera3D,
  viewProj: number[],
  W: number,
  H: number
): {
  anchorCurves: CurveSegment2D[];
  targetCurves: CurveSegment2D[];
  previewModel3D: WireframeModel3D;
} {
  const R = 0.75;
  const cylH = 0.8;
  const halfCyl = cylH / 2;
  const segments = 48;

  // Tangentes exactas del cilindro central según la posición de la cámara
  const Dxz = Math.hypot(camera.eye.x, camera.eye.z);
  const phi = Math.atan2(camera.eye.z, camera.eye.x);
  const deltaTheta = Math.acos(Math.max(-0.9999, Math.min(0.9999, R / Math.max(R + 0.001, Dxz))));

  const angle1 = phi + deltaTheta;
  const angle2 = phi - deltaTheta;

  const bContact1 = v3(R * Math.cos(angle1), -halfCyl, R * Math.sin(angle1));
  const bContact2 = v3(R * Math.cos(angle2), -halfCyl, R * Math.sin(angle2));
  const tContact1 = v3(R * Math.cos(angle1), halfCyl, R * Math.sin(angle1));
  const tContact2 = v3(R * Math.cos(angle2), halfCyl, R * Math.sin(angle2));

  // Ordenar izquierda y derecha en pantalla
  const proj1 = project3DTo2D(bContact1, viewProj, W, H);
  const proj2 = project3DTo2D(bContact2, viewProj, W, H);
  const is1Left = proj1.point2D.x < proj2.point2D.x;

  const bLeft = is1Left ? bContact1 : bContact2;
  const bRight = is1Left ? bContact2 : bContact1;
  const tLeft = is1Left ? tContact1 : tContact2;
  const tRight = is1Left ? tContact2 : tContact1;

  const leftSide = sampleDenseSegment3D(bLeft, tLeft, 28);
  const rightSide = sampleDenseSegment3D(bRight, tRight, 28);

  // 1. Anillo divisor inferior completo en sólido
  const lowerRing: Vector3D[] = [];
  for (let i = 0; i <= segments; i++) {
    const th = (i / segments) * Math.PI * 2;
    lowerRing.push(v3(R * Math.cos(th), -halfCyl, R * Math.sin(th)));
  }

  // 2. Línea vertical finita de altura central
  const heightAxis = sampleDenseSegment3D(v3(0, -halfCyl, 0), v3(0, halfCyl, 0), 20);
  const topAxisTick = [v3(-0.08, halfCyl, 0), v3(0.08, halfCyl, 0)];

  // Anillo divisor superior en Y = +halfCyl (objetivo)
  const upperRing: Vector3D[] = [];
  for (let i = 0; i <= segments; i++) {
    const th = (i / segments) * Math.PI * 2;
    upperRing.push(v3(R * Math.cos(th), halfCyl, R * Math.sin(th)));
  }

  // Cúpula semiesférica superior: silueta tangencial exacta de la esfera en perspectiva
  // El contorno visual de la semiesfera coincide exactamente con el círculo de contacto tangente
  // desde el punto de vista de la cámara, conectando suavemente tLeft y tRight en Y = +halfCyl.
  const C = v3(0, halfCyl, 0);
  const D = vSub(camera.eye, C);
  const d = Math.max(0.001, vLen(D));
  const dNorm = vNorm(D);
  const h = (R * R) / d;
  const rContact = R * Math.sqrt(Math.max(0, 1 - (R * R) / (d * d)));
  const contactCenter = vAdd(C, vScale(dNorm, h));

  const uAxis = vNorm(vSub(tLeft, contactCenter));
  const vAxis = vNorm(vCross(dNorm, uAxis));

  const rRight = vSub(tRight, contactCenter);
  const cosA = Math.max(-1, Math.min(1, vDot(rRight, uAxis) / Math.max(0.0001, rContact)));
  const sinA = Math.max(-1, Math.min(1, vDot(rRight, vAxis) / Math.max(0.0001, rContact)));
  const alphaRight = Math.atan2(sinA, cosA);

  const midAlpha1 = alphaRight / 2;
  const midAlpha2 = alphaRight > 0 ? (alphaRight - 2 * Math.PI) / 2 : (alphaRight + 2 * Math.PI) / 2;

  const ptMid1 = vAdd(contactCenter, vAdd(vScale(uAxis, rContact * Math.cos(midAlpha1)), vScale(vAxis, rContact * Math.sin(midAlpha1))));
  const ptMid2 = vAdd(contactCenter, vAdd(vScale(uAxis, rContact * Math.cos(midAlpha2)), vScale(vAxis, rContact * Math.sin(midAlpha2))));

  // Elegir el arco que pasa por la cima (polo superior, mayor Y en el espacio 3D)
  const useArc1 = ptMid1.y > ptMid2.y;
  const targetAlpha = useArc1 ? alphaRight : (alphaRight > 0 ? alphaRight - 2 * Math.PI : alphaRight + 2 * Math.PI);

  const upperDomeArc: Vector3D[] = [];
  const domeSegs = 36;
  for (let i = 0; i <= domeSegs; i++) {
    const t = i / domeSegs;
    const a = t * targetAlpha;
    const pt = vAdd(contactCenter, vAdd(vScale(uAxis, rContact * Math.cos(a)), vScale(vAxis, rContact * Math.sin(a))));
    upperDomeArc.push(pt);
  }

  const anchorCurves: CurveSegment2D[] = [
    sample3DCurveTo2D(lowerRing, viewProj, W, H, 'capsule-lower-ring', 'Anillo Inferior Cápsula', true, 'solid', 'form'),
    sample3DCurveTo2D(heightAxis, viewProj, W, H, 'height-axis', 'Eje de Altura Vertical', true, 'faint', 'construction'),
    sample3DCurveTo2D(topAxisTick, viewProj, W, H, 'height-tick', 'Límite Superior Cilíndrico', true, 'faint', 'construction'),
  ];

  const targetCurves: CurveSegment2D[] = [
    sample3DCurveTo2D(upperRing, viewProj, W, H, 'capsule-upper-ring', 'Anillo Divisor de Construcción', false, 'solid', 'construction'),
    sample3DCurveTo2D(upperDomeArc, viewProj, W, H, 'capsule-upper-dome', 'Silueta Tangencial de la Cúpula', false, 'solid', 'form', true),
    sample3DCurveTo2D(leftSide, viewProj, W, H, 'capsule-left', 'Lateral Tangente Izquierdo', false, 'solid', 'form', true),
    sample3DCurveTo2D(rightSide, viewProj, W, H, 'capsule-right', 'Lateral Tangente Derecho', false, 'solid', 'form', true),
  ];

  const previewModel3D: WireframeModel3D = {
    vertices: [bLeft, bRight, tLeft, tRight],
    edges: [],
    rings: [lowerRing, upperRing, heightAxis],
    tangentRings: [leftSide, rightSide, upperDomeArc],
  };

  return { anchorCurves, targetCurves, previewModel3D };
}

/**
 * Prisma Triangular con orientación calibrada hacia la cámara:
 * La cara triangular más cercana a la cámara es SIEMPRE la cara base dada en tinta negra,
 * y las aristas longitudinales fugan de manera natural alejándose hacia el fondo.
 */
export function createPrismPrimitive(
  camera: Camera3D,
  viewProj: number[],
  W: number,
  H: number
): {
  anchorCurves: CurveSegment2D[];
  targetCurves: CurveSegment2D[];
  previewModel3D: WireframeModel3D;
} {
  const w = 0.85;
  const h = 0.95;
  const depth = 1.2;

  // Cara triangular A (Z = -depth / 2)
  const a0 = v3(-w, -h / 2, -depth / 2);
  const a1 = v3(w, -h / 2, -depth / 2);
  const a2 = v3(0, h / 2, -depth / 2);

  // Cara triangular B (Z = +depth / 2)
  const b0 = v3(-w, -h / 2, depth / 2);
  const b1 = v3(w, -h / 2, depth / 2);
  const b2 = v3(0, h / 2, depth / 2);

  // Comparar distancias a la cámara para determinar la cara frontal
  const distA = vLen(vSub(camera.eye, v3(0, 0, -depth / 2)));
  const distB = vLen(vSub(camera.eye, v3(0, 0, depth / 2)));

  const isACcloser = distA < distB;
  const nearTriangle = isACcloser ? [a0, a1, a2, a0] : [b0, b1, b2, b0];
  const nearPts = isACcloser ? [a0, a1, a2] : [b0, b1, b2];
  const farPts = isACcloser ? [b0, b1, b2] : [a0, a1, a2];

  // Centroide de la cara frontal y de la cara posterior para marcar la dirección y profundidad
  const nearCenter = v3(
    (nearPts[0].x + nearPts[1].x + nearPts[2].x) / 3,
    (nearPts[0].y + nearPts[1].y + nearPts[2].y) / 3,
    (nearPts[0].z + nearPts[1].z + nearPts[2].z) / 3
  );
  const farCenter = v3(
    (farPts[0].x + farPts[1].x + farPts[2].x) / 3,
    (farPts[0].y + farPts[1].y + farPts[2].y) / 3,
    (farPts[0].z + farPts[1].z + farPts[2].z) / 3
  );

  // Eje de profundidad longitudinal y delimitador posterior que indican la dirección de extrusión
  const depthAxis = sampleDenseSegment3D(nearCenter, farCenter, 20);
  const farAxisTick = [
    v3(farCenter.x - 0.08, farCenter.y, farCenter.z),
    v3(farCenter.x + 0.08, farCenter.y, farCenter.z),
  ];

  // La cara frontal dada al usuario es SIEMPRE la cara más cercana a la cámara,
  // complementada con el eje de profundidad tenue que indica hacia dónde fuga el prisma
  const anchorCurves: CurveSegment2D[] = [
    sample3DCurveTo2D(nearTriangle, viewProj, W, H, 'prism-near', 'Cara Triangular Frontal', true, 'solid', 'form'),
    sample3DCurveTo2D(depthAxis, viewProj, W, H, 'depth-axis', 'Eje de Profundidad Longitudinal', true, 'faint', 'construction'),
    sample3DCurveTo2D(farAxisTick, viewProj, W, H, 'depth-tick', 'Límite Posterior de Profundidad', true, 'faint', 'construction'),
  ];

  // Visibilidad de caras del prisma triangular para back-face culling de aristas ocultas
  // 1. Cara inferior (suelo): normal (0, -1, 0)
  const isBottomVisible = camera.eye.y < -h / 2;
  // 2. Cara techo izquierdo: vector (-w, -h/2) a (0, h/2) -> normal normalizada perpendicular hacia el exterior: (-h, w, 0)
  const isLeftRoofVisible = (-h * camera.eye.x + w * camera.eye.y) > 0;
  // 3. Cara techo derecho: vector (0, h/2) a (w, -h/2) -> normal normalizada perpendicular hacia el exterior: (h, w, 0)
  const isRightRoofVisible = (h * camera.eye.x + w * camera.eye.y) > 0;

  // Aristas visibles de la figura sólida:
  // Cresta superior: visible si techo izq o der es visible
  // Longitudinal izq: visible si techo izq o base visible
  // Longitudinal der: visible si techo der o base visible
  // Rampa posterior der: visible si techo der visible
  // Rampa posterior izq: visible si techo izq visible
  // Base posterior: visible si cara inferior es visible
  const rawEdges: [Vector3D, Vector3D, string, boolean][] = [
    [nearPts[2], farPts[2], 'Cresta Superior Longitudinal', isLeftRoofVisible || isRightRoofVisible],
    [nearPts[0], farPts[0], 'Arista Longitudinal Izquierda', isLeftRoofVisible || isBottomVisible],
    [nearPts[1], farPts[1], 'Arista Longitudinal Derecha', isRightRoofVisible || isBottomVisible],
    [farPts[1], farPts[2], 'Rampa Posterior Derecha', isRightRoofVisible],
    [farPts[2], farPts[0], 'Rampa Posterior Izquierda', isLeftRoofVisible],
    [farPts[0], farPts[1], 'Base Posterior', isBottomVisible],
  ];

  const visiblePrismEdges = rawEdges.filter((e) => e[3]);

  const targetCurves: CurveSegment2D[] = visiblePrismEdges.map(([pStart, pEnd, name], idx) => {
    return sample3DCurveTo2D(sampleDenseSegment3D(pStart, pEnd, 24), viewProj, W, H, `prism-edge-${idx}`, name, false, 'solid', 'form');
  });

  const previewModel3D: WireframeModel3D = {
    vertices: [a0, a1, a2, b0, b1, b2],
    edges: [
      [0, 1], [1, 2], [2, 0], // Cara A
      [3, 4], [4, 5], [5, 3], // Cara B
      [0, 3], [1, 4], [2, 5], // Aristas longitudinales
    ],
    rings: [depthAxis],
  };

  return { anchorCurves, targetCurves, previewModel3D };
}

// ==========================================
// Función Maestra: Generación de Retos 3D
// ==========================================

export const ALL_PRIMITIVES: PrimitiveType[] = [
  'SPHERE',
  'RING',
  'CUBE',
  'CYLINDER',
  'CONE',
  'PYRAMID',
  'CAPSULE',
  'PRISM',
];

export function generate3DChallenge(
  seed: number = Math.floor(Math.random() * 1000000),
  forcedType?: PrimitiveType,
  canvasWidth: number = 800,
  canvasHeight: number = 600,
  allowedTypes?: PrimitiveType[]
): Primitive3DChallenge {
  const rng = seededRng(seed);

  const pool = allowedTypes && allowedTypes.length > 0 ? allowedTypes : ALL_PRIMITIVES;
  const type = forcedType || pool[Math.floor(rng() * pool.length)];
  const camera = generateDynamicCamera(rng, canvasWidth, canvasHeight);

  const viewMatrix = createLookAtMatrix(camera.eye, camera.target, camera.up);
  const projMatrix = createPerspectiveMatrix(camera.fov, camera.aspectRatio, camera.near, camera.far, camera.shiftY || 0);
  const viewProjMatrix = multiplyMatrices(projMatrix, viewMatrix);

  // Puntos de fuga exactos
  const vanishingPoints = calculateVanishingPoints(camera, viewProjMatrix, canvasWidth, canvasHeight);

  // Habitación 3D de 6 Paredes completa
  const gridLines = generate6WallRoomGrid(camera, viewMatrix, projMatrix, canvasWidth, canvasHeight);

  let primitiveData: {
    anchorCurves: CurveSegment2D[];
    targetCurves: CurveSegment2D[];
    previewModel3D: WireframeModel3D;
  };

  let name = '';
  let tipText = '';

  switch (type) {
    case 'SPHERE':
      primitiveData = createSpherePrimitive(camera, viewProjMatrix, canvasWidth, canvasHeight);
      name = 'SPHERE';
      tipText = 'Dibuja la silueta exterior y los meridianos guiándote por el ecuador dado.';
      break;
    case 'RING':
      primitiveData = createRingPrimitive(camera, viewProjMatrix, canvasWidth, canvasHeight);
      name = 'RING';
      tipText = 'Construye los anillos concéntricos interior y exterior del toroide.';
      break;
    case 'CUBE':
      primitiveData = createCubePrimitive(camera, viewProjMatrix, canvasWidth, canvasHeight);
      name = 'CUBE';
      tipText = 'Fuga las aristas verticales, de anchura y profundidad hacia los 3 puntos de fuga.';
      break;
    case 'CYLINDER':
      primitiveData = createCylinderPrimitive(camera, viewProjMatrix, canvasWidth, canvasHeight);
      name = 'CYLINDER';
      tipText = 'Dibuja la elipse superior (con escorzo y mayor tamaño en picado) y las generatrices en fuga vertical.';
      break;
    case 'CONE':
      primitiveData = createConePrimitive(camera, viewProjMatrix, canvasWidth, canvasHeight);
      name = 'CONE';
      tipText = 'Ubica el ápice vertical y conecta las tangentes a la base elíptica.';
      break;
    case 'PYRAMID':
      primitiveData = createPyramidPrimitive(camera, viewProjMatrix, canvasWidth, canvasHeight);
      name = 'PYRAMID';
      tipText = 'Traza las aristas convergentes desde la base hasta la cúspide.';
      break;
    case 'CAPSULE':
      primitiveData = createCapsulePrimitive(camera, viewProjMatrix, canvasWidth, canvasHeight);
      name = 'CAPSULE';
      tipText = 'Construye el cuerpo cilíndrico y la cúpula semiesférica superior.';
      break;
    case 'PRISM':
      primitiveData = createPrismPrimitive(camera, viewProjMatrix, canvasWidth, canvasHeight);
      name = 'PRISM';
      tipText = 'Sigue el eje de profundidad longitudinal para fugar las aristas hacia la cara posterior.';
      break;
  }

  return {
    id: `challenge-3d-${seed}-${type}`,
    type,
    name,
    seed,
    camera,
    vanishingPoints,
    gridLines,
    anchorCurves: primitiveData.anchorCurves,
    targetCurves: primitiveData.targetCurves,
    previewModel3D: primitiveData.previewModel3D,
    tipText,
  };
}
