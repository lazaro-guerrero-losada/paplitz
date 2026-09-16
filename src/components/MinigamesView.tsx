import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LessonNode } from '../lib/curriculumData';
import { CubeChallenge, generateCubeChallenge } from '../lib/geometry';
import { validateCubeDrawing, UserStroke, ValidationFeedback, countDetectedAristas } from '../lib/validation';
import { AvatarMood } from '../lib/avatarTypes';
import { SenseiCubo } from './avatar/SenseiCubo';
import {
  Gamepad2,
  Clock,
  Heart,
  Flame,
  Trophy,
  RotateCcw,
  Undo2,
  Trash2,
  Check,
  Play,
  Filter,
  Compass,
  PenTool,
  SkipForward,
  Zap,
  Star,
  Hourglass,
} from 'lucide-react';

interface MinigamesViewProps {
  unlockedNodes: LessonNode[];
  activeNode: LessonNode;
  onAwardXP: (amount: number) => void;
  onAvatarMoodChange?: (mood: AvatarMood) => void;
  onDrawingStateChange?: (isDrawing: boolean) => void;
}

type GameMode = 'blitz' | 'fever' | 'survival' | 'sprint';

interface HighScoreData {
  [key: string]: number; // ej: "blitz_1.1": 8, "fever_1.1": 12, "sprint_1.1": 42.5
}

/**
 * Función auxiliar para dibujar una estrella técnica de 5 puntas entintada
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

export const MinigamesView: React.FC<MinigamesViewProps> = ({
  unlockedNodes,
  activeNode,
  onAwardXP,
  onAvatarMoodChange,
  onDrawingStateChange,
}) => {
  // Lección seleccionada para el filtro de dificultad
  const [selectedLessonId, setSelectedLessonId] = useState<string>(activeNode.id);
  const currentLesson = unlockedNodes.find((n) => n.id === selectedLessonId) || activeNode;

  // Estado del Minijuego
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');

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
  const [isSpecialCube, setIsSpecialCube] = useState<boolean>(false);
  const [specialCubesCount, setSpecialCubesCount] = useState<number>(0);

  // Flash visual tipo arcade (B&W)
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

  const saveHighScore = (mode: GameMode, lessonCode: string, score: number, isLowerBetter = false) => {
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

  // Desafío y lienzo de dibujo activo
  const [challenge, setChallenge] = useState<CubeChallenge>(() => {
    return generateCubeChallenge(12345, 600, 540, {
      mode: currentLesson.perspectiveMode,
      axesMode: currentLesson.axesMode,
      forceSide: currentLesson.forceSide,
      isShadowLevel: currentLesson.isShadowLevel,
      hasGroundGrid: currentLesson.hasGroundGrid,
    });
  });

  const [strokes, setStrokes] = useState<UserStroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [feedback, setFeedback] = useState<ValidationFeedback | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<{ x: number; y: number; pressure?: number; time: number }[]>([]);
  const timerIntervalRef = useRef<number | null>(null);

  // Generar un nuevo cubo según el nivel seleccionado
  const spawnNextCube = useCallback(() => {
    const seed = Math.floor(Math.random() * 1000000);
    const nextCh = generateCubeChallenge(seed, 600, 540, {
      mode: currentLesson.perspectiveMode,
      axesMode: currentLesson.axesMode,
      forceSide: currentLesson.forceSide,
      isShadowLevel: currentLesson.isShadowLevel,
      hasGroundGrid: currentLesson.hasGroundGrid,
    });
    setChallenge(nextCh);
    setStrokes([]);
    setFeedback(null);

    if (gameMode === 'survival') {
      setSurvivalTime(20);
    } else if (gameMode === 'fever') {
      // 28% de probabilidad de generar un cubo especial con estrella
      setIsSpecialCube(Math.random() < 0.28);
    } else {
      setIsSpecialCube(false);
    }
  }, [currentLesson, gameMode]);

  // Iniciar partida
  const startGame = (mode: GameMode) => {
    setGameMode(mode);
    setGameState('playing');
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
    if (mode === 'fever') {
      setIsSpecialCube(Math.random() < 0.3);
    } else {
      setIsSpecialCube(false);
    }
    spawnNextCube();
  };

  // Salir de la partida al menú
  const exitGame = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setGameState('idle');
    setGameMode(null);
  };

  // Loop de tiempo según el modo
  useEffect(() => {
    if (gameState !== 'playing' || !gameMode) return;

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
  }, [gameState, gameMode]);

  // Pérdida de vida por tiempo en Supervivencia
  const handleSurvivalTimeout = () => {
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
  };

  const triggerFlash = (text: string, positive: boolean) => {
    setFlashMessage({ text, positive });
    setTimeout(() => {
      setFlashMessage(null);
    }, 1200);
  };

  // Finalizar juego
  const endGame = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setGameState('gameover');
  };

  // Recompensas al terminar juego
  useEffect(() => {
    if (gameState === 'gameover' && gameMode) {
      if (gameMode === 'blitz') {
        saveHighScore('blitz', currentLesson.code, cubesCompleted);
        const xpEarned = cubesCompleted * 20;
        if (xpEarned > 0) onAwardXP(xpEarned);
      } else if (gameMode === 'fever') {
        saveHighScore('fever', currentLesson.code, cubesCompleted);
        const xpEarned = cubesCompleted * 25 + specialCubesCount * 15;
        if (xpEarned > 0) onAwardXP(xpEarned);
      } else if (gameMode === 'survival') {
        saveHighScore('survival', currentLesson.code, bestCombo);
        const xpEarned = cubesCompleted * 25;
        if (xpEarned > 0) onAwardXP(xpEarned);
      } else if (gameMode === 'sprint') {
        if (cubesCompleted >= 5) {
          saveHighScore('sprint', currentLesson.code, sprintTime, true);
          onAwardXP(50);
        }
      }
    }
  }, [gameState]);

  // Sincronizar estado de dibujo con el avatar
  useEffect(() => {
    onDrawingStateChange?.(isDrawing);
  }, [isDrawing, onDrawingStateChange]);

  // Deshacer trazo (con penalización en Fiebre)
  const handleUndo = () => {
    if (strokes.length === 0 || gameState !== 'playing') return;
    onAvatarMoodChange?.('surprised');
    if (gameMode === 'fever') {
      setFeverTime((prev) => Math.max(0, Math.round((prev - 2) * 10) / 10));
      triggerFlash('DESHACER: -2s', false);
    }
    setStrokes((prev) => prev.slice(0, -1));
  };

  // Borrar trazos (prohibido en Fiebre)
  const handleClear = () => {
    if (gameMode === 'fever' || strokes.length === 0 || gameState !== 'playing') return;
    setStrokes([]);
  };

  // Validación rápida al presionar Comprobar
  const handleValidate = () => {
    if (strokes.length === 0 || gameState !== 'playing') return;

    const res = validateCubeDrawing(challenge, strokes);
    setFeedback(res);

    if (res.passed) {
      // ¡Cubo aprobado! Reacción del avatar según la hazaña
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

      // Siguiente cubo instantáneo
      setTimeout(() => {
        spawnNextCube();
      }, 350);
    } else {
      // Suspenso: avatar con espirales y sudor
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

  // Saltar cubo
  const handleSkip = () => {
    if (gameState !== 'playing') return;
    setStreakCombo(0);
    if (gameMode === 'blitz') {
      setBlitzTime((prev) => Math.max(0, Math.round((prev - 2) * 10) / 10));
      triggerFlash('Cubo saltado (-2s)', false);
    } else if (gameMode === 'fever') {
      setFeverTime((prev) => Math.max(0, Math.round((prev - 4) * 10) / 10));
      triggerFlash('Cubo saltado (-4s)', false);
    } else if (gameMode === 'survival') {
      setSurvivalLives((prev) => {
        const next = prev - 1;
        if (next <= 0) endGame();
        return next;
      });
      triggerFlash('Cubo saltado (-1 vida)', false);
    }
    spawnNextCube();
  };

  // Renderizado del canvas de dibujo técnico
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Fondo blanco papel puro
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Cuadrícula sutil
    ctx.strokeStyle = '#F3F3F3';
    ctx.lineWidth = 1;
    const gridSize = 24;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

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

      // Aristas entintadas de la cara dada
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
        // Círculo base blanco con borde negro para máximo contraste
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Estrella negra de 5 puntas centrada
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

        // Flecha técnica fina en el extremo del eje
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

        // Placa / Badge técnico fino con el nombre del eje (X, Y, Z)
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

      // Marcador de origen técnico discreto en el vértice frontal inferior
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
  }, [challenge, strokes, isDrawing, gameMode, isSpecialCube]);

  useEffect(() => {
    render();
  }, [render]);

  // Atajos de teclado en minijuego
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleValidate();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [strokes, gameState, gameMode]);

  // Puntero y dibujo
  const getNormalizedCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      pressure: e.pressure && e.pressure > 0 ? e.pressure : 0.5,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;
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

  const avgAccuracy =
    scoresList.length > 0
      ? Math.round(scoresList.reduce((a, b) => a + b, 0) / scoresList.length)
      : 0;

  // ==========================================
  // 1. PANTALLA PRINCIPAL: HUB DE SELECCIÓN DE MINIJUEGOS
  // ==========================================
  if (gameState === 'idle') {
    const blitzRecord = highScores[`blitz_${currentLesson.code}`] ?? 0;
    const feverRecord = highScores[`fever_${currentLesson.code}`] ?? 0;
    const survivalRecord = highScores[`survival_${currentLesson.code}`] ?? 0;
    const sprintRecord = highScores[`sprint_${currentLesson.code}`];

    return (
      <div className="max-w-4xl w-full mx-auto px-4 py-6">
        {/* Cabecera del Hub de Minijuegos */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest bg-black text-white px-2 py-0.5 font-bold">
                MODO ARCADE
              </span>
              <span className="text-[10px] font-mono text-neutral-500">
                · ENTRENAMIENTO DE VELOCIDAD
              </span>
            </div>
            <h1 className="text-3xl font-bold font-display mt-1 flex items-center gap-2">
              <Gamepad2 className="w-8 h-8 stroke-[2.5]" />
              <span>Minijuegos de Perspectiva</span>
            </h1>
          </div>

          {/* Selector de Nivel para filtrar los minijuegos */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Filter className="w-4 h-4 text-black shrink-0" />
            <span className="text-xs font-mono uppercase font-bold shrink-0">Dificultad:</span>
            <select
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              className="border-2 border-black px-2.5 py-1.5 text-xs font-mono font-bold bg-white shadow-[2px_2px_0px_#000000] cursor-pointer max-w-[210px] sm:max-w-xs truncate"
            >
              {unlockedNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.code} · {n.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Banner descriptivo de la dificultad activa */}
        <div className="w-full mb-6 px-4 py-2 border-2 border-black bg-neutral-50 flex items-center justify-between text-xs shadow-[2px_2px_0px_#000000]">
          <div className="flex items-center gap-2 truncate">
            <span className="font-mono font-bold bg-black text-white px-1.5 py-0.5 text-[10px]">
              NIVEL {currentLesson.code}
            </span>
            <span className="font-bold font-display truncate">{currentLesson.title}</span>
            <span className="text-neutral-500 hidden sm:inline truncate">— {currentLesson.subtitle}</span>
          </div>
          <div>
            {currentLesson.axesMode === 'xyz' && (
              <span className="text-[10px] font-mono bg-white text-black border border-black px-2 py-0.5 font-bold flex items-center gap-1 shadow-[1px_1px_0px_#000000]">
                <Compass className="w-3 h-3 stroke-[2.5]" />
                <span>Ejes X, Y, Z</span>
              </span>
            )}
            {currentLesson.axesMode === 'base_axes' && (
              <span className="text-[10px] font-mono bg-white text-black border border-black px-2 py-0.5 font-bold flex items-center gap-1 shadow-[1px_1px_0px_#000000]">
                <Compass className="w-3 h-3 stroke-[2.5]" />
                <span>Ejes X e Y</span>
              </span>
            )}
            {currentLesson.axesMode === 'none' && (
              <span className="text-[10px] font-mono bg-white text-black border border-black px-2 py-0.5 font-bold flex items-center gap-1 shadow-[1px_1px_0px_#000000]">
                <PenTool className="w-3 h-3 stroke-[2.5]" />
                <span>Reto Libre</span>
              </span>
            )}
          </div>
        </div>

        {/* Tarjetas de Selección de Minijuegos en Rejilla 2x2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* JUEGO 1: FIEBRE DE TIEMPO (CUBOS CON ESTRELLA) */}
          <div className="card-ink bg-white p-5 flex flex-col justify-between border-2 border-black shadow-[4px_4px_0px_#000000] hover:-translate-y-0.5 transition-transform relative overflow-hidden">
            <div className="absolute top-2 right-2 bg-black text-white text-[9px] font-mono uppercase px-2 py-0.5 font-bold flex items-center gap-1">
              <Star className="w-3 h-3 fill-white text-white" />
              <span>NUEVO MODO</span>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 border-2 border-black flex items-center justify-center bg-neutral-100 shadow-[2px_2px_0px_#000000]">
                  <Hourglass className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-display leading-tight">Fiebre de Tiempo</h3>
                  <span className="text-[10px] font-mono uppercase text-neutral-500 font-bold">
                    Contrarreloj + Recarga
                  </span>
                </div>
              </div>
              <p className="text-xs font-sans text-neutral-600 mb-4">
                Empiezas con 25s. Cada cubo aprobado suma <strong>+8s</strong>. ¡Si te toca un{' '}
                <strong>Cubo con Estrella (★)</strong> y lo superas, recargas <strong>+20s</strong>!
                Deshacer penaliza <strong>-2s</strong> y borrar todo está prohibido.
              </p>
            </div>

            <div className="pt-3 border-t border-black/10">
              <div className="flex items-center justify-between text-xs font-mono mb-3">
                <span className="text-neutral-500">Récord en {currentLesson.code}:</span>
                <span className="font-bold flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 stroke-[2.5]" />
                  {feverRecord} {feverRecord === 1 ? 'cubo' : 'cubos'}
                </span>
              </div>
              <button
                onClick={() => startGame('fever')}
                className="btn-ink w-full py-2 text-xs font-mono uppercase font-bold flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_#000000]"
              >
                <Play className="w-3.5 h-3.5 fill-white stroke-none" />
                <span>Jugar Fiebre de Tiempo</span>
              </button>
            </div>
          </div>

          {/* JUEGO 2: CUBO BLITZ (60 SEGUNDOS) */}
          <div className="card-ink bg-white p-5 flex flex-col justify-between border-2 border-black shadow-[4px_4px_0px_#000000] hover:-translate-y-0.5 transition-transform">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 border-2 border-black flex items-center justify-center bg-neutral-100 shadow-[2px_2px_0px_#000000]">
                  <Clock className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-display leading-tight">Cubo Blitz</h3>
                  <span className="text-[10px] font-mono uppercase text-neutral-500 font-bold">
                    60 Segundos Puros
                  </span>
                </div>
              </div>
              <p className="text-xs font-sans text-neutral-600 mb-4">
                ¿Cuántos cubos bien construidos eres capaz de clavar en un minuto? Cada aprobado suma
                +1 cubo al instante; los fallos restan 3 segundos de penalización.
              </p>
            </div>

            <div className="pt-3 border-t border-black/10">
              <div className="flex items-center justify-between text-xs font-mono mb-3">
                <span className="text-neutral-500">Récord en {currentLesson.code}:</span>
                <span className="font-bold flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 stroke-[2.5]" />
                  {blitzRecord} {blitzRecord === 1 ? 'cubo' : 'cubos'}
                </span>
              </div>
              <button
                onClick={() => startGame('blitz')}
                className="btn-ink w-full py-2 text-xs font-mono uppercase font-bold flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_#000000]"
              >
                <Play className="w-3.5 h-3.5 fill-white stroke-none" />
                <span>Jugar Blitz (60s)</span>
              </button>
            </div>
          </div>

          {/* JUEGO 3: SUPERVIVENCIA (3 VIDAS) */}
          <div className="card-ink bg-white p-5 flex flex-col justify-between border-2 border-black shadow-[4px_4px_0px_#000000] hover:-translate-y-0.5 transition-transform">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 border-2 border-black flex items-center justify-center bg-neutral-100 shadow-[2px_2px_0px_#000000]">
                  <Heart className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-display leading-tight">Supervivencia</h3>
                  <span className="text-[10px] font-mono uppercase text-neutral-500 font-bold">
                    3 Vidas Máximas
                  </span>
                </div>
              </div>
              <p className="text-xs font-sans text-neutral-600 mb-4">
                3 vidas. Tienes 20 segundos por cada cubo. Cada fallo de perspectiva o línea curva
                te cuesta un corazón. ¿Cuál es la mayor racha consecutiva que puedes lograr?
              </p>
            </div>

            <div className="pt-3 border-t border-black/10">
              <div className="flex items-center justify-between text-xs font-mono mb-3">
                <span className="text-neutral-500">Récord en {currentLesson.code}:</span>
                <span className="font-bold flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 stroke-[2.5]" />
                  {survivalRecord} seguidos
                </span>
              </div>
              <button
                onClick={() => startGame('survival')}
                className="btn-ink w-full py-2 text-xs font-mono uppercase font-bold flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_#000000]"
              >
                <Play className="w-3.5 h-3.5 fill-white stroke-none" />
                <span>Jugar Supervivencia</span>
              </button>
            </div>
          </div>

          {/* JUEGO 4: SPRINT DE PRECISIÓN (TIME ATTACK) */}
          <div className="card-ink bg-white p-5 flex flex-col justify-between border-2 border-black shadow-[4px_4px_0px_#000000] hover:-translate-y-0.5 transition-transform">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 border-2 border-black flex items-center justify-center bg-neutral-100 shadow-[2px_2px_0px_#000000]">
                  <Zap className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-display leading-tight">Sprint 5 Cubos</h3>
                  <span className="text-[10px] font-mono uppercase text-neutral-500 font-bold">
                    Time Attack
                  </span>
                </div>
              </div>
              <p className="text-xs font-sans text-neutral-600 mb-4">
                El cronómetro corre hacia arriba: el objetivo es completar 5 cubos aprobados
                consecutivamente en el menor tiempo humano posible.
              </p>
            </div>

            <div className="pt-3 border-t border-black/10">
              <div className="flex items-center justify-between text-xs font-mono mb-3">
                <span className="text-neutral-500">Récord en {currentLesson.code}:</span>
                <span className="font-bold flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 stroke-[2.5]" />
                  {sprintRecord !== undefined ? `${sprintRecord.toFixed(1)}s` : '—'}
                </span>
              </div>
              <button
                onClick={() => startGame('sprint')}
                className="btn-ink w-full py-2 text-xs font-mono uppercase font-bold flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_#000000]"
              >
                <Play className="w-3.5 h-3.5 fill-white stroke-none" />
                <span>Jugar Sprint</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. PANTALLA DE JUEGO ACTIVO O GAME OVER
  // ==========================================
  return (
    <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center justify-items-center px-4 py-2 select-none overflow-x-hidden">
      {/* Columna izquierda espaciadora para centrar matemáticamente el lienzo en el centro de la pantalla */}
      <div className="hidden lg:block w-full min-w-0" aria-hidden="true" />

      <div
        data-canvas-zone="true"
        className="w-full min-w-0 flex flex-col items-center relative shrink-0 justify-self-center"
        style={{
          maxWidth: 'min(100%, 600px, max(280px, calc((100vh - 290px) * 600 / 540)))',
        }}
      >
        {/* BARRA SUPERIOR DE ESTADO ARCADE (HUD) */}
        <div className="w-full mb-2 flex items-center justify-between gap-2 border-2 border-black bg-white p-2 shadow-[2px_2px_0px_#000000]">
          {/* Botón Salir / Abortar */}
          <button
            onClick={exitGame}
            className="btn-ink-outline px-2 py-1 text-xs font-mono uppercase font-bold flex items-center gap-1 cursor-pointer"
            title="Volver a la selección de minijuegos"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Menú</span>
          </button>

          {/* Título de Modo y Nivel */}
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-[10px] font-mono bg-black text-white px-1.5 py-0.2 font-bold uppercase shrink-0">
              {gameMode === 'fever'
                ? 'FIEBRE DE TIEMPO'
                : gameMode === 'blitz'
                ? 'BLITZ 60s'
                : gameMode === 'survival'
                ? 'SUPERVIVENCIA'
                : 'SPRINT 5'}
            </span>
            <span className="text-xs font-mono font-bold truncate">Nivel {currentLesson.code}</span>
          </div>

          {/* Estadísticas de juego en vivo */}
          <div className="flex items-center gap-2 font-mono text-xs font-bold shrink-0">
            {gameMode === 'fever' && (
              <>
                <div
                  className={`border-2 border-black px-2 py-0.5 flex items-center gap-1 ${
                    feverTime <= 6 ? 'bg-black text-white animate-pulse' : 'bg-white text-black'
                  }`}
                >
                  <Hourglass className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="tabular-nums">{feverTime.toFixed(1)}s</span>
                </div>
                <div className="border-2 border-black bg-neutral-100 px-2 py-0.5 flex items-center gap-1">
                  <span>{cubesCompleted}</span>
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
                  className={`border-2 border-black px-2 py-0.5 flex items-center gap-1 ${
                    blitzTime <= 10 ? 'bg-black text-white animate-pulse' : 'bg-white text-black'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="tabular-nums">{blitzTime.toFixed(1)}s</span>
                </div>
                <div className="border-2 border-black bg-neutral-100 px-2 py-0.5">
                  <span>{cubesCompleted} cubos</span>
                </div>
              </>
            )}

            {gameMode === 'survival' && (
              <>
                {/* Vidas */}
                <div className="flex items-center gap-0.5 border-2 border-black bg-white px-1.5 py-0.5">
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
                {/* Tiempo del cubo actual */}
                <div
                  className={`border-2 border-black px-2 py-0.5 flex items-center gap-1 ${
                    survivalTime <= 5 ? 'bg-black text-white animate-pulse' : 'bg-white text-black'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="tabular-nums">{survivalTime.toFixed(1)}s</span>
                </div>
                <div className="border-2 border-black bg-neutral-100 px-2 py-0.5">
                  <span>{streakCombo} combo</span>
                </div>
              </>
            )}

            {gameMode === 'sprint' && (
              <>
                <div className="border-2 border-black bg-white px-2 py-0.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="tabular-nums">{sprintTime.toFixed(1)}s</span>
                </div>
                <div className="border-2 border-black bg-neutral-100 px-2 py-0.5">
                  <span>{cubesCompleted}/5 cubos</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* LIENZO DE DIBUJO RESPONSIVO */}
        <div className="relative border-4 border-black bg-white shadow-[4px_4px_0px_#000000] w-full aspect-[600/540] overflow-hidden">
          {/* Barra de progreso de tiempo según modo */}
          {gameMode === 'fever' && (
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-neutral-200 pointer-events-none z-10">
              <div
                className={`h-full transition-all duration-100 ${
                  feverTime <= 6 ? 'bg-black animate-pulse' : 'bg-neutral-800'
                }`}
                style={{ width: `${Math.min(100, (feverTime / 40) * 100)}%` }}
              />
            </div>
          )}
          {gameMode === 'blitz' && (
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-neutral-200 pointer-events-none z-10">
              <div
                className={`h-full transition-all duration-100 ${
                  blitzTime <= 10 ? 'bg-black animate-pulse' : 'bg-neutral-800'
                }`}
                style={{ width: `${(blitzTime / 60) * 100}%` }}
              />
            </div>
          )}
          {gameMode === 'survival' && (
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-neutral-200 pointer-events-none z-10">
              <div
                className={`h-full transition-all duration-100 ${
                  survivalTime <= 5 ? 'bg-black animate-pulse' : 'bg-neutral-800'
                }`}
                style={{ width: `${(survivalTime / 20) * 100}%` }}
              />
            </div>
          )}

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

          {/* Flash visual de acierto o fallo en pantalla */}
          {flashMessage && (
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              <div
                className={`border-4 border-black px-4 py-2 font-mono font-bold text-sm sm:text-base shadow-[4px_4px_0px_#000000] uppercase tracking-wider ${
                  flashMessage.positive ? 'bg-black text-white' : 'bg-white text-black'
                }`}
              >
                {flashMessage.text}
              </div>
            </div>
          )}

          {/* Indicador de Desafío en esquina */}
          <div className="absolute top-2.5 left-2 text-[10px] font-mono uppercase bg-white border border-black px-1.5 py-0.5 pointer-events-none shadow-[1px_1px_0px_#000000] z-10">
            CUBO #{challenge.seed}
          </div>

          {/* Badge de Cubo Estrella Especial en Fiebre de Tiempo */}
          {gameMode === 'fever' && isSpecialCube && (
            <div className="absolute top-2.5 right-2 border-2 border-black bg-black text-white px-2.5 py-1 text-xs font-mono font-bold flex items-center gap-1.5 shadow-[2px_2px_0px_#000000] z-10 animate-pulse">
              <Star className="w-3.5 h-3.5 fill-white text-white" />
              <span>CUBO ESTRELLA (+20s)</span>
            </div>
          )}
        </div>

        {/* BARRA DE HERRAMIENTAS Y ACCIÓN INMEDIATA */}
        <div className="w-full mt-2 flex flex-wrap items-center justify-between gap-2 border-2 border-black bg-white p-2 shadow-[3px_3px_0px_#000000]">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleUndo}
              disabled={strokes.length === 0}
              className="btn-ink-outline px-2.5 py-1.5 text-xs font-mono disabled:opacity-30 cursor-pointer flex items-center gap-1"
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

            <button
              onClick={handleClear}
              disabled={gameMode === 'fever' || strokes.length === 0}
              className={`btn-ink-outline px-2.5 py-1.5 text-xs font-mono flex items-center gap-1 ${
                gameMode === 'fever'
                  ? 'opacity-30 line-through cursor-not-allowed text-neutral-400 border-neutral-300'
                  : 'disabled:opacity-30 cursor-pointer'
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

            <span className="text-[11px] font-mono text-neutral-600 pl-1 font-bold">
              {countDetectedAristas(strokes)}/{challenge.targetEdges.length} aristas
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSkip}
              className="btn-ink-outline px-3 py-1.5 text-xs font-mono uppercase font-bold flex items-center gap-1 cursor-pointer"
              title={
                gameMode === 'fever'
                  ? 'Saltar cubo (Penaliza -4s)'
                  : 'Saltar a otro cubo (con penalización)'
              }
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Saltar</span>
              {gameMode === 'fever' && (
                <span className="text-[9px] bg-black text-white px-1 ml-0.5 font-bold">-4s</span>
              )}
            </button>

            <button
              onClick={handleValidate}
              disabled={strokes.length === 0}
              className="btn-ink px-6 sm:px-8 py-1.5 text-xs font-mono uppercase font-bold disabled:opacity-30 cursor-pointer shadow-[3px_3px_0px_#000000] flex items-center gap-1.5"
              title="Comprobar perspectiva (Enter)"
            >
              <span>Comprobar</span>
              <Check className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* FEEDBACK INMEDIATO EN CASO DE SUSPENSO */}
        {feedback && !feedback.passed && (
          <div className="w-full mt-1.5 px-3 py-1.5 border-2 border-black bg-neutral-50 flex items-center justify-between text-xs shadow-[2px_2px_0px_#000000]">
            <div className="flex items-center gap-2 truncate">
              <span className="text-[10px] font-mono bg-white text-black border border-black px-1.5 py-0.2 font-bold uppercase shrink-0">
                {feedback.score}%
              </span>
              <span className="font-bold truncate">{feedback.mainIssueMessage}</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-500 shrink-0">Mínimo: 75%</span>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* 3. MODAL DE GAME OVER / RESUMEN DE PARTIDA */}
      {/* ========================================== */}
      {gameState === 'gameover' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="card-ink bg-white max-w-md w-full p-6 relative shadow-[8px_8px_0px_#000000] text-center">
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
              Nivel {currentLesson.code} · {currentLesson.title}
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

            {/* XP Ganado */}
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

            {/* Acciones de Fin de Partida */}
            <div className="flex items-center gap-3">
              <button
                onClick={exitGame}
                className="btn-ink-outline flex-1 py-2 text-xs font-mono uppercase font-bold cursor-pointer"
              >
                Volver al Menú
              </button>
              <button
                onClick={() => startGame(gameMode!)}
                className="btn-ink flex-1 py-2 text-xs font-mono uppercase font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-[3px_3px_0px_#000000]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Jugar de Nuevo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Columna Lateral Derecha: Cubito en Minijuegos (lateral, sin desplazar el centro del lienzo) */}
      <div className="w-full min-w-0 flex flex-col items-center justify-center shrink-0 overflow-hidden">
        <SenseiCubo
          isDrawing={isDrawing}
          size={240}
        />
      </div>
    </div>
  );
};
