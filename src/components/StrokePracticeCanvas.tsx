import React, { useRef, useEffect, useState, useCallback, useMemo, useImperativeHandle, forwardRef } from 'react';
import {
  Undo2,
  Trash2,
  Check,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
  Sparkles,
  Activity,
  FileText,
  Download,
  Copy,
  X,
  AlertTriangle,
} from 'lucide-react';
import {
  LabExerciseDef,
  RawStroke,
  PointWithMeta,
  ProceduralStrokeChallenge,
  StrokeEvaluation,
} from '../lib/strokeTypes';
import { generateStrokeChallenge } from '../lib/strokeProceduralGenerator';
import { evaluateStrokeSubmission, buildStrokeDebugReport } from '../lib/strokeEvaluator';
import { copyReportToClipboard, downloadReportJson } from '../lib/debugReport';

export interface StrokePracticeCanvasRef {
  undo: () => void;
  clear: () => void;
  next: () => void;
  evaluate: () => void;
}

export interface StrokePracticeCanvasProps {
  exerciseDef: LabExerciseDef;
  currentPhase: 1 | 2 | 3;
  showSolution: boolean;
  showUserStrokes: boolean;
  onEvaluationComplete: (evaluation: StrokeEvaluation | null) => void;
  onDrawingStateChange?: (isDrawing: boolean) => void;
  seed?: number;
  onNewSeed?: (seed: number) => void;
  onNext?: () => void;
  onToggleSolution?: () => void;
  onToggleUserStrokes?: () => void;
  masteryStreak?: number;
  justEarnedMastery?: boolean;
  phaseTransitionNotice?: {
    fromPhase: 1 | 2 | 3;
    toPhase: 1 | 2 | 3;
    nodeCode: string;
    nodeTitle?: string;
    isVersionAdvance?: boolean;
    fromVersion?: number;
    toVersion?: number;
    totalVersions?: number;
  } | null;
  onDismissPhaseTransition?: () => void;
  onOpenMasteryInfo?: () => void;
  onOpenPhaseInfo?: () => void;
  onPhaseChange?: (phase: 1 | 2 | 3) => void;
}

export const StrokePracticeCanvas = forwardRef<StrokePracticeCanvasRef, StrokePracticeCanvasProps>(
  (
    {
      exerciseDef,
      currentPhase,
      showSolution,
      showUserStrokes,
      onEvaluationComplete,
      onDrawingStateChange,
      seed: externalSeed,
      onNewSeed,
      onNext,
      onToggleSolution,
      onToggleUserStrokes,
      masteryStreak,
      justEarnedMastery,
      phaseTransitionNotice,
      onDismissPhaseTransition,
      onOpenMasteryInfo,
      onOpenPhaseInfo,
      onPhaseChange,
    },
    ref
  ) => {
    const [challengeSeed, setChallengeSeed] = useState<number>(() =>
      externalSeed !== undefined ? externalSeed : Math.floor(Math.random() * 90000 + 10000)
    );

    const [challenge, setChallenge] = useState<ProceduralStrokeChallenge>(() => {
      const ch = generateStrokeChallenge(exerciseDef, challengeSeed, 750, 500);
      ch.activePhase = currentPhase;
      return ch;
    });

    const [strokes, setStrokes] = useState<RawStroke[]>([]);
    const [evaluation, setEvaluation] = useState<StrokeEvaluation | null>(null);
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const [autoAdvance, setAutoAdvance] = useState<boolean>(() => {
      const saved = localStorage.getItem('paplitz_stroke_auto_advance');
      return saved !== null ? saved === 'true' : true;
    });
    const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);

    // Estados para modales de estadísticas detalladas y reporte de depuración
    const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
    const [showReportModal, setShowReportModal] = useState<boolean>(false);
    const [userNote, setUserNote] = useState<string>('');
    const [copiedReport, setCopiedReport] = useState<boolean>(false);
    const [downloadedReport, setDownloadedReport] = useState<boolean>(false);

    const currentStrokeRef = useRef<PointWithMeta[]>([]);
    const activePointerIdRef = useRef<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const isDrawingRef = useRef<boolean>(false);

    // Sincronizar cuando cambia el ejercicio o la fase
    useEffect(() => {
      const newSeed = externalSeed !== undefined ? externalSeed : Math.floor(Math.random() * 90000 + 10000);
      setChallengeSeed(newSeed);
      if (onNewSeed && externalSeed === undefined) onNewSeed(newSeed);

      const ch = generateStrokeChallenge(exerciseDef, newSeed, 750, 500);
      ch.activePhase = currentPhase;
      setChallenge(ch);
      setStrokes([]);
      currentStrokeRef.current = [];
      setIsDrawing(false);
      setEvaluation(null);
      setAutoAdvanceCountdown(null);
      setShowStatsModal(false);
      setShowReportModal(false);
      setUserNote('');
      onEvaluationComplete(null);
    }, [exerciseDef.code, currentPhase, externalSeed]);

    // Manejadores de acciones
    const handleUndo = useCallback(() => {
      setAutoAdvanceCountdown(null);
      setStrokes((prev) => {
        const next = prev.slice(0, -1);
        setEvaluation(null);
        setShowStatsModal(false);
        onEvaluationComplete(null);
        return next;
      });
    }, [onEvaluationComplete]);

    const handleClear = useCallback(() => {
      setAutoAdvanceCountdown(null);
      setStrokes([]);
      currentStrokeRef.current = [];
      setEvaluation(null);
      setShowStatsModal(false);
      onEvaluationComplete(null);
    }, [onEvaluationComplete]);

    const handleEvaluate = useCallback(() => {
      if (strokes.length === 0) return;
      const res = evaluateStrokeSubmission(strokes, challenge);
      setEvaluation(res);
      onEvaluationComplete(res);
    }, [strokes, challenge, onEvaluationComplete]);

    const handleNext = useCallback(() => {
      setAutoAdvanceCountdown(null);
      setShowStatsModal(false);
      setShowReportModal(false);
      setUserNote('');
      if (onNext) {
        onNext();
      } else {
        const newSeed = Math.floor(Math.random() * 90000 + 10000);
        setChallengeSeed(newSeed);
        if (onNewSeed) onNewSeed(newSeed);
        const ch = generateStrokeChallenge(exerciseDef, newSeed, 750, 500);
        ch.activePhase = currentPhase;
        setChallenge(ch);
        setStrokes([]);
        currentStrokeRef.current = [];
        setEvaluation(null);
        onEvaluationComplete(null);
      }
    }, [onNext, onNewSeed, exerciseDef, currentPhase, onEvaluationComplete]);

    const handleRetry = useCallback(() => {
      setAutoAdvanceCountdown(null);
      setShowStatsModal(false);
      setShowReportModal(false);
      setStrokes([]);
      currentStrokeRef.current = [];
      setEvaluation(null);
      onEvaluationComplete(null);
    }, [onEvaluationComplete]);

    const handleToggleAutoAdvance = useCallback(() => {
      setAutoAdvance((prev) => {
        const next = !prev;
        localStorage.setItem('paplitz_stroke_auto_advance', String(next));
        if (!next) {
          setAutoAdvanceCountdown(null);
        }
        return next;
      });
    }, []);

    // Temporizador de 1.5 segundos de auto-avance tras corregir
    // Se pausa momentáneamente si se abren los modales de Stats o Reporte, o si hay aviso de cambio de fase
    useEffect(() => {
      if (!evaluation || !autoAdvance || phaseTransitionNotice || showStatsModal || showReportModal) {
        setAutoAdvanceCountdown(null);
        return;
      }

      const TOTAL_MS = 1500;
      const STEP_MS = 100;
      let remainingMs = TOTAL_MS;
      setAutoAdvanceCountdown(1.5);

      const intervalId = setInterval(() => {
        remainingMs -= STEP_MS;
        if (remainingMs <= 0) {
          clearInterval(intervalId);
          setAutoAdvanceCountdown(0);
          handleNext();
        } else {
          setAutoAdvanceCountdown(Math.round(remainingMs / 100) / 10);
        }
      }, STEP_MS);

      return () => {
        clearInterval(intervalId);
      };
    }, [evaluation, autoAdvance, phaseTransitionNotice, showStatsModal, showReportModal, handleNext]);

    // Generación dinámica del reporte en Markdown y JSON para diagnóstico
    const currentReportMarkdown = useMemo(() => {
      const dummyEvaluation: StrokeEvaluation = evaluation || {
        overallScore: 0,
        passed: false,
        metrics: { parallelismScore: 0, spacingScore: 0, straightnessScore: 0, tonalDensityScore: 0, boundaryScore: 0 },
        detectedStats: { strokeCount: strokes.length, measuredAvgSpacingPx: 0, spacingVariance: 0, measuredAvgAngleDeg: 0, measuredOpticalDensityPct: 0 },
        feedbackTitle: 'Sin evaluar',
        feedbackMessage: 'Trazo en proceso de dibujo',
        tipMessage: '',
      };
      const reportText = buildStrokeDebugReport(challenge, strokes, dummyEvaluation);
      if (userNote.trim()) {
        return `### NOTA DEL USUARIO:\n> ${userNote.trim()}\n\n${reportText}`;
      }
      return reportText;
    }, [challenge, strokes, evaluation, userNote]);

    const currentReportJsonString = useMemo(() => {
      const data = {
        reportType: 'paplitz_stroke_practice',
        timestamp: new Date().toISOString(),
        userNote: userNote.trim() || undefined,
        challenge: {
          id: challenge.id,
          code: challenge.code,
          title: challenge.title,
          seed: challenge.seed,
          activePhase: challenge.activePhase,
          targetAngleDeg: challenge.targetAngleDeg,
          targetSpacingPx: challenge.targetSpacingPx,
          targetLengthPx: challenge.targetLengthPx,
          minRequiredStrokes: challenge.minRequiredStrokes,
        },
        userStrokes: strokes.map((s, idx) => ({
          index: idx + 1,
          pointCount: s.points.length,
          points: s.points,
        })),
        evaluation: evaluation || null,
        environment: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
        },
      };
      return JSON.stringify(data, null, 2);
    }, [challenge, strokes, evaluation, userNote]);

    const handleDownloadReport = useCallback(() => {
      downloadReportJson(currentReportJsonString, challenge.seed, userNote || challenge.code);
      setDownloadedReport(true);
      setTimeout(() => setDownloadedReport(false), 2500);
    }, [currentReportJsonString, challenge.seed, userNote, challenge.code]);

    const handleCopyReport = useCallback(async () => {
      await copyReportToClipboard(currentReportMarkdown);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2500);
    }, [currentReportMarkdown]);

    // Métodos expuestos para la barra de herramientas lateral
    useImperativeHandle(ref, () => ({
      undo: handleUndo,
      clear: handleClear,
      next: handleNext,
      evaluate: handleEvaluate,
    }));

    // Atajos de teclado (Enter para corregir/siguiente, Ctrl+Z para deshacer, Espacio para siguiente tras corregir)
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (evaluation) {
            handleNext();
          } else if (strokes.length > 0) {
            handleEvaluate();
          }
        } else if (e.key === ' ' && evaluation) {
          e.preventDefault();
          handleNext();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [evaluation, strokes.length, handleUndo, handleNext, handleEvaluate]);

    // Renderizado del lienzo en estética Paplitz (Papel Blanco Técnico + Tinta Negra)
    const renderCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const w = 750;
      const h = 500;
      const targetW = Math.round(w * dpr);
      const targetH = Math.round(h * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Fondo Papel Blanco Paplitz
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);

      // 2. Trama milimétrica sutil técnica
      ctx.strokeStyle = '#F0F0F0';
      ctx.lineWidth = 1;
      const gridStep = 20;
      for (let x = 0; x < w; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // 3. Guías y Geometrías del Reto
      // A. Marco delimitador de trama
      if (challenge.guideBounds) {
        const b = challenge.guideBounds;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
        ctx.fillRect(b.x, b.y, b.width, b.height);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.strokeRect(b.x, b.y, b.width, b.height);
      }

      // B. Curva S generatriz
      if (challenge.waveParams && showSolution) {
        const wp = challenge.waveParams;
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        for (let x = wp.startPoint.x; x <= wp.endPoint.x; x += 4) {
          const y =
            wp.startPoint.y +
            wp.amplitude * Math.sin(((x - wp.startPoint.x) / wp.wavelength) * Math.PI * 2 + wp.phase);
          if (x === wp.startPoint.x) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // C. Carriles de Espaciado y Muestra (Ejercicios E1.1 a E17.1)
      if (challenge.spacingTrackParams) {
        const sp = challenge.spacingTrackParams;
        const { bands, samplePattern, trackXStart, trackXEnd, targetSpacingPx, subdivisionLabel } = sp;

        ctx.save();

        // 1. ZONA DE MUESTRA (Izquierda) — PERMANENTEMENTE VISIBLE
        const sampleTop = Math.min(...bands.map((b) => b.yTop)) - 22;
        const sampleBot = Math.max(...bands.map((b) => b.yBottom)) + 12;
        let sampleBoxW = samplePattern.xEnd - samplePattern.xStart + 16;
        let sampleBoxX = samplePattern.xStart - 8;
        if (sp.kinkType === 'chevron_left') {
          sampleBoxX -= 26;
          sampleBoxW += 26;
        } else if (sp.kinkType === 'zigzag_wave') {
          sampleBoxX -= 18;
          sampleBoxW += 18;
        } else if (sp.kinkType === 'triangle_left') {
          sampleBoxX -= 16;
          sampleBoxW += 16;
        }

        // Fondo sutil del bloque de muestra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
        ctx.fillRect(sampleBoxX, sampleTop, sampleBoxW, sampleBot - sampleTop);
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.strokeRect(sampleBoxX, sampleTop, sampleBoxW, sampleBot - sampleTop);

        // Etiqueta superior de muestra
        let sampleLabel = `MUESTRA (${subdivisionLabel})`;
        if (sp.kinkType === 'zigzag_zn') {
          sampleLabel = `MUESTRA RELÁMPAGO Z/N ↗↘↗ (x/2 = ${targetSpacingPx}px)`;
        } else if (sp.kinkType === 'v_concentric') {
          sampleLabel = `MUESTRA VÉRTICES EN V ∨ (x/2 = ${targetSpacingPx}px)`;
        } else if (sp.kinkType === 'v_inverted') {
          sampleLabel = `MUESTRA VÉRTICES EN ∧ (x/2 = ${targetSpacingPx}px)`;
        } else if (sp.kinkType === 'triangle_left') {
          sampleLabel = `MUESTRA ◄ (x/2 = ${targetSpacingPx}px)`;
        } else if (sp.kinkType === 'triangle_right') {
          sampleLabel = `MUESTRA ► (x/2 = ${targetSpacingPx}px)`;
        } else if (sp.kinkType === 'chevron_left') {
          sampleLabel = `MUESTRA CHEVRON ◄ (x/2 = ${targetSpacingPx}px)`;
        } else if (sp.kinkType === 'zigzag_wave') {
          sampleLabel = `MUESTRA ZIGZAG ◄►◄ (x/2 = ${targetSpacingPx}px)`;
        } else if (sp.kinkType === 'bracket_left') {
          sampleLabel = `MUESTRA CORCHETE [ (x/2 = ${targetSpacingPx}px)`;
        } else if (sp.kinkType === 'curve_c_left') {
          sampleLabel = `MUESTRA ARCO EN C ◄ (x/2 = ${targetSpacingPx}px)`;
        } else if (sp.kinkType === 'curve_c_right') {
          sampleLabel = `MUESTRA ARCO EN C ► (x/2 = ${targetSpacingPx}px)`;
        } else if (sp.kinkType === 'curve_arch_up') {
          sampleLabel = `MUESTRA ARCO CONVEXO ⌒ (x/2 = ${targetSpacingPx}px)`;
        } else if (sp.kinkType === 'curve_arch_down') {
          sampleLabel = `MUESTRA ARCO CÓNCAVO ∪ (x/2 = ${targetSpacingPx}px)`;
        } else if (sp.kinkType === 'curve_wave_horizontal') {
          sampleLabel = `MUESTRA ONDA EN S ~ (x/2 = ${targetSpacingPx}px)`;
        } else if (sp.kinkType === 'curve_wave_vertical') {
          sampleLabel = `MUESTRA ONDA EN S § (x/2 = ${targetSpacingPx}px)`;
        } else if (sp.kinkType === 'curve_wave_slanted') {
          sampleLabel = `MUESTRA ONDA INCLINADA ∿ (x/2 = ${targetSpacingPx}px)`;
        } else if (sp.angleDeg && sp.direction) {
          const arrowMap: Record<string, string> = {
            bottom_up_left_right: '↗',
            top_down_right_left: '↙',
            top_down_left_right: '↘',
            bottom_up_right_left: '↖',
          };
          const arr = arrowMap[sp.direction] || '';
          sampleLabel = `MUESTRA ${arr} (~${Math.round(sp.angleDeg)}°)`;
        }
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(sampleLabel, sampleBoxX + sampleBoxW / 2, sampleTop + 5);

        // Rieles de delimitación de la muestra
        for (const b of bands) {
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(samplePattern.xStart - 4, b.yTop);
          ctx.lineTo(samplePattern.xEnd + 4, b.yTop);
          ctx.moveTo(samplePattern.xStart - 4, b.yBottom);
          ctx.lineTo(samplePattern.xEnd + 4, b.yBottom);
          ctx.stroke();
        }

        // Trazos entintados de muestra
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([]);
        for (let sIdx = 0; sIdx < samplePattern.lines.length; sIdx++) {
          const sLine = samplePattern.lines[sIdx];
          if (sLine.points && sLine.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(sLine.points[0].x, sLine.points[0].y);
            for (let pIdx = 1; pIdx < sLine.points.length; pIdx++) {
              ctx.lineTo(sLine.points[pIdx].x, sLine.points[pIdx].y);
            }
            ctx.stroke();

            if (sLine.hasArrow) {
              const pStart = sLine.points[0];
              const pLast2 = sLine.points[sLine.points.length - 2];
              const pEnd = sLine.points[sLine.points.length - 1];
              const th = Math.atan2(pEnd.y - pLast2.y, pEnd.x - pLast2.x);
              const arrowLen = 11;
              const arrowHalfAngle = 0.42;

              ctx.fillStyle = '#000000';
              ctx.beginPath();
              ctx.moveTo(pEnd.x, pEnd.y);
              ctx.lineTo(
                pEnd.x - arrowLen * Math.cos(th - arrowHalfAngle),
                pEnd.y - arrowLen * Math.sin(th - arrowHalfAngle)
              );
              ctx.lineTo(
                pEnd.x - arrowLen * Math.cos(th + arrowHalfAngle),
                pEnd.y - arrowLen * Math.sin(th + arrowHalfAngle)
              );
              ctx.closePath();
              ctx.fill();

              ctx.beginPath();
              ctx.arc(pStart.x, pStart.y, 2.8, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            const x1 = sLine.x1 ?? (sLine as any).x ?? 0;
            const x2 = sLine.x2 ?? (sLine as any).x ?? 0;
            ctx.beginPath();
            ctx.moveTo(x1, sLine.y1!);
            ctx.lineTo(x2, sLine.y2!);
            ctx.stroke();

            const isDiagonalLevel =
              sp.direction &&
              [
                'bottom_up_left_right',
                'top_down_right_left',
                'top_down_left_right',
                'bottom_up_right_left',
              ].includes(sp.direction);

            const shouldDrawArrow =
              sLine.hasArrow ||
              (isDiagonalLevel && sIdx === Math.floor(samplePattern.lines.length / 2));

            if (shouldDrawArrow && sp.direction) {
              let pStart = { x: x1, y: sLine.y1! };
              let pEnd = { x: x2, y: sLine.y2! };

              if (sp.direction === 'top_down_right_left') {
                pStart = { x: x2, y: sLine.y2! };
                pEnd = { x: x1, y: sLine.y1! };
              } else if (sp.direction === 'bottom_up_right_left') {
                pStart = { x: x2, y: sLine.y2! };
                pEnd = { x: x1, y: sLine.y1! };
              } else if (sp.direction === 'bottom_up_left_right') {
                pStart = { x: x1, y: sLine.y1! };
                pEnd = { x: x2, y: sLine.y2! };
              } else if (sp.direction === 'top_down_left_right') {
                pStart = { x: x1, y: sLine.y1! };
                pEnd = { x: x2, y: sLine.y2! };
              }

              const th = Math.atan2(pEnd.y - pStart.y, pEnd.x - pStart.x);
              const arrowLen = 11;
              const arrowHalfAngle = 0.42;

              ctx.fillStyle = '#000000';
              ctx.beginPath();
              ctx.moveTo(pEnd.x, pEnd.y);
              ctx.lineTo(
                pEnd.x - arrowLen * Math.cos(th - arrowHalfAngle),
                pEnd.y - arrowLen * Math.sin(th - arrowHalfAngle)
              );
              ctx.lineTo(
                pEnd.x - arrowLen * Math.cos(th + arrowHalfAngle),
                pEnd.y - arrowLen * Math.sin(th + arrowHalfAngle)
              );
              ctx.closePath();
              ctx.fill();

              ctx.beginPath();
              ctx.arc(pStart.x, pStart.y, 2.8, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        // 2. CARRILES GUÍA DE DIBUJO
        for (let i = 0; i < bands.length; i++) {
          const b = bands[i];
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.setLineDash([]);

          ctx.beginPath();
          ctx.moveTo(trackXStart, b.yTop);
          ctx.lineTo(trackXEnd, b.yTop);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(trackXStart, b.yBottom);
          ctx.lineTo(trackXEnd, b.yBottom);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(trackXStart, b.yTop - 4);
          ctx.lineTo(trackXStart, b.yTop + 4);
          ctx.moveTo(trackXStart, b.yBottom - 4);
          ctx.lineTo(trackXStart, b.yBottom + 4);
          ctx.stroke();

          if (bands.length > 1) {
            ctx.fillStyle = '#666666';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(`F${i + 1}`, trackXStart - 6, (b.yTop + b.yBottom) / 2);
          }
        }

        // 2.5 LÍNEAS DE INICIO Y FINAL DE BLOQUES
        if (sp.blocks && sp.blocks.length > 0) {
          const b = bands[0];
          for (let bIdx = 0; bIdx < sp.blocks.length; bIdx++) {
            const blk = sp.blocks[bIdx];

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2.4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(blk.startLinePoints[0].x, blk.startLinePoints[0].y);
            for (let pIdx = 1; pIdx < blk.startLinePoints.length; pIdx++) {
              ctx.lineTo(blk.startLinePoints[pIdx].x, blk.startLinePoints[pIdx].y);
            }
            ctx.stroke();

            const isVFamily = sp.kinkType === 'v_concentric' || sp.kinkType === 'v_inverted';
            if (!isVFamily) {
              ctx.beginPath();
              ctx.moveTo(blk.finalLinePoints[0].x, blk.finalLinePoints[0].y);
              for (let pIdx = 1; pIdx < blk.finalLinePoints.length; pIdx++) {
                ctx.lineTo(blk.finalLinePoints[pIdx].x, blk.finalLinePoints[pIdx].y);
              }
              ctx.stroke();
            }

            ctx.fillStyle = '#000000';
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            if (sp.kinkType === 'zigzag_zn') {
              ctx.textBaseline = 'bottom';
              ctx.fillText('INICIO', (blk.xStart + blk.xEnd) / 2, b.yTop - 4);
              ctx.textBaseline = 'top';
              ctx.fillText('FIN', (blk.xStart + blk.xEnd) / 2, b.yBottom + 4);
            } else {
              ctx.textBaseline = 'bottom';
              ctx.fillText('INICIO', blk.xStart, b.yTop - 4);
              if (!isVFamily) {
                ctx.fillText('FIN', blk.xEnd, b.yTop - 4);
              }
            }

            if (!isVFamily && sp.kinkType !== 'zigzag_zn') {
              ctx.strokeStyle = '#000000';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(blk.xStart, b.yTop - 3);
              ctx.lineTo(blk.xStart, b.yTop + 3);
              ctx.moveTo(blk.xEnd, b.yTop - 3);
              ctx.lineTo(blk.xEnd, b.yTop + 3);
              ctx.stroke();
            } else if (isVFamily) {
              ctx.strokeStyle = '#000000';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(blk.xStart, b.yTop - 3);
              ctx.lineTo(blk.xStart, b.yTop + 3);
              ctx.stroke();
            }

            ctx.fillStyle = '#000000';
            ctx.font = 'bold 9px monospace';
            ctx.fillText(`BLOQUE ${bIdx + 1}`, (blk.xStart + blk.xEnd) / 2, b.yTop - 13);

            if (bIdx < sp.blocks.length - 1) {
              const nextBlk = sp.blocks[bIdx + 1];
              const gapMid = (blk.xEnd + nextBlk.xStart) / 2;
              ctx.fillStyle = '#999999';
              ctx.font = 'bold 8px monospace';
              ctx.textBaseline = 'middle';
              ctx.fillText('(PAUSA)', gapMid, (b.yTop + b.yBottom) / 2);
            }
          }
        }

        ctx.restore();
      }

      // D. Líneas guía punteadas
      if (!challenge.spacingTrackParams && showSolution && challenge.guideLines) {
        for (const line of challenge.guideLines) {
          ctx.strokeStyle = line.dashed ? '#888888' : '#CCCCCC';
          ctx.lineWidth = 1.5;
          if (line.dashed) ctx.setLineDash([5, 5]);
          else ctx.setLineDash([]);

          ctx.beginPath();
          ctx.moveTo(line.x1, line.y1);
          ctx.lineTo(line.x2, line.y2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // E. SOLUCIÓN FANTASMA (Antes de empezar a dibujar)
      if (showSolution && strokes.length === 0 && !isDrawing && challenge.ghostSolutionStrokes) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.lineWidth = 2.0;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([5, 4]);

        for (const gStroke of challenge.ghostSolutionStrokes) {
          if (gStroke.points.length < 2) continue;
          ctx.beginPath();
          ctx.moveTo(gStroke.points[0].x, gStroke.points[0].y);
          for (let i = 1; i < gStroke.points.length; i++) {
            ctx.lineTo(gStroke.points[i].x, gStroke.points[i].y);
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      // F. PUNTOS DIANA Y BADGES DE DIRECCIÓN VECTORIALES DE ALTA DEFINICIÓN
      if (challenge.keyPoints && challenge.keyPoints.length > 0) {
        for (const kp of challenge.keyPoints) {
          ctx.save();

          // 1. Anillo técnico concéntrico de precisión
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 7, 0, Math.PI * 2);
          ctx.stroke();

          // 2. Punto central sólido
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // 3. Cálculo de la posición del Badge para que no tape la diana ni el trazo
          const labelText = kp.label || String(kp.order);
          let badgeX = kp.x;
          let badgeY = kp.y - 17;

          const isRadial =
            (challenge.category === 'radial_focal' ||
              challenge.directionKey === 'radial_outward' ||
              challenge.directionKey === 'radial_inward') &&
            challenge.keyPoints &&
            challenge.keyPoints.length > 2;

          if (isRadial) {
            const centerKp = challenge.keyPoints[0];
            const dx = kp.x - centerKp.x;
            const dy = kp.y - centerKp.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 15) {
              badgeX = kp.x + (dx / dist) * 16;
              badgeY = kp.y + (dy / dist) * 16;
            } else {
              // Punto central de la roseta
              badgeX = kp.x - 14;
              badgeY = kp.y - 14;
            }
          } else {
            // Evitar salirse por el borde superior
            if (badgeY < 14) {
              badgeY = kp.y + 17;
            }
          }

          // 4. Badge circular nítido (fondo blanco opaco que limpia la cuadrícula + borde entintado negro)
          const badgeR = 9.5;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
          ctx.stroke();

          // 5. Número vectorial nítido perfectamente proporcionado y centrado
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(labelText, badgeX, badgeY + 0.3);

          ctx.restore();
        }
      }

      // G. DIBUJAR TRAZOS ENTINTADOS DEL USUARIO CON SUAVIZADO BÉZIER
      const allStrokes =
        isDrawing && currentStrokeRef.current.length > 0
          ? showUserStrokes
            ? [...strokes, { points: currentStrokeRef.current }]
            : [{ points: currentStrokeRef.current }]
          : showUserStrokes
          ? strokes
          : [];

      ctx.strokeStyle = '#000000';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([]);

      for (const stroke of allStrokes) {
        if (stroke.points.length === 0) continue;
        const pts = stroke.points;

        if (pts.length === 1) {
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(pts[0].x, pts[0].y, 1.4, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);

        for (let i = 1; i < pts.length - 1; i++) {
          const xc = (pts[i].x + pts[i + 1].x) / 2;
          const yc = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        const lastP = pts[pts.length - 1];
        ctx.lineWidth = lastP.pressure > 0 ? 1.6 + lastP.pressure * 2.0 : 2.4;
        ctx.stroke();
      }

      // H. SUPERPOSICIÓN DE SOLUCIÓN TRAS CORRECCIÓN (RESPETA SHOWSOLUTION, SIN BORRAR EL TRAZO)
      if (evaluation && evaluation.solutionOverlay && showSolution) {
        const linesToDraw: { x: number; y: number }[][] =
          evaluation.solutionOverlay.multiLines && evaluation.solutionOverlay.multiLines.length > 0
            ? evaluation.solutionOverlay.multiLines.map((l) => l.points)
            : evaluation.solutionOverlay.points && evaluation.solutionOverlay.points.length > 1
            ? [evaluation.solutionOverlay.points]
            : challenge.idealPath && challenge.idealPath.length > 1
            ? [challenge.idealPath]
            : [];

        const isCommonCenterEnd =
          linesToDraw.length > 3 &&
          linesToDraw.every((l) => {
            const lastPt = l[l.length - 1];
            const firstLastPt = linesToDraw[0][linesToDraw[0].length - 1];
            return Math.hypot(lastPt.x - firstLastPt.x, lastPt.y - firstLastPt.y) < 8;
          });

        for (const sPts of linesToDraw) {
          if (sPts.length < 2) continue;
          ctx.save();

          // Guía técnica de la solución: línea discontinua limpia sin casing blanco para no cortar los trazos del usuario
          ctx.strokeStyle = '#777777';
          ctx.lineWidth = 2.0;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.setLineDash([6, 5]);

          if (challenge.spacingTrackParams) {
            ctx.beginPath();
            ctx.moveTo(sPts[0].x, sPts[0].y);
            for (let i = 1; i < sPts.length; i++) {
              ctx.lineTo(sPts[i].x, sPts[i].y);
            }
            ctx.stroke();

            if (challenge.spacingTrackParams.direction && sPts.length >= 2) {
              const pEnd = sPts[sPts.length - 1];
              const pPrev = sPts[Math.max(0, sPts.length - 3)];
              const th = Math.atan2(pEnd.y - pPrev.y, pEnd.x - pPrev.x);
              ctx.fillStyle = '#777777';
              ctx.beginPath();
              ctx.moveTo(pEnd.x, pEnd.y);
              ctx.lineTo(pEnd.x - 7 * Math.cos(th - 0.45), pEnd.y - 7 * Math.sin(th - 0.45));
              ctx.lineTo(pEnd.x - 7 * Math.cos(th + 0.45), pEnd.y - 7 * Math.sin(th + 0.45));
              ctx.closePath();
              ctx.fill();
            }

            ctx.restore();
            continue;
          }

          const lastP = sPts[sPts.length - 1];
          const prevP = sPts[Math.max(0, sPts.length - 4)];
          const theta = Math.atan2(lastP.y - prevP.y, lastP.x - prevP.x);

          const arrowTip = isCommonCenterEnd
            ? { x: lastP.x - 8 * Math.cos(theta), y: lastP.y - 8 * Math.sin(theta) }
            : lastP;

          ctx.beginPath();
          ctx.moveTo(sPts[0].x, sPts[0].y);
          for (let i = 1; i < sPts.length; i++) {
            const pt = i === sPts.length - 1 && isCommonCenterEnd ? arrowTip : sPts[i];
            ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();

          // Flecha de dirección de la solución en el mismo tono gris técnico
          ctx.fillStyle = '#777777';
          ctx.beginPath();
          ctx.moveTo(arrowTip.x, arrowTip.y);
          ctx.lineTo(arrowTip.x - 10 * Math.cos(theta - 0.38), arrowTip.y - 10 * Math.sin(theta - 0.38));
          ctx.lineTo(arrowTip.x - 10 * Math.cos(theta + 0.38), arrowTip.y - 10 * Math.sin(theta + 0.38));
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      ctx.restore();
    }, [challenge, strokes, isDrawing, evaluation, showUserStrokes, showSolution]);

    useEffect(() => {
      renderCanvas();
    }, [renderCanvas]);

    useEffect(() => {
      const handleResize = () => {
        renderCanvas();
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [renderCanvas]);

    // Normalización de coordenadas a resolución de referencia 750x500
    const getNormalizedCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0, pressure: 0.5 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = 750 / rect.width;
      const scaleY = 500 / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
        pressure: e.pressure || 0.5,
      };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;
      const canvas = canvasRef.current;
      if (canvas) {
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          // Ignorar
        }
      }

      activePointerIdRef.current = e.pointerId;
      const { x, y, pressure } = getNormalizedCoords(e);
      currentStrokeRef.current = [{ x, y, pressure, time: Date.now() }];
      isDrawingRef.current = true;
      setIsDrawing(true);
      if (onDrawingStateChange) onDrawingStateChange(true);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current || (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId)) return;
      const { x, y, pressure } = getNormalizedCoords(e);
      currentStrokeRef.current.push({ x, y, pressure, time: Date.now() });
      renderCanvas();
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current || (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId)) return;
      isDrawingRef.current = false;
      setIsDrawing(false);
      if (onDrawingStateChange) onDrawingStateChange(false);
      activePointerIdRef.current = null;

      const canvas = canvasRef.current;
      if (canvas) {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch {
          // Ignorar
        }
      }

      if (currentStrokeRef.current.length > 1) {
        const newStrokes = [...strokes, { points: [...currentStrokeRef.current] }];
        setStrokes(newStrokes);

        // Auto-evaluación instantánea: en trazo único evalúa al instante, en retos multi-línea espera a completar todos los trazos requeridos
        const requiredStrokes = Math.max(
          1,
          challenge.minRequiredStrokes || (challenge.targetLines ? challenge.targetLines.length : 1)
        );
        const isReadyToAutoEval =
          requiredStrokes === 1
            ? (challenge.isSingleStrokeAutoEval || newStrokes.length >= 1)
            : newStrokes.length >= requiredStrokes;

        if (isReadyToAutoEval) {
          currentStrokeRef.current = [];
          const result = evaluateStrokeSubmission(newStrokes, challenge);
          setEvaluation(result);
          onEvaluationComplete(result);
          renderCanvas();
          return;
        }
      }
      currentStrokeRef.current = [];
      renderCanvas();
    };

    return (
      <div
        className="w-full flex flex-col items-center mx-auto"
        style={{
          maxWidth: 'min(100%, 750px, calc((100vh - 230px) * (750 / 500)))',
        }}
      >
        {/* Contenedor del lienzo con aspect-ratio 750/500 estrictamente bloqueado para evitar distorsiones o achatamiento */}
        <div
          className="relative w-full aspect-[750/500] border-2 border-black bg-white shadow-[4px_4px_0px_#000000] select-none touch-none overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            width={750}
            height={500}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="block w-full h-full cursor-crosshair touch-none select-none"
          />

          {/* HUD SUPERIOR IZQUIERDO: MAESTRÍA Y FASE CINEMÁTICA (NÚMEROS, CUADRITOS E INFO) */}
          <div className="absolute top-2.5 left-2.5 z-20 flex flex-col gap-1.5 p-1.5 bg-white/95 border-2 border-black shadow-[2px_2px_0px_#000000] font-mono pointer-events-auto select-none">
            {/* Maestría: M [✓][✓][ ] 0/3 [i] */}
            <div className={`flex items-center gap-1.5 text-xs transition-transform ${justEarnedMastery ? 'scale-105' : ''}`}>
              <span className="text-[10px] font-bold text-neutral-600">M:</span>
              <div className="flex items-center gap-0.5">
                {[0, 1, 2].map((i) => {
                  const isFilled = i < (masteryStreak ?? 0);
                  const isJustFilled = justEarnedMastery && i === (masteryStreak ?? 0) - 1;
                  return (
                    <span
                      key={i}
                      className={`w-3.5 h-3.5 border border-black flex items-center justify-center text-[8px] font-bold transition-all ${
                        isJustFilled
                          ? 'bg-black text-white animate-mastery-pop scale-125 z-10 shadow-[0_0_0_2px_#000000]'
                          : isFilled
                          ? 'bg-black text-white'
                          : 'bg-neutral-100 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                  );
                })}
              </div>
              <span className={`text-[10px] font-bold tabular-nums transition-colors ${justEarnedMastery ? 'text-black font-black' : ''}`}>
                {masteryStreak ?? 0}/3
              </span>
              {justEarnedMastery && (
                <span className="bg-black text-white text-[8px] font-black px-1 border border-black animate-bounce shadow-[1px_1px_0px_#000]">
                  +1
                </span>
              )}
              {onOpenMasteryInfo && (
                <button
                  type="button"
                  onClick={onOpenMasteryInfo}
                  className="w-3.5 h-3.5 border border-black flex items-center justify-center text-[9px] font-bold text-neutral-600 hover:text-black hover:bg-neutral-200 cursor-pointer"
                  title="Información de Maestría (Racha de 3 aciertos ≥90%)"
                >
                  i
                </button>
              )}
            </div>

            {/* Fase de Motricidad: F [1][2][3] [i] */}
            <div className="flex items-center gap-1.5 pt-1 border-t border-neutral-300 text-xs">
              <span className="text-[10px] font-bold text-neutral-600">F:</span>
              <div className="flex items-center gap-1">
                {([1, 2, 3] as const).map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => onPhaseChange && onPhaseChange(ph)}
                    className={`w-4 h-4 border border-black flex items-center justify-center text-[9px] font-bold cursor-pointer transition-colors ${
                      currentPhase === ph
                        ? 'bg-black text-white shadow-[1px_1px_0px_#000000]'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                    title={`Fase ${ph}: ${ph === 1 ? 'Precisión (extremos)' : ph === 2 ? 'Fluidez (velocidad constante)' : 'Velocidad (inercia)'}`}
                  >
                    {ph}
                  </button>
                ))}
              </div>
              {onOpenPhaseInfo && (
                <button
                  type="button"
                  onClick={onOpenPhaseInfo}
                  className="w-3.5 h-3.5 border border-black flex items-center justify-center text-[9px] font-bold text-neutral-600 hover:text-black hover:bg-neutral-200 cursor-pointer"
                  title="Información de Fases de Motricidad"
                >
                  i
                </button>
              )}
            </div>
          </div>

          {/* HUD SUPERIOR DERECHO: NOTA OBTENIDA EN GRANDE */}
          {evaluation && (
            <div className="absolute top-2.5 right-2.5 z-20 flex flex-col items-center bg-white border-2 border-black p-2 sm:p-2.5 shadow-[3px_3px_0px_#000000] font-mono pointer-events-auto">
              <span className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider">
                Nota
              </span>
              <span className="text-2xl sm:text-3xl font-black leading-none my-0.5">
                {Math.round(evaluation.overallScore)}%
              </span>
              <span
                className={`text-[9px] font-bold uppercase px-1.5 py-0.5 mt-0.5 border border-black ${
                  evaluation.passed && evaluation.overallScore >= 90
                    ? 'bg-black text-white'
                    : evaluation.passed
                    ? 'bg-neutral-200 text-black'
                    : 'bg-white text-neutral-700'
                }`}
              >
                {evaluation.passed && evaluation.overallScore >= 90
                  ? 'Excelente'
                  : evaluation.passed
                  ? 'Aprobado'
                  : 'Reintentar'}
              </span>
            </div>
          )}

          {/* MINI-POPUP / ANIMACIÓN DE PASO DE FASE O AVANCE DE VERSIÓN */}
          {phaseTransitionNotice && (
            <div className="absolute inset-0 z-30 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-4 select-none pointer-events-auto">
              <div className="bg-white border-3 border-black p-4 sm:p-5 shadow-[6px_6px_0px_#000000] max-w-sm w-full text-center font-mono space-y-3 animate-phase-pop">
                {phaseTransitionNotice.isVersionAdvance ? (
                  <>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-black text-white text-[10px] font-bold uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>¡Versión {phaseTransitionNotice.fromVersion}/{phaseTransitionNotice.totalVersions} Dominada!</span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-lg sm:text-xl font-black font-display text-black">
                        PASAS A VERSIÓN {phaseTransitionNotice.toVersion}: FASE 1 (PRECISIÓN)
                      </h3>
                      <div className="text-xs text-neutral-600 font-bold">
                        Progreso del nivel: {phaseTransitionNotice.toVersion} / {phaseTransitionNotice.totalVersions} versiones
                      </div>
                    </div>

                    <p className="text-[11px] text-neutral-800 bg-neutral-50 p-2 border border-black leading-snug">
                      🎯 Has superado las 3 fases (Precisión, Fluidez y Velocidad) de esta versión. Ahora comienza la versión {phaseTransitionNotice.toVersion} desde la Fase 1.
                    </p>

                    <button
                      type="button"
                      onClick={onDismissPhaseTransition}
                      className="w-full btn-ink py-2 px-3 text-xs font-bold uppercase flex items-center justify-center gap-2 cursor-pointer shadow-[2px_2px_0px_#000000] hover:bg-neutral-900"
                    >
                      <span>Comenzar Versión {phaseTransitionNotice.toVersion}</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-black text-white text-[10px] font-bold uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>¡Fase {phaseTransitionNotice.fromPhase} Superada! (3/3)</span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-lg sm:text-xl font-black font-display text-black">
                        PASAS A FASE {phaseTransitionNotice.toPhase}: {phaseTransitionNotice.toPhase === 2 ? 'FLUIDEZ' : 'VELOCIDAD'}
                      </h3>
                      <div className="flex items-center justify-center gap-1.5 pt-1">
                        {([1, 2, 3] as const).map((ph) => (
                          <span
                            key={ph}
                            className={`px-2 py-0.5 text-[10px] font-bold border border-black ${
                              ph < phaseTransitionNotice.toPhase
                                ? 'bg-neutral-200 text-neutral-600 line-through'
                                : ph === phaseTransitionNotice.toPhase
                                ? 'bg-black text-white scale-105 shadow-[1px_1px_0px_#000000]'
                                : 'bg-white text-neutral-400'
                            }`}
                          >
                            {ph === 1 ? '1. Precisión' : ph === 2 ? '2. Fluidez' : '3. Velocidad'}
                          </span>
                        ))}
                      </div>
                    </div>

                    <p className="text-[11px] text-neutral-800 bg-neutral-50 p-2 border border-black leading-snug">
                      {phaseTransitionNotice.toPhase === 2
                        ? '🎯 Has consolidado la precisión de extremos. Ahora en Fase 2 (Fluidez): Dibuja a velocidad constante sin titubeos ni paradas intermedias.'
                        : '⚡ Has dominado la uniformidad del trazo. Ahora en Fase 3 (Velocidad): Ejecuta el trazo con inercia rápida e impulso reflejo.'}
                    </p>

                    <button
                      type="button"
                      onClick={onDismissPhaseTransition}
                      className="w-full btn-ink py-2 px-3 text-xs font-bold uppercase flex items-center justify-center gap-2 cursor-pointer shadow-[2px_2px_0px_#000000] hover:bg-neutral-900"
                    >
                      <span>Continuar a Fase {phaseTransitionNotice.toPhase}</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* BARRA DE CONTROL INFERIOR Y EVALUACIÓN */}
        <div className="w-full mt-2 font-mono">
          {!evaluation ? (
            /* Estado SIN EVALUAR: contador de trazos, undo, clear, auto-avance, capas y botón CORREGIR destacado */
            <div className="flex items-center justify-between gap-2 p-2 border-2 border-black bg-white shadow-[2px_2px_0px_#000000]">
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-neutral-700 bg-neutral-100 px-2 py-1 border border-black shadow-[1px_1px_0px_#000000]">
                  Trazos: {strokes.length} / {Math.max(1, challenge.minRequiredStrokes || (challenge.targetLines ? challenge.targetLines.length : 1))}
                </span>
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={strokes.length === 0}
                  className="btn-ink-outline p-1.5 text-xs font-bold disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-[1px_1px_0px_#000000]"
                  title="Deshacer trazo (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={strokes.length === 0}
                  className="btn-ink-outline p-1.5 text-xs font-bold disabled:opacity-30 disabled:pointer-events-none cursor-pointer hover:bg-red-50 hover:text-red-700 shadow-[1px_1px_0px_#000000]"
                  title="Borrar lienzo"
                >
                  <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>

                {/* Alternar auto-avance */}
                <button
                  type="button"
                  onClick={handleToggleAutoAdvance}
                  className={`px-2 py-1 text-xs font-bold border border-black flex items-center gap-1 cursor-pointer transition-colors shadow-[1px_1px_0px_#000000] ${
                    autoAdvance ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                  title={autoAdvance ? "Auto-avance activado (espera 1.5s tras corregir). Haz clic para desactivar." : "Auto-avance desactivado. Haz clic para activar."}
                >
                  <Zap className={`w-3.5 h-3.5 ${autoAdvance ? 'fill-white' : ''}`} />
                  <span className="text-[10px]">Auto: {autoAdvance ? 'ON (1.5s)' : 'OFF'}</span>
                </button>

                {/* Alternar capas: Trazo y Solución */}
                {onToggleUserStrokes && (
                  <button
                    type="button"
                    onClick={onToggleUserStrokes}
                    className={`p-1.5 text-xs font-bold border border-black cursor-pointer transition-colors shadow-[1px_1px_0px_#000000] ${
                      showUserStrokes ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-400 line-through'
                    }`}
                    title={showUserStrokes ? "Ocultar trazo" : "Mostrar trazo"}
                  >
                    {showUserStrokes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                )}
                {onToggleSolution && (
                  <button
                    type="button"
                    onClick={onToggleSolution}
                    className={`px-2 py-1 text-xs font-bold border border-black flex items-center gap-1 cursor-pointer transition-colors shadow-[1px_1px_0px_#000000] ${
                      showSolution ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                    title={showSolution ? "Ocultar guía / solución" : "Mostrar guía / solución"}
                  >
                    {showSolution ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline text-[10px]">Guía</span>
                  </button>
                )}

                {/* Botón Reporte accesible antes de evaluar */}
                <button
                  type="button"
                  onClick={() => setShowReportModal(true)}
                  className="btn-ink-outline px-2 py-1 text-xs font-bold flex items-center gap-1 cursor-pointer shadow-[1px_1px_0px_#000000] hover:bg-neutral-100"
                  title="Reportar anomalía o problema en este reto"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden md:inline text-[10px]">Reporte</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleEvaluate}
                disabled={strokes.length === 0}
                className="btn-ink px-3 sm:px-4 py-1.5 text-xs font-bold uppercase disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-[2px_2px_0px_#000000] flex items-center gap-1.5 shrink-0"
                title={strokes.length === 0 ? "Dibuja en el lienzo antes de corregir" : "Corregir trazo y ver nota (Enter)"}
              >
                <span>Corregir</span>
                <Check className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          ) : (
            /* Estado EVALUADO: NOTA visible, Siguiente, Reintentar, Stats del Trazo y Reporte */
            <div className="flex flex-col gap-1.5 w-full">
              <div className="flex items-center justify-between gap-2 p-2 border-2 border-black bg-white shadow-[2px_2px_0px_#000000]">
                {/* Lado izquierdo: Reintentar, Auto-toggle, capas, Stats y Reporte */}
                <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="btn-ink-outline px-2.5 py-1 text-xs font-bold flex items-center gap-1 cursor-pointer shadow-[1px_1px_0px_#000000]"
                    title="Reintentar este ejercicio"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Reintentar</span>
                  </button>

                  {/* Alternar auto-avance */}
                  <button
                    type="button"
                    onClick={handleToggleAutoAdvance}
                    className={`px-2 py-1 text-xs font-bold border border-black flex items-center gap-1 cursor-pointer transition-colors shadow-[1px_1px_0px_#000000] ${
                      autoAdvance ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                    title={autoAdvance ? "Auto-avance activado (espera 1.5s tras corregir). Haz clic para pausar." : "Auto-avance desactivado. Haz clic para activar."}
                  >
                    <Zap className={`w-3.5 h-3.5 ${autoAdvance ? 'fill-white' : ''}`} />
                    <span className="text-[10px]">Auto: {autoAdvance ? 'ON (1.5s)' : 'OFF'}</span>
                  </button>

                  {/* Alternar capas en evaluado */}
                  {onToggleUserStrokes && (
                    <button
                      type="button"
                      onClick={onToggleUserStrokes}
                      className={`p-1.5 text-xs font-bold border border-black cursor-pointer transition-colors shadow-[1px_1px_0px_#000000] ${
                        showUserStrokes ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-400 line-through'
                      }`}
                      title={showUserStrokes ? "Ocultar trazo" : "Mostrar trazo"}
                    >
                      {showUserStrokes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  {onToggleSolution && (
                    <button
                      type="button"
                      onClick={onToggleSolution}
                      className={`px-2 py-1 text-xs font-bold border border-black flex items-center gap-1 cursor-pointer transition-colors shadow-[1px_1px_0px_#000000] ${
                        showSolution ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                      title={showSolution ? "Ocultar guía / solución" : "Mostrar guía / solución"}
                    >
                      {showSolution ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span className="hidden md:inline text-[10px]">Solución</span>
                    </button>
                  )}

                  {/* BOTÓN STATS DEL TRAZO (PAUSA AUTO-AVANCE MOMENTÁNEAMENTE) */}
                  <button
                    type="button"
                    onClick={() => setShowStatsModal(true)}
                    className="btn-ink-outline px-2 py-1 text-xs font-bold flex items-center gap-1 cursor-pointer shadow-[1px_1px_0px_#000000] hover:bg-neutral-100"
                    title="Ver estadísticas detalladas del trazo y biomecánica (pausa el auto-avance)"
                  >
                    <Activity className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span className="text-[10px] font-bold">Stats</span>
                  </button>

                  {/* BOTÓN DE REPORTE */}
                  <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    className="btn-ink-outline px-2 py-1 text-xs font-bold flex items-center gap-1 cursor-pointer shadow-[1px_1px_0px_#000000] hover:bg-neutral-100"
                    title="Escribir nota y descargar reporte de depuración (pausa el auto-avance)"
                  >
                    <FileText className="w-3.5 h-3.5 stroke-[2]" />
                    <span className="hidden sm:inline text-[10px] font-bold">Reporte</span>
                  </button>
                </div>

                {/* Lado derecho: Botón Siguiente con cuenta atrás */}
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-ink px-4 py-1.5 text-xs uppercase font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000] relative overflow-hidden shrink-0"
                  title="Siguiente ejercicio o versión (Enter / Espacio)"
                >
                  {autoAdvance && autoAdvanceCountdown !== null && autoAdvanceCountdown > 0 && (
                    <div
                      className="absolute bottom-0 left-0 top-0 bg-white/25 pointer-events-none transition-all duration-100 ease-linear"
                      style={{
                        width: `${((1.5 - autoAdvanceCountdown) / 1.5) * 100}%`,
                      }}
                    />
                  )}
                  <span>
                    Siguiente
                    {autoAdvance && autoAdvanceCountdown !== null && autoAdvanceCountdown > 0
                      ? ` (${autoAdvanceCountdown.toFixed(1)}s)`
                      : ''}
                  </span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MODAL DE ESTADÍSTICAS DETALLADAS DEL TRAZO */}
        {showStatsModal && evaluation && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in font-mono">
            <div className="bg-white border-4 border-black p-4 sm:p-5 max-w-lg w-full shadow-[8px_8px_0px_#000000] flex flex-col gap-3.5 max-h-[92vh] overflow-y-auto">
              {/* Cabecera */}
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-black stroke-[2.5]" />
                  <h3 className="font-display font-bold text-sm sm:text-base uppercase tracking-tight">
                    Estadísticas Detalladas del Trazo
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStatsModal(false)}
                  className="p-1 hover:bg-neutral-100 border border-black cursor-pointer active:scale-95 shadow-[1px_1px_0px_#000000]"
                  title="Cerrar modal (Esc)"
                >
                  <X className="w-4 h-4 text-black stroke-[2.5]" />
                </button>
              </div>

              {/* Resumen Global: Nota y Estado */}
              <div className="flex items-center justify-between p-2.5 bg-neutral-100 border-2 border-black shadow-[2px_2px_0px_#000000]">
                <div className="flex flex-col">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">
                    Calificación Global
                  </span>
                  <span className="text-2xl font-bold tracking-tight">
                    {evaluation.overallScore}%
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`text-xs px-2 py-0.5 border border-black font-bold uppercase shadow-[1px_1px_0px_#000000] ${
                      evaluation.passed ? 'bg-black text-white' : 'bg-white text-neutral-800'
                    }`}
                  >
                    {evaluation.passed ? 'Aprobado ✅' : 'Reintentar ⚠️'}
                  </span>
                  <span className="text-[10px] text-neutral-600">
                    Fase {currentPhase} · {evaluation.phasePassed ? 'Fase Superada' : 'Fase Pendiente'}
                  </span>
                </div>
              </div>

              {/* Sección 1: Cinemática & Biomecánica */}
              {evaluation.kinematics && (
                <div className="flex flex-col gap-2 p-2.5 border-2 border-black bg-white shadow-[2px_2px_0px_#000000]">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-1">
                    <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-black" />
                      <span>Cinemática & Dinámica de Mano</span>
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      {evaluation.kinematics.durationMs}ms duración
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-neutral-50 border border-neutral-300">
                      <span className="text-[10px] text-neutral-500 block">Velocidad Media</span>
                      <span className="font-bold text-sm">{evaluation.kinematics.avgSpeedPxPerSec} px/s</span>
                      <span className="text-[10px] text-neutral-400 block">Pico: {evaluation.kinematics.peakSpeedPxPerSec} px/s</span>
                    </div>

                    <div className="p-2 bg-neutral-50 border border-neutral-300">
                      <span className="text-[10px] text-neutral-500 block">Índice de Fluidez</span>
                      <span className="font-bold text-sm">{evaluation.kinematics.fluencyScore}/100</span>
                      <span className="text-[10px] text-neutral-400 block">
                        {evaluation.kinematics.microStopCount} frenazo{evaluation.kinematics.microStopCount === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="p-2 bg-neutral-50 border border-neutral-300">
                      <span className="text-[10px] text-neutral-500 block">Media de Usuario</span>
                      <span className="font-bold text-sm">{evaluation.kinematics.userBaselineSpeedPxPerSec} px/s</span>
                      <span className="text-[10px] text-neutral-400 block">
                        Ratio: {Math.round(evaluation.kinematics.speedRatioVsBaseline * 100)}%
                      </span>
                    </div>

                    <div className="p-2 bg-neutral-50 border border-neutral-300">
                      <span className="text-[10px] text-neutral-500 block">Exigencia Fase {currentPhase}</span>
                      <span className="font-bold text-xs truncate block" title={evaluation.kinematics.phaseRequirementText}>
                        {evaluation.phasePassed ? 'Cumplida ✅' : 'No alcanzada ❌'}
                      </span>
                      <span className="text-[10px] text-neutral-400 block">
                        {currentPhase === 1 ? 'Ritmo libre' : currentPhase === 2 ? 'Fluidez ≥60%' : 'Velocidad ≥480 px/s'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] bg-neutral-100 p-1.5 border border-neutral-300 text-neutral-700">
                    <span className="font-bold text-black">Diagnóstico: </span>
                    {evaluation.kinematics.speedDiagnosisLabel}
                  </div>
                </div>
              )}

              {/* Sección 2: Geometría & Precisión de Trazo */}
              <div className="flex flex-col gap-2 p-2.5 border-2 border-black bg-white shadow-[2px_2px_0px_#000000]">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-1">
                  <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-black" />
                    <span>Precisión Geométrica</span>
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    {strokes.length} trazo{strokes.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-neutral-50 border border-neutral-300 text-center">
                    <span className="text-[10px] text-neutral-500 block">Puntería</span>
                    <span className="font-bold text-sm">{evaluation.metrics.boundaryScore}%</span>
                  </div>
                  <div className="p-2 bg-neutral-50 border border-neutral-300 text-center">
                    <span className="text-[10px] text-neutral-500 block">Rectitud</span>
                    <span className="font-bold text-sm">{evaluation.metrics.straightnessScore}%</span>
                  </div>
                  <div className="p-2 bg-neutral-50 border border-neutral-300 text-center">
                    <span className="text-[10px] text-neutral-500 block">Paralelismo</span>
                    <span className="font-bold text-sm">{evaluation.metrics.parallelismScore}%</span>
                  </div>
                </div>

                {challenge.spacingTrackParams && (
                  <div className="p-2 bg-neutral-50 border border-neutral-300 text-xs flex justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-500 block">Paso Medido</span>
                      <span className="font-bold">{evaluation.detectedStats.measuredAvgSpacingPx} px</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 block">Objetivo</span>
                      <span className="font-bold">{challenge.targetSpacingPx} px</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 block">Dispersión</span>
                      <span className="font-bold">±{evaluation.detectedStats.spacingVariance} px</span>
                    </div>
                  </div>
                )}

                {evaluation.directionWarning && (
                  <div className="p-2 bg-red-50 border border-red-500 text-red-700 text-xs font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{evaluation.directionWarning}</span>
                  </div>
                )}
              </div>

              {/* Consejo didáctico */}
              {evaluation.tipMessage && (
                <div className="text-xs p-2 bg-neutral-50 border border-neutral-300 text-neutral-600">
                  <strong className="text-black">Consejo: </strong>
                  {evaluation.tipMessage}
                </div>
              )}

              {/* Botones inferiores */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowStatsModal(false);
                    handleRetry();
                  }}
                  className="btn-ink-outline px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-[1px_1px_0px_#000000]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reintentar</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowStatsModal(false)}
                    className="px-3 py-1.5 text-xs font-bold border border-black bg-neutral-100 hover:bg-neutral-200 cursor-pointer shadow-[1px_1px_0px_#000000]"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowStatsModal(false);
                      handleNext();
                    }}
                    className="btn-ink px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
                  >
                    <span>Siguiente</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE REPORTE DE EVALUACIÓN Y DEPURACIÓN */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in font-mono">
            <div className="bg-white border-4 border-black p-4 sm:p-5 max-w-lg w-full shadow-[8px_8px_0px_#000000] flex flex-col gap-3 max-h-[92vh] overflow-y-auto">
              {/* Cabecera */}
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-black stroke-[2.5]" />
                  <h3 className="font-display font-bold text-sm sm:text-base uppercase tracking-tight">
                    Reporte de Evaluación y Depuración
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="p-1 hover:bg-neutral-100 border border-black cursor-pointer active:scale-95 shadow-[1px_1px_0px_#000000]"
                  title="Cerrar modal (Esc)"
                >
                  <X className="w-4 h-4 text-black stroke-[2.5]" />
                </button>
              </div>

              {/* Metadatos del reto */}
              <div className="flex items-center justify-between text-xs font-mono bg-neutral-50 p-2 border border-black">
                <div>
                  <span className="text-neutral-500">Semilla:</span> <strong>#{challenge.seed}</strong>
                </div>
                <div>
                  <span className="text-neutral-500">Reto:</span> <strong>{challenge.code}</strong>
                </div>
                <div>
                  <span className="text-neutral-500">Nota:</span>{' '}
                  <strong>{evaluation ? `${evaluation.overallScore}%` : 'Sin evaluar'}</strong>
                </div>
              </div>

              {/* Campo de Nota / Explicación del problema */}
              <div className="flex flex-col gap-1.5 bg-neutral-50 p-3 border-2 border-black">
                <label className="text-xs font-mono font-bold text-black flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Nota o explicación del problema:</span>
                  </span>
                  <span className="text-[10px] text-neutral-500 font-normal hidden sm:inline">
                    (Se guardará en el .JSON y en el texto copiado)
                  </span>
                </label>
                <textarea
                  value={userNote}
                  onChange={(e) => setUserNote(e.target.value)}
                  placeholder="Escribe aquí qué ocurrió (ej: 'El trazo iba fluido pero dio 75%', 'Sentido inverso erróneo', 'Dianas desalineadas')..."
                  className="w-full h-20 p-2 text-xs font-mono bg-white border border-black resize-none focus:outline-none focus:ring-2 focus:ring-black selection:bg-black selection:text-white"
                  autoFocus
                />
                <div className="flex flex-wrap gap-1 items-center pt-0.5">
                  <span className="text-[10px] font-mono text-neutral-500 font-bold mr-1">Rápido:</span>
                  {['Nota injusta', 'Trazo no detectado', 'Fallo en velocidad', 'Sentido invertido', 'Guía incorrecta'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setUserNote((prev) => (prev ? `${prev} · ${tag}` : tag))}
                      className="text-[10px] font-mono bg-white hover:bg-black hover:text-white border border-black px-1.5 py-0.5 cursor-pointer transition-colors shadow-[1px_1px_0px_#000000]"
                    >
                      +{tag}
                    </button>
                  ))}
                  {userNote && (
                    <button
                      type="button"
                      onClick={() => setUserNote('')}
                      className="text-[10px] font-mono text-neutral-500 hover:text-black ml-auto underline cursor-pointer"
                    >
                      Borrar nota
                    </button>
                  )}
                </div>
              </div>

              {/* Vista previa del contenido */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-mono font-bold text-neutral-600">
                  Vista previa del reporte (Markdown con tu nota):
                </label>
                <textarea
                  readOnly
                  value={currentReportMarkdown}
                  className="w-full h-24 p-2 font-mono text-[10px] bg-neutral-50 border border-black resize-none selection:bg-black selection:text-white"
                />
              </div>

              {/* Acciones de exportación */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-200">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadReport}
                    className="btn-ink px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
                    title="Descargar archivo .JSON incluyendo tu nota"
                  >
                    {downloadedReport ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Download className="w-3.5 h-3.5" />}
                    <span>{downloadedReport ? '¡Descargado!' : 'Descargar JSON'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="btn-ink-outline px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
                    title="Copiar texto con tu nota al portapapeles"
                  >
                    {copiedReport ? <Check className="w-3.5 h-3.5 text-black stroke-[2.5]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedReport ? '¡Copiado!' : 'Copiar Texto'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-3 py-1.5 text-xs font-mono text-neutral-600 hover:text-black border border-neutral-300 hover:border-black cursor-pointer ml-auto"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);
