import { CubeChallenge } from './geometry';
import { UserStroke, ValidationFeedback, validateCubeDrawing, validateShadowDrawing } from './validation';

export interface DebugReportData {
  reportVersion: string;
  timestamp: string;
  lessonInfo?: {
    id?: string;
    code?: string;
    title?: string;
    perspectiveMode?: string;
    axesMode?: string;
    difficulty?: string;
    isShadowLevel?: boolean;
  } | null;
  challenge: {
    id: string;
    seed: number;
    mode: string;
    axesMode: string;
    horizonY: number;
    givenSide: string;
    isShadowLevel?: boolean;
    hasGroundGrid?: boolean;
    givenFace: CubeChallenge['givenFace'];
    givenEdges: CubeChallenge['givenEdges'];
    targetEdges: CubeChallenge['targetEdges'];
    vertices2D: CubeChallenge['vertices2D'];
    targetVertices2D: CubeChallenge['targetVertices2D'];
    axes: CubeChallenge['axes'];
    shadowData?: CubeChallenge['shadowData'];
  };
  userDrawing: {
    strokeCount: number;
    strokes: {
      pointCount: number;
      points: { x: number; y: number; pressure?: number; time: number }[];
      startPoint: { x: number; y: number };
      endPoint: { x: number; y: number };
      lengthPx: number;
      angleDeg: number;
    }[];
  };
  evaluation: {
    evaluated: boolean;
    score: number;
    totalScore: number;
    passed: boolean;
    straightnessScore: number;
    vertexAccuracyScore: number;
    perspectiveScore: number;
    speedBonus?: number;
    timeRemainingSeconds?: number;
    mainIssueMessage: string;
    tipMessage: string;
    matchedEdges: {
      targetEdge: { start: number; end: number; family: string };
      userStart: { x: number; y: number };
      userEnd: { x: number; y: number };
      errorScore: number;
    }[];
    angleErrors: number[];
  };
  environment: {
    userAgent: string;
    devicePixelRatio: number;
    screenResolution: string;
  };
}

/**
 * Genera el conjunto de datos completo y estructurado para diagnóstico y depuración de la corrección
 */
export function buildDebugReport(
  challenge: CubeChallenge,
  strokes: UserStroke[],
  feedback?: ValidationFeedback | null,
  activeLesson?: {
    id?: string;
    code?: string;
    title?: string;
    perspectiveMode?: string;
    axesMode?: string;
    difficulty?: string;
    isShadowLevel?: boolean;
  } | null
): { reportData: DebugReportData; markdownText: string; jsonString: string } {
  // Si no se ha evaluado aún, calculamos la evaluación al vuelo con los trazos actuales
  let evalFeedback = feedback;
  if (!evalFeedback) {
    if (challenge.isShadowLevel && challenge.shadowData) {
      evalFeedback = validateShadowDrawing(challenge, strokes);
    } else {
      evalFeedback = validateCubeDrawing(challenge, strokes);
    }
  }

  // Descomponer y simplificar trazos para análisis
  const analyzedStrokes = strokes.map((s) => {
    const pts = s.points;
    const pStart = pts[0] || { x: 0, y: 0 };
    const pEnd = pts[pts.length - 1] || { x: 0, y: 0 };
    const dx = pEnd.x - pStart.x;
    const dy = pEnd.y - pStart.y;
    const lengthPx = Math.round(Math.hypot(dx, dy) * 10) / 10;
    const angleDeg = Math.round(((Math.atan2(dy, dx) * 180) / Math.PI) * 10) / 10;

    return {
      pointCount: pts.length,
      points: pts.map((p) => ({
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
        pressure: p.pressure !== undefined ? Math.round(p.pressure * 100) / 100 : undefined,
        time: p.time,
      })),
      startPoint: { x: Math.round(pStart.x * 10) / 10, y: Math.round(pStart.y * 10) / 10 },
      endPoint: { x: Math.round(pEnd.x * 10) / 10, y: Math.round(pEnd.y * 10) / 10 },
      lengthPx,
      angleDeg,
    };
  });

  const reportData: DebugReportData = {
    reportVersion: '1.0.0',
    timestamp: new Date().toISOString(),
    lessonInfo: activeLesson
      ? {
          id: activeLesson.id,
          code: activeLesson.code,
          title: activeLesson.title,
          perspectiveMode: activeLesson.perspectiveMode,
          axesMode: activeLesson.axesMode,
          difficulty: activeLesson.difficulty,
          isShadowLevel: activeLesson.isShadowLevel,
        }
      : null,
    challenge: {
      id: challenge.id,
      seed: challenge.seed,
      mode: challenge.mode,
      axesMode: challenge.axesMode,
      horizonY: challenge.horizonY,
      givenSide: challenge.givenSide,
      isShadowLevel: challenge.isShadowLevel,
      hasGroundGrid: challenge.hasGroundGrid,
      givenFace: challenge.givenFace,
      givenEdges: challenge.givenEdges,
      targetEdges: challenge.targetEdges,
      vertices2D: challenge.vertices2D,
      targetVertices2D: challenge.targetVertices2D,
      axes: challenge.axes,
      shadowData: challenge.shadowData,
    },
    userDrawing: {
      strokeCount: strokes.length,
      strokes: analyzedStrokes,
    },
    evaluation: {
      evaluated: !!evalFeedback,
      score: evalFeedback?.score ?? 0,
      totalScore: evalFeedback?.totalScore ?? evalFeedback?.score ?? 0,
      passed: evalFeedback?.passed ?? false,
      straightnessScore: evalFeedback?.straightnessScore ?? 0,
      vertexAccuracyScore: evalFeedback?.vertexAccuracyScore ?? 0,
      perspectiveScore: evalFeedback?.perspectiveScore ?? 0,
      speedBonus: evalFeedback?.speedBonus,
      timeRemainingSeconds: evalFeedback?.timeRemainingSeconds,
      mainIssueMessage: evalFeedback?.mainIssueMessage ?? 'Sin evaluar',
      tipMessage: evalFeedback?.tipMessage ?? 'Sin consejo',
      matchedEdges: (evalFeedback?.matchedEdges || []).map((m) => ({
        targetEdge: { start: m.targetEdge.start, end: m.targetEdge.end, family: m.targetEdge.family },
        userStart: { x: Math.round(m.userStart.x * 10) / 10, y: Math.round(m.userStart.y * 10) / 10 },
        userEnd: { x: Math.round(m.userEnd.x * 10) / 10, y: Math.round(m.userEnd.y * 10) / 10 },
        errorScore: m.errorScore,
      })),
      angleErrors: (evalFeedback?.angleErrors || []).map((e) => Math.round(e * 10) / 10),
    },
    environment: {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
      screenResolution: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'Unknown',
    },
  };

  const jsonString = JSON.stringify(reportData, null, 2);

  const lessonLabel = activeLesson ? `${activeLesson.code} · ${activeLesson.title}` : 'Práctica Libre';
  const scoreDisplay = evalFeedback ? `${evalFeedback.totalScore ?? evalFeedback.score}%` : 'N/A';
  const passedStatus = evalFeedback ? (evalFeedback.passed ? 'APROBADO ✓' : 'NO SUPERADO ✗') : 'NO EVALUADO';

  const markdownText = `
### 📋 REPORTE DE EVALUACIÓN PAPLITZ
- **Semilla (Seed):** \`#${challenge.seed}\`
- **Lección:** ${lessonLabel}
- **Modo de Perspectiva:** \`${challenge.mode}\` | **Ejes:** \`${challenge.axesMode}\` | **Cara inicial:** \`${challenge.givenSide}\`
- **Nota Obtenida:** **${scoreDisplay}** (${passedStatus})
- **Desglose:** Rectitud: \`${evalFeedback?.straightnessScore ?? 0}%\` | Vértices: \`${evalFeedback?.vertexAccuracyScore ?? 0}%\` | Perspectiva: \`${evalFeedback?.perspectiveScore ?? 0}%\`
- **Trazos Usuario:** ${strokes.length} trazados (${challenge.targetEdges.length} aristas esperadas)
- **Diagnóstico:** *"${evalFeedback?.mainIssueMessage || 'N/A'}"*
- **Consejo:** *"${evalFeedback?.tipMessage || 'N/A'}"*

<details>
<summary>📦 Ver JSON Completo de Diagnóstico (clic para desplegar)</summary>

\`\`\`json
${jsonString}
\`\`\`
</details>
`.trim();

  return { reportData, markdownText, jsonString };
}

/**
 * Copia el reporte al portapapeles con fallback robusto
 */
export async function copyReportToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard API falló, usando fallback execCommand:', err);
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch (err) {
    console.error('No se pudo copiar al portapapeles:', err);
    return false;
  }
}

/**
 * Descarga el reporte como archivo .json
 */
export function downloadReportJson(jsonString: string, seed: number): void {
  try {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `paplitz_report_seed_${seed}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error al descargar archivo JSON de reporte:', err);
  }
}
