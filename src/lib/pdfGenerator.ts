import { jsPDF } from 'jspdf';
import { generateCubeChallenge, clampRayToBox, Point2D, CubeChallenge } from './geometry';
import { LessonNode } from './curriculumData';
import { drawQRCodeOnPDF, createSheetQRPayload } from './qrHelper';
import { SheetScanResult, ScannedCellResult } from './sheetScanner';

export interface SheetConfig {
  title: string;
  moduleName: string;
  seed: number;
  gridRows: number;
  gridCols: number;
  lesson?: LessonNode;
}

export interface CorrectionPDFConfig {
  scanResult: SheetScanResult;
  lesson: LessonNode;
  calibOffsetX?: number;
  calibOffsetY?: number;
  calibScale?: number;
  showHorizon?: boolean;
  showAxes?: boolean;
}

/**
 * Dibuja el isotipo vectorial oficial de Paplitz en el documento PDF
 */
function drawPaplitzLogo(doc: jsPDF, x: number, y: number, size: number = 13): void {
  const cardSize = size - 1.2;
  // Sombra sólida negra desplazada abajo a la derecha
  doc.setFillColor(0, 0, 0);
  doc.rect(x + 1.2, y + 1.2, cardSize, cardSize, 'F');

  // Tarjeta blanca con borde negro
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(x, y, cardSize, cardSize, 'FD');

  // Matriz de 5x5 puntos negros cuadrados (halftone manga)
  const padding = 1.8;
  const avail = cardSize - padding * 2;
  const step = avail / 4;
  const dotSize = 0.6;
  doc.setFillColor(0, 0, 0);
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      doc.rect(x + padding + c * step - dotSize / 2, y + padding + r * step - dotSize / 2, dotSize, dotSize, 'F');
    }
  }

  // Cuadrado central blanco girado ~12.5° con borde negro que oculta puntos interiores
  const cx = x + cardSize / 2;
  const cy = y + cardSize / 2;
  const halfSq = cardSize * 0.22;
  const ang = (12.5 * Math.PI) / 180;
  const rot = (dx: number, dy: number) => ({
    x: cx + dx * Math.cos(ang) - dy * Math.sin(ang),
    y: cy + dx * Math.sin(ang) + dy * Math.cos(ang),
  });
  const p1 = rot(-halfSq, -halfSq);
  const p2 = rot(halfSq, -halfSq);
  const p3 = rot(halfSq, halfSq);
  const p4 = rot(-halfSq, halfSq);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.lines(
    [
      [p2.x - p1.x, p2.y - p1.y],
      [p3.x - p2.x, p3.y - p2.y],
      [p4.x - p3.x, p4.y - p3.y],
    ],
    p1.x,
    p1.y,
    [1, 1],
    'FD',
    true
  );
}

/**
 * Genera un documento PDF A4 vectorial listo para imprimir.
 * Incluye marcadores fiduciales en las 4 esquinas para la corrección digital de la foto/escaneo.
 */
export function generateA4PracticeSheet(config: SheetConfig): void {
  // Crear documento A4 en orientación vertical (210 x 297 mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;

  // 1. DIBUJAR MARCADORES FIDUCIALES EN LAS 4 ESQUINAS (Dianas de alto contraste B&N)
  const drawCornerMarker = (cx: number, cy: number) => {
    doc.setDrawColor(0, 0, 0);
    doc.setFillColor(0, 0, 0);
    // Cuadrado exterior negro
    doc.rect(cx - 5, cy - 5, 10, 10, 'FD');
    // Cuadrado interior blanco
    doc.setFillColor(255, 255, 255);
    doc.rect(cx - 3, cy - 3, 6, 6, 'FD');
    // Punto central negro
    doc.setFillColor(0, 0, 0);
    doc.rect(cx - 1, cy - 1, 2, 2, 'FD');
  };

  drawCornerMarker(margin, margin); // Arriba-Izquierda
  drawCornerMarker(pageWidth - margin, margin); // Arriba-Derecha
  drawCornerMarker(margin, pageHeight - margin); // Abajo-Izquierda
  drawCornerMarker(pageWidth - margin, pageHeight - margin); // Abajo-Derecha

  // 2. CABECERA TÉCNICA CON LOGO OFICIAL PAPLITZ Y CÓDIGO QR
  const logoSize = 13;
  const logoX = margin + 8;
  const logoY = margin - 2;
  drawPaplitzLogo(doc, logoX, logoY, logoSize);

  // 2.1. Código QR compacto para validación digital instantánea
  const qrSize = 12.5;
  const qrX = pageWidth - margin - 8 - qrSize;
  const qrY = margin - 1.5;
  const lessonCode = config.lesson?.code || '1.1';
  const qrPayload = createSheetQRPayload(lessonCode, config.seed, config.gridRows * config.gridCols);
  drawQRCodeOnPDF(doc, qrPayload, qrX, qrY, qrSize);

  doc.setFont('courier', 'bold');
  doc.setFontSize(4.5);
  doc.text('VALIDACIÓN QR', qrX + qrSize / 2, qrY + qrSize + 2, { align: 'center' });

  // 2.2. Textos técnicos de cabecera
  const textStartX = logoX + logoSize + 4;
  doc.setFont('courier', 'bold');
  doc.setFontSize(13);
  doc.text('PAPLITZ — HOJA DE ENTRENAMIENTO ANALÓGICA', textStartX, margin + 2);

  doc.setFontSize(7);
  doc.setFont('courier', 'normal');
  const lessonDesc = config.lesson
    ? `LECCIÓN: ${config.lesson.code} · ${config.lesson.title.toUpperCase()}`
    : `MÓDULO: ${config.moduleName.toUpperCase()}`;
  doc.text(`${lessonDesc} | SERIE: #${config.seed} | FORMATO: A4`, textStartX, margin + 6.5);
  doc.text('INSTRUCCIÓN: Completa las aristas restantes a mano alzada. Escanea el folio para validar.', textStartX, margin + 10.5);

  // Línea divisoria
  doc.setLineWidth(0.6);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, margin + 15, pageWidth - margin, margin + 15);

  // 3. GENERACIÓN DE LA CUADRÍCULA DE CASILLAS
  const rows = config.gridRows;
  const cols = config.gridCols;
  const gridStartY = margin + 17;
  const gridWidth = pageWidth - margin * 2;
  const gridHeight = pageHeight - margin * 2 - 21;

  const cellWidth = gridWidth / cols;
  const cellHeight = gridHeight / rows;

  let challengeIdx = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      challengeIdx++;
      const cellX = margin + c * cellWidth;
      const cellY = gridStartY + r * cellHeight;
      const pad = 2.5;

      // Marco de la casilla (Recuadro físico)
      doc.setLineWidth(0.4);
      doc.setDrawColor(0, 0, 0);
      const boxX = cellX + pad;
      const boxY = cellY + pad;
      const boxW = cellWidth - pad * 2;
      const boxH = cellHeight - pad * 2;
      doc.rect(boxX, boxY, boxW, boxH);

      // Código de identificación de la casilla
      const cellSeed = config.seed * 100 + challengeIdx;
      doc.setFontSize(6.5);
      doc.setFont('courier', 'bold');
      doc.text(`[C-${challengeIdx.toString().padStart(2, '0')}] ID:${cellSeed}`, boxX + 2.5, boxY + 4);

      // Generar el reto de cubo adaptado a la lección seleccionada
      const challenge = generateCubeChallenge(cellSeed, 300, 300, {
        mode: config.lesson?.perspectiveMode || 'normal',
        axesMode: config.lesson?.axesMode || 'none',
        forceSide: config.lesson?.forceSide,
      });
      
      // Escalar y proyectar la cara al centro de la celda en mm
      const innerW = cellWidth - pad * 2;
      const innerH = cellHeight - pad * 2;
      const centerX = cellX + pad + innerW / 2;
      const centerY = cellY + pad + innerH / 2 + 2;

      const scale = (Math.min(innerW, innerH) * 0.72) / 300;

      // Límites interiores seguros de la casilla actual (con margen perimetral)
      const cellBox = {
        left: cellX + pad + 2.5,
        right: cellX + cellWidth - pad - 2.5,
        top: cellY + pad + 5.5, // Deja espacio limpio bajo la etiqueta [C-xx]
        bottom: cellY + cellHeight - pad - 2.5,
      };

      // 3.1. Dibujar ejes de ayuda rayados/discontinuos X, Y, Z si la lección los incluye
      if (challenge.axes && challenge.axes.length > 0) {
        doc.setLineWidth(0.2);
        doc.setDrawColor(50, 50, 50);
        doc.setLineDashPattern([1.4, 1.0], 0);

        challenge.axes.forEach((axis) => {
          const pOrigin = {
            x: centerX + (axis.origin.x - 150) * scale,
            y: centerY + (axis.origin.y - 150) * scale,
          };
          const rawFar = {
            x: centerX + (axis.farPoint.x - 150) * scale,
            y: centerY + (axis.farPoint.y - 150) * scale,
          };

          // Clamping estricto: el eje jamás sobresale de la casilla
          const pFar = clampRayToBox(pOrigin.x, pOrigin.y, rawFar.x, rawFar.y, cellBox, 3.2);

          doc.line(pOrigin.x, pOrigin.y, pFar.x, pFar.y);

          // Flechita técnica
          const theta = Math.atan2(pFar.y - pOrigin.y, pFar.x - pOrigin.x);
          const arrowSz = 1.3;
          doc.setLineDashPattern([], 0);
          doc.line(
            pFar.x,
            pFar.y,
            pFar.x - arrowSz * Math.cos(theta - Math.PI / 6),
            pFar.y - arrowSz * Math.sin(theta - Math.PI / 6)
          );
          doc.line(
            pFar.x,
            pFar.y,
            pFar.x - arrowSz * Math.cos(theta + Math.PI / 6),
            pFar.y - arrowSz * Math.sin(theta + Math.PI / 6)
          );

          // Letra del eje
          doc.setFontSize(4.5);
          doc.setFont('courier', 'bold');
          doc.text(axis.label, pFar.x + Math.cos(theta) * 2 - 0.6, pFar.y + Math.sin(theta) * 2 + 0.6);
          doc.setLineDashPattern([1.4, 1.0], 0);
        });

        doc.setLineDashPattern([], 0);
      }

      // 3.2. Obtener los 4 vértices de la cara dada
      const facePts = challenge.givenFace.vertices.map((vIdx) => {
        const p2d = challenge.vertices2D[vIdx];
        return {
          x: centerX + (p2d.x - 150) * scale,
          y: centerY + (p2d.y - 150) * scale,
        };
      });

      // Dibujar la cara dada con líneas negras entintadas
      doc.setLineWidth(0.65);
      doc.setDrawColor(0, 0, 0);
      doc.line(facePts[0].x, facePts[0].y, facePts[1].x, facePts[1].y);
      doc.line(facePts[1].x, facePts[1].y, facePts[2].x, facePts[2].y);
      doc.line(facePts[2].x, facePts[2].y, facePts[3].x, facePts[3].y);
      doc.line(facePts[3].x, facePts[3].y, facePts[0].x, facePts[0].y);

      // Puntos de esquina marcados
      doc.setFillColor(0, 0, 0);
      facePts.forEach((p) => {
        doc.circle(p.x, p.y, 0.5, 'FD');
      });
    }
  }

  // Pie de página limpio y técnico
  doc.setFontSize(7);
  doc.setFont('courier', 'normal');
  doc.text(`PAPLITZ · HOJA DE PRÁCTICA ANALÓGICA · SERIE #${config.seed}`, margin, pageHeight - margin + 6);

  // Descargar el PDF generado
  doc.save(`Paplitz_A4_Practica_Serie_${config.seed}.pdf`);
}

/**
 * Carga una imagen base64 de forma asíncrona para pintar en Canvas
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Compone en un lienzo de 570x580 px el escaneo real del alumno con las líneas de corrección 1:1
 */
async function compositeCellCorrection(
  cell: ScannedCellResult,
  challenge: CubeChallenge,
  calibOffsetX: number = 0,
  calibOffsetY: number = 0,
  calibScale: number = 1.0,
  showHorizon: boolean = true,
  showAxes: boolean = true
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 570;
  canvas.height = 580;
  const ctx = canvas.getContext('2d');
  if (!ctx) return cell.croppedImageUrl || '';

  // 1. Dibujar el recorte real del papel escaneado
  if (cell.croppedImageUrl) {
    try {
      const img = await loadImage(cell.croppedImageUrl);
      ctx.drawImage(img, 0, 0, 570, 580);
    } catch {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 570, 580);
    }
  } else {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 570, 580);
  }

  const cx = (cell.calibCx || 285) + calibOffsetX;
  const cy = (cell.calibCy || 310) + calibOffsetY;
  const effectiveScale = (cell.calibScale || 1.368) * calibScale;

  const toSvg = (p: Point2D) => ({
    x: cx + (p.x - 150) * effectiveScale,
    y: cy + (p.y - 150) * effectiveScale,
  });

  // 2. Línea de horizonte (LH)
  if (showHorizon) {
    const horizonY = cy + (challenge.horizonY - 150) * effectiveScale;
    ctx.save();
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(5, horizonY);
    ctx.lineTo(565, horizonY);
    ctx.stroke();

    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#444444';
    ctx.fillText('LH (LÍNEA DE HORIZONTE)', 15, horizonY - 4);
    ctx.restore();
  }

  // 3. Ejes de coordenadas X, Y, Z
  if (showAxes && challenge.axes) {
    challenge.axes.forEach((axis) => {
      const ox = cx + (axis.origin.x - 150) * effectiveScale;
      const oy = cy + (axis.origin.y - 150) * effectiveScale;
      const rawFx = cx + (axis.farPoint.x - 150) * effectiveScale;
      const rawFy = cy + (axis.farPoint.y - 150) * effectiveScale;
      const pFar = clampRayToBox(ox, oy, rawFx, rawFy, { left: 20, right: 550, top: 25, bottom: 555 }, 16);
      const fx = pFar.x;
      const fy = pFar.y;
      const theta = Math.atan2(fy - oy, fx - ox);
      const aSz = 9;

      ctx.save();
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(fx, fy);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx - aSz * Math.cos(theta - Math.PI / 6), fy - aSz * Math.sin(theta - Math.PI / 6));
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx - aSz * Math.cos(theta + Math.PI / 6), fy - aSz * Math.sin(theta + Math.PI / 6));
      ctx.stroke();

      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(axis.label, fx + Math.cos(theta) * 14, fy + Math.sin(theta) * 14);
      ctx.restore();
    });
  }

  // 4. Cara dada inicial (4 aristas en negro técnico + 4 vértices negros)
  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const facePts = challenge.givenFace.vertices.map((idx) => toSvg(challenge.vertices2D[idx]));
  if (facePts.length > 0) {
    ctx.moveTo(facePts[0].x, facePts[0].y);
    for (let i = 1; i < facePts.length; i++) {
      ctx.lineTo(facePts[i].x, facePts[i].y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.fillStyle = '#000000';
  facePts.forEach((pt) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // 5. Aristas objetivo ideales de corrección (halo blanco 6px + rojo discontinuo #DC2626 3.5px)
  challenge.targetEdges.forEach((edge) => {
    const p1 = toSvg(challenge.vertices2D[edge.start]);
    const p2 = toSvg(challenge.vertices2D[edge.end]);

    // Halo blanco
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 6.0;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.restore();

    // Trazo rojo técnico
    ctx.save();
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.setLineDash([9, 6]);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.restore();
  });

  // 6. Vértices objetivo esperados
  Object.values(challenge.targetVertices2D).forEach((p) => {
    const pt = toSvg(p);
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Genera y descarga el documento PDF oficial A4 con las correcciones completas
 * sobre la hoja subida (Página 1: Matriz 3x4 corregida 1:1, Página 2: Desglose didáctico).
 */
export async function generateCorrectionReportPDF(config: CorrectionPDFConfig): Promise<void> {
  const {
    scanResult,
    lesson,
    calibOffsetX = 0,
    calibOffsetY = 0,
    calibScale = 1.0,
    showHorizon = true,
    showAxes = true,
  } = config;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;

  // 1. MARCADORES FIDUCIALES
  const drawCornerMarker = (cx: number, cy: number) => {
    doc.setDrawColor(0, 0, 0);
    doc.setFillColor(0, 0, 0);
    doc.rect(cx - 5, cy - 5, 10, 10, 'FD');
    doc.setFillColor(255, 255, 255);
    doc.rect(cx - 3, cy - 3, 6, 6, 'FD');
    doc.setFillColor(0, 0, 0);
    doc.rect(cx - 1, cy - 1, 2, 2, 'FD');
  };

  drawCornerMarker(margin, margin);
  drawCornerMarker(pageWidth - margin, margin);
  drawCornerMarker(margin, pageHeight - margin);
  drawCornerMarker(pageWidth - margin, pageHeight - margin);

  // 2. CABECERA TÉCNICA
  const logoSize = 13;
  const logoX = margin + 8;
  const logoY = margin - 2;
  drawPaplitzLogo(doc, logoX, logoY, logoSize);

  // QR Code
  const qrSize = 12.5;
  const qrX = pageWidth - margin - 8 - qrSize;
  const qrY = margin - 1.5;
  const activeSeed = scanResult.detectedSeed || 101;
  const activeLessonCode = scanResult.detectedLessonCode || lesson.code;
  const qrPayload = createSheetQRPayload(activeLessonCode, activeSeed, 12);
  drawQRCodeOnPDF(doc, qrPayload, qrX, qrY, qrSize);

  doc.setFont('courier', 'bold');
  doc.setFontSize(4.5);
  doc.text('VALIDACIÓN QR', qrX + qrSize / 2, qrY + qrSize + 2, { align: 'center' });

  // Textos de Cabecera
  const textStartX = logoX + logoSize + 4;
  doc.setFont('courier', 'bold');
  doc.setFontSize(11.5);
  doc.text('PAPLITZ — INFORME DE CORRECCIÓN ANALÓGICA A4', textStartX, margin + 2);

  doc.setFontSize(6.5);
  doc.setFont('courier', 'normal');
  const passedCount = scanResult.cells.filter((c) => c.passed).length;
  doc.text(
    `LECCIÓN: ${activeLessonCode} · ${lesson.title.toUpperCase()} | SERIE: #${activeSeed} | NOTA MEDIA: ${scanResult.overallScore}% (${passedCount}/12 APROBADAS)`,
    textStartX,
    margin + 6.5
  );
  doc.text(
    `EVALUACIÓN: Superposición de la geometría ideal 3D (rojo) sobre tu dibujo escaneado.`,
    textStartX,
    margin + 10.5
  );

  // Línea divisoria
  doc.setLineWidth(0.6);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, margin + 15, pageWidth - margin, margin + 15);

  // 3. CUADRÍCULA 3x4 DE CASILLAS CORREGIDAS
  const rows = 4;
  const cols = 3;
  const gridStartY = margin + 17;
  const gridWidth = pageWidth - margin * 2;
  const gridHeight = pageHeight - margin * 2 - 21;

  const cellWidth = gridWidth / cols;
  const cellHeight = gridHeight / rows;

  for (let idx = 0; idx < scanResult.cells.length; idx++) {
    const cell = scanResult.cells[idx];
    const r = Math.floor(idx / cols);
    const c = idx % cols;

    const cellX = margin + c * cellWidth;
    const cellY = gridStartY + r * cellHeight;
    const pad = 2.5;

    const boxX = cellX + pad;
    const boxY = cellY + pad;
    const boxW = cellWidth - pad * 2;
    const boxH = cellHeight - pad * 2;

    const challenge = generateCubeChallenge(cell.seed, 300, 300, {
      mode: lesson.perspectiveMode,
      axesMode: lesson.axesMode,
      forceSide: lesson.forceSide,
      isShadowLevel: lesson.isShadowLevel,
      hasGroundGrid: lesson.hasGroundGrid,
    });

    // Componer la imagen con sus correcciones
    const compositedDataUrl = await compositeCellCorrection(
      cell,
      challenge,
      calibOffsetX,
      calibOffsetY,
      calibScale,
      showHorizon,
      showAxes
    );

    // Insertar imagen en el PDF
    if (compositedDataUrl) {
      doc.addImage(compositedDataUrl, 'JPEG', boxX, boxY, boxW, boxH);
    }

    // Marco exterior de la casilla
    doc.setLineWidth(0.4);
    doc.setDrawColor(0, 0, 0);
    doc.rect(boxX, boxY, boxW, boxH);

    // Badge superior izquierdo: [C-01] ID:#10101
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.rect(boxX + 1.5, boxY + 1.5, 22, 3.5, 'FD');
    doc.setFontSize(5.5);
    doc.setFont('courier', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`[C-${cell.cellIndex.toString().padStart(2, '0')}] #${cell.seed}`, boxX + 2.5, boxY + 4.0);

    // Badge superior derecho: Nota
    const badgeText =
      cell.score >= 80
        ? `${cell.score}% OK`
        : cell.score === 0
        ? `0% INC`
        : `${cell.score}% NO`;

    if (cell.score >= 80) {
      doc.setFillColor(0, 0, 0);
      doc.rect(boxX + boxW - 15.5, boxY + 1.5, 14, 3.5, 'F');
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(0, 0, 0);
      doc.rect(boxX + boxW - 15.5, boxY + 1.5, 14, 3.5, 'FD');
      doc.setTextColor(0, 0, 0);
    }
    doc.setFontSize(5.5);
    doc.setFont('courier', 'bold');
    doc.text(badgeText, boxX + boxW - 8.5, boxY + 4.0, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  // Pie de página P1
  doc.setFontSize(6.5);
  doc.setFont('courier', 'normal');
  doc.text(
    `PAPLITZ · INFORME DE CORRECCIÓN ANALÓGICA · SERIE #${activeSeed} · NOTA GLOBAL: ${scanResult.overallScore}% · PÁGINA 1/2`,
    margin,
    pageHeight - margin + 6
  );

  // 4. PÁGINA 2: DESGLOSE PEDAGÓGICO Y CONSEJOS TÉCNICOS
  doc.addPage('a4', 'portrait');

  // Marcadores de esquina en P2
  drawCornerMarker(margin, margin);
  drawCornerMarker(pageWidth - margin, margin);
  drawCornerMarker(margin, pageHeight - margin);
  drawCornerMarker(pageWidth - margin, pageHeight - margin);

  // Logo y Cabecera P2
  drawPaplitzLogo(doc, logoX, logoY, logoSize);
  doc.setFont('courier', 'bold');
  doc.setFontSize(12);
  doc.text('PAPLITZ — DESGLOSE PEDAGÓGICO Y CORRECCIÓN TÉCNICA', textStartX, margin + 2);

  doc.setFontSize(7);
  doc.setFont('courier', 'normal');
  doc.text(
    `ANÁLISIS DE GEOMETRÍA · ${passedCount} APROBADAS · ${12 - passedCount} A MEJORAR · PROMEDIO: ${scanResult.overallScore}%`,
    textStartX,
    margin + 6.5
  );
  doc.text(
    `FECHA DE CORRECCIÓN: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} | SERIE: #${activeSeed}`,
    textStartX,
    margin + 10.5
  );

  doc.setLineWidth(0.6);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, margin + 15, pageWidth - margin, margin + 15);

  // Tabla detallada de las 12 casillas
  let currentY = margin + 19;
  const rowHeight = 18.5;

  for (let i = 0; i < scanResult.cells.length; i++) {
    const cell = scanResult.cells[i];
    const isEven = i % 2 === 0;

    // Fondo de fila
    if (isEven) {
      doc.setFillColor(248, 248, 248);
      doc.rect(margin, currentY, pageWidth - margin * 2, rowHeight, 'F');
    }

    doc.setLineWidth(0.3);
    doc.setDrawColor(0, 0, 0);
    doc.rect(margin, currentY, pageWidth - margin * 2, rowHeight);

    // Casilla + Nota
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(`[C-${cell.cellIndex.toString().padStart(2, '0')}]`, margin + 3, currentY + 5.5);

    doc.setFontSize(6.5);
    doc.setFont('courier', 'normal');
    doc.text(`ID:#${cell.seed}`, margin + 3, currentY + 9.5);

    // Badge Nota
    if (cell.score >= 80) {
      doc.setFillColor(0, 0, 0);
      doc.rect(margin + 20, currentY + 2.5, 24, 5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('courier', 'bold');
      doc.setFontSize(6);
      doc.text(`${cell.score}% · APROBADO`, margin + 32, currentY + 6.0, { align: 'center' });
    } else if (cell.score === 0) {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(0, 0, 0);
      doc.rect(margin + 20, currentY + 2.5, 24, 5, 'FD');
      doc.setTextColor(0, 0, 0);
      doc.setFont('courier', 'bold');
      doc.setFontSize(6);
      doc.text(`0% · INCOMPLETO`, margin + 32, currentY + 6.0, { align: 'center' });
    } else {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(0, 0, 0);
      doc.rect(margin + 20, currentY + 2.5, 24, 5, 'FD');
      doc.setTextColor(0, 0, 0);
      doc.setFont('courier', 'bold');
      doc.setFontSize(6);
      doc.text(`${cell.score}% · NO SUPERADO`, margin + 32, currentY + 6.0, { align: 'center' });
    }

    doc.setTextColor(0, 0, 0);
    doc.setFont('courier', 'bold');
    doc.setFontSize(5.5);
    doc.text(
      `Aristas: ${cell.detectedStrokesCount}/${cell.targetEdgesCount || 5} ${
        cell.missingEdgesCount > 0 ? `(Faltan ${cell.missingEdgesCount})` : ''
      }`,
      margin + 20,
      currentY + 12
    );

    // Mensaje didáctico y Consejo
    const textW = pageWidth - margin * 2 - 52;
    doc.setFont('courier', 'bold');
    doc.setFontSize(6.5);
    doc.text(cell.message, margin + 48, currentY + 5.5, { maxWidth: textW });

    if (cell.tip) {
      doc.setFont('courier', 'normal');
      doc.setFontSize(6);
      doc.text(`Consejo: ${cell.tip}`, margin + 48, currentY + 11.5, { maxWidth: textW });
    }

    currentY += rowHeight + 1.5;
  }

  // Pie de página P2
  doc.setFontSize(6.5);
  doc.setFont('courier', 'normal');
  doc.text(
    `PAPLITZ · SISTEMA DE APRENDIZAJE DE DIBUJO Y VISUALIZACIÓN ESPACIAL · PÁGINA 2/2`,
    margin,
    pageHeight - margin + 6
  );

  // Descargar el PDF
  doc.save(`Paplitz_Correccion_A4_Serie_${activeSeed}.pdf`);
}
