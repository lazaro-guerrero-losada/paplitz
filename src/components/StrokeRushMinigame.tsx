import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Zap,
  Flame,
  Trophy,
  RotateCcw,
  Clock,
  Check,
  Undo2,
  Filter,
  Sparkles,
} from 'lucide-react';
import { LessonNode } from '../lib/curriculumData';
import { AvatarMood } from '../lib/avatarTypes';
import { generateStrokeChallenge, SeededRNG } from '../lib/strokeProceduralGenerator';

export interface StrokeRushMinigameProps {
  unlockedNodes: LessonNode[];
  activeNode: LessonNode;
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

interface ActiveRushLine {
  id: string;
  points: Point[];
  startPoint: Point;
  endPoint: Point;
  spawnTime: number;
  label: string;
  shakeUntil?: number;
}

interface LineEvaluation {
  score: number;
  avgDistPx: number;
  passed: boolean;
  targetLineId: string;
}

// Longitud acumulada de una polilínea
function getPolylineLength(pts: Point[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return len;
}

// Remuestreo uniforme de una polilínea a N puntos equidistantes
function resampleCurve(pts: Point[], targetCount = 35): Point[] {
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

// Compara el trazo dibujado contra una línea objetivo
function evaluateUserStrokeAgainstLine(userPts: Point[], linePts: Point[]): { score: number; avgDist: number; passed: boolean } {
  if (userPts.length < 2 || linePts.length < 2) {
    return { score: 0, avgDist: 999, passed: false };
  }

  const N = 35;
  const sUser = resampleCurve(userPts, N);
  const sLine = resampleCurve(linePts, N);

  let sumFwd = 0;
  for (let i = 0; i < N; i++) {
    sumFwd += Math.hypot(sUser[i].x - sLine[i].x, sUser[i].y - sLine[i].y);
  }
  const avgFwd = sumFwd / N;

  let sumRev = 0;
  for (let i = 0; i < N; i++) {
    sumRev += Math.hypot(sUser[i].x - sLine[N - 1 - i].x, sUser[i].y - sLine[N - 1 - i].y);
  }
  const avgRev = sumRev / N;

  const isReversed = avgRev < avgFwd * 0.75;
  const effectiveDist = isReversed ? avgRev : avgFwd;

  // Proximidad: 20px de tolerancia
  const proxScore = Math.max(0, Math.min(100, Math.round(100 * Math.exp(-effectiveDist / 20))));

  const uLen = getPolylineLength(userPts);
  const lLen = getPolylineLength(linePts);
  const lenRatio = Math.min(uLen, lLen) / Math.max(uLen, lLen, 1);
  const lenScore = Math.round(lenRatio * 100);

  let finalScore = Math.round(proxScore * 0.72 + lenScore * 0.28);
  if (isReversed) {
    finalScore = Math.max(0, finalScore - 12);
  }

  // Umbral de eliminación: 70%
  const passed = finalScore >= 70;

  return {
    score: finalScore,
    avgDist: Math.round(effectiveDist * 10) / 10,
    passed,
  };
}

export const StrokeRushMinigame: React.FC<StrokeRushMinigameProps> = ({
  unlockedNodes,
  activeNode,
  onExit,
  onAwardXP,
  onAvatarMoodChange,
  onDrawingStateChange,
}) => {
  // Filtrar solo nodos de calistenia para el selector de nivel
  const calNodes = unlockedNodes.filter((n) => n.isCalisthenics);
  const defaultCalNode = calNodes.find((n) => n.id === activeNode.id) || calNodes[0] || activeNode;

  // Nivel seleccionado de calistenia
  const [selectedNodeId, setSelectedNodeId] = useState<string>(defaultCalNode.id);
  const selectedNode = calNodes.find((n) => n.id === selectedNodeId) || defaultCalNode;

  // Modos de juego: 'survival' (evitar desbordamiento de 6 líneas) o 'blitz' (60s contrarreloj)
  const [gameMode, setGameMode] = useState<'survival' | 'blitz'>('survival');
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [gameOverReason, setGameOverReason] = useState<'overflow' | 'timeout'>('overflow');

  // Líneas activas en pantalla
  const [activeLines, setActiveLines] = useState<ActiveRushLine[]>([]);
  const [clearedScores, setClearedScores] = useState<number[]>([]);
  const [comboStreak, setComboStreak] = useState<number>(0);
  const [bestCombo, setBestCombo] = useState<number>(0);
  const [blitzTimer, setBlitzTimer] = useState<number>(60);
  const [survivalTime, setSurvivalTime] = useState<number>(0);
  const [lastEval, setLastEval] = useState<LineEvaluation | null>(null);
  const [flashBanner, setFlashBanner] = useState<{ text: string; positive: boolean } | null>(null);

  // Récords
  const [highScores, setHighScores] = useState<{ survival: number; blitz: number }>(() => {
    try {
      const s = localStorage.getItem(`paplitz_rush_survival_${selectedNode.code}`) || '0';
      const b = localStorage.getItem(`paplitz_rush_blitz_${selectedNode.code}`) || '0';
      return { survival: parseInt(s, 10), blitz: parseInt(b, 10) };
    } catch {
      return { survival: 0, blitz: 0 };
    }
  });

  // Trazado en curso
  const [userStroke, setUserStroke] = useState<Point[] | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const currentStrokeRef = useRef<Point[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spawnTimerRef = useRef<number | null>(null);
  const gameLoopRef = useRef<number | null>(null);

  // Máximo número de líneas simultáneas antes de desbordamiento (Game Over)
  const MAX_LINES_OVERFLOW = 6;

  // Genera una nueva línea basada estrictamente en el nivel de calistenia seleccionado
  const spawnLineForNode = useCallback(
    (node: LessonNode, existingLines: ActiveRushLine[]): ActiveRushLine => {
      const rng = new SeededRNG(Math.floor(Math.random() * 900000 + 10000));
      const variants = node.variants || (node.exerciseDef ? [node.exerciseDef] : []);
      const pickedDef = variants[rng.rangeInt(0, Math.max(0, variants.length - 1))] || node.exerciseDef;

      let rawPoints: Point[] = [];
      let label = pickedDef?.title || node.title;

      if (pickedDef) {
        const challenge = generateStrokeChallenge(pickedDef, rng.rangeInt(1000, 99999), 600, 540);
        if (challenge.idealPath && challenge.idealPath.length > 1) {
          rawPoints = challenge.idealPath;
        } else if (challenge.targetLines && challenge.targetLines.length > 0) {
          const tLine = challenge.targetLines[0];
          rawPoints = tLine.idealPath && tLine.idealPath.length > 1 ? tLine.idealPath : [tLine.start, tLine.end];
        } else if (challenge.keyPoints && challenge.keyPoints.length >= 2) {
          const k0 = challenge.keyPoints[0];
          const k1 = challenge.keyPoints[challenge.keyPoints.length - 1];
          rawPoints = [k0, k1];
        }
      }

      // Si no hay puntos generados, fallback a línea basada en dirección del nivel
      if (rawPoints.length < 2) {
        rawPoints = [
          { x: 120, y: 270 },
          { x: 480, y: 270 },
        ];
      }

      // Calcular centroide actual de los puntos
      let cx = 0;
      let cy = 0;
      for (const p of rawPoints) {
        cx += p.x;
        cy += p.y;
      }
      cx /= rawPoints.length;
      cy /= rawPoints.length;

      // Buscar un cuadrante / sector disponible para no colisionar totalmente con líneas previas
      const candidateSectors = [
        { x: 180, y: 150 },
        { x: 420, y: 150 },
        { x: 180, y: 270 },
        { x: 420, y: 270 },
        { x: 180, y: 390 },
        { x: 420, y: 390 },
        { x: 300, y: 220 },
        { x: 300, y: 340 },
      ];

      // Orden aleatorio de sectores
      const shuffled = [...candidateSectors].sort(() => Math.random() - 0.5);
      let bestTarget = shuffled[0];
      let maxMinDist = -1;

      for (const cand of shuffled) {
        let minDist = 9999;
        for (const exLine of existingLines) {
          const d = Math.hypot(cand.x - exLine.startPoint.x, cand.y - exLine.startPoint.y);
          if (d < minDist) minDist = d;
        }
        if (minDist > maxMinDist) {
          maxMinDist = minDist;
          bestTarget = cand;
        }
      }

      // Desplazar puntos al nuevo centro objetivo
      const dx = bestTarget.x - cx + rng.range(-20, 20);
      const dy = bestTarget.y - cy + rng.range(-20, 20);

      const placedPoints: Point[] = rawPoints.map((p) => ({
        x: Math.max(40, Math.min(560, Math.round(p.x + dx))),
        y: Math.max(40, Math.min(500, Math.round(p.y + dy))),
      }));

      return {
        id: `rush-line-${Date.now()}-${Math.random()}`,
        points: placedPoints,
        startPoint: placedPoints[0],
        endPoint: placedPoints[placedPoints.length - 1],
        spawnTime: Date.now(),
        label,
      };
    },
    []
  );

  // Iniciar partida
  const startGame = (mode: 'survival' | 'blitz' = gameMode) => {
    setGameMode(mode);
    setGameState('playing');
    setClearedScores([]);
    setComboStreak(0);
    setBestCombo(0);
    setBlitzTimer(60);
    setSurvivalTime(0);
    setUserStroke(null);
    setLastEval(null);
    setFlashBanner(null);

    // Inicializar con 2 líneas en pantalla
    const firstLine = spawnLineForNode(selectedNode, []);
    const secondLine = spawnLineForNode(selectedNode, [firstLine]);
    setActiveLines([firstLine, secondLine]);
  };

  // Fin de la partida
  const finishGame = useCallback(
    (reason: 'overflow' | 'timeout') => {
      setGameOverReason(reason);
      setGameState('gameover');
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);

      const count = clearedScores.length;
      try {
        const prevBest = parseInt(localStorage.getItem('paplitz_rush_best_cleared') || '0', 10);
        if (count > prevBest) {
          localStorage.setItem('paplitz_rush_best_cleared', count.toString());
        }
      } catch {
        // Ignorar
      }

      if (gameMode === 'survival') {
        if (count > highScores.survival) {
          setHighScores((prev) => ({ ...prev, survival: count }));
          try {
            localStorage.setItem(`paplitz_rush_survival_${selectedNode.code}`, count.toString());
          } catch {
            // Ignorar
          }
        }
      } else {
        if (count > highScores.blitz) {
          setHighScores((prev) => ({ ...prev, blitz: count }));
          try {
            localStorage.setItem(`paplitz_rush_blitz_${selectedNode.code}`, count.toString());
          } catch {
            // Ignorar
          }
        }
      }

      const xpEarned = Math.round(count * 12 + (clearedScores.length > 0 ? (clearedScores.reduce((a, b) => a + b, 0) / count) * 0.3 : 0));
      if (xpEarned > 0 && onAwardXP) {
        onAwardXP(xpEarned);
      }

      if (onAvatarMoodChange) {
        onAvatarMoodChange(count > 6 ? 'success-stars' : 'fail-spiral');
        setTimeout(() => onAvatarMoodChange('neutral'), 3000);
      }
    },
    [clearedScores, gameMode, highScores, onAvatarMoodChange, onAwardXP, selectedNode.code]
  );

  // Spawner periódico de líneas que se acumulan
  useEffect(() => {
    if (gameState !== 'playing') return;

    // Intervalo de aparición: empieza en 3.5s y se acelera suavemente conforme eliminas líneas
    const currentSpeedMs = Math.max(1800, 3500 - clearedScores.length * 120);

    const timer = window.setInterval(() => {
      setActiveLines((prev) => {
        // Si ya hay MAX_LINES_OVERFLOW, se produce el desbordamiento
        if (prev.length >= MAX_LINES_OVERFLOW) {
          finishGame('overflow');
          return prev;
        }

        const newLine = spawnLineForNode(selectedNode, prev);
        const updated = [...prev, newLine];

        if (updated.length >= MAX_LINES_OVERFLOW) {
          finishGame('overflow');
        }
        return updated;
      });
    }, currentSpeedMs);

    spawnTimerRef.current = timer;
    return () => clearInterval(timer);
  }, [gameState, clearedScores.length, selectedNode, spawnLineForNode, finishGame]);

  // Temporizador principal de juego
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = window.setInterval(() => {
      if (gameMode === 'blitz') {
        setBlitzTimer((prev) => {
          if (prev <= 1) {
            finishGame('timeout');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setSurvivalTime((prev) => prev + 1);
      }
    }, 1000);

    gameLoopRef.current = interval;
    return () => clearInterval(interval);
  }, [gameState, gameMode, finishGame]);

  // Renderizado del lienzo
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 600;
    const H = 540;

    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    // Trama milimétrica sutil
    ctx.strokeStyle = '#F0F0F0';
    ctx.lineWidth = 1;
    const step = 20;
    for (let x = 0; x < W; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    const now = Date.now();

    // 1. DIBUJAR LÍNEAS ACTIVAS QUE SE ACUMULAN EN PANTALLA
    for (let index = 0; index < activeLines.length; index++) {
      const line = activeLines[index];
      const isShaking = line.shakeUntil && line.shakeUntil > now;

      ctx.save();

      // Si está en fallo (shake), resalta en rojo técnico; si no, gris suave con halo
      const strokeColor = isShaking ? '#DC2626' : '#71717A';
      const glowColor = isShaking ? '#FEE2E2' : '#F4F4F5';

      // Halo
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(line.points[0].x, line.points[0].y);
      for (let i = 1; i < line.points.length; i++) {
        ctx.lineTo(line.points[i].x, line.points[i].y);
      }
      ctx.stroke();

      // Línea principal discontinua técnica
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([5, 4]);

      ctx.beginPath();
      ctx.moveTo(line.points[0].x, line.points[0].y);
      for (let i = 1; i < line.points.length; i++) {
        ctx.lineTo(line.points[i].x, line.points[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Nodo de inicio ①
      const p0 = line.startPoint;
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p0.x, p0.y, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = strokeColor;
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('1', p0.x, p0.y);

      // Nodo de fin ②
      const p1 = line.endPoint;
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = strokeColor;
      ctx.fillText('2', p1.x, p1.y);

      // Etiqueta tenue de orden
      ctx.fillStyle = '#A1A1AA';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`L${index + 1}`, p0.x, p0.y - 12);

      ctx.restore();
    }

    // 2. DIBUJAR TRAZO ENTINTADO DEL USUARIO
    const currentPoints =
      isDrawing && currentStrokeRef.current.length > 0
        ? currentStrokeRef.current
        : userStroke && userStroke.length > 0
        ? userStroke
        : [];

    if (currentPoints.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#000000';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      for (let i = 1; i < currentPoints.length - 1; i++) {
        const xc = (currentPoints[i].x + currentPoints[i + 1].x) / 2;
        const yc = (currentPoints[i].y + currentPoints[i + 1].y) / 2;
        ctx.quadraticCurveTo(currentPoints[i].x, currentPoints[i].y, xc, yc);
      }
      ctx.lineTo(currentPoints[currentPoints.length - 1].x, currentPoints[currentPoints.length - 1].y);
      const lastP = currentPoints[currentPoints.length - 1];
      ctx.lineWidth = lastP.pressure && lastP.pressure > 0 ? 1.6 + lastP.pressure * 2.2 : 2.6;
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }, [activeLines, userStroke, isDrawing]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Coordenadas normalizadas
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
    if (e.button !== 0 || gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Ignorar
      }
    }
    const pt = getCoords(e);
    currentStrokeRef.current = [pt];
    setUserStroke(null);
    setIsDrawing(true);
    if (onDrawingStateChange) onDrawingStateChange(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pt = getCoords(e);
    currentStrokeRef.current.push(pt);
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

    const recorded = [...currentStrokeRef.current];
    currentStrokeRef.current = [];

    if (recorded.length < 3 || activeLines.length === 0) {
      renderCanvas();
      return;
    }

    setUserStroke(recorded);

    // 1. Identificar a cuál de las líneas activas apuntaba el usuario
    const uMid = recorded[Math.floor(recorded.length / 2)];
    let bestLineIndex = -1;
    let minMidDist = 9999;

    for (let i = 0; i < activeLines.length; i++) {
      const line = activeLines[i];
      const lMid = line.points[Math.floor(line.points.length / 2)];
      const d = Math.hypot(uMid.x - lMid.x, uMid.y - lMid.y);
      if (d < minMidDist) {
        minMidDist = d;
        bestLineIndex = i;
      }
    }

    if (bestLineIndex === -1) {
      renderCanvas();
      return;
    }

    const targetLine = activeLines[bestLineIndex];
    const evalResult = evaluateUserStrokeAgainstLine(recorded, targetLine.points);

    setLastEval({
      score: evalResult.score,
      avgDistPx: evalResult.avgDist,
      passed: evalResult.passed,
      targetLineId: targetLine.id,
    });

    // 2. REGLA PEDIDA POR EL USUARIO:
    // "cuando la haces se quita, pero si no la haces se van acumulando porque van a apareciendo más y más,
    // y si haces una línea por debajo de un umbral pues no se quita porque está mal"
    if (evalResult.passed) {
      // APROBADA (≥70%): SE QUITA DE LA PANTALLA
      setActiveLines((prev) => prev.filter((l) => l.id !== targetLine.id));
      setClearedScores((prev) => [...prev, evalResult.score]);

      const nextCombo = comboStreak + 1;
      setComboStreak(nextCombo);
      if (nextCombo > bestCombo) setBestCombo(nextCombo);

      const xp = evalResult.score >= 90 ? 25 : 12;
      onAwardXP(xp);

      if (onAvatarMoodChange) {
        onAvatarMoodChange(evalResult.score >= 90 ? 'success-stars' : 'streak-fire');
        setTimeout(() => onAvatarMoodChange('neutral'), 1800);
      }

      setFlashBanner({
        text: evalResult.score >= 90 ? `¡IMPECABLE! ${evalResult.score}% (Línea eliminada)` : `¡ELIMINADA! ${evalResult.score}%`,
        positive: true,
      });
      setTimeout(() => setFlashBanner(null), 1600);
    } else {
      // SUSPENSA (<70%): NO SE QUITA, SE QUEDA ACUMULADA Y PARPADEA EN ROJO
      setActiveLines((prev) =>
        prev.map((l) => (l.id === targetLine.id ? { ...l, shakeUntil: Date.now() + 600 } : l))
      );
      setComboStreak(0);

      if (onAvatarMoodChange) {
        onAvatarMoodChange('fail-spiral');
        setTimeout(() => onAvatarMoodChange('neutral'), 2000);
      }

      setFlashBanner({
        text: `Fallo: ${evalResult.score}% (Requiere ≥70% para eliminarla)`,
        positive: false,
      });
      setTimeout(() => setFlashBanner(null), 1800);
    }

    renderCanvas();
  };

  // Cálculo de nota promedio final
  const averageGrade =
    clearedScores.length > 0
      ? Math.round(clearedScores.reduce((a, b) => a + b, 0) / clearedScores.length)
      : 0;

  return (
    <div className="max-w-4xl w-full mx-auto px-3 sm:px-4 py-4 flex flex-col gap-4 font-sans select-none">
      {/* 1. CABECERA DEL MINIJUEGO */}
      <div className="flex items-center justify-between border-b-2 border-black pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 border-2 border-black bg-neutral-100 flex items-center justify-center shadow-[2px_2px_0px_#000000]">
            <Zap className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase bg-black text-white px-1.5 py-0.2 font-bold">
                MINIJUEGO
              </span>
              <span className="text-[10px] font-mono text-neutral-500 font-bold uppercase">
                · Limpieza de Pantalla
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display leading-tight flex items-center gap-1.5">
              <span>Avalancha de Trazos</span>
            </h2>
          </div>
        </div>

        <button
          onClick={onExit}
          className="btn-ink-outline px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer shadow-[2px_2px_0px_#000000]"
          title="Volver al menú de minijuegos"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Volver</span>
        </button>
      </div>

      {/* 2. SELECTOR DE NIVEL DE TRAZOS: "Las líneas que hayan hecho tiene que ir en función del nivel por el que vayas de trazos" */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-2 border-black p-2 bg-neutral-50 shadow-[2px_2px_0px_#000000] text-xs font-mono">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-black shrink-0" />
          <span className="font-bold uppercase text-[10px] text-neutral-600">Nivel de Calistenia:</span>
          <select
            value={selectedNodeId}
            onChange={(e) => {
              setSelectedNodeId(e.target.value);
              if (gameState === 'playing') {
                startGame(gameMode);
              }
            }}
            disabled={gameState === 'playing'}
            className="border-2 border-black px-2 py-1 text-xs font-mono font-bold bg-white cursor-pointer max-w-[220px] sm:max-w-xs truncate shadow-[1px_1px_0px_#000000]"
          >
            {calNodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.code} · {n.title}
              </option>
            ))}
          </select>
        </div>

        {gameState === 'idle' && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-neutral-500 uppercase mr-1">Modo:</span>
            <button
              onClick={() => setGameMode('survival')}
              className={`px-2 py-1 border border-black font-bold cursor-pointer ${
                gameMode === 'survival' ? 'bg-black text-white' : 'bg-white text-black'
              }`}
            >
              Supervivencia
            </button>
            <button
              onClick={() => setGameMode('blitz')}
              className={`px-2 py-1 border border-black font-bold cursor-pointer ${
                gameMode === 'blitz' ? 'bg-black text-white' : 'bg-white text-black'
              }`}
            >
              Blitz 60s
            </button>
          </div>
        )}
      </div>

      {/* 3. BARRA DE ESTADÍSTICAS Y ALARMA DE SATURACIÓN DE LÍNEAS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
        {/* Acumulación en pantalla */}
        <div
          className={`border-2 border-black p-2 shadow-[2px_2px_0px_#000000] flex items-center justify-between ${
            activeLines.length >= 5
              ? 'bg-red-100 text-red-900 border-red-600 animate-pulse'
              : activeLines.length >= 4
              ? 'bg-amber-50 text-amber-900'
              : 'bg-neutral-50'
          }`}
        >
          <span className="text-[10px] uppercase font-bold">En Pantalla:</span>
          <span className="font-bold text-sm tabular-nums">
            {activeLines.length} / {MAX_LINES_OVERFLOW}
          </span>
        </div>

        {/* Eliminadas */}
        <div className="border-2 border-black p-2 bg-neutral-50 shadow-[2px_2px_0px_#000000] flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-neutral-500">Eliminadas:</span>
          <span className="font-bold text-sm tabular-nums flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            {clearedScores.length}
          </span>
        </div>

        {/* Racha / Combo */}
        <div className="border-2 border-black p-2 bg-neutral-50 shadow-[2px_2px_0px_#000000] flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-neutral-500 flex items-center gap-1">
            <Flame className="w-3 h-3 text-black fill-black" />
            <span>Racha:</span>
          </span>
          <span className="font-bold text-sm tabular-nums">{comboStreak}</span>
        </div>

        {/* Tiempo o Cronómetro */}
        <div className="border-2 border-black p-2 bg-neutral-50 shadow-[2px_2px_0px_#000000] flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-neutral-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{gameMode === 'blitz' ? 'Tiempo:' : 'Supervivencia:'}</span>
          </span>
          <span className="font-bold text-sm tabular-nums">
            {gameMode === 'blitz' ? `${blitzTimer}s` : `${survivalTime}s`}
          </span>
        </div>
      </div>

      {/* 4. LIENZO Y ESTADO DE JUEGO */}
      <div className="relative w-full flex flex-col items-center justify-center">
        {/* Banner de Feedback instantáneo */}
        {flashBanner && (
          <div
            className={`absolute top-3 z-20 px-3 py-1.5 font-mono text-xs font-bold border-2 shadow-[3px_3px_0px_#000000] animate-bounce ${
              flashBanner.positive ? 'bg-black text-white border-white' : 'bg-red-600 text-white border-black'
            }`}
          >
            {flashBanner.text}
          </div>
        )}

        {/* Pantalla de inicio previa */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 border-2 border-black z-30 text-center font-mono animate-fade-in">
            <Zap className="w-12 h-12 text-black mb-2 animate-bounce stroke-[2.5]" />
            <h3 className="text-2xl font-bold font-display uppercase tracking-tight">
              Avalancha de Trazos
            </h3>
            <p className="text-xs text-neutral-600 mt-1 max-w-md">
              Las líneas van apareciendo según tu lección activa (<strong>{selectedNode.code} · {selectedNode.title}</strong>).
              Trázalas de <strong>① a ②</strong> con nota <strong>≥70%</strong> para eliminarlas.
              ¡Si fallas no se quitarán y se acumularán hasta desbordar la pantalla (máx. 6)!
            </p>

            <div className="my-4 p-3 border-2 border-black bg-neutral-50 text-xs w-64 space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-500">Récord Supervivencia:</span>
                <span className="font-bold">{highScores.survival} líneas</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Récord Blitz (60s):</span>
                <span className="font-bold">{highScores.blitz} líneas</span>
              </div>
            </div>

            <button
              onClick={() => startGame(gameMode)}
              className="btn-ink px-6 py-2.5 text-xs uppercase font-bold flex items-center gap-2 cursor-pointer shadow-[3px_3px_0px_#000000]"
            >
              <Sparkles className="w-4 h-4 fill-white stroke-none" />
              <span>Empezar Partida ({gameMode === 'survival' ? 'Supervivencia' : 'Blitz 60s'})</span>
            </button>
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

        {/* 5. MODAL DE FIN DE PARTIDA: "luego al final ves cuantas has hecho y la nota" */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 border-2 border-black z-30 text-center font-mono animate-fade-in">
            <Trophy className="w-12 h-12 text-black mb-2 animate-bounce stroke-[2.5]" />
            <h3 className="text-2xl font-bold font-display uppercase tracking-tight">
              {gameOverReason === 'overflow' ? '¡Desbordamiento de Pantalla!' : '¡Tiempo Finalizado!'}
            </h3>
            <p className="text-xs text-neutral-600 mt-1 max-w-sm">
              {gameOverReason === 'overflow'
                ? 'Las líneas se acumularon hasta saturar el lienzo.'
                : 'Completaste los 60 segundos de alta velocidad.'}
            </p>

            {/* TABLA DE RESULTADOS: CUÁNTAS HAS HECHO Y LA NOTA */}
            <div className="my-4 p-3.5 border-2 border-black bg-neutral-50 w-72 space-y-2 text-xs shadow-[3px_3px_0px_#000000]">
              <div className="flex justify-between items-center pb-1 border-b border-neutral-300">
                <span className="text-neutral-500 font-bold uppercase text-[10px]">Líneas Eliminadas:</span>
                <span className="font-bold text-sm bg-black text-white px-1.5 py-0.2">
                  {clearedScores.length} líneas
                </span>
              </div>
              <div className="flex justify-between items-center pb-1 border-b border-neutral-300">
                <span className="text-neutral-500 font-bold uppercase text-[10px]">Nota Media:</span>
                <span className="font-bold text-sm">
                  {averageGrade}%
                </span>
              </div>
              <div className="flex justify-between items-center pb-1 border-b border-neutral-300">
                <span className="text-neutral-500 font-bold uppercase text-[10px]">Mejor Precisión:</span>
                <span className="font-bold text-sm">
                  {clearedScores.length > 0 ? `${Math.max(...clearedScores)}%` : '0%'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-1 border-b border-neutral-300">
                <span className="text-neutral-500 font-bold uppercase text-[10px]">Racha Máxima:</span>
                <span className="font-bold text-sm">{bestCombo} seguidas</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 font-bold uppercase text-[10px]">Nivel:</span>
                <span className="font-bold truncate max-w-[140px] text-right">{selectedNode.code}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => startGame(gameMode)}
                className="btn-ink px-4 py-2 text-xs uppercase font-bold flex items-center gap-1.5 cursor-pointer shadow-[3px_3px_0px_#000000]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reintentar</span>
              </button>
              <button
                onClick={() => setGameState('idle')}
                className="btn-ink-outline px-4 py-2 text-xs uppercase font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
              >
                <span>Cambiar Nivel</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. BARRA INFERIOR DE INSTRUCCIÓN DIDÁCTICA */}
      {lastEval && gameState === 'playing' && (
        <div className="w-full p-2 border-2 border-black bg-white shadow-[2px_2px_0px_#000000] font-mono text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 font-bold border border-black ${
                lastEval.passed ? 'bg-black text-white' : 'bg-red-100 text-red-800'
              }`}
            >
              Último intento: {lastEval.score}%
            </span>
            <span className="text-[11px] text-neutral-600 font-sans">
              {lastEval.passed
                ? '¡Línea superada y eliminada!'
                : `Error (${lastEval.avgDistPx}px). No se elimina hasta alcanzar ≥70%.`}
            </span>
          </div>

          <span className="text-[10px] text-neutral-500 hidden sm:inline">
            Umbral mínimo: 70%
          </span>
        </div>
      )}
    </div>
  );
};
