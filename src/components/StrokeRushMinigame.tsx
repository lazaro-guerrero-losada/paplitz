import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Zap,
  Flame,
  Trophy,
  RotateCcw,
  Clock,
  Check,
  Undo2,
  Sparkles,
  Shuffle,
  Target,
  AlertTriangle,
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
    sumRev += Math.hypot(sUser[i].x - sLine[N - 1 - i].x, sLine[N - 1 - i].y - sUser[i].y);
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

  // Selección de ejercicios: Modo Aleatorio (cada trazo diferente) vs Por Nivel
  const [isRandomMode, setIsRandomMode] = useState<boolean>(true);
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

  // Récords según modo aleatorio o nodo específico
  const scoreKey = isRandomMode ? 'random' : selectedNode.code;
  const [highScores, setHighScores] = useState<{ survival: number; blitz: number }>({ survival: 0, blitz: 0 });

  useEffect(() => {
    try {
      const s = localStorage.getItem(`paplitz_rush_survival_${scoreKey}`) || '0';
      const b = localStorage.getItem(`paplitz_rush_blitz_${scoreKey}`) || '0';
      setHighScores({ survival: parseInt(s, 10), blitz: parseInt(b, 10) });
    } catch {
      setHighScores({ survival: 0, blitz: 0 });
    }
  }, [scoreKey]);

  // Trazado en curso
  const [userStroke, setUserStroke] = useState<Point[] | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const currentStrokeRef = useRef<Point[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spawnTimerRef = useRef<number | null>(null);
  const gameLoopRef = useRef<number | null>(null);

  // Máximo número de líneas simultáneas antes de desbordamiento (Game Over)
  const MAX_LINES_OVERFLOW = 6;

  // Genera una nueva línea basada en un nodo de calistenia
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

      // Si no hay puntos generados, fallback a línea horizontal
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

  // Selector dinámico de la siguiente línea: Aleatoria de cualquier ejercicio o del nivel elegido
  const spawnNextLine = useCallback(
    (existingLines: ActiveRushLine[]): ActiveRushLine => {
      const nodeToUse = isRandomMode
        ? (calNodes[Math.floor(Math.random() * calNodes.length)] || selectedNode)
        : selectedNode;
      return spawnLineForNode(nodeToUse, existingLines);
    },
    [isRandomMode, calNodes, selectedNode, spawnLineForNode]
  );

  // Iniciar partida
  const startGame = useCallback((mode: 'survival' | 'blitz' = gameMode) => {
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

    // Inicializar con 2 líneas en pantalla de inmediato
    const firstLine = spawnNextLine([]);
    const secondLine = spawnNextLine([firstLine]);
    setActiveLines([firstLine, secondLine]);
  }, [gameMode, spawnNextLine]);

  // Fin de la partida
  const finishGame = useCallback(
    (reason: 'overflow' | 'timeout') => {
      setGameOverReason(reason);
      setGameState('gameover');
      if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
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
            localStorage.setItem(`paplitz_rush_survival_${scoreKey}`, count.toString());
          } catch {
            // Ignorar
          }
        }
      } else {
        if (count > highScores.blitz) {
          setHighScores((prev) => ({ ...prev, blitz: count }));
          try {
            localStorage.setItem(`paplitz_rush_blitz_${scoreKey}`, count.toString());
          } catch {
            // Ignorar
          }
        }
      }

      const xpEarned = Math.round(count * 14 + (clearedScores.length > 0 ? (clearedScores.reduce((a, b) => a + b, 0) / count) * 0.3 : 0));
      if (xpEarned > 0 && onAwardXP) {
        onAwardXP(xpEarned);
      }

      if (onAvatarMoodChange) {
        onAvatarMoodChange(count > 6 ? 'success-stars' : 'fail-spiral');
        setTimeout(() => onAvatarMoodChange('neutral'), 3000);
      }
    },
    [clearedScores, gameMode, highScores, onAvatarMoodChange, onAwardXP, scoreKey]
  );

  // Spawner dinámico e inteligente: mucho más rápido y sin esperas si hay pocas o cero líneas
  useEffect(() => {
    if (gameState !== 'playing') return;

    let delayMs: number;
    const count = activeLines.length;

    if (count === 0) {
      // 0 líneas en pantalla: spawn casi instantáneo (280ms) para cero aburrimiento
      delayMs = 280;
    } else if (count === 1) {
      // 1 línea: aparición rápida y viva
      const speedUp = Math.min(450, clearedScores.length * 30);
      delayMs = Math.max(750, 1200 - speedUp);
    } else {
      // Líneas acumuladas (2, 3, 4, 5):
      // El ritmo varía adaptativamente según la acumulación y las líneas resueltas
      const baseDelay = 1750 + (count - 2) * 150;
      const speedUp = Math.min(750, clearedScores.length * 35);
      delayMs = Math.max(900, baseDelay - speedUp);
    }

    const timer = window.setTimeout(() => {
      setActiveLines((prev) => {
        if (prev.length >= MAX_LINES_OVERFLOW) {
          finishGame('overflow');
          return prev;
        }

        const newLine = spawnNextLine(prev);
        const updated = [...prev, newLine];

        if (updated.length >= MAX_LINES_OVERFLOW) {
          finishGame('overflow');
        }
        return updated;
      });
    }, delayMs);

    spawnTimerRef.current = timer;
    return () => clearTimeout(timer);
  }, [gameState, activeLines.length, clearedScores.length, spawnNextLine, finishGame]);

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

      // Si está en fallo (shake), resalta en rojo técnico; si no, gris con halo
      const strokeColor = isShaking ? '#DC2626' : '#71717A';
      const glowColor = isShaking ? '#FEE2E2' : '#F4F4F5';

      // Halo protector
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

  // Coordenadas normalizadas perfectamente al canvas 600x540
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

    if (evalResult.passed) {
      // APROBADA (≥70%): SE QUITA DE LA PANTALLA
      setActiveLines((prev) => {
        const nextLines = prev.filter((l) => l.id !== targetLine.id);
        // Si al eliminar esta línea la pantalla queda VACÍA (0 líneas),
        // programar un spawn inmediato en 250ms para que nunca haya aburrimiento
        if (nextLines.length === 0) {
          if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
          spawnTimerRef.current = window.setTimeout(() => {
            setActiveLines((cur) => {
              if (cur.length >= MAX_LINES_OVERFLOW) return cur;
              return [...cur, spawnNextLine(cur)];
            });
          }, 250);
        }
        return nextLines;
      });

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
        text: evalResult.score >= 90 ? `¡IMPECABLE! ${evalResult.score}% (Eliminada)` : `¡ELIMINADA! ${evalResult.score}%`,
        positive: true,
      });
      setTimeout(() => setFlashBanner(null), 1500);
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
    <div className="w-full flex-1 flex flex-col md:flex-row overflow-hidden bg-neutral-100 min-h-[calc(100vh-64px)] font-sans select-none">
      {/* 1. BARRA LATERAL IZQUIERDA: TODA LA INFORMACIÓN, CONFIGURACIÓN Y ESTADÍSTICAS */}
      <aside className="w-full md:w-80 bg-white border-r-2 border-black p-3.5 space-y-3 font-mono shadow-[4px_0px_0px_#000000] flex flex-col shrink-0 overflow-y-auto">
        {/* CABECERA Y BOTÓN SALIR */}
        <div className="flex items-center justify-between pb-2 border-b-2 border-black">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-black text-white flex items-center justify-center shadow-[1px_1px_0px_#000000]">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-neutral-500 uppercase block leading-none">
                Minijuego
              </span>
              <span className="text-xs font-bold font-display uppercase tracking-wider text-black">
                Avalancha
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onExit}
            className="btn-ink-outline px-2.5 py-1 text-xs font-bold flex items-center gap-1 cursor-pointer shadow-[1px_1px_0px_#000000]"
            title="Volver al menú de minijuegos"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Volver</span>
          </button>
        </div>

        {/* SELECTOR DE MODALIDAD: SUPERVIVENCIA VS BLITZ */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-neutral-500">Modalidad:</span>
          <div className="grid grid-cols-2 gap-1.5 p-1 border-2 border-black bg-neutral-100 shadow-[2px_2px_0px_#000000]">
            <button
              type="button"
              onClick={() => {
                setGameMode('survival');
                if (gameState === 'playing') startGame('survival');
              }}
              className={`py-1.5 px-2 text-xs font-mono font-bold flex items-center justify-center gap-1 cursor-pointer border border-black transition-colors ${
                gameMode === 'survival'
                  ? 'bg-black text-white shadow-[1px_1px_0px_#000000]'
                  : 'bg-white text-black hover:bg-neutral-200'
              }`}
            >
              <span>Supervivencia</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setGameMode('blitz');
                if (gameState === 'playing') startGame('blitz');
              }}
              className={`py-1.5 px-2 text-xs font-mono font-bold flex items-center justify-center gap-1 cursor-pointer border border-black transition-colors ${
                gameMode === 'blitz'
                  ? 'bg-black text-white shadow-[1px_1px_0px_#000000]'
                  : 'bg-white text-black hover:bg-neutral-200'
              }`}
            >
              <span>Blitz 60s</span>
            </button>
          </div>
        </div>

        {/* SELECTOR DE TRAZOS: MODO ALEATORIO (CADA TRAZO DIFERENTE) VS POR NIVEL */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-neutral-500">Repertorio de Trazos:</span>
          <div className="grid grid-cols-2 gap-1.5 p-1 border-2 border-black bg-neutral-100 shadow-[2px_2px_0px_#000000]">
            <button
              type="button"
              onClick={() => {
                setIsRandomMode(true);
                if (gameState === 'playing') startGame(gameMode);
              }}
              className={`py-1 px-1.5 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer border border-black transition-colors ${
                isRandomMode
                  ? 'bg-black text-white shadow-[1px_1px_0px_#000000]'
                  : 'bg-white text-black hover:bg-neutral-200'
              }`}
              title="Cada línea será un trazo diferente y aleatorio de todo el repertorio"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Aleatorio</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRandomMode(false);
                if (gameState === 'playing') startGame(gameMode);
              }}
              className={`py-1 px-1.5 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer border border-black transition-colors ${
                !isRandomMode
                  ? 'bg-black text-white shadow-[1px_1px_0px_#000000]'
                  : 'bg-white text-black hover:bg-neutral-200'
              }`}
              title="Practicar un ejercicio de trazo específico"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Por Nivel</span>
            </button>
          </div>

          {/* Desplegable de nivel si no es aleatorio */}
          {!isRandomMode ? (
            <div className="pt-1">
              <select
                value={selectedNodeId}
                onChange={(e) => {
                  setSelectedNodeId(e.target.value);
                  if (gameState === 'playing') startGame(gameMode);
                }}
                disabled={gameState === 'playing'}
                className="w-full border-2 border-black p-1.5 text-xs font-mono font-bold bg-white cursor-pointer shadow-[2px_2px_0px_#000000] truncate"
              >
                {calNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.code} · {n.title}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-1.5 bg-neutral-50 border border-black text-[10px] text-neutral-600 leading-tight">
              🎲 <strong>Modo Dinámico:</strong> Cada trazo generado es diferente (horizontales, verticales, diagonales y curvas).
            </div>
          )}
        </div>

        {/* PANEL DE ESTADÍSTICAS EN VIVO */}
        <div className="space-y-2 pt-1 border-t-2 border-black">
          {/* Saturación en pantalla con indicador visual */}
          <div
            className={`border-2 border-black p-2.5 shadow-[2px_2px_0px_#000000] space-y-1.5 ${
              activeLines.length >= 5
                ? 'bg-red-100 text-red-900 border-red-600 animate-pulse'
                : activeLines.length >= 4
                ? 'bg-amber-50 text-amber-900'
                : 'bg-neutral-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold">Líneas en Pantalla:</span>
              <span className="font-bold text-sm tabular-nums">
                {activeLines.length} / {MAX_LINES_OVERFLOW}
              </span>
            </div>
            {/* 6 cuadritos visuales de saturación */}
            <div className="grid grid-cols-6 gap-1">
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  className={`h-2.5 border border-black transition-colors ${
                    idx < activeLines.length
                      ? idx >= 4
                        ? 'bg-red-600'
                        : 'bg-black'
                      : 'bg-white'
                  }`}
                />
              ))}
            </div>
            {activeLines.length >= 4 && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-red-700">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>¡Saturación! Desborda en {MAX_LINES_OVERFLOW - activeLines.length}</span>
              </div>
            )}
          </div>

          {/* Eliminadas & Nota Media */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="border-2 border-black p-2 bg-neutral-50 shadow-[1px_1px_0px_#000000]">
              <div className="text-[9px] uppercase font-bold text-neutral-500">Eliminadas</div>
              <div className="text-base font-black tabular-nums flex items-center gap-1">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                {clearedScores.length}
              </div>
            </div>
            <div className="border-2 border-black p-2 bg-neutral-50 shadow-[1px_1px_0px_#000000]">
              <div className="text-[9px] uppercase font-bold text-neutral-500">Nota Media</div>
              <div className="text-base font-black tabular-nums">
                {averageGrade > 0 ? `${averageGrade}%` : '-'}
              </div>
            </div>
          </div>

          {/* Racha & Tiempo */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="border-2 border-black p-2 bg-neutral-50 shadow-[1px_1px_0px_#000000]">
              <div className="text-[9px] uppercase font-bold text-neutral-500 flex items-center gap-0.5">
                <Flame className="w-3 h-3 text-black fill-black" />
                <span>Racha</span>
              </div>
              <div className="text-base font-black tabular-nums">{comboStreak}</div>
            </div>
            <div className="border-2 border-black p-2 bg-neutral-50 shadow-[1px_1px_0px_#000000]">
              <div className="text-[9px] uppercase font-bold text-neutral-500 flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                <span>{gameMode === 'blitz' ? 'Tiempo' : 'Superv.'}</span>
              </div>
              <div className="text-base font-black tabular-nums">
                {gameMode === 'blitz' ? `${blitzTimer}s` : `${survivalTime}s`}
              </div>
            </div>
          </div>
        </div>

        {/* RÉCORDS */}
        <div className="border-2 border-black p-2 bg-neutral-50 text-[10px] space-y-1 shadow-[1px_1px_0px_#000000]">
          <div className="font-bold text-neutral-700 uppercase pb-0.5 border-b border-neutral-200">
            Mejores Marcas ({isRandomMode ? 'Aleatorio' : selectedNode.code}):
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Récord Supervivencia:</span>
            <span className="font-bold">{highScores.survival}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Récord Blitz:</span>
            <span className="font-bold">{highScores.blitz}</span>
          </div>
        </div>

        {/* BOTÓN INICIAR O REINICIAR */}
        <div className="pt-2 mt-auto">
          {gameState === 'playing' ? (
            <button
              type="button"
              onClick={() => startGame(gameMode)}
              className="w-full btn-ink-outline py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000] hover:bg-neutral-100"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar Partida</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startGame(gameMode)}
              className="w-full btn-ink py-2.5 px-3 text-xs font-bold uppercase flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_#000000] hover:bg-neutral-900"
            >
              <Sparkles className="w-4 h-4 fill-white stroke-none" />
              <span>Empezar Partida</span>
            </button>
          )}
        </div>
      </aside>

      {/* 2. ÁREA CENTRAL: LIENZO CENTRADO EN SU PROPORCIÓN ORIGINAL (SIN ESTIRAR) */}
      <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 overflow-hidden min-h-0 relative">
        <div className="relative flex items-center justify-center select-none touch-none max-w-full">
          {/* Banner de Feedback instantáneo */}
          {flashBanner && (
            <div
              className={`absolute top-3 z-30 px-3 py-1.5 font-mono text-xs font-bold border-2 shadow-[3px_3px_0px_#000000] animate-bounce ${
                flashBanner.positive ? 'bg-black text-white border-white' : 'bg-red-600 text-white border-black'
              }`}
            >
              {flashBanner.text}
            </div>
          )}

          {/* Pantalla de inicio previa sobre el lienzo */}
          {gameState === 'idle' && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 border-2 border-black z-20 text-center font-mono">
              <Zap className="w-12 h-12 text-black mb-2 animate-bounce stroke-[2.5]" />
              <h3 className="text-2xl font-bold font-display uppercase tracking-tight">
                Avalancha de Trazos
              </h3>
              <p className="text-xs text-neutral-600 mt-1 max-w-md">
                {isRandomMode ? (
                  <>Modo Aleatorio activado: traza cada línea diferente de <strong>① a ②</strong> con nota <strong>≥70%</strong> para eliminarla.</>
                ) : (
                  <>Las líneas aparecen según <strong>{selectedNode.code} · {selectedNode.title}</strong>. Traza de <strong>① a ②</strong> con nota <strong>≥70%</strong>.</>
                )}
                <br />
                ¡Si fallas no se quitarán y se acumularán hasta desbordar la pantalla (máx. {MAX_LINES_OVERFLOW})!
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
                type="button"
                onClick={() => startGame(gameMode)}
                className="btn-ink px-6 py-2.5 text-xs uppercase font-bold flex items-center gap-2 cursor-pointer shadow-[3px_3px_0px_#000000] hover:bg-neutral-900"
              >
                <Sparkles className="w-4 h-4 fill-white stroke-none" />
                <span>Empezar Partida ({gameMode === 'survival' ? 'Supervivencia' : 'Blitz 60s'})</span>
              </button>
            </div>
          )}

          {/* Modal de Fin de Partida */}
          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 border-2 border-black z-20 text-center font-mono animate-fade-in">
              <Trophy className="w-12 h-12 text-black mb-2 animate-bounce stroke-[2.5]" />
              <h3 className="text-2xl font-bold font-display uppercase tracking-tight">
                {gameOverReason === 'overflow' ? '¡Desbordamiento de Pantalla!' : '¡Tiempo Finalizado!'}
              </h3>
              <p className="text-xs text-neutral-600 mt-1 max-w-sm">
                {gameOverReason === 'overflow'
                  ? 'Las líneas se acumularon hasta saturar el lienzo (6 líneas).'
                  : 'Completaste los 60 segundos de alta velocidad.'}
              </p>

              {/* TABLA DE RESULTADOS */}
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
                  <span className="text-neutral-500 font-bold uppercase text-[10px]">Modo:</span>
                  <span className="font-bold truncate max-w-[140px] text-right">
                    {isRandomMode ? 'Aleatorio' : selectedNode.code}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startGame(gameMode)}
                  className="btn-ink px-4 py-2 text-xs uppercase font-bold flex items-center gap-1.5 cursor-pointer shadow-[3px_3px_0px_#000000]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reintentar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGameState('idle')}
                  className="btn-ink-outline px-4 py-2 text-xs uppercase font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
                >
                  <span>Configuración</span>
                </button>
              </div>
            </div>
          )}

          {/* LIENZO: PROPORCIÓN EXACTA 600x540 (NUNCA ESTIRADO) */}
          <canvas
            ref={canvasRef}
            width={600}
            height={540}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="border-2 border-black bg-white shadow-[4px_4px_0px_#000000] cursor-crosshair touch-none select-none max-w-full"
            style={{
              width: 'min(100%, min(600px, calc((100vh - 140px) * (600 / 540))))',
              height: 'auto',
              aspectRatio: '600 / 540',
            }}
          />
        </div>

        {/* FEEDBACK DEL ÚLTIMO INTENTO AL PIE DEL LIENZO */}
        {lastEval && gameState === 'playing' && (
          <div className="mt-2 w-full max-w-xl p-2 border-2 border-black bg-white shadow-[2px_2px_0px_#000000] font-mono text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 font-bold border border-black ${
                  lastEval.passed ? 'bg-black text-white' : 'bg-red-100 text-red-800'
                }`}
              >
                {lastEval.passed ? '✓' : '✗'} {lastEval.score}%
              </span>
              <span className="text-[11px] text-neutral-600 font-sans">
                {lastEval.passed
                  ? '¡Línea eliminada!'
                  : `Precisión insuficiente (${lastEval.avgDistPx}px). Requiere ≥70%.`}
              </span>
            </div>

            <span className="text-[10px] text-neutral-500 font-mono">
              Objetivo: ≥70%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
