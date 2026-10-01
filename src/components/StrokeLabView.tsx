import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ALL_LAB_EXERCISES,
  LabExerciseDef,
  RawStroke,
  PointWithMeta,
  ProceduralStrokeChallenge,
  StrokeEvaluation,
} from '../lib/strokeTypes';
import { generateStrokeChallenge } from '../lib/strokeProceduralGenerator';
import { evaluateStrokeSubmission, buildStrokeDebugReport } from '../lib/strokeEvaluator';
import { getUserSpeedProfile, getBiomechanicalComparison } from '../lib/strokeKinematics';
import {
  Dices,
  Eye,
  EyeOff,
  Undo2,
  Trash2,
  CheckCircle2,
  BookOpen,
  X,
  ChevronLeft,
  ChevronRight,
  Layers,
  Flame,
  Info,
  RotateCcw,
  AlertTriangle,
  Check,
  ArrowRight,
  Activity,
  Gauge,
} from 'lucide-react';

interface StrokeLabViewProps {
  onAwardXP?: (amount: number) => void;
  onAvatarMoodChange?: (mood: any) => void;
}

// Agrupación dinámica de todos los ejercicios del catálogo
const ALL_CHALLENGES_LABEL = `Todos los Retos (${ALL_LAB_EXERCISES.length} Ejercicios)`;

const BLOCKS_LIST = [
  ALL_CHALLENGES_LABEL,
  '⚡ Calistenia: D1 (↗ Abajo-Arriba / Izq-Der)',
  '⚡ Calistenia: D2 (↙ Arriba-Abajo / Der-Izq)',
  '⚡ Calistenia: D3 (↘ Arriba-Abajo / Izq-Der)',
  '⚡ Calistenia: D4 (↖ Abajo-Arriba / Der-Izq)',
  '⚡ Calistenia: Trazos Curvos & Arcos (C & S)',
  'Bloque 1: Consistencia & Calistenia',
  'Bloque 2: Trazos Fundamentales & Trama',
  'Bloque 3: Contornos Cruzados (3D)',
  'Bloque 4: Valor Plano & Gradación',
  'Bloque 5: Planos, Facetas & Isometría',
  'Bloque 6: Sombreado de Poliedros',
  'Bloque 7: Superficies Curvas, Cilindro, Esfera',
  'Bloque 8: Composiciones & Síntesis',
];

export const StrokeLabView: React.FC<StrokeLabViewProps> = ({ onAwardXP }) => {
  // Filtro de bloque y ejercicio seleccionado
  const [selectedBlock, setSelectedBlock] = useState<string>(ALL_CHALLENGES_LABEL);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState<number>(0);
  const currentExercise: LabExerciseDef =
    ALL_LAB_EXERCISES[currentExerciseIndex] || ALL_LAB_EXERCISES[0];

  // Fase didáctica activa para calistenia (1: Precisión/Lento, 2: Fluidez/Ritmo, 3: Velocidad/Disparo)
  const [currentPhase, setCurrentPhase] = useState<1 | 2 | 3>(1);

  // Reto procedural generado con semilla
  const [challengeSeed, setChallengeSeed] = useState<number>(() =>
    Math.floor(Math.random() * 90000 + 10000)
  );
  const [challenge, setChallenge] = useState<ProceduralStrokeChallenge>(() => {
    const ch = generateStrokeChallenge(currentExercise, challengeSeed, 600, 540);
    ch.activePhase = 1;
    return ch;
  });

  // Estado del dibujo del usuario
  const [strokes, setStrokes] = useState<RawStroke[]>([]);
  const currentStrokeRef = useRef<PointWithMeta[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const activePointerIdRef = useRef<number | null>(null);

  // Visibilidad de guías, evaluación y modal
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [evaluation, setEvaluation] = useState<StrokeEvaluation | null>(null);
  const [showBookModal, setShowBookModal] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);

  // Calistenia dinámica: Racha de aciertos y estado de copia de reporte
  const [streak, setStreak] = useState<number>(0);
  const [copiedDebug, setCopiedDebug] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Filtrado de ejercicios por bloque
  const filteredExercises =
    selectedBlock === ALL_CHALLENGES_LABEL
      ? ALL_LAB_EXERCISES
      : ALL_LAB_EXERCISES.filter((e) => e.block === selectedBlock);

  // Regenerar reto procedural con nueva semilla
  const handleNewRandomChallenge = useCallback(() => {
    const newSeed = Math.floor(Math.random() * 90000 + 10000);
    setChallengeSeed(newSeed);
    const newChallenge = generateStrokeChallenge(currentExercise, newSeed, 600, 540);
    newChallenge.activePhase = currentPhase;
    setChallenge(newChallenge);
    setStrokes([]);
    currentStrokeRef.current = [];
    setIsDrawing(false);
    setEvaluation(null);
  }, [currentExercise, currentPhase]);

  // Cambiar manualmente de fase (1: Precisión, 2: Fluidez, 3: Velocidad)
  const handlePhaseSelect = useCallback((phase: 1 | 2 | 3) => {
    setCurrentPhase(phase);
    setChallenge((prev) => ({ ...prev, activePhase: phase }));
    setStrokes([]);
    currentStrokeRef.current = [];
    setIsDrawing(false);
    setEvaluation(null);
  }, []);

  // Reintentar el reto actual (borrar trazos y reiniciar evaluación manteniendo la misma semilla)
  const handleRetryCurrent = useCallback(() => {
    setStrokes([]);
    currentStrokeRef.current = [];
    setIsDrawing(false);
    setEvaluation(null);
  }, []);

  // Copiar reporte detallado al portapapeles para depuración y revisión de notas
  const handleCopyDebugReport = async () => {
    if (!evaluation) return;
    const reportText = buildStrokeDebugReport(challenge, strokes, evaluation);
    try {
      await navigator.clipboard.writeText(reportText);
      setCopiedDebug(true);
      setTimeout(() => setCopiedDebug(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Cambiar de ejercicio por código
  const handleSelectExercise = (exercise: LabExerciseDef) => {
    const idx = ALL_LAB_EXERCISES.findIndex((e) => e.code === exercise.code);
    if (idx !== -1) {
      setCurrentExerciseIndex(idx);
      setImgError(false);
      setStreak(0);
      setCurrentPhase(1);
      const newSeed = Math.floor(Math.random() * 90000 + 10000);
      setChallengeSeed(newSeed);
      const newChallenge = generateStrokeChallenge(exercise, newSeed, 600, 540);
      newChallenge.activePhase = 1;
      setChallenge(newChallenge);
      setStrokes([]);
      currentStrokeRef.current = [];
      setIsDrawing(false);
      setEvaluation(null);
    }
  };

  // Manejar cambio de bloque asegurando que el ejercicio activo sea coherente
  const handleBlockChange = (newBlock: string) => {
    setSelectedBlock(newBlock);
    if (newBlock !== ALL_CHALLENGES_LABEL) {
      const firstInBlock = ALL_LAB_EXERCISES.find((e) => e.block === newBlock);
      if (firstInBlock && currentExercise.block !== newBlock) {
        handleSelectExercise(firstInBlock);
      }
    }
  };

  // Navegar al ejercicio anterior / siguiente
  const handlePrevExercise = () => {
    if (currentExerciseIndex > 0) {
      handleSelectExercise(ALL_LAB_EXERCISES[currentExerciseIndex - 1]);
    }
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < ALL_LAB_EXERCISES.length - 1) {
      handleSelectExercise(ALL_LAB_EXERCISES[currentExerciseIndex + 1]);
    }
  };

  // Atajos de teclado: Espacio / Enter para avanzar (o cambiar de fase), R para reintentar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if ((e.code === 'Space' || e.code === 'Enter') && evaluation !== null) {
        e.preventDefault();
        if (evaluation.phasePassed && currentPhase < 3) {
          handlePhaseSelect((currentPhase + 1) as 1 | 2 | 3);
        } else {
          handleNewRandomChallenge();
        }
      } else if (e.key.toLowerCase() === 'r' && evaluation !== null) {
        e.preventDefault();
        handleRetryCurrent();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPhase, evaluation, handleNewRandomChallenge, handlePhaseSelect, handleRetryCurrent]);

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

    // B. Blob Orgánico 3D con Eje Rector
    if (challenge.blobShape) {
      const pts = challenge.blobShape.splinePoints;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (showGuides) {
        const ax = challenge.blobShape.axisLine;
        ctx.strokeStyle = '#777777';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(ax.x1, ax.y1);
        ctx.lineTo(ax.x2, ax.y2);
        ctx.stroke();
        ctx.setLineDash([]);

        const angle = Math.atan2(ax.y2 - ax.y1, ax.x2 - ax.x1);
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(ax.x2, ax.y2);
        ctx.lineTo(ax.x2 - 10 * Math.cos(angle - 0.4), ax.y2 - 10 * Math.sin(angle - 0.4));
        ctx.lineTo(ax.x2 - 10 * Math.cos(angle + 0.4), ax.y2 - 10 * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();
      }
    }

    // C. Sólido Poliédrico 3D con Foco Solar
    if (challenge.polySolid) {
      const { sunPosition, faces } = challenge.polySolid;

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(sunPosition.x, sunPosition.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      for (let i = 0; i < 8; i++) {
        const rad = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(sunPosition.x + Math.cos(rad) * 17, sunPosition.y + Math.sin(rad) * 17);
        ctx.lineTo(sunPosition.x + Math.cos(rad) * 26, sunPosition.y + Math.sin(rad) * 26);
        ctx.stroke();
      }

      faces.forEach((f) => {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.moveTo(f.vertices[0].x, f.vertices[0].y);
        for (let i = 1; i < f.vertices.length; i++) {
          ctx.lineTo(f.vertices[i].x, f.vertices[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (showGuides) {
          let fcx = 0;
          let fcy = 0;
          for (const v of f.vertices) {
            fcx += v.x;
            fcy += v.y;
          }
          fcx /= f.vertices.length;
          fcy /= f.vertices.length;

          ctx.fillStyle = '#000000';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`Valor ${f.targetValueLevel}`, fcx, fcy);
        }
      });
    }

    // D. Red Isométrica (Rhombille Tiling)
    if (challenge.rhombilleFaces) {
      challenge.rhombilleFaces.forEach((rf) => {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
        ctx.beginPath();
        ctx.moveTo(rf.vertices[0].x, rf.vertices[0].y);
        for (let i = 1; i < rf.vertices.length; i++) {
          ctx.lineTo(rf.vertices[i].x, rf.vertices[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (showGuides) {
          let rcx = 0;
          let rcy = 0;
          for (const v of rf.vertices) {
            rcx += v.x;
            rcy += v.y;
          }
          rcx /= rf.vertices.length;
          rcy /= rf.vertices.length;

          ctx.fillStyle = '#666666';
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${rf.targetAngleDeg}°`, rcx, rcy);
        }
      });
    }

    // E. Curva S generatriz
    if (challenge.waveParams && showGuides) {
      const wp = challenge.waveParams;
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let x = wp.startPoint.x; x <= wp.endPoint.x; x += 4) {
        const y =
          wp.startPoint.y +
          wp.amplitude *
            Math.sin(((x - wp.startPoint.x) / wp.wavelength) * Math.PI * 2 + wp.phase);
        if (x === wp.startPoint.x) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // F. Líneas de cota y carriles guía
    if (showGuides && challenge.guideLines) {
      for (const line of challenge.guideLines) {
        ctx.strokeStyle = line.dashed ? '#888888' : '#000000';
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

    // G. SOLUCIÓN FANTASMA EN GRIS CON OPACIDAD (Visible antes de empezar a dibujar)
    // Desaparece en cuanto el usuario toca el lienzo o tiene trazos
    if (strokes.length === 0 && !isDrawing && showGuides && challenge.ghostSolutionStrokes) {
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

    // H. PUNTOS DIANA MINIMALISTAS (Dots de 3.5px en negro con número de orden pequeño)
    if (challenge.keyPoints && challenge.keyPoints.length > 0) {
      for (const kp of challenge.keyPoints) {
        ctx.save();
        // Dot negro puro
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Número pequeño centrado inmediatamente encima (1, 2, 3...)
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(String(kp.order), kp.x, kp.y - 6);
        ctx.restore();
      }
    }

    // 4. Dibujar los trazos entintados del usuario con suavizado Bézier
    const allStrokes =
      isDrawing && currentStrokeRef.current.length > 0
        ? [...strokes, { points: currentStrokeRef.current }]
        : strokes;

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

    // 5. SUPERPOSICIÓN DE SOLUCIÓN TRAS CORRECCIÓN (Línea discontinua estrictamente monocromática negra)
    if (evaluation && evaluation.solutionOverlay) {
      const linesToDraw: { x: number; y: number }[][] =
        evaluation.solutionOverlay.multiLines && evaluation.solutionOverlay.multiLines.length > 0
          ? evaluation.solutionOverlay.multiLines.map((l) => l.points)
          : evaluation.solutionOverlay.points.length > 1
          ? [evaluation.solutionOverlay.points]
          : [];

      for (const sPts of linesToDraw) {
        if (sPts.length < 2) continue;
        ctx.save();
        ctx.strokeStyle = '#000000'; // Estricto blanco y negro
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([5, 4]);

        ctx.beginPath();
        ctx.moveTo(sPts[0].x, sPts[0].y);
        for (let i = 1; i < sPts.length; i++) {
          ctx.lineTo(sPts[i].x, sPts[i].y);
        }
        ctx.stroke();

        // Flecha de solución en el extremo de llegada
        const lastP = sPts[sPts.length - 1];
        const prevP = sPts[Math.max(0, sPts.length - 4)];
        const theta = Math.atan2(lastP.y - prevP.y, lastP.x - prevP.x);
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(lastP.x, lastP.y);
        ctx.lineTo(lastP.x - 12 * Math.cos(theta - 0.4), lastP.y - 12 * Math.sin(theta - 0.4));
        ctx.lineTo(lastP.x - 12 * Math.cos(theta + 0.4), lastP.y - 12 * Math.sin(theta + 0.4));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.restore();
  }, [challenge, strokes, isDrawing, showGuides, evaluation]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Manejo de punteros normalizado a 600x540
  const getNormalizedCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = 600 / rect.width;
    const scaleY = 540 / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

    return { x, y, pressure };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId) return;

    // Si había una evaluación activa y el usuario vuelve a tocar, limpiar para nuevo intento
    if (evaluation !== null && challenge.isSingleStrokeAutoEval) {
      setEvaluation(null);
      setStrokes([]);
    }

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

      // AUTO-EVALUACIÓN INSTANTÁNEA PARA CALISTENIA (Al alcanzar los trazos requeridos)
      if (challenge.isSingleStrokeAutoEval) {
        const requiredStrokes = challenge.minRequiredStrokes || 1;
        if (newStrokes.length >= requiredStrokes) {
          currentStrokeRef.current = [];
          const result = evaluateStrokeSubmission(newStrokes, challenge);
          setEvaluation(result);
          if (result.passed) {
            setStreak((prev) => prev + 1);
            if (onAwardXP) onAwardXP(15 * requiredStrokes);
          } else {
            setStreak(0);
          }
          renderCanvas();
          return;
        }
      }
    }
    currentStrokeRef.current = [];
    renderCanvas();
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    setStrokes((prev) => prev.slice(0, -1));
    setEvaluation(null);
  };

  const handleClear = () => {
    setStrokes([]);
    currentStrokeRef.current = [];
    setEvaluation(null);
  };

  const handleEvaluate = () => {
    const result = evaluateStrokeSubmission(strokes, challenge);
    setEvaluation(result);
    if (result.passed && onAwardXP) {
      onAwardXP(30);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-start items-center bg-neutral-50 px-2 sm:px-4 py-2 sm:py-3 min-h-[calc(100vh-64px)]">
      {/* Contenedor en 3 columnas: Lateral Izquierdo (Selector) | Centro (Canvas) | Lateral Derecho (Telemetría) */}
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_300px] xl:grid-cols-[300px_minmax(0,1fr)_320px] gap-3 items-start">
        
        {/* ========================================================
            COLUMNA LATERAL IZQUIERDA: SELECTOR Y NAVEGADOR
           ======================================================== */}
        <aside className="w-full flex flex-col gap-2.5 order-2 lg:order-1">
          {/* Tarjeta de Control y Navegación de Ejercicios */}
          <div className="border-2 border-black bg-white p-3 shadow-[3px_3px_0px_#000000]">
            <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-black">
              <span className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 stroke-[2.5]" />
                <span>Plan de Trazos ({ALL_LAB_EXERCISES.length})</span>
              </span>
              <span className="text-[10px] font-mono bg-black text-white px-1.5 py-0.5 font-bold">
                {currentExercise.code}
              </span>
            </div>

            {/* 1. Selector de Bloque */}
            <div className="mb-2">
              <label className="text-[10px] font-mono uppercase font-bold text-neutral-600 block mb-1">
                Filtrar por Bloque:
              </label>
              <select
                value={selectedBlock}
                onChange={(e) => handleBlockChange(e.target.value)}
                className="w-full border-2 border-black px-2 py-1 text-xs font-mono font-bold bg-white shadow-[2px_2px_0px_#000000] cursor-pointer"
              >
                {BLOCKS_LIST.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Selector Desplegable de Ejercicios */}
            <div className="mb-2.5">
              <label className="text-[10px] font-mono uppercase font-bold text-neutral-600 block mb-1 flex justify-between">
                <span>Ejercicio:</span>
                <span className="text-neutral-500 font-bold">{filteredExercises.length} retos</span>
              </label>
              <select
                value={currentExercise.code}
                onChange={(e) => {
                  const ex = ALL_LAB_EXERCISES.find((item) => item.code === e.target.value);
                  if (ex) handleSelectExercise(ex);
                }}
                className="w-full border-2 border-black px-2 py-1 text-xs font-mono font-bold bg-white shadow-[2px_2px_0px_#000000] cursor-pointer truncate"
              >
                {filteredExercises.map((ex) => (
                  <option key={ex.code} value={ex.code}>
                    {ex.isSingleStroke ? '⚡ ' : '📖 '}
                    {ex.page ? `P.${String(ex.page).padStart(2, '0')} ` : ''}
                    {ex.code} · {ex.title}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Botones Anterior / Siguiente para navegar rápido */}
            <div className="flex items-center gap-1.5 mb-3">
              <button
                onClick={handlePrevExercise}
                disabled={currentExerciseIndex === 0}
                className="btn-ink-outline flex-1 py-1 text-xs font-mono flex items-center justify-center gap-1 disabled:opacity-30 cursor-pointer"
                title="Ejercicio Anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
              <button
                onClick={handleNextExercise}
                disabled={currentExerciseIndex === ALL_LAB_EXERCISES.length - 1}
                className="btn-ink-outline flex-1 py-1 text-xs font-mono flex items-center justify-center gap-1 disabled:opacity-30 cursor-pointer"
                title="Ejercicio Siguiente"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 4. Botón Ver Lámina Original / Guía del Ejercicio */}
            <button
              onClick={() => setShowBookModal(true)}
              className="btn-ink-outline w-full py-1.5 text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
            >
              <BookOpen className="w-4 h-4 text-black" />
              <span>
                {currentExercise.page
                  ? `Ver Lámina Original (P.${currentExercise.page})`
                  : `Guía Biomecánica (${currentExercise.code})`}
              </span>
            </button>
          </div>

          {/* Ficha Descriptiva del Ejercicio Activo */}
          <div className="border-2 border-black bg-white p-3 shadow-[2px_2px_0px_#000000] text-xs">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="font-mono font-bold bg-black text-white px-1.5 py-0.5 text-[10px]">
                {currentExercise.code}
              </span>
              <span className="text-[10px] font-mono border border-black px-1.5 py-0.2 font-bold uppercase">
                Dificultad: {currentExercise.difficulty}
              </span>
            </div>
            <h3 className="font-display font-bold text-sm text-black leading-tight mt-1 mb-1">
              {currentExercise.title}
            </h3>
            <p className="text-[11px] text-neutral-600 font-sans leading-relaxed mb-2">
              {currentExercise.desc}
            </p>
            <div className="bg-neutral-100 border border-neutral-300 p-2 font-mono text-[10px] text-neutral-800">
              <strong className="block text-black uppercase mb-0.5">Qué se mide:</strong>
              {currentExercise.metrics}
            </div>
          </div>
        </aside>

        {/* ========================================================
            COLUMNA CENTRAL: ZONA DE DIBUJO (IDÉNTICA A PRÁCTICA)
           ======================================================== */}
        <main className="w-full flex flex-col items-center select-none justify-self-center order-1 lg:order-2">
          <div
            className="w-full flex flex-col items-center"
            style={{
              width: 'min(100%, 600px, max(280px, calc((100vh - 310px) * 600 / 540)))',
            }}
          >
            {/* Barra superior de info compacta sobre el Canvas */}
            <div className="w-full flex items-center justify-between gap-2 mb-2 border-b-2 border-black pb-2 flex-nowrap">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="font-mono font-bold bg-black text-white px-2 py-0.5 text-xs shrink-0">
                  {currentExercise.page ? `P.${currentExercise.page}` : currentExercise.code}
                </span>
                <span className="font-display font-bold text-xs truncate">
                  {challenge.title}
                </span>
              </div>

              {/* Racha en Calistenia Rápida (Monocromático Estricto) */}
              {challenge.isSingleStrokeAutoEval && streak > 0 && (
                <div className="flex items-center gap-1 bg-black text-white px-2 py-0.5 text-xs font-mono font-black shrink-0">
                  <Flame className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                  <span>Racha: {streak}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleNewRandomChallenge}
                  className="btn-ink px-2.5 py-1 text-xs font-mono flex items-center gap-1 cursor-pointer shrink-0 shadow-[2px_2px_0px_#000000]"
                  title="Genera un reto con nuevo ángulo, longitud y medidas para romper el patrón muscular"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Nuevo Reto</span>
                </button>
              </div>
            </div>

            {/* Selector de 3 Fases Cinemáticas (1. Precisión -> 2. Fluidez -> 3. Velocidad) */}
            {challenge.isSingleStrokeAutoEval && (
              <div className="w-full mb-2 p-1 border-2 border-black bg-white flex items-center justify-between gap-1 shadow-[2px_2px_0px_#000000]">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-[10px] font-mono uppercase font-black text-neutral-500 px-1 shrink-0">
                    Fases:
                  </span>
                  <button
                    onClick={() => handlePhaseSelect(1)}
                    className={`px-2 py-0.5 text-xs font-mono font-bold border border-black cursor-pointer transition-colors ${
                      currentPhase === 1
                        ? 'bg-black text-white'
                        : 'bg-white text-black hover:bg-neutral-100'
                    }`}
                    title="Fase 1: Puntería en ① y ② a ritmo libre y calmado"
                  >
                    1. Precisión
                  </button>
                  <button
                    onClick={() => handlePhaseSelect(2)}
                    className={`px-2 py-0.5 text-xs font-mono font-bold border border-black cursor-pointer transition-colors ${
                      currentPhase === 2
                        ? 'bg-black text-white'
                        : 'bg-white text-black hover:bg-neutral-100'
                    }`}
                    title="Fase 2: Ritmo constante y fluido sin micro-paradas ni titubeos"
                  >
                    2. Fluidez
                  </button>
                  <button
                    onClick={() => handlePhaseSelect(3)}
                    className={`px-2 py-0.5 text-xs font-mono font-bold border border-black cursor-pointer transition-colors ${
                      currentPhase === 3
                        ? 'bg-black text-white'
                        : 'bg-white text-black hover:bg-neutral-100'
                    }`}
                    title="Fase 3: Disparo balístico veloz y decidido"
                  >
                    3. Velocidad
                  </button>
                </div>

                <div className="text-[10px] font-mono text-neutral-600 font-bold hidden sm:block pr-1 truncate">
                  {currentPhase === 1 && '🎯 Puntería exacta (ritmo libre)'}
                  {currentPhase === 2 && '〰️ Trazo continuo sin titubear'}
                  {currentPhase === 3 && '⚡ Golpe balístico veloz'}
                </div>
              </div>
            )}

            {/* Banner de Instrucción del Nivel */}
            <div className="w-full mb-2 px-3 py-1.5 border border-black bg-neutral-50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <Info className="w-3.5 h-3.5 text-black shrink-0" />
                <span className="font-sans text-[11px] text-neutral-800 truncate">
                  {challenge.instruction}
                </span>
              </div>
            </div>

            {/* Contenedor del Lienzo: Proporción 600x540 exacta */}
            <div
              data-canvas-zone="true"
              className="relative border-4 border-black bg-white shadow-[4px_4px_0px_#000000] w-full aspect-[600/540] overflow-hidden"
            >
              <canvas
                ref={canvasRef}
                width={600}
                height={540}
                className="touch-none cursor-crosshair block w-full h-full"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              />

              {/* Insignia de Semilla Procedural */}
              <div className="absolute top-2.5 left-2 text-[10px] font-mono uppercase bg-white border border-black px-1.5 py-0.5 pointer-events-none shadow-[1px_1px_0px_#000000] z-10">
                SEMILLA #{challenge.seed}
              </div>

              {/* Insignia de Parámetros Dinámicos */}
              <div className="absolute top-2.5 right-2 text-[10px] font-mono bg-white border border-black px-1.5 py-0.5 pointer-events-none shadow-[1px_1px_0px_#000000] z-10 hidden sm:block">
                {challenge.subtitle}
              </div>

              {/* Cartel Flotante de Corrección Inmediata para Trazo Único (Estricto B&W Manga) */}
              {challenge.isSingleStrokeAutoEval && evaluation && (
                <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-white border-2 border-black p-2.5 shadow-[4px_4px_0px_#000000] flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 z-20 animate-in fade-in">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`text-sm font-mono font-black border-2 border-black px-2 py-0.5 shrink-0 ${
                        evaluation.phasePassed ? 'bg-black text-white' : 'bg-neutral-100 text-black'
                      }`}
                    >
                      {evaluation.overallScore}%
                    </span>
                    <div className="text-[11px] font-mono leading-tight min-w-0">
                      <div className="flex items-center gap-1.5 font-bold text-black truncate">
                        <span>{evaluation.feedbackTitle}</span>
                        {evaluation.kinematics && (
                          <span className="text-[10px] text-neutral-600 font-normal">
                            · {evaluation.kinematics.avgSpeedPxPerSec} px/s ({(evaluation.kinematics.durationMs / 1000).toFixed(2)}s)
                          </span>
                        )}
                      </div>
                      <span className="text-neutral-600 truncate block max-w-[260px] sm:max-w-md">
                        {evaluation.directionWarning || evaluation.feedbackMessage}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    {/* Botón de reporte/depuración idéntico al del Cubo */}
                    <button
                      onClick={handleCopyDebugReport}
                      className="btn-ink-outline px-2 py-1 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-transform active:scale-95 shadow-[1px_1px_0px_#000000]"
                      title="Copiar informe técnico para revisión de nota o depuración"
                    >
                      {copiedDebug ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                          <span className="text-[10px]">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                          <span className="text-[10px] hidden xs:inline">Depurar</span>
                        </>
                      )}
                    </button>

                    {/* Botón Reintentar el mismo reto */}
                    <button
                      onClick={handleRetryCurrent}
                      className="btn-ink-outline px-2.5 py-1 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer shadow-[1px_1px_0px_#000000]"
                      title="Reintentar este mismo reto (R)"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Reintentar</span>
                    </button>

                    {/* Botón Siguiente / Avanzar de Fase */}
                    {evaluation.phasePassed && currentPhase < 3 ? (
                      <button
                        onClick={() => handlePhaseSelect((currentPhase + 1) as 1 | 2 | 3)}
                        className="btn-ink px-3 py-1 text-xs font-mono font-bold uppercase flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
                        title={`Avanzar a Fase ${currentPhase + 1} (Espacio / Enter)`}
                      >
                        <span>Fase {currentPhase + 1}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={handleNewRandomChallenge}
                        className="btn-ink px-3 py-1 text-xs font-mono font-bold uppercase flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
                        title="Generar siguiente reto procedural (Espacio / Enter)"
                      >
                        <span>{evaluation.phasePassed && currentPhase === 3 ? '¡Dominado! Siguiente' : 'Siguiente'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* BARRA DE HERRAMIENTAS Y ACCIONES INFERIOR (EN 1 SOLA LÍNEA, ESTILO PAPLITZ) */}
            <div className="w-full mt-2 flex items-center justify-between gap-1.5 sm:gap-2 border-2 border-black bg-white p-2 shadow-[3px_3px_0px_#000000] flex-nowrap min-w-0">
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <button
                  onClick={handleUndo}
                  disabled={strokes.length === 0}
                  className="btn-ink-outline px-2 py-1 text-xs font-mono disabled:opacity-30 cursor-pointer flex items-center gap-1 shrink-0 shadow-[1px_1px_0px_#000000]"
                  title="Deshacer último trazo"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Deshacer</span>
                </button>
                <button
                  onClick={handleClear}
                  disabled={strokes.length === 0}
                  className="btn-ink-outline px-2 py-1 text-xs font-mono disabled:opacity-30 cursor-pointer flex items-center gap-1 shrink-0 shadow-[1px_1px_0px_#000000]"
                  title="Borrar lienzo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Borrar</span>
                </button>
                <button
                  onClick={() => setShowGuides(!showGuides)}
                  className={`btn-ink-outline px-2 py-1 text-xs font-mono cursor-pointer flex items-center gap-1 shrink-0 shadow-[1px_1px_0px_#000000] ${
                    showGuides ? 'bg-neutral-100' : ''
                  }`}
                  title="Alternar Guías Fantasma"
                >
                  {showGuides ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">Guías</span>
                </button>
                <span className="text-[11px] font-mono text-neutral-600 pl-0.5 font-bold shrink-0">
                  {strokes.length}/{challenge.minRequiredStrokes} trazos
                  {challenge.minRequiredStrokes > 1 && strokes.length < challenge.minRequiredStrokes && (
                    <span className="text-neutral-500 font-normal ml-1 hidden xs:inline">
                      (falta {challenge.minRequiredStrokes - strokes.length})
                    </span>
                  )}
                </span>
              </div>

              {/* Botón Principal de Validación o Siguiente Intento */}
              {challenge.isSingleStrokeAutoEval ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  {evaluation && (
                    <button
                      onClick={handleCopyDebugReport}
                      className="btn-ink-outline p-1.5 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-transform active:scale-95 shadow-[1px_1px_0px_#000000] shrink-0"
                      title="Copiar reporte técnico de depuración"
                    >
                      {copiedDebug ? (
                        <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                      )}
                    </button>
                  )}
                  {evaluation ? (
                    evaluation.phasePassed && currentPhase < 3 ? (
                      <button
                        onClick={() => handlePhaseSelect((currentPhase + 1) as 1 | 2 | 3)}
                        className="btn-ink px-3 sm:px-4 py-1 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 shrink-0 shadow-[2px_2px_0px_#000000]"
                        title={`Avanzar a Fase ${currentPhase + 1} (Espacio / Enter)`}
                      >
                        <span>Fase {currentPhase + 1}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={handleNewRandomChallenge}
                        className="btn-ink px-3 sm:px-4 py-1 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 shrink-0 shadow-[2px_2px_0px_#000000]"
                        title="Siguiente reto procedural (Espacio / Enter)"
                      >
                        <span>{evaluation.phasePassed && currentPhase === 3 ? '¡Dominado! Siguiente' : 'Siguiente (Espacio)'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )
                  ) : (
                    <button
                      onClick={handleNewRandomChallenge}
                      className="btn-ink px-3 sm:px-4 py-1 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 shrink-0 shadow-[2px_2px_0px_#000000]"
                      title="Nuevo reto aleatorio"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Nuevo Reto</span>
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleEvaluate}
                  disabled={strokes.length === 0}
                  className="btn-ink px-3 sm:px-4 py-1 text-xs font-mono font-bold uppercase tracking-wider disabled:opacity-30 cursor-pointer flex items-center gap-1.5 shrink-0 shadow-[2px_2px_0px_#000000]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Evaluar</span>
                </button>
              )}
            </div>
          </div>
        </main>

        {/* ========================================================
            COLUMNA LATERAL DERECHA: TELEMETRÍA Y RESULTADOS MATEMÁTICOS
           ======================================================== */}
        <aside className="w-full flex flex-col gap-2.5 order-3">
          {evaluation ? (
            <div className="border-2 border-black bg-white p-3 shadow-[3px_3px_0px_#000000] flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b-2 border-black">
                <span className="text-xs font-mono font-bold uppercase tracking-wider">
                  Diagnóstico Físico
                </span>
                <span
                  className={`text-xl font-mono font-black border-2 border-black px-2 py-0.5 ${
                    evaluation.passed ? 'bg-black text-white' : 'bg-neutral-100 text-black'
                  }`}
                >
                  {evaluation.overallScore}%
                </span>
              </div>

              {/* Alerta de dirección si trazó al revés (Monocromático) */}
              {evaluation.directionWarning && (
                <div className="bg-neutral-100 border-2 border-black p-2 font-mono text-[11px] text-black font-bold">
                  {evaluation.directionWarning}
                </div>
              )}

              {/* Barras de Desglose Matemático */}
              <div className="flex flex-col gap-2 text-xs font-mono">
                <div>
                  <div className="flex justify-between text-neutral-700 mb-0.5 text-[11px]">
                    <span>{challenge.isSingleStrokeAutoEval ? 'Puntería en Dianas (① y ②)' : 'Paralelismo & Ángulo'}</span>
                    <span className="font-bold">
                      {challenge.isSingleStrokeAutoEval
                        ? `${evaluation.metrics.boundaryScore}%`
                        : `${evaluation.metrics.parallelismScore}%`}
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 h-2 border border-black overflow-hidden">
                    <div
                      className="bg-black h-full transition-all duration-300"
                      style={{
                        width: `${
                          challenge.isSingleStrokeAutoEval
                            ? evaluation.metrics.boundaryScore
                            : evaluation.metrics.parallelismScore
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-neutral-700 mb-0.5 text-[11px]">
                    <span>{challenge.isSingleStrokeAutoEval ? 'Ángulo & Vector' : 'Ritmo & Espaciado'}</span>
                    <span className="font-bold">
                      {challenge.isSingleStrokeAutoEval
                        ? `${evaluation.metrics.parallelismScore}%`
                        : `${evaluation.metrics.spacingScore}%`}
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 h-2 border border-black overflow-hidden">
                    <div
                      className="bg-black h-full transition-all duration-300"
                      style={{
                        width: `${
                          challenge.isSingleStrokeAutoEval
                            ? evaluation.metrics.parallelismScore
                            : evaluation.metrics.spacingScore
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-neutral-700 mb-0.5 text-[11px]">
                    <span>{challenge.category === 'single_stroke_curve' ? 'Fidelidad de Curvatura' : 'Rectitud & Estabilidad'}</span>
                    <span className="font-bold">{evaluation.metrics.straightnessScore}%</span>
                  </div>
                  <div className="w-full bg-neutral-200 h-2 border border-black overflow-hidden">
                    <div
                      className="bg-black h-full transition-all duration-300"
                      style={{ width: `${evaluation.metrics.straightnessScore}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Mensaje Didáctico del Evaluador */}
              <div className="bg-neutral-50 border border-black p-2.5 text-xs font-sans">
                <strong className="block text-black font-display text-xs mb-1">
                  {evaluation.feedbackTitle}
                </strong>
                <p className="text-neutral-700 text-[11px] leading-relaxed mb-1.5">
                  {evaluation.feedbackMessage}
                </p>
                <div className="border-t border-neutral-300 pt-1.5 mt-1 font-mono text-[10px] text-neutral-600">
                  💡 {evaluation.tipMessage}
                </div>
              </div>

              {/* Telemetría Cinemática y Análisis de Derivadas */}
              {evaluation.kinematics && (
                <div className="border-t-2 border-black pt-2 flex flex-col gap-1.5 font-mono text-[11px]">
                  <div className="flex justify-between items-center bg-neutral-100 p-1.5 border border-black">
                    <span className="font-bold flex items-center gap-1 text-[11px]">
                      <Gauge className="w-3.5 h-3.5" />
                      <span>Velocidad Trazo:</span>
                    </span>
                    <span className="font-black">
                      {evaluation.kinematics.avgSpeedPxPerSec} px/s
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div className="border border-neutral-300 p-1 bg-white">
                      <span className="text-neutral-500 block">Tiempo real:</span>
                      <strong className="text-black font-bold">{(evaluation.kinematics.durationMs / 1000).toFixed(2)}s</strong>
                    </div>
                    <div className="border border-neutral-300 p-1 bg-white">
                      <span className="text-neutral-500 block">Índice Fluidez:</span>
                      <strong className="text-black font-bold">{evaluation.kinematics.fluencyScore}%</strong>
                    </div>
                  </div>

                  <div className="text-[10px] text-neutral-700 bg-neutral-50 p-1.5 border border-neutral-200 leading-tight">
                    Tu media en esta dirección: <strong>{evaluation.kinematics.userBaselineSpeedPxPerSec} px/s</strong> (
                    {evaluation.kinematics.speedRatioVsBaseline >= 1 ? '+' : ''}
                    {Math.round((evaluation.kinematics.speedRatioVsBaseline - 1) * 100)}%)
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="border-2 border-black bg-white p-4 shadow-[3px_3px_0px_#000000] text-center">
              <span className="text-xs font-mono font-bold uppercase tracking-wider block mb-1">
                {challenge.isSingleStrokeAutoEval ? `Fase ${currentPhase}: Calistenia Adaptativa` : 'Lienzo en Espera'}
              </span>
              <p className="text-xs text-neutral-600 font-sans leading-relaxed">
                {challenge.isSingleStrokeAutoEval
                  ? currentPhase === 1
                    ? 'Fase 1 (Precisión): Dibuja a tu propio ritmo conectando ① con ② sin preocuparte por el tiempo.'
                    : currentPhase === 2
                    ? 'Fase 2 (Fluidez): Mantén una velocidad constante con el antebrazo sin titubear ni pararte.'
                    : 'Fase 3 (Velocidad): Realiza pasadas en el aire y dispara un trazo rápido y balístico.'
                  : 'Dibuja las líneas en el lienzo blanco y presiona "Evaluar" para obtener el diagnóstico físico.'}
              </p>
            </div>
          )}

          {/* Tarjeta de Perfil Biomecánico Adaptativo del Usuario */}
          {challenge.isSingleStrokeAutoEval && (
            <div className="border-2 border-black bg-white p-3 shadow-[2px_2px_0px_#000000] text-xs">
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-black">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 text-black">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Tu Perfil Biomecánico</span>
                </span>
                <span className="text-[9px] font-mono bg-neutral-100 border border-black px-1 font-bold">
                  Adaptativo
                </span>
              </div>

              {(() => {
                const profile = getUserSpeedProfile();
                const dirs = profile.directions;
                const dList = [
                  { key: 'bottom_up_left_right', label: 'D1 (↗ Asc. Der)', stat: dirs['bottom_up_left_right'] },
                  { key: 'top_down_right_left', label: 'D2 (↙ Desc. Izq)', stat: dirs['top_down_right_left'] },
                  { key: 'top_down_left_right', label: 'D3 (↘ Desc. Der)', stat: dirs['top_down_left_right'] },
                  { key: 'bottom_up_right_left', label: 'D4 (↖ Asc. Izq)', stat: dirs['bottom_up_right_left'] },
                ];
                const insight = getBiomechanicalComparison(profile);

                return (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                      {dList.map((d) => (
                        <div
                          key={d.key}
                          className={`p-1.5 border ${
                            challenge.directionKey === d.key
                              ? 'border-black bg-neutral-100 font-bold shadow-[1px_1px_0px_#000000]'
                              : 'border-neutral-200 bg-neutral-50'
                          }`}
                        >
                          <span className="block text-[9px] text-neutral-600 truncate">{d.label}</span>
                          <span className="text-black font-bold">
                            {d.stat ? `${d.stat.avgSpeedPxPerSec} px/s` : 'Sin datos'}
                          </span>
                        </div>
                      ))}
                    </div>

                    {insight ? (
                      <p className="text-[10px] text-neutral-700 font-sans leading-tight bg-neutral-50 p-1.5 border border-neutral-200">
                        💡 {insight}
                      </p>
                    ) : (
                      <p className="text-[10px] text-neutral-500 font-sans leading-tight">
                        Completa trazos en diferentes ángulos para calcular tus diferencias de velocidad biomecánica.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Tarjeta de Memoria Muscular */}
          <div className="border-2 border-black bg-neutral-100 p-3 shadow-[2px_2px_0px_#000000] text-xs">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider block text-neutral-600 mb-1">
              {challenge.isSingleStrokeAutoEval ? 'Biomecánica del Trazo' : 'Anti-Memoria Muscular'}
            </span>
            <p className="text-[11px] text-neutral-700 font-sans leading-relaxed mb-2">
              {challenge.isSingleStrokeAutoEval
                ? 'El cerebro aprende mediante micro-ajustes por repetición rápida con diana y corrección inmediata.'
                : 'Dibujar siempre el mismo ángulo engaña al cerebro. La aleatoriedad procedural obliga a adaptar el antebrazo.'}
            </p>
            <div className="font-mono text-[10px] bg-white border border-neutral-300 p-2 space-y-1">
              <div>
                <strong>Ángulo:</strong> {Math.round(challenge.targetAngleDeg)}°
              </div>
              <div>
                <strong>Longitud:</strong> {Math.round(challenge.targetLengthPx)}px
              </div>
              <div>
                <strong>Semilla:</strong> #{challenge.seed}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Modal: Visor de Lámina Original o Guía Biomecánica */}
      {showBookModal ? (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="border-4 border-black bg-white max-w-xl w-full p-4 relative shadow-[8px_8px_0px_#000000] flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between pb-2 border-b-2 border-black mb-3">
              <div>
                <h3 className="font-display font-bold text-base text-black">
                  {currentExercise.page
                    ? `Lámina Original · Página ${currentExercise.page}`
                    : `Guía Biomecánica · ${currentExercise.code}`}
                </h3>
                <p className="text-xs font-mono text-neutral-600">
                  {currentExercise.block}
                </p>
              </div>
              <button
                onClick={() => setShowBookModal(false)}
                className="p-1 border border-black hover:bg-neutral-100 cursor-pointer text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto border-2 border-black bg-neutral-100 p-2 flex items-center justify-center">
              {currentExercise.page && !imgError ? (
                <img
                  src={`/extracted_pages/page_${String(currentExercise.page).padStart(2, '0')}.jpg`}
                  alt={`Página ${currentExercise.page}`}
                  onError={() => setImgError(true)}
                  className="max-h-[65vh] object-contain border border-neutral-300 bg-white shadow-sm"
                />
              ) : (
                <div className="max-w-md w-full bg-white border-2 border-black p-4 shadow-[4px_4px_0px_#000000] text-left">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-black">
                    <span className="font-mono font-bold bg-black text-white px-2 py-0.5 text-xs">
                      {currentExercise.code}
                    </span>
                    <span className="font-mono font-bold text-xs uppercase text-neutral-600 truncate">
                      {currentExercise.block}
                    </span>
                  </div>
                  <h4 className="font-display font-bold text-base text-black mb-1">
                    {currentExercise.title}
                  </h4>
                  <p className="text-xs text-neutral-700 font-sans leading-relaxed mb-3">
                    {currentExercise.desc}
                  </p>
                  <div className="bg-neutral-50 border border-black p-2.5 font-mono text-[11px] space-y-1.5">
                    <div>
                      <strong className="text-black uppercase">Instrucción:</strong>{' '}
                      <span className="text-neutral-800">{currentExercise.instruction}</span>
                    </div>
                    <div>
                      <strong className="text-black uppercase">Métricas evaluadas:</strong>{' '}
                      <span className="text-neutral-800">{currentExercise.metrics}</span>
                    </div>
                    <div>
                      <strong className="text-black uppercase">Dificultad:</strong>{' '}
                      <span className="text-neutral-800">{currentExercise.difficulty}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 text-xs font-mono flex justify-between items-center">
              <span className="truncate max-w-[340px]">
                {currentExercise.code} · {currentExercise.title}
              </span>
              <button
                onClick={() => setShowBookModal(false)}
                className="btn-ink px-4 py-1.5 text-xs font-mono uppercase font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
