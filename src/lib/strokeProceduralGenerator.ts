import { ProceduralStrokeChallenge, StrokeExerciseCategory, PolyFace } from './strokeTypes';

/**
 * Generador pseudoaleatorio basado en semilla (LCG)
 */
export class SeededRNG {
  private m = 0x80000000; // 2**31
  private a = 1103515245;
  private c = 12345;
  private state: number;

  constructor(seed: number) {
    this.state = Math.abs(seed) % (this.m - 1) + 1;
  }

  nextFloat(): number {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state / (this.m - 1);
  }

  range(min: number, max: number): number {
    return min + this.nextFloat() * (max - min);
  }

  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
}

/**
 * Genera un reto procedural único según la categoría y una semilla
 */
export function generateStrokeChallenge(
  category: StrokeExerciseCategory,
  seed = Math.floor(Math.random() * 100000),
  canvasWidth = 640,
  canvasHeight = 520
): ProceduralStrokeChallenge {
  const rng = new SeededRNG(seed);
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  switch (category) {
    case 'parallel_lines': {
      // Ángulo aleatorio para romper la memoria muscular de la muñeca
      const angleDeg = rng.range(40, 140);
      const angleRad = (angleDeg * Math.PI) / 180;
      const targetSpacingPx = rng.rangeInt(11, 20);
      const targetLengthPx = rng.rangeInt(90, 150);
      const corridorWidth = rng.range(220, 300);

      // Vector director perpendicular para el carril
      const perpRad = angleRad + Math.PI / 2;
      const halfW = corridorWidth / 2;
      const halfL = targetLengthPx / 2;

      // Línea de cota superior (raíl 1)
      const r1x1 = cx - Math.cos(perpRad) * halfW - Math.cos(angleRad) * halfL;
      const r1y1 = cy - Math.sin(perpRad) * halfW - Math.sin(angleRad) * halfL;
      const r1x2 = cx + Math.cos(perpRad) * halfW - Math.cos(angleRad) * halfL;
      const r1y2 = cy + Math.sin(perpRad) * halfW - Math.sin(angleRad) * halfL;

      // Línea de cota inferior (raíl 2)
      const r2x1 = cx - Math.cos(perpRad) * halfW + Math.cos(angleRad) * halfL;
      const r2y1 = cy - Math.sin(perpRad) * halfW + Math.sin(angleRad) * halfL;
      const r2x2 = cx + Math.cos(perpRad) * halfW + Math.cos(angleRad) * halfL;
      const r2y2 = cy + Math.sin(perpRad) * halfW + Math.sin(angleRad) * halfL;

      const expectedStrokes = Math.round(corridorWidth / targetSpacingPx);

      return {
        id: `parallel-${seed}`,
        category,
        title: 'Calistenia: Líneas Paralelas & Espaciado',
        subtitle: `Ángulo ${Math.round(angleDeg)}° · Paso ${targetSpacingPx}px · Longitud ${targetLengthPx}px`,
        workbookPage: 1,
        seed,
        instruction: `Traza líneas rectas de arriba a abajo entre los dos carriles guía. Mantén una separación constante de ~${targetSpacingPx}px y el mismo ángulo (${Math.round(angleDeg)}°).`,
        targetMetricsText: `Paralelismo: ±4° | Espaciado: ${targetSpacingPx}px (±15%) | Longitud: ${targetLengthPx}px`,
        targetAngleDeg: angleDeg,
        targetSpacingPx,
        targetLengthPx,
        minRequiredStrokes: Math.max(6, expectedStrokes - 4),
        guideLines: [
          { x1: r1x1, y1: r1y1, x2: r1x2, y2: r1y2, dashed: true },
          { x1: r2x1, y1: r2y1, x2: r2x2, y2: r2y2, dashed: true },
        ],
      };
    }

    case 'curved_s_waves': {
      const amplitude = rng.range(22, 38);
      const wavelength = rng.range(90, 130);
      const waveLengthTotal = rng.range(240, 320);
      const targetSpacingPx = rng.rangeInt(12, 18);

      const startX = cx - waveLengthTotal / 2;
      const startY = cy;

      return {
        id: `wave-${seed}`,
        category,
        title: 'Control de Curvas: Ondas S Sinusoidales',
        subtitle: `Amplitud ${Math.round(amplitude)}px · Longitud de onda ${Math.round(wavelength)}px`,
        workbookPage: 5,
        seed,
        instruction: `Dibuja una serie de curvas en S paralelas siguiendo la cadencia de la onda sinusoidal. Cuida la suavidad de inflexión en el centro sin quebrar el trazo.`,
        targetMetricsText: `Continuidad C² | Inflexión única | Espaciado rítmico: ${targetSpacingPx}px`,
        targetAngleDeg: 0,
        targetSpacingPx,
        targetLengthPx: amplitude * 3,
        minRequiredStrokes: 6,
        waveParams: {
          amplitude,
          wavelength,
          phase: rng.range(0, Math.PI),
          startPoint: { x: startX, y: startY },
          endPoint: { x: startX + waveLengthTotal, y: startY },
        },
        guideLines: [
          { x1: startX, y1: startY - amplitude * 1.5, x2: startX + waveLengthTotal, y2: startY - amplitude * 1.5, dashed: true },
          { x1: startX, y1: startY + amplitude * 1.5, x2: startX + waveLengthTotal, y2: startY + amplitude * 1.5, dashed: true },
        ],
      };
    }

    case 'cross_hatch_density': {
      const boxW = rng.rangeInt(180, 220);
      const boxH = rng.rangeInt(130, 160);
      const targetDensityTones = [20, 35, 55];
      const targetDensityPct = targetDensityTones[rng.rangeInt(0, targetDensityTones.length - 1)];
      const targetAngleDeg = rng.rangeInt(30, 65);

      const bx = cx - boxW / 2;
      const by = cy - boxH / 2;

      return {
        id: `hatch-${seed}`,
        category,
        title: 'Tramado y Densidad Tonal Óptica',
        subtitle: `Tono Objetivo: ${targetDensityPct}% (${targetDensityPct < 30 ? 'Mediotono Claro' : targetDensityPct < 50 ? 'Mediotono Medio' : 'Sombra Profunda'})`,
        workbookPage: 9,
        seed,
        instruction: `Rellena el marco rectangular aplicando tramado paralelo o cruzado hasta alcanzar exactamente una densidad visual de ~${targetDensityPct}%. ¡No te pases ni te quedes corto!`,
        targetMetricsText: `Densidad óptica: ${targetDensityPct}% (±6%) | No desbordar el marco`,
        targetAngleDeg,
        targetSpacingPx: 12,
        targetLengthPx: boxH,
        minRequiredStrokes: 10,
        guideBounds: { x: bx, y: by, width: boxW, height: boxH },
        guideLines: [
          { x1: bx, y1: by, x2: bx + boxW, y2: by, dashed: false },
          { x1: bx + boxW, y1: by, x2: bx + boxW, y2: by + boxH, dashed: false },
          { x1: bx + boxW, y1: by + boxH, x2: bx, y2: by + boxH, dashed: false },
          { x1: bx, y1: by + boxH, x2: bx, y2: by, dashed: false },
        ],
      };
    }

    case 'cross_contour_blob': {
      // Generar un blob orgánico suave usando armónicos polares
      const numPoints = 24;
      const baseR = rng.range(75, 95);
      const a1 = rng.range(0.15, 0.35);
      const a2 = rng.range(0.1, 0.25);
      const phi1 = rng.range(0, Math.PI * 2);
      const phi2 = rng.range(0, Math.PI * 2);

      const splinePoints: { x: number; y: number }[] = [];
      for (let i = 0; i < numPoints; i++) {
        const theta = (i / numPoints) * Math.PI * 2;
        const r = baseR * (1 + a1 * Math.cos(theta + phi1) + a2 * Math.sin(2 * theta + phi2));
        splinePoints.push({
          x: cx + r * Math.cos(theta),
          y: cy + r * Math.sin(theta),
        });
      }

      // Varilla o eje rector 3D a través del centro
      const axisAngle = rng.range(25, 75);
      const axisRad = (axisAngle * Math.PI) / 180;
      const axisLen = baseR * 1.5;
      const ax1 = cx - Math.cos(axisRad) * axisLen;
      const ay1 = cy - Math.sin(axisRad) * axisLen;
      const ax2 = cx + Math.cos(axisRad) * axisLen;
      const ay2 = cy + Math.sin(axisRad) * axisLen;

      return {
        id: `blob-${seed}`,
        category,
        title: 'Contornos Cruzados sobre Volumen Orgánico',
        subtitle: `Silueta Orgánica Procedural · Eje Rector a ${Math.round(axisAngle)}°`,
        workbookPage: 15,
        seed,
        instruction: `Dibuja líneas de contorno transversal (anillos / curvas de nivel) que abracen el volumen del cuerpo orgánico de lado a lado, cruzando el eje central perpendicularmente.`,
        targetMetricsText: `Ortogonalidad al eje: 90° (±18°) | Trazos de borde a borde perimetral`,
        targetAngleDeg: axisAngle + 90,
        targetSpacingPx: 16,
        targetLengthPx: baseR * 2,
        minRequiredStrokes: 5,
        blobShape: {
          splinePoints,
          axisLine: { x1: ax1, y1: ay1, x2: ax2, y2: ay2 },
        },
        guideLines: [
          { x1: ax1, y1: ay1, x2: ax2, y2: ay2, dashed: true },
        ],
      };
    }

    case 'polyhedron_shading': {
      // Prisma triangular o bloque facetado 3D en proyección isométrica/perspectiva
      const prismW = rng.range(130, 160);
      const prismH = rng.range(110, 140);

      // Vértices 2D proyectados de un prisma biselado
      const vTop = { x: cx, y: cy - prismH * 0.6 };
      const vMidL = { x: cx - prismW * 0.55, y: cy - prismH * 0.05 };
      const vMidR = { x: cx + prismW * 0.55, y: cy - prismH * 0.05 };
      const vCenter = { x: cx, y: cy + prismH * 0.15 };
      const vBotL = { x: cx - prismW * 0.55, y: cy + prismH * 0.65 };
      const vBotR = { x: cx + prismW * 0.55, y: cy + prismH * 0.65 };
      const vBottom = { x: cx, y: cy + prismH * 0.85 };

      // Posición del Sol (alrededor del bloque)
      const sunAngleDeg = rng.range(25, 155);
      const sunRad = (sunAngleDeg * Math.PI) / 180;
      const sunDist = 200;
      const sunX = cx - Math.cos(sunRad) * sunDist;
      const sunY = cy - Math.sin(sunRad) * sunDist;

      // 3 Caras visibles: Tapa superior, Cara izquierda, Cara derecha
      // Cara 0 (Tapa): vTop, vMidR, vCenter, vMidL
      // Cara 1 (Izquierda): vMidL, vCenter, vBottom, vBotL
      // Cara 2 (Derecha): vCenter, vMidR, vBotR, vBottom
      const faces: PolyFace[] = [
        {
          id: 'face-top',
          name: 'Tapa Superior',
          vertices: [vTop, vMidR, vCenter, vMidL],
          normal: { x: 0, y: -0.85, z: 0.52 },
          targetValueLevel: 0,
          targetDensityPct: 4,
        },
        {
          id: 'face-left',
          name: 'Cara Izquierda',
          vertices: [vMidL, vCenter, vBottom, vBotL],
          normal: { x: -0.8, y: 0.2, z: 0.56 },
          targetValueLevel: sunX < cx ? 1 : 2,
          targetDensityPct: sunX < cx ? 25 : 60,
        },
        {
          id: 'face-right',
          name: 'Cara Derecha',
          vertices: [vCenter, vMidR, vBotR, vBottom],
          normal: { x: 0.8, y: 0.2, z: 0.56 },
          targetValueLevel: sunX >= cx ? 1 : 2,
          targetDensityPct: sunX >= cx ? 25 : 60,
        },
      ];

      return {
        id: `poly-${seed}`,
        category,
        title: 'Sombreado 3D Poliédrico a 3 Valores',
        subtitle: `Foco Solar en (${Math.round(sunX)}, ${Math.round(sunY)}) · Ley de Iluminación Lambertiana`,
        workbookPage: 25,
        seed,
        instruction: `Observa la posición del Sol ☀️. Sombrea las 3 caras del prisma con el valor correcto según su ángulo con la luz: Cara iluminada (0: blanco/sin trama), mediotono (1: trama suave) y sombra (2: trama densa).`,
        targetMetricsText: `Tapa: Valor ${faces[0].targetValueLevel} | Cara Izq: Valor ${faces[1].targetValueLevel} | Cara Der: Valor ${faces[2].targetValueLevel}`,
        targetAngleDeg: 45,
        targetSpacingPx: 12,
        targetLengthPx: 100,
        minRequiredStrokes: 12,
        polySolid: {
          sunPosition: { x: sunX, y: sunY },
          faces,
        },
        guideLines: [],
      };
    }

    default:
      throw new Error(`Categoría no implementada: ${category}`);
  }
}
