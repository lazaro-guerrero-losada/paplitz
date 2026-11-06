import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Primitive3DChallenge,
  UserStroke3D,
  EvaluationResult3D,
  Point2D,
  PrimitiveType,
  AidMode,
  Vector3D,
} from '../../lib/perspective3d/types';
import { generate3DChallenge, ALL_PRIMITIVES, isTangentCurve } from '../../lib/perspective3d/primitives';
import { evaluate3DSubmission } from '../../lib/perspective3d/evaluator3d';
import { Perspective3DPreviewCard } from './Perspective3DPreviewCard';
import { PrimitiveSelectorPanel } from './PrimitiveSelectorPanel';
import {
  Undo2,
  Redo2,
  Trash2,
  Eye,
  EyeOff,
  Crosshair,
  Grid,
  ChevronRight,
  RotateCcw,
  Trophy,
  Check,
  CheckCircle,
  AlertTriangle,
  X,
  Copy,
  Download,
  FileText,
  Sparkles,
  PenTool,
} from 'lucide-react';
import { SessionRecordItem } from '../../lib/sessionRecorder';
import {
  build3DDebugReport,
  copyReport3DToClipboard,
  downloadReport3DJson,
} from '../../lib/perspective3d/debugReport3d';
import {
  unprojectUserStrokesTo3D,
  getOriginalCameraOrbitAngles,
  createOrbitViewProj,
} from '../../lib/perspective3d/reconstruct3d';
import { project3DTo2D } from '../../lib/perspective3d/math3d';

interface Lab3DViewProps {
  onAwardXP?: (amount: number) => void;
  onAvatarMoodChange?: (mood: any) => void;
  onExit?: () => void;
  isRecording?: boolean;
  onToggleRecording?: () => void;
  onOpenRecordModal?: () => void;
  recordedCount?: number;
  onRecordExercise?: (record: SessionRecordItem) => void;
  onUpdateRecordComment?: (recordId: string, comment: string) => void;
}

export const Lab3DView: React.FC<Lab3DViewProps> = ({
  onAwardXP,
  onAvatarMoodChange,
  onExit,
  isRecording = false,
  onToggleRecording,
  onOpenRecordModal,
  recordedCount = 0,
  onRecordExercise,
  onUpdateRecordComment,
}) => {
  // Configuración de la sesión
  const TOTAL_ROUNDS = 8;
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [sessionScores, setSessionScores] = useState<number[]>([]);
  const [isSessionComplete, setIsSessionComplete] = useState<boolean>(false);

  // Estados para Reporte Técnico y Notas
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [userNote, setUserNote] = useState<string>('');
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [downloadedReport, setDownloadedReport] = useState<boolean>(false);
  const currentRecordIdRef = useRef<string | null>(null);

  // Formas seleccionadas para el entrenamiento
  const [enabledPrimitives, setEnabledPrimitives] = useState<PrimitiveType[]>([...ALL_PRIMITIVES]);

  // Reto actual
  const [challenge, setChallenge] = useState<Primitive3DChallenge>(() =>
    generate3DChallenge(Date.now(), undefined, 800, 600, ALL_PRIMITIVES)
  );

  // Estados del lienzo
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 600,
  });
  const [strokes, setStrokes] = useState<UserStroke3D[]>([]);
  const [redoStack, setRedoStack] = useState<UserStroke3D[]>([]);
  const [evaluation, setEvaluation] = useState<EvaluationResult3D | null>(null);

  // Cámara orbital 3D para rotación directa en el lienzo al completar/evaluar el dibujo
  const initialOrbit = useMemo(() => getOriginalCameraOrbitAngles(challenge.camera), [challenge.camera]);
  const [azimuth, setAzimuth] = useState<number>(initialOrbit.azimuthRad);
  const [elevation, setElevation] = useState<number>(initialOrbit.elevationRad);
  const [distance, setDistance] = useState<number>(initialOrbit.distance);
  const [target, setTarget] = useState<Vector3D>({ ...initialOrbit.target });

  // Trazos 3D reconstruidos una vez evaluado
  const reconstructedStrokes = useMemo(() => {
    if (!evaluation || strokes.length === 0) return [];
    return unprojectUserStrokesTo3D(
      strokes,
      challenge.camera,
      canvasDimensions.width,
      canvasDimensions.height,
      challenge.targetCurves,
      challenge.anchorCurves
    );
  }, [evaluation, strokes, challenge, canvasDimensions]);

  // Herramienta de trazo activa: 'ink' (tinta de forma) o 'construction' (línea guía fina gris discontinua)
  const [strokeTool, setStrokeTool] = useState<'ink' | 'construction'>('ink');
  // Visualización en modo corrección (3-4 etapas: 'all' [ambos], 'solution' [solo solución], 'drawing' [solo dibujo], 'off' [apagado])
  const [visionMode, setVisionMode] = useState<'all' | 'solution' | 'drawing' | 'off'>('all');

  // Opciones de visualización y Ayudas 3D
  const [showGrid, setShowGrid] = useState<boolean>(true); // Activar / desactivar rejilla 3D
  const [aidMode, setAidMode] = useState<AidMode>('off'); // 3 Estados: off, line, vertices

  // Referencias del Canvas e interactividad
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const isOrbitingRef = useRef<boolean>(false);
  const lastOrbitPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentPointsRef = useRef<Point2D[]>([]);
  const activePointerIdRef = useRef<number | null>(null);
  const [currentLiveStroke, setCurrentLiveStroke] = useState<Point2D[]>([]);

  // Cargar nuevo reto
  const loadNewChallenge = useCallback(
    (roundNum: number, forcedType?: PrimitiveType, allowedOverride?: PrimitiveType[]) => {
      const allowed = allowedOverride || enabledPrimitives;
      const type = forcedType;
      const newSeed = Math.floor(Math.random() * 1000000);
      const newCh = generate3DChallenge(
        newSeed,
        type,
        canvasDimensions.width,
        canvasDimensions.height,
        allowed
      );
      setChallenge(newCh);
      const orig = getOriginalCameraOrbitAngles(newCh.camera);
      setAzimuth(orig.azimuthRad);
      setElevation(orig.elevationRad);
      setDistance(orig.distance);
      setTarget({ ...orig.target });
      setStrokes([]);
      setRedoStack([]);
      setCurrentLiveStroke([]);
      setEvaluation(null);
      setStrokeTool('ink');
      setVisionMode('all');
      setCurrentRound(roundNum);
      setUserNote('');
      setShowReportModal(false);
      setCopiedReport(false);
      setDownloadedReport(false);
      currentRecordIdRef.current = null;
    },
    [canvasDimensions, enabledPrimitives]
  );

  // Ajustar dimensiones del canvas exactamente al contenedor del área de dibujo
  useEffect(() => {
    const updateSize = () => {
      if (!canvasContainerRef.current) return;
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const w = Math.max(320, Math.floor(rect.width));
      const h = Math.max(320, Math.floor(rect.height));

      setCanvasDimensions({ width: w, height: h });
      setChallenge((prev) => {
        const updated = generate3DChallenge(prev.seed, prev.type, w, h, enabledPrimitives);
        const orig = getOriginalCameraOrbitAngles(updated.camera);
        setAzimuth(orig.azimuthRad);
        setElevation(orig.elevationRad);
        setDistance(orig.distance);
        setTarget({ ...orig.target });
        return updated;
      });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [enabledPrimitives]);

  // ==========================================
  // Renderizado del Canvas 2D / 3D
  // ==========================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasDimensions;
    ctx.clearRect(0, 0, width, height);

    // Matriz de proyección orbital (activa cuando se evalúa para rotación 3D directa)
    const aspect = width / height;
    const { viewProj: currentViewProj } = createOrbitViewProj(
      azimuth,
      elevation,
      distance,
      target,
      challenge.camera.fov,
      aspect,
      challenge.camera.shiftY || 0
    );

    // Función auxiliar para dibujar polilíneas 3D en pantalla
    const drawPolyline3D = (
      points3D: Vector3D[],
      strokeStyle: string,
      lineWidth: number,
      dash: number[] = [],
      cap: CanvasLineCap = 'round'
    ) => {
      if (points3D.length < 2) return;
      ctx.save();
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash(dash);
      ctx.lineCap = cap;
      ctx.lineJoin = 'round';

      let inPath = false;
      for (let i = 0; i < points3D.length; i++) {
        const proj = project3DTo2D(points3D[i], currentViewProj, width, height);
        if (proj.isBehindCamera) {
          if (inPath) {
            ctx.stroke();
            inPath = false;
          }
          continue;
        }

        if (!inPath) {
          ctx.beginPath();
          ctx.moveTo(proj.point2D.x, proj.point2D.y);
          inPath = true;
        } else {
          ctx.lineTo(proj.point2D.x, proj.point2D.y);
        }
      }
      if (inPath) {
        ctx.stroke();
      }
      ctx.restore();
    };

    // 1. DIBUJAR GUÍAS Y REJILLA 3D (Si showGrid está activo)
    // Cuando está evaluado, las guías 2D solo se muestran cerca del ángulo original para no interferir con el giro 3D
    const isNearOriginalAngle =
      Math.abs(azimuth - initialOrbit.azimuthRad) < 0.08 &&
      Math.abs(elevation - initialOrbit.elevationRad) < 0.08;

    if (showGrid && challenge.gridLines && (!evaluation || isNearOriginalAngle)) {
      // Líneas de perspectiva del suelo y paredes
      challenge.gridLines.forEach((line) => {
        ctx.beginPath();
        ctx.moveTo(line.start.x, line.start.y);
        ctx.lineTo(line.end.x, line.end.y);
        ctx.strokeStyle = '#94a3b8'; // Slate-400 técnico
        ctx.globalAlpha = line.opacity || 0.18;
        ctx.lineWidth = 1.0;
        ctx.stroke();
      });

      // Puntos de Fuga (VP X, VP Y, VP Z) con flechas indicadoras (Screenshot 1 & 4)
      const vpList = [challenge.vanishingPoints.X, challenge.vanishingPoints.Y, challenge.vanishingPoints.Z].filter(
        Boolean
      );

      vpList.forEach((vp) => {
        if (!vp) return;
        ctx.globalAlpha = 0.85;

        // Si el punto de fuga está dentro de la pantalla, dibujar etiqueta directa
        const posX = vp.isOnScreen ? vp.point.x : vp.screenEdgePoint.x;
        const posY = vp.isOnScreen ? vp.point.y : vp.screenEdgePoint.y;

        // Flecha o triángulo indicador
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        const iconSize = 6;
        if (vp.axis === 'Y') {
          // Triángulo vertical hacia arriba o abajo
          const isUp = posY < height / 2;
          ctx.moveTo(posX, posY + (isUp ? -iconSize : iconSize));
          ctx.lineTo(posX - iconSize, posY + (isUp ? iconSize : -iconSize));
          ctx.lineTo(posX + iconSize, posY + (isUp ? iconSize : -iconSize));
        } else if (vp.axis === 'X') {
          // Triángulo horizontal hacia la derecha
          ctx.moveTo(posX + iconSize, posY);
          ctx.lineTo(posX - iconSize, posY - iconSize);
          ctx.lineTo(posX - iconSize, posY + iconSize);
        } else {
          // VP Z: punto o triángulo hacia la profundidad
          ctx.arc(posX, posY, 4, 0, Math.PI * 2);
        }
        ctx.fill();

        // Texto de etiqueta (ej: "▲ VP Z", "▼ VP Y", "► VP X")
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#334155';
        ctx.textAlign = 'center';
        ctx.textBaseline = posY < height / 2 ? 'bottom' : 'top';
        ctx.fillText(vp.label, posX, posY < height / 2 ? posY - 8 : posY + 8);
      });
      ctx.globalAlpha = 1.0;
    }

    // 2. DIBUJAR LÍNEAS ANCLA / BASE DADAS (Negras sólidas / grises posteriores / tangentes)
    if (evaluation) {
      challenge.anchorCurves.forEach((curve) => {
        if (!curve.points3D || curve.points3D.length < 2) return;
        const isTangent = isTangentCurve(curve);
        if (isTangent) {
          drawPolyline3D(curve.points3D, '#94a3b8', 1.8, [16, 5, 2.5, 5]);
        } else if (curve.style === 'faint') {
          drawPolyline3D(curve.points3D, '#94a3b8', 1.4, [4, 4]);
        } else {
          drawPolyline3D(curve.points3D, '#09090b', 2.8, []);
        }
      });
    } else {
      challenge.anchorCurves.forEach((curve) => {
        if (curve.points.length < 2) return;
        ctx.beginPath();
        curve.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });

        const isTangent = isTangentCurve(curve);
        if (isTangent) {
          ctx.strokeStyle = '#94a3b8'; // Visiblemente gris (Slate-400)
          ctx.lineWidth = 1.8;
          ctx.setLineDash([16, 5, 2.5, 5]); // Trazo cadena largo diferenciado: 16px guión, 5px hueco, 2.5px punto, 5px hueco
        } else if (curve.style === 'faint') {
          ctx.strokeStyle = '#94a3b8'; // Mitad posterior tenue
          ctx.lineWidth = 1.4;
          ctx.setLineDash([4, 4]);
        } else {
          ctx.strokeStyle = '#09090b'; // Línea de tinta frontal sólida
          ctx.lineWidth = 2.8;
          ctx.setLineDash([]);
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }

    // 3. AYUDAS VISUALES 3D (3 Estados: Off, Línea, Vértices)
    if (!evaluation) {
      if (aidMode === 'line') {
        // ESTADO 1: Línea que muestra el trazo completo para terminar la forma
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        challenge.targetCurves.forEach((tc) => {
          if (tc.points.length < 2) return;
          const isTangent = isTangentCurve(tc);
          ctx.beginPath();
          if (isTangent) {
            // Líneas tangentes: diferenciadas con trazo cadena largo y color gris pizarra
            ctx.strokeStyle = '#94a3b8'; // Visiblemente gris (Slate-400)
            ctx.lineWidth = 1.8;
            ctx.setLineDash([16, 5, 2.5, 5]); // Trazo cadena largo diferenciado
          } else {
            // Curvas y aristas estándar: trazo de puntos más oscuro
            ctx.strokeStyle = '#475569'; // Slate 600 más oscuro para contrastar con las tangentes
            ctx.lineWidth = 1.8;
            ctx.setLineDash([3, 5]);
          }
          tc.points.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();
        });
        ctx.restore();
      } else if (aidMode === 'vertices') {
        // ESTADO 2: Solo vértices y una línea fina que apunta hacia el otro vértice (Estética monocromática)
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const drawnVertices: Point2D[] = [];
        const addVertex = (p: Point2D) => {
          if (!drawnVertices.some((v) => Math.hypot(v.x - p.x, v.y - p.y) < 4)) {
            drawnVertices.push(p);
          }
        };

        challenge.targetCurves.forEach((tc) => {
          if (tc.points.length < 2) return;
          const pts = tc.points;
          const isTangent = isTangentCurve(tc);
          ctx.strokeStyle = isTangent ? '#94a3b8' : '#000000';
          ctx.lineWidth = isTangent ? 1.8 : 1.6;
          ctx.setLineDash(isTangent ? [12, 4, 2, 4] : []);

          if (pts.length === 2) {
            // Segmento recto entre 2 vértices
            const pA = pts[0];
            const pB = pts[1];
            addVertex(pA);
            addVertex(pB);

            const dx = pB.x - pA.x;
            const dy = pB.y - pA.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 8) {
              const ux = dx / dist;
              const uy = dy / dist;
              const stubLen = Math.min(32, Math.max(10, dist * 0.28));

              // Línea fina desde pA que apunta hacia pB
              ctx.beginPath();
              ctx.moveTo(pA.x, pA.y);
              ctx.lineTo(pA.x + ux * stubLen, pA.y + uy * stubLen);
              ctx.stroke();

              // Línea fina desde pB que apunta hacia pA
              ctx.beginPath();
              ctx.moveTo(pB.x, pB.y);
              ctx.lineTo(pB.x - ux * stubLen, pB.y - uy * stubLen);
              ctx.stroke();
            }
          } else {
            // Segmento curvo (anillos o siluetas)
            const isClosed = Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) < 4;
            if (isClosed) {
              const step = Math.floor(pts.length / 4);
              for (let k = 0; k < 4; k++) {
                const idxA = (k * step) % pts.length;
                const pA = pts[idxA];
                addVertex(pA);

                const stubCount = Math.max(3, Math.floor(step * 0.28));
                ctx.beginPath();
                for (let s = 0; s <= stubCount; s++) {
                  const pt = pts[(idxA + s) % pts.length];
                  if (s === 0) ctx.moveTo(pt.x, pt.y);
                  else ctx.lineTo(pt.x, pt.y);
                }
                ctx.stroke();
              }
            } else {
              const pA = pts[0];
              const pB = pts[pts.length - 1];
              addVertex(pA);
              addVertex(pB);

              const stubCount = Math.max(3, Math.floor(pts.length * 0.28));
              ctx.beginPath();
              for (let s = 0; s <= stubCount && s < pts.length; s++) {
                const pt = pts[s];
                if (s === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
              }
              ctx.stroke();

              ctx.beginPath();
              for (let s = pts.length - 1; s >= pts.length - 1 - stubCount && s >= 0; s--) {
                const pt = pts[s];
                if (s === pts.length - 1) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
              }
              ctx.stroke();
            }
          }
        });

        // Dibujar los marcadores de vértices con estilo técnico brutalista (sin colores)
        drawnVertices.forEach((v) => {
          ctx.fillStyle = '#000000';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(v.x, v.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Centro blanco nítido
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(v.x, v.y, 1.8, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.restore();
      }
    }

    // 4. TRAZOS DEL USUARIO Y SOLUCIÓN DE EVALUACIÓN
    if (evaluation) {
      // Control de visibilidad según visionMode:
      // - 'all': se dibuja el dibujo del usuario Y la solución técnica en 3D.
      // - 'solution': se oculta el dibujo del usuario, se dibuja la solución técnica en 3D.
      // - 'drawing': se dibuja el dibujo del usuario en 3D, se oculta la solución técnica.
      // - 'off': se oculta tanto el dibujo como la solución técnica (solo base en 3D).
      const shouldDrawUserStrokes = visionMode === 'all' || visionMode === 'drawing';
      const shouldDrawSolution = visionMode === 'all' || visionMode === 'solution';

      if (shouldDrawUserStrokes && reconstructedStrokes.length > 0) {
        reconstructedStrokes.forEach((stroke) => {
          if (!stroke.points3D || stroke.points3D.length < 2) return;
          if (stroke.isConstruction) {
            drawPolyline3D(stroke.points3D, '#94a3b8', 1.2, [4, 4]);
          } else {
            drawPolyline3D(stroke.points3D, '#0f172a', 2.4, []);
          }
        });
      }

      if (shouldDrawSolution) {
        challenge.targetCurves.forEach((curve) => {
          if (!curve.points3D || curve.points3D.length < 2) return;
          const isTangent = isTangentCurve(curve);
          if (isTangent) {
            drawPolyline3D(curve.points3D, '#94a3b8', 1.8, [16, 5, 2.5, 5]);
          } else {
            drawPolyline3D(curve.points3D, '#000000', 2.4, [6, 4]);
          }
        });

        // Vértices clave de referencia técnica con anillas blancas de borde negro
        const keyVertices3D: Vector3D[] = [];
        const addKeyVertex3D = (p: Vector3D) => {
          if (!keyVertices3D.some((v) => Math.hypot(v.x - p.x, v.y - p.y, v.z - p.z) < 0.05)) {
            keyVertices3D.push(p);
          }
        };
        challenge.targetCurves.forEach((curve) => {
          if (curve.points3D && curve.points3D.length >= 2) {
            addKeyVertex3D(curve.points3D[0]);
            addKeyVertex3D(curve.points3D[curve.points3D.length - 1]);
          }
        });

        ctx.save();
        keyVertices3D.forEach((v3) => {
          const proj = project3DTo2D(v3, currentViewProj, width, height);
          if (!proj.isBehindCamera) {
            ctx.beginPath();
            ctx.arc(proj.point2D.x, proj.point2D.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.8;
            ctx.setLineDash([]);
            ctx.stroke();
          }
        });
        ctx.restore();
      }
    } else {
      // MIENTRAS EL USUARIO DIBUJA (Screenshot 1, 2, 4):
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      strokes.forEach((stroke) => {
        if (stroke.points.length < 2) return;
        ctx.beginPath();
        if (stroke.isConstruction) {
          ctx.strokeStyle = '#94a3b8'; // Línea de construcción fina gris
          ctx.lineWidth = 1.4;
          ctx.setLineDash([4, 4]); // Discontinua
        } else {
          ctx.strokeStyle = '#0f172a'; // Tinta negra técnica y precisa
          ctx.lineWidth = 2.4;
          ctx.setLineDash([]);
        }
        stroke.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Trazo en curso en tiempo real
      if (currentLiveStroke.length > 1) {
        ctx.beginPath();
        if (strokeTool === 'construction') {
          ctx.strokeStyle = '#94a3b8'; // Gris técnico fino
          ctx.lineWidth = 1.4;
          ctx.setLineDash([4, 4]); // Discontinua
        } else {
          ctx.strokeStyle = '#0f172a'; // Tinta negra de forma
          ctx.lineWidth = 2.4;
          ctx.setLineDash([]);
        }
        currentLiveStroke.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [
    challenge,
    strokes,
    currentLiveStroke,
    evaluation,
    showGrid,
    aidMode,
    canvasDimensions,
    strokeTool,
    visionMode,
    azimuth,
    elevation,
    distance,
    target,
    reconstructedStrokes,
    initialOrbit,
  ]);

  // ==========================================
  // Manejadores de Eventos del Puntero (Stylus, Touch, Mouse) con Corrección de Escala
  // ==========================================
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): Point2D => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (evaluation) {
      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // Ignorar si no es soportado
      }
      isOrbitingRef.current = true;
      lastOrbitPosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }
    if (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId) {
      return; // Rechazo de toques secundarios / palma
    }
    e.preventDefault();
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignorar si no es soportado
    }
    activePointerIdRef.current = e.pointerId;
    isDrawingRef.current = true;
    const pt = getCanvasCoords(e);
    currentPointsRef.current = [pt];
    setCurrentLiveStroke([pt]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (evaluation) {
      if (!isOrbitingRef.current) return;
      const dx = e.clientX - lastOrbitPosRef.current.x;
      const dy = e.clientY - lastOrbitPosRef.current.y;
      lastOrbitPosRef.current = { x: e.clientX, y: e.clientY };

      const rotSpeed = 0.007;
      setAzimuth((prev) => prev - dx * rotSpeed);
      setElevation((prev) => Math.max(-1.42, Math.min(1.42, prev + dy * rotSpeed)));
      return;
    }
    if (!isDrawingRef.current || (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId)) return;
    e.preventDefault();
    const pt = getCanvasCoords(e);
    currentPointsRef.current.push(pt);
    setCurrentLiveStroke([...currentPointsRef.current]);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (evaluation) {
      isOrbitingRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignorar
      }
      return;
    }
    if (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId) return;
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    activePointerIdRef.current = null;
    const pts = currentPointsRef.current;
    if (pts.length > 1) {
      const newStroke: UserStroke3D = {
        id: `stroke-${Date.now()}-${Math.random()}`,
        points: pts,
        timestamp: Date.now(),
        isConstruction: strokeTool === 'construction',
      };
      setStrokes((prev) => [...prev, newStroke]);
      setRedoStack([]);
    }
    currentPointsRef.current = [];
    setCurrentLiveStroke([]);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!evaluation) return;
    const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
    setDistance((prev) => Math.max(1, Math.min(25, prev * zoomFactor)));
  };

  const handleDoubleClick = () => {
    if (!evaluation) return;
    const orig = getOriginalCameraOrbitAngles(challenge.camera);
    setAzimuth(orig.azimuthRad);
    setElevation(orig.elevationRad);
    setDistance(orig.distance);
    setTarget({ ...orig.target });
  };

  // ==========================================
  // Acciones de la Barra de Herramientas
  // ==========================================
  const handleUndo = () => {
    if (strokes.length === 0 || evaluation) return;
    const last = strokes[strokes.length - 1];
    setStrokes((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [...prev, last]);
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || evaluation) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setStrokes((prev) => [...prev, next]);
  };

  const handleClear = () => {
    if (evaluation) return;
    setStrokes([]);
    setRedoStack([]);
  };

  // Memo para el reporte técnico actual 3D
  const currentReport = useMemo(() => {
    return build3DDebugReport(challenge, strokes, evaluation, userNote);
  }, [challenge, strokes, evaluation, userNote]);

  // Evaluación y paso a siguiente ronda
  const handleSubmitOrNext = () => {
    if (!evaluation) {
      // 1. Evaluar trazos
      const result = evaluate3DSubmission(strokes, challenge.targetCurves);
      setEvaluation(result);
      setVisionMode('all');

      // Si el Modo Récord está activo, registrar ejercicio automáticamente
      if (isRecording && onRecordExercise) {
        const rep = build3DDebugReport(challenge, strokes, result, userNote);
        const newRecordId = `${Date.now()}_${challenge.seed}`;
        currentRecordIdRef.current = newRecordId;
        const newRecord: SessionRecordItem = {
          id: newRecordId,
          timestamp: new Date().toISOString(),
          displayTime: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          type: '3d',
          nodeCode: `3D-${challenge.type.toUpperCase()}`,
          nodeTitle: `Perspectiva ${challenge.name}`,
          seed: challenge.seed,
          score: Math.round(result.score),
          passed: result.score >= 70,
          userComment: userNote.trim(),
          metricsSummary: `${Math.round(result.score)}% · ${result.passed ? 'Aprobado ✓' : 'No Superado'} · Completadas: ${result.drawnCount}/${result.targetCount}`,
          reportMarkdown: rep.markdownText,
          reportJsonString: rep.jsonString,
        };
        onRecordExercise(newRecord);
      }

      // Otorgar XP y feedback
      const awardedXp = Math.round(result.score * 0.4);
      if (awardedXp > 0 && onAwardXP) {
        onAwardXP(awardedXp);
      }

      if (onAvatarMoodChange) {
        if (result.passed) onAvatarMoodChange('happy');
        else if (result.score >= 50) onAvatarMoodChange('thinking');
        else onAvatarMoodChange('fail-spiral');
      }

      setSessionScores((prev) => [...prev, result.score]);
    } else {
      // 2. Pasar a la siguiente ronda
      if (currentRound >= TOTAL_ROUNDS) {
        setIsSessionComplete(true);
      } else {
        loadNewChallenge(currentRound + 1);
      }
    }
  };

  // Reiniciar sesión de 8 rondas
  const handleRestartSession = () => {
    setSessionScores([]);
    setIsSessionComplete(false);
    loadNewChallenge(1);
  };

  // Atajos de teclado para flujo ágil en Lab 3D (Enter: comprobar/siguiente, V: ciclar visión tras evaluar, Ctrl+Z: deshacer)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmitOrNext();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key.toLowerCase() === 'v' && evaluation) {
        e.preventDefault();
        setVisionMode((prev) => {
          if (prev === 'all') return 'solution';
          if (prev === 'solution') return 'drawing';
          if (prev === 'drawing') return 'off';
          return 'all';
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [evaluation, strokes, redoStack, challenge, isRecording, userNote, currentRound]);

  // Promedio de puntuación
  const averageScore =
    sessionScores.length > 0
      ? Math.round((sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length) * 10) / 10
      : 0;

  return (
    <div
      className="relative w-full h-[calc(100vh-65px)] min-h-[500px] bg-white flex flex-col overflow-hidden select-none"
    >
      {/* PANEL FLOTANTE IZQUIERDO DE SELECCIÓN DE FORMAS 3D */}
      <div className="absolute top-3 left-3 sm:left-5 z-20">
        <PrimitiveSelectorPanel
          selectedTypes={enabledPrimitives}
          onChangeSelectedTypes={(newSelected) => {
            setEnabledPrimitives(newSelected);
            if (!newSelected.includes(challenge.type)) {
              loadNewChallenge(currentRound, undefined, newSelected);
            }
          }}
          onSelectImmediate={(type) => {
            loadNewChallenge(currentRound, type);
          }}
          currentType={challenge.type}
        />
      </div>

      {/* 2. TARJETA CON EL MODELO 3D OBJETIVO Y CUADRADITO DE NOTA (SUPERIOR DERECHA, COMO EN PRÁCTICA) */}
      <div className="absolute top-3 right-4 sm:right-6 z-20 flex items-start gap-2 sm:gap-2.5 pointer-events-none">
        {evaluation && (
          <div className="pointer-events-auto bg-white border-2 border-black p-2 sm:p-2.5 shadow-[4px_4px_0px_#000000] font-mono flex flex-col items-center justify-center min-w-[88px] sm:min-w-[100px] aspect-square animate-in fade-in zoom-in-95 duration-150 select-none">
            <span className="text-[10px] sm:text-xs font-bold uppercase text-neutral-500 tracking-wider">
              Nota
            </span>
            <span className="text-2xl sm:text-3xl font-black leading-none my-1">
              {Math.round(evaluation.score)}%
            </span>
            <span
              className={`text-[9px] sm:text-[10px] font-bold uppercase px-1.5 py-0.5 border border-black ${
                evaluation.passed
                  ? 'bg-black text-white'
                  : 'bg-neutral-200 text-black'
              }`}
            >
              {evaluation.passed ? 'Aprobado' : 'Reintentar'}
            </span>
          </div>
        )}

        <div className="pointer-events-auto">
          <Perspective3DPreviewCard
            model={challenge.previewModel3D}
            primitiveType={challenge.type}
            title={challenge.name}
          />
        </div>
      </div>

      {/* 4. LIENZO PRINCIPAL INTERACTIVO CON DETALLES TÉCNICOS PAPLITZ */}
      <div
        ref={canvasContainerRef}
        className={`relative flex-1 w-full h-full overflow-hidden flex items-center justify-center ${
          evaluation ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
        }`}
      >
        {/* Indicador de Rotación 3D directa tras evaluar */}
        {evaluation && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold uppercase bg-white border border-black px-2.5 py-1 pointer-events-none shadow-[2px_2px_0px_#000000] z-10 flex items-center gap-1.5 animate-in fade-in duration-200">
            <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
            <span>Giro 3D: Arrastra para rotar · Doble clic para resetear · Zoom con rueda</span>
          </div>
        )}

        {/* Indicador de 6 Paredes Inferior Izquierdo */}
        <div className="absolute bottom-3 left-3 text-[9px] font-mono font-bold uppercase bg-white border border-black px-1.5 py-0.5 pointer-events-none shadow-[1px_1px_0px_#000000] z-10 opacity-75 hidden sm:block">
          <span>6 PAREDES · VP X, Y, Z</span>
        </div>

        <canvas
          ref={canvasRef}
          width={canvasDimensions.width}
          height={canvasDimensions.height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
          className="touch-none block w-full h-full select-none"
        />
      </div>

      {/* 5. BARRA DE HERRAMIENTAS FLOTANTE INFERIOR (NEOBRUTALISTA PAPLITZ) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
        <div className="bg-white border-2 border-black p-1.5 sm:p-2 shadow-[4px_4px_0px_#000000] flex items-center gap-1.5 sm:gap-2">
          {/* BOTONES EXCLUSIVOS EN MODO DIBUJO (Desaparecen al corregir) */}
          {!evaluation && (
            <>
              {/* Deshacer */}
              <button
                onClick={handleUndo}
                disabled={strokes.length === 0}
                className="btn-ink-outline p-2 text-xs disabled:opacity-30 disabled:cursor-not-allowed shadow-[1px_1px_0px_#000000]"
                title="Deshacer trazo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4 stroke-[2.2]" />
              </button>

              {/* Rehacer */}
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="btn-ink-outline p-2 text-xs disabled:opacity-30 disabled:cursor-not-allowed shadow-[1px_1px_0px_#000000]"
                title="Rehacer trazo"
              >
                <Redo2 className="w-4 h-4 stroke-[2.2]" />
              </button>

              {/* Borrar Todo */}
              <button
                onClick={handleClear}
                disabled={strokes.length === 0}
                className="btn-ink-outline p-2 text-xs hover:bg-neutral-200 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed shadow-[1px_1px_0px_#000000]"
                title="Borrar todos los trazos"
              >
                <Trash2 className="w-4 h-4 stroke-[2.2]" />
              </button>

              <div className="w-[2px] h-6 bg-black mx-0.5" />

              {/* Herramienta: Tinta de Forma vs Línea de Construcción */}
              <button
                type="button"
                onClick={() => setStrokeTool((prev) => (prev === 'ink' ? 'construction' : 'ink'))}
                className={`p-2 text-xs font-mono font-bold border-2 border-black transition-all cursor-pointer shadow-[1px_1px_0px_#000000] flex items-center gap-1.5 ${
                  strokeTool === 'construction'
                    ? 'bg-neutral-800 text-white'
                    : 'bg-white text-neutral-800 hover:bg-neutral-100'
                }`}
                title={
                  strokeTool === 'construction'
                    ? 'Herramienta de Construcción activa (línea fina, gris y discontinua; no afecta a la corrección). Clic para volver a Tinta de Forma.'
                    : 'Activar Línea de Construcción (trazo fino, gris y discontinuo para encajar perspectiva sin penalizaciones).'
                }
              >
                <span className={`w-3.5 border-b-2 ${strokeTool === 'construction' ? 'border-dashed border-white' : 'border-neutral-800'}`} />
                <span className="text-[10px] uppercase tracking-wider font-mono">
                  {strokeTool === 'construction' ? 'Construcción' : 'Tinta'}
                </span>
              </button>

              <div className="w-[2px] h-6 bg-black mx-0.5" />
            </>
          )}

          {/* BOTÓN EXCLUSIVO EN MODO CORRECCIÓN: Visión Cíclica (Ambos -> Solución [oculta dibujo] -> Dibujo -> Off) */}
          {evaluation && (
            <>
              <button
                type="button"
                onClick={() => {
                  setVisionMode((prev) => {
                    if (prev === 'all') return 'solution';
                    if (prev === 'solution') return 'drawing';
                    if (prev === 'drawing') return 'off';
                    return 'all';
                  });
                }}
                className={`px-2.5 py-1.5 text-xs font-mono font-bold border-2 border-black transition-all cursor-pointer shadow-[1px_1px_0px_#000000] flex items-center gap-1.5 ${
                  visionMode !== 'off' ? 'bg-black text-white' : 'bg-white text-neutral-600 hover:bg-neutral-100'
                }`}
                title={
                  visionMode === 'all'
                    ? 'Visión: Ambos (mi dibujo + solución superpuesta). Clic para ver solo solución (V)'
                    : visionMode === 'solution'
                    ? 'Visión: Solución (mi dibujo oculto). Clic para ver solo mi dibujo (V)'
                    : visionMode === 'drawing'
                    ? 'Visión: Mi Dibujo (solución oculta). Clic para apagar todo (V)'
                    : 'Visión: Off (lienzo limpio con guías 3D). Clic para ver ambos (V)'
                }
              >
                {visionMode === 'all' && <Eye className="w-4 h-4 stroke-[2.2]" />}
                {visionMode === 'solution' && <Sparkles className="w-4 h-4 stroke-[2.2]" />}
                {visionMode === 'drawing' && <PenTool className="w-4 h-4 stroke-[2.2]" />}
                {visionMode === 'off' && <EyeOff className="w-4 h-4 stroke-[2.2]" />}
                <span className="text-[10px] uppercase tracking-wider font-mono">
                  {visionMode === 'all'
                    ? 'Visión: Ambos'
                    : visionMode === 'solution'
                    ? 'Visión: Solución'
                    : visionMode === 'drawing'
                    ? 'Visión: Dibujo'
                    : 'Visión: Off'}
                </span>
              </button>

              <div className="w-[2px] h-6 bg-black mx-0.5" />
            </>
          )}

          {/* Botón REC (Modo Récord) - Visible siempre */}
          <button
            type="button"
            onClick={isRecording ? onOpenRecordModal : onToggleRecording}
            className={`px-2.5 py-1.5 text-xs font-mono font-bold border-2 border-black cursor-pointer shadow-[1px_1px_0px_#000000] flex items-center gap-1.5 transition-colors ${
              isRecording ? 'bg-black text-white' : 'bg-white hover:bg-neutral-100 text-black'
            }`}
            title={isRecording ? `Grabando: ${recordedCount} ejercicios. Clic para ver o exportar sesión` : "Activar grabación de sesión (Modo Récord)"}
          >
            <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-black animate-pulse' : 'bg-neutral-300 border border-black'}`} />
            <span>{isRecording ? `REC (${recordedCount})` : 'REC'}</span>
          </button>

          {/* Botón Reportar Ejercicio - Visible siempre */}
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className={`btn-ink-outline p-2 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-[1px_1px_0px_#000000] hover:bg-neutral-100 ${
              userNote.trim() ? 'bg-black text-white' : ''
            }`}
            title="Escribir nota y descargar reporte técnico de este ejercicio (JSON / Copiar)"
          >
            <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
          </button>

          {/* Rejilla 3D (Toggles 3D guidelines on/off) - Visible siempre */}
          <button
            onClick={() => setShowGrid((prev) => !prev)}
            className={`p-2 text-xs font-mono font-bold border-2 border-black transition-colors cursor-pointer shadow-[1px_1px_0px_#000000] ${
              showGrid ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-400 border-neutral-300 shadow-none'
            }`}
            title={showGrid ? 'Ocultar guías de perspectiva 3D' : 'Mostrar guías de perspectiva 3D'}
          >
            <Grid className="w-4 h-4 stroke-[2.2]" />
          </button>

          {/* BOTONES EXCLUSIVOS EN MODO DIBUJO: Ayudas 3D y Nuevo Ángulo (Desaparecen al corregir) */}
          {!evaluation && (
            <>
              <div className="w-[2px] h-6 bg-black mx-0.5" />

              {/* Botón de Ayudas 3D: 3 Fases (Off -> Línea gris punteada -> Vértices con dirección) */}
              <button
                onClick={() => {
                  setAidMode((prev) => {
                    if (prev === 'off') return 'line';
                    if (prev === 'line') return 'vertices';
                    return 'off';
                  });
                }}
                className={`p-2 text-xs font-mono font-bold border-2 border-black transition-all cursor-pointer shadow-[1px_1px_0px_#000000] flex items-center gap-1.5 ${
                  aidMode !== 'off'
                    ? 'bg-black text-white'
                    : 'bg-white text-neutral-600 hover:bg-neutral-100'
                }`}
                title="Ciclar ayudas 3D: Apagado → Línea gris punteada → Vértices con dirección"
              >
                {aidMode === 'off' && <EyeOff className="w-4 h-4 stroke-[2.2]" />}
                {aidMode === 'line' && <Eye className="w-4 h-4 stroke-[2.2]" />}
                {aidMode === 'vertices' && <Crosshair className="w-4 h-4 stroke-[2.5]" />}

                <span className="hidden sm:inline uppercase text-[10px] tracking-wider font-mono">
                  {aidMode === 'off' ? 'Ayuda: Off' : aidMode === 'line' ? 'Ayuda: Línea' : 'Ayuda: Vértices'}
                </span>
              </button>

              {/* Nuevo Ángulo */}
              <button
                onClick={() => loadNewChallenge(currentRound)}
                className="btn-ink-outline p-2 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-[1px_1px_0px_#000000] hover:bg-neutral-100"
                title="Generar otro ángulo o perspectiva 3D"
              >
                <RotateCcw className="w-4 h-4 stroke-[2.2]" />
                <span className="hidden md:inline uppercase text-[10px] tracking-wider font-mono">
                  Nuevo Ángulo
                </span>
              </button>
            </>
          )}

          {/* Botón Principal: Submit (cuando se dibuja) o Next con porcentaje (tras evaluar, idéntico a Práctica) */}
          {evaluation ? (
            <div className="flex items-center gap-1.5 shrink-0 ml-1">
              <div className="flex items-center gap-1 border-2 border-black bg-neutral-100 px-2.5 py-1.5 font-mono text-xs font-bold shadow-[1px_1px_0px_#000000] shrink-0">
                {evaluation.passed ? (
                  <CheckCircle className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                )}
                <span>{Math.round(evaluation.score)}%</span>
              </div>
              <button
                onClick={handleSubmitOrNext}
                className="btn-ink px-3 sm:px-4 py-2 text-xs font-mono uppercase font-bold flex items-center gap-1 cursor-pointer shadow-[2px_2px_0px_#000000] shrink-0"
                title="Siguiente ejercicio (Enter)"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSubmitOrNext}
              disabled={strokes.length === 0}
              className="btn-ink px-3.5 sm:px-5 py-2 text-xs font-mono uppercase font-bold disabled:opacity-30 cursor-pointer shadow-[2px_2px_0px_#000000] flex items-center gap-1.5 shrink-0 ml-1"
              title="Comprobar perspectiva (Enter)"
            >
              <span>Comprobar</span>
              <Check className="w-4 h-4 stroke-[3]" />
            </button>
          )}
        </div>
      </div>

      {/* 6. MODAL DE RESUMEN FINAL TRAS COMPLETAR 8 RONDAS */}
      {isSessionComplete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card-ink bg-white p-6 sm:p-8 max-w-md w-full text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-amber-400 border-2 border-black mx-auto flex items-center justify-center shadow-[3px_3px_0px_#000000] mb-4">
              <Trophy className="w-8 h-8 text-black stroke-[2.5]" />
            </div>

            <span className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-500">
              Sesión 3D Completada
            </span>
            <h2 className="text-2xl sm:text-3xl font-display font-black mt-1">¡Perspectiva Dominada!</h2>

            <div className="my-6 bg-neutral-50 border-2 border-black p-4 shadow-[2px_2px_0px_#000000]">
              <div className="text-xs font-mono text-neutral-600 uppercase font-bold">Puntuación Media</div>
              <div className="text-4xl font-mono font-black mt-1 text-black">
                {averageScore} <span className="text-lg font-sans text-neutral-500">%</span>
              </div>

              {/* Récord por rondas */}
              <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-neutral-300 text-xs font-mono">
                {sessionScores.map((sc, idx) => (
                  <div key={idx} className="bg-white border-2 border-black p-1 shadow-[1px_1px_0px_#000000]">
                    <div className="text-[10px] text-neutral-500 font-bold">R{idx + 1}</div>
                    <div className="font-black">{sc.toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRestartSession}
                className="btn-ink flex-1 py-3 text-sm font-mono font-bold uppercase flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_#000000]"
              >
                <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                <span>Jugar Otra Vez</span>
              </button>

              {onExit && (
                <button
                  onClick={onExit}
                  className="btn-ink-outline px-4 py-3 text-sm font-mono font-bold uppercase cursor-pointer shadow-[3px_3px_0px_#000000]"
                >
                  Salir
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL DE REPORTE Y DIAGNÓSTICO 3D CON NOTAS */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white border-4 border-black p-4 sm:p-5 max-w-lg w-full shadow-[8px_8px_0px_#000000] flex flex-col gap-3 max-h-[92vh] overflow-y-auto">
            {/* Cabecera */}
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-black stroke-[2.5]" />
                <h3 className="font-display font-bold text-sm sm:text-base uppercase tracking-tight">
                  Reporte de Perspectiva 3D
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="p-1 hover:bg-neutral-100 border border-black cursor-pointer shadow-[1px_1px_0px_#000000]"
                title="Cerrar modal (Esc)"
              >
                <X className="w-4 h-4 text-black stroke-[2.5]" />
              </button>
            </div>

            {/* Metadatos del reto */}
            <div className="flex items-center justify-between text-xs font-mono bg-neutral-50 p-2 border border-black">
              <div>
                <span className="text-neutral-500">Forma:</span> <strong>{challenge.name}</strong>
              </div>
              <div>
                <span className="text-neutral-500">Semilla:</span> <strong>#{challenge.seed}</strong>
              </div>
              <div>
                <span className="text-neutral-500">Nota:</span>{' '}
                <strong>{evaluation ? `${Math.round(evaluation.score)}% (${evaluation.passed ? 'Aprobado ✓' : 'No Superado'})` : 'Calculada'}</strong>
              </div>
            </div>

            {/* Campo de Nota / Explicación del problema */}
            <div className="flex flex-col gap-1.5 bg-neutral-50 p-3 border-2 border-black">
              <label className="text-xs font-mono font-bold text-black flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Nota o apreciación del ejercicio:</span>
                </span>
                <span className="text-[10px] text-neutral-500 font-normal hidden sm:inline">
                  (Se incluirá en el archivo .JSON y en el texto copiado)
                </span>
              </label>
              <textarea
                value={userNote}
                onChange={(e) => {
                  const nextVal = e.target.value;
                  setUserNote(nextVal);
                  if (currentRecordIdRef.current && onUpdateRecordComment) {
                    onUpdateRecordComment(currentRecordIdRef.current, nextVal);
                  }
                }}
                placeholder="Escribe aquí qué ocurrió (ej: 'El punto de fuga Z se percibe forzado', 'Trazo curvado no detectado', 'Buena orientación pero nota baja')..."
                className="w-full h-20 p-2 text-xs font-mono bg-white border border-black resize-none focus:outline-none focus:ring-2 focus:ring-black selection:bg-black selection:text-white"
                autoFocus
              />
              <div className="flex flex-wrap gap-1 items-center pt-0.5">
                <span className="text-[10px] font-mono text-neutral-500 font-bold mr-1">Rápido:</span>
                {['Nota injusta', 'Punto de fuga desalineado', 'Trazo no detectado', 'Fallo de proporción', 'Buena sensación'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const nextVal = userNote.trim() ? `${userNote.trim()} · ${tag}` : tag;
                      setUserNote(nextVal);
                      if (currentRecordIdRef.current && onUpdateRecordComment) {
                        onUpdateRecordComment(currentRecordIdRef.current, nextVal);
                      }
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
                      if (currentRecordIdRef.current && onUpdateRecordComment) {
                        onUpdateRecordComment(currentRecordIdRef.current, '');
                      }
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
                    downloadReport3DJson(currentReport.jsonString, challenge.seed, challenge.type, userNote);
                    setDownloadedReport(true);
                    setTimeout(() => setDownloadedReport(false), 2500);
                  }}
                  className="btn-ink px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
                  title="Descargar archivo .JSON incluyendo tu nota"
                >
                  {downloadedReport ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Download className="w-3.5 h-3.5" />}
                  <span>{downloadedReport ? '¡Descargado!' : 'Descargar JSON'}</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await copyReport3DToClipboard(currentReport.markdownText);
                    setCopiedReport(true);
                    setTimeout(() => setCopiedReport(false), 2500);
                  }}
                  className="btn-ink-outline px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
                  title="Copiar texto con tu nota al portapapeles"
                >
                  {copiedReport ? <Check className="w-3.5 h-3.5 text-black stroke-[2.5]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedReport ? '¡Copiado!' : 'Copiar Texto'}</span>
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
};
