import jsQR from 'jsqr';
import { parseSheetQRPayload } from './qrHelper';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore Vite query import for worker asset
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { generateCubeChallenge, CubeChallenge, Point2D } from './geometry';
import { MODULE_PARALLELEPIPEDS, LessonNode } from './curriculumData';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const ALL_LESSONS = MODULE_PARALLELEPIPEDS.units.flatMap((u) => u.nodes);
const LESSON_MAP: Record<string, LessonNode> = Object.fromEntries(
  ALL_LESSONS.map((l) => [l.code, l])
);

/**
 * Paplitz - Procesador de Imagen Offline para Hojas Escaneadas
 * Detecta las 4 esquinas fiduciales de la página A4, mapea las casillas por homografía y
 * ancla la geometría digital 1:1 sobre la figura impresa mediante registro multiescala.
 */

export interface ScannedCellResult {
  cellIndex: number;
  seed: number;
  score: number;
  passed: boolean;
  detectedStrokesCount: number;
  targetEdgesCount: number;
  missingEdgesCount: number;
  message: string;
  tip?: string;
  croppedImageUrl?: string;
  calibCx: number;
  calibCy: number;
  calibScale: number;
  calibOffsetX?: number;
  calibOffsetY?: number;
}

export interface SheetScanResult {
  success: boolean;
  message: string;
  processedImageUrl?: string;
  cells: ScannedCellResult[];
  overallScore: number;
  qrDetected?: boolean;
  detectedLessonCode?: string;
  detectedSeed?: number;
}

/**
 * Convierte un archivo subido (sea PDF, PNG, JPG o WEBP) en un elemento HTMLCanvasElement
 * para procesar la imagen con algoritmos de visión y contraste.
 */
async function getCanvasFromFile(file: File): Promise<{ canvas: HTMLCanvasElement; dataUrl: string }> {
  const isPdf =
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    // Obtener la página 1 del PDF (la lámina A4 escaneada)
    const page = await pdf.getPage(1);
    
    // Escala adaptativa para renderizar a resolución óptima (~2000-2200 px de dimensión mayor)
    const unscaled = page.getViewport({ scale: 1.0 });
    const targetMaxDim = 2200;
    const targetScale = Math.min(2.5, Math.max(1.0, targetMaxDim / Math.max(unscaled.width, unscaled.height)));
    const viewport = page.getViewport({ scale: targetScale });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No se pudo inicializar el contexto 2D para renderizar el PDF.');
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvas,
      canvasContext: ctx,
      viewport,
    }).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    return { canvas, dataUrl };
  } else {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo inicializar el contexto 2D de la imagen.'));
            return;
          }
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          resolve({ canvas, dataUrl });
        };
        img.onerror = () => {
          reject(new Error('No se pudo cargar la imagen seleccionada.'));
        };
        img.src = dataUrl;
      };
      reader.onerror = () => {
        reject(new Error('Error al leer el archivo.'));
      };
      reader.readAsDataURL(file);
    });
  }
}

/**
 * Obtiene el brillo en escala de grises de un píxel de forma segura
 */
function getB(data: Uint8ClampedArray, W: number, H: number, x: number, y: number): number {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || x >= W || y < 0 || y >= H) return 255;
  const idx = (y * W + x) * 4;
  return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
}

/**
 * Localiza con precisión sub-píxel una diana concéntrica de 10mm en un cuadrante específico de la página.
 */
function findQuadrantFiducial(
  data: Uint8ClampedArray,
  W: number,
  H: number,
  quadX0: number,
  quadX1: number,
  quadY0: number,
  quadY1: number
): { x: number; y: number; score: number } {
  let bestScore = -Infinity;
  let bestX = Math.round((quadX0 + quadX1) / 2);
  let bestY = Math.round((quadY0 + quadY1) / 2);

  const estPxPerMm = Math.max(2, Math.min(W / 210, H / 297));
  const scales = [estPxPerMm * 0.7, estPxPerMm, estPxPerMm * 1.3];

  for (const pxPerMm of scales) {
    const rWhite = Math.max(2, Math.round(2.0 * pxPerMm));
    const rBlack = Math.max(4, Math.round(4.0 * pxPerMm));
    const step = Math.max(2, Math.round(pxPerMm * 0.5));

    for (let y = Math.round(quadY0); y <= Math.round(quadY1); y += step) {
      for (let x = Math.round(quadX0); x <= Math.round(quadX1); x += step) {
        const bCenter = getB(data, W, H, x, y);
        if (bCenter > 115) continue;

        const whiteAvg =
          (getB(data, W, H, x - rWhite, y) +
            getB(data, W, H, x + rWhite, y) +
            getB(data, W, H, x, y - rWhite) +
            getB(data, W, H, x, y + rWhite)) / 4;

        const blackAvg =
          (getB(data, W, H, x - rBlack, y) +
            getB(data, W, H, x + rBlack, y) +
            getB(data, W, H, x, y - rBlack) +
            getB(data, W, H, x, y + rBlack)) / 4;

        const score = whiteAvg - (bCenter * 0.6 + blackAvg * 0.4);
        if (score > bestScore) {
          bestScore = score;
          bestX = x;
          bestY = y;
        }
      }
    }
  }

  // Refinamiento sub-píxel
  if (bestScore > 30) {
    let fineBestScore = bestScore;
    let fineX = bestX;
    let fineY = bestY;
    const rWhite = Math.max(2, Math.round(2.0 * estPxPerMm));
    const rBlack = Math.max(4, Math.round(4.0 * estPxPerMm));

    for (let dy = -6; dy <= 6; dy += 1) {
      for (let dx = -6; dx <= 6; dx += 1) {
        const x = bestX + dx;
        const y = bestY + dy;
        const bCenter = getB(data, W, H, x, y);
        const whiteAvg =
          (getB(data, W, H, x - rWhite, y) +
            getB(data, W, H, x + rWhite, y) +
            getB(data, W, H, x, y - rWhite) +
            getB(data, W, H, x, y + rWhite)) / 4;

        const blackAvg =
          (getB(data, W, H, x - rBlack, y) +
            getB(data, W, H, x + rBlack, y) +
            getB(data, W, H, x, y - rBlack) +
            getB(data, W, H, x, y + rBlack)) / 4;

        const score = whiteAvg - (bCenter * 0.6 + blackAvg * 0.4);
        if (score > fineBestScore) {
          fineBestScore = score;
          fineX = x;
          fineY = y;
        }
      }
    }
    return { x: fineX, y: fineY, score: fineBestScore };
  }

  return { x: bestX, y: bestY, score: bestScore };
}

/**
 * Detecta automáticamente las 4 dianas fiduciales de la página A4 en cualquier condición
 * (escaneo plano con márgenes blancos variables o fotografía smartphone con perspectiva).
 */
function detectSheetCornersUniversal(data: Uint8ClampedArray, W: number, H: number) {
  const tl = findQuadrantFiducial(data, W, H, 0, W * 0.45, 0, H * 0.35);
  const tr = findQuadrantFiducial(data, W, H, W * 0.55, W, 0, H * 0.35);
  const bl = findQuadrantFiducial(data, W, H, 0, W * 0.45, H * 0.65, H);
  const br = findQuadrantFiducial(data, W, H, W * 0.55, W, H * 0.65, H);

  const valid = tl.score > 35 && tr.score > 35 && bl.score > 35 && br.score > 35;
  const pxPerMm = Math.max(2, Math.min(W / 210, H / 297));
  return { tl, tr, bl, br, valid, pxPerMm };
}

/**
 * Resuelve el sistema lineal 8x8 para obtener la matriz de homografía proyectiva 3x3 exacta
 * que mapea coordenadas milimétricas de la página A4 a píxeles con perspectiva óptica real.
 */
function getProjectiveHomography(
  srcPts: [Point2D, Point2D, Point2D, Point2D],
  dstPts: [Point2D, Point2D, Point2D, Point2D]
): (xMm: number, yMm: number) => Point2D {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = srcPts[i];
    const { x: X, y: Y } = dstPts[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]);
    b.push(X);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]);
    b.push(Y);
  }

  const n = 8;
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
    }
    const tempA = A[i];
    A[i] = A[maxRow];
    A[maxRow] = tempA;
    const tempB = b[i];
    b[i] = b[maxRow];
    b[maxRow] = tempB;

    for (let k = i + 1; k < n; k++) {
      const f = A[k][i] / A[i][i];
      for (let j = i; j < n; j++) A[k][j] -= f * A[i][j];
      b[k] -= f * b[i];
    }
  }

  const h = new Array(8);
  for (let i = n - 1; i >= 0; i--) {
    let sum = b[i];
    for (let j = i + 1; j < n; j++) sum -= A[i][j] * h[j];
    h[i] = sum / A[i][i];
  }

  return (xMm: number, yMm: number): Point2D => {
    const denom = h[6] * xMm + h[7] * yMm + 1;
    const px = (h[0] * xMm + h[1] * yMm + h[2]) / denom;
    const py = (h[3] * xMm + h[4] * yMm + h[5]) / denom;
    return { x: Math.round(px), y: Math.round(py) };
  };
}

/**
 * Crea un mapeador de homografía proyectiva exacta de coordenadas milimétricas de la página A4 a píxeles
 */
function createHomographyMapper(
  fid: { tl: Point2D; tr: Point2D; bl: Point2D; br: Point2D; valid: boolean },
  W: number,
  H: number
) {
  if (fid.valid) {
    const { tl, tr, bl, br } = fid;
    return getProjectiveHomography(
      [
        { x: 12, y: 12 },
        { x: 198, y: 12 },
        { x: 12, y: 285 },
        { x: 198, y: 285 },
      ],
      [tl, tr, bl, br]
    );
  }
  const pxPerMm = Math.min(W / 210, H / 297);
  return (xMm: number, yMm: number): Point2D => ({
    x: Math.round(xMm * pxPerMm),
    y: Math.round(yMm * pxPerMm),
  });
}

/**
 * Rectificación proyectiva de la casilla física (57x58 mm) a un lienzo 570x580 px
 */
function warpCellFromCornersToCanvas(
  srcData: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  pTL: Point2D,
  pTR: Point2D,
  pBL: Point2D,
  pBR: Point2D,
  dstCanvas: HTMLCanvasElement
): void {
  const dstW = dstCanvas.width;
  const dstH = dstCanvas.height;
  const dstCtx = dstCanvas.getContext('2d');
  if (!dstCtx) return;

  const imgData = dstCtx.createImageData(dstW, dstH);
  const dstData = imgData.data;

  for (let dy = 0; dy < dstH; dy++) {
    const v = dy / (dstH - 1);
    for (let dx = 0; dx < dstW; dx++) {
      const u = dx / (dstW - 1);
      const sx = (1 - u) * (1 - v) * pTL.x + u * (1 - v) * pTR.x + (1 - u) * v * pBL.x + u * v * pBR.x;
      const sy = (1 - u) * (1 - v) * pTL.y + u * (1 - v) * pTR.y + (1 - u) * v * pBL.y + u * v * pBR.y;

      const x0 = Math.floor(sx);
      const x1 = Math.min(srcW - 1, x0 + 1);
      const fx = sx - x0;

      const y0 = Math.floor(sy);
      const y1 = Math.min(srcH - 1, y0 + 1);
      const fy = sy - y0;

      const dstIdx = (dy * dstW + dx) * 4;

      for (let c = 0; c < 3; c++) {
        const p00 = srcData[(y0 * srcW + x0) * 4 + c];
        const p10 = srcData[(y0 * srcW + x1) * 4 + c];
        const p01 = srcData[(y1 * srcW + x0) * 4 + c];
        const p11 = srcData[(y1 * srcW + x1) * 4 + c];

        dstData[dstIdx + c] = Math.round(
          (1 - fx) * (1 - fy) * p00 +
            fx * (1 - fy) * p10 +
            (1 - fx) * fy * p01 +
            fx * fy * p11
        );
      }
      dstData[dstIdx + 3] = 255;
    }
  }

  dstCtx.putImageData(imgData, 0, 0);
}

/**
 * Registro geométrico multiescala universal:
 * Localiza la posición (cx, cy) y escala que ancla la figura impresa dada exactamente
 * sobre los trazos negros del papel con 0 píxeles de error.
 */
function registerGivenGeometry(
  cropData: Uint8ClampedArray,
  cropW: number,
  cropH: number,
  challenge: CubeChallenge,
  initialCx: number = 285,
  initialCy: number = 310,
  initialScale: number = 1.368
): {
  cx: number;
  cy: number;
  scale: number;
  score: number;
  calibOffsetX: number;
  calibOffsetY: number;
} {
  const gf = challenge.givenFace.vertices.map((vIdx) => challenge.vertices2D[vIdx]);
  const numEdges = gf.length;

  let bestScore = Infinity;
  let bestCx = initialCx;
  let bestCy = initialCy;
  let bestScale = initialScale;

  // Barrido espacial multiescala: dx [-40..+42], dy [-34..+46], scale [0.88..1.12]
  for (let sMult = 0.88; sMult <= 1.12; sMult += 0.02) {
    const scale = initialScale * sMult;
    for (let dy = -34; dy <= 46; dy += 2) {
      for (let dx = -40; dx <= 42; dx += 2) {
        const cx = initialCx + dx;
        const cy = initialCy + dy;

        let totalB = 0;
        let count = 0;

        for (let i = 0; i < numEdges; i++) {
          const p1 = gf[i];
          const p2 = gf[(i + 1) % numEdges];

          const x1 = cx + (p1.x - 150) * scale;
          const y1 = cy + (p1.y - 150) * scale;
          const x2 = cx + (p2.x - 150) * scale;
          const y2 = cy + (p2.y - 150) * scale;

          for (let t = 0.15; t <= 0.85; t += 0.15) {
            const px = Math.round(x1 + (x2 - x1) * t);
            const py = Math.round(y1 + (y2 - y1) * t);

            if (px >= 0 && px < cropW && py >= 0 && py < cropH) {
              const idx = (py * cropW + px) * 4;
              totalB += (cropData[idx] + cropData[idx + 1] + cropData[idx + 2]) / 3;
              count++;
            }
          }
        }

        const avgB = totalB / (count || 1);
        if (avgB < bestScore) {
          bestScore = avgB;
          bestCx = cx;
          bestCy = cy;
          bestScale = scale;
        }
      }
    }
  }

  // Refinamiento sub-píxel (+/- 2.5px con paso 0.5px)
  let refinedCx = bestCx;
  let refinedCy = bestCy;
  let refinedScale = bestScale;

  for (let sMult = 0.98; sMult <= 1.02; sMult += 0.005) {
    const scale = bestScale * sMult;
    for (let dy = -2.5; dy <= 2.5; dy += 0.5) {
      for (let dx = -2.5; dx <= 2.5; dx += 0.5) {
        const cx = bestCx + dx;
        const cy = bestCy + dy;
        let totalB = 0;
        let count = 0;

        for (let i = 0; i < numEdges; i++) {
          const p1 = gf[i];
          const p2 = gf[(i + 1) % numEdges];
          const x1 = cx + (p1.x - 150) * scale;
          const y1 = cy + (p1.y - 150) * scale;
          const x2 = cx + (p2.x - 150) * scale;
          const y2 = cy + (p2.y - 150) * scale;

          for (let t = 0.1; t <= 0.9; t += 0.1) {
            const px = Math.round(x1 + (x2 - x1) * t);
            const py = Math.round(y1 + (y2 - y1) * t);
            if (px >= 0 && px < cropW && py >= 0 && py < cropH) {
              const idx = (py * cropW + px) * 4;
              totalB += (cropData[idx] + cropData[idx + 1] + cropData[idx + 2]) / 3;
              count++;
            }
          }
        }

        const avgB = totalB / (count || 1);
        if (avgB < bestScore) {
          bestScore = avgB;
          refinedCx = cx;
          refinedCy = cy;
          refinedScale = scale;
        }
      }
    }
  }

  return {
    cx: refinedCx,
    cy: refinedCy,
    scale: refinedScale,
    score: bestScore,
    calibOffsetX: refinedCx - initialCx,
    calibOffsetY: refinedCy - initialCy,
  };
}

/**
 * Evalúa los trazos reales dibujados a lápiz dentro de la casilla rectificada (570x580 px).
 * Regla estricta: Si falta alguna arista exterior para cerrar el volumen -> 0% DE NOTA.
 */
function evaluateCellDrawing(
  cropData: Uint8ClampedArray,
  cropWidth: number,
  cropHeight: number,
  challenge: CubeChallenge,
  cx: number,
  cy: number,
  scale: number
): {
  score: number;
  passed: boolean;
  detectedEdgesCount: number;
  targetEdgesCount: number;
  missingEdgesCount: number;
  message: string;
  tip: string;
} {
  const targetEdges = challenge.targetEdges;
  const targetEdgesCount = targetEdges.length;

  const toCrop = (p: Point2D) => ({
    x: Math.round(cx + (p.x - 150) * scale),
    y: Math.round(cy + (p.y - 150) * scale),
  });

  // Estimar brillo local del fondo del papel
  let bgSum = 0;
  let bgCount = 0;
  for (let y = 100; y < cropHeight - 100; y += 20) {
    for (let x = 100; x < cropWidth - 100; x += 20) {
      const idx = (y * cropWidth + x) * 4;
      bgSum += (cropData[idx] + cropData[idx + 1] + cropData[idx + 2]) / 3;
      bgCount++;
    }
  }
  const paperB = bgSum / (bgCount || 1);
  // Sensibilidad calibrada para grafito de lápiz sobre papel
  const strokeThresh = paperB - 18;

  let missingCount = 0;
  let detectedCount = 0;
  const edgeScores: number[] = [];

  targetEdges.forEach((edge) => {
    const p1 = toCrop(challenge.vertices2D[edge.start]);
    const p2 = toCrop(challenge.vertices2D[edge.end]);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    let hitCount = 0;
    let totalSteps = 0;
    const dists: number[] = [];

    for (let t = 0.15; t <= 0.85; t += 0.05) {
      totalSteps++;
      const mx = p1.x + dx * t;
      const my = p1.y + dy * t;
      let minRayD = Infinity;

      // Búsqueda en una franja de +/- 34 px (~3.4 mm en papel)
      for (let d = -34; d <= 34; d += 2) {
        const px = Math.round(mx + nx * d);
        const py = Math.round(my + ny * d);
        if (px >= 0 && px < cropWidth && py >= 0 && py < cropHeight) {
          const idx = (py * cropWidth + px) * 4;
          const b = (cropData[idx] + cropData[idx + 1] + cropData[idx + 2]) / 3;
          if (b < strokeThresh) {
            if (Math.abs(d) < minRayD) minRayD = Math.abs(d);
          }
        }
      }
      if (minRayD < Infinity) {
        hitCount++;
        dists.push(minRayD);
      }
    }

    const coverage = hitCount / (totalSteps || 1);

    if (coverage < 0.25) {
      missingCount++;
    } else {
      detectedCount++;
      const avgD = dists.length > 0 ? dists.reduce((a, b) => a + b, 0) / dists.length : 30;
      // Criterio de precisión estricto: penaliza desviación angular y desplazamiento
      const precisionScore = Math.max(25, 100 - avgD * 1.85);
      // Factor de completitud longitudinal exigente (requiere al menos el 75% para no penalizar)
      const lengthFactor = coverage >= 0.75 ? 1.0 : Math.max(0.45, coverage / 0.75);
      const edgeScore = Math.min(100, Math.round(precisionScore * lengthFactor));
      edgeScores.push(edgeScore);
    }
  });

  if (missingCount >= 2) {
    return {
      score: 0,
      passed: false,
      detectedEdgesCount: detectedCount,
      targetEdgesCount,
      missingEdgesCount: missingCount,
      message: `Cubo incompleto: faltan ${missingCount} de las ${targetEdgesCount} aristas obligatorias. Calificación: 0%.`,
      tip: 'En perspectiva axonométrica y cónica todas las aristas exteriores son obligatorias para definir el volumen.',
    };
  }

  if (missingCount === 1) {
    const rawAvg = Math.round(edgeScores.reduce((a, b) => a + b, 0) / (edgeScores.length || 1));
    const score = Math.max(20, Math.min(50, rawAvg - 35));
    return {
      score,
      passed: false,
      detectedEdgesCount: detectedCount,
      targetEdgesCount,
      missingEdgesCount: 1,
      message: `Falta 1 arista por cerrar en el cubo. Calificación: ${score}%.`,
      tip: 'Revisa que todas las caras del volumen queden completamente cerradas con sus aristas.',
    };
  }

  const avgScore = Math.round(edgeScores.reduce((a, b) => a + b, 0) / (edgeScores.length || 1));
  const passed = avgScore >= 80;

  let message = '';
  let tip = '';

  if (avgScore >= 92) {
    message = 'Geometría y perspectiva sobresalientes. Trazo milimétrico y excelente control de fuga.';
    tip = 'Nivel de maestría en perspectiva. Mantén esta firmeza y precisión de trazo.';
  } else if (avgScore >= 80) {
    message = 'Aprobado. Buena alineación general de aristas y proporciones equilibradas.';
    tip = 'Trazo seguro. Para subir de nota, ajusta la convergencia sutil hacia los puntos de fuga.';
  } else if (avgScore >= 70) {
    message = `No superado (${avgScore}%). Desviación en aristas de fuga o trazos con longitud incompleta.`;
    tip = 'Asegúrate de llevar cada arista hasta su vértice exacto y vigilar el paralelismo/fuga.';
  } else {
    message = `Insuficiente (${avgScore}%). Desajuste geométrico importante o distorsión angular.`;
    tip = 'Revisa la dirección de los ejes de coordenadas y proyecta las aristas con mayor rigor.';
  }

  return {
    score: avgScore,
    passed,
    detectedEdgesCount: detectedCount,
    targetEdgesCount,
    missingEdgesCount: 0,
    message,
    tip,
  };
}

/**
 * Procesa un archivo subido (PDF o Imagen) de la hoja A4, detecta marcadores de esquina y encuadra cada casilla.
 */
export async function processScannedSheet(
  file: File,
  expectedSeed: number = 101
): Promise<SheetScanResult> {
  try {
    const { canvas, dataUrl } = await getCanvasFromFile(file);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        success: false,
        message: 'No se pudo inicializar el procesador gráfico.',
        cells: [],
        overallScore: 0,
      };
    }

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // 1. Intentar decodificar el código QR de cabecera
    let qrDetected = false;
    let activeSeed = expectedSeed;
    let activeLessonCode = '1.1';

    try {
      const qrResult = jsQR(data, canvas.width, canvas.height);
      if (qrResult && qrResult.data) {
        const parsed = parseSheetQRPayload(qrResult.data);
        if (parsed.valid) {
          qrDetected = true;
          if (parsed.seed) activeSeed = parsed.seed;
          if (parsed.lessonCode) activeLessonCode = parsed.lessonCode;
        }
      }
    } catch (qrErr) {
      console.warn('Escaneo de QR omitido o no detectado:', qrErr);
    }

    // 2. Detectar las 4 esquinas de la lámina A4 y crear el mapeador de homografía
    const corners = detectSheetCornersUniversal(data, canvas.width, canvas.height);
    const mapper = createHomographyMapper(corners, canvas.width, canvas.height);

    const lesson = LESSON_MAP[activeLessonCode] || {
      perspectiveMode: 'gentle',
      axesMode: 'xyz',
      forceSide: 'left',
      isShadowLevel: false,
      hasGroundGrid: false,
    };

    // Centro y escala de referencia física canónica (lienzo 570x580 px para recuadro de 57x58 mm)
    const initialCx = 285;
    const initialCy = 310;
    const initialScale = 1.368;

    // 3. Evaluar y rectificar cada una de las 12 casillas usando homografía exacta de las 4 esquinas
    const cells: ScannedCellResult[] = [];
    let totalScore = 0;

    for (let c = 1; c <= 12; c++) {
      const cellSeed = activeSeed * 100 + c;
      const col = (c - 1) % 3;
      const row = Math.floor((c - 1) / 3);

      const pTL = mapper(14.5 + col * 62, 31.5 + row * 63);
      const pTR = mapper(14.5 + col * 62 + 57, 31.5 + row * 63);
      const pBL = mapper(14.5 + col * 62, 31.5 + row * 63 + 58);
      const pBR = mapper(14.5 + col * 62 + 57, 31.5 + row * 63 + 58);

      // Crear lienzo de la casilla rectificada (570 x 580 px)
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = 570;
      cropCanvas.height = 580;

      warpCellFromCornersToCanvas(data, canvas.width, canvas.height, pTL, pTR, pBL, pBR, cropCanvas);
      const cropCtx = cropCanvas.getContext('2d');

      let cellResult: ScannedCellResult;

      if (cropCtx) {
        const cropImgData = cropCtx.getImageData(0, 0, 570, 580);
        const challenge = generateCubeChallenge(cellSeed, 300, 300, {
          mode: lesson.perspectiveMode,
          axesMode: lesson.axesMode,
          forceSide: lesson.forceSide,
          isShadowLevel: lesson.isShadowLevel,
          hasGroundGrid: lesson.hasGroundGrid,
        });

        // Registro geométrico 1:1: ancla la cara digital directamente sobre la cara impresa
        const reg = registerGivenGeometry(
          cropImgData.data,
          570,
          580,
          challenge,
          initialCx,
          initialCy,
          initialScale
        );

        const evalResult = evaluateCellDrawing(
          cropImgData.data,
          570,
          580,
          challenge,
          reg.cx,
          reg.cy,
          reg.scale
        );

        const croppedImageUrl = cropCanvas.toDataURL('image/jpeg', 0.88);

        cellResult = {
          cellIndex: c,
          seed: cellSeed,
          score: evalResult.score,
          passed: evalResult.passed,
          detectedStrokesCount: evalResult.detectedEdgesCount,
          targetEdgesCount: evalResult.targetEdgesCount,
          missingEdgesCount: evalResult.missingEdgesCount,
          message: evalResult.message,
          tip: evalResult.tip,
          croppedImageUrl,
          calibCx: reg.cx,
          calibCy: reg.cy,
          calibScale: reg.scale,
          calibOffsetX: reg.calibOffsetX,
          calibOffsetY: reg.calibOffsetY,
        };
      } else {
        cellResult = {
          cellIndex: c,
          seed: cellSeed,
          score: 0,
          passed: false,
          detectedStrokesCount: 0,
          targetEdgesCount: 5,
          missingEdgesCount: 5,
          message: 'Error al procesar la celda.',
          calibCx: initialCx,
          calibCy: initialCy,
          calibScale: initialScale,
        };
      }

      cells.push(cellResult);
      totalScore += cellResult.score;
    }

    const overallScore = Math.round(totalScore / cells.length);

    return {
      success: true,
      message: `Procesamiento completado con éxito. Nota media: ${overallScore}% (${cells.filter((c) => c.passed).length}/12 aprobadas).`,
      processedImageUrl: dataUrl,
      cells,
      overallScore,
      qrDetected,
      detectedLessonCode: activeLessonCode,
      detectedSeed: activeSeed,
    };
  } catch (error: any) {
    console.error('Error procesando lámina:', error);
    return {
      success: false,
      message: error.message || 'Error inesperado durante el procesamiento de la lámina.',
      cells: [],
      overallScore: 0,
    };
  }
}
