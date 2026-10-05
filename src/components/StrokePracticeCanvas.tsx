import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Undo2, Trash2, Check, ArrowRight, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  LabExerciseDef,
  RawStroke,
  PointWithMeta,
  ProceduralStrokeChallenge,
  StrokeEvaluation,
} from '../lib/strokeTypes';
import { generateStrokeChallenge } from '../lib/strokeProceduralGenerator';
import { evaluateStrokeSubmission } from '../lib/strokeEvaluator';

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
  onPhaseAdvance?: (nextPhase: 1 | 2 | 3) => void;
  seed?: number;
  onNewSeed?: (seed: number) => void;
  onNext?: () => void;
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
      onPhaseAdvance,
      seed: externalSeed,
      onNewSeed,
      onNext,
    },
    ref
  ) => {
    const [challengeSeed, setChallengeSeed] = useState<number>(() =>
      externalSeed !== undefined ? externalSeed : Math.floor(Math.random() * 90000 + 10000)
    );

    const [challenge, setChallenge] = useState<ProceduralStrokeChallenge>(() => {
      const ch = generateStrokeChallenge(exerciseDef, challengeSeed, 600, 540);
      ch.activePhase = currentPhase;
      return ch;
    });

    const [strokes, setStrokes] = useState<RawStroke[]>([]);
    const [evaluation, setEvaluation] = useState<StrokeEvaluation | null>(null);
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const currentStrokeRef = useRef<PointWithMeta[]>([]);
    const activePointerIdRef = useRef<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Sincronizar cuando cambia el ejercicio o la fase
    useEffect(() => {
      const newSeed = externalSeed !== undefined ? externalSeed : Math.floor(Math.random() * 90000 + 10000);
      setChallengeSeed(newSeed);
      if (onNewSeed && externalSeed === undefined) onNewSeed(newSeed);

      const ch = generateStrokeChallenge(exerciseDef, newSeed, 600, 540);
      ch.activePhase = currentPhase;
      setChallenge(ch);
      setStrokes([]);
      currentStrokeRef.current = [];
      setIsDrawing(false);
      setEvaluation(null);
      onEvaluationComplete(null);
    }, [exerciseDef.code, currentPhase, externalSeed]);

    // Manejadores de acciones
    const handleUndo = useCallback(() => {
      setStrokes((prev) => {
        const next = prev.slice(0, -1);
        setEvaluation(null);
        onEvaluationComplete(null);
        return next;
      });
    }, [onEvaluationComplete]);

    const handleClear = useCallback(() => {
      setStrokes([]);
      currentStrokeRef.current = [];
      setEvaluation(null);
      onEvaluationComplete(null);
    }, [onEvaluationComplete]);

    const handleEvaluate = useCallback(() => {
      if (strokes.length === 0) return;
      const res = evaluateStrokeSubmission(strokes, challenge);
      setEvaluation(res);
      onEvaluationComplete(res);
      if (res.phasePassed && currentPhase < 3 && onPhaseAdvance) {
        onPhaseAdvance((currentPhase + 1) as 1 | 2 | 3);
      }
    }, [strokes, challenge, currentPhase, onPhaseAdvance, onEvaluationComplete]);

    const handleNext = useCallback(() => {
      if (onNext) {
        onNext();
      } else {
        const newSeed = Math.floor(Math.random() * 90000 + 10000);
        setChallengeSeed(newSeed);
        if (onNewSeed) onNewSeed(newSeed);
        const ch = generateStrokeChallenge(exerciseDef, newSeed, 600, 540);
        ch.activePhase = currentPhase;
        setChallenge(ch);
        setStrokes([]);
        currentStrokeRef.current = [];
        setEvaluation(null);
        onEvaluationComplete(null);
      }
    }, [onNext, onNewSeed, exerciseDef, currentPhase, onEvaluationComplete]);

    const handleRetry = useCallback(() => {
      setStrokes([]);
      currentStrokeRef.current = [];
      setEvaluation(null);
      onEvaluationComplete(null);
    }, [onEvaluationComplete]);

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

      const w = 600;
      const h = 540;

      ctx.save();

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

      // F. PUNTOS DIANA MINIMALISTAS
      if (challenge.keyPoints && challenge.keyPoints.length > 0) {
        for (const kp of challenge.keyPoints) {
          ctx.save();
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 3.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#000000';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';

          const labelText = kp.label || String(kp.order);
          let labelX = kp.x;
          let labelY = kp.y - 6;

          if (
            (challenge.category === 'radial_focal' ||
              challenge.directionKey === 'radial_outward' ||
              challenge.directionKey === 'radial_inward') &&
            challenge.keyPoints &&
            challenge.keyPoints.length > 2
          ) {
            const centerKp = challenge.keyPoints[0];
            const dx = kp.x - centerKp.x;
            const dy = kp.y - centerKp.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 15) {
              labelX = kp.x + (dx / dist) * 12;
              labelY = kp.y + (dy / dist) * 12;
              ctx.textBaseline = 'middle';
            }
          }

          ctx.fillText(labelText, labelX, labelY);
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

      // H. SUPERPOSICIÓN DE SOLUCIÓN TRAS CORRECCIÓN
      if (showSolution && evaluation && evaluation.solutionOverlay) {
        const linesToDraw: { x: number; y: number }[][] =
          evaluation.solutionOverlay.multiLines && evaluation.solutionOverlay.multiLines.length > 0
            ? evaluation.solutionOverlay.multiLines.map((l) => l.points)
            : evaluation.solutionOverlay.points.length > 1
            ? [evaluation.solutionOverlay.points]
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
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.4;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.setLineDash([5, 4]);

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
              ctx.fillStyle = '#000000';
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

          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.moveTo(arrowTip.x, arrowTip.y);
          ctx.lineTo(arrowTip.x - 11 * Math.cos(theta - 0.38), arrowTip.y - 11 * Math.sin(theta - 0.38));
          ctx.lineTo(arrowTip.x - 11 * Math.cos(theta + 0.38), arrowTip.y - 11 * Math.sin(theta + 0.38));
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

    // Normalización de coordenadas a resolución de referencia 600x540
    const getNormalizedCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0, pressure: 0.5 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = 600 / rect.width;
      const scaleY = 540 / rect.height;
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
      setIsDrawing(true);
      if (onDrawingStateChange) onDrawingStateChange(true);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing || (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId)) return;
      const { x, y, pressure } = getNormalizedCoords(e);
      currentStrokeRef.current.push({ x, y, pressure, time: Date.now() });
      renderCanvas();
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing || (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId)) return;
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

        // Auto-evaluación instantánea para ejercicios de trazo único o número de trazos requerido
        const requiredStrokes = challenge.minRequiredStrokes || 1;
        if (challenge.isSingleStrokeAutoEval || newStrokes.length >= requiredStrokes) {
          currentStrokeRef.current = [];
          const result = evaluateStrokeSubmission(newStrokes, challenge);
          setEvaluation(result);
          onEvaluationComplete(result);

          if (result.phasePassed && currentPhase < 3 && onPhaseAdvance) {
            onPhaseAdvance((currentPhase + 1) as 1 | 2 | 3);
          }
          renderCanvas();
          return;
        }
      }
      currentStrokeRef.current = [];
      renderCanvas();
    };

    return (
      <div className="w-full flex flex-col items-center">
        {/* Contenedor del lienzo 100% centrado */}
        <div className="relative w-full flex items-center justify-center select-none touch-none">
          <canvas
            ref={canvasRef}
            width={600}
            height={540}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="w-full h-auto aspect-[600/540] border-2 border-black bg-white shadow-[4px_4px_0px_#000000] cursor-crosshair touch-none select-none"
            style={{
              maxWidth: '100%',
              maxHeight: 'calc(100vh - 220px)',
            }}
          />
        </div>

        {/* BARRA DE CONTROL INFERIOR Y EVALUACIÓN */}
        <div className="w-full mt-2 font-mono">
          {!evaluation ? (
            /* Estado SIN EVALUAR: contador de trazos, undo, clear y botón CORREGIR destacado */
            <div className="flex items-center justify-between gap-2 p-2 border-2 border-black bg-white shadow-[2px_2px_0px_#000000]">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[11px] font-bold text-neutral-700 bg-neutral-100 px-2 py-1 border border-black shadow-[1px_1px_0px_#000000]">
                  Trazos: {strokes.length}{challenge.minRequiredStrokes ? ` / ${challenge.minRequiredStrokes}` : ''}
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
              </div>

              <button
                type="button"
                onClick={handleEvaluate}
                disabled={strokes.length === 0}
                className="btn-ink px-3 sm:px-4 py-1.5 text-xs font-bold uppercase disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-[2px_2px_0px_#000000] flex items-center gap-1.5"
                title={strokes.length === 0 ? "Dibuja en el lienzo antes de corregir" : "Corregir trazo y ver nota (Enter)"}
              >
                <span>Corregir</span>
                <Check className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          ) : (
            /* Estado EVALUADO: NOTA visible, Siguiente, Reintentar y panel de diagnóstico */
            <div className="flex flex-col gap-1.5 w-full">
              <div className="flex items-center justify-between gap-2 p-2 border-2 border-black bg-white shadow-[2px_2px_0px_#000000]">
                {/* Lado izquierdo: NOTA y estado */}
                <div className="flex items-center gap-2">
                  <div
                    className={`flex items-center gap-1.5 border-2 border-black px-2.5 py-1 text-xs font-bold shadow-[1px_1px_0px_#000000] ${
                      evaluation.passed && evaluation.overallScore >= 90
                        ? 'bg-black text-white'
                        : evaluation.passed
                        ? 'bg-neutral-100 text-black'
                        : 'bg-neutral-200 text-black'
                    }`}
                  >
                    {evaluation.passed ? (
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                    )}
                    <span>NOTA: {Math.round(evaluation.overallScore)}%</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 uppercase font-bold ml-1 ${
                        evaluation.passed && evaluation.overallScore >= 90
                          ? 'bg-white text-black'
                          : evaluation.passed
                          ? 'bg-black text-white'
                          : 'border border-black text-black'
                      }`}
                    >
                      {evaluation.passed && evaluation.overallScore >= 90
                        ? 'Excelente (≥90%)'
                        : evaluation.passed
                        ? 'Aprobado'
                        : 'Reintentar'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleRetry}
                    className="btn-ink-outline px-2.5 py-1 text-xs font-bold flex items-center gap-1 cursor-pointer shadow-[1px_1px_0px_#000000]"
                    title="Reintentar este ejercicio"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Reintentar</span>
                  </button>
                </div>

                {/* Lado derecho: Botón Siguiente */}
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-ink px-4 py-1.5 text-xs uppercase font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
                  title="Siguiente ejercicio o versión (Enter / Espacio)"
                >
                  <span>Siguiente</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Banner de feedback y explicación */}
              <div className="w-full p-2.5 border-2 border-black bg-neutral-50 flex flex-col gap-1 text-xs shadow-[2px_2px_0px_#000000]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold font-display text-xs sm:text-sm text-black">
                    {evaluation.feedbackTitle}
                  </span>
                  <span className="text-[10px] text-neutral-500 font-bold shrink-0">
                    Objetivo maestría: ≥90%
                  </span>
                </div>
                <p className="text-[11px] font-sans text-neutral-700 leading-snug">
                  {evaluation.feedbackMessage}
                </p>
                {evaluation.directionWarning && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-400 px-2 py-0.5 mt-0.5">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>{evaluation.directionWarning}</span>
                  </div>
                )}
                {evaluation.tipMessage && (
                  <p className="text-[10px] font-sans text-neutral-500 italic mt-0.5">
                    Consejo: {evaluation.tipMessage}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);
