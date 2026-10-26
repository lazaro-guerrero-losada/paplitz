import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Ghost,
  Flame,
  Trophy,
  RotateCcw,
  Check,
  Undo2,
  Flag,
  Zap,
  PanelLeft,
  X,
} from 'lucide-react';
import { AvatarMood } from '../lib/avatarTypes';

export interface GhostLineMinigameProps {
  onExit: () => void;
  onAwardXP: (amount: number) => void;
  onAvatarMoodChange?: (mood: AvatarMood) => void;
  onDrawingStateChange?: (isDrawing: boolean) => void;
  onToggleSidebar?: () => void;
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
    rawScore = Math.max(0, rawScore - 12);
  }

  const passed = rawScore >= 75;
  const perfect = rawScore >= 90;

  let title = 'Desincronizado';
  let message = `Desviación media: ${Math.round(effectiveAvgDist)}px. Intenta seguir el camino con más calma.`;

  if (isReversed) {
    title = 'Dirección invertida';
    message = 'Has recorrido la forma al revés. Traza desde el punto ① hacia el punto ②.';
  } else if (perfect) {
    title = 'Sincronía Fantasma Perfecta';
    message = `Calco milimétrico (${Math.round(effectiveAvgDist)}px de error). Memoria muscular sobresaliente.`;
  } else if (passed) {
    title = 'En Sincronía';
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

// Plantillas predeterminadas de trazos ampliadas por todo el lienzo
export type GhostPreset =
  | 'custom'
  | 'horizontal'
  | 'vertical'
  | 'diagonal'
  | 'arc_c'
  | 'wave_s'
  | 'chevron'
  | 'circle'
  | 'box';

function generatePresetGhost(type: GhostPreset): Point[] {
  const pts: Point[] = [];

  if (type === 'horizontal') {
    // Trazo horizontal completo de hombro de lado a lado (528px)
    const y = 270;
    for (let x = 36; x <= 564; x += 10) {
      pts.push({ x, y, pressure: 0.5 });
    }
  } else if (type === 'vertical') {
    // Trazo vertical ascendente completo (390px)
    const x = 300;
    for (let y = 475; y >= 85; y -= 10) {
      pts.push({ x, y, pressure: 0.5 });
    }
  } else if (type === 'diagonal') {
    // Gran diagonal ascendente de esquina a esquina (510px x 380px)
    const startX = 45;
    const startY = 475;
    const endX = 555;
    const endY = 95;
    for (let i = 0; i <= 50; i++) {
      const t = i / 50;
      pts.push({
        x: Math.round(startX + (endX - startX) * t),
        y: Math.round(startY + (endY - startY) * t),
        pressure: 0.5,
      });
    }
  } else if (type === 'arc_c') {
    // Gran arco parabólico en bóveda aprovechando la anchura y altura (510px x 365px)
    const startX = 45;
    const endX = 555;
    const baseY = 460;
    const apexY = 95;
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const x = Math.round(startX + (endX - startX) * t);
      const arch = 4 * t * (1 - t);
      const y = Math.round(baseY - (baseY - apexY) * arch);
      pts.push({ x, y, pressure: 0.5 });
    }
  } else if (type === 'wave_s') {
    // Gran onda en S biomecánica de extremo a extremo (510px x 290px)
    const startX = 45;
    const endX = 555;
    const centerY = 285;
    const amp = 145;
    for (let i = 0; i <= 70; i++) {
      const t = i / 70;
      const x = Math.round(startX + (endX - startX) * t);
      const y = Math.round(centerY - Math.sin(t * Math.PI * 2) * amp);
      pts.push({ x, y, pressure: 0.5 });
    }
  } else if (type === 'chevron') {
    // Quiebro angular amplio en V aprovechando toda la anchura y altura
    const leftX = 45;
    const midX = 300;
    const rightX = 555;
    const topY = 120;
    const bottomY = 475;
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      pts.push({
        x: Math.round(leftX + (midX - leftX) * t),
        y: Math.round(topY + (bottomY - topY) * t),
        pressure: 0.5,
      });
    }
    for (let i = 1; i <= 30; i++) {
      const t = i / 30;
      pts.push({
        x: Math.round(midX + (rightX - midX) * t),
        y: Math.round(bottomY - (bottomY - topY) * t),
        pressure: 0.5,
      });
    }
  } else if (type === 'circle') {
    // Gran forma oval / elíptica suave continua (450px x 350px)
    const cx = 300;
    const cy = 290;
    const rx = 225;
    const ry = 175;
    const N = 72;
    for (let i = 0; i <= N; i++) {
      const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
      pts.push({
        x: Math.round(cx + Math.cos(angle) * rx),
        y: Math.round(cy + Math.sin(angle) * ry),
        pressure: 0.5,
      });
    }
  } else if (type === 'box') {
    // Gran marco rectangular cerrado (500px x 370px)
    const minX = 50;
    const maxX = 550;
    const minY = 105;
    const maxY = 475;
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      pts.push({ x: Math.round(minX + (maxX - minX) * t), y: minY, pressure: 0.5 });
    }
    for (let i = 1; i <= 16; i++) {
      const t = i / 16;
      pts.push({ x: maxX, y: Math.round(minY + (maxY - minY) * t), pressure: 0.5 });
    }
    for (let i = 1; i <= 20; i++) {
      const t = i / 20;
      pts.push({ x: Math.round(maxX - (maxX - minX) * t), y: maxY, pressure: 0.5 });
    }
    for (let i = 1; i <= 16; i++) {
      const t = i / 16;
      pts.push({ x: minX, y: Math.round(maxY - (maxY - minY) * t), pressure: 0.5 });
    }
  }

  return pts;
}

export const GhostLineMinigame: React.FC<GhostLineMinigameProps> = ({
  onExit,
  onAwardXP,
  onAvatarMoodChange,
  onDrawingStateChange,
  onToggleSidebar,
}) => {
  // Estado general de la partida
  const [gameState, setGameState] = useState<'playing' | 'gameover'>('playing');
  const [selectedPreset, setSelectedPreset] = useState<GhostPreset>('horizontal');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Estado del Fantasma actual
  const [ghostStroke, setGhostStroke] = useState<Point[] | null>(() => generatePresetGhost('horizontal'));
  const [isSettingCustomGhost, setIsSettingCustomGhost] = useState<boolean>(false);
  const [mutateGhost, setMutateGhost] = useState<boolean>(true);

  // Trazos actuales del usuario
  const [userStroke, setUserStroke] = useState<Point[] | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const currentPointsRef = useRef<Point[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Estadísticas de la sesión
  const [scores, setScores] = useState<number[]>([]);
  const [deviations, setDeviations] = useState<number[]>([]);
  const [lastEval, setLastEval] = useState<GhostEvaluation | null>(null);
  const [comboStreak, setComboStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [flashMessage, setFlashMessage] = useState<{ text: string; positive: boolean } | null>(null);

  // Récords históricos
  const [savedRecords, setSavedRecords] = useState<{ bestStreak: number; bestScore: number }>({
    bestStreak: 0,
    bestScore: 0,
  });

  useEffect(() => {
    try {
      const s = localStorage.getItem('paplitz_ghost_best_streak') || '0';
      const sc = localStorage.getItem('paplitz_ghost_best_score') || '0';
      setSavedRecords({
        bestStreak: parseInt(s, 10),
        bestScore: parseInt(sc, 10),
      });
    } catch {
      // Ignorar
    }
  }, []);

  // Cálculos de métricas acumuladas
  const averageScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

  const averageDeviation =
    deviations.length > 0
      ? Math.round((deviations.reduce((a, b) => a + b, 0) / deviations.length) * 10) / 10
      : 0;

  // Finalizar la partida voluntariamente y guardar el progreso
  const finishGame = useCallback(() => {
    setGameState('gameover');
    setUserStroke(null);
    setIsDrawing(false);
    if (onDrawingStateChange) onDrawingStateChange(false);

    try {
      const prevStreak = parseInt(localStorage.getItem('paplitz_ghost_best_streak') || '0', 10);
      const prevScore = parseInt(localStorage.getItem('paplitz_ghost_best_score') || '0', 10);
      const effectiveBestStreak = Math.max(bestStreak, comboStreak);
      const effectiveBestScore = maxScore;

      if (effectiveBestStreak > prevStreak) {
        localStorage.setItem('paplitz_ghost_best_streak', effectiveBestStreak.toString());
      }
      if (effectiveBestScore > prevScore) {
        localStorage.setItem('paplitz_ghost_best_score', effectiveBestScore.toString());
      }
      setSavedRecords({
        bestStreak: Math.max(prevStreak, effectiveBestStreak),
        bestScore: Math.max(prevScore, effectiveBestScore),
      });
    } catch {
      // Ignorar
    }

    const totalXP = Math.round(scores.length * 12 + (averageScore > 0 ? averageScore * 0.25 : 0));
    if (totalXP > 0) {
      onAwardXP(totalXP);
    }

    if (onAvatarMoodChange) {
      onAvatarMoodChange(averageScore >= 75 ? 'success-stars' : 'streak-fire');
      setTimeout(() => onAvatarMoodChange('neutral'), 3000);
    }
  }, [bestStreak, comboStreak, maxScore, scores.length, averageScore, onAwardXP, onAvatarMoodChange, onDrawingStateChange]);

  // Reiniciar la partida
  const restartGame = useCallback(
    (preset: GhostPreset = selectedPreset) => {
      setGameState('playing');
      setScores([]);
      setDeviations([]);
      setLastEval(null);
      setComboStreak(0);
      setBestStreak(0);
      setUserStroke(null);
      setFlashMessage(null);

      if (preset === 'custom') {
        setGhostStroke(null);
        setIsSettingCustomGhost(true);
        setFlashMessage({
          text: 'Dibuja cualquier línea en el lienzo para fijarla como Fantasma',
          positive: true,
        });
        setTimeout(() => setFlashMessage(null), 2500);
      } else {
        setIsSettingCustomGhost(false);
        setGhostStroke(generatePresetGhost(preset));
      }
    },
    [selectedPreset]
  );

  // Seleccionar plantilla predeterminada
  const handleSelectPreset = (preset: GhostPreset) => {
    setSelectedPreset(preset);
    setUserStroke(null);
    if (preset === 'custom') {
      setGhostStroke(null);
      setIsSettingCustomGhost(true);
      setFlashMessage({
        text: 'Dibuja una línea en el lienzo para convertirla en el nuevo Fantasma',
        positive: true,
      });
      setTimeout(() => setFlashMessage(null), 2500);
    } else {
      setIsSettingCustomGhost(false);
      setGhostStroke(generatePresetGhost(preset));
      setFlashMessage({
        text: `Fantasma cargado: ${preset.toUpperCase()}`,
        positive: true,
      });
      setTimeout(() => setFlashMessage(null), 1500);
    }
  };

  // Renderizado del lienzo técnico Paplitz de alta definición (HiDPI / Retina responsive)
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const W = 600;
    const H = 540;
    const targetW = Math.round(W * dpr);
    const targetH = Math.round(H * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Fondo transparente para dejar ver la cuadrícula continua técnica (pattern-grid-paper)
    ctx.clearRect(0, 0, W, H);

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
      ctx.setLineDash([6, 5]);
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
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('1', startP.x, startP.y);

      // Nodo de fin ② del fantasma (solo si no coincide prácticamente con el de inicio, e.g. formas cerradas)
      const endP = ghostStroke[ghostStroke.length - 1];
      const isClosed = Math.hypot(endP.x - startP.x, endP.y - startP.y) < 14;
      if (!isClosed) {
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#A1A1AA';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(endP.x, endP.y, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#71717A';
        ctx.fillText('2', endP.x, endP.y);
      }

      // Etiqueta tenue FANTASMA
      const midP = ghostStroke[Math.floor(ghostStroke.length / 2)];
      ctx.fillStyle = '#A1A1AA';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('FANTASMA', midP.x, midP.y - 14);

      ctx.restore();
    } else if (!ghostStroke) {
      // Mensaje de ayuda si no hay fantasma fijado
      ctx.save();
      ctx.fillStyle = '#A1A1AA';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Traza tu primera línea en el lienzo para fijar el Fantasma', W / 2, H / 2);
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
      ctx.strokeStyle = '#000000';
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
  }, [ghostStroke, userStroke, isDrawing]);

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

  // Captura y normalización de coordenadas
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
    setIsSidebarOpen(false);
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
    currentPointsRef.current = [pt];
    setUserStroke(null);
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

    // Caso A: Si estábamos fijando un fantasma inicial libre
    if (isSettingCustomGhost || !ghostStroke) {
      setGhostStroke(recorded);
      setUserStroke(null);
      setIsSettingCustomGhost(false);
      setFlashMessage({
        text: '¡Fantasma fijado! Ahora calca la línea encima',
        positive: true,
      });
      setTimeout(() => setFlashMessage(null), 2000);
      renderCanvas();
      return;
    }

    // Caso B: El usuario calca sobre el fantasma activo
    const evalRes = evaluateGhostStroke(recorded, ghostStroke);
    setLastEval(evalRes);
    setScores((prev) => [...prev, evalRes.score]);
    setDeviations((prev) => [...prev, evalRes.avgDistPx]);

    if (evalRes.passed) {
      const nextCombo = comboStreak + 1;
      setComboStreak(nextCombo);
      if (nextCombo > bestStreak) setBestStreak(nextCombo);

      const xp = evalRes.perfect ? 20 : 10;
      onAwardXP(xp);

      if (onAvatarMoodChange) {
        onAvatarMoodChange(evalRes.perfect ? 'success-stars' : 'streak-fire');
        setTimeout(() => onAvatarMoodChange('neutral'), 1800);
      }

      setFlashMessage({
        text: evalRes.perfect
          ? `¡CALCO PERFECTO! ${evalRes.score}% (Desv: ${evalRes.avgDistPx}px)`
          : `¡SINCRONÍA! ${evalRes.score}% (Desv: ${evalRes.avgDistPx}px)`,
        positive: true,
      });
    } else {
      setComboStreak(0);
      if (onAvatarMoodChange) {
        onAvatarMoodChange('fail-spiral');
        setTimeout(() => onAvatarMoodChange('neutral'), 2000);
      }

      setFlashMessage({
        text: `Desviación: ${evalRes.avgDistPx}px · Nota: ${evalRes.score}%`,
        positive: false,
      });
    }
    setTimeout(() => setFlashMessage(null), 1500);

    // MECÁNICA: Si está activada la mutación, el trazo del usuario se convierte en el nuevo fantasma
    // Si la plantilla es fija, se conserva intacta para permitir calcos repetidos
    if (mutateGhost) {
      setGhostStroke(recorded);
    }
    setUserStroke(null);
    renderCanvas();
  };

  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center select-none bg-white pattern-grid-paper">
      {/* 1. BOTÓN TOGGLE PANEL DEDICADO A LA IZQUIERDA DE LA PANTALLA */}
      <button
        type="button"
        onClick={() => (onToggleSidebar ? onToggleSidebar() : setIsSidebarOpen((prev) => !prev))}
        className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-30 bg-white hover:bg-neutral-100 text-black px-2.5 py-1.5 border-2 border-black shadow-[3px_3px_0px_#000000] text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
        title="Abrir / cerrar panel de opciones y estadísticas"
      >
        <PanelLeft className="w-4 h-4 stroke-[2.5]" />
        <span>Panel</span>
      </button>

      {/* 2. HUD SUPERIOR: A LA MISMA ALTURA QUE EL BOTÓN PANEL ALINEADO CON EL LIENZO */}
      <div
        className="absolute top-2.5 sm:top-3 z-20 flex items-start justify-between pointer-events-none px-2 sm:px-0"
        style={{
          width: 'min(calc(100% - 130px), 840px, calc((100dvh - 90px) * (600 / 540)))',
        }}
      >
        {/* Tira compacta a la izquierda */}
        <div className="pointer-events-auto self-start font-mono text-xs select-none bg-white border-2 border-black p-1 sm:p-1.5 shadow-[3px_3px_0px_#000000] flex items-center gap-1.5 sm:gap-2">
          <span className="text-[10px] font-mono bg-black text-white px-1.5 py-0.5 font-bold uppercase shrink-0 shadow-[1px_1px_0px_#000]">
            FANTASMA
          </span>
          <div className="flex items-center gap-1 bg-neutral-100 border border-black px-1.5 py-0.5">
            <Check className="w-3 h-3 stroke-[3]" />
            <span className="text-[11px] font-bold tabular-nums">{scores.length} calcos</span>
          </div>
          <div className="flex items-center gap-1 bg-neutral-100 border border-black px-1.5 py-0.5">
            <Flame className="w-3 h-3 fill-black text-black" />
            <span className="text-[11px] font-bold tabular-nums">{comboStreak} racha</span>
          </div>
          {averageScore > 0 && (
            <span className="text-[10px] font-mono font-bold text-neutral-600 hidden sm:inline">
              Media: {averageScore}%
            </span>
          )}
          <button
            type="button"
            onClick={() => restartGame(selectedPreset)}
            className="p-1 border border-black hover:bg-neutral-100 cursor-pointer shadow-[1px_1px_0px_#000000] active:scale-95 transition-transform"
            title="Reiniciar plantilla fantasma"
          >
            <RotateCcw className="w-3 h-3 stroke-[2.5]" />
          </button>
        </div>

        {/* A la derecha del dibujo: Cuadradito compacto con la nota (a la misma altura) */}
        {lastEval ? (
          <div className="pointer-events-auto self-start bg-white border-2 border-black p-2 sm:p-2.5 shadow-[4px_4px_0px_#000000] font-mono flex flex-col items-center justify-center min-w-[88px] sm:min-w-[100px] aspect-square animate-in fade-in zoom-in-95 duration-150">
            <span className="text-[10px] sm:text-xs font-bold uppercase text-neutral-500 tracking-wider">
              Nota
            </span>
            <span className="text-2xl sm:text-3xl font-black leading-none my-1">
              {lastEval.score}%
            </span>
            <span
              className={`text-[9px] sm:text-[10px] font-bold uppercase px-1.5 py-0.5 border border-black ${
                lastEval.perfect
                  ? 'bg-black text-white'
                  : lastEval.passed
                  ? 'bg-neutral-200 text-black'
                  : 'bg-white text-neutral-700'
              }`}
            >
              {lastEval.perfect ? 'Perfecto' : lastEval.passed ? 'Aprobado' : 'Reintentar'}
            </span>
          </div>
        ) : (
          <div />
        )}
      </div>

      {/* BACKDROP FLOTANTE CUANDO EL PANEL LOCAL ESTÁ ABIERTO */}
      {!onToggleSidebar && isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 1. BARRA LATERAL IZQUIERDA EN MODO OVERLAY (SI NO SE USA EL SIDEBAR PRINCIPAL) */}
      {!onToggleSidebar && (
        <aside
          className={`fixed md:absolute top-0 bottom-0 left-0 z-50 bg-white border-r-2 border-black shadow-[6px_0px_0px_#000000] flex flex-col select-none transition-transform duration-200 ease-in-out ${
            isSidebarOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'
          } w-full sm:w-85 md:w-80 h-full overflow-hidden`}
        >
          <div className="w-full flex flex-col h-full overflow-y-auto p-3.5 space-y-3 font-mono">
            {/* CABECERA CON BOTÓN CERRAR PANEL Y BOTÓN SALIR */}
            <div className="flex items-center justify-between pb-2 border-b-2 border-black">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-black text-white flex items-center justify-center shadow-[1px_1px_0px_#000000]">
                  <Ghost className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-neutral-500 uppercase block leading-none">
                    Minijuego
                  </span>
                  <span className="text-xs font-bold font-display uppercase tracking-wider text-black">
                    Línea Fantasma
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onExit}
                  className="btn-ink-outline px-2 py-1 text-xs font-bold flex items-center gap-1 cursor-pointer shadow-[1px_1px_0px_#000000]"
                  title="Volver al menú de minijuegos"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Salir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 border border-black hover:bg-neutral-100 cursor-pointer shadow-[1px_1px_0px_#000000]"
                  title="Cerrar panel y volver al lienzo"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* SELECTOR DE PLANTILLA FANTASMA */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-neutral-500">Plantilla Fantasma:</span>
              <div className="grid grid-cols-2 gap-1 p-1 border-2 border-black bg-neutral-100 shadow-[2px_2px_0px_#000000]">
                {[
                  { id: 'horizontal' as const, label: 'Horizontal (→)' },
                  { id: 'vertical' as const, label: 'Vertical (↑)' },
                  { id: 'diagonal' as const, label: 'Diagonal (↗)' },
                  { id: 'arc_c' as const, label: 'Arco C (⌒)' },
                  { id: 'wave_s' as const, label: 'Onda S (〜)' },
                  { id: 'chevron' as const, label: 'Quiebro V (✓)' },
                  { id: 'circle' as const, label: 'Óvalo (◯)' },
                  { id: 'box' as const, label: 'Caja (▢)' },
                  { id: 'custom' as const, label: 'Dibujar Libre' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p.id)}
                    className={`py-1 px-1.5 text-[10px] font-bold border border-black cursor-pointer transition-colors ${
                      selectedPreset === p.id && !isSettingCustomGhost
                        ? 'bg-black text-white shadow-[1px_1px_0px_#000000]'
                        : selectedPreset === p.id && isSettingCustomGhost
                        ? 'bg-neutral-800 text-white animate-pulse'
                        : 'bg-white text-black hover:bg-neutral-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* MODO DE COMPORTAMIENTO TRAS EL CALCO */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-neutral-500">Dinámica de Calco:</span>
              <div className="grid grid-cols-2 gap-1 p-1 border-2 border-black bg-neutral-100 shadow-[2px_2px_0px_#000000]">
                <button
                  type="button"
                  onClick={() => setMutateGhost(true)}
                  className={`py-1 px-1.5 text-[10px] font-bold border border-black cursor-pointer transition-colors ${
                    mutateGhost
                      ? 'bg-black text-white shadow-[1px_1px_0px_#000000]'
                      : 'bg-white text-black hover:bg-neutral-200'
                  }`}
                  title="El último trazo que dibujes se convierte en el nuevo fantasma continuo"
                >
                  Mutación
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMutateGhost(false);
                    if (selectedPreset !== 'custom') {
                      setGhostStroke(generatePresetGhost(selectedPreset));
                    }
                  }}
                  className={`py-1 px-1.5 text-[10px] font-bold border border-black cursor-pointer transition-colors ${
                    !mutateGhost
                      ? 'bg-black text-white shadow-[1px_1px_0px_#000000]'
                      : 'bg-white text-black hover:bg-neutral-200'
                  }`}
                  title="Conserva la plantilla fija en pantalla para calcar una y otra vez"
                >
                  Plantilla Fija
                </button>
              </div>
            </div>

            {/* PANEL DE ESTADÍSTICAS EN VIVO */}
            <div className="space-y-2 pt-1 border-t-2 border-black">
              {/* Calcos Realizados & Nota Media */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="border-2 border-black p-2 bg-neutral-50 shadow-[1px_1px_0px_#000000]">
                  <div className="text-[9px] uppercase font-bold text-neutral-500">Calcos Hechos</div>
                  <div className="text-base font-black tabular-nums flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    {scores.length}
                  </div>
                </div>
                <div className="border-2 border-black p-2 bg-neutral-50 shadow-[1px_1px_0px_#000000]">
                  <div className="text-[9px] uppercase font-bold text-neutral-500">Nota Media</div>
                  <div className="text-base font-black tabular-nums">
                    {averageScore > 0 ? `${averageScore}%` : '-'}
                  </div>
                </div>
              </div>

              {/* Racha & Desviación Media */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="border-2 border-black p-2 bg-neutral-50 shadow-[1px_1px_0px_#000000]">
                  <div className="text-[9px] uppercase font-bold text-neutral-500 flex items-center gap-0.5">
                    <Flame className="w-3 h-3 text-black fill-black" />
                    <span>Racha (≥75%)</span>
                  </div>
                  <div className="text-base font-black tabular-nums">{comboStreak}</div>
                </div>
                <div className="border-2 border-black p-2 bg-neutral-50 shadow-[1px_1px_0px_#000000]">
                  <div className="text-[9px] uppercase font-bold text-neutral-500">Desv. Media</div>
                  <div className="text-base font-black tabular-nums">
                    {averageDeviation > 0 ? `${averageDeviation}px` : '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* RÉCORDS HISTÓRICOS */}
            <div className="border-2 border-black p-2 bg-neutral-50 text-[10px] space-y-1 shadow-[1px_1px_0px_#000000]">
              <div className="font-bold text-neutral-700 uppercase pb-0.5 border-b border-neutral-200">
                Mejores Récords:
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Mejor Racha:</span>
                <span className="font-bold">{Math.max(savedRecords.bestStreak, bestStreak)} seguidos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Mejor Calco:</span>
                <span className="font-bold">{Math.max(savedRecords.bestScore, maxScore)}%</span>
              </div>
            </div>

            {/* INSTRUCCIÓN DEL BUCLE RÁPIDO */}
            <div className="p-2 bg-neutral-50 border border-black text-[10px] text-neutral-600 leading-snug space-y-1">
              <div className="font-bold text-black uppercase flex items-center gap-1">
                <Zap className="w-3 h-3 text-black stroke-[2.5]" />
                <span>Mecánica de Mutación:</span>
              </div>
              <p>
                Traza sobre la línea fantasma. Tu calco se evalúa de inmediato y <strong>se convierte en el nuevo fantasma</strong> para trazar de nuevo sin pausas.
              </p>
            </div>

            {/* BOTONES DE ACCIÓN: FINALIZAR Y REINICIAR */}
            <div className="pt-2 mt-auto space-y-1.5">
              <button
                type="button"
                onClick={finishGame}
                className="w-full btn-ink py-2 px-3 text-xs font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000] hover:bg-neutral-900"
                title="Finalizar partida y ver el resumen completo de estadísticas"
              >
                <Flag className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Finalizar Partida</span>
              </button>

              <button
                type="button"
                onClick={() => restartGame(selectedPreset)}
                className="w-full btn-ink-outline py-1.5 px-3 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-[1px_1px_0px_#000000] hover:bg-neutral-100"
                title="Reiniciar y comenzar de nuevo el fantasma"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reiniciar Fantasma</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* 3. ÁREA CENTRAL: LIENZO 100% INTEGRADO CON EL FONDO */}
      <div
        className="relative aspect-[600/540] max-w-[min(calc(100%-24px),840px)] max-h-[calc(100%-70px)] flex items-center justify-center pointer-events-none"
        style={{
          width: 'min(calc(100% - 24px), 840px, calc((100dvh - 90px) * (600 / 540)))',
          height: 'auto',
          aspectRatio: '600 / 540',
        }}
      >
        <canvas
          ref={canvasRef}
          width={600}
          height={540}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="block w-full h-full cursor-crosshair touch-none select-none z-10 pointer-events-auto"
        />

        {/* Banner de Feedback instantáneo */}
        {flashMessage && (
          <div
            className={`absolute top-3 z-30 px-3 py-1.5 font-mono text-xs font-bold border-2 shadow-[3px_3px_0px_#000000] animate-bounce pointer-events-none ${
              flashMessage.positive
                ? 'bg-black text-white border-white'
                : 'bg-neutral-800 text-white border-white'
            }`}
          >
            {flashMessage.text}
          </div>
        )}

        {/* Modal de Fin de Partida */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-3 sm:p-5 border-2 border-black z-30 text-center font-mono animate-fade-in select-none pointer-events-auto overflow-y-auto max-h-full">
            <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-black mb-1.5 animate-bounce stroke-[2.5]" />
            <h3 className="text-lg sm:text-2xl font-bold font-display uppercase tracking-tight">
              ¡Partida Finalizada!
            </h3>
            <p className="text-[11px] sm:text-xs text-neutral-600 mt-0.5 sm:mt-1 max-w-sm">
              Has completado tu sesión de entrenamiento de memoria muscular y sincronía motriz.
            </p>

            {/* TABLA DE RESULTADOS */}
            <div className="my-2.5 sm:my-4 p-2.5 sm:p-3.5 border-2 border-black bg-neutral-50 w-64 sm:w-72 space-y-1.5 sm:space-y-2 text-[11px] sm:text-xs shadow-[3px_3px_0px_#000000]">
              <div className="flex justify-between items-center pb-1 border-b border-neutral-300">
                <span className="text-neutral-500 font-bold uppercase text-[10px]">Calcos Realizados:</span>
                <span className="font-bold text-sm bg-black text-white px-1.5 py-0.2">
                  {scores.length} trazos
                </span>
              </div>
              <div className="flex justify-between items-center pb-1 border-b border-neutral-300">
                <span className="text-neutral-500 font-bold uppercase text-[10px]">Nota Media:</span>
                <span className="font-bold text-sm">{averageScore}%</span>
              </div>
              <div className="flex justify-between items-center pb-1 border-b border-neutral-300">
                <span className="text-neutral-500 font-bold uppercase text-[10px]">Mejor Calco:</span>
                <span className="font-bold text-sm">{maxScore}%</span>
              </div>
              <div className="flex justify-between items-center pb-1 border-b border-neutral-300">
                <span className="text-neutral-500 font-bold uppercase text-[10px]">Racha Máxima:</span>
                <span className="font-bold text-sm">{Math.max(bestStreak, comboStreak)} seguidos</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 font-bold uppercase text-[10px]">Desviación Media:</span>
                <span className="font-bold text-sm">{averageDeviation}px</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => restartGame(selectedPreset)}
                className="btn-ink px-3 sm:px-4 py-1.5 sm:py-2 text-xs uppercase font-bold flex items-center gap-1.5 cursor-pointer shadow-[3px_3px_0px_#000000]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Jugar de Nuevo</span>
              </button>
              <button
                type="button"
                onClick={onExit}
                className="btn-ink-outline px-3 sm:px-4 py-1.5 sm:py-2 text-xs uppercase font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Volver a Minijuegos</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. BARRA DE HERRAMIENTAS FLOTANTE INFERIOR (NEOBRUTALISTA PAPLITZ) */}
      <div className="absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto font-mono text-xs">
        <div className="bg-white border-2 border-black p-1.5 sm:p-2 shadow-[4px_4px_0px_#000000] flex items-center gap-1.5 sm:gap-2 max-w-[calc(100vw-24px)] overflow-x-auto">
          {/* Selector de Presets */}
          <div className="flex items-center gap-1 border-r border-neutral-300 pr-1.5 sm:pr-2">
            {[
              { id: 'horizontal' as const, label: 'Horizontal' },
              { id: 'diagonal' as const, label: 'Diagonal' },
              { id: 'arc_c' as const, label: 'Arco' },
              { id: 'wave_s' as const, label: 'Onda' },
              { id: 'chevron' as const, label: 'Quiebro' },
              { id: 'custom' as const, label: 'Libre' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p.id)}
                className={`px-1.5 sm:px-2 py-1 text-[10px] font-bold border border-black cursor-pointer transition-colors whitespace-nowrap ${
                  selectedPreset === p.id && !isSettingCustomGhost
                    ? 'bg-black text-white shadow-[1px_1px_0px_#000000]'
                    : selectedPreset === p.id && isSettingCustomGhost
                    ? 'bg-neutral-800 text-white animate-pulse'
                    : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Reiniciar */}
          <button
            type="button"
            onClick={() => restartGame(selectedPreset)}
            className="btn-ink-outline px-2 py-1 text-xs font-bold flex items-center gap-1 cursor-pointer shadow-[1px_1px_0px_#000000] whitespace-nowrap"
            title="Reiniciar y comenzar de nuevo el fantasma"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Reiniciar</span>
          </button>

          {/* Finalizar Partida */}
          {gameState === 'playing' && (
            <button
              type="button"
              onClick={finishGame}
              className="btn-ink px-3 py-1 text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000] whitespace-nowrap"
              title="Finalizar partida y ver el resumen de estadísticas"
            >
              <Flag className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Finalizar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
