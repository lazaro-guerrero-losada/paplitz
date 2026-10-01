import { AvatarMood } from './avatarTypes';

export type StrokeExerciseCategory =
  | 'parallel_lines'     // Ejercicios 1.1, 1.3: Paralelismo, espaciado y longitud
  | 'curved_s_waves'     // Ejercicio 1.5: Curvas en S, arcos y fluidez
  | 'cross_hatch_density'// Ejercicios 1.9, 1.11, 1.12: Tramas y densidad tonal
  | 'cross_contour_blob' // Ejercicios 2.5, 2.6: Contornos cruzados en formas orgánicas
  | 'polyhedron_shading';// Ejercicios 2.25, 2.26: Sombreado 3D con foco solar

export interface PointWithMeta {
  x: number;
  y: number;
  pressure: number;
  time: number;
}

export interface RawStroke {
  points: PointWithMeta[];
}

export interface PolyFace {
  id: string;
  name: string;
  vertices: { x: number; y: number }[];
  normal: { x: number; y: number; z: number };
  targetValueLevel: number; // 0: Luz, 1: Mediotono, 2: Sombra
  targetDensityPct: number; // Ej: 5%, 25%, 60%
}

export interface ProceduralStrokeChallenge {
  id: string;
  category: StrokeExerciseCategory;
  title: string;
  subtitle: string;
  workbookPage: number;
  seed: number;
  instruction: string;
  targetMetricsText: string;

  // Parámetros procedurales
  targetAngleDeg: number;       // Inclinación diana
  targetSpacingPx: number;      // Espaciado interlineal diana
  targetLengthPx: number;       // Altura / longitud de los trazos
  minRequiredStrokes: number;

  // Guías visuales 2D
  guideLines: { x1: number; y1: number; x2: number; y2: number; dashed?: boolean }[];
  guideBounds?: { x: number; y: number; width: number; height: number };
  
  // Para curvas S
  waveParams?: {
    amplitude: number;
    wavelength: number;
    phase: number;
    startPoint: { x: number; y: number };
    endPoint: { x: number; y: number };
  };

  // Para Blobs orgánicos
  blobShape?: {
    splinePoints: { x: number; y: number }[];
    axisLine: { x1: number; y1: number; x2: number; y2: number };
  };

  // Para sólidos 3D poliédricos
  polySolid?: {
    sunPosition: { x: number; y: number };
    faces: PolyFace[];
  };
}

export interface StrokeEvaluation {
  overallScore: number; // 0 a 100
  passed: boolean; // >= 70
  metrics: {
    parallelismScore: number;    // %
    spacingScore: number;        // %
    straightnessScore: number;   // %
    tonalDensityScore: number;   // %
    boundaryScore: number;       // %
  };
  detectedStats: {
    strokeCount: number;
    measuredAvgSpacingPx: number;
    spacingVariance: number;
    measuredAvgAngleDeg: number;
    measuredOpticalDensityPct: number;
  };
  feedbackTitle: string;
  feedbackMessage: string;
  tipMessage: string;
  avatarMood: AvatarMood;
}
