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
  Flag,
  Play,
  PanelLeft,
  X,
} from 'lucide-react';
import { LessonNode, MODULE_CALISTHENICS } from '../lib/curriculumData';
import { AvatarMood } from '../lib/avatarTypes';
import { generateStrokeChallenge, SeededRNG } from '../lib/strokeProceduralGenerator';

export interface StrokeRushMinigameProps {
  unlockedNodes: LessonNode[];
  activeNode: LessonNode;
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

// --- FUNCIONES GEOMÉTRICAS DE COLISIÓN Y DISTANCIA ENTRE TRAZOS ---
function ccw(p1: Point, p2: Point, p3: Point): number {
  return (p3.y - p1.y) * (p2.x - p1.x) - (p2.y - p1.y) * (p3.x - p1.x);
}

function doSegmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  if (
    Math.max(p1.x, p2.x) < Math.min(p3.x, p4.x) ||
    Math.max(p3.x, p4.x) < Math.min(p1.x, p2.x) ||
    Math.max(p1.y, p2.y) < Math.min(p3.y, p4.y) ||
    Math.max(p3.y, p4.y) < Math.min(p1.y, p2.y)
  ) {
    return false;
  }
  const d1 = ccw(p1, p2, p3);
  const d2 = ccw(p1, p2, p4);
  const d3 = ccw(p3, p4, p1);
  const d4 = ccw(p3, p4, p2);

  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
}

function doPolylinesIntersect(ptsA: Point[], ptsB: Point[]): boolean {
  for (let i = 0; i < ptsA.length - 1; i++) {
    for (let j = 0; j < ptsB.length - 1; j++) {
      if (doSegmentsIntersect(ptsA[i], ptsA[i + 1], ptsB[j], ptsB[j + 1])) {
        return true;
      }
    }
  }
  return false;
}

function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function minDistanceBetweenPolylines(ptsA: Point[], ptsB: Point[]): number {
  let minDist = Infinity;
  const stepA = Math.max(1, Math.floor((ptsA.length - 1) / 10));
  for (let i = 0; i < ptsA.length; i += stepA) {
    for (let j = 0; j < ptsB.length - 1; j++) {
      const d = pointToSegmentDistance(ptsA[i], ptsB[j], ptsB[j + 1]);
      if (d < minDist) minDist = d;
    }
  }
  const stepB = Math.max(1, Math.floor((ptsB.length - 1) / 10));
  for (let j = 0; j < ptsB.length; j += stepB) {
    for (let i = 0; i < ptsA.length - 1; i++) {
      const d = pointToSegmentDistance(ptsB[j], ptsA[i], ptsA[i + 1]);
      if (d < minDist) minDist = d;
    }
  }
  return minDist;
}

export const StrokeRushMinigame: React.FC<StrokeRushMinigameProps> = ({
  unlockedNodes,
  activeNode,
  onExit,
  onAwardXP,
  onAvatarMoodChange,
  onDrawingStateChange,
  onToggleSidebar,
}) => {
  // Todos los nodos de calistenia para el modo aleatorio completo (18 niveles con 237 variantes)
  const allCalNodes = MODULE_CALISTHENICS.units.flatMap((u) => u.nodes);
  const calNodes = unlockedNodes.filter((n) => n.isCalisthenics);
  const selectableNodes = calNodes.length > 0 ? calNodes : allCalNodes;
  const defaultCalNode = selectableNodes.find((n) => n.id === activeNode.id) || selectableNodes[0] || activeNode;

  // Selección de ejercicios: Modo Aleatorio (cada trazo diferente) vs Por Nivel
  const [isRandomMode, setIsRandomMode] = useState<boolean>(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(defaultCalNode.id);
  const selectedNode = selectableNodes.find((n) => n.id === selectedNodeId) || defaultCalNode;

  // Duración de cada Acto / Stage en segundos (30s)
  const STAGE_DURATION = 30;

  // Modos de juego: 'survival' (por actos de 30s) o 'blitz' (60s contrarreloj)
  const [gameMode, setGameMode] = useState<'survival' | 'blitz'>('survival');
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'stage_break' | 'gameover'>('idle');
  const [gameOverReason, setGameOverReason] = useState<'overflow' | 'timeout' | 'manual'>('overflow');

  // Sistema de Actos / Stages
  const [currentStage, setCurrentStage] = useState<number>(1);
  const [stageSecondsLeft, setStageSecondsLeft] = useState<number>(STAGE_DURATION);
  const [stageClearedCount, setStageClearedCount] = useState<number>(0);
  const [stageScores, setStageScores] = useState<number[]>([]);
  const [stageBestCombo, setStageBestCombo] = useState<number>(0);
  const [stagesCompleted, setStagesCompleted] = useState<number>(0);
  const [bestStage, setBestStage] = useState<number>(1);

  // Líneas activas en pantalla
  const [activeLines, setActiveLines] = useState<ActiveRushLine[]>([]);
  const [clearedScores, setClearedScores] = useState<number[]>([]);
  const [comboStreak, setComboStreak] = useState<number>(0);
  const [bestCombo, setBestCombo] = useState<number>(0);
  const [blitzTimer, setBlitzTimer] = useState<number>(60);
  const [survivalTime, setSurvivalTime] = useState<number>(0);
  const [lastEval, setLastEval] = useState<LineEvaluation | null>(null);
  const [flashBanner, setFlashBanner] = useState<{ text: string; positive: boolean } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Récords según modo aleatorio o nodo específico
  const scoreKey = isRandomMode ? 'random' : selectedNode.code;
  const [highScores, setHighScores] = useState<{ survival: number; blitz: number }>({ survival: 0, blitz: 0 });

  useEffect(() => {
    try {
      const s = localStorage.getItem(`paplitz_rush_survival_${scoreKey}`) || '0';
      const b = localStorage.getItem(`paplitz_rush_blitz_${scoreKey}`) || '0';
      const stg = localStorage.getItem(`paplitz_rush_stage_${scoreKey}`) || '1';
      setHighScores({ survival: parseInt(s, 10), blitz: parseInt(b, 10) });
      setBestStage(parseInt(stg, 10));
    } catch {
      setHighScores({ survival: 0, blitz: 0 });
      setBestStage(1);
    }
  }, [scoreKey]);

  // Trazado en curso
  const [userStroke, setUserStroke] = useState<Point[] | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const currentStrokeRef = useRef<Point[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nextSpawnTimeRef = useRef<number>(0);
  const activeLinesRef = useRef<ActiveRushLine[]>([]);
  const currentStageRef = useRef<number>(1);

  // Sincronizar referencias para callbacks y loops
  useEffect(() => {
    activeLinesRef.current = activeLines;
  }, [activeLines]);

  useEffect(() => {
    currentStageRef.current = currentStage;
  }, [currentStage]);

  // Máximo número de líneas simultáneas antes de desbordamiento (Game Over)
  const MAX_LINES_OVERFLOW = 6;

  // Cálculo de intervalo de spawn según el Stage de dificultad y número de líneas
  const getStageSpawnInterval = useCallback((stage: number, lineCount: number): number => {
    // Stage 1: ~2300ms
    // Stage 2: ~1800ms
    // Stage 3: ~1400ms
    // Stage 4: ~1100ms
    // Stage 5+: ~900ms
    const baseInterval = Math.max(900, 2300 - (stage - 1) * 350);
    if (lineCount === 0) return 250;
    if (lineCount === 1) return Math.max(450, Math.round(baseInterval * 0.75));
    return baseInterval;
  }, []);

// Zona de juego ampliada al máximo aprovechando los laterales, superior e inferior
const RUSH_SAFE_ZONE = {
  minX: 32,
  maxX: 568,
  minY: 72,
  maxY: 508,
};

// Cuadrantes y sectores distribuidos uniformemente por todo el lienzo (laterales, centro, extremos)
const RUSH_CANDIDATE_SECTORS = [
  // Lateral izquierdo
  { x: 110, y: 140 },
  { x: 110, y: 240 },
  { x: 110, y: 340 },
  { x: 110, y: 440 },
  // Cuadrante intermedio izquierdo
  { x: 210, y: 150 },
  { x: 210, y: 260 },
  { x: 210, y: 370 },
  { x: 210, y: 450 },
  // Eje central
  { x: 300, y: 160 },
  { x: 300, y: 280 },
  { x: 300, y: 390 },
  { x: 300, y: 460 },
  // Cuadrante intermedio derecho
  { x: 390, y: 150 },
  { x: 390, y: 260 },
  { x: 390, y: 370 },
  { x: 390, y: 450 },
  // Lateral derecho (evitando la esquina superior reservada para la tarjeta de nota si x > 470 && y < 120)
  { x: 490, y: 190 },
  { x: 490, y: 280 },
  { x: 490, y: 370 },
  { x: 490, y: 440 },
];

  // Genera una nueva línea basada en un nodo de calistenia garantizando que quede en zona 100% visible,
  // con mayor tamaño y variedad, sin intersecar con líneas existentes
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
          const tLine =
            challenge.targetLines.length > 1
              ? challenge.targetLines[rng.rangeInt(0, challenge.targetLines.length - 1)]
              : challenge.targetLines[0];
          rawPoints = tLine.idealPath && tLine.idealPath.length > 1 ? tLine.idealPath : [tLine.start, tLine.end];
        } else if (challenge.keyPoints && challenge.keyPoints.length >= 2) {
          const k0 = challenge.keyPoints[0];
          const k1 = challenge.keyPoints[challenge.keyPoints.length - 1];
          rawPoints = [k0, k1];
        }
      }

      // Si no hay puntos generados, fallback a línea horizontal en la zona segura central
      if (rawPoints.length < 2) {
        rawPoints = [
          { x: 160, y: 285 },
          { x: 440, y: 285 },
        ];
      }

      // Calcular bounding box y centroide del trazo original
      let rMinX = Infinity;
      let rMaxX = -Infinity;
      let rMinY = Infinity;
      let rMaxY = -Infinity;
      for (const p of rawPoints) {
        if (p.x < rMinX) rMinX = p.x;
        if (p.x > rMaxX) rMaxX = p.x;
        if (p.y < rMinY) rMinY = p.y;
        if (p.y > rMaxY) rMaxY = p.y;
      }
      const rawW = Math.max(1, rMaxX - rMinX);
      const rawH = Math.max(1, rMaxY - rMinY);
      const cx = (rMinX + rMaxX) / 2;
      const cy = (rMinY + rMaxY) / 2;
      const rawDim = Math.max(rawW, rawH, 1);

      // Detectar si es una forma 2D (polígono, cuadrado, círculo, zigzag, etc.) o una línea/arco simple
      const is2DForm = rawPoints.length > 2 && rawW > 25 && rawH > 25;

      // Escala base: dar mayor tamaño y variedad aleatoria
      let baseScale = 1.0;
      if (is2DForm) {
        // Formas: variedad entre 160px y 280px (sustancialmente más grandes que antes)
        const targetDim = rng.range(160, 280);
        let s = targetDim / rawDim;
        // Límites holgados dentro de la zona de juego
        s = Math.min(s, 440 / rawW, 340 / rawH);
        baseScale = Math.max(0.65, s);
      } else {
        // Líneas y curvas simples: variedad entre trazos rápidos y trazos largos de hombro
        const lineScaleFactor = rng.range(0.9, 1.45);
        let s = lineScaleFactor;
        s = Math.min(s, 500 / Math.max(rawW, 1), 400 / Math.max(rawH, 1));
        baseScale = Math.max(0.75, s);
      }

      // Función auxiliar para generar y ajustar puntos candidatos dado un sector y escala
      const tryPlacement = (
        sector: { x: number; y: number },
        scale: number
      ): Point[] | null => {
        const jitterX = rng.range(-15, 15);
        const jitterY = rng.range(-15, 15);
        const targetX = sector.x + jitterX;
        const targetY = sector.y + jitterY;
        const dx = targetX - cx;
        const dy = targetY - cy;

        const candidate = rawPoints.map((p) => ({
          x: cx + (p.x - cx) * scale + dx,
          y: cy + (p.y - cy) * scale + dy,
          pressure: p.pressure,
        }));

        let cMinX = Infinity;
        let cMaxX = -Infinity;
        let cMinY = Infinity;
        let cMaxY = -Infinity;
        for (const p of candidate) {
          if (p.x < cMinX) cMinX = p.x;
          if (p.x > cMaxX) cMaxX = p.x;
          if (p.y < cMinY) cMinY = p.y;
          if (p.y > cMaxY) cMaxY = p.y;
        }

        // Clamp dentro de la zona de juego segura
        let offX = 0;
        let offY = 0;
        if (cMinX < RUSH_SAFE_ZONE.minX) offX = RUSH_SAFE_ZONE.minX - cMinX;
        else if (cMaxX > RUSH_SAFE_ZONE.maxX) offX = RUSH_SAFE_ZONE.maxX - cMaxX;

        if (cMinY < RUSH_SAFE_ZONE.minY) offY = RUSH_SAFE_ZONE.minY - cMinY;
        else if (cMaxY > RUSH_SAFE_ZONE.maxY) offY = RUSH_SAFE_ZONE.maxY - cMaxY;

        // Evitar el área de la tarjeta de nota en la esquina superior derecha (x > 470 && y < 120)
        if (cMaxX + offX > 470 && cMinY + offY < 120) {
          if (cMaxY + offY + (120 - (cMinY + offY)) <= RUSH_SAFE_ZONE.maxY) {
            offY += (120 - (cMinY + offY));
          } else {
            offX -= (cMaxX + offX - 470);
          }
        }

        const placed = candidate.map((p) => ({
          x: Math.round(Math.max(RUSH_SAFE_ZONE.minX, Math.min(RUSH_SAFE_ZONE.maxX, p.x + offX))),
          y: Math.round(Math.max(RUSH_SAFE_ZONE.minY, Math.min(RUSH_SAFE_ZONE.maxY, p.y + offY))),
          pressure: p.pressure,
        }));

        return placed;
      };

      // Si no hay líneas previas, colocamos directamente en un sector aleatorio
      if (existingLines.length === 0) {
        const shuffled = [...RUSH_CANDIDATE_SECTORS].sort(() => Math.random() - 0.5);
        const placedPoints = tryPlacement(shuffled[0], baseScale) || rawPoints;
        return {
          id: `rush-line-${Date.now()}-${Math.random()}`,
          points: placedPoints,
          startPoint: placedPoints[0],
          endPoint: placedPoints[placedPoints.length - 1],
          spawnTime: Date.now(),
          label,
        };
      }

      // Con líneas existentes: buscar ubicación que NO corte ninguna línea y maximice la distancia/despeje
      const scaleCandidates = [baseScale, baseScale * 0.85, baseScale * 0.72];
      let bestPlacedPoints: Point[] | null = null;
      let bestClearance = -1;
      let fallbackCandidate: { points: Point[]; clearance: number; intersections: number } | null = null;

      for (const scale of scaleCandidates) {
        const shuffled = [...RUSH_CANDIDATE_SECTORS].sort(() => Math.random() - 0.5);

        for (const sector of shuffled) {
          const cand = tryPlacement(sector, scale);
          if (!cand) continue;

          let intersectionCount = 0;
          let minClearance = Infinity;

          for (const exLine of existingLines) {
            if (doPolylinesIntersect(cand, exLine.points)) {
              intersectionCount++;
            }
            const d = minDistanceBetweenPolylines(cand, exLine.points);
            if (d < minClearance) minClearance = d;
          }

          // Criterio ideal: 0 intersecciones y margen >= 24px
          if (intersectionCount === 0 && minClearance >= 24) {
            if (minClearance > bestClearance) {
              bestClearance = minClearance;
              bestPlacedPoints = cand;
            }
          }

          // Guardar el mejor fallback posible (mínimas intersecciones y máximo despeje)
          if (
            !fallbackCandidate ||
            intersectionCount < fallbackCandidate.intersections ||
            (intersectionCount === fallbackCandidate.intersections && minClearance > fallbackCandidate.clearance)
          ) {
            fallbackCandidate = { points: cand, clearance: minClearance, intersections: intersectionCount };
          }
        }

        // Si ya encontramos un candidato limpio en esta escala, no necesitamos reducir más
        if (bestPlacedPoints && bestClearance >= 30) {
          break;
        }
      }

      const finalPoints =
        bestPlacedPoints ||
        fallbackCandidate?.points ||
        tryPlacement(RUSH_CANDIDATE_SECTORS[0], baseScale) ||
        rawPoints;

      return {
        id: `rush-line-${Date.now()}-${Math.random()}`,
        points: finalPoints,
        startPoint: finalPoints[0],
        endPoint: finalPoints[finalPoints.length - 1],
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
        ? (allCalNodes[Math.floor(Math.random() * allCalNodes.length)] || selectedNode)
        : selectedNode;
      return spawnLineForNode(nodeToUse, existingLines);
    },
    [isRandomMode, allCalNodes, selectedNode, spawnLineForNode]
  );

  // Iniciar partida
  const startGame = useCallback((mode: 'survival' | 'blitz' = gameMode) => {
    setIsSidebarOpen(false);
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

    // Reiniciar sistema de Actos / Stages
    setCurrentStage(1);
    currentStageRef.current = 1;
    setStageSecondsLeft(STAGE_DURATION);
    setStageClearedCount(0);
    setStageScores([]);
    setStageBestCombo(0);
    setStagesCompleted(0);

    // Inicializar con 2 líneas en pantalla de inmediato
    const firstLine = spawnNextLine([]);
    const secondLine = spawnNextLine([firstLine]);
    setActiveLines([firstLine, secondLine]);
    activeLinesRef.current = [firstLine, secondLine];

    // Programar primer spawn de la avalancha
    const firstDelay = getStageSpawnInterval(1, 2);
    nextSpawnTimeRef.current = Date.now() + firstDelay;
  }, [gameMode, spawnNextLine, getStageSpawnInterval, STAGE_DURATION]);

  // Fin de la partida (por desbordamiento, tiempo o finalización voluntaria del usuario)
  const finishGame = useCallback(
    (reason: 'overflow' | 'timeout' | 'manual') => {
      setGameOverReason(reason);
      setGameState('gameover');
      setUserStroke(null);
      setIsDrawing(false);
      if (onDrawingStateChange) onDrawingStateChange(false);

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
        try {
          const prevBestStage = parseInt(localStorage.getItem(`paplitz_rush_stage_${scoreKey}`) || '1', 10);
          if (currentStageRef.current > prevBestStage) {
            localStorage.setItem(`paplitz_rush_stage_${scoreKey}`, currentStageRef.current.toString());
            setBestStage(currentStageRef.current);
          }
        } catch {
          // Ignorar
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
        if (reason === 'manual') {
          onAvatarMoodChange('success-stars');
        } else {
          onAvatarMoodChange(count > 6 ? 'success-stars' : 'fail-spiral');
        }
        setTimeout(() => onAvatarMoodChange('neutral'), 3000);
      }
    },
    [clearedScores, gameMode, highScores, onAvatarMoodChange, onAwardXP, onDrawingStateChange, scoreKey]
  );

  // Superación de un Acto / Stage (Pausa táctica y estadísticas)
  const handleStageClear = useCallback(() => {
    setGameState('stage_break');
    setUserStroke(null);
    setIsDrawing(false);
    if (onDrawingStateChange) onDrawingStateChange(false);

    // Bonus de XP por superar el Acto
    const stageBonusXP = 30 + Math.round(stageClearedCount * 4);
    onAwardXP(stageBonusXP);

    if (onAvatarMoodChange) {
      onAvatarMoodChange('success-stars');
      setTimeout(() => onAvatarMoodChange('neutral'), 3000);
    }

    setStagesCompleted((prev) => {
      const nextCompleted = prev + 1;
      try {
        const prevBestStage = parseInt(localStorage.getItem(`paplitz_rush_stage_${scoreKey}`) || '1', 10);
        if (nextCompleted + 1 > prevBestStage) {
          localStorage.setItem(`paplitz_rush_stage_${scoreKey}`, (nextCompleted + 1).toString());
          setBestStage(nextCompleted + 1);
        }
      } catch {
        // Ignorar
      }
      return nextCompleted;
    });

    // Limpiar líneas activas del lienzo para dar descanso visual
    setActiveLines([]);
    activeLinesRef.current = [];
  }, [stageClearedCount, onAwardXP, onAvatarMoodChange, onDrawingStateChange, scoreKey]);

  // Continuar al siguiente Acto / Stage con mayor dificultad
  const handleNextStage = useCallback(() => {
    const nextStage = currentStage + 1;
    setCurrentStage(nextStage);
    currentStageRef.current = nextStage;
    setStageSecondsLeft(STAGE_DURATION);
    setStageClearedCount(0);
    setStageScores([]);
    setStageBestCombo(0);
    setUserStroke(null);
    setLastEval(null);

    // Inicializar con 2 líneas para el nuevo acto
    const l1 = spawnNextLine([]);
    const l2 = spawnNextLine([l1]);
    setActiveLines([l1, l2]);
    activeLinesRef.current = [l1, l2];

    const firstDelay = getStageSpawnInterval(nextStage, 2);
    nextSpawnTimeRef.current = Date.now() + firstDelay;

    setGameState('playing');
  }, [currentStage, spawnNextLine, getStageSpawnInterval, STAGE_DURATION]);

  // Loop de la Avalancha: ticks continuos de 100ms que NO se resetean cada vez que el usuario dibuja
  useEffect(() => {
    if (gameState !== 'playing') return;

    const spawnCheck = window.setInterval(() => {
      const now = Date.now();
      if (now >= nextSpawnTimeRef.current) {
        setActiveLines((prev) => {
          if (prev.length >= MAX_LINES_OVERFLOW) {
            finishGame('overflow');
            return prev;
          }

          const stage = currentStageRef.current;
          // Ráfaga doble a partir del Acto 2 si hay pocas líneas (≤2)
          const shouldDouble = stage >= 2 && prev.length <= 2 && Math.random() < 0.22;

          const l1 = spawnNextLine(prev);
          const updated = [...prev, l1];
          if (shouldDouble && updated.length < MAX_LINES_OVERFLOW) {
            updated.push(spawnNextLine(updated));
          }

          if (updated.length >= MAX_LINES_OVERFLOW) {
            finishGame('overflow');
          }
          return updated;
        });

        const nextDelay = getStageSpawnInterval(currentStageRef.current, activeLinesRef.current.length);
        nextSpawnTimeRef.current = now + nextDelay;
      }
    }, 100);

    return () => clearInterval(spawnCheck);
  }, [gameState, finishGame, spawnNextLine, getStageSpawnInterval, MAX_LINES_OVERFLOW]);

  // Temporizador principal de juego (1s)
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
        // Supervivencia con Stages (Actos de 30s)
        setSurvivalTime((prev) => prev + 1);
        setStageSecondsLeft((prev) => {
          if (prev <= 1) {
            handleStageClear();
            return STAGE_DURATION;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, gameMode, finishGame, handleStageClear, STAGE_DURATION]);

  // Renderizado del lienzo de alta definición (HiDPI / Retina responsive)
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

      // Nodo de fin ② (solo si no coincide con el de inicio, e.g. formas cerradas)
      const p1 = line.endPoint;
      const isClosed = Math.hypot(p1.x - p0.x, p1.y - p0.y) < 14;
      if (!isClosed) {
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = strokeColor;
        ctx.fillText('2', p1.x, p1.y);
      }

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

  useEffect(() => {
    const handleResize = () => {
      renderCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

    // 1. Identificar con precisión a cuál de las líneas activas apuntaba el usuario
    // Evaluamos el trazo del usuario contra TODAS las líneas activas para evitar
    // que una línea cercana o en otra capa intercepte erróneamente la calificación.
    let bestLineIndex = -1;
    let bestEvalResult: { score: number; avgDist: number; passed: boolean } | null = null;
    let highestPassingScore = -1;
    let highestOverallScore = -1;
    let bestOverallIdx = -1;
    let bestOverallEval: { score: number; avgDist: number; passed: boolean } | null = null;

    for (let i = 0; i < activeLines.length; i++) {
      const line = activeLines[i];
      const evalRes = evaluateUserStrokeAgainstLine(recorded, line.points);

      // Si supera el umbral de aprobación (>= 70%), es un candidato prioritario
      if (evalRes.passed) {
        if (evalRes.score > highestPassingScore) {
          highestPassingScore = evalRes.score;
          bestLineIndex = i;
          bestEvalResult = evalRes;
        }
      }

      // Seguimiento del mejor score global por si ninguna llega al 70%
      if (evalRes.score > highestOverallScore) {
        highestOverallScore = evalRes.score;
        bestOverallIdx = i;
        bestOverallEval = evalRes;
      }
    }

    // Si ninguna línea aprobó, usamos la que obtuvo mayor coincidencia geométrica
    if (bestLineIndex === -1) {
      bestLineIndex = bestOverallIdx;
      bestEvalResult = bestOverallEval;
    }

    if (bestLineIndex === -1 || !bestEvalResult) {
      renderCanvas();
      return;
    }

    const targetLine = activeLines[bestLineIndex];
    const evalResult = bestEvalResult;

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
          nextSpawnTimeRef.current = Math.min(nextSpawnTimeRef.current, Date.now() + 250);
        }
        return nextLines;
      });

      setClearedScores((prev) => [...prev, evalResult.score]);
      setStageClearedCount((prev) => prev + 1);
      setStageScores((prev) => [...prev, evalResult.score]);

      const nextCombo = comboStreak + 1;
      setComboStreak(nextCombo);
      if (nextCombo > bestCombo) setBestCombo(nextCombo);
      setStageBestCombo((prev) => Math.max(prev, nextCombo));

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

      {/* 2. HUD SUPERIOR: A LA MISMA ALTURA QUE EL BOTÓN PANEL ALINEADO CON EL LIENZO (SOLO EN PARTIDA) */}
      {gameState !== 'idle' && (
        <div
          className="absolute top-2.5 sm:top-3 z-20 flex items-start justify-between pointer-events-none px-2 sm:px-0"
          style={{
            width: 'min(calc(100% - 130px), 600px, calc((100dvh - 180px) * (600 / 540)))',
          }}
        >
          {/* Tira compacta a la izquierda */}
          <div className="pointer-events-auto self-start font-mono text-xs select-none bg-white border-2 border-black p-1 sm:p-1.5 shadow-[3px_3px_0px_#000000] flex items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] font-mono bg-black text-white px-1.5 py-0.5 font-bold uppercase shrink-0 shadow-[1px_1px_0px_#000]">
              {gameMode === 'survival' ? `ACTO ${currentStage}` : 'BLITZ 60s'}
            </span>
            <div className="flex items-center gap-1 bg-neutral-100 border border-black px-1.5 py-0.5">
              <Clock className="w-3 h-3 stroke-[2.5]" />
              <span className="text-[11px] font-bold tabular-nums">
                {gameMode === 'survival' ? `${stageSecondsLeft}s` : `${blitzTimer}s`}
              </span>
            </div>
            {/* 6 cuadritos visuales de saturación */}
            <div className="flex items-center gap-0.5 px-1 py-0.5 bg-neutral-100 border border-black" title={`Líneas en pantalla: ${activeLines.length}/${MAX_LINES_OVERFLOW}`}>
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <span
                  key={idx}
                  className={`w-2 h-2 border border-black transition-colors ${
                    idx < activeLines.length
                      ? idx >= 4
                        ? 'bg-red-600'
                        : 'bg-black'
                      : 'bg-white'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1 bg-neutral-100 border border-black px-1.5 py-0.5">
              <Flame className="w-3 h-3 fill-black text-black" />
              <span className="text-[11px] font-bold tabular-nums">{clearedScores.length} ({comboStreak}x)</span>
            </div>
            {averageGrade > 0 && (
              <span className="text-[10px] font-mono font-bold text-neutral-600 hidden sm:inline">
                Media: {averageGrade}%
              </span>
            )}
          </div>

          {/* A la derecha del dibujo: Cuadradito compacto con la nota (a la misma altura) */}
          {lastEval && gameState === 'playing' ? (
            <div className="pointer-events-auto self-start bg-white border-2 border-black p-2 sm:p-2.5 shadow-[4px_4px_0px_#000000] font-mono flex flex-col items-center justify-center min-w-[88px] sm:min-w-[100px] aspect-square animate-in fade-in zoom-in-95 duration-150">
              <span className="text-[10px] sm:text-xs font-bold uppercase text-neutral-500 tracking-wider">
                Nota
              </span>
              <span className="text-2xl sm:text-3xl font-black leading-none my-1">
                {lastEval.score}%
              </span>
              <span
                className={`text-[9px] sm:text-[10px] font-bold uppercase px-1.5 py-0.5 border border-black ${
                  lastEval.passed ? 'bg-black text-white' : 'bg-red-600 text-white'
                }`}
              >
                {lastEval.passed ? 'Eliminada' : 'Fallo'}
              </span>
            </div>
          ) : (
            <div />
          )}
        </div>
      )}

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
            <div className="p-1.5 bg-neutral-50 border border-black text-[10px] text-neutral-600 leading-tight flex items-center gap-1.5">
              <Shuffle className="w-3.5 h-3.5 shrink-0 text-black stroke-[2.5]" />
              <span><strong>Modo Dinámico:</strong> Cada trazo generado es diferente (horizontales, verticales, diagonales y curvas).</span>
            </div>
          )}
        </div>

        {/* PANEL DE ESTADÍSTICAS EN VIVO */}
        <div className="space-y-2 pt-1 border-t-2 border-black">
          {/* Acto actual y temporizador hacia el descanso (en Supervivencia) */}
          {gameMode === 'survival' && (
            <div className="border-2 border-black p-2 bg-neutral-50 shadow-[2px_2px_0px_#000000] space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                <span className="flex items-center gap-1 text-black font-black">
                  <Sparkles className="w-3 h-3 text-black stroke-[2.5]" />
                  <span>Acto {currentStage}</span>
                </span>
                <span className="text-neutral-500 font-mono">
                  Descanso en: <strong className="text-black font-bold">{stageSecondsLeft}s</strong>
                </span>
              </div>
              {/* Barra de progreso de tiempo del acto */}
              <div className="w-full h-1.5 bg-neutral-200 border border-black overflow-hidden">
                <div
                  className="h-full bg-black transition-all duration-300"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, ((STAGE_DURATION - stageSecondsLeft) / STAGE_DURATION) * 100)
                    )}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[9px] text-neutral-500 font-mono">
                <span>Dificultad Nivel {currentStage}</span>
                <span>{(getStageSpawnInterval(currentStage, 2) / 1000).toFixed(1)}s / trazo</span>
              </div>
            </div>
          )}

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
            <span className="font-bold">{highScores.survival} líneas</span>
          </div>
          {gameMode === 'survival' && (
            <div className="flex justify-between">
              <span className="text-neutral-500">Mejor Acto Alcanzado:</span>
              <span className="font-bold">Acto {bestStage}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-neutral-500">Récord Blitz:</span>
            <span className="font-bold">{highScores.blitz} líneas</span>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN: FINALIZAR PARTIDA, REINICIAR O EMPEZAR */}
        <div className="pt-2 mt-auto">
          {gameState === 'playing' ? (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => finishGame('manual')}
                className="w-full btn-ink py-2 px-3 text-xs font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000] hover:bg-neutral-900"
                title="Finalizar partida y registrar tu progreso actual"
              >
                <Flag className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Finalizar Partida</span>
              </button>
              <button
                type="button"
                onClick={() => startGame(gameMode)}
                className="w-full btn-ink-outline py-1.5 px-3 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-[1px_1px_0px_#000000] hover:bg-neutral-100"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reiniciar</span>
              </button>
            </div>
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
        </div>
      </aside>
      )}

      {/* 3. ÁREA CENTRAL: LIENZO 100% INTEGRADO CON EL FONDO */}
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
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="block w-full h-full cursor-crosshair touch-none select-none z-10 pointer-events-auto"
        />

        {/* Banner de Feedback instantáneo */}
        {flashBanner && (
          <div
            className={`absolute top-3 z-30 px-3 py-1.5 font-mono text-xs font-bold border-2 shadow-[3px_3px_0px_#000000] animate-bounce pointer-events-none ${
              flashBanner.positive ? 'bg-black text-white border-white' : 'bg-red-600 text-white border-black'
            }`}
          >
            {flashBanner.text}
          </div>
        )}

        {/* Pantalla de inicio previa sobre el lienzo */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-3 sm:p-5 border-2 border-black z-20 text-center font-mono pointer-events-auto select-none overflow-y-auto max-h-full">
            <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-black mb-1 animate-bounce stroke-[2.5]" />
            <h3 className="text-lg sm:text-2xl font-bold font-display uppercase tracking-tight">
              Avalancha de Trazos
            </h3>
            <p className="text-[11px] sm:text-xs text-neutral-600 mt-0.5 sm:mt-1 max-w-sm sm:max-w-md leading-relaxed">
              {isRandomMode ? (
                <>Modo Aleatorio activado: traza cada línea diferente de <strong>① a ②</strong> con nota <strong>≥70%</strong> para eliminarla.</>
              ) : (
                <>Las líneas aparecen según <strong>{selectedNode.code} · {selectedNode.title}</strong>. Traza de <strong>① a ②</strong> con nota <strong>≥70%</strong>.</>
              )}
              <br />
              {gameMode === 'survival' ? (
                <><strong>Supervivencia por Actos:</strong> Resiste oleadas de {STAGE_DURATION}s. Entre actos tendrás pausas de descanso con estadísticas y cada vez mayor dificultad.</>
              ) : (
                <><strong>Blitz 60s:</strong> Elimina todas las líneas posibles antes de que termine el tiempo.</>
              )}
            </p>

            <div className="my-2 sm:my-3 p-2 sm:p-3 border-2 border-black bg-neutral-50 text-[11px] sm:text-xs w-56 sm:w-64 space-y-1 shadow-[2px_2px_0px_#000000] sm:shadow-[3px_3px_0px_#000000]">
              <div className="flex justify-between">
                <span className="text-neutral-500">Récord Supervivencia:</span>
                <span className="font-bold">{highScores.survival} líneas</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Mejor Acto Alcanzado:</span>
                <span className="font-bold">Acto {bestStage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Récord Blitz (60s):</span>
                <span className="font-bold">{highScores.blitz} líneas</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => startGame(gameMode)}
              className="btn-ink px-4 sm:px-6 py-2 sm:py-2.5 text-[11px] sm:text-xs uppercase font-bold flex items-center gap-2 cursor-pointer shadow-[3px_3px_0px_#000000] hover:bg-neutral-900 active:scale-95 transition-transform"
            >
              <Sparkles className="w-4 h-4 fill-white stroke-none" />
              <span>Empezar Partida ({gameMode === 'survival' ? 'Supervivencia por Actos' : 'Blitz 60s'})</span>
            </button>
          </div>
        )}

        {/* Modal de Descanso entre Actos / Stages */}
        {gameState === 'stage_break' && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-3 sm:p-5 border-2 border-black z-20 text-center font-mono animate-fade-in select-none pointer-events-auto overflow-y-auto max-h-full">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-black text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1.5 sm:mb-2 border border-black shadow-[2px_2px_0px_#000000]">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>¡ACTO {currentStage} SUPERADO!</span>
              <Sparkles className="w-3.5 h-3.5" />
            </div>

            <h3 className="text-lg sm:text-2xl font-black font-display uppercase tracking-tight text-black">
              DESCANSO ENTRE ACTOS
            </h3>
            <p className="text-[11px] sm:text-xs text-neutral-600 mt-0.5 max-w-sm">
              ¡Lienzo despejado! Has resistido los {STAGE_DURATION}s del Acto {currentStage} sin saturar la pantalla.
            </p>

            {/* Resumen de estadísticas del Acto */}
            <div className="my-2 sm:my-3 p-2.5 sm:p-3.5 border-2 border-black bg-neutral-50 w-full max-w-xs space-y-1.5 sm:space-y-2 text-[11px] sm:text-xs shadow-[3px_3px_0px_#000000]">
              <div className="flex justify-between items-center pb-1 border-b border-neutral-300">
                <span className="text-neutral-500 font-bold uppercase text-[10px]">Trazos en Acto {currentStage}:</span>
                <span className="font-bold text-sm bg-black text-white px-1.5 py-0.2">
                  {stageClearedCount} líneas
                </span>
              </div>
              <div className="flex justify-between items-center pb-1 border-b border-neutral-300">
                <span className="text-neutral-500 font-bold uppercase text-[10px]">Precisión Media del Acto:</span>
                <span className="font-bold text-sm">
                  {stageScores.length > 0 ? Math.round(stageScores.reduce((a, b) => a + b, 0) / stageScores.length) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center pb-1 border-b border-neutral-300">
                <span className="text-neutral-500 font-bold uppercase text-[10px]">Racha en este Acto:</span>
                <span className="font-bold text-sm">{stageBestCombo} seguidas</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 font-bold uppercase text-[10px]">Total Acumulado:</span>
                <span className="font-bold text-sm">{clearedScores.length} líneas ({stagesCompleted} actos)</span>
              </div>
            </div>

            {/* Previa técnica del siguiente Acto */}
            <div className="mb-2.5 sm:mb-3.5 p-2 bg-neutral-100 border border-black text-left w-full max-w-xs text-[10px] sm:text-[11px] space-y-1">
              <div className="font-bold text-black flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                <span>Próximo Reto: Acto {currentStage + 1}</span>
              </div>
              <p className="text-neutral-600 text-[9px] sm:text-[10px] leading-snug">
                La avalancha acelera su cadencia a <strong>{(getStageSpawnInterval(currentStage + 1, 2) / 1000).toFixed(1)}s</strong> por trazo
                {currentStage + 1 >= 2 ? ' con posibles ráfagas continuas' : ''}. Mantén la fluidez y velocidad sin dudar.
              </p>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
              <button
                type="button"
                onClick={handleNextStage}
                className="flex-1 btn-ink py-2 sm:py-2.5 px-3 text-xs uppercase font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-[3px_3px_0px_#000000] hover:bg-neutral-900"
              >
                <Play className="w-3.5 h-3.5 fill-white stroke-none" />
                <span>Comenzar Acto {currentStage + 1}</span>
              </button>
              <button
                type="button"
                onClick={() => finishGame('manual')}
                className="btn-ink-outline py-2 sm:py-2.5 px-3 text-xs uppercase font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000] hover:bg-neutral-100"
              >
                <Flag className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Finalizar y Guardar</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal de Fin de Partida */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-3 sm:p-5 border-2 border-black z-20 text-center font-mono animate-fade-in pointer-events-auto select-none overflow-y-auto max-h-full">
            <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-black mb-1.5 animate-bounce stroke-[2.5]" />
            <h3 className="text-lg sm:text-2xl font-bold font-display uppercase tracking-tight">
              {gameOverReason === 'manual'
                ? '¡Partida Guardada!'
                : gameOverReason === 'overflow'
                ? '¡Desbordamiento de Pantalla!'
                : '¡Tiempo Finalizado!'}
            </h3>
            <p className="text-[11px] sm:text-xs text-neutral-600 mt-0.5 sm:mt-1 max-w-sm">
              {gameOverReason === 'manual'
                ? 'Has finalizado la partida voluntariamente y tu progreso ha quedado guardado.'
                : gameOverReason === 'overflow'
                ? 'Las líneas se acumularon hasta saturar el lienzo (6 líneas).'
                : 'Completaste los 60 segundos de alta velocidad.'}
            </p>

            {/* TABLA DE RESULTADOS */}
            <div className="my-2.5 sm:my-4 p-2.5 sm:p-3.5 border-2 border-black bg-neutral-50 w-64 sm:w-72 space-y-1.5 sm:space-y-2 text-[11px] sm:text-xs shadow-[3px_3px_0px_#000000]">
              {gameMode === 'survival' && (
                <div className="flex justify-between items-center pb-1 border-b border-neutral-300">
                  <span className="text-neutral-500 font-bold uppercase text-[10px]">Actos Superados:</span>
                  <span className="font-bold text-sm bg-black text-white px-1.5 py-0.2">
                    {stagesCompleted} {stagesCompleted === 1 ? 'acto' : 'actos'} (Acto {currentStage})
                  </span>
                </div>
              )}
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
                className="btn-ink px-3 sm:px-4 py-1.5 sm:py-2 text-xs uppercase font-bold flex items-center gap-1.5 cursor-pointer shadow-[3px_3px_0px_#000000]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Jugar de Nuevo</span>
              </button>
              <button
                type="button"
                onClick={() => setGameState('idle')}
                className="btn-ink-outline px-3 sm:px-4 py-1.5 sm:py-2 text-xs uppercase font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
              >
                <span>Configuración</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. BARRA DE HERRAMIENTAS FLOTANTE INFERIOR (NEOBRUTALISTA PAPLITZ) */}
      <div className="absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto font-mono text-xs">
        <div className="bg-white border-2 border-black p-1.5 sm:p-2 shadow-[4px_4px_0px_#000000] flex items-center gap-1.5 sm:gap-2 max-w-[calc(100vw-24px)] overflow-x-auto">
          {/* Modalidad toggle */}
          <div className="flex items-center gap-1 border-r border-neutral-300 pr-1.5 sm:pr-2">
            <button
              type="button"
              onClick={() => {
                setGameMode('survival');
                if (gameState === 'playing') startGame('survival');
              }}
              className={`px-2 py-1 text-[10px] font-bold border border-black cursor-pointer transition-colors whitespace-nowrap ${
                gameMode === 'survival'
                  ? 'bg-black text-white shadow-[1px_1px_0px_#000000]'
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              Supervivencia
            </button>
            <button
              type="button"
              onClick={() => {
                setGameMode('blitz');
                if (gameState === 'playing') startGame('blitz');
              }}
              className={`px-2 py-1 text-[10px] font-bold border border-black cursor-pointer transition-colors whitespace-nowrap ${
                gameMode === 'blitz'
                  ? 'bg-black text-white shadow-[1px_1px_0px_#000000]'
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              Blitz 60s
            </button>
          </div>

          {/* Aleatorio toggle */}
          <button
            type="button"
            onClick={() => {
              setIsRandomMode((prev) => !prev);
              if (gameState === 'playing') startGame(gameMode);
            }}
            className={`px-2 py-1 text-[10px] font-bold border border-black cursor-pointer transition-colors flex items-center gap-1 whitespace-nowrap ${
              isRandomMode
                ? 'bg-black text-white shadow-[1px_1px_0px_#000000]'
                : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200'
            }`}
            title={isRandomMode ? "Modo Dinámico Aleatorio" : `Nivel ${selectedNode.code}`}
          >
            <Shuffle className="w-3 h-3" />
            <span>{isRandomMode ? 'Aleatorio' : selectedNode.code}</span>
          </button>

          {/* Controles de partida */}
          {gameState === 'playing' ? (
            <>
              <button
                type="button"
                onClick={() => startGame(gameMode)}
                className="btn-ink-outline px-2 py-1 text-xs font-bold flex items-center gap-1 cursor-pointer shadow-[1px_1px_0px_#000000] whitespace-nowrap"
                title="Reiniciar partida"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Reiniciar</span>
              </button>
              <button
                type="button"
                onClick={() => finishGame('manual')}
                className="btn-ink px-3 py-1 text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000] whitespace-nowrap"
                title="Finalizar partida y registrar tu progreso actual"
              >
                <Flag className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Finalizar</span>
              </button>
            </>
          ) : gameState === 'idle' ? (
            <button
              type="button"
              onClick={() => startGame(gameMode)}
              className="btn-ink px-3 py-1 text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000] whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 fill-white stroke-none" />
              <span>Empezar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startGame(gameMode)}
              className="btn-ink px-3 py-1 text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000] whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
