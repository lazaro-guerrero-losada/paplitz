import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CubeChallenge, Point2D } from '../lib/geometry';
import { UserStroke, ValidationFeedback, countDetectedAristas } from '../lib/validation';
import { Undo2, Trash2, Check, ArrowRight, AlertTriangle, CheckCircle, Clock, Zap, Copy, Download, X } from 'lucide-react';
import { buildDebugReport, copyReportToClipboard, downloadReportJson } from '../lib/debugReport';

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
  horizonY: number
) {
  ctx.save();
  // Limitar el suelo al área por debajo del horizonte
  ctx.beginPath();
  ctx.rect(0, horizonY + 25, width, height - (horizonY + 25));
  ctx.clip();

  ctx.strokeStyle = '#E2E2E2';
  ctx.lineWidth = 0.8;
  ctx.setLineDash([]);

  // Puntos de fuga en el horizonte
  const dyL = v2.y - v0.y;
  const dxL = v2.x - v0.x;
  const tL = (horizonY - v0.y) / (dyL || -0.001);
  const VPL = { x: v0.x + tL * dxL, y: horizonY };

  const dyR = v4.y - v0.y;
  const dxR = v4.x - v0.x;
  const tR = (horizonY - v0.y) / (dyR || -0.001);
  const VPR = { x: v0.x + tR * dxR, y: horizonY };

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

interface DrawingCanvasProps {
  challenge: CubeChallenge;
  feedback?: ValidationFeedback | null;
  onStrokesChange: (strokes: UserStroke[]) => void;
  showSolution: boolean;
  onValidate?: (timeRemainingSeconds?: number) => void;
  onNextCube?: () => void;
  onDrawingStateChange?: (isDrawing: boolean) => void;
  activeLesson?: {
    id?: string;
    code?: string;
    title?: string;
    perspectiveMode?: string;
    axesMode?: string;
    difficulty?: string;
    isShadowLevel?: boolean;
  } | null;
}

const TOTAL_COUNTDOWN_SECONDS = 30;

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  challenge,
  feedback,
  onStrokesChange,
  showSolution,
  onValidate,
  onNextCube,
  onDrawingStateChange,
  activeLesson,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<UserStroke[]>([]);
  const currentStrokeRef = useRef<{ x: number; y: number; pressure?: number; time: number }[]>([]);
  const activePointerIdRef = useRef<number | null>(null);
  const activePointerTypeRef = useRef<string | null>(null);

  // Estados para el reporte y diagnóstico del cubo
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [currentReportData, setCurrentReportData] = useState<{
    markdownText: string;
    jsonString: string;
  } | null>(null);

  const handleGenerateReport = async () => {
    const report = buildDebugReport(challenge, strokes, feedback, activeLesson);
    setCurrentReportData(report);

    // 1. Copiar automáticamente al portapapeles
    const copied = await copyReportToClipboard(report.markdownText);
    if (copied) {
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2500);
    }

    // 2. Descargar automáticamente el archivo .json
    downloadReportJson(report.jsonString, challenge.seed);

    // 3. Abrir el modal con resumen y acciones
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

  // Limpiar trazos y resetear temporizador cuando cambia de desafío
  useEffect(() => {
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

  // Renderizado del canvas
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

    // Cuadrícula sutil de dibujo técnico
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

    // Mallado cuadrado de perspectiva en el suelo (líneas finas para orientar el plano horizontal)
    if (challenge.hasGroundGrid) {
      renderGroundGrid(
        ctx,
        width,
        height,
        challenge.vertices2D[0],
        challenge.vertices2D[2],
        challenge.vertices2D[4],
        challenge.horizonY
      );
    }

    if (challenge.isShadowLevel && challenge.shadowData) {
      const { shadowPolygon, constructionRays, shadowVertices2D, light } = challenge.shadowData;
      const v = challenge.vertices2D;

      // 1. Si la solución está activa, dibujar en el suelo la proyección de sombra y los rayos
      if (showSolution) {
        // Línea de horizonte técnica
        ctx.save();
        ctx.strokeStyle = '#D6D6D6';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, challenge.horizonY);
        ctx.lineTo(width, challenge.horizonY);
        ctx.stroke();
        ctx.restore();

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

      // 2. Si se activa la solución (o tras comprobar), dibujar las líneas objetivo de referencia
      if (showSolution) {
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
  }, [challenge, strokes, isDrawing, showSolution]);

  useEffect(() => {
    render();
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
        } else if (!feedback && strokes.length > 0 && onValidate) {
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [feedback, onNextCube, onValidate, strokes]);

  const getNormalizedCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

    return { x, y, pressure };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
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
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsTimerRunning(false);
    onValidate?.(timeLeftRef.current);
  };

  return (
    <div
      className="flex flex-col items-center select-none w-full mx-auto"
      style={{
        width: 'min(100%, 600px, max(280px, calc((100vh - 330px) * 600 / 540)))',
      }}
    >
      {/* Contenedor responsivo del lienzo: aspecto 600/540 bloqueado 1:1 sin deformación ni márgenes invisibles */}
      <div
        data-canvas-zone="true"
        className="relative border-4 border-black bg-white shadow-[4px_4px_0px_#000000] w-full aspect-[600/540] overflow-hidden"
      >
        {/* Barra superior de progreso del temporizador */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-neutral-200 pointer-events-none z-10">
          <div
            className={`h-full transition-all duration-100 ${
              timeLeft <= 5 && isTimerRunning ? 'bg-black animate-pulse' : 'bg-neutral-800'
            }`}
            style={{ width: `${(timeLeft / TOTAL_COUNTDOWN_SECONDS) * 100}%` }}
          />
        </div>

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

        <div className="absolute top-2.5 left-2 text-[10px] font-mono uppercase bg-white border border-black px-1.5 py-0.5 pointer-events-none shadow-[1px_1px_0px_#000000] z-10">
          DESAFÍO #{challenge.seed}
        </div>

        {/* Temporizador con bonus por velocidad */}
        <div
          className={`absolute top-2.5 right-2 border-2 border-black px-2 py-0.5 font-mono text-xs transition-colors duration-200 pointer-events-none shadow-[2px_2px_0px_#000000] z-10 flex items-center gap-1.5 ${
            timeLeft <= 5 && isTimerRunning
              ? 'bg-black text-white animate-pulse'
              : 'bg-white text-black'
          }`}
        >
          <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="font-bold tabular-nums">
            {timeLeft.toFixed(1)}s
          </span>
          {!isTimerRunning && strokes.length === 0 && !feedback && (
            <span className="text-[9px] uppercase font-bold tracking-tighter opacity-70 hidden sm:inline">
              · Arranca al trazar
            </span>
          )}
          {feedback && feedback.passed && (feedback.speedBonus ?? 0) > 0 && (
            <span className="text-[10px] font-bold bg-neutral-200 text-black border border-black px-1">
              +{feedback.speedBonus}% vel.
            </span>
          )}
        </div>

        {/* Banner didáctico específico para el nivel de sombras */}
        {challenge.isShadowLevel && (
          <div className="absolute bottom-2 left-2 right-2 bg-black text-white text-[11px] font-mono px-2.5 py-1 flex items-center justify-between border border-white shadow-[2px_2px_0px_#000000] pointer-events-none z-10">
            <span className="truncate">
              {challenge.hasGroundGrid
                ? "☀️ 4.1 · SOMBRA CON SUELO GUÍA: Proyecta los rayos apoyándote en el mallado del suelo"
                : "☀️ 4.2 · SOMBRA LIBRE: Proyecta la sombra a mano alzada en perspectiva pura"}
            </span>
            <span className="font-bold shrink-0 hidden sm:inline ml-2 text-neutral-300">
              {challenge.hasGroundGrid ? "NIVEL 4.1" : "NIVEL 4.2"}
            </span>
          </div>
        )}
      </div>

      {/* BARRA DE HERRAMIENTAS Y ACCIONES INMEDIATA (TODO AL ALCANCE EN 1 SOLA LÍNEA) */}
      <div className="w-full mt-2 flex items-center justify-between gap-1.5 sm:gap-2 border-2 border-black bg-white p-2 shadow-[3px_3px_0px_#000000] flex-nowrap min-w-0">
        {/* Lado Izquierdo: Herramientas de dibujo (o resumen si está comprobado) */}
        {!feedback ? (
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              onClick={undoLastStroke}
              disabled={strokes.length === 0 || showSolution}
              className="btn-ink-outline px-2 py-1 text-xs font-mono disabled:opacity-30 cursor-pointer flex items-center gap-1 shrink-0 shadow-[1px_1px_0px_#000000]"
              title="Deshacer último trazo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Deshacer</span>
            </button>
            <button
              onClick={clearStrokes}
              disabled={strokes.length === 0 || showSolution}
              className="btn-ink-outline px-2 py-1 text-xs font-mono disabled:opacity-30 cursor-pointer flex items-center gap-1 shrink-0 shadow-[1px_1px_0px_#000000]"
              title="Borrar todos los trazos"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Borrar</span>
            </button>
            <span className="text-[11px] font-mono text-neutral-600 pl-0.5 font-bold shrink-0">
              {countDetectedAristas(strokes)}/{challenge.targetEdges.length}
              <span className="hidden lg:inline font-normal"> {challenge.isShadowLevel ? 'sombras' : 'aristas'}</span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-mono font-bold text-neutral-700 bg-neutral-100 px-2 py-1 border border-black shadow-[1px_1px_0px_#000000]">
              {countDetectedAristas(strokes)}/{challenge.targetEdges.length} {challenge.isShadowLevel ? 'aristas sombra' : 'aristas'}
            </span>
          </div>
        )}

        {/* Lado Derecho: Acciones (Comprobar o Siguiente) + Botón Report */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Botón de Reporte (pequeño con icono de triángulo para exportar / depurar) */}
          <button
            onClick={handleGenerateReport}
            className="btn-ink-outline p-1.5 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-transform active:scale-95 shadow-[1px_1px_0px_#000000] shrink-0"
            title="Generar reporte para depuración y revisión de nota (copiar y descargar)"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-black stroke-[2.5]" />
          </button>

          {feedback ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center gap-1 border-2 border-black bg-neutral-100 px-2 py-1 font-mono text-xs font-bold shadow-[1px_1px_0px_#000000] shrink-0">
                {feedback.passed ? (
                  <CheckCircle className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                )}
                <span>{feedback.totalScore ?? feedback.score}%</span>
                {feedback.passed && (feedback.speedBonus ?? 0) > 0 && (
                  <span
                    className="text-[10px] bg-black text-white px-1 ml-0.5 flex items-center gap-0.5"
                    title={`Base: ${feedback.score}% + Bonus velocidad: +${feedback.speedBonus}%`}
                  >
                    <Zap className="w-2.5 h-2.5 fill-white text-white shrink-0" />
                    <span>+{feedback.speedBonus}%</span>
                  </span>
                )}
              </div>
              <button
                onClick={onNextCube}
                className="btn-ink px-3 sm:px-4 py-1.5 text-xs font-mono uppercase font-bold flex items-center gap-1 cursor-pointer shadow-[2px_2px_0px_#000000] shrink-0"
                title="Siguiente ejercicio (Enter)"
              >
                <span>Siguiente</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleValidateClick}
              disabled={strokes.length === 0}
              className="btn-ink px-2.5 sm:px-3.5 py-1.5 text-xs font-mono uppercase font-bold disabled:opacity-30 cursor-pointer shadow-[2px_2px_0px_#000000] flex items-center gap-1 shrink-0"
              title={challenge.isShadowLevel ? "Comprobar proyección de sombra (Enter)" : "Comprobar perspectiva (Enter)"}
            >
              <span>Comprobar</span>
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          )}
        </div>
      </div>

      {/* Feedback técnico si se ha comprobado */}
      {feedback && (
        <div className="w-full mt-1.5 px-3 py-1.5 border-2 border-black bg-neutral-50 flex flex-col gap-0.5 text-xs shadow-[2px_2px_0px_#000000] min-w-0 max-w-full overflow-hidden">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 truncate min-w-0 flex-1">
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 font-bold uppercase shrink-0 ${
                  feedback.passed
                    ? 'bg-black text-white'
                    : 'bg-white text-black border border-black'
                }`}
              >
                {feedback.passed ? 'Aprobado ✓' : 'No Superado'}
              </span>
              <span className="font-bold font-display truncate">{feedback.mainIssueMessage}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono shrink-0">
              {feedback.passed && (feedback.speedBonus ?? 0) > 0 ? (
                <span className="bg-neutral-200 border border-black px-1.5 py-0.5 font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-black text-black shrink-0" />
                  <span>Base {feedback.score}% + Vel. +{feedback.speedBonus}% ({feedback.timeRemainingSeconds?.toFixed(1)}s)</span>
                </span>
              ) : (
                <span className="text-neutral-500">Mínimo: 75%</span>
              )}
            </div>
          </div>
          <span className="text-neutral-600 text-[11px] font-sans truncate">
            {feedback.tipMessage}
          </span>
        </div>
      )}

      {/* Modal de Reporte de Depuración y Diagnóstico */}
      {showReportModal && currentReportData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
          <div className="bg-white border-3 border-black p-4 sm:p-5 max-w-lg w-full shadow-[6px_6px_0px_#000000] flex flex-col gap-3 font-sans">
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-black stroke-[2.5]" />
                <h3 className="font-display font-bold text-sm sm:text-base uppercase tracking-tight">
                  Reporte de Evaluación del Cubo
                </h3>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1 hover:bg-neutral-100 border border-black cursor-pointer"
                title="Cerrar modal"
              >
                <X className="w-4 h-4 text-black" />
              </button>
            </div>

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

            <div className="text-xs text-neutral-700 bg-neutral-100 p-2.5 border border-neutral-300 leading-relaxed">
              <p className="font-bold text-black flex items-center gap-1.5 mb-1">
                <CheckCircle className="w-4 h-4 text-black" />
                <span>¡Reporte copiado y descargado en .JSON!</span>
              </p>
              <p>
                El reporte completo con todos los datos geométricos, trazos y evaluación se ha copiado al portapapeles y se ha descargado a tu equipo. Puedes pegarlo directamente en el chat para revisar la calificación.
              </p>
            </div>

            {/* Vista previa del contenido */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-mono font-bold text-neutral-600">
                Vista previa del reporte (Markdown / JSON):
              </label>
              <textarea
                readOnly
                value={currentReportData.markdownText}
                className="w-full h-32 p-2 font-mono text-[10px] bg-neutral-50 border border-black resize-none selection:bg-black selection:text-white"
              />
            </div>

            {/* Acciones */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-200">
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    await copyReportToClipboard(currentReportData.markdownText);
                    setCopiedReport(true);
                    setTimeout(() => setCopiedReport(false), 2500);
                  }}
                  className="btn-ink px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
                >
                  {copiedReport ? <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedReport ? '¡Copiado de nuevo!' : 'Copiar Texto'}</span>
                </button>

                <button
                  onClick={() => downloadReportJson(currentReportData.jsonString, challenge.seed)}
                  className="btn-ink-outline px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar JSON</span>
                </button>
              </div>

              <button
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
};
