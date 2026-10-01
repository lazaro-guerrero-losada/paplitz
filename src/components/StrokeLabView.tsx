import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StrokeExerciseCategory,
  RawStroke,
  PointWithMeta,
  ProceduralStrokeChallenge,
  StrokeEvaluation,
} from '../lib/strokeTypes';
import { generateStrokeChallenge } from '../lib/strokeProceduralGenerator';
import { evaluateStrokeSubmission } from '../lib/strokeEvaluator';
import { SenseiCubo } from './avatar/SenseiCubo';
import { AvatarMood } from '../lib/avatarTypes';
import {
  Dices,
  Eye,
  EyeOff,
  RotateCcw,
  Undo2,
  CheckCircle2,
  BookOpen,
  X,
  Sparkles,
  Layers,
  Compass,
  Spline,
  Sun,
  Flame,
  Info,
} from 'lucide-react';

interface StrokeLabViewProps {
  onAwardXP?: (amount: number) => void;
  onAvatarMoodChange?: (mood: AvatarMood) => void;
}

const EXERCISE_CATEGORIES: {
  id: StrokeExerciseCategory;
  name: string;
  icon: any;
  bookPage: number;
}[] = [
  { id: 'parallel_lines', name: 'Líneas & Espaciado', icon: Compass, bookPage: 1 },
  { id: 'curved_s_waves', name: 'Curvas S & Arcos', icon: Spline, bookPage: 5 },
  { id: 'cross_hatch_density', name: 'Tramas & Densidad', icon: Layers, bookPage: 9 },
  { id: 'cross_contour_blob', name: 'Contornos Cruzados', icon: Sparkles, bookPage: 15 },
  { id: 'polyhedron_shading', name: 'Sombreado 3D & Sol', icon: Sun, bookPage: 25 },
];

export const StrokeLabView: React.FC<StrokeLabViewProps> = ({
  onAwardXP,
  onAvatarMoodChange,
}) => {
  const [selectedCategory, setSelectedCategory] =
    useState<StrokeExerciseCategory>('parallel_lines');
  const [challengeSeed, setChallengeSeed] = useState<number>(() =>
    Math.floor(Math.random() * 90000 + 10000)
  );
  const [challenge, setChallenge] = useState<ProceduralStrokeChallenge>(() =>
    generateStrokeChallenge('parallel_lines', challengeSeed)
  );

  const [strokes, setStrokes] = useState<RawStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<PointWithMeta[] | null>(null);
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [evaluation, setEvaluation] = useState<StrokeEvaluation | null>(null);
  const [showBookModal, setShowBookModal] = useState<boolean>(false);
  const [avatarMood, setAvatarMood] = useState<AvatarMood>('neutral');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Regenerar reto procedural
  const handleGenerateRandomChallenge = useCallback(() => {
    const newSeed = Math.floor(Math.random() * 90000 + 10000);
    setChallengeSeed(newSeed);
    const newChallenge = generateStrokeChallenge(selectedCategory, newSeed);
    setChallenge(newChallenge);
    setStrokes([]);
    setCurrentStroke(null);
    setEvaluation(null);
    setAvatarMood('neutral');
  }, [selectedCategory]);

  // Cambiar categoría de ejercicio
  const handleSelectCategory = (cat: StrokeExerciseCategory) => {
    setSelectedCategory(cat);
    const newSeed = Math.floor(Math.random() * 90000 + 10000);
    setChallengeSeed(newSeed);
    const newChallenge = generateStrokeChallenge(cat, newSeed);
    setChallenge(newChallenge);
    setStrokes([]);
    setCurrentStroke(null);
    setEvaluation(null);
    setAvatarMood('neutral');
  };

  // Ajustar dimensiones del canvas solo al montar y redimensionar
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.floor(Math.min(rect.width, 680));
      const h = 500;

      if (canvasRef.current.width !== w * dpr || canvasRef.current.height !== h * dpr) {
        canvasRef.current.width = w * dpr;
        canvasRef.current.height = h * dpr;
        canvasRef.current.style.width = `${w}px`;
        canvasRef.current.style.height = `${h}px`;
      }
      renderCanvas();
    };

    handleResize();
    const ro = new ResizeObserver(handleResize);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', handleResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Renderizado gráfico del lienzo
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // Fondo papel técnico suave
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Patrón sutil de cuadrícula de dibujo
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridStep = 24;
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

    // 1. Dibujar geometrías base del reto
    if (challenge.guideBounds) {
      const b = challenge.guideBounds;
      ctx.fillStyle = 'rgba(245, 158, 11, 0.05)';
      ctx.fillRect(b.x, b.y, b.width, b.height);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(b.x, b.y, b.width, b.height);
    }

    // Dibujar Blob Orgánico
    if (challenge.blobShape) {
      const pts = challenge.blobShape.splinePoints;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.06)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dibujar eje rector interior
      const ax = challenge.blobShape.axisLine;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(ax.x1, ax.y1);
      ctx.lineTo(ax.x2, ax.y2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Puntero de flecha en el eje
      const angle = Math.atan2(ax.y2 - ax.y1, ax.x2 - ax.x1);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(ax.x2, ax.y2);
      ctx.lineTo(ax.x2 - 12 * Math.cos(angle - 0.4), ax.y2 - 12 * Math.sin(angle - 0.4));
      ctx.lineTo(ax.x2 - 12 * Math.cos(angle + 0.4), ax.y2 - 12 * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fill();
    }

    // Dibujar Sólido Poliédrico 3D
    if (challenge.polySolid) {
      const { sunPosition, faces } = challenge.polySolid;

      // Sol ☀️
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(sunPosition.x, sunPosition.y, 16, 0, Math.PI * 2);
      ctx.fill();

      // Rayos solares
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const rad = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(sunPosition.x + Math.cos(rad) * 20, sunPosition.y + Math.sin(rad) * 20);
        ctx.lineTo(sunPosition.x + Math.cos(rad) * 30, sunPosition.y + Math.sin(rad) * 30);
        ctx.stroke();
      }

      // Dibujar caras del poliedro en alambre
      faces.forEach((f) => {
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(30, 41, 59, 0.5)';
        ctx.beginPath();
        ctx.moveTo(f.vertices[0].x, f.vertices[0].y);
        for (let i = 1; i < f.vertices.length; i++) {
          ctx.lineTo(f.vertices[i].x, f.vertices[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Número de guía de valor tonal en el centroide
        let cx = 0;
        let cy = 0;
        for (const v of f.vertices) {
          cx += v.x;
          cy += v.y;
        }
        cx /= f.vertices.length;
        cy /= f.vertices.length;

        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 14px ui-monospace, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Valor ${f.targetValueLevel}`, cx, cy);
      });
    }

    // Dibujar Curva S generatriz si existe
    if (challenge.waveParams && showGuides) {
      const wp = challenge.waveParams;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      for (let x = wp.startPoint.x; x <= wp.endPoint.x; x += 4) {
        const y = wp.startPoint.y + wp.amplitude * Math.sin(((x - wp.startPoint.x) / wp.wavelength) * Math.PI * 2 + wp.phase);
        if (x === wp.startPoint.x) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 2. Guías visuales (líneas de cota/carril)
    if (showGuides && challenge.guideLines) {
      for (const line of challenge.guideLines) {
        ctx.strokeStyle = line.dashed ? 'rgba(245, 158, 11, 0.45)' : 'rgba(245, 158, 11, 0.8)';
        ctx.lineWidth = 1.5;
        if (line.dashed) ctx.setLineDash([6, 6]);
        else ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 3. Dibujar todos los trazos confirmados del usuario
    const allStrokes = currentStroke ? [...strokes, { points: currentStroke }] : strokes;

    ctx.strokeStyle = '#f8fafc';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of allStrokes) {
      if (stroke.points.length === 0) continue;
      const pts = stroke.points;

      if (pts.length === 1) {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, 1.5, 0, Math.PI * 2);
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
      ctx.lineWidth = lastP.pressure > 0 ? 1.5 + lastP.pressure * 2.0 : 2.2;
      ctx.stroke();
    }

    ctx.restore();
  }, [challenge, strokes, currentStroke, showGuides]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Manejadores de captura PointerEvents
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = getCanvasCoords(e);
    const pressure = e.pressure || 0.5;
    setCurrentStroke([{ x, y, pressure, time: performance.now() }]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!currentStroke) return;
    const { x, y } = getCanvasCoords(e);
    const pressure = e.pressure || 0.5;
    setCurrentStroke((prev) =>
      prev ? [...prev, { x, y, pressure, time: performance.now() }] : null
    );
  };

  const handlePointerUp = () => {
    if (currentStroke && currentStroke.length >= 2) {
      setStrokes((prev) => [...prev, { points: currentStroke }]);
    }
    setCurrentStroke(null);
  };

  const handlePointerCancel = () => {
    setCurrentStroke(null);
  };

  // Botón: Deshacer último trazo
  const handleUndo = () => {
    if (strokes.length === 0) return;
    setStrokes((prev) => prev.slice(0, -1));
    setEvaluation(null);
  };

  // Botón: Limpiar lienzo
  const handleClear = () => {
    setStrokes([]);
    setCurrentStroke(null);
    setEvaluation(null);
  };

  // Botón: Evaluar Trazos
  const handleEvaluate = () => {
    const result = evaluateStrokeSubmission(strokes, challenge);
    setEvaluation(result);
    setAvatarMood(result.avatarMood);
    if (onAvatarMoodChange) {
      onAvatarMoodChange(result.avatarMood);
    }
    if (result.passed && onAwardXP) {
      onAwardXP(30);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto p-4 md:p-6 text-slate-100">
      {/* Columna Izquierda: Lienzo de Dibujo & Selector */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Selector de Ejercicios */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {EXERCISE_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleSelectCategory(cat.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-black/20 text-black' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  P.{cat.bookPage}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tarjeta del Reto Activo */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Reto Procedural
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                Semilla #{challenge.seed}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">{challenge.title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{challenge.subtitle}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowBookModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-all"
              title="Ver lámina original del libro"
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              <span>Ver Lámina</span>
            </button>

            <button
              onClick={handleGenerateRandomChallenge}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95"
              title="Genera un reto con nuevos ángulos y medidas para romper el patrón muscular"
            >
              <Dices className="w-4 h-4" />
              <span>Nuevo Reto Aleatorio</span>
            </button>
          </div>
        </div>

        {/* Instrucción del Nivel */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="text-slate-200 font-semibold">{challenge.instruction}</span>
            <div className="text-[11px] text-amber-400/90 font-mono mt-1">
              🎯 Objetivo: {challenge.targetMetricsText}
            </div>
          </div>
        </div>

        {/* Contenedor del Canvas de Dibujo */}
        <div
          ref={containerRef}
          className="relative bg-slate-950 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center min-h-[460px]"
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            className="touch-none cursor-crosshair select-none"
          />

          {/* Barra Flotante de Herramientas del Canvas */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1.5 rounded-xl shadow-lg">
            <button
              onClick={() => setShowGuides(!showGuides)}
              className={`p-2 rounded-lg text-xs transition-colors ${
                showGuides ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-white'
              }`}
              title="Alternar Guías Visuales"
            >
              {showGuides ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            <button
              onClick={handleUndo}
              disabled={strokes.length === 0}
              className="p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded-lg transition-colors"
              title="Deshacer Último Trazo"
            >
              <Undo2 className="w-4 h-4" />
            </button>

            <button
              onClick={handleClear}
              disabled={strokes.length === 0}
              className="p-2 text-slate-400 hover:text-red-400 disabled:opacity-30 disabled:hover:text-slate-400 rounded-lg transition-colors"
              title="Limpiar Todo"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Contador de trazos flotante */}
          <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm border border-slate-800 px-2.5 py-1 rounded-lg text-[11px] font-mono text-slate-400">
            Trazos: <strong className="text-amber-400">{strokes.length}</strong> / mín. {challenge.minRequiredStrokes}
          </div>
        </div>

        {/* Botón de Evaluación Principal */}
        <button
          onClick={handleEvaluate}
          disabled={strokes.length === 0}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 disabled:hover:from-emerald-500 text-slate-950 font-black text-sm tracking-wide rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>EVALUAR TRAZOS & PULSO MATEMÁTICO</span>
        </button>
      </div>

      {/* Columna Derecha: Tarjeta de Diagnóstico y Feedback */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        {/* Avatar Sensei Cubo */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-xl">
          <div className="w-16 h-16 shrink-0">
            <SenseiCubo mood={avatarMood} size={64} />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Sensei Cubo
            </div>
            <div className="text-sm font-semibold text-white">
              {evaluation ? evaluation.feedbackTitle : '¡A dibujar!'}
            </div>
            <div className="text-xs text-slate-400 line-clamp-2 mt-0.5">
              {evaluation ? evaluation.tipMessage : 'Sigue la cadencia del ejercicio sin titubear.'}
            </div>
          </div>
        </div>

        {/* Panel de Puntuación */}
        {evaluation ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Puntuación Global
              </span>
              <span
                className={`text-2xl font-black ${
                  evaluation.overallScore >= 75
                    ? 'text-emerald-400'
                    : evaluation.overallScore >= 50
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {evaluation.overallScore}%
              </span>
            </div>

            {/* Barras de Métricas Desglosadas */}
            <div className="flex flex-col gap-2.5 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Paralelismo & Ángulo</span>
                  <span className="font-mono text-amber-400">
                    {evaluation.metrics.parallelismScore}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${evaluation.metrics.parallelismScore}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Ritmo & Espaciado</span>
                  <span className="font-mono text-sky-400">
                    {evaluation.metrics.spacingScore}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${evaluation.metrics.spacingScore}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Rectitud / Firmeza</span>
                  <span className="font-mono text-emerald-400">
                    {evaluation.metrics.straightnessScore}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${evaluation.metrics.straightnessScore}%` }}
                  />
                </div>
              </div>

              {challenge.category === 'cross_hatch_density' || challenge.category === 'polyhedron_shading' ? (
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Fidelidad de Densidad Óptica</span>
                    <span className="font-mono text-purple-400">
                      {evaluation.metrics.tonalDensityScore}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${evaluation.metrics.tonalDensityScore}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Estadísticas de Medición Física */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono flex flex-col gap-1.5 text-slate-400">
              <div className="text-amber-400 font-bold uppercase text-[10px]">
                Telemetría Capturada
              </div>
              <div className="flex justify-between">
                <span>Trazos detectados:</span>
                <span className="text-slate-200">{evaluation.detectedStats.strokeCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Paso medio medido:</span>
                <span className="text-slate-200">{evaluation.detectedStats.measuredAvgSpacingPx} px</span>
              </div>
              <div className="flex justify-between">
                <span>Dispersión de espaciado:</span>
                <span className="text-slate-200">±{evaluation.detectedStats.spacingVariance} px</span>
              </div>
              <div className="flex justify-between">
                <span>Ángulo medio resultante:</span>
                <span className="text-slate-200">{evaluation.detectedStats.measuredAvgAngleDeg}°</span>
              </div>
              {evaluation.detectedStats.measuredOpticalDensityPct > 0 ? (
                <div className="flex justify-between">
                  <span>Densidad óptica calculada:</span>
                  <span className="text-purple-300">{evaluation.detectedStats.measuredOpticalDensityPct}%</span>
                </div>
              ) : null}
            </div>

            {/* Diagnóstico Pedagógico */}
            <div className="text-xs text-slate-300 leading-relaxed bg-slate-800/40 p-3 rounded-xl border border-slate-800">
              {evaluation.feedbackMessage}
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-center text-xs text-slate-400 flex flex-col items-center justify-center min-h-[220px]">
            <Sparkles className="w-8 h-8 text-slate-600 mb-2" />
            <span className="font-semibold text-slate-300 mb-1">Esperando tus trazos...</span>
            <p className="max-w-[200px]">
              Dibuja las líneas en el lienzo y pulsa "Evaluar Trazos" para ver el análisis de pulso y ritmo en tiempo real.
            </p>
          </div>
        )}

        {/* Guía Rápida de la Filosofía Anti-Memoria Muscular */}
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-4 text-xs text-amber-200/90 leading-relaxed">
          <div className="font-bold text-amber-400 flex items-center gap-1.5 mb-1.5">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Anti-Memoria Muscular</span>
          </div>
          Al igual que los cubos 3D de Paplitz cambian de ángulo de fuga en cada nivel, cada vez que pulsas{' '}
          <strong>"Nuevo Reto Aleatorio"</strong> el simulador recalcula el ángulo, longitud y paso diana. Así entrenas propiocepción y no un reflejo mecánico.
        </div>
      </div>

      {/* Modal de Referencia del Libro Original */}
      {showBookModal ? (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-5 relative shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div>
                <h3 className="font-bold text-white text-base">Lámina Original del Cuaderno</h3>
                <p className="text-xs text-slate-400">
                  Página {challenge.workbookPage} de 42 — Pen & Ink Drawing
                </p>
              </div>
              <button
                onClick={() => setShowBookModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-xl bg-white p-2 flex items-center justify-center">
              <img
                src={`/extracted_pages/page_${String(challenge.workbookPage).padStart(2, '0')}.jpg`}
                alt={`Página ${challenge.workbookPage}`}
                className="max-h-[65vh] object-contain"
              />
            </div>

            <div className="pt-3 text-xs text-slate-400 flex justify-between items-center">
              <span>Ejercicio: {challenge.title}</span>
              <button
                onClick={() => setShowBookModal(false)}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors text-xs"
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
