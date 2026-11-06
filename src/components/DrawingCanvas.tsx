import React, { useRef, useEffect, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { CubeChallenge, Point2D } from '../lib/geometry';
import { UserStroke, ValidationFeedback, countDetectedAristas } from '../lib/validation';
import { Undo2, Trash2, Check, ArrowRight, AlertTriangle, Clock, Copy, Download, X, Pen, Hand, Eye, FileText, PanelLeft, MessageSquare, Sparkles, PenTool } from 'lucide-react';
import { buildDebugReport, copyReportToClipboard, downloadReportJson } from '../lib/debugReport';
import { QuickCommentModal } from './QuickCommentModal';

/**
 * Dibuja trama manga screentone bilineal en perspectiva sobre una cara cuadrilátera
 */
function renderScreentoneQuad(
  ctx: CanvasRenderingContext2D,
  pBottomFront: Point2D,
  pTopFront: Point2D,
  pBottomSide: Point2D,
  pTopSide: Point2D
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pBottomFront.x, pBottomFront.y);
  ctx.lineTo(pTopFront.x, pTopFront.y);
  ctx.lineTo(pTopSide.x, pTopSide.y);
  ctx.lineTo(pBottomSide.x, pBottomSide.y);
  ctx.closePath();
  ctx.clip();

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
}

/**
 * Dibuja un mallado cuadrado en perspectiva sobre el plano del suelo con líneas muy finas
 */
function renderGroundGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  v0: Point2D,
  v2: Point2D,
  v4: Point2D,
  horizonY: number,
  exactVPL?: Point2D,
  exactVPR?: Point2D
) {
  ctx.save();
  // Limitar el suelo al área por debajo del horizonte
  ctx.beginPath();
  ctx.rect(0, horizonY + 8, width, height - (horizonY + 8));
  ctx.clip();

  ctx.strokeStyle = '#ECECEC'; // Gris papel tenue y elegante
  ctx.lineWidth = 0.75;
  ctx.setLineDash([]);

  // Puntos de fuga en el horizonte
  let VPL = exactVPL;
  if (!VPL) {
    const dyL = v2.y - v0.y;
    const dxL = v2.x - v0.x;
    const tL = (horizonY - v0.y) / (dyL || -0.001);
    VPL = { x: v0.x + tL * dxL, y: horizonY };
  }

  let VPR = exactVPR;
  if (!VPR) {
    const dyR = v4.y - v0.y;
    const dxR = v4.x - v0.x;
    const tR = (horizonY - v0.y) / (dyR || -0.001);
    VPR = { x: v0.x + tR * dxR, y: horizonY };
  }

  const distR_to_V4 = Math.hypot(v4.x - v0.x, v4.y - v0.y);
  const totalDistR = Math.hypot(VPR.x - v0.x, VPR.y - v0.y) || 1;
  const uDirR = { x: (VPR.x - v0.x) / totalDistR, y: (VPR.y - v0.y) / totalDistR };

  const distL_to_V2 = Math.hypot(v2.x - v0.x, v2.y - v0.y);
  const totalDistL = Math.hypot(VPL.x - v0.x, VPL.y - v0.y) || 1;
  const uDirL = { x: (VPL.x - v0.x) / totalDistL, y: (VPL.y - v0.y) / totalDistL };

  // Familia 1: líneas que convergen hacia VPL (recorriendo el suelo a lo largo del eje derecho)
  for (let j = -3; j <= 5; j++) {
    const s3d = j;
    const denom = 1 + s3d * (distR_to_V4 / totalDistR);
    if (denom <= 0.05) continue;
    const s2d = (s3d * distR_to_V4) / denom;
    const pt = { x: v0.x + uDirR.x * s2d, y: v0.y + uDirR.y * s2d };

    const dir = { x: pt.x - VPL.x, y: pt.y - VPL.y };
    ctx.beginPath();
    ctx.moveTo(VPL.x + dir.x * 0.35, VPL.y + dir.y * 0.35);
    ctx.lineTo(VPL.x + dir.x * 2.8, VPL.y + dir.y * 2.8);
    ctx.stroke();
  }

  // Familia 2: líneas que convergen hacia VPR (recorriendo el suelo a lo largo del eje izquierdo)
  for (let i = -3; i <= 5; i++) {
    const s3d = i;
    const denom = 1 + s3d * (distL_to_V2 / totalDistL);
    if (denom <= 0.05) continue;
    const s2d = (s3d * distL_to_V2) / denom;
    const pt = { x: v0.x + uDirL.x * s2d, y: v0.y + uDirL.y * s2d };

    const dir = { x: pt.x - VPR.x, y: pt.y - VPR.y };
    ctx.beginPath();
    ctx.moveTo(VPR.x + dir.x * 0.35, VPR.y + dir.y * 0.35);
    ctx.lineTo(VPR.x + dir.x * 2.8, VPR.y + dir.y * 2.8);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Dibuja la línea de horizonte y los puntos de fuga con líneas sutiles
 * (Activado a partir del Bloque 2 en adelante para guiar el dibujo del cubo)
 */
function renderHorizonAndVanishingPoints(
  ctx: CanvasRenderingContext2D,
  width: number,
  _height: number,
  challenge: CubeChallenge
) {
  const hy = challenge.horizonY;
  const vpl = challenge.vanishingPointLeft;
  const vpr = challenge.vanishingPointRight;

  ctx.save();

  // 1. Línea de horizonte técnica continua y visible de borde a borde
  ctx.strokeStyle = '#94A3B8'; // Slate-400: nítida y técnica
  ctx.lineWidth = 1.2;
  ctx.setLineDash([8, 5]);
  ctx.beginPath();
  ctx.moveTo(0, hy);
  ctx.lineTo(width, hy);
  ctx.stroke();

  // Etiqueta sutil central de la Línea de Horizonte
  ctx.setLineDash([]);
  ctx.fillStyle = '#64748B'; // Slate-500
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('L.H. (HORIZONTE)', width / 2, hy - 4);

  // 2. Puntos de Fuga visibles sobre el horizonte (VPL y VPR)
  const drawVpMarker = (vp: Point2D, label: string, isLeft: boolean) => {
    const margin = 12;
    const isOnScreen = vp.x >= margin && vp.x <= width - margin;

    if (isOnScreen) {
      // Anillo concéntrico sutil de enfoque
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1.0;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.arc(vp.x, hy, 8, 0, Math.PI * 2);
      ctx.stroke();

      // Cruz técnica de precisión
      ctx.setLineDash([]);
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(vp.x - 11, hy);
      ctx.lineTo(vp.x + 11, hy);
      ctx.moveTo(vp.x, hy - 11);
      ctx.lineTo(vp.x + 11, hy);
      ctx.stroke();

      // Punto central sólido de alto contraste (bullseye)
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(vp.x, hy, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Centro blanco para máxima definición
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(vp.x, hy, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Placa / Etiqueta destacada
      const text = label;
      ctx.font = 'bold 9.5px monospace';
      const textWidth = ctx.measureText(text).width;
      const padX = 5;
      const badgeH = 14;
      let badgeY = hy - 12 - badgeH;
      if (badgeY < 4) {
        badgeY = hy + 12;
      }

      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(vp.x - textWidth / 2 - padX, badgeY, textWidth + padX * 2, badgeH, 3);
      } else {
        ctx.rect(vp.x - textWidth / 2 - padX, badgeY, textWidth + padX * 2, badgeH);
      }
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, vp.x, badgeY + badgeH / 2 + 0.5);
    } else {
      // Indicador y punto de referencia en el borde si el punto de fuga cae fuera del marco
      const edgeX = isLeft ? 12 : width - 12;
      const arrowDir = isLeft ? -1 : 1;

      ctx.setLineDash([]);

      // 1. Diana técnica de borde a la altura exacta del horizonte
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.4;
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(edgeX, hy, 4, 0, Math.PI * 2);
      ctx.fill();

      // Centro blanco para definición
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(edgeX, hy, 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Flecha de dirección hacia la fuga
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.moveTo(edgeX + arrowDir * 9, hy);
      ctx.lineTo(edgeX + arrowDir * 2, hy - 4);
      ctx.lineTo(edgeX + arrowDir * 2, hy + 4);
      ctx.closePath();
      ctx.fill();

      // Placa / Badge técnico en el borde
      const badgeText = isLeft ? `← ${label}` : `${label} →`;
      ctx.font = 'bold 9px monospace';
      const bWidth = ctx.measureText(badgeText).width;
      const bPad = 4;
      const bH = 13;
      const bX = isLeft ? edgeX + 10 : edgeX - 10 - bWidth - bPad * 2;
      let bY = hy - bH / 2;

      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(bX, bY, bWidth + bPad * 2, bH, 2.5);
      } else {
        ctx.rect(bX, bY, bWidth + bPad * 2, bH);
      }
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, bX + (bWidth + bPad * 2) / 2, bY + bH / 2 + 0.5);
    }
  };

  if (vpl) {
    drawVpMarker(vpl, 'PF-I', true);
  }
  if (vpr) {
    drawVpMarker(vpr, 'PF-D', false);
  }

  ctx.restore();
}

export interface DrawingCanvasRef {
  undo: () => void;
  clear: () => void;
  validate: () => void;
}

export interface DrawingCanvasProps {
  challenge: CubeChallenge;
  feedback?: ValidationFeedback | null;
  onStrokesChange: (strokes: UserStroke[]) => void;
  showSolution: boolean;
  onValidate?: (timeRemainingSeconds?: number) => void;
  onNextCube?: () => void;
  onDrawingStateChange?: (isDrawing: boolean) => void;
  showUserDrawing?: boolean;
  showParametricSolution?: boolean;
  activeLesson?: {
    id?: string;
    code?: string;
    title?: string;
    perspectiveMode?: string;
    axesMode?: string;
    difficulty?: string;
    isShadowLevel?: boolean;
  } | null;
  isLandscapeMobile?: boolean;
  onToggleSidebar?: () => void;
  nodeCode?: string;
  isDailyChallenge?: boolean;
  dailyProgress?: { current: number; total: number };
  onCommentChange?: (comment: string) => void;
  isRecording?: boolean;
  recordedCount?: number;
  onToggleRecording?: () => void;
  onOpenRecordModal?: () => void;
  onAddCurrentToRecording?: (comment?: string) => void;
}

const TOTAL_COUNTDOWN_SECONDS = 30;

export const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>((props, ref) => {
  const {
    challenge,
    feedback,
    onStrokesChange,
    showSolution,
    onValidate,
    onNextCube,
    onDrawingStateChange,
    activeLesson,
    showUserDrawing: externalShowUserDrawing,
    showParametricSolution: externalShowParametricSolution,
    isLandscapeMobile: _propIsLandscapeMobile,
    onToggleSidebar,
    nodeCode,
    isDailyChallenge = false,
    dailyProgress,
    onCommentChange,
    isRecording = false,
    recordedCount = 0,
    onToggleRecording,
    onOpenRecordModal,
    onAddCurrentToRecording,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<UserStroke[]>([]);
  const currentStrokeRef = useRef<{ x: number; y: number; pressure?: number; time: number }[]>([]);
  const activePointerIdRef = useRef<number | null>(null);
  const activePointerTypeRef = useRef<string | null>(null);

  // Modo de visión tras la evaluación: 'all' (ambos) | 'solution' (solo solución) | 'drawing' (solo mi dibujo)
  const [visionMode, setVisionMode] = useState<'all' | 'solution' | 'drawing'>('all');

  const showUserDrawing = externalShowUserDrawing !== undefined
    ? externalShowUserDrawing
    : (visionMode === 'all' || visionMode === 'drawing');
  const showParametricSolution = externalShowParametricSolution !== undefined
    ? externalShowParametricSolution
    : (visionMode === 'all' || visionMode === 'solution');

  const cycleVisionMode = useCallback(() => {
    setVisionMode((prev) => {
      if (prev === 'all') return 'solution';
      if (prev === 'solution') return 'drawing';
      return 'all';
    });
  }, []);


  // Estados para el reporte y diagnóstico del cubo con notas del usuario
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showQuickCommentModal, setShowQuickCommentModal] = useState<boolean>(false);
  const [userNote, setUserNote] = useState<string>('');
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [downloadedReport, setDownloadedReport] = useState<boolean>(false);

  // Reporte calculado dinámicamente con la nota del usuario incluida
  const currentReport = useMemo(() => {
    return buildDebugReport(challenge, strokes, feedback, activeLesson, userNote);
  }, [challenge, strokes, feedback, activeLesson, userNote]);

  const handleOpenReportModal = () => {
    setCopiedReport(false);
    setDownloadedReport(false);
    setShowReportModal(true);
  };

  // Notificar al avatar cuando el usuario está dibujando activamente
  useEffect(() => {
    onDrawingStateChange?.(isDrawing);
  }, [isDrawing, onDrawingStateChange]);

  // Temporizador cuenta atrás y bonus por velocidad
  const [timeLeft, setTimeLeft] = useState<number>(TOTAL_COUNTDOWN_SECONDS);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timeLeftRef = useRef<number>(TOTAL_COUNTDOWN_SECONDS);
  const timerIntervalRef = useRef<number | null>(null);

  // Modo táctil en dispositivos móviles: 'draw' (dibujar con dedo o lápiz) | 'scroll' (desplazar la pantalla con 1 dedo)
  const [touchMode, setTouchMode] = useState<'draw' | 'scroll'>('draw');



  // Al validarse o comprobar el cubo, activar modo scroll automáticamente para ver notas y Cubito con 1 dedo
  useEffect(() => {
    if (feedback) {
      setTouchMode('scroll');
      setVisionMode('all');
    } else {
      setTouchMode('draw');
      setVisionMode('all');
    }
  }, [feedback]);

  // Limpiar trazos y resetear temporizador cuando cambia de desafío
  useEffect(() => {
    setStrokes([]);
    onStrokesChange([]);
    activePointerIdRef.current = null;
    activePointerTypeRef.current = null;
    currentStrokeRef.current = [];
    setIsDrawing(false);
    setVisionMode('all');
    setUserNote('');
    setCopiedReport(false);
    setDownloadedReport(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setTimeLeft(TOTAL_COUNTDOWN_SECONDS);
    timeLeftRef.current = TOTAL_COUNTDOWN_SECONDS;
    setIsTimerRunning(false);
  }, [challenge.id]);

  // Manejo del tic-tac del temporizador
  useEffect(() => {
    if (isTimerRunning && !feedback) {
      const interval = window.setInterval(() => {
        setTimeLeft((prev) => {
          const next = Math.max(0, Math.round((prev - 0.1) * 10) / 10);
          timeLeftRef.current = next;
          if (next <= 0) {
            clearInterval(interval);
            setIsTimerRunning(false);
          }
          return next;
        });
      }, 100);
      timerIntervalRef.current = interval;
      return () => {
        clearInterval(interval);
      };
    } else if (feedback) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setIsTimerRunning(false);
    }
  }, [isTimerRunning, feedback]);

  // Renderizado del canvas de alta definición (HiDPI / Retina responsive)
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

    // Limpiar lienzo manteniendo transparencia sobre la cuadrícula milimétrica continua
    ctx.clearRect(0, 0, width, height);

    // Mallado cuadrado de perspectiva en el suelo (líneas finas para orientar el plano horizontal)
    if (challenge.hasGroundGrid) {
      renderGroundGrid(
        ctx,
        width,
        height,
        challenge.vertices2D[0],
        challenge.vertices2D[2],
        challenge.vertices2D[4],
        challenge.horizonY,
        challenge.vanishingPointLeft,
        challenge.vanishingPointRight
      );
    }

    // Línea de horizonte y Puntos de Fuga técnicos sutiles (A partir del Bloque 2 en adelante)
    if (challenge.hasHorizonGuide) {
      renderHorizonAndVanishingPoints(
        ctx,
        width,
        height,
        challenge
      );
    }

    if (challenge.isShadowLevel && challenge.shadowData) {
      const { shadowPolygon, constructionRays, shadowVertices2D, light } = challenge.shadowData;
      const v = challenge.vertices2D;

      // 1. Si la solución está activa, dibujar en el suelo la proyección de sombra y los rayos
      if (showSolution && showParametricSolution) {
        // Línea de horizonte técnica (solo si no se ha dibujado ya con la guía)
        if (!challenge.hasHorizonGuide) {
          ctx.save();
          ctx.strokeStyle = '#D6D6D6';
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, challenge.horizonY);
          ctx.lineTo(width, challenge.horizonY);
          ctx.stroke();
          ctx.restore();
        }

        // Rayos de proyección proyectivos
        ctx.save();
        constructionRays.forEach((ray) => {
          // Rayo de suelo desde L' (base de luz)
          ctx.strokeStyle = '#555555';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.moveTo(ray.fromGround.start.x, ray.fromGround.start.y);
          ctx.lineTo(ray.fromGround.end.x, ray.fromGround.end.y);
          ctx.stroke();

          // Rayo en el aire desde L (foco)
          ctx.strokeStyle = '#888888';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(ray.fromLight.start.x, ray.fromLight.start.y);
          ctx.lineTo(ray.fromLight.end.x, ray.fromLight.end.y);
          ctx.stroke();
        });
        ctx.restore();

        // Silueta del polígono de sombra en el suelo con trama screentone/hatching a 45º
        if (shadowPolygon.length >= 3) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(shadowPolygon[0].x, shadowPolygon[0].y);
          for (let i = 1; i < shadowPolygon.length; i++) {
            ctx.lineTo(shadowPolygon[i].x, shadowPolygon[i].y);
          }
          ctx.closePath();

          // Tinte suave de suelo
          ctx.fillStyle = 'rgba(0, 0, 0, 0.07)';
          ctx.fill();

          // Rayado diagonal manga a 45º
          ctx.clip();
          ctx.strokeStyle = '#222222';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([]);
          const hatchStep = 7;
          for (let d = -height; d < width + height; d += hatchStep) {
            ctx.beginPath();
            ctx.moveTo(d, 0);
            ctx.lineTo(d + height, height);
            ctx.stroke();
          }
          ctx.restore();

          // Contorno exterior entintado de la sombra arrojada
          ctx.save();
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.2;
          ctx.setLineDash([6, 3]);
          ctx.beginPath();
          ctx.moveTo(shadowPolygon[0].x, shadowPolygon[0].y);
          for (let i = 1; i < shadowPolygon.length; i++) {
            ctx.lineTo(shadowPolygon[i].x, shadowPolygon[i].y);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }

        // Vértices de sombra objetivo (S1, S2, S3)
        shadowVertices2D.forEach((pt, sIdx) => {
          ctx.save();
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Placa con el nombre del vértice S1, S2, S3
          const label = `S${sIdx + 1}`;
          const tagX = pt.x + (light.side === 'left' ? 14 : -14);
          const tagY = pt.y + 12;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(tagX - 8, tagY - 7, 16, 14);
          ctx.strokeRect(tagX - 8, tagY - 7, 16, 14);
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, tagX, tagY + 0.5);
          ctx.restore();
        });
      }

      // 2. Dibujar el Cubo Sólido Completo (opaco para pisar la sombra en su base)
      // Cara superior (Tapa: 1, 3, 6, 5)
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(v[1].x, v[1].y);
      ctx.lineTo(v[3].x, v[3].y);
      ctx.lineTo(v[6].x, v[6].y);
      ctx.lineTo(v[5].x, v[5].y);
      ctx.closePath();
      ctx.fill();

      // Cara izquierda (0, 1, 3, 2)
      ctx.beginPath();
      ctx.moveTo(v[0].x, v[0].y);
      ctx.lineTo(v[1].x, v[1].y);
      ctx.lineTo(v[3].x, v[3].y);
      ctx.lineTo(v[2].x, v[2].y);
      ctx.closePath();
      ctx.fill();

      // Cara derecha (0, 1, 5, 4)
      ctx.beginPath();
      ctx.moveTo(v[0].x, v[0].y);
      ctx.lineTo(v[1].x, v[1].y);
      ctx.lineTo(v[5].x, v[5].y);
      ctx.lineTo(v[4].x, v[4].y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Trama manga screentone en la cara no iluminada (sombra propia del cubo)
      if (light.side === 'left') {
        renderScreentoneQuad(ctx, v[0], v[1], v[4], v[5]);
      } else {
        renderScreentoneQuad(ctx, v[0], v[1], v[2], v[3]);
      }

      // Dibujar las 9 aristas visibles entintadas con línea firme y continua (NUNCA rayada)
      ctx.save();
      ctx.setLineDash([]); // Línea continua sólida
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      challenge.givenEdges.forEach((edge) => {
        const p1 = v[edge.start];
        const p2 = v[edge.end];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      // Vértices del cubo
      v.forEach((pt) => {
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // 3. Foco de Luz L y Base en el Suelo L'
      const { light2D, groundStation2D, side } = light;
      ctx.save();

      // Plomada vertical entre L y L'
      ctx.strokeStyle = '#555555';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(light2D.x, light2D.y);
      ctx.lineTo(groundStation2D.x, groundStation2D.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Foco Aéreo L (sol / bombilla técnica)
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      const rayCount = 8;
      for (let r = 0; r < rayCount; r++) {
        const ang = (r * Math.PI * 2) / rayCount;
        ctx.beginPath();
        ctx.moveTo(light2D.x + Math.cos(ang) * 9, light2D.y + Math.sin(ang) * 9);
        ctx.lineTo(light2D.x + Math.cos(ang) * 15, light2D.y + Math.sin(ang) * 15);
        ctx.stroke();
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(light2D.x, light2D.y, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(light2D.x, light2D.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Placa L
      const lBadgeOffset = side === 'left' ? -58 : 18;
      ctx.fillStyle = '#000000';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.fillRect(light2D.x + lBadgeOffset, light2D.y - 10, 52, 20);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('L (Foco)', light2D.x + lBadgeOffset + 26, light2D.y);

      // Base en el Suelo L' (retícula / diana)
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(groundStation2D.x - 9, groundStation2D.y);
      ctx.lineTo(groundStation2D.x + 9, groundStation2D.y);
      ctx.moveTo(groundStation2D.x, groundStation2D.y - 9);
      ctx.lineTo(groundStation2D.x, groundStation2D.y + 9);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(groundStation2D.x, groundStation2D.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Placa L'
      const lPrimeBadgeOffset = side === 'left' ? -68 : 18;
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.fillRect(groundStation2D.x + lPrimeBadgeOffset, groundStation2D.y - 9, 62, 18);
      ctx.strokeRect(groundStation2D.x + lPrimeBadgeOffset, groundStation2D.y - 9, 62, 18);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText("L' (Suelo)", groundStation2D.x + lPrimeBadgeOffset + 31, groundStation2D.y);

      ctx.restore();
    } else {
      // 1. DIBUJAR LA CARA DADA (Trama Screentone Manga)
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

        // Trama de puntos (Screentone) EN PERSPECTIVA REAL sobre la cara
        // Mapeo bilineal: u = a lo largo de la fuga (0 frente -> 1 fondo), v = a lo largo de la altura (0 abajo -> 1 arriba)
        const pBottomFront = challenge.vertices2D[0];
        const pTopFront = challenge.vertices2D[1];
        const isLeft = challenge.givenSide === 'left';
        const pBottomSide = isLeft ? challenge.vertices2D[2] : challenge.vertices2D[4];
        const pTopSide = isLeft ? challenge.vertices2D[3] : challenge.vertices2D[5];

        ctx.fillStyle = '#111111';
        const stepsU = 16; // Divisiones a lo largo de la cara que fuge
        const stepsV = 16; // Divisiones verticales

        for (let i = 1; i < stepsU; i++) {
          const u = i / stepsU;
          // Puntos interpolados en la base y techo para esta columna
          const colBottomX = pBottomFront.x + (pBottomSide.x - pBottomFront.x) * u;
          const colBottomY = pBottomFront.y + (pBottomSide.y - pBottomFront.y) * u;
          const colTopX = pTopFront.x + (pTopSide.x - pTopFront.x) * u;
          const colTopY = pTopFront.y + (pTopSide.y - pTopFront.y) * u;

          // El radio del punto se reduce sutilmente hacia el fondo (escorzo)
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

        // Aristas de la cara dada (Líneas entintadas firmes)
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
      } else {
        // Estructuras compuestas o abiertas (ej: missing_lid, step_block)
        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        challenge.givenEdges.forEach((edge) => {
          const p1 = challenge.vertices2D[edge.start];
          const p2 = challenge.vertices2D[edge.end];
          if (p1 && p2) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });

        // Marcar vértices dados
        challenge.givenFace.vertices.forEach((idx) => {
          const p = challenge.vertices2D[idx];
          if (p) {
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        ctx.restore();
      }

      // 1.5. EJES DE AYUDA TÉCNICOS X, Y, Z (Finos, largos y rayados / discontinuos)
      if (challenge.axes && challenge.axes.length > 0) {
        ctx.save();
        const origin = challenge.axes[0].origin;

        challenge.axes.forEach((axis) => {
          // Línea fina y rayada (trazo discontinuo de proyección técnica)
          ctx.strokeStyle = '#222222';
          ctx.lineWidth = 0.8;
          ctx.setLineDash([6, 3.5]); // Línea rayada
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

      // 1.6. GUÍA DE COTA DE ALTURA (Para torres y variaciones de altura)
      if (challenge.heightGuide) {
        const hg = challenge.heightGuide;
        ctx.save();
        ctx.strokeStyle = '#4B5563'; // gris técnico grafito
        ctx.lineWidth = 1.0;
        ctx.setLineDash([3, 3]);

        const offsetSide = challenge.givenSide === 'left' ? 28 : -28;
        const guideX = hg.x + offsetSide;

        // Línea de cota vertical paralela
        ctx.beginPath();
        ctx.moveTo(guideX, hg.yBottom);
        ctx.lineTo(guideX, hg.yTop);
        ctx.stroke();

        // Líneas auxiliares de referencia horizontales desde el cubo hasta la cota
        ctx.beginPath();
        ctx.moveTo(hg.x, hg.yTop);
        ctx.lineTo(guideX + (offsetSide > 0 ? 6 : -6), hg.yTop);
        ctx.moveTo(hg.x, hg.yBottom);
        ctx.lineTo(guideX + (offsetSide > 0 ? 6 : -6), hg.yBottom);
        ctx.stroke();

        // Remates en los extremos de la cota
        ctx.setLineDash([]);
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(guideX, hg.yTop, 2.5, 0, Math.PI * 2);
        ctx.arc(guideX, hg.yBottom, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Etiqueta técnica con cota
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = offsetSide > 0 ? 'left' : 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(hg.label, guideX + (offsetSide > 0 ? 7 : -7), (hg.yTop + hg.yBottom) / 2);

        ctx.restore();
      }

      // 2. Si se activa la solución (o tras comprobar), dibujar las líneas objetivo de referencia
      if (showSolution && showParametricSolution) {
        // Línea de horizonte técnica
        ctx.strokeStyle = '#D6D6D6';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, challenge.horizonY);
        ctx.lineTo(width, challenge.horizonY);
        ctx.stroke();

        // Aristas ideales restantes del cubo exterior
        ctx.strokeStyle = '#000000';
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 2.5;

        challenge.targetEdges.forEach((edge) => {
          const p1 = challenge.vertices2D[edge.start];
          const p2 = challenge.vertices2D[edge.end];
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        });

        // Vértices objetivo marcados con aros vacíos técnicos
        Object.values(challenge.targetVertices2D).forEach((p) => {
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#000000';
          ctx.setLineDash([]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });

        ctx.setLineDash([]); // Restaurar línea continua
      }
    }

    // 3. DIBUJAR LOS TRAZOS DEL USUARIO
    if (showUserDrawing) {
      ctx.strokeStyle = '#000000';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      strokes.forEach((stroke) => {
        if (stroke.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

        for (let i = 1; i < stroke.points.length; i++) {
          const p = stroke.points[i];
          const pressure = p.pressure ?? 0.5;
          ctx.lineWidth = 1.8 + pressure * 2.8;
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      });

      // Trazo que se está dibujando actualmente
      if (isDrawing && currentStrokeRef.current.length > 1) {
        const pts = currentStrokeRef.current;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          const pressure = pts[i].pressure ?? 0.5;
          ctx.lineWidth = 1.8 + pressure * 2.8;
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }, [challenge, strokes, isDrawing, showSolution, showUserDrawing, showParametricSolution]);

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

  // Atajos de teclado para un flujo de dibujo ágil y sin fricciones
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Enter') {
        if (feedback && onNextCube) {
          e.preventDefault();
          onNextCube();
        } else if (!feedback && countDetectedAristas(strokes) > 0 && onValidate) {
          e.preventDefault();
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          setIsTimerRunning(false);
          onValidate(timeLeftRef.current);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undoLastStroke();
      } else if (feedback && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        cycleVisionMode();
      } else if (feedback && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setVisionMode((prev) => (prev === 'solution' ? 'all' : 'solution'));
      } else if (feedback && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setVisionMode((prev) => (prev === 'drawing' ? 'all' : 'drawing'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [feedback, onNextCube, onValidate, strokes, cycleVisionMode]);

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
    // Si la solución ya está evaluada/mostrada, no permitir trazar sobre la solución
    if (showSolution || feedback) return;

    // Si estamos en modo scroll y el puntero es táctil (dedo), permitir desplazamiento nativo con 1 dedo
    // Si es un lápiz óptico (pen / Apple Pencil / S-Pen), siempre tiene prioridad de trazo
    if (touchMode === 'scroll' && e.pointerType === 'touch') {
      return;
    }

    e.preventDefault();
    // Rechazo de palma (Palm Rejection) y bloqueo de puntero único:
    // Si ya hay un lápiz (pen) o dedo dibujando, ignorar toques secundarios de la palma
    if (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignorar si no se puede capturar en el entorno actual
    }

    activePointerIdRef.current = e.pointerId;
    activePointerTypeRef.current = e.pointerType;

    // Arrancar el cronómetro con el primer contacto si no ha finalizado
    if (!isTimerRunning && !feedback && timeLeft > 0) {
      setIsTimerRunning(true);
    }

    const { x, y, pressure } = getNormalizedCoords(e);
    currentStrokeRef.current = [{ x, y, pressure, time: Date.now() }];
    setIsDrawing(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId)) return;
    const { x, y, pressure } = getNormalizedCoords(e);
    currentStrokeRef.current.push({ x, y, pressure, time: Date.now() });
    render();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId)) return;
    setIsDrawing(false);
    activePointerIdRef.current = null;
    activePointerTypeRef.current = null;

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
      onStrokesChange(newStrokes);
    }
    currentStrokeRef.current = [];
  };

  const clearStrokes = () => {
    setStrokes([]);
    onStrokesChange([]);
    activePointerIdRef.current = null;
    activePointerTypeRef.current = null;
    currentStrokeRef.current = [];
    setIsDrawing(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setTimeLeft(TOTAL_COUNTDOWN_SECONDS);
    timeLeftRef.current = TOTAL_COUNTDOWN_SECONDS;
    setIsTimerRunning(false);
  };

  const undoLastStroke = () => {
    const newStrokes = strokes.slice(0, -1);
    setStrokes(newStrokes);
    onStrokesChange(newStrokes);
  };

  const handleValidateClick = () => {
    if (countDetectedAristas(strokes) === 0) return;
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsTimerRunning(false);
    onValidate?.(timeLeftRef.current);
  };

  useImperativeHandle(ref, () => ({
    undo: undoLastStroke,
    clear: clearStrokes,
    validate: handleValidateClick,
  }));

  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center select-none bg-white pattern-grid-paper">
      {/* Barra superior de progreso del temporizador */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-neutral-200 pointer-events-none z-30">
        <div
          className={`h-full transition-all duration-100 ${
            timeLeft <= 5 && isTimerRunning ? 'bg-black animate-pulse' : 'bg-neutral-800'
          }`}
          style={{ width: `${(timeLeft / TOTAL_COUNTDOWN_SECONDS) * 100}%` }}
        />
      </div>

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

      {/* 2. HUD SUPERIOR: A LA MISMA ALTURA QUE EL BOTÓN PANEL (top-2.5 / top-3) ALINEADO CON EL CUBO */}
      <div
        className="absolute top-2.5 sm:top-3 z-20 flex items-start justify-between pointer-events-none px-2 sm:px-0"
        style={{
          width: 'min(calc(100% - 130px), 760px, calc((100dvh - 170px) * (600 / 540)))',
        }}
      >
        {/* A la izquierda del cubo (por donde está ahora): NIVEL, SEMILLA Y MODO TÁCTIL EN UNA SOLA TIRA */}
        <div className="pointer-events-auto self-start font-mono text-xs select-none bg-white border-2 border-black p-1 sm:p-1.5 shadow-[3px_3px_0px_#000000] flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1 min-w-0 bg-neutral-100 border border-black px-1.5 py-0.5">
            <span className="text-[9px] sm:text-[10px] font-bold text-neutral-600 uppercase">
              {isDailyChallenge && dailyProgress
                ? `RETO ${dailyProgress.current}/${dailyProgress.total}`
                : (nodeCode || activeLesson?.code || '1.1')}
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-black truncate max-w-[90px] sm:max-w-[140px]">
              {activeLesson?.title || (challenge.isShadowLevel ? 'Sombras' : 'Prisma 3D')}
            </span>
          </div>

          <span className="text-[9px] sm:text-[10px] font-bold bg-neutral-100 px-1.5 py-0.5 border border-black shrink-0">
            #{challenge.seed}
          </span>

          {challenge.isShadowLevel && (
            <span className="text-[9px] sm:text-[10px] font-bold text-neutral-700 truncate max-w-[110px] hidden sm:inline">
              {challenge.hasGroundGrid ? '☀️ Suelo Guía' : '☀️ Sombra Libre'}
            </span>
          )}

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

        {/* A la derecha del cubo: TEMPORIZADOR O CUADRADITO CON LA NOTA */}
        {!feedback ? (
          <div className="pointer-events-auto self-start font-mono text-xs select-none">
            <div
              className={`border-2 border-black p-1.5 sm:p-2 shadow-[3px_3px_0px_#000000] flex items-center gap-1.5 ${
                timeLeft <= 5 && isTimerRunning ? 'bg-black text-white animate-pulse' : 'bg-white text-black'
              }`}
            >
              <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="font-bold tabular-nums text-xs sm:text-sm">{timeLeft.toFixed(1)}s</span>
            </div>
          </div>
        ) : (
          <div className="pointer-events-auto self-start bg-white border-2 border-black p-2 sm:p-2.5 shadow-[4px_4px_0px_#000000] font-mono flex flex-col items-center justify-center min-w-[88px] sm:min-w-[100px] aspect-square animate-in fade-in zoom-in-95 duration-150 select-none">
            <span className="text-[10px] sm:text-xs font-bold uppercase text-neutral-500 tracking-wider">
              Nota
            </span>
            <span className="text-2xl sm:text-3xl font-black leading-none my-1">
              {feedback.totalScore ?? feedback.score}%
            </span>
            <span
              className={`text-[9px] sm:text-[10px] font-bold uppercase px-1.5 py-0.5 border border-black ${
                feedback.passed ? 'bg-black text-white' : 'bg-white text-neutral-700'
              }`}
            >
              {feedback.passed ? 'Aprobado' : 'Reintentar'}
            </span>
          </div>
        )}
      </div>

      {/* CONTENEDOR ANCLADO AL DIBUJO (Mantiene aspecto exacto 600x540 con escala adaptada) */}
      <div
        className="relative aspect-[600/540] max-w-[min(calc(100%-24px),760px)] max-h-[calc(100%-125px)] flex items-center justify-center pointer-events-none"
        style={{
          width: 'min(calc(100% - 24px), 760px, calc((100dvh - 170px) * (600 / 540)))',
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

      {/* 3. BARRA DE HERRAMIENTAS FLOTANTE INFERIOR */}
      <div className="absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto font-mono text-xs">
        <div className="bg-white border-2 border-black p-1.5 sm:p-2 shadow-[4px_4px_0px_#000000] flex items-center gap-1.5 sm:gap-2 max-w-[calc(100vw-24px)] overflow-x-auto">
          {!feedback ? (
            <>
              {/* Contador de aristas */}
              <span className="text-[10px] sm:text-[11px] font-bold text-neutral-700 bg-neutral-100 px-2 py-1 border border-black shadow-[1px_1px_0px_#000000] tabular-nums whitespace-nowrap">
                {countDetectedAristas(strokes)}/{challenge.targetEdges.length} {challenge.isShadowLevel ? 'sombras' : 'aristas'}
              </span>

              {/* Deshacer */}
              <button
                type="button"
                onClick={undoLastStroke}
                disabled={strokes.length === 0}
                className="btn-ink-outline p-1.5 text-xs font-bold disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-[1px_1px_0px_#000000]"
                title="Deshacer trazo (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>

              {/* Borrar */}
              <button
                type="button"
                onClick={clearStrokes}
                disabled={strokes.length === 0}
                className="btn-ink-outline p-1.5 text-xs font-bold disabled:opacity-30 disabled:pointer-events-none cursor-pointer hover:bg-red-50 hover:text-red-700 shadow-[1px_1px_0px_#000000]"
                title="Borrar todos los trazos"
              >
                <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>

              {/* Modo Récord */}
              <button
                type="button"
                onClick={isRecording ? onOpenRecordModal : onToggleRecording}
                className={`px-2 py-1 text-xs font-mono font-bold border border-black cursor-pointer shadow-[1px_1px_0px_#000000] flex items-center gap-1 transition-colors whitespace-nowrap ${
                  isRecording ? 'bg-black text-white' : 'bg-white hover:bg-neutral-100 text-black'
                }`}
                title={isRecording ? `Grabando: ${recordedCount} ejercicios. Clic para ver o exportar sesión` : "Activar grabación de sesión (Modo Récord)"}
              >
                <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-neutral-400 border border-black'}`} />
                <span>{isRecording ? `REC (${recordedCount})` : 'REC'}</span>
              </button>

              {/* Reportar anomalía */}
              <button
                type="button"
                onClick={handleOpenReportModal}
                className="p-1.5 text-xs font-bold border border-black cursor-pointer shadow-[1px_1px_0px_#000000] bg-white hover:bg-neutral-100 flex items-center justify-center transition-colors"
                title="Reportar anomalía en este cubo"
              >
                <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>

              {/* Botón principal: COMPROBAR */}
              <button
                type="button"
                onClick={handleValidateClick}
                disabled={countDetectedAristas(strokes) === 0}
                className="btn-ink px-3 sm:px-4 py-1.5 text-xs font-bold uppercase disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-[2px_2px_0px_#000000] flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap"
                title={countDetectedAristas(strokes) === 0 ? "Dibuja al menos una arista antes de comprobar" : "Comprobar perspectiva (Enter)"}
              >
                <span>Comprobar</span>
                <Check className="w-4 h-4 stroke-[3]" />
              </button>
            </>
          ) : (
            <>
              {/* Contador de aristas */}
              <span className="text-[10px] sm:text-[11px] font-bold text-neutral-700 bg-neutral-100 px-2 py-1 border border-black shadow-[1px_1px_0px_#000000] tabular-nums whitespace-nowrap">
                {countDetectedAristas(strokes)}/{challenge.targetEdges.length} aristas
              </span>

              {/* Botón único de 3 estados de visión: Ambos -> Solución -> Dibujo -> Ambos */}
              <button
                type="button"
                onClick={cycleVisionMode}
                className="px-2.5 py-1 text-xs font-mono font-bold border border-black flex items-center gap-1.5 cursor-pointer transition-colors shadow-[1px_1px_0px_#000000] whitespace-nowrap bg-black text-white hover:bg-neutral-800"
                title={
                  visionMode === 'all'
                    ? 'Visión: Ambos (Solución + Mi dibujo). Clic para ver solo solución (V)'
                    : visionMode === 'solution'
                    ? 'Visión: Solución (Mi dibujo oculto). Clic para ver solo mi dibujo (V)'
                    : 'Visión: Mi Dibujo (Solución oculta). Clic para ver ambos (V)'
                }
              >
                {visionMode === 'all' && <Eye className="w-3.5 h-3.5 stroke-[2.2]" />}
                {visionMode === 'solution' && <Sparkles className="w-3.5 h-3.5 stroke-[2.2]" />}
                {visionMode === 'drawing' && <PenTool className="w-3.5 h-3.5 stroke-[2.2]" />}
                <span className="text-[10px] uppercase font-mono tracking-wider">
                  <span className="hidden sm:inline">Visión: </span>
                  {visionMode === 'all'
                    ? 'Ambos'
                    : visionMode === 'solution'
                    ? 'Solución'
                    : 'Dibujo'}
                </span>
              </button>

              {/* Modo Récord */}
              <button
                type="button"
                onClick={isRecording ? onOpenRecordModal : onToggleRecording}
                className={`px-2 py-1 text-xs font-mono font-bold border border-black cursor-pointer shadow-[1px_1px_0px_#000000] flex items-center gap-1 transition-colors whitespace-nowrap ${
                  isRecording ? 'bg-black text-white' : 'bg-white hover:bg-neutral-100 text-black'
                }`}
                title={isRecording ? `Grabando: ${recordedCount} ejercicios. Clic para ver o exportar sesión` : "Activar grabación de sesión (Modo Récord)"}
              >
                <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-neutral-400 border border-black'}`} />
                <span>{isRecording ? `REC (${recordedCount})` : 'REC'}</span>
              </button>

              {/* Comentario Récord */}
              <button
                type="button"
                onClick={() => setShowQuickCommentModal(true)}
                className={`p-1.5 text-xs font-bold border border-black cursor-pointer shadow-[1px_1px_0px_#000000] flex items-center justify-center transition-colors ${
                  userNote.trim() ? 'bg-black text-white' : 'bg-white hover:bg-neutral-100 text-black'
                }`}
                title={userNote.trim() ? `Comentario: "${userNote}"` : "Añadir comentario a este cubo (Modo Récord)"}
              >
                <MessageSquare className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>

              {/* Reportar anomalía */}
              <button
                type="button"
                onClick={handleOpenReportModal}
                className="p-1.5 text-xs font-bold border border-black cursor-pointer shadow-[1px_1px_0px_#000000] bg-white hover:bg-neutral-100 flex items-center justify-center transition-colors"
                title="Escribir nota y descargar reporte"
              >
                <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>

              {/* Botón principal: SIGUIENTE */}
              <button
                type="button"
                onClick={onNextCube}
                className="btn-ink px-3 sm:px-4 py-1.5 text-xs uppercase font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000] shrink-0 whitespace-nowrap"
                title="Siguiente ejercicio (Enter)"
              >
                <span>Siguiente</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </>
          )}
        </div>
      </div>


      {/* Modal Rápido de Comentario para Modo Récord */}
      <QuickCommentModal
        isOpen={showQuickCommentModal}
        onClose={() => setShowQuickCommentModal(false)}
        initialComment={userNote}
        onSave={(comment) => {
          setUserNote(comment);
          onCommentChange?.(comment);
        }}
        nodeCode={nodeCode || (activeLesson ? activeLesson.code || 'Cubo' : 'Cubo')}
        nodeTitle={activeLesson?.title || challenge.mode}
        score={feedback?.totalScore ?? feedback?.score}
        seed={challenge.seed}
        isRecording={Boolean(isRecording)}
        onStartRecordingAndSave={(comment) => {
          setUserNote(comment);
          onAddCurrentToRecording?.(comment);
        }}
      />

      {/* Modal de Reporte de Depuración y Diagnóstico con Notas */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
          <div className="bg-white border-4 border-black p-4 sm:p-5 max-w-lg w-full shadow-[8px_8px_0px_#000000] flex flex-col gap-3 font-sans max-h-[92vh] overflow-y-auto">
            {/* Cabecera */}
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-black stroke-[2.5]" />
                <h3 className="font-display font-bold text-sm sm:text-base uppercase tracking-tight">
                  Reporte de Evaluación y Depuración
                </h3>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1 hover:bg-neutral-100 border border-black cursor-pointer"
                title="Cerrar modal (Esc)"
              >
                <X className="w-4 h-4 text-black stroke-[2.5]" />
              </button>
            </div>

            {/* Metadatos del reto */}
            <div className="flex items-center justify-between text-xs font-mono bg-neutral-50 p-2 border border-black">
              <div>
                <span className="text-neutral-500">Semilla:</span> <strong>#{challenge.seed}</strong>
              </div>
              <div>
                <span className="text-neutral-500">Modo:</span> <strong>{challenge.mode}</strong>
              </div>
              <div>
                <span className="text-neutral-500">Nota:</span>{' '}
                <strong>{feedback ? `${feedback.totalScore ?? feedback.score}%` : 'Calculada'}</strong>
              </div>
            </div>

            {/* Campo de Nota / Explicación del problema */}
            <div className="flex flex-col gap-1.5 bg-neutral-50 p-3 border-2 border-black">
              <label className="text-xs font-mono font-bold text-black flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Nota o explicación del problema:</span>
                </span>
                <span className="text-[10px] text-neutral-500 font-normal hidden sm:inline">
                  (Se guardará dentro del archivo .JSON y en el texto copiado)
                </span>
              </label>
              <textarea
                value={userNote}
                onChange={(e) => {
                  setUserNote(e.target.value);
                  onCommentChange?.(e.target.value);
                }}
                placeholder="Escribe aquí qué ocurrió (ej: 'El punto 3 converge hacia VPR pero dio 0%', 'Arista no detectada', 'Fallo en la sombra proyectada')..."
                className="w-full h-20 p-2 text-xs font-mono bg-white border border-black resize-none focus:outline-none focus:ring-2 focus:ring-black selection:bg-black selection:text-white"
                autoFocus
              />
              <div className="flex flex-wrap gap-1 items-center pt-0.5">
                <span className="text-[10px] font-mono text-neutral-500 font-bold mr-1">Rápido:</span>
                {['Nota injusta', 'Punto de fuga desalineado', 'Arista no detectada', 'Fallo en sombra'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const nextVal = userNote ? `${userNote} · ${tag}` : tag;
                      setUserNote(nextVal);
                      onCommentChange?.(nextVal);
                    }}
                    className="text-[10px] font-mono bg-white hover:bg-black hover:text-white border border-black px-1.5 py-0.5 cursor-pointer transition-colors shadow-[1px_1px_0px_#000000]"
                  >
                    +{tag}
                  </button>
                ))}
                {userNote && (
                  <button
                    type="button"
                    onClick={() => {
                      setUserNote('');
                      onCommentChange?.('');
                    }}
                    className="text-[10px] font-mono text-neutral-500 hover:text-black ml-auto underline cursor-pointer"
                  >
                    Borrar nota
                  </button>
                )}
              </div>
            </div>

            {/* Vista previa del contenido */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-mono font-bold text-neutral-600">
                Vista previa del reporte (Markdown / JSON con tu nota):
              </label>
              <textarea
                readOnly
                value={currentReport.markdownText}
                className="w-full h-28 p-2 font-mono text-[10px] bg-neutral-50 border border-black resize-none selection:bg-black selection:text-white"
              />
            </div>

            {/* Acciones de exportación */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    downloadReportJson(currentReport.jsonString, challenge.seed, userNote);
                    setDownloadedReport(true);
                    setTimeout(() => setDownloadedReport(false), 2500);
                  }}
                  className="btn-ink px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
                  title="Descargar archivo .JSON incluyendo tu nota"
                >
                  {downloadedReport ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Download className="w-3.5 h-3.5" />}
                  <span>{downloadedReport ? '¡Descargado con tu nota!' : 'Descargar JSON'}</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await copyReportToClipboard(currentReport.markdownText);
                    setCopiedReport(true);
                    setTimeout(() => setCopiedReport(false), 2500);
                  }}
                  className="btn-ink-outline px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
                  title="Copiar texto con tu nota al portapapeles"
                >
                  {copiedReport ? <Check className="w-3.5 h-3.5 text-black stroke-[2.5]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedReport ? '¡Copiado con tu nota!' : 'Copiar Texto'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="px-3 py-1.5 text-xs font-mono text-neutral-600 hover:text-black border border-neutral-300 hover:border-black cursor-pointer ml-auto"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

