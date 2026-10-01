import {
  ProceduralStrokeChallenge,
  WorkbookExerciseDef,
  ALL_42_EXERCISES,
  PolyFace,
} from './strokeTypes';

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
 * Genera un reto procedural único según el ejercicio del cuaderno y una semilla
 */
export function generateStrokeChallenge(
  exerciseOrPage: WorkbookExerciseDef | number,
  seed = Math.floor(Math.random() * 100000),
  canvasWidth = 600,
  canvasHeight = 540
): ProceduralStrokeChallenge {
  const exercise: WorkbookExerciseDef =
    typeof exerciseOrPage === 'number'
      ? ALL_42_EXERCISES.find((e) => e.page === exerciseOrPage) || ALL_42_EXERCISES[0]
      : exerciseOrPage;

  const rng = new SeededRNG(seed);
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  const baseChallenge: ProceduralStrokeChallenge = {
    id: `stroke-${exercise.page}-${seed}`,
    pageNumber: exercise.page,
    code: exercise.code,
    category: exercise.category,
    title: exercise.title,
    subtitle: `Pág. ${exercise.page} · ${exercise.block}`,
    blockTitle: exercise.block,
    seed,
    instruction: exercise.instruction,
    targetMetricsText: exercise.metrics,
    targetAngleDeg: 90,
    targetSpacingPx: 14,
    targetLengthPx: 120,
    minRequiredStrokes: 6,
    guideLines: [],
  };

  switch (exercise.category) {
    case 'parallel_lines': {
      // Ángulo aleatorio que rompe la memoria muscular
      const angleDeg = rng.range(35, 145);
      const angleRad = (angleDeg * Math.PI) / 180;
      const targetSpacingPx = rng.rangeInt(10, 20);
      const targetLengthPx = rng.rangeInt(90, 160);
      const corridorWidth = rng.range(220, 320);

      const perpRad = angleRad + Math.PI / 2;
      const halfW = corridorWidth / 2;
      const halfL = targetLengthPx / 2;

      // Raíl 1
      const r1x1 = cx - Math.cos(perpRad) * halfW - Math.cos(angleRad) * halfL;
      const r1y1 = cy - Math.sin(perpRad) * halfW - Math.sin(angleRad) * halfL;
      const r1x2 = cx + Math.cos(perpRad) * halfW - Math.cos(angleRad) * halfL;
      const r1y2 = cy + Math.sin(perpRad) * halfW - Math.sin(angleRad) * halfL;

      // Raíl 2
      const r2x1 = cx - Math.cos(perpRad) * halfW + Math.cos(angleRad) * halfL;
      const r2y1 = cy - Math.sin(perpRad) * halfW + Math.sin(angleRad) * halfL;
      const r2x2 = cx + Math.cos(perpRad) * halfW + Math.cos(angleRad) * halfL;
      const r2y2 = cy + Math.sin(perpRad) * halfW + Math.sin(angleRad) * halfL;

      const expectedStrokes = Math.round(corridorWidth / targetSpacingPx);

      return {
        ...baseChallenge,
        subtitle: `Ángulo ${Math.round(angleDeg)}° · Paso ~${targetSpacingPx}px · Longitud ${targetLengthPx}px`,
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

    case 'contour_lines': {
      // Cintas o cuñas con contornos curvos delimitadores
      const w = rng.range(180, 240);
      const h = rng.range(140, 190);
      const leftX = cx - w / 2;
      const rightX = cx + w / 2;

      return {
        ...baseChallenge,
        subtitle: `Trama de Contorno · Paso ~14px`,
        targetSpacingPx: 14,
        minRequiredStrokes: 8,
        guideLines: [
          { x1: leftX, y1: cy - h / 2, x2: rightX, y2: cy - h * 0.4, dashed: false },
          { x1: leftX, y1: cy + h / 2, x2: rightX, y2: cy + h * 0.4, dashed: false },
          { x1: leftX, y1: cy - h / 2, x2: leftX, y2: cy + h / 2, dashed: false },
          { x1: rightX, y1: cy - h * 0.4, x2: rightX, y2: cy + h * 0.4, dashed: false },
        ],
      };
    }

    case 'angles_zigzags': {
      // Quiebros angulares secos (chevrones o relámpagos)
      const apexAngle = rng.range(50, 110);
      const chevronCount = rng.rangeInt(3, 5);
      const chevronH = 80;
      const step = 45;

      const guideLines: { x1: number; y1: number; x2: number; y2: number; dashed?: boolean }[] = [];
      const startX = cx - ((chevronCount - 1) * step) / 2;

      for (let i = 0; i < chevronCount; i++) {
        const x = startX + i * step;
        guideLines.push(
          { x1: x - 25, y1: cy + chevronH / 2, x2: x, y2: cy - chevronH / 2, dashed: true },
          { x1: x, y1: cy - chevronH / 2, x2: x + 25, y2: cy + chevronH / 2, dashed: true }
        );
      }

      return {
        ...baseChallenge,
        subtitle: `Vértices en Quiebro · Ángulo de Cúspide ~${Math.round(apexAngle)}°`,
        targetAngleDeg: apexAngle,
        minRequiredStrokes: chevronCount * 2,
        guideLines,
      };
    }

    case 'curved_s_waves': {
      const amplitude = rng.range(22, 38);
      const wavelength = rng.range(90, 130);
      const waveLengthTotal = rng.range(250, 320);
      const targetSpacingPx = rng.rangeInt(12, 18);

      const startX = cx - waveLengthTotal / 2;
      const startY = cy;

      return {
        ...baseChallenge,
        subtitle: `Amplitud ${Math.round(amplitude)}px · Onda ${Math.round(wavelength)}px`,
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

    case 'radial_focal': {
      // Radios desde foco común
      const spokeCount = rng.rangeInt(10, 16);
      const innerR = 15;
      const outerR = rng.range(110, 150);

      const guideLines: { x1: number; y1: number; x2: number; y2: number; dashed?: boolean }[] = [];
      for (let i = 0; i < spokeCount; i += 2) {
        const a = (i / spokeCount) * Math.PI * 2;
        guideLines.push({
          x1: cx + Math.cos(a) * innerR,
          y1: cy + Math.sin(a) * innerR,
          x2: cx + Math.cos(a) * outerR,
          y2: cy + Math.sin(a) * outerR,
          dashed: true,
        });
      }

      return {
        ...baseChallenge,
        subtitle: `Convergencia Focal · ${spokeCount} radios alrededor de (${Math.round(cx)}, ${Math.round(cy)})`,
        minRequiredStrokes: spokeCount,
        guideLines,
      };
    }

    case 'trailing_flicks': {
      // Espina central con desvanecidos
      const spineLen = 220;
      const sAngle = rng.range(20, 60);
      const sRad = (sAngle * Math.PI) / 180;
      const p1 = { x: cx - Math.cos(sRad) * (spineLen / 2), y: cy - Math.sin(sRad) * (spineLen / 2) };
      const p2 = { x: cx + Math.cos(sRad) * (spineLen / 2), y: cy + Math.sin(sRad) * (spineLen / 2) };

      return {
        ...baseChallenge,
        subtitle: `Desvanecimiento de Pluma (Flicks) · Espina a ${Math.round(sAngle)}°`,
        targetAngleDeg: sAngle + 45,
        targetLengthPx: 60,
        minRequiredStrokes: 12,
        guideLines: [{ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, dashed: false }],
      };
    }

    case 'basic_strokes':
    case 'hatching_params':
    case 'even_value_strip': {
      // Marcos de trama y valores tonales
      const boxW = exercise.category === 'even_value_strip' ? rng.rangeInt(280, 360) : rng.rangeInt(180, 220);
      const boxH = exercise.category === 'even_value_strip' ? rng.rangeInt(70, 95) : rng.rangeInt(130, 160);
      const targetDensityTones = [20, 35, 55];
      const targetDensityPct = targetDensityTones[rng.rangeInt(0, targetDensityTones.length - 1)];
      const targetAngleDeg = rng.rangeInt(30, 65);

      const bx = cx - boxW / 2;
      const by = cy - boxH / 2;

      return {
        ...baseChallenge,
        subtitle: `Tono Objetivo: ${targetDensityPct}% (${targetDensityPct < 30 ? 'Claro' : targetDensityPct < 50 ? 'Medio' : 'Sombra'})`,
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

    case 'cross_contour_blob':
    case 'compound_forms': {
      // Blobs armónicos orgánicos con eje rector
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

      const axisAngle = rng.range(25, 75);
      const axisRad = (axisAngle * Math.PI) / 180;
      const axisLen = baseR * 1.5;
      const ax1 = cx - Math.cos(axisRad) * axisLen;
      const ay1 = cy - Math.sin(axisRad) * axisLen;
      const ax2 = cx + Math.cos(axisRad) * axisLen;
      const ay2 = cy + Math.sin(axisRad) * axisLen;

      return {
        ...baseChallenge,
        subtitle: `Silueta Orgánica · Eje Rector a ${Math.round(axisAngle)}°`,
        targetAngleDeg: axisAngle + 90,
        targetSpacingPx: 16,
        targetLengthPx: baseR * 2,
        minRequiredStrokes: 5,
        blobShape: {
          splinePoints,
          axisLine: { x1: ax1, y1: ay1, x2: ax2, y2: ay2 },
        },
        guideLines: [{ x1: ax1, y1: ay1, x2: ax2, y2: ay2, dashed: true }],
      };
    }

    case 'direction_gradation':
    case 'curved_surfaces': {
      // Cinta curvada con degradado direccional
      const w = 240;
      const h = 140;
      const bx = cx - w / 2;
      const by = cy - h / 2;

      return {
        ...baseChallenge,
        subtitle: `Gradación Direccional Continua`,
        targetAngleDeg: 45,
        targetSpacingPx: 10,
        minRequiredStrokes: 12,
        guideBounds: { x: bx, y: by, width: w, height: h },
        guideLines: [
          { x1: bx, y1: by, x2: bx + w, y2: by, dashed: false },
          { x1: bx + w, y1: by, x2: bx + w, y2: by + h, dashed: false },
          { x1: bx + w, y1: by + h, x2: bx, y2: by + h, dashed: false },
          { x1: bx, y1: by + h, x2: bx, y2: by, dashed: false },
          // Flecha de dirección en el centro
          { x1: cx - 40, y1: cy, x2: cx + 40, y2: cy, dashed: true },
        ],
      };
    }

    case 'revealing_planes':
    case 'isometric_rhombille': {
      // Panal isométrico de cubos (Rhombille)
      const s = 45;
      const rhombilleFaces: { orientation: 'top' | 'left' | 'right'; vertices: { x: number; y: number }[]; targetAngleDeg: number }[] = [];

      // Un cubo isométrico central
      const cCenter = { x: cx, y: cy };
      const cTop = { x: cx, y: cy - s };
      const cTopR = { x: cx + s * Math.cos(Math.PI / 6), y: cy - s * Math.sin(Math.PI / 6) };
      const cTopL = { x: cx - s * Math.cos(Math.PI / 6), y: cy - s * Math.sin(Math.PI / 6) };
      const cBotR = { x: cx + s * Math.cos(Math.PI / 6), y: cy + s * Math.sin(Math.PI / 6) + s * 0.5 };
      const cBotL = { x: cx - s * Math.cos(Math.PI / 6), y: cy + s * Math.sin(Math.PI / 6) + s * 0.5 };
      const cBot = { x: cx, y: cy + s };

      rhombilleFaces.push(
        { orientation: 'top', vertices: [cTop, cTopR, cCenter, cTopL], targetAngleDeg: 0 },
        { orientation: 'left', vertices: [cTopL, cCenter, cBot, cBotL], targetAngleDeg: 60 },
        { orientation: 'right', vertices: [cCenter, cTopR, cBotR, cBot], targetAngleDeg: 120 }
      );

      return {
        ...baseChallenge,
        subtitle: `Estructura Isométrica · Trama a 0° (arriba), 60° (izq) y 120° (der)`,
        minRequiredStrokes: 12,
        rhombilleFaces,
      };
    }

    case 'cylinder_shading': {
      // Cilindro en perspectiva
      const cylW = 120;
      const cylH = 180;
      const x1 = cx - cylW / 2;
      const x2 = cx + cylW / 2;
      const y1 = cy - cylH / 2;
      const y2 = cy + cylH / 2;

      return {
        ...baseChallenge,
        subtitle: `Cilindro · Sombra Núcleo y Luz Reflejada`,
        targetAngleDeg: 90,
        minRequiredStrokes: 12,
        guideLines: [
          { x1: x1, y1: y1, x2: x2, y2: y1, dashed: false },
          { x1: x1, y1: y1, x2: x1, y2: y2, dashed: false },
          { x1: x2, y1: y1, x2: x2, y2: y2, dashed: false },
          { x1: x1, y1: y2, x2: x2, y2: y2, dashed: false },
          // Línea central de sombra núcleo
          { x1: cx + 20, y1: y1, x2: cx + 20, y2: y2, dashed: true },
        ],
      };
    }

    case 'sphere_shading': {
      // Esfera con arcos geodésicos
      const r = 90;
      return {
        ...baseChallenge,
        subtitle: `Esfera · Terminador Semilunar y Arcos Geodésicos`,
        minRequiredStrokes: 14,
        guideLines: [
          // Eje de iluminación
          { x1: cx - r * 1.2, y1: cy - r * 1.2, x2: cx + r * 1.2, y2: cy + r * 1.2, dashed: true },
        ],
        guideBounds: { x: cx - r, y: cy - r, width: r * 2, height: r * 2 },
      };
    }

    case 'polyhedron_shading':
    case 'composition_forms':
    case 'local_value':
    default: {
      // Sólido poliédrico 3D con Sol Lambertiano
      const prismW = rng.range(130, 160);
      const prismH = rng.range(110, 140);

      const vTop = { x: cx, y: cy - prismH * 0.6 };
      const vMidL = { x: cx - prismW * 0.55, y: cy - prismH * 0.05 };
      const vMidR = { x: cx + prismW * 0.55, y: cy - prismH * 0.05 };
      const vCenter = { x: cx, y: cy + prismH * 0.15 };
      const vBotL = { x: cx - prismW * 0.55, y: cy + prismH * 0.65 };
      const vBotR = { x: cx + prismW * 0.55, y: cy + prismH * 0.65 };
      const vBottom = { x: cx, y: cy + prismH * 0.85 };

      const sunAngleDeg = rng.range(25, 155);
      const sunRad = (sunAngleDeg * Math.PI) / 180;
      const sunDist = 190;
      const sunX = cx - Math.cos(sunRad) * sunDist;
      const sunY = cy - Math.sin(sunRad) * sunDist;

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
        ...baseChallenge,
        subtitle: `Foco Solar en (${Math.round(sunX)}, ${Math.round(sunY)}) · Ley de Lambert`,
        minRequiredStrokes: 12,
        polySolid: {
          sunPosition: { x: sunX, y: sunY },
          faces,
        },
      };
    }
  }
}
