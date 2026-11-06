import {
  Primitive3DChallenge,
  UserStroke3D,
  EvaluationResult3D,
} from './types';
import { copyReportToClipboard } from '../debugReport';

export interface DebugReport3DData {
  reportVersion: string;
  timestamp: string;
  userNote?: string;
  challenge: {
    id: string;
    seed: number;
    type: string;
    name: string;
    tipText: string;
    camera: {
      eye: { x: number; y: number; z: number };
      target: { x: number; y: number; z: number };
      fovDeg: number;
    };
    vanishingPoints: {
      vpx: { x: number; y: number; isOnScreen: boolean } | null;
      vpy: { x: number; y: number; isOnScreen: boolean } | null;
      vpz: { x: number; y: number; isOnScreen: boolean } | null;
    };
    targetCurvesCount: number;
    anchorCurvesCount: number;
  };
  userDrawing: {
    strokeCount: number;
    constructionStrokeCount?: number;
    strokes: {
      pointCount: number;
      startPoint: { x: number; y: number };
      endPoint: { x: number; y: number };
      lengthPx: number;
      isConstruction?: boolean;
    }[];
  };
  evaluation: {
    evaluated: boolean;
    score: number;
    passed: boolean;
    feedbackMessage: string;
    matchedSegmentsCount: number;
    drawnCount: number;
    targetCount: number;
    curves?: {
      id: string;
      label: string;
      role?: 'form' | 'construction' | 'hidden';
      coveragePct: number;
      precisionPct: number;
      score: number;
      isCompleted: boolean;
    }[];
  };
  environment: {
    userAgent: string;
    devicePixelRatio: number;
    screenResolution: string;
  };
}

/**
 * Genera el reporte de diagnóstico y depuración completo para un ejercicio 3D de Lab 3D
 */
export function build3DDebugReport(
  challenge: Primitive3DChallenge,
  strokes: UserStroke3D[],
  evaluation?: EvaluationResult3D | null,
  userNote?: string
): { reportData: DebugReport3DData; markdownText: string; jsonString: string } {
  const analyzedStrokes = strokes.map((s) => {
    const pts = s.points;
    const pStart = pts[0] || { x: 0, y: 0 };
    const pEnd = pts[pts.length - 1] || { x: 0, y: 0 };
    let pathLength = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      pathLength += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    }
    const lengthPx = Math.round(pathLength * 10) / 10;

    return {
      pointCount: pts.length,
      startPoint: { x: Math.round(pStart.x * 10) / 10, y: Math.round(pStart.y * 10) / 10 },
      endPoint: { x: Math.round(pEnd.x * 10) / 10, y: Math.round(pEnd.y * 10) / 10 },
      lengthPx,
      isConstruction: s.isConstruction || false,
    };
  });

  const reportData: DebugReport3DData = {
    reportVersion: '1.0.0-3d',
    timestamp: new Date().toISOString(),
    userNote: userNote?.trim() ? userNote.trim() : undefined,
    challenge: {
      id: challenge.id,
      seed: challenge.seed,
      type: challenge.type,
      name: challenge.name,
      tipText: challenge.tipText,
      camera: {
        eye: {
          x: Math.round(challenge.camera.eye.x * 10) / 10,
          y: Math.round(challenge.camera.eye.y * 10) / 10,
          z: Math.round(challenge.camera.eye.z * 10) / 10,
        },
        target: {
          x: Math.round(challenge.camera.target.x * 10) / 10,
          y: Math.round(challenge.camera.target.y * 10) / 10,
          z: Math.round(challenge.camera.target.z * 10) / 10,
        },
        fovDeg: challenge.camera.fov,
      },
      vanishingPoints: {
        vpx: challenge.vanishingPoints.X
          ? {
              x: Math.round(challenge.vanishingPoints.X.point.x * 10) / 10,
              y: Math.round(challenge.vanishingPoints.X.point.y * 10) / 10,
              isOnScreen: challenge.vanishingPoints.X.isOnScreen,
            }
          : null,
        vpy: challenge.vanishingPoints.Y
          ? {
              x: Math.round(challenge.vanishingPoints.Y.point.x * 10) / 10,
              y: Math.round(challenge.vanishingPoints.Y.point.y * 10) / 10,
              isOnScreen: challenge.vanishingPoints.Y.isOnScreen,
            }
          : null,
        vpz: challenge.vanishingPoints.Z
          ? {
              x: Math.round(challenge.vanishingPoints.Z.point.x * 10) / 10,
              y: Math.round(challenge.vanishingPoints.Z.point.y * 10) / 10,
              isOnScreen: challenge.vanishingPoints.Z.isOnScreen,
            }
          : null,
      },
      targetCurvesCount: challenge.targetCurves.length,
      anchorCurvesCount: challenge.anchorCurves.length,
    },
    userDrawing: {
      strokeCount: strokes.length,
      constructionStrokeCount: strokes.filter((s) => s.isConstruction).length,
      strokes: analyzedStrokes,
    },
    evaluation: {
      evaluated: !!evaluation,
      score: evaluation?.score ? Math.round(evaluation.score) : 0,
      passed: evaluation?.passed ?? false,
      feedbackMessage: evaluation?.feedbackMessage ?? 'Sin evaluar',
      matchedSegmentsCount: evaluation?.matchedSegments.length ?? 0,
      drawnCount: evaluation?.drawnCount ?? strokes.length,
      targetCount: evaluation?.targetCount ?? challenge.targetCurves.length,
      curves: evaluation?.curveDetails?.map((c) => ({
        id: c.id,
        label: c.label,
        role: c.role || 'form',
        coveragePct: Math.round(c.coverage * 100),
        precisionPct: Math.round(c.precision * 100),
        score: Math.round(c.score * 10) / 10,
        isCompleted: c.isCompleted,
      })),
    },
    environment: {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
      screenResolution: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'Unknown',
    },
  };

  const jsonString = JSON.stringify(reportData, null, 2);

  const scoreDisplay = evaluation ? `${Math.round(evaluation.score)}%` : 'N/A';
  const passedStatus = evaluation ? (evaluation.passed ? 'APROBADO ✓' : 'NO SUPERADO ✗') : 'NO EVALUADO';
  const noteSection = userNote?.trim()
    ? `\n- **📝 NOTA DEL USUARIO / USER NOTE:**\n> "${userNote.trim()}"`
    : '';

  const formDetails = evaluation?.curveDetails?.filter((c) => c.role !== 'construction') || [];
  const constDetails = evaluation?.curveDetails?.filter((c) => c.role === 'construction') || [];

  const getStatusLabel = (c: { isCompleted: boolean; coverage: number; precision: number }) => {
    if (c.isCompleted) return '✓ Completado';
    if (c.coverage < 0.35) return '✗ No Dibujado';
    if (c.coverage < 0.60) return '✗ Incompleto';
    return '✗ Desviado de la fuga';
  };

  let curvesBreakdown = '';
  if (formDetails.length > 0) {
    curvesBreakdown +=
      `\n- **Contornos de la Forma:**\n` +
      formDetails
        .map(
          (c) =>
            `  - \`${c.label}\`: ${Math.round(c.coverage * 100)}% cobertura · ${Math.round(c.precision * 100)}% precisión (${getStatusLabel(c)})`
        )
        .join('\n');
  }
  if (constDetails.length > 0) {
    curvesBreakdown +=
      `\n- **Líneas de Construcción:**\n` +
      constDetails
        .map(
          (c) =>
            `  - \`${c.label}\`: ${Math.round(c.coverage * 100)}% cobertura · ${Math.round(c.precision * 100)}% precisión (${c.isCompleted ? '✓ Completado' : (c.coverage >= 0.60 ? '✗ Desviado' : '✗ Opcional / Pendiente')})`
        )
        .join('\n');
  }

  const markdownText = `
### 📐 REPORTE DE PERSPECTIVA 3D (LAB 3D)
- **Forma:** \`${challenge.name}\` (\`${challenge.type}\`)
- **Semilla (Seed):** \`#${challenge.seed}\`
- **Cámara:** FOV: \`${challenge.camera.fov}°\` | Eye: \`(${reportData.challenge.camera.eye.x}, ${reportData.challenge.camera.eye.y}, ${reportData.challenge.camera.eye.z})\`
- **Nota Obtenida:** **${scoreDisplay}** (${passedStatus})
- **Trazos / Aristas:** ${evaluation?.drawnCount ?? strokes.length}/${evaluation?.targetCount ?? challenge.targetCurves.length} completados
- **Diagnóstico:** *"${evaluation?.feedbackMessage || 'N/A'}"*${curvesBreakdown}${noteSection}

<details>
<summary>📦 Ver JSON Completo de Diagnóstico 3D (clic para desplegar)</summary>

\`\`\`json
${jsonString}
\`\`\`
</details>
`.trim();

  return { reportData, markdownText, jsonString };
}

/**
 * Descarga el reporte 3D como archivo .json
 */
export function downloadReport3DJson(
  jsonString: string,
  seed: number,
  primitiveType: string,
  userNote?: string
): void {
  try {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedNote = userNote?.trim()
      ? `_${userNote
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .slice(0, 20)}`
      : '';
    link.download = `paplitz_3d_report_${primitiveType}_seed_${seed}${sanitizedNote}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error al descargar JSON de reporte 3D:', err);
  }
}

export { copyReportToClipboard as copyReport3DToClipboard };
