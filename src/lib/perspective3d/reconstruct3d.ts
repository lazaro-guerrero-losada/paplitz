/**
 * Reconstrucción 3D y Control de Órbita 360° para Lab 3D
 * Permite des-proyectar trazos 2D del usuario al espacio 3D (World Space),
 * anclándolos a la geometría espacial del reto para orbitar 360° en tiempo real.
 */

import {
  Vector3D,
  Point2D,
  Camera3D,
  CurveSegment2D,
  UserStroke3D,
  UserStrokeWorld3D,
} from './types';
import {
  vAdd,
  vSub,
  vScale,
  vDot,
  vCross,
  vLen,
  vNorm,
  Matrix4x4,
  createLookAtMatrix,
  createPerspectiveMatrix,
  multiplyMatrices,
} from './math3d';

export interface CameraRay {
  origin: Vector3D;
  direction: Vector3D;
}

/**
 * Calcula el rayo óptico en el espacio de mundo para un píxel 2D de pantalla.
 * La ecuación es exactamente la inversa de project3DTo2D + createLookAtMatrix.
 */
export function getCameraRay(
  screenPt: Point2D,
  camera: Camera3D,
  width: number,
  height: number
): CameraRay {
  const ndcX = (2 * screenPt.x) / width - 1;
  const ndcY = 1 - (2 * screenPt.y) / height;

  const fovRad = (camera.fov * Math.PI) / 180;
  const f = 1.0 / Math.tan(fovRad / 2.0);
  const shiftY = camera.shiftY || 0;

  // En espacio de cámara (Z = -1)
  const camDirX = (ndcX * camera.aspectRatio) / f;
  const camDirY = (ndcY + shiftY) / f;

  // Base ortonormal de la cámara en espacio de mundo
  const zAxis = vNorm(vSub(camera.eye, camera.target));
  let xAxis = vNorm(vCross(camera.up, zAxis));
  if (vLen(xAxis) < 0.0001) {
    xAxis = { x: 1, y: 0, z: 0 };
  }
  const yAxis = vCross(zAxis, xAxis);

  const worldDir = vNorm({
    x: xAxis.x * camDirX + yAxis.x * camDirY - zAxis.x * 1.0,
    y: xAxis.y * camDirX + yAxis.y * camDirY - zAxis.y * 1.0,
    z: xAxis.z * camDirX + yAxis.z * camDirY - zAxis.z * 1.0,
  });

  return {
    origin: camera.eye,
    direction: worldDir,
  };
}

interface Ref3DSegment {
  p1_2D: Point2D;
  p2_2D: Point2D;
  p1_3D: Vector3D;
  p2_3D: Vector3D;
  curveId: string;
  isGiven: boolean;
}

interface RefCurveMeta {
  curve: CurveSegment2D;
  isStraight: boolean;
  pA_3D: Vector3D;
  pB_3D: Vector3D;
  pA_2D: Point2D;
  pB_2D: Point2D;
  cdx: number;
  cdy: number;
  clen2: number;
}

/**
 * Reconstruye y eleva los trazos 2D del usuario al espacio 3D (World Coordinates).
 * Utiliza correspondencia estructural a nivel de trazo con las primitivas del modelo 3D,
 * interpolación de profundidad lineal continua a lo largo de aristas y generatrices,
 * y ajuste automático de vértices en las uniones y esquinas compartidas.
 */
export function unprojectUserStrokesTo3D(
  strokes: UserStroke3D[],
  camera: Camera3D,
  width: number,
  height: number,
  targetCurves: CurveSegment2D[],
  anchorCurves: CurveSegment2D[]
): UserStrokeWorld3D[] {
  const allRefCurves = [...targetCurves, ...anchorCurves];
  const camForward = vNorm(vSub(camera.target, camera.eye));
  const defaultDepth = Math.max(0.1, vLen(vSub(camera.eye, camera.target)));

  // 1. Preanalizar curvas de referencia para saber cuáles son aristas/segmentos rectos en 3D
  const curvesMeta: RefCurveMeta[] = allRefCurves.map((c) => {
    const pts3D = c.points3D || [];
    const pts2D = c.points || [];
    const n3 = pts3D.length;
    const n2 = pts2D.length;

    let isStraight = false;
    let pA_3D: Vector3D = { x: 0, y: 0, z: 0 };
    let pB_3D: Vector3D = { x: 0, y: 0, z: 0 };
    let pA_2D: Point2D = { x: 0, y: 0 };
    let pB_2D: Point2D = { x: 0, y: 0 };
    let cdx = 0;
    let cdy = 0;
    let clen2 = 0;

    if (n3 >= 2 && n2 >= 2) {
      pA_3D = pts3D[0];
      pB_3D = pts3D[n3 - 1];
      pA_2D = pts2D[0];
      pB_2D = pts2D[n2 - 1];
      cdx = pB_2D.x - pA_2D.x;
      cdy = pB_2D.y - pA_2D.y;
      clen2 = cdx * cdx + cdy * cdy;

      if (n3 === 2) {
        isStraight = true;
      } else {
        const delta = vSub(pB_3D, pA_3D);
        const len3D = vLen(delta);
        if (len3D > 0.001) {
          const dir3D = vScale(delta, 1 / len3D);
          isStraight = true;
          for (let k = 1; k < n3 - 1; k++) {
            const diff = vSub(pts3D[k], pA_3D);
            const perp = vCross(diff, dir3D);
            if (vLen(perp) > 0.02) {
              isStraight = false;
              break;
            }
          }
        }
      }
    }

    return {
      curve: c,
      isStraight,
      pA_3D,
      pB_3D,
      pA_2D,
      pB_2D,
      cdx,
      cdy,
      clen2,
    };
  });

  // Vértices de ancla dados en 3D (exclusivamente geometría de forma dada, descartando ejes de construcción)
  const anchorVertices: { p2D: Point2D; zCam: number }[] = [];
  anchorCurves.forEach((c) => {
    // Descartar ejes auxiliares o líneas de construcción internas para no falsear la profundidad
    if (c.role === 'construction' || c.style === 'faint' || c.id.includes('axis') || c.id.includes('tick')) {
      return;
    }
    if (!c.points || !c.points3D) return;
    const cnt = Math.min(c.points.length, c.points3D.length);
    for (let i = 0; i < cnt; i++) {
      anchorVertices.push({
        p2D: c.points[i],
        zCam: vDot(vSub(c.points3D[i], camera.eye), camForward),
      });
    }
  });

  // 2. Primera pasada: emparejar cada trazo del alumno y calcular el perfil de profundidad zCam
  interface StrokeAnalysis {
    id: string;
    stroke: UserStroke3D;
    zCams: number[];
    rays: CameraRay[];
    bestMeta: RefCurveMeta | null;
    vStart_3D?: Vector3D;
    vEnd_3D?: Vector3D;
    snapStart?: boolean;
    snapEnd?: boolean;
  }

  const strokeAnalyses: StrokeAnalysis[] = strokes.map((s, strokeIdx) => {
    const pts = s.points || [];
    const n = pts.length;
    if (n === 0) {
      return { id: s.id || `stroke_${strokeIdx}`, stroke: s, zCams: [], rays: [], bestMeta: null };
    }

    const pStart = pts[0];
    const pEnd = pts[n - 1];
    const sDirX = pEnd.x - pStart.x;
    const sDirY = pEnd.y - pStart.y;
    const sLen = Math.hypot(sDirX, sDirY);
    const uDirX = sLen > 0.001 ? sDirX / sLen : 1;
    const uDirY = sLen > 0.001 ? sDirY / sLen : 0;

    const isUserConstruction = !!s.isConstruction;

    // Emparejar el trazo completo contra la curva de referencia con mayor alineación y proximidad
    let bestMeta: RefCurveMeta | null = null;
    let bestScore = -1;

    for (const meta of curvesMeta) {
      const c = meta.curve;
      if (!c.points || c.points.length < 2 || !c.points3D) continue;

      // Si el trazo del alumno es de contorno/forma, nunca debe emparejarse con líneas de construcción internas
      const isCurveConstruction =
        c.role === 'construction' || c.style === 'faint' || c.id.includes('axis') || c.id.includes('tick');
      if (!isUserConstruction && isCurveConstruction) {
        continue;
      }

      // Bonificación de prioridad a curvas objetivo que el alumno debía dibujar
      const priorityFactor = c.isGiven ? 1.0 : 1.25;

      let totalDist = 0;
      let totalAlign = 0;
      const sampleCount = Math.min(7, n);

      for (let k = 0; k < sampleCount; k++) {
        const pt = pts[Math.floor((k / (sampleCount - 1)) * (n - 1))];
        let minDist = Infinity;
        let segDirX = 1;
        let segDirY = 0;

        for (let j = 0; j < c.points.length - 1; j++) {
          const a = c.points[j];
          const b = c.points[j + 1];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const l2 = dx * dx + dy * dy;
          const alpha = l2 > 0.0001 ? Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / l2)) : 0;
          const projX = a.x + alpha * dx;
          const projY = a.y + alpha * dy;
          const d = Math.hypot(pt.x - projX, pt.y - projY);
          if (d < minDist) {
            minDist = d;
            const l = Math.sqrt(l2);
            if (l > 0.001) {
              segDirX = dx / l;
              segDirY = dy / l;
            }
          }
        }
        totalDist += minDist;
        totalAlign += Math.abs(uDirX * segDirX + uDirY * segDirY);
      }

      const avgDist = totalDist / sampleCount;
      const avgAlign = totalAlign / sampleCount;
      const score = (avgAlign / (1.0 + avgDist / 35.0)) * priorityFactor;

      if (score > bestScore) {
        bestScore = score;
        bestMeta = meta;
      }
    }

    const zCams = new Array<number>(n);
    const rays = new Array<CameraRay>(n);
    let vStart_3D: Vector3D | undefined;
    let vEnd_3D: Vector3D | undefined;
    let snapStart = false;
    let snapEnd = false;

    if (bestMeta && bestMeta.isStraight && bestScore >= 0.15 && bestMeta.clen2 > 1.0) {
      // Arista recta 3D: detección de sentido (forward / backward) y sellado de vértices
      const { pA_3D, pB_3D, pA_2D, pB_2D, cdx, cdy, clen2 } = bestMeta;

      const dStartA = Math.hypot(pStart.x - pA_2D.x, pStart.y - pA_2D.y);
      const dStartB = Math.hypot(pStart.x - pB_2D.x, pStart.y - pB_2D.y);
      const dEndA = Math.hypot(pEnd.x - pA_2D.x, pEnd.y - pA_2D.y);
      const dEndB = Math.hypot(pEnd.x - pB_2D.x, pEnd.y - pB_2D.y);

      const isForward = (dStartA + dEndB) <= (dStartB + dEndA);
      vStart_3D = isForward ? pA_3D : pB_3D;
      vEnd_3D = isForward ? pB_3D : pA_3D;
      const pStart_target2D = isForward ? pA_2D : pB_2D;
      const pEnd_target2D = isForward ? pB_2D : pA_2D;

      const dStart = Math.hypot(pStart.x - pStart_target2D.x, pStart.y - pStart_target2D.y);
      const dEnd = Math.hypot(pEnd.x - pEnd_target2D.x, pEnd.y - pEnd_target2D.y);

      // Umbral de aproximación para dibujo libre a mano alzada (hasta 65px en pantallas grandes / tabletas)
      const SNAP_GESTURE_PX = 65.0;
      snapStart = dStart <= SNAP_GESTURE_PX;
      snapEnd = dEnd <= SNAP_GESTURE_PX;

      const zStartCam = vDot(vSub(vStart_3D, camera.eye), camForward);
      const zEndCam = vDot(vSub(vEnd_3D, camera.eye), camForward);

      for (let i = 0; i < n; i++) {
        const pt2D = pts[i];
        rays[i] = getCameraRay(pt2D, camera, width, height);

        const uIdx = n > 1 ? i / (n - 1) : 0;
        const uProj = ((pt2D.x - pA_2D.x) * cdx + (pt2D.y - pA_2D.y) * cdy) / clen2;
        const uRaw = Math.max(0, Math.min(1, isForward ? uProj : 1.0 - uProj));

        let u = uIdx;
        if (snapStart && snapEnd) {
          u = 0.65 * uIdx + 0.35 * uRaw;
        } else if (snapStart) {
          u = Math.max(0, uRaw);
        } else if (snapEnd) {
          u = Math.min(1, uRaw);
        } else {
          u = Math.max(-0.2, Math.min(1.2, uRaw));
        }

        zCams[i] = (1 - u) * zStartCam + u * zEndCam;
      }
    } else {
      // Curvas (elipses, arcos, siluetas) o trazos sin correspondencia unívoca
      const candidateSegments: Ref3DSegment[] = [];
      const addCurveSegments = (c: CurveSegment2D) => {
        if (!c.points || !c.points3D) return;
        if (c.role === 'construction' || c.style === 'faint' || c.id.includes('axis') || c.id.includes('tick')) return;
        const cnt = Math.min(c.points.length, c.points3D.length);
        for (let i = 0; i < cnt - 1; i++) {
          candidateSegments.push({
            p1_2D: c.points[i],
            p2_2D: c.points[i + 1],
            p1_3D: c.points3D[i],
            p2_3D: c.points3D[i + 1],
            curveId: c.id,
            isGiven: c.isGiven,
          });
        }
      };

      if (bestMeta && bestScore >= 0.15) {
        addCurveSegments(bestMeta.curve);
      } else {
        allRefCurves.forEach(addCurveSegments);
      }

      for (let i = 0; i < n; i++) {
        const pt2D = pts[i];
        rays[i] = getCameraRay(pt2D, camera, width, height);

        let bestDist = Infinity;
        let bestZ = defaultDepth;

        for (const seg of candidateSegments) {
          const dx = seg.p2_2D.x - seg.p1_2D.x;
          const dy = seg.p2_2D.y - seg.p1_2D.y;
          const l2 = dx * dx + dy * dy;
          const alpha = l2 > 0.0001 ? Math.max(0, Math.min(1, ((pt2D.x - seg.p1_2D.x) * dx + (pt2D.y - seg.p1_2D.y) * dy) / l2)) : 0;
          const projX = seg.p1_2D.x + alpha * dx;
          const projY = seg.p1_2D.y + alpha * dy;
          const d = Math.hypot(pt2D.x - projX, pt2D.y - projY);

          if (d < bestDist) {
            bestDist = d;
            const m3D: Vector3D = {
              x: (1 - alpha) * seg.p1_3D.x + alpha * seg.p2_3D.x,
              y: (1 - alpha) * seg.p1_3D.y + alpha * seg.p2_3D.y,
              z: (1 - alpha) * seg.p1_3D.z + alpha * seg.p2_3D.z,
            };
            bestZ = vDot(vSub(m3D, camera.eye), camForward);
          }
        }
        zCams[i] = bestZ;
      }
    }

    return {
      id: s.id || `stroke_${strokeIdx}`,
      stroke: s,
      zCams,
      rays,
      bestMeta,
      vStart_3D,
      vEnd_3D,
      snapStart,
      snapEnd,
    };
  });

  // 3. Segunda pasada: Agrupación y sellado de vértices en las uniones (Corner Junction Snapping)
  interface EndpointRef {
    strokeIdx: number;
    isEnd: boolean;
    pt2D: Point2D;
    zCam: number;
  }

  const endpoints: EndpointRef[] = [];
  strokeAnalyses.forEach((sa, idx) => {
    if (sa.zCams.length === 0) return;
    endpoints.push({
      strokeIdx: idx,
      isEnd: false,
      pt2D: sa.stroke.points[0],
      zCam: sa.zCams[0],
    });
    endpoints.push({
      strokeIdx: idx,
      isEnd: true,
      pt2D: sa.stroke.points[sa.stroke.points.length - 1],
      zCam: sa.zCams[sa.zCams.length - 1],
    });
  });

  const SNAP_THRESHOLD_PX = 24.0;
  const visited = new Set<number>();

  for (let i = 0; i < endpoints.length; i++) {
    if (visited.has(i)) continue;
    const cluster = [endpoints[i]];
    visited.add(i);

    for (let j = i + 1; j < endpoints.length; j++) {
      if (visited.has(j)) continue;
      const d = Math.hypot(endpoints[i].pt2D.x - endpoints[j].pt2D.x, endpoints[i].pt2D.y - endpoints[j].pt2D.y);
      if (d <= SNAP_THRESHOLD_PX) {
        cluster.push(endpoints[j]);
        visited.add(j);
      }
    }

    // Comprobar si el cluster coincide con un vértice base/ancla dado (buscando la distancia mínima exacta)
    let targetZ = 0;
    let hasAnchor = false;
    let minAnchorDist = SNAP_THRESHOLD_PX;

    for (const ep of cluster) {
      for (const av of anchorVertices) {
        const d = Math.hypot(ep.pt2D.x - av.p2D.x, ep.pt2D.y - av.p2D.y);
        if (d < minAnchorDist) {
          minAnchorDist = d;
          targetZ = av.zCam;
          hasAnchor = true;
        }
      }
    }

    if (!hasAnchor) {
      const sum = cluster.reduce((acc, ep) => acc + ep.zCam, 0);
      targetZ = sum / cluster.length;
    }

    // Suavizado de entrada hacia la unión para no deformar el resto del trazo
    for (const ep of cluster) {
      const zCams = strokeAnalyses[ep.strokeIdx].zCams;
      const n = zCams.length;
      const blendCount = Math.min(12, Math.max(2, Math.floor(n / 4)));

      if (!ep.isEnd) {
        for (let k = 0; k < blendCount; k++) {
          const w = 1.0 - k / blendCount;
          zCams[k] = (1 - w) * zCams[k] + w * targetZ;
        }
      } else {
        for (let k = 0; k < blendCount; k++) {
          const idx = n - 1 - k;
          const w = 1.0 - k / blendCount;
          zCams[idx] = (1 - w) * zCams[idx] + w * targetZ;
        }
      }
    }
  }

  // 4. Tercera pasada: Filtro de suavizado de profundidad y cálculo de coordenadas 3D finales
  return strokeAnalyses.map((sa) => {
    const n = sa.zCams.length;
    if (n === 0) {
      return {
        id: sa.id,
        points3D: [],
        isConstruction: sa.stroke.isConstruction,
      };
    }

    const smoothZCams = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      if (n <= 2) {
        smoothZCams[i] = sa.zCams[i];
      } else {
        const prev = i > 0 ? sa.zCams[i - 1] : sa.zCams[i];
        const next = i < n - 1 ? sa.zCams[i + 1] : sa.zCams[i];
        smoothZCams[i] = 0.25 * prev + 0.5 * sa.zCams[i] + 0.25 * next;
      }
    }

    const points3D: Vector3D[] = new Array<Vector3D>(n);
    const blendCount = Math.min(8, Math.max(2, Math.floor(n / 4)));

    for (let i = 0; i < n; i++) {
      const ray = sa.rays[i];
      const rayFwd = vDot(ray.direction, camForward);
      const t = Math.max(0.1, smoothZCams[i] / Math.max(0.001, rayFwd));
      let pt3D = vAdd(camera.eye, vScale(ray.direction, t));

      // Anclaje al vértice 3D inicial si se detectó intención de unión
      if (sa.snapStart && sa.vStart_3D && i < blendCount) {
        const w = Math.pow(1.0 - i / blendCount, 2);
        pt3D = vAdd(vScale(sa.vStart_3D, w), vScale(pt3D, 1.0 - w));
      }

      // Anclaje al vértice 3D final si se detectó intención de unión
      if (sa.snapEnd && sa.vEnd_3D && i >= n - blendCount) {
        const k = n - 1 - i;
        const w = Math.pow(1.0 - k / blendCount, 2);
        pt3D = vAdd(vScale(sa.vEnd_3D, w), vScale(pt3D, 1.0 - w));
      }

      points3D[i] = pt3D;
    }

    return {
      id: sa.id,
      points3D,
      isConstruction: sa.stroke.isConstruction,
    };
  });
}

/**
 * Obtiene los ángulos esféricos (azimut, elevación y distancia) de la cámara del reto
 * para que la vista inicial u orbital comience exactamente en la orientación del reto.
 */
export function getOriginalCameraOrbitAngles(camera: Camera3D): {
  azimuthRad: number;
  elevationRad: number;
  distance: number;
  target: Vector3D;
} {
  const delta = vSub(camera.eye, camera.target);
  const distance = Math.max(0.1, vLen(delta));
  const elevationRad = Math.asin(Math.min(0.999, Math.max(-0.999, delta.y / distance)));
  const azimuthRad = Math.atan2(delta.x, delta.z);

  return {
    azimuthRad,
    elevationRad,
    distance,
    target: { ...camera.target },
  };
}

/**
 * Crea la matriz de vista-proyección orbital para navegación 360° en tiempo real
 */
export function createOrbitViewProj(
  azimuthRad: number,
  elevationRad: number,
  distance: number,
  target: Vector3D,
  fovDeg: number,
  aspect: number,
  shiftY: number = 0
): { viewProj: Matrix4x4; eye: Vector3D } {
  // Limitar elevación para evitar singularidad en los polos
  const clampedElevation = Math.max(-1.45, Math.min(1.45, elevationRad)); // +/- ~83 grados
  const cosEl = Math.cos(clampedElevation);
  const sinEl = Math.sin(clampedElevation);
  const sinAz = Math.sin(azimuthRad);
  const cosAz = Math.cos(azimuthRad);

  const eye: Vector3D = {
    x: target.x + distance * cosEl * sinAz,
    y: target.y + distance * sinEl,
    z: target.z + distance * cosEl * cosAz,
  };

  const viewMat = createLookAtMatrix(eye, target, { x: 0, y: 1, z: 0 });
  const projMat = createPerspectiveMatrix(fovDeg, aspect, 0.1, 100, shiftY);
  const viewProj = multiplyMatrices(projMat, viewMat);

  return { viewProj, eye };
}
