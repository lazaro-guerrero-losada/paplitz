import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Ghost,
  Flame,
  Heart,
  Trophy,
  RotateCcw,
  Check,
  AlertTriangle,
  Undo2,
} from 'lucide-react';
import { AvatarMood } from '../lib/avatarTypes';

export interface GhostLineMinigameProps {
  onExit: () => void;
  onAwardXP: (amount: number) => void;
  onAvatarMoodChange?: (mood: AvatarMood) => void;
  onDrawingStateChange?: (isDrawing: boolean) => void;
}

interface Point {
  x: number;
  y: number;
  pressure?: number;
}

interface GhostEvaluation {
  score: number;
  proximityScore: number;
  lengthScore: number;
  avgDistPx: number;
  maxDistPx: number;
  isReversed: boolean;
  passed: boolean;
  perfect: boolean;
  title: string;
  message: string;
}

// Cálculo de longitud acumulada de una polilínea
function getPolylineLength(pts: Point[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return len;
}

// Remuestreo uniforme de una polilínea a N puntos equidistantes
function resampleCurve(pts: Point[], targetCount = 50): Point[] {
  if (pts.length === 0) return [];
  if (pts.length === 1) return Array(targetCount).fill(pts[0]);
  const totalLen = getPolylineLength(pts);
  if (totalLen <= 0) return Array(targetCount).fill(pts[0]);

  const step = totalLen / (targetCount - 1);
  const result: Point[] = [{ x: pts[0].x, y: pts[0].y, pressure: pts[0].pressure }];

  let currentSegIdx = 0;
  let segStartDist = 0;

  for (let i = 1; i < targetCount - 1; i++) {
    const targetDist = i * step;
    while (currentSegIdx < pts.length - 1) {
      const pA = pts[currentSegIdx];
      const pB = pts[currentSegIdx + 1];
      const segLen = Math.hypot(pB.x - pA.x, pB.y - pA.y);
      if (segStartDist + segLen >= targetDist) {
        const t = segLen > 0 ? (targetDist - segStartDist) / segLen : 0;
        result.push({
          x: pA.x + (pB.x - pA.x) * t,
          y: pA.y + (pB.y - pA.y) * t,
          pressure: (pA.pressure ?? 0.5) * (1 - t) + (pB.pressure ?? 0.5) * t,
        });
        break;
      } else {
        segStartDist += segLen;
        currentSegIdx++;
      }
    }
  }
  const last = pts[pts.length - 1];
  result.push({ x: last.x, y: last.y, pressure: last.pressure });
  return result;
}

// Evaluación de similitud entre el trazo del usuario y el fantasma
function evaluateGhostStroke(userPts: Point[], ghostPts: Point[]): GhostEvaluation {
  if (userPts.length < 2 || ghostPts.length < 2) {
    return {
      score: 0,
      proximityScore: 0,
      lengthScore: 0,
      avgDistPx: 999,
      maxDistPx: 999,
      isReversed: false,
      passed: false,
      perfect: false,
      title: 'Trazo demasiado corto',
      message: 'Intenta recorrer la línea completa del fantasma.',
    };
  }

  const N = 50;
  const sampledUser = resampleCurve(userPts, N);
  const sampledGhost = resampleCurve(ghostPts, N);

  // Distancia directa
  let sumDistFwd = 0;
  let maxDistFwd = 0;
  for (let i = 0; i < N; i++) {
    const d = Math.hypot(sampledUser[i].x - sampledGhost[i].x, sampledUser[i].y - sampledGhost[i].y);
    sumDistFwd += d;
    if (d > maxDistFwd) maxDistFwd = d;
  }
  const avgDistFwd = sumDistFwd / N;

  // Distancia invertida
  let sumDistRev = 0;
  for (let i = 0; i < N; i++) {
    const d = Math.hypot(sampledUser[i].x - sampledGhost[N - 1 - i].x, sampledUser[i].y - sampledGhost[N - 1 - i].y);
    sumDistRev += d;
  }
  const avgDistRev = sumDistRev / N;

  const isReversed = avgDistRev < avgDistFwd * 0.72;
  const effectiveAvgDist = isReversed ? avgDistRev : avgDistFwd;

  // 1. Proximidad de trayectoria: caída suave calibrada (18px de tolerancia)
  const proximityScore = Math.max(0, Math.min(100, Math.round(100 * Math.exp(-effectiveAvgDist / 18))));

  // 2. Coincidencia de longitud
  const uLen = getPolylineLength(userPts);
  const gLen = getPolylineLength(ghostPts);
  const lenRatio = Math.min(uLen, gLen) / Math.max(uLen, gLen, 1);
  const lengthScore = Math.round(lenRatio * 100);

  // Puntuación combinada (70% proximidad de ruta + 30% longitud)
  let rawScore = Math.round(proximityScore * 0.7 + lengthScore * 0.3);
  if (isReversed) {
    rawScore = Math.max(0, rawScore - 12); // Penalización por dirección invertida
  }

  const passed = rawScore >= 75;
  const perfect = rawScore >= 90;

  let title = 'Desincronizado';
  let message = `Desviación media: ${Math.round(effectiveAvgDist)}px. Intenta seguir el camino del fantasma con más calma.`;

  if (isReversed) {
    title = '¡Dirección invertida!';
    message = 'Has recorrido la forma al revés. Traza desde el punto ① hacia el punto ②.';
  } else if (perfect) {
    title = '¡Sincronía Fantasma Perfecta! 👻';
    message = `Calco milimétrico (${Math.round(effectiveAvgDist)}px de error). Memoria muscular sobresaliente.`;
  } else if (passed) {
    title = '¡En Sincronía con el Fantasma!';
    message = `Muy buen trazo (${Math.round(effectiveAvgDist)}px de error). Mantén la fluidez de muñeca.`;
  }

  return {
    score: rawScore,
    proximityScore,
    lengthScore,
    avgDistPx: Math.round(effectiveAvgDist * 10) / 10,
    maxDistPx: Math.round(maxDistFwd * 10) / 10,
    isReversed,
    passed,
    perfect,
    title,
    message,
  };
}

// Plantillas predeterminadas de trazos
type GhostPreset = 'custom' | 'horizontal' | 'diagonal' | 'arc_c' | 'wave_s' | 'chevron';

function generatePresetGhost(type: GhostPreset): Point[] {
  const pts: Point[] = [];
  const H = 540;

  if (type === 'horizontal') {
    const y = H * 0.5;
    for (let x = 100; x <= 500; x += 10) {
      pts.push({ x, y, pressure: 0.5 });
    }
  } else if (type === 'diagonal') {
    const startX = 130;
    const startY = 410;
    const endX = 470;
    const endY = 130;
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      pts.push({
        x: startX + (endX - startX) * t,
        y: startY + (endY - startY) * t,
        pressure: 0.5,
      });
    }
  } else if (type === 'arc_c') {
    // Arco en C curvado hacia arriba
    const startX = 120;
    const endX = 480;
    const baseY = 360;
    const apexY = 170;
    for (let i = 0; i <= 50; i++) {
      const t = i / 50;
      const x = startX + (endX - startX) * t;
      // Parábola 4 * t * (1 - t)
      const arch = 4 * t * (1 - t);
      const y = baseY - (baseY - apexY) * arch;
      pts.push({ x, y, pressure: 0.5 });
    }
  } else if (type === 'wave_s') {
    // Onda sinusoidal continua en S
    const startX = 100;
    const endX = 500;
    const centerY = 270;
    const amp = 85;
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const x = startX + (endX - startX) * t;
      const y = centerY - Math.sin(t * Math.PI * 2) * amp;
      pts.push({ x, y, pressure: 0.5 });
    }
  } else if (type === 'chevron') {
    // Quiebro en vértice
    for (let i = 0; i <= 25; i++) {
      const t = i / 25;
      pts.push({ x: 120 + t * 180, y: 190 + t * 160, pressure: 0.5 });
    }
    for (let i = 1; i <= 25; i++) {
      const t = i / 25;
      pts.push({ x: 300 + t * 180, y: 350 - t * 160, pressure: 0.5 });
    }
  }

  return pts;
}

export const GhostLineMinigame: React.FC<GhostLineMinigameProps> = ({
  onExit,
  onAwardXP,
  onAvatarMoodChange,
  onDrawingStateChange,
}) => {
  // Modo de juego: 'survival' (3 vidas) o 'streak' (racha infinita libre)
  const [gameMode, setGameMode] = useState<'survival' | 'streak'>('survival');
  const [selectedPreset, setSelectedPreset] = useState<GhostPreset>('horizontal');

  // Estado del Fantasma
  const [ghostStroke, setGhostStroke] = useState<Point[] | null>(() => generatePresetGhost('horizontal'));
  const [isRecordingGhost, setIsRecordingGhost] = useState<boolean>(false);

  // Trazos actuales del usuario
  const [userStroke, setUserStroke] = useState<Point[] | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const currentPointsRef = useRef<Point[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Estadísticas y puntuaciones
  const [evaluation, setEvaluation] = useState<GhostEvaluation | null>(null);
  const [comboStreak, setComboStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('paplitz_ghost_best_streak');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [attemptsCount, setAttemptsCount] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  // Guardar récord de racha
  const updateBestStreak = (newStreak: number) => {
    if (newStreak > bestStreak) {
      setBestStreak(newStreak);
      try {
        localStorage.setItem('paplitz_ghost_best_streak', newStreak.toString());
      } catch {
        // Ignorar
      }
    }
  };

  // Reiniciar partida
  const resetGame = (mode: 'survival' | 'streak' = gameMode) => {
    setGameMode(mode);
    setUserStroke(null);
    setEvaluation(null);
    setComboStreak(0);
    setAttemptsCount(0);
    setLives(3);
    setIsGameOver(false);
    setFlashMessage(null);
  };

  // Seleccionar plantilla predeterminada
  const handleSelectPreset = (preset: GhostPreset) => {
    setSelectedPreset(preset);
    setUserStroke(null);
    setEvaluation(null);
    if (preset === 'custom') {
      setGhostStroke(null);
      setIsRecordingGhost(true);
      setFlashMessage('✏️ Dibuja tu línea en el lienzo para convertirla en Fantasma');
      setTimeout(() => setFlashMessage(null), 3000);
    } else {
      setIsRecordingGhost(false);
      setGhostStroke(generatePresetGhost(preset));
      setFlashMessage(`Fantasma cargado: ${preset.toUpperCase()}`);
      setTimeout(() => setFlashMessage(null), 1800);
    }
  };

  // Renderizado del lienzo técnico Paplitz
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 600;
    const H = 540;

    ctx.save();

    // 1. Fondo blanco técnico
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    // 2. Trama milimétrica sutil Paplitz
    ctx.strokeStyle = '#F0F0F0';
    ctx.lineWidth = 1;
    const gridStep = 20;
    for (let x = 0; x < W; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // 3. RENDERIZADO DEL FANTASMA EN "GRIS CLARITO" (#D4D4D8 / #E4E4E7)
    if (ghostStroke && ghostStroke.length > 1) {
      ctx.save();

      // Aura tenue translúcida
      ctx.strokeStyle = '#F4F4F5';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(ghostStroke[0].x, ghostStroke[0].y);
      for (let i = 1; i < ghostStroke.length; i++) {
        ctx.lineTo(ghostStroke[i].x, ghostStroke[i].y);
      }
      ctx.stroke();

      // Trazo del Fantasma principal (Gris Clarito #D4D4D8)
      ctx.strokeStyle = '#D4D4D8';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([6, 5]); // Línea fantasmagórica discontinua elegante
      ctx.beginPath();
      ctx.moveTo(ghostStroke[0].x, ghostStroke[0].y);
      for (let i = 1; i < ghostStroke.length; i++) {
        ctx.lineTo(ghostStroke[i].x, ghostStroke[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Nodo de inicio ① del fantasma
      const startP = ghostStroke[0];
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#A1A1AA';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(startP.x, startP.y, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#71717A';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('1', startP.x, startP.y);

      // Nodo de fin ② del fantasma
      const endP = ghostStroke[ghostStroke.length - 1];
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#A1A1AA';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(endP.x, endP.y, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#71717A';
      ctx.fillText('2', endP.x, endP.y);

      // Icono flotante tenue de fantasma junto al centro
      const midP = ghostStroke[Math.floor(ghostStroke.length / 2)];
      ctx.fillStyle = '#A1A1AA';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('GHOST', midP.x, midP.y - 14);

      ctx.restore();
    }

    // 4. TRAZO ENTINTADO DEL USUARIO (Negro #000000 con grosor suave)
    const pointsToDraw =
      isDrawing && currentPointsRef.current.length > 0
        ? currentPointsRef.current
        : userStroke && userStroke.length > 0
        ? userStroke
        : [];

    if (pointsToDraw.length > 0) {
      ctx.save();
      ctx.strokeStyle = isRecordingGhost ? '#71717A' : '#000000';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (pointsToDraw.length === 1) {
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(pointsToDraw[0].x, pointsToDraw[0].y, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(pointsToDraw[0].x, pointsToDraw[0].y);
        for (let i = 1; i < pointsToDraw.length - 1; i++) {
          const xc = (pointsToDraw[i].x + pointsToDraw[i + 1].x) / 2;
          const yc = (pointsToDraw[i].y + pointsToDraw[i + 1].y) / 2;
          ctx.quadraticCurveTo(pointsToDraw[i].x, pointsToDraw[i].y, xc, yc);
        }
        ctx.lineTo(pointsToDraw[pointsToDraw.length - 1].x, pointsToDraw[pointsToDraw.length - 1].y);
        const lastP = pointsToDraw[pointsToDraw.length - 1];
        ctx.lineWidth = lastP.pressure && lastP.pressure > 0 ? 1.6 + lastP.pressure * 2.2 : 2.6;
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();
  }, [ghostStroke, userStroke, isDrawing, isRecordingGhost]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Captura y normalización de coordenadas táctiles / puntero
  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
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
    if (e.button !== 0 || isGameOver) return;
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Ignorar
      }
    }
    const pt = getCoords(e);
    currentPointsRef.current = [pt];
    setUserStroke(null);
    setEvaluation(null);
    setIsDrawing(true);
    if (onDrawingStateChange) onDrawingStateChange(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pt = getCoords(e);
    currentPointsRef.current.push(pt);
    renderCanvas();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (onDrawingStateChange) onDrawingStateChange(false);
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Ignorar
      }
    }

    const recorded = [...currentPointsRef.current];
    currentPointsRef.current = [];

    if (recorded.length < 3) {
      renderCanvas();
      return;
    }

    // A. Si estábamos grabando un nuevo fantasma personalizado
    if (isRecordingGhost || !ghostStroke) {
      setGhostStroke(recorded);
      setIsRecordingGhost(false);
      setSelectedPreset('custom');
      setFlashMessage('¡Fantasma Creado! Ahora persíguelo: repite la misma línea.');
      setTimeout(() => setFlashMessage(null), 2500);
      renderCanvas();
      return;
    }

    // B. Si estamos persiguiendo al fantasma existente
    setUserStroke(recorded);
    const evalRes = evaluateGhostStroke(recorded, ghostStroke);
    setEvaluation(evalRes);
    setAttemptsCount((prev) => prev + 1);

    if (evalRes.passed) {
      const nextCombo = comboStreak + 1;
      setComboStreak(nextCombo);
      updateBestStreak(nextCombo);

      const xp = evalRes.perfect ? 25 : 12;
      onAwardXP(xp);

      if (onAvatarMoodChange) {
        onAvatarMoodChange(evalRes.perfect ? 'success-stars' : 'streak-fire');
        setTimeout(() => onAvatarMoodChange('neutral'), 2000);
      }

      setFlashMessage(evalRes.perfect ? `¡PERFECTO! ${evalRes.score}% (Combo: ${nextCombo})` : `¡SINCRONÍA! ${evalRes.score}%`);
      setTimeout(() => setFlashMessage(null), 2000);
    } else {
      setComboStreak(0);
      if (onAvatarMoodChange) {
        onAvatarMoodChange('fail-spiral');
        setTimeout(() => onAvatarMoodChange('neutral'), 2200);
      }

      if (gameMode === 'survival') {
        const nextLives = lives - 1;
        setLives(nextLives);
        if (nextLives <= 0) {
          setIsGameOver(true);
        }
      }

      setFlashMessage(`Desincronizado (${evalRes.score}%)`);
      setTimeout(() => setFlashMessage(null), 2000);
    }

    renderCanvas();
  };

  return (
    <div className="max-w-4xl w-full mx-auto px-3 sm:px-4 py-4 flex flex-col gap-4 font-sans select-none">
      {/* 1. CABECERA ARCADE DE LÍNEA FANTASMA */}
      <div className="flex items-center justify-between border-b-2 border-black pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 border-2 border-black bg-neutral-100 flex items-center justify-center shadow-[2px_2px_0px_#000000]">
            <Ghost className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase bg-black text-white px-1.5 py-0.2 font-bold">
                MINIJUEGO
              </span>
              <span className="text-[10px] font-mono text-neutral-500 font-bold uppercase">
                · Memoria Muscular
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display leading-tight flex items-center gap-1.5">
              <span>Línea Fantasma</span>
              <span className="text-xs font-mono font-normal text-neutral-500 hidden sm:inline">
                (Persigue al fantasma en gris clarito)
              </span>
            </h2>
          </div>
        </div>

        {/* Botón Salir al Hub */}
        <button
          onClick={onExit}
          className="btn-ink-outline px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer shadow-[2px_2px_0px_#000000]"
          title="Volver al menú de minijuegos"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Volver</span>
        </button>
      </div>

      {/* 2. PANEL DE ESTADÍSTICAS ARCADE: VIDAS, RACHA, RÉCORD Y MODO */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
        {/* Vidas o Modo */}
        <div className="border-2 border-black p-2 bg-neutral-50 shadow-[2px_2px_0px_#000000] flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-neutral-500">
            {gameMode === 'survival' ? 'Vidas:' : 'Modo:'}
          </span>
          {gameMode === 'survival' ? (
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <Heart
                  key={i}
                  className={`w-4 h-4 stroke-[2.5] ${
                    i < lives ? 'fill-black text-black' : 'text-neutral-300 fill-neutral-200'
                  }`}
                />
              ))}
            </div>
          ) : (
            <span className="font-bold uppercase text-[11px]">Infinito</span>
          )}
        </div>

        {/* Racha / Combo actual */}
        <div className="border-2 border-black p-2 bg-neutral-50 shadow-[2px_2px_0px_#000000] flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-neutral-500 flex items-center gap-1">
            <Flame className="w-3 h-3 text-black fill-black" />
            <span>Racha:</span>
          </span>
          <span className="font-bold text-sm tabular-nums">
            {comboStreak} {comboStreak === 1 ? 'acierto' : 'aciertos'}
          </span>
        </div>

        {/* Récord Histórico */}
        <div className="border-2 border-black p-2 bg-neutral-50 shadow-[2px_2px_0px_#000000] flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-neutral-500 flex items-center gap-1">
            <Trophy className="w-3 h-3 text-black" />
            <span>Récord:</span>
          </span>
          <span className="font-bold text-sm tabular-nums">
            {bestStreak} seguidos
          </span>
        </div>

        {/* Total Intentos */}
        <div className="border-2 border-black p-2 bg-neutral-50 shadow-[2px_2px_0px_#000000] flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-neutral-500">Intentos:</span>
          <span className="font-bold text-sm tabular-nums">{attemptsCount}</span>
        </div>
      </div>

      {/* 3. BARRA DE HERRAMIENTAS: SELECTOR DE TRAZO FANTASMA */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-2 border-black p-2 bg-white shadow-[2px_2px_0px_#000000] text-xs font-mono">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold uppercase text-neutral-500 mr-1">Fantasma:</span>
          {[
            { id: 'horizontal' as const, label: '─ Horizontal' },
            { id: 'diagonal' as const, label: '↗ Diagonal' },
            { id: 'arc_c' as const, label: '⌒ Arco C' },
            { id: 'wave_s' as const, label: '∿ Onda S' },
            { id: 'chevron' as const, label: '∧ Quiebro' },
            { id: 'custom' as const, label: '✏️ Dibujar Propio' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset.id)}
              className={`px-2 py-1 border border-black font-bold cursor-pointer transition-colors ${
                selectedPreset === preset.id && !isRecordingGhost
                  ? 'bg-black text-white'
                  : selectedPreset === preset.id && isRecordingGhost
                  ? 'bg-neutral-800 text-white animate-pulse'
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Alternar modo Vidas vs Racha Libre */}
          <button
            onClick={() => resetGame(gameMode === 'survival' ? 'streak' : 'survival')}
            className="px-2 py-1 text-[11px] font-bold border border-black bg-neutral-100 hover:bg-neutral-200 cursor-pointer"
            title="Cambiar entre modo 3 Vidas y Modo Racha Libre"
          >
            Modo: {gameMode === 'survival' ? '3 Vidas' : 'Libre'}
          </button>
        </div>
      </div>

      {/* 4. ÁREA CENTRAL DEL LIENZO */}
      <div className="relative w-full flex flex-col items-center justify-center">
        {/* Flash Message Banner flotante */}
        {flashMessage && (
          <div className="absolute top-3 z-20 px-3 py-1.5 bg-black text-white font-mono text-xs font-bold border-2 border-white shadow-[3px_3px_0px_#000000] animate-bounce">
            {flashMessage}
          </div>
        )}

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
            maxHeight: 'calc(100vh - 270px)',
          }}
        />

        {/* Modal de GAME OVER si pierde las 3 vidas */}
        {isGameOver && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 border-2 border-black z-30 animate-fade-in text-center font-mono">
            <Ghost className="w-12 h-12 text-black mb-2 animate-bounce stroke-[2]" />
            <h3 className="text-2xl font-bold font-display uppercase tracking-tight">
              ¡Fin de la Partida!
            </h3>
            <p className="text-xs text-neutral-600 mt-1 max-w-sm">
              El fantasma se ha desvanecido tras perder las 3 vidas.
            </p>

            <div className="my-4 p-3 border-2 border-black bg-neutral-50 w-64 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">Racha lograda:</span>
                <span className="font-bold">{comboStreak} seguidos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Mejor Récord:</span>
                <span className="font-bold">{bestStreak}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Total intentos:</span>
                <span className="font-bold">{attemptsCount}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => resetGame('survival')}
                className="btn-ink px-4 py-2 text-xs uppercase font-bold flex items-center gap-1.5 cursor-pointer shadow-[3px_3px_0px_#000000]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reintentar (3 Vidas)</span>
              </button>
              <button
                onClick={() => resetGame('streak')}
                className="btn-ink-outline px-4 py-2 text-xs uppercase font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
              >
                <span>Jugar Libre</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. TARJETA INFERIOR DE EVALUACIÓN Y FEEDBACK INMEDIATO */}
      {evaluation && !isGameOver && (
        <div className="w-full p-2.5 border-2 border-black bg-white shadow-[2px_2px_0px_#000000] font-mono text-xs flex flex-col gap-1.5 animate-fade-in">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`flex items-center gap-1 px-2 py-0.5 font-bold border-2 border-black shadow-[1px_1px_0px_#000000] ${
                  evaluation.perfect
                    ? 'bg-black text-white'
                    : evaluation.passed
                    ? 'bg-neutral-100 text-black'
                    : 'bg-neutral-200 text-black'
                }`}
              >
                {evaluation.passed ? (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
                <span>NOTA: {evaluation.score}%</span>
              </span>

              <span
                className={`text-[9px] px-1 py-0.2 uppercase font-bold border border-black ${
                  evaluation.perfect
                    ? 'bg-black text-white'
                    : evaluation.passed
                    ? 'bg-neutral-100 text-black'
                    : 'bg-white text-black'
                }`}
              >
                {evaluation.perfect ? 'Perfecto (≥90%)' : evaluation.passed ? 'Sincronizado' : 'Fallo (<75%)'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-neutral-600">
              <span>Desviación: <strong>{evaluation.avgDistPx}px</strong></span>
              <span>Longitud: <strong>{evaluation.lengthScore}%</strong></span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] font-sans text-neutral-700 pt-1 border-t border-neutral-200">
            <span className="font-semibold text-black">{evaluation.title}: {evaluation.message}</span>
            <span className="text-[10px] font-mono text-neutral-500 shrink-0">
              (Dibuja de nuevo para el siguiente intento)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
