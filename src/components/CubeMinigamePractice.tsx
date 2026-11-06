import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LessonNode } from '../lib/curriculumData';
import { CubeChallenge, generateCubeChallenge } from '../lib/geometry';
import { validateCubeDrawing, UserStroke, ValidationFeedback, countDetectedAristas } from '../lib/validation';
import { AvatarMood } from '../lib/avatarTypes';
import {
  Clock,
  Heart,
  Trophy,
  RotateCcw,
  Undo2,
  Trash2,
  Check,
  Star,
  Hourglass,
  Pen,
  Hand,
  PanelLeft,
} from 'lucide-react';

export type CubeGameMode = 'blitz' | 'fever' | 'survival' | 'sprint';

export interface MinigameLiveStats {
  gameMode: CubeGameMode;
  cubesCompleted: number;
  streakCombo: number;
  bestCombo: number;
  timerValue: number;
  survivalLives: number;
  isSpecialCube: boolean;
  specialCubesCount: number;
  avgAccuracy: number;
  highScore: number;
}

export interface CubeMinigamePracticeProps {
  gameMode: CubeGameMode;
  lesson: LessonNode;
  onExit: () => void;
  onSwitchMinigame: () => void;
  onAwardXP: (amount: number) => void;
  onAvatarMoodChange?: (mood: AvatarMood) => void;
  onDrawingStateChange?: (isDrawing: boolean) => void;
  onToggleSidebar?: () => void;
  onUpdateStats?: (stats: MinigameLiveStats) => void;
}

interface HighScoreData {
  [key: string]: number;
}

/**
 * Dibuja una estrella técnica entintada de 5 puntas centrada
 */
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes = 5,
  outerRadius = 18,
  innerRadius = 8
) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}

export const CubeMinigamePractice: React.FC<CubeMinigamePracticeProps> = ({
  gameMode,
  lesson,
  onExit,
  onSwitchMinigame,
  onAwardXP,
  onAvatarMoodChange,
  onDrawingStateChange,
  onToggleSidebar,
  onUpdateStats,
}) => {
  // Estado del juego
  const [gameState, setGameState] = useState<'playing' | 'gameover'>('playing');

  // Modo táctil en móviles: 'draw' | 'scroll'
  const [touchMode, setTouchMode] = useState<'draw' | 'scroll'>('draw');

  // Estadísticas de la partida activa
  const [cubesCompleted, setCubesCompleted] = useState<number>(0);
  const [scoresList, setScoresList] = useState<number[]>([]);
  const [streakCombo, setStreakCombo] = useState<number>(0);
  const [bestCombo, setBestCombo] = useState<number>(0);

  // Temporizadores y vidas
  const [blitzTime, setBlitzTime] = useState<number>(60);
  const [survivalLives, setSurvivalLives] = useState<number>(3);
  const [survivalTime, setSurvivalTime] = useState<number>(20);
  const [sprintTime, setSprintTime] = useState<number>(0);

  // Modo Fiebre de Tiempo (Time Fever)
  const [feverTime, setFeverTime] = useState<number>(25);
  const [isSpecialCube, setIsSpecialCube] = useState<boolean>(() =>
    gameMode === 'fever' ? Math.random() < 0.28 : false
  );
  const [specialCubesCount, setSpecialCubesCount] = useState<number>(0);

  // Flash visual tipo arcade
  const [flashMessage, setFlashMessage] = useState<{ text: string; positive: boolean } | null>(null);

  // Récords guardados en LocalStorage
  const [highScores, setHighScores] = useState<HighScoreData>(() => {
    try {
      const saved = localStorage.getItem('paplitz_minigame_records');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const saveHighScore = (mode: CubeGameMode, lessonCode: string, score: number, isLowerBetter = false) => {
    const key = `${mode}_${lessonCode}`;
    setHighScores((prev) => {
      const existing = prev[key];
      let updated = false;
      if (existing === undefined) {
        updated = true;
      } else if (isLowerBetter ? score < existing : score > existing) {
        updated = true;
      }

      if (updated) {
        const next = { ...prev, [key]: score };
        localStorage.setItem('paplitz_minigame_records', JSON.stringify(next));
        return next;
      }
      return prev;
    });
  };

  // Desafío y trazos
  const [challenge, setChallenge] = useState<CubeChallenge>(() => {
    return generateCubeChallenge(Math.floor(Math.random() * 1000000), 600, 540, {
      mode: lesson.perspectiveMode,
      axesMode: lesson.axesMode,
      forceSide: lesson.forceSide,
      isShadowLevel: lesson.isShadowLevel,
      hasGroundGrid: lesson.hasGroundGrid,
    });
  });

  const [strokes, setStrokes] = useState<UserStroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [feedback, setFeedback] = useState<ValidationFeedback | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<{ x: number; y: number; pressure?: number; time: number }[]>([]);
  const timerIntervalRef = useRef<number | null>(null);

  // Generar un nuevo cubo
  const spawnNextCube = useCallback(() => {
    const seed = Math.floor(Math.random() * 1000000);
    const nextCh = generateCubeChallenge(seed, 600, 540, {
      mode: lesson.perspectiveMode,
      axesMode: lesson.axesMode,
      forceSide: lesson.forceSide,
      isShadowLevel: lesson.isShadowLevel,
      hasGroundGrid: lesson.hasGroundGrid,
    });
    setChallenge(nextCh);
    setStrokes([]);
    setFeedback(null);

    if (gameMode === 'survival') {
      setSurvivalTime(20);
    } else if (gameMode === 'fever') {
      setIsSpecialCube(Math.random() < 0.28);
    } else {
      setIsSpecialCube(false);
    }
  }, [lesson, gameMode]);

  // Reiniciar partida
  const restartGame = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setCubesCompleted(0);
    setScoresList([]);
    setStreakCombo(0);
    setBestCombo(0);
    setBlitzTime(60);
    setSurvivalLives(3);
    setSurvivalTime(20);
    setSprintTime(0);
    setFeverTime(25);
    setSpecialCubesCount(0);
    setFlashMessage(null);
    setGameState('playing');
    spawnNextCube();
  }, [spawnNextCube]);

  // Terminar partida
  const endGame = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setGameState('gameover');
  }, []);

  const triggerFlash = (text: string, positive: boolean) => {
    setFlashMessage({ text, positive });
    setTimeout(() => {
      setFlashMessage(null);
    }, 1200);
  };

  // Pérdida de vida por tiempo en Supervivencia
  const handleSurvivalTimeout = useCallback(() => {
    triggerFlash('¡TIEMPO AGOTADO! -1 VIDA', false);
    setSurvivalLives((prev) => {
      const nextLives = prev - 1;
      if (nextLives <= 0) {
        endGame();
      } else {
        spawnNextCube();
      }
      return nextLives;
    });
  }, [endGame, spawnNextCube]);

  // Loop de tiempo según el modo
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = window.setInterval(() => {
      if (gameMode === 'blitz') {
        setBlitzTime((prev) => {
          const next = Math.max(0, Math.round((prev - 0.1) * 10) / 10);
          if (next <= 0) {
            endGame();
          }
          return next;
        });
      } else if (gameMode === 'fever') {
        setFeverTime((prev) => {
          const next = Math.max(0, Math.round((prev - 0.1) * 10) / 10);
          if (next <= 0) {
            endGame();
          }
          return next;
        });
      } else if (gameMode === 'survival') {
        setSurvivalTime((prev) => {
          const next = Math.max(0, Math.round((prev - 0.1) * 10) / 10);
          if (next <= 0) {
            handleSurvivalTimeout();
          }
          return next;
        });
      } else if (gameMode === 'sprint') {
        setSprintTime((prev) => Math.round((prev + 0.1) * 10) / 10);
      }
    }, 100);

    timerIntervalRef.current = interval;
    return () => clearInterval(interval);
  }, [gameState, gameMode, endGame, handleSurvivalTimeout]);

  // Recompensas al terminar juego
  useEffect(() => {
    if (gameState === 'gameover') {
      if (gameMode === 'blitz') {
        saveHighScore('blitz', lesson.code, cubesCompleted);
        const xpEarned = cubesCompleted * 20;
        if (xpEarned > 0) onAwardXP(xpEarned);
      } else if (gameMode === 'fever') {
        saveHighScore('fever', lesson.code, cubesCompleted);
        const xpEarned = cubesCompleted * 25 + specialCubesCount * 15;
        if (xpEarned > 0) onAwardXP(xpEarned);
      } else if (gameMode === 'survival') {
        saveHighScore('survival', lesson.code, bestCombo);
        const xpEarned = cubesCompleted * 25;
        if (xpEarned > 0) onAwardXP(xpEarned);
      } else if (gameMode === 'sprint') {
        if (cubesCompleted >= 5) {
          saveHighScore('sprint', lesson.code, sprintTime, true);
          onAwardXP(50);
        }
      }
    }
  }, [gameState]);

  // Notificar al avatar y al panel lateral
  useEffect(() => {
    onDrawingStateChange?.(isDrawing);
  }, [isDrawing, onDrawingStateChange]);

  const avgAccuracy =
    scoresList.length > 0
      ? Math.round(scoresList.reduce((a, b) => a + b, 0) / scoresList.length)
      : 0;

  useEffect(() => {
    if (onUpdateStats) {
      const recordKey = `${gameMode}_${lesson.code}`;
      const rec = highScores[recordKey] ?? 0;
      const timerVal =
        gameMode === 'blitz'
          ? blitzTime
          : gameMode === 'fever'
          ? feverTime
          : gameMode === 'survival'
          ? survivalTime
          : sprintTime;

      onUpdateStats({
        gameMode,
        cubesCompleted,
        streakCombo,
        bestCombo,
        timerValue: timerVal,
        survivalLives,
        isSpecialCube,
        specialCubesCount,
        avgAccuracy,
        highScore: rec,
      });
    }
  }, [
    gameMode,
    cubesCompleted,
    streakCombo,
    bestCombo,
    blitzTime,
    feverTime,
    survivalTime,
    sprintTime,
    survivalLives,
    isSpecialCube,
    specialCubesCount,
    avgAccuracy,
    highScores,
    lesson.code,
    onUpdateStats,
  ]);

  // Deshacer trazo
  const handleUndo = () => {
    if (strokes.length === 0 || gameState !== 'playing') return;
    onAvatarMoodChange?.('surprised');
    if (gameMode === 'fever') {
      setFeverTime((prev) => Math.max(0, Math.round((prev - 2) * 10) / 10));
      triggerFlash('DESHACER: -2s', false);
    }
    setStrokes((prev) => prev.slice(0, -1));
  };

  // Borrar trazos
  const handleClear = () => {
    if (gameMode === 'fever' || strokes.length === 0 || gameState !== 'playing') return;
    setStrokes([]);
  };

  // Validación rápida al comprobar
  const handleValidate = () => {
    if (countDetectedAristas(strokes) === 0 || gameState !== 'playing') return;

    const res = validateCubeDrawing(challenge, strokes);
    setFeedback(res);

    if (res.passed) {
      if (isSpecialCube) {
        onAvatarMoodChange?.('speed-lightning');
      } else if (streakCombo + 1 >= 3) {
        onAvatarMoodChange?.('streak-fire');
      } else {
        onAvatarMoodChange?.('success-stars');
      }

      const newCount = cubesCompleted + 1;
      setCubesCompleted(newCount);
      setScoresList((prev) => [...prev, res.score]);

      const newCombo = streakCombo + 1;
      setStreakCombo(newCombo);
      if (newCombo > bestCombo) setBestCombo(newCombo);

      if (gameMode === 'fever') {
        const addSeconds = isSpecialCube ? 20 : 8;
        setFeverTime((prev) => Math.min(99, Math.round((prev + addSeconds) * 10) / 10));
        if (isSpecialCube) {
          setSpecialCubesCount((c) => c + 1);
          triggerFlash(`¡CUBO ESTRELLA APROBADO (${res.score}%)! +20s`, true);
        } else {
          triggerFlash(`¡APROBADO (${res.score}%)! +8s`, true);
        }
      } else {
        triggerFlash(`¡APROBADO (${res.score}%)! +1 CUBO`, true);
      }

      if (gameMode === 'sprint' && newCount >= 5) {
        endGame();
        return;
      }

      setTimeout(() => {
        spawnNextCube();
      }, 350);
    } else {
      onAvatarMoodChange?.('fail-spiral');
      setStreakCombo(0);

      if (gameMode === 'blitz') {
        triggerFlash(`SUSPENSO (${res.score}%) -3s`, false);
        setBlitzTime((prev) => Math.max(0, Math.round((prev - 3) * 10) / 10));
      } else if (gameMode === 'fever') {
        triggerFlash(`SUSPENSO (${res.score}%). El reloj sigue corriendo`, false);
      } else if (gameMode === 'survival') {
        triggerFlash(`SUSPENSO (${res.score}%) -1 VIDA`, false);
        setSurvivalLives((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            endGame();
          } else {
            setTimeout(() => {
              spawnNextCube();
            }, 500);
          }
          return next;
        });
      } else {
        triggerFlash(`SUSPENSO (${res.score}%). Corrige o salta`, false);
      }
    }
  };

  // Renderizado del canvas con alta definición HiDPI / Retina responsive
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = 600;
    const height = 540;
    const targetW = Math.round(width * dpr);
    const targetH = Math.round(height * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // Cara dada en perspectiva
    const facePoints = challenge.givenFace.vertices.map((idx) => challenge.vertices2D[idx]);
    if (facePoints.length === 4) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(facePoints[0].x, facePoints[0].y);
      for (let i = 1; i < 4; i++) {
        ctx.lineTo(facePoints[i].x, facePoints[i].y);
      }
      ctx.closePath();
      ctx.clip();

      // Screentone manga en perspectiva
      const pBottomFront = challenge.vertices2D[0];
      const pTopFront = challenge.vertices2D[1];
      const isLeft = challenge.givenSide === 'left';
      const pBottomSide = isLeft ? challenge.vertices2D[2] : challenge.vertices2D[4];
      const pTopSide = isLeft ? challenge.vertices2D[3] : challenge.vertices2D[5];

      ctx.fillStyle = '#111111';
      const stepsU = 16;
      const stepsV = 16;

      for (let i = 1; i < stepsU; i++) {
        const u = i / stepsU;
        const colBottomX = pBottomFront.x + (pBottomSide.x - pBottomFront.x) * u;
        const colBottomY = pBottomFront.y + (pBottomSide.y - pBottomFront.y) * u;
        const colTopX = pTopFront.x + (pTopSide.x - pTopFront.x) * u;
        const colTopY = pTopFront.y + (pTopSide.y - pTopFront.y) * u;
        const dotRadius = 1.4 - u * 0.45;

        for (let j = 1; j < stepsV; j++) {
          const v = j / stepsV;
          const px = colBottomX + (colTopX - colBottomX) * v;
          const py = colBottomY + (colTopY - colBottomY) * v;
          ctx.beginPath();
          ctx.arc(px, py, Math.max(0.6, dotRadius), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // Aristas entintadas firmes de la cara dada
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(facePoints[0].x, facePoints[0].y);
      for (let i = 1; i < 4; i++) {
        ctx.lineTo(facePoints[i].x, facePoints[i].y);
      }
      ctx.closePath();
      ctx.stroke();

      // Marcar los 4 vértices dados con círculos negros
      facePoints.forEach((p) => {
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // ESTRELLA TÉCNICA DEL CUBO ESPECIAL (Fiebre de Tiempo)
      if (gameMode === 'fever' && isSpecialCube) {
        const cx = (facePoints[0].x + facePoints[1].x + facePoints[2].x + facePoints[3].x) / 4;
        const cy = (facePoints[0].y + facePoints[1].y + facePoints[2].y + facePoints[3].y) / 4;

        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#000000';
        drawStar(ctx, cx, cy, 5, 19, 8);
        ctx.fill();
        ctx.restore();
      }
    }

    // Ejes si la lección los incluye
    if (challenge.axes && challenge.axes.length > 0) {
      ctx.save();
      const origin = challenge.axes[0].origin;

      challenge.axes.forEach((axis) => {
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([6, 3.5]);
        ctx.beginPath();
        ctx.moveTo(axis.origin.x, axis.origin.y);
        ctx.lineTo(axis.farPoint.x, axis.farPoint.y);
        ctx.stroke();

        ctx.setLineDash([]);
        const theta = Math.atan2(axis.farPoint.y - axis.origin.y, axis.farPoint.x - axis.origin.x);
        const arrowSize = 5.5;
        ctx.beginPath();
        ctx.moveTo(axis.farPoint.x, axis.farPoint.y);
        ctx.lineTo(
          axis.farPoint.x - arrowSize * Math.cos(theta - Math.PI / 6),
          axis.farPoint.y - arrowSize * Math.sin(theta - Math.PI / 6)
        );
        ctx.moveTo(axis.farPoint.x, axis.farPoint.y);
        ctx.lineTo(
          axis.farPoint.x - arrowSize * Math.cos(theta + Math.PI / 6),
          axis.farPoint.y - arrowSize * Math.sin(theta + Math.PI / 6)
        );
        ctx.stroke();

        const tagDist = 12;
        const tagX = axis.farPoint.x + Math.cos(theta) * tagDist;
        const tagY = axis.farPoint.y + Math.sin(theta) * tagDist;

        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.fillRect(tagX - 7.5, tagY - 7.5, 15, 15);
        ctx.strokeRect(tagX - 7.5, tagY - 7.5, 15, 15);

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(axis.label, tagX, tagY + 0.5);
      });

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Trazos del usuario
    ctx.strokeStyle = '#000000';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    strokes.forEach((s) => {
      if (s.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) {
        const p = s.points[i].pressure ?? 0.5;
        ctx.lineWidth = 1.8 + p * 2.8;
        ctx.lineTo(s.points[i].x, s.points[i].y);
      }
      ctx.stroke();
    });

    // Trazo en curso
    if (isDrawing && currentStrokeRef.current.length > 1) {
      const pts = currentStrokeRef.current;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i].pressure ?? 0.5;
        ctx.lineWidth = 1.8 + p * 2.8;
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }, [challenge, strokes, isDrawing, gameMode, isSpecialCube]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    const handleResize = () => {
      render();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [render]);

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        if (countDetectedAristas(strokes) > 0) {
          handleValidate();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [strokes, gameState, gameMode]);

  // Coordenadas normalizadas a 600x540
  const getNormalizedCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = 600 / rect.width;
    const scaleY = 540 / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      pressure: e.pressure && e.pressure > 0 ? e.pressure : 0.5,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;
    if (touchMode === 'scroll' && e.pointerType === 'touch') {
      return;
    }
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignorar
    }
    const { x, y, pressure } = getNormalizedCoords(e);
    currentStrokeRef.current = [{ x, y, pressure, time: Date.now() }];
    isDrawingRef.current = true;
    setIsDrawing(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const { x, y, pressure } = getNormalizedCoords(e);
    currentStrokeRef.current.push({ x, y, pressure, time: Date.now() });
    render();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Ignorar
      }
    }
    if (currentStrokeRef.current.length > 1) {
      const strokePoints = [...currentStrokeRef.current];
      setStrokes((prev) => [...prev, { points: strokePoints }]);
    }
    currentStrokeRef.current = [];
  };

  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center select-none bg-white pattern-grid-paper">
      {/* Barra superior de progreso de tiempo según modo */}
      {gameMode === 'fever' && (
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-neutral-200 pointer-events-none z-30">
          <div
            className={`h-full transition-all duration-100 ${
              feverTime <= 6 ? 'bg-black animate-pulse' : 'bg-neutral-800'
            }`}
            style={{ width: `${Math.min(100, (feverTime / 40) * 100)}%` }}
          />
        </div>
      )}
      {gameMode === 'blitz' && (
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-neutral-200 pointer-events-none z-30">
          <div
            className={`h-full transition-all duration-100 ${
              blitzTime <= 10 ? 'bg-black animate-pulse' : 'bg-neutral-800'
            }`}
            style={{ width: `${(blitzTime / 60) * 100}%` }}
          />
        </div>
      )}
      {gameMode === 'survival' && (
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-neutral-200 pointer-events-none z-30">
          <div
            className={`h-full transition-all duration-100 ${
              survivalTime <= 5 ? 'bg-black animate-pulse' : 'bg-neutral-800'
            }`}
            style={{ width: `${(survivalTime / 20) * 100}%` }}
          />
        </div>
      )}

      {/* 1. BOTÓN TOGGLE PANEL DEDICADO A LA IZQUIERDA DE LA PANTALLA */}
      {onToggleSidebar && (
        <button
          type="button"
          onClick={onToggleSidebar}
          className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-30 bg-white hover:bg-neutral-100 text-black px-2.5 py-1.5 border-2 border-black shadow-[3px_3px_0px_#000000] text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
          title="Abrir / cerrar panel de práctica"
        >
          <PanelLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Panel</span>
        </button>
      )}

      {/* 2. HUD SUPERIOR: A LA MISMA ALTURA QUE EL BOTÓN PANEL (top-2.5 / top-3) ALINEADO CON EL JUEGO */}
      <div
        className="absolute top-2.5 sm:top-3 z-20 flex items-start justify-between pointer-events-none px-2 sm:px-0"
        style={{
          width: 'min(calc(100% - 130px), 600px, calc((100dvh - 180px) * (600 / 540)))',
        }}
      >
        {/* A la izquierda del juego (por donde está ahora): MODO, NIVEL, SEMILLA Y MODO TÁCTIL EN UNA SOLA TIRA */}
        <div className="pointer-events-auto self-start font-mono text-xs select-none bg-white border-2 border-black p-1 sm:p-1.5 shadow-[3px_3px_0px_#000000] flex items-center gap-1.5 sm:gap-2">
          <span className="text-[10px] font-mono bg-black text-white px-1.5 py-0.5 font-bold uppercase shrink-0 shadow-[1px_1px_0px_#000]">
            {gameMode === 'fever'
              ? 'FIEBRE'
              : gameMode === 'blitz'
              ? 'BLITZ 60s'
              : gameMode === 'survival'
              ? 'SUPERVIVENCIA'
              : 'SPRINT 5'}
          </span>
          <span className="text-xs font-mono font-bold truncate max-w-[80px] sm:max-w-[120px] bg-neutral-100 border border-black px-1.5 py-0.5">
            Nivel {lesson.code}
          </span>
          <span className="text-[9px] font-mono font-bold text-neutral-500 uppercase shrink-0">
            #{challenge.seed}
          </span>

          {/* Toggle de Modo Táctil (Trazo vs Mover) */}
          <div className="flex items-center border border-black ml-0.5">
            <button
              type="button"
              onClick={() => setTouchMode('draw')}
              className={`px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold cursor-pointer transition-colors ${
                touchMode === 'draw' ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-700'
              }`}
              title="Modo Trazo: dibuja aristas"
            >
              <Pen className="w-2.5 h-2.5 inline mr-0.5" />
              Trazo
            </button>
            <button
              type="button"
              onClick={() => setTouchMode('scroll')}
              className={`px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold cursor-pointer transition-colors ${
                touchMode === 'scroll' ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-700'
              }`}
              title="Modo Mover: desplazar con 1 dedo"
            >
              <Hand className="w-2.5 h-2.5 inline mr-0.5" />
              Mover
            </button>
          </div>
        </div>

        {/* A la derecha del juego: ESTADÍSTICAS ARCADE EN VIVO */}
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold pointer-events-auto self-start select-none">
          <div className="bg-white border-2 border-black p-1 sm:p-1.5 shadow-[3px_3px_0px_#000000] flex items-center gap-1.5 sm:gap-2">
            {gameMode === 'fever' && (
              <>
                <div
                  className={`px-1.5 sm:px-2 py-0.5 border border-black flex items-center gap-1 ${
                    feverTime <= 6 ? 'bg-black text-white animate-pulse' : 'bg-white text-black'
                  }`}
                >
                  <Hourglass className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                  <span className="tabular-nums text-xs">{feverTime.toFixed(1)}s</span>
                </div>
                <div className="bg-neutral-100 border border-black px-1.5 sm:px-2 py-0.5 flex items-center gap-1">
                  <span>{cubesCompleted} cubos</span>
                  {specialCubesCount > 0 && (
                    <span className="text-[10px] flex items-center">
                      (<Star className="w-2.5 h-2.5 fill-black text-black inline" />
                      {specialCubesCount})
                    </span>
                  )}
                </div>
              </>
            )}

            {gameMode === 'blitz' && (
              <>
                <div
                  className={`px-1.5 sm:px-2 py-0.5 border border-black flex items-center gap-1 ${
                    blitzTime <= 10 ? 'bg-black text-white animate-pulse' : 'bg-white text-black'
                  }`}
                >
                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                  <span className="tabular-nums text-xs">{blitzTime.toFixed(1)}s</span>
                </div>
                <div className="bg-neutral-100 border border-black px-1.5 sm:px-2 py-0.5">
                  <span>{cubesCompleted} cubos</span>
                </div>
              </>
            )}

            {gameMode === 'survival' && (
              <>
                <div className="flex items-center gap-0.5 px-1 py-0.5">
                  {[1, 2, 3].map((heartIdx) => (
                    <Heart
                      key={heartIdx}
                      className={`w-3.5 h-3.5 ${
                        heartIdx <= survivalLives
                          ? 'fill-black text-black stroke-[2]'
                          : 'fill-none text-neutral-300 stroke-[1.5]'
                      }`}
                    />
                  ))}
                </div>
                <div
                  className={`px-1.5 sm:px-2 py-0.5 border border-black flex items-center gap-1 ${
                    survivalTime <= 5 ? 'bg-black text-white animate-pulse' : 'bg-white text-black'
                  }`}
                >
                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                  <span className="tabular-nums text-xs">{survivalTime.toFixed(1)}s</span>
                </div>
                <div className="bg-neutral-100 border border-black px-1.5 sm:px-2 py-0.5">
                  <span>{streakCombo} combo</span>
                </div>
              </>
            )}

            {gameMode === 'sprint' && (
              <>
                <div className="px-1.5 sm:px-2 py-0.5 border border-black flex items-center gap-1">
                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                  <span className="tabular-nums text-xs">{sprintTime.toFixed(1)}s</span>
                </div>
                <div className="bg-neutral-100 border border-black px-1.5 sm:px-2 py-0.5">
                  <span>{cubesCompleted}/5 cubos</span>
                </div>
              </>
            )}
          </div>

          {/* Badge Cubo Estrella en Fiebre */}
          {gameMode === 'fever' && isSpecialCube && (
            <div className="border-2 border-black bg-black text-white px-2 py-1 text-xs font-mono font-bold flex items-center gap-1 shadow-[3px_3px_0px_#000000] animate-pulse">
              <Star className="w-3.5 h-3.5 fill-white text-white" />
              <span>ESTRELLA (+20s)</span>
            </div>
          )}
        </div>
      </div>

      {/* CONTENEDOR ANCLADO AL JUEGO (Mantiene aspecto exacto 600x540 sin elementos flotantes en medio) */}
      <div
        className="relative aspect-[600/540] max-w-[min(calc(100%-24px),600px)] max-h-[calc(100%-125px)] flex items-center justify-center pointer-events-none"
        style={{
          width: 'min(calc(100% - 24px), 600px, calc((100dvh - 180px) * (600 / 540)))',
          height: 'auto',
          aspectRatio: '600 / 540',
        }}
      >
        <canvas
          ref={canvasRef}
          width={600}
          height={540}
          className={`block w-full h-full z-10 pointer-events-auto ${
            touchMode === 'scroll' ? 'touch-pan-y cursor-grab' : 'touch-none cursor-crosshair'
          }`}
          style={{ touchAction: touchMode === 'scroll' ? 'pan-y' : 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>

      {/* Flash visual de acierto o fallo en pantalla */}
      {flashMessage && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div
            className={`border-4 border-black px-4 py-2 font-mono font-bold text-sm sm:text-base shadow-[4px_4px_0px_#000000] uppercase tracking-wider ${
              flashMessage.positive ? 'bg-black text-white' : 'bg-white text-black'
            }`}
          >
            {flashMessage.text}
          </div>
        </div>
      )}

      {/* Feedback flotante en caso de suspenso */}
      {feedback && !feedback.passed && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="bg-white border-2 border-black px-3 py-1.5 shadow-[3px_3px_0px_#000000] font-mono text-xs flex items-center gap-2">
            <span className="bg-white text-black border border-black px-1.5 py-0.2 font-bold uppercase shrink-0">
              {feedback.score}%
            </span>
            <span className="font-bold truncate">{feedback.mainIssueMessage}</span>
            <span className="text-[10px] text-neutral-500 shrink-0">Mínimo: 75%</span>
          </div>
        </div>
      )}

      {/* 3. BARRA DE HERRAMIENTAS FLOTANTE INFERIOR */}
      <div className="absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto font-mono text-xs">
        <div className="bg-white border-2 border-black p-1.5 sm:p-2 shadow-[4px_4px_0px_#000000] flex items-center gap-1.5 sm:gap-2 max-w-[calc(100vw-24px)] overflow-x-auto">
          {/* Contador de aristas */}
          <span className="text-[10px] sm:text-[11px] font-bold text-neutral-700 bg-neutral-100 px-2 py-1 border border-black shadow-[1px_1px_0px_#000000] tabular-nums whitespace-nowrap">
            {countDetectedAristas(strokes)}/{challenge.targetEdges.length} aristas
          </span>

          {/* Deshacer */}
          <button
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="btn-ink-outline p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-mono disabled:opacity-30 cursor-pointer flex items-center gap-1 shadow-[1px_1px_0px_#000000]"
            title={
              gameMode === 'fever'
                ? 'Deshacer último trazo (Penaliza -2s en Fiebre)'
                : 'Deshacer último trazo (Ctrl+Z)'
            }
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Deshacer</span>
            {gameMode === 'fever' && (
              <span className="text-[9px] bg-black text-white px-1 ml-0.5 font-bold">-2s</span>
            )}
          </button>

          {/* Borrar */}
          <button
            onClick={handleClear}
            disabled={gameMode === 'fever' || strokes.length === 0}
            className={`btn-ink-outline p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-mono flex items-center gap-1 shadow-[1px_1px_0px_#000000] ${
              gameMode === 'fever'
                ? 'opacity-30 line-through cursor-not-allowed text-neutral-400 border-neutral-300'
                : 'disabled:opacity-30 cursor-pointer hover:bg-red-50 hover:text-red-700'
            }`}
            title={
              gameMode === 'fever'
                ? 'Borrar todo NO está permitido en Fiebre de Tiempo'
                : 'Borrar todos los trazos'
            }
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Borrar</span>
          </button>

          {/* Comprobar */}
          <button
            onClick={handleValidate}
            disabled={countDetectedAristas(strokes) === 0}
            className="btn-ink py-1.5 px-3 sm:px-4 text-xs font-mono uppercase font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000] disabled:opacity-30 disabled:pointer-events-none"
            title="Comprobar perspectiva (Enter)"
          >
            <span>Comprobar</span>
            <Check className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* 4. MODAL DE GAME OVER / RESUMEN DE PARTIDA */}
      {gameState === 'gameover' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="card-ink bg-white max-w-md w-full p-6 relative shadow-[8px_8px_0px_#000000] text-center font-mono">
            <span className="text-[10px] font-mono uppercase tracking-widest bg-black text-white px-2 py-0.5 font-bold">
              PARTIDA FINALIZADA
            </span>

            <h2 className="text-3xl font-bold font-display mt-2 mb-1">
              {gameMode === 'fever'
                ? '¡Fin del Tiempo!'
                : gameMode === 'blitz'
                ? '¡Tiempo Agotado!'
                : gameMode === 'survival'
                ? '¡Sin Vidas!'
                : '¡Sprint Completado!'}
            </h2>

            <p className="text-xs font-sans text-neutral-600 mb-6">
              Nivel {lesson.code} · {lesson.title}
            </p>

            {/* Tarjetas de Resultados */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="border-2 border-black bg-neutral-50 p-3">
                <span className="text-[10px] font-mono uppercase text-neutral-500 block">
                  {gameMode === 'sprint' ? 'Tiempo Final' : 'Cubos Aprobados'}
                </span>
                <span className="text-2xl font-bold font-display">
                  {gameMode === 'sprint' ? `${sprintTime.toFixed(1)}s` : cubesCompleted}
                </span>
                {gameMode === 'fever' && specialCubesCount > 0 && (
                  <span className="text-[10px] font-mono text-neutral-600 block mt-1 font-bold">
                    ★ {specialCubesCount} {specialCubesCount === 1 ? 'estrella' : 'estrellas'}
                  </span>
                )}
              </div>

              <div className="border-2 border-black bg-neutral-50 p-3">
                <span className="text-[10px] font-mono uppercase text-neutral-500 block">
                  {gameMode === 'survival' ? 'Racha Máxima' : 'Precisión Media'}
                </span>
                <span className="text-2xl font-bold font-display">
                  {gameMode === 'survival' ? `${bestCombo} cubos` : `${avgAccuracy}%`}
                </span>
              </div>
            </div>

            {/* Recompensa XP */}
            <div className="border-2 border-black bg-white p-2.5 mb-6 flex items-center justify-between text-xs font-mono font-bold">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 stroke-[2.5]" />
                <span>Recompensa de Práctica:</span>
              </div>
              <span className="bg-black text-white px-2 py-0.5">
                +
                {gameMode === 'fever'
                  ? cubesCompleted * 25 + specialCubesCount * 15
                  : gameMode === 'blitz'
                  ? cubesCompleted * 20
                  : gameMode === 'survival'
                  ? cubesCompleted * 25
                  : 50}{' '}
                XP
              </span>
            </div>

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={restartGame}
                className="btn-ink w-full py-2.5 text-xs font-mono uppercase font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-[3px_3px_0px_#000000]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Jugar de Nuevo</span>
              </button>
              <button
                type="button"
                onClick={onSwitchMinigame}
                className="btn-ink-outline w-full py-2.5 text-xs font-mono uppercase font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
              >
                <span>Otro Minijuego</span>
              </button>
              <button
                type="button"
                onClick={onExit}
                className="w-full py-2 text-xs font-mono uppercase font-bold text-neutral-600 hover:text-black cursor-pointer hover:underline"
              >
                Volver a Práctica
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
