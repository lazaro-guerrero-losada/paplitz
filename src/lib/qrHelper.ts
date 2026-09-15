import QRCode from 'qrcode';
import type { jsPDF } from 'jspdf';

export interface ParsedQRPayload {
  valid: boolean;
  version?: string;
  lessonCode?: string;
  seed?: number;
  cellCount?: number;
  raw: string;
}

/**
 * Genera el payload estructurado y compacto para la hoja analógica de Paplitz
 */
export function createSheetQRPayload(
  lessonCode: string = '1.1',
  seed: number = 101,
  cellCount: number = 12
): string {
  return `PAPLITZ:v1;L=${lessonCode};S=${seed};C=${cellCount}`;
}

/**
 * Parsea el payload del código QR leído por el escáner
 */
export function parseSheetQRPayload(payload: string): ParsedQRPayload {
  if (!payload || !payload.startsWith('PAPLITZ:')) {
    return { valid: false, raw: payload };
  }

  const parts = payload.replace('PAPLITZ:', '').split(';');
  let version = 'v1';
  let lessonCode = '1.1';
  let seed = 101;
  let cellCount = 12;

  for (const part of parts) {
    const [k, v] = part.split('=');
    if (k === 'v1' || k === 'v') version = v || k;
    if (k === 'L' && v) lessonCode = v;
    if (k === 'S' && v) seed = parseInt(v, 10);
    if (k === 'C' && v) cellCount = parseInt(v, 10);
  }

  return {
    valid: true,
    version,
    lessonCode,
    seed: isNaN(seed) ? 101 : seed,
    cellCount: isNaN(cellCount) ? 12 : cellCount,
    raw: payload,
  };
}

export interface QRVectorData {
  size: number;
  path: string;
  payload: string;
}

/**
 * Genera una ruta vectorial SVG para renderizado ultrarrápido en React
 */
export function generateQRCodeSVGData(payload: string): QRVectorData {
  try {
    const qr = QRCode.create(payload, { errorCorrectionLevel: 'M' });
    const sz = qr.modules.size;
    let path = '';
    for (let r = 0; r < sz; r++) {
      for (let c = 0; c < sz; c++) {
        if (qr.modules.get(r, c)) {
          path += `M${c},${r}h1v1h-1z `;
        }
      }
    }
    return { size: sz, path, payload };
  } catch (err) {
    console.error('Error al generar QR SVG:', err);
    return { size: 21, path: '', payload };
  }
}

/**
 * Dibuja un código QR vectorial puro en jsPDF con máxima nitidez de impresión
 */
export function drawQRCodeOnPDF(
  doc: jsPDF,
  payload: string,
  x: number,
  y: number,
  size: number
): void {
  try {
    const qr = QRCode.create(payload, { errorCorrectionLevel: 'M' });
    const modCount = qr.modules.size;
    const modSize = size / modCount;

    // Fondo blanco nítido con micro-borde
    doc.setFillColor(255, 255, 255);
    doc.rect(x - 0.4, y - 0.4, size + 0.8, size + 0.8, 'F');

    // Módulos negros vectoriales
    doc.setFillColor(0, 0, 0);
    for (let r = 0; r < modCount; r++) {
      for (let c = 0; c < modCount; c++) {
        if (qr.modules.get(r, c)) {
          doc.rect(x + c * modSize, y + r * modSize, modSize, modSize, 'F');
        }
      }
    }
  } catch (err) {
    console.error('Error dibujando QR en PDF:', err);
  }
}
