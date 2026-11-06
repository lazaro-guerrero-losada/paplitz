/**
 * Motor matemático de proyección y perspectiva 3D para Lab 3D
 * Calcula transformaciones, matrices de cámara (LookAt + Perspectiva),
 * corte seguro de segmentos 3D en el plano cercano (clipping),
 * cálculo exacto de puntos de fuga y la habitación 3D de 6 paredes ("Cubo Mundo").
 */

import { Vector3D, Point2D, Camera3D, VanishingPoint, PerspectiveGridLine } from './types';

// ==========================================
// Operaciones con Vectores 3D
// ==========================================

export function v3(x: number, y: number, z: number): Vector3D {
  return { x, y, z };
}

export function vAdd(a: Vector3D, b: Vector3D): Vector3D {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function vSub(a: Vector3D, b: Vector3D): Vector3D {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function vScale(v: Vector3D, s: number): Vector3D {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function vDot(a: Vector3D, b: Vector3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function vCross(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function vLen(v: Vector3D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function vNorm(v: Vector3D): Vector3D {
  const len = vLen(v);
  if (len < 0.000001) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function vRotateX(v: Vector3D, rad: number): Vector3D {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: v.x,
    y: v.y * cos - v.z * sin,
    z: v.y * sin + v.z * cos,
  };
}

export function vRotateY(v: Vector3D, rad: number): Vector3D {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: v.x * cos + v.z * sin,
    y: v.y,
    z: -v.x * sin + v.z * cos,
  };
}

export function vRotateZ(v: Vector3D, rad: number): Vector3D {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
    z: v.z,
  };
}

// ==========================================
// Matrices 4x4 y Transformación de Cámara
// ==========================================

export type Matrix4x4 = number[]; // 16 elementos row-major

export function createLookAtMatrix(eye: Vector3D, target: Vector3D, up: Vector3D): Matrix4x4 {
  const zAxis = vNorm(vSub(eye, target)); // Vector hacia atrás (en dirección opuesta a la vista)
  let xAxis = vNorm(vCross(up, zAxis));   // Vector derecha
  if (vLen(xAxis) < 0.0001) {
    xAxis = { x: 1, y: 0, z: 0 };
  }
  const yAxis = vCross(zAxis, xAxis);     // Vector arriba corregido

  return [
    xAxis.x, xAxis.y, xAxis.z, -vDot(xAxis, eye),
    yAxis.x, yAxis.y, yAxis.z, -vDot(yAxis, eye),
    zAxis.x, zAxis.y, zAxis.z, -vDot(zAxis, eye),
    0, 0, 0, 1,
  ];
}

export function createPerspectiveMatrix(
  fovDeg: number,
  aspect: number,
  near: number,
  far: number,
  shiftY: number = 0
): Matrix4x4 {
  const fovRad = (fovDeg * Math.PI) / 180;
  const f = 1.0 / Math.tan(fovRad / 2.0);
  const nf = 1.0 / (near - far);

  return [
    f / aspect, 0, 0, 0,
    0, f, shiftY, 0,
    0, 0, (far + near) * nf, 2 * far * near * nf,
    0, 0, -1, 0,
  ];
}

export function multiplyMatrices(a: Matrix4x4, b: Matrix4x4): Matrix4x4 {
  const out = new Array(16).fill(0);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[r * 4 + k] * b[k * 4 + c];
      }
      out[r * 4 + c] = sum;
    }
  }
  return out;
}

/**
 * Multiplica matriz de vista por un punto 3D para llevarlo al espacio de cámara
 */
export function transformPointToCamera(p: Vector3D, viewMatrix: Matrix4x4): Vector3D {
  return {
    x: viewMatrix[0] * p.x + viewMatrix[1] * p.y + viewMatrix[2] * p.z + viewMatrix[3],
    y: viewMatrix[4] * p.x + viewMatrix[5] * p.y + viewMatrix[6] * p.z + viewMatrix[7],
    z: viewMatrix[8] * p.x + viewMatrix[9] * p.y + viewMatrix[10] * p.z + viewMatrix[11],
  };
}

/**
 * Transforma un punto 3D del espacio de mundo al plano 2D de pantalla (lienzo)
 */
export function project3DTo2D(
  point: Vector3D,
  viewProjMatrix: Matrix4x4,
  canvasWidth: number,
  canvasHeight: number
): { point2D: Point2D; isBehindCamera: boolean; depth: number } {
  const x = point.x;
  const y = point.y;
  const z = point.z;

  const clipX = viewProjMatrix[0] * x + viewProjMatrix[1] * y + viewProjMatrix[2] * z + viewProjMatrix[3];
  const clipY = viewProjMatrix[4] * x + viewProjMatrix[5] * y + viewProjMatrix[6] * z + viewProjMatrix[7];
  const clipZ = viewProjMatrix[8] * x + viewProjMatrix[9] * y + viewProjMatrix[10] * z + viewProjMatrix[11];
  const clipW = viewProjMatrix[12] * x + viewProjMatrix[13] * y + viewProjMatrix[14] * z + viewProjMatrix[15];

  if (clipW <= 0.05) {
    return {
      point2D: { x: canvasWidth / 2, y: canvasHeight / 2 },
      isBehindCamera: true,
      depth: clipZ,
    };
  }

  const ndcX = clipX / clipW;
  const ndcY = clipY / clipW;

  const screenX = (ndcX * 0.5 + 0.5) * canvasWidth;
  const screenY = (-ndcY * 0.5 + 0.5) * canvasHeight;

  return {
    point2D: { x: screenX, y: screenY },
    isBehindCamera: false,
    depth: clipW,
  };
}

/**
 * Recorta un segmento 3D contra el plano cercano de la cámara (near plane)
 * y lo proyecta limpiamente sin aberraciones por pasar detrás de la lente.
 */
export function clipAndProject3DSegment(
  p1: Vector3D,
  p2: Vector3D,
  viewMatrix: Matrix4x4,
  projMatrix: Matrix4x4,
  canvasWidth: number,
  canvasHeight: number,
  near: number = 0.15
): { start: Point2D; end: Point2D } | null {
  // 1. Llevar ambos puntos al espacio de cámara
  let c1 = transformPointToCamera(p1, viewMatrix);
  let c2 = transformPointToCamera(p2, viewMatrix);

  // En el espacio de cámara estándar de OpenGL/Vulkan, el frente es -Z.
  // Por lo tanto, los puntos visibles tienen Z <= -near.
  const zMin = -near;

  const c1Behind = c1.z > zMin;
  const c2Behind = c2.z > zMin;

  // Ambos detrás de la cámara -> descartar segmento
  if (c1Behind && c2Behind) return null;

  // Si uno está detrás, recortar en la intersección con el plano Z = -near
  if (c1Behind && !c2Behind) {
    const t = (zMin - c2.z) / (c1.z - c2.z);
    c1 = {
      x: c2.x + t * (c1.x - c2.x),
      y: c2.y + t * (c1.y - c2.y),
      z: zMin,
    };
  } else if (!c1Behind && c2Behind) {
    const t = (zMin - c1.z) / (c2.z - c1.z);
    c2 = {
      x: c1.x + t * (c2.x - c1.x),
      y: c1.y + t * (c2.y - c1.y),
      z: zMin,
    };
  }

  // 2. Proyectar con la matriz de perspectiva
  const projectCameraPt = (c: Vector3D): Point2D => {
    const clipX = projMatrix[0] * c.x;
    const clipY = projMatrix[5] * c.y + projMatrix[6] * c.z;
    const clipW = -c.z; // Debido a la fila [0, 0, -1, 0]

    const ndcX = clipX / clipW;
    const ndcY = clipY / clipW;

    return {
      x: (ndcX * 0.5 + 0.5) * canvasWidth,
      y: (-ndcY * 0.5 + 0.5) * canvasHeight,
    };
  };

  return {
    start: projectCameraPt(c1),
    end: projectCameraPt(c2),
  };
}

// ==========================================
// Cálculo Exacto de Puntos de Fuga (VP X, VP Y, VP Z)
// ==========================================

export function calculateVanishingPoints(
  camera: Camera3D,
  _viewProjMatrix: Matrix4x4,
  canvasWidth: number,
  canvasHeight: number
): { X?: VanishingPoint; Y?: VanishingPoint; Z?: VanishingPoint } {
  const axes: ('X' | 'Y' | 'Z')[] = ['X', 'Y', 'Z'];
  const dirs: Record<'X' | 'Y' | 'Z', Vector3D> = {
    X: { x: 1, y: 0, z: 0 },
    Y: { x: 0, y: 1, z: 0 },
    Z: { x: 0, y: 0, z: 1 },
  };

  const result: { X?: VanishingPoint; Y?: VanishingPoint; Z?: VanishingPoint } = {};
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  // Base ortonormal de la cámara
  const forward = vNorm(vSub(camera.target, camera.eye)); // Hacia el objetivo
  let right = vNorm(vCross(forward, camera.up));
  if (vLen(right) < 0.0001) right = { x: 1, y: 0, z: 0 };
  const trueUp = vCross(right, forward);

  const fovRad = (camera.fov * Math.PI) / 180;
  const f = 1.0 / Math.tan(fovRad / 2.0);
  const aspect = camera.aspectRatio;

  axes.forEach((axis) => {
    const dir = dirs[axis];

    // Componentes del eje en el espacio de vista de la cámara
    const dx = vDot(dir, right);
    const dy = vDot(dir, trueUp);
    const dz = vDot(dir, forward); // Dirección hacia adelante en la vista

    let sx: number;
    let sy: number;

    const shiftY = camera.shiftY || 0;

    if (Math.abs(dz) > 0.001) {
      // Si dz != 0, las líneas paralelas a este eje convergen en un punto de fuga finito
      // Si dz < 0, se toma el sentido opuesto (-dir) que apunta hacia adelante de la escena
      const sign = dz > 0 ? 1 : -1;
      const ndcX = (f / aspect) * (dx * sign) / Math.abs(dz);
      const ndcY = (f * (dy * sign)) / Math.abs(dz) - shiftY;

      sx = (ndcX * 0.5 + 0.5) * canvasWidth;
      sy = (-ndcY * 0.5 + 0.5) * canvasHeight;
    } else {
      // Eje perfectamente ortogonal / paralelo al plano de proyección
      const ndcX = (f / aspect) * dx * 1000;
      const ndcY = f * dy * 1000 - shiftY;
      sx = cx + ndcX;
      sy = cy - ndcY;
    }

    const margin = 20;
    const isOnScreen = sx >= margin && sx <= canvasWidth - margin && sy >= margin && sy <= canvasHeight - margin;

    // Dirección desde el centro
    const diffX = sx - cx;
    const diffY = sy - cy;
    const angleRad = Math.atan2(diffY, diffX);
    const angleDeg = (angleRad * 180) / Math.PI;

    // Calcular punto de corte con el borde del canvas si está fuera
    let edgeX = sx;
    let edgeY = sy;
    if (!isOnScreen) {
      const padding = 28;
      const halfW = canvasWidth / 2 - padding;
      const halfH = canvasHeight / 2 - padding;

      const scaleX = Math.abs(diffX) > 0.001 ? halfW / Math.abs(diffX) : 999999;
      const scaleY = Math.abs(diffY) > 0.001 ? halfH / Math.abs(diffY) : 999999;
      const t = Math.min(scaleX, scaleY);

      edgeX = cx + diffX * t;
      edgeY = cy + diffY * t;
    }

    result[axis] = {
      axis,
      label: `VP ${axis}`,
      point: { x: sx, y: sy },
      isOnScreen,
      screenEdgePoint: { x: edgeX, y: edgeY },
      angleDeg,
    };
  });

  return result;
}

// ==========================================
// Habitación 3D de 6 Paredes ("Cubo Mundo")
// ==========================================

/**
 * Genera la cuadrícula de perspectiva 3D completa de las 6 PAREDES del mundo:
 * - Suelo (Floor)
 * - Techo (Ceiling)
 * - Pared Izquierda (Left Wall)
 * - Pared Derecha (Right Wall)
 * - Pared del Fondo (Back Wall)
 * - Pared Frontal / Marco (Front Wall Portal)
 * Más las 12 aristas estructurales del cubo habitación.
 */
export function generate6WallRoomGrid(
  _camera: Camera3D,
  viewMatrix: Matrix4x4,
  projMatrix: Matrix4x4,
  canvasWidth: number,
  canvasHeight: number,
  roomSize = { x: 2.8, y: 2.2, z: 2.8 }
): PerspectiveGridLine[] {
  const lines: PerspectiveGridLine[] = [];

  const rx = roomSize.x;
  const ry = roomSize.y;
  const rz = roomSize.z;

  const addLine = (p1: Vector3D, p2: Vector3D, axis: 'X' | 'Y' | 'Z' | 'neutral', opacity: number) => {
    const clipped = clipAndProject3DSegment(p1, p2, viewMatrix, projMatrix, canvasWidth, canvasHeight);
    if (clipped) {
      lines.push({
        start: clipped.start,
        end: clipped.end,
        axis,
        opacity,
      });
    }
  };

  // -------------------------------------------------------------
  // 1. Las 12 Aristas Estructurales de la Habitación (Marco Cúbico 3D)
  // -------------------------------------------------------------
  const structuralOpacity = 0.35;

  // Perímetro del Suelo (Y = -ry)
  addLine(v3(-rx, -ry, -rz), v3(rx, -ry, -rz), 'X', structuralOpacity);
  addLine(v3(rx, -ry, -rz), v3(rx, -ry, rz), 'Z', structuralOpacity);
  addLine(v3(rx, -ry, rz), v3(-rx, -ry, rz), 'X', structuralOpacity);
  addLine(v3(-rx, -ry, rz), v3(-rx, -ry, -rz), 'Z', structuralOpacity);

  // Perímetro del Techo (Y = +ry)
  addLine(v3(-rx, ry, -rz), v3(rx, ry, -rz), 'X', structuralOpacity);
  addLine(v3(rx, ry, -rz), v3(rx, ry, rz), 'Z', structuralOpacity);
  addLine(v3(rx, ry, rz), v3(-rx, ry, rz), 'X', structuralOpacity);
  addLine(v3(-rx, ry, rz), v3(-rx, ry, -rz), 'Z', structuralOpacity);

  // 4 Pilares Verticales en las Esquinas
  addLine(v3(-rx, -ry, -rz), v3(-rx, ry, -rz), 'Y', structuralOpacity);
  addLine(v3(rx, -ry, -rz), v3(rx, ry, -rz), 'Y', structuralOpacity);
  addLine(v3(rx, -ry, rz), v3(rx, ry, rz), 'Y', structuralOpacity);
  addLine(v3(-rx, -ry, rz), v3(-rx, ry, rz), 'Y', structuralOpacity);

  // -------------------------------------------------------------
  // 2. Cuadrículas Interiores en las 6 Caras de la Habitación
  // -------------------------------------------------------------
  const gridSteps = 5;
  const wallGridOpacity = 0.16;
  const floorGridOpacity = 0.22;

  // A) SUELO (Plano inferior Y = -ry)
  for (let i = 1; i < gridSteps; i++) {
    const t = i / gridSteps;
    const z = -rz + t * 2 * rz;
    const x = -rx + t * 2 * rx;
    addLine(v3(-rx, -ry, z), v3(rx, -ry, z), 'X', floorGridOpacity);
    addLine(v3(x, -ry, -rz), v3(x, -ry, rz), 'Z', floorGridOpacity);
  }

  // B) TECHO (Plano superior Y = +ry)
  for (let i = 1; i < gridSteps; i++) {
    const t = i / gridSteps;
    const z = -rz + t * 2 * rz;
    const x = -rx + t * 2 * rx;
    addLine(v3(-rx, ry, z), v3(rx, ry, z), 'X', wallGridOpacity * 0.7);
    addLine(v3(x, ry, -rz), v3(x, ry, rz), 'Z', wallGridOpacity * 0.7);
  }

  // C) PARED IZQUIERDA (Plano X = -rx)
  for (let i = 1; i < gridSteps; i++) {
    const t = i / gridSteps;
    const y = -ry + t * 2 * ry;
    const z = -rz + t * 2 * rz;
    addLine(v3(-rx, y, -rz), v3(-rx, y, rz), 'Z', wallGridOpacity);
    addLine(v3(-rx, -ry, z), v3(-rx, ry, z), 'Y', wallGridOpacity);
  }

  // D) PARED DERECHA (Plano X = +rx)
  for (let i = 1; i < gridSteps; i++) {
    const t = i / gridSteps;
    const y = -ry + t * 2 * ry;
    const z = -rz + t * 2 * rz;
    addLine(v3(rx, y, -rz), v3(rx, y, rz), 'Z', wallGridOpacity);
    addLine(v3(rx, -ry, z), v3(rx, ry, z), 'Y', wallGridOpacity);
  }

  // E) PARED POSTERIOR (Plano Z = -rz)
  for (let i = 1; i < gridSteps; i++) {
    const t = i / gridSteps;
    const x = -rx + t * 2 * rx;
    const y = -ry + t * 2 * ry;
    addLine(v3(-rx, y, -rz), v3(rx, y, -rz), 'X', wallGridOpacity);
    addLine(v3(x, -ry, -rz), v3(x, ry, -rz), 'Y', wallGridOpacity);
  }

  // F) PARED ANTERIOR (Plano Z = +rz)
  for (let i = 1; i < gridSteps; i++) {
    const t = i / gridSteps;
    const x = -rx + t * 2 * rx;
    const y = -ry + t * 2 * ry;
    addLine(v3(-rx, y, rz), v3(rx, y, rz), 'X', wallGridOpacity * 0.5);
    addLine(v3(x, -ry, rz), v3(x, ry, rz), 'Y', wallGridOpacity * 0.5);
  }

  return lines;
}
