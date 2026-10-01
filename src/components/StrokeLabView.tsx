import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ALL_42_EXERCISES,
  WorkbookExerciseDef,
  RawStroke,
  PointWithMeta,
  ProceduralStrokeChallenge,
  StrokeEvaluation,
} from '../lib/strokeTypes';
import { generateStrokeChallenge } from '../lib/strokeProceduralGenerator';
import { evaluateStrokeSubmission } from '../lib/strokeEvaluator';
import {
  Dices,
  Eye,
  EyeOff,
  Undo2,
  Trash2,
  CheckCircle2,
  BookOpen,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Layers,
  Flame,
  Info,
} from 'lucide-react';

interface StrokeLabViewProps {
  onAwardXP?: (amount: number) => void;
  onAvatarMoodChange?: (mood: any) => void;
}

// Agrupación de las 42 páginas en los 8 bloques temáticos
const BLOCKS_LIST = [
  'Todos los Bloques (42 Páginas)',
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
  // Filtro de bloque y ejercicio seleccionado (1 a 42)
  const [selectedBlock, setSelectedBlock] = useState<string>('Todos los Bloques (42 Páginas)');
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState<number>(0);
  const currentExercise = ALL_42_EXERCISES[currentExerciseIndex] || ALL_42_EXERCISES[0];

  // Reto procedural generado con semilla
  const [challengeSeed, setChallengeSeed] = useState<number>(() =>
    Math.floor(Math.random() * 90000 + 10000)
  );
  const [challenge, setChallenge] = useState<ProceduralStrokeChallenge>(() =>
    generateStrokeChallenge(currentExercise, challengeSeed, 600, 540)
  );

  // Estado del dibujo del usuario
  const [strokes, setStrokes] = useState<RawStroke[]>([]);
  const currentStrokeRef = useRef<PointWithMeta[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const activePointerIdRef = useRef<number | null>(null);

  // Visibilidad de guías, evaluación y modal
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [evaluation, setEvaluation] = useState<StrokeEvaluation | null>(null);
  const [showBookModal, setShowBookModal] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Filtrado de ejercicios por bloque
  const filteredExercises =
    selectedBlock === 'Todos los Bloques (42 Páginas)'
      ? ALL_42_EXERCISES
      : ALL_42_EXERCISES.filter((e) => e.block === selectedBlock);

  // Regenerar reto procedural con nueva semilla
  const handleNewRandomChallenge = useCallback(() => {
    const newSeed = Math.floor(Math.random() * 90000 + 10000);
    setChallengeSeed(newSeed);
    const newChallenge = generateStrokeChallenge(currentExercise, newSeed, 600, 540);
    setChallenge(newChallenge);
    setStrokes([]);
    currentStrokeRef.current = [];
    setIsDrawing(false);
    setEvaluation(null);
  }, [currentExercise]);

  // Cambiar de ejercicio por índice en la lista general
  const handleSelectExercise = (exercise: WorkbookExerciseDef) => {
    const idx = ALL_42_EXERCISES.findIndex((e) => e.page === exercise.page);
    if (idx !== -1) {
      setCurrentExerciseIndex(idx);
      const newSeed = Math.floor(Math.random() * 90000 + 10000);
      setChallengeSeed(newSeed);
      const newChallenge = generateStrokeChallenge(exercise, newSeed, 600, 540);
      setChallenge(newChallenge);
      setStrokes([]);
      currentStrokeRef.current = [];
      setIsDrawing(false);
      setEvaluation(null);
    }
  };

  // Navegar al ejercicio anterior / siguiente
  const handlePrevExercise = () => {
    if (currentExerciseIndex > 0) {
      handleSelectExercise(ALL_42_EXERCISES[currentExerciseIndex - 1]);
    }
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < ALL_42_EXERCISES.length - 1) {
      handleSelectExercise(ALL_42_EXERCISES[currentExerciseIndex + 1]);
    }
  };

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

      // Varilla o eje rector interior con punta de flecha
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

      // Sol ☀️ estilo técnico entintado
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(sunPosition.x, sunPosition.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rayos del sol
      for (let i = 0; i < 8; i++) {
        const rad = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(sunPosition.x + Math.cos(rad) * 17, sunPosition.y + Math.sin(rad) * 17);
        ctx.lineTo(sunPosition.x + Math.cos(rad) * 26, sunPosition.y + Math.sin(rad) * 26);
        ctx.stroke();
      }

      // Caras del prisma en alambre
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

        // Número de guía de valor tonal en el centroide
        if (showGuides) {
          let cx = 0;
          let cy = 0;
          for (const v of f.vertices) {
            cx += v.x;
            cy += v.y;
          }
          cx /= f.vertices.length;
          cy /= f.vertices.length;

          ctx.fillStyle = '#000000';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`Valor ${f.targetValueLevel}`, cx, cy);
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
          let cx = 0;
          let cy = 0;
          for (const v of rf.vertices) {
            cx += v.x;
            cy += v.y;
          }
          cx /= rf.vertices.length;
          cy /= rf.vertices.length;

          ctx.fillStyle = '#666666';
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${rf.targetAngleDeg}°`, cx, cy);
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

    // 4. Dibujar los trazos entintados del usuario con suavizado Bézier
    const allStrokes = isDrawing && currentStrokeRef.current.length > 0
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

    ctx.restore();
  }, [challenge, strokes, isDrawing, showGuides]);

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
            COLUMNA LATERAL IZQUIERDA: SELECTOR Y NAVEGADOR DE 42 PÁGINAS
           ======================================================== */}
        <aside className="w-full flex flex-col gap-2.5 order-2 lg:order-1">
          {/* Tarjeta de Control y Navegación de Ejercicios */}
          <div className="border-2 border-black bg-white p-3 shadow-[3px_3px_0px_#000000]">
            <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-black">
              <span className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 stroke-[2.5]" />
                <span>Cuaderno (42 Ejercicios)</span>
              </span>
              <span className="text-[10px] font-mono bg-black text-white px-1.5 py-0.5 font-bold">
                {currentExercise.page} / 42
              </span>
            </div>

            {/* 1. Selector de Bloque */}
            <div className="mb-2">
              <label className="text-[10px] font-mono uppercase font-bold text-neutral-600 block mb-1">
                Filtrar por Bloque:
              </label>
              <select
                value={selectedBlock}
                onChange={(e) => setSelectedBlock(e.target.value)}
                className="w-full border-2 border-black px-2 py-1 text-xs font-mono font-bold bg-white shadow-[2px_2px_0px_#000000] cursor-pointer"
              >
                {BLOCKS_LIST.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Selector Desplegable de los 42 Ejercicios */}
            <div className="mb-2.5">
              <label className="text-[10px] font-mono uppercase font-bold text-neutral-600 block mb-1">
                Seleccionar Ejercicio:
              </label>
              <select
                value={currentExercise.page}
                onChange={(e) => {
                  const p = parseInt(e.target.value, 10);
                  const ex = ALL_42_EXERCISES.find((item) => item.page === p);
                  if (ex) handleSelectExercise(ex);
                }}
                className="w-full border-2 border-black px-2 py-1 text-xs font-mono font-bold bg-white shadow-[2px_2px_0px_#000000] cursor-pointer truncate"
              >
                {filteredExercises.map((ex) => (
                  <option key={ex.page} value={ex.page}>
                    P.{String(ex.page).padStart(2, '0')} · {ex.code} {ex.title}
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
                title="Página Anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
              <button
                onClick={handleNextExercise}
                disabled={currentExerciseIndex === ALL_42_EXERCISES.length - 1}
                className="btn-ink-outline flex-1 py-1 text-xs font-mono flex items-center justify-center gap-1 disabled:opacity-30 cursor-pointer"
                title="Página Siguiente"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 4. Botón Ver Lámina Original del Libro */}
            <button
              onClick={() => setShowBookModal(true)}
              className="btn-ink-outline w-full py-1.5 text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
            >
              <BookOpen className="w-4 h-4 text-black" />
              <span>Ver Lámina Original (P.{currentExercise.page})</span>
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
                  P.{currentExercise.page}
                </span>
                <span className="font-display font-bold text-xs truncate">
                  {challenge.title}
                </span>
              </div>

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
                </span>
              </div>

              {/* Botón Principal de Validación */}
              <button
                onClick={handleEvaluate}
                disabled={strokes.length === 0}
                className="btn-ink px-3 sm:px-4 py-1 text-xs font-mono font-bold uppercase tracking-wider disabled:opacity-30 cursor-pointer flex items-center gap-1.5 shrink-0 shadow-[2px_2px_0px_#000000]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Evaluar</span>
              </button>
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

              {/* Barras de Desglose Matemático */}
              <div className="flex flex-col gap-2 text-xs font-mono">
                <div>
                  <div className="flex justify-between text-neutral-700 mb-0.5 text-[11px]">
                    <span>Paralelismo & Ángulo</span>
                    <span className="font-bold">{evaluation.metrics.parallelismScore}%</span>
                  </div>
                  <div className="w-full bg-neutral-200 h-2 border border-black overflow-hidden">
                    <div
                      className="bg-black h-full transition-all duration-300"
                      style={{ width: `${evaluation.metrics.parallelismScore}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-neutral-700 mb-0.5 text-[11px]">
                    <span>Ritmo & Espaciado</span>
                    <span className="font-bold">{evaluation.metrics.spacingScore}%</span>
                  </div>
                  <div className="w-full bg-neutral-200 h-2 border border-black overflow-hidden">
                    <div
                      className="bg-black h-full transition-all duration-300"
                      style={{ width: `${evaluation.metrics.spacingScore}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-neutral-700 mb-0.5 text-[11px]">
                    <span>Rectitud / Firmeza</span>
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

              {/* Telemetría Numérica */}
              <div className="bg-neutral-50 border border-black p-2.5 font-mono text-[11px] flex flex-col gap-1 text-neutral-700">
                <div className="flex justify-between">
                  <span>Trazos registrados:</span>
                  <strong className="text-black">{evaluation.detectedStats.strokeCount}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Paso medio:</span>
                  <strong className="text-black">{evaluation.detectedStats.measuredAvgSpacingPx} px</strong>
                </div>
                <div className="flex justify-between">
                  <span>Dispersión paso (σ):</span>
                  <strong className="text-black">±{evaluation.detectedStats.spacingVariance} px</strong>
                </div>
                <div className="flex justify-between">
                  <span>Ángulo medio:</span>
                  <strong className="text-black">{evaluation.detectedStats.measuredAvgAngleDeg}°</strong>
                </div>
              </div>

              {/* Mensaje Didáctico */}
              <div className="text-xs font-sans text-neutral-800 leading-relaxed bg-neutral-100 p-2 border border-neutral-300">
                <strong className="block text-black font-mono uppercase text-[10px] mb-0.5">
                  {evaluation.feedbackTitle}
                </strong>
                {evaluation.feedbackMessage}
              </div>
            </div>
          ) : (
            <div className="border-2 border-black bg-white p-4 shadow-[2px_2px_0px_#000000] text-center text-xs text-neutral-500 flex flex-col items-center justify-center min-h-[200px]">
              <Sparkles className="w-6 h-6 text-neutral-400 mb-1.5" />
              <span className="font-mono font-bold text-black uppercase text-xs mb-1">
                Lienzo en Espera
              </span>
              <p className="text-[11px] font-sans text-neutral-600 max-w-[210px] leading-relaxed">
                Traza las líneas según las guías y pulsa "Evaluar" para ver la telemetría en tiempo real.
              </p>
            </div>
          )}

          {/* Tarjeta Didáctica: Anti-Memoria Muscular */}
          <div className="border border-black bg-neutral-100 p-3 text-xs leading-relaxed shadow-[1px_1px_0px_#000000]">
            <div className="font-mono font-bold uppercase text-[11px] flex items-center gap-1.5 mb-1 text-black">
              <Flame className="w-3.5 h-3.5 text-black" />
              <span>Anti-Memoria Muscular</span>
            </div>
            <p className="text-[11px] font-sans text-neutral-700 leading-normal">
              Al igual que las cajas de Paplitz rotan sus puntos de fuga, pulsa{' '}
              <strong>"Nuevo Reto"</strong> para variar ángulos e intervalos y forzar la adaptación del trazo libre.
            </p>
          </div>
        </aside>
      </div>

      {/* Modal: Visor de Lámina Original del Libro */}
      {showBookModal ? (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="border-4 border-black bg-white max-w-xl w-full p-4 relative shadow-[8px_8px_0px_#000000] flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between pb-2 border-b-2 border-black mb-3">
              <div>
                <h3 className="font-display font-bold text-base text-black">
                  Lámina Original del Cuaderno
                </h3>
                <p className="text-xs font-mono text-neutral-600">
                  Página {currentExercise.page} de 42 — Pen & Ink Drawing Workbook
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
              <img
                src={`/extracted_pages/page_${String(currentExercise.page).padStart(2, '0')}.jpg`}
                alt={`Página ${currentExercise.page}`}
                className="max-h-[65vh] object-contain border border-neutral-300 bg-white"
              />
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
