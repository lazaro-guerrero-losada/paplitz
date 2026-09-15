import React, { useState, useMemo } from 'react';
import { SheetScanResult, ScannedCellResult } from '../lib/sheetScanner';
import { LessonNode } from '../lib/curriculumData';
import { generateCubeChallenge, clampRayToBox, Point2D } from '../lib/geometry';
import { generateCorrectionReportPDF } from '../lib/pdfGenerator';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Layers,
  Grid,
  Sliders,
  ExternalLink,
  X,
  RotateCcw,
  Move,
  Download,
  Loader2,
} from 'lucide-react';

interface AnalogDetailedViewProps {
  scanResult: SheetScanResult;
  lesson: LessonNode;
  onClose: () => void;
  onPracticeChallenge?: (lesson: LessonNode, seed: number) => void;
}

type ViewMode = 'overlay' | 'scan-only' | 'ideal-only';

/**
 * Celda individual de la matriz 3x4 en gran formato.
 * Dimensionada en proporción 57:58 para encuadrar exactamente el recuadro físico de la lámina A4.
 */
const DetailedMatrixCell: React.FC<{
  cell: ScannedCellResult;
  lesson: LessonNode;
  viewMode: ViewMode;
  overlayOpacity: number;
  showHorizon: boolean;
  showAxes: boolean;
  calibOffsetX: number;
  calibOffsetY: number;
  calibScale: number;
  onPractice?: (seed: number) => void;
}> = ({
  cell,
  lesson,
  viewMode,
  overlayOpacity,
  showHorizon,
  showAxes,
  calibOffsetX,
  calibOffsetY,
  calibScale,
  onPractice,
}) => {
  const challenge = useMemo(() => {
    return generateCubeChallenge(cell.seed, 300, 300, {
      mode: lesson.perspectiveMode,
      axesMode: lesson.axesMode,
      forceSide: lesson.forceSide,
      isShadowLevel: lesson.isShadowLevel,
      hasGroundGrid: lesson.hasGroundGrid,
    });
  }, [cell.seed, lesson]);

  // viewBox 0 0 570 580 (57 mm ancho x 58 mm alto del recuadro físico de la casilla)
  // Centro exacto y escala registrados mediante correlación multiescala 1:1
  const cx = (cell.calibCx || 285) + calibOffsetX;
  const cy = (cell.calibCy || 310) + calibOffsetY;
  const effectiveScale = (cell.calibScale || 1.368) * calibScale;

  const toSvg = (p: Point2D) => ({
    x: cx + (p.x - 150) * effectiveScale,
    y: cy + (p.y - 150) * effectiveScale,
  });

  const horizonYSvg = cy + (challenge.horizonY - 150) * effectiveScale;

  const givenPts = challenge.givenFace.vertices
    .map((idx) => {
      const pt = toSvg(challenge.vertices2D[idx]);
      return `${pt.x},${pt.y}`;
    })
    .join(' ');

  return (
    <div className="card-ink bg-white p-3.5 sm:p-4 flex flex-col justify-between border-3 border-black shadow-[4px_4px_0px_#000000]">
      {/* Cabecera de la casilla */}
      <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-xs sm:text-sm bg-neutral-100 border border-black px-1.5 py-0.5">
            [C-{cell.cellIndex.toString().padStart(2, '0')}]
          </span>
          <span className="text-[10px] font-mono text-neutral-500 font-bold">
            ID:#{cell.seed}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {cell.score >= 80 ? (
            <span className="bg-black text-white text-[11px] font-mono font-bold px-2 py-0.5 flex items-center gap-1 shadow-[1px_1px_0px_#000000]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{cell.score}% · APROBADO</span>
            </span>
          ) : cell.score === 0 ? (
            <span className="bg-white text-black border-2 border-black text-[11px] font-mono font-bold px-2 py-0.5 flex items-center gap-1 shadow-[1px_1px_0px_#000000]">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>0% · INCOMPLETO</span>
            </span>
          ) : (
            <span className="bg-white text-black border-2 border-black text-[11px] font-mono font-bold px-2 py-0.5 flex items-center gap-1 shadow-[1px_1px_0px_#000000]">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{cell.score}% · NO SUPERADO</span>
            </span>
          )}
        </div>
      </div>

      {/* Contenedor del Recuadro Físico (57:58 -> coincide con los 57mm x 58mm impresos) */}
      <div className="relative w-full aspect-[57/58] bg-white border-2 border-black overflow-hidden shadow-[2px_2px_0px_#000000]">
        {/* Capa 1: Recorte milimétrico del recuadro escaneado */}
        {viewMode !== 'ideal-only' && cell.croppedImageUrl && (
          <img
            src={cell.croppedImageUrl}
            alt={`Recuadro Casilla ${cell.cellIndex}`}
            className="absolute inset-0 w-full h-full object-cover select-none"
            style={{ opacity: viewMode === 'overlay' ? 0.94 : 1 }}
          />
        )}

        {/* Capa 2: Overlay vectorial de corrección geométrica acoplado al recuadro */}
        {viewMode !== 'scan-only' && (
          <svg
            viewBox="0 0 570 580"
            className="absolute inset-0 w-full h-full pointer-events-none select-none"
            style={{ opacity: viewMode === 'overlay' ? overlayOpacity : 1 }}
          >

            {/* 1. Línea de horizonte técnica (LH) */}
            {showHorizon && (
              <g>
                <line
                  x1="5"
                  y1={horizonYSvg}
                  x2="565"
                  y2={horizonYSvg}
                  stroke="#444444"
                  strokeWidth="1.6"
                  strokeDasharray="6 4"
                />
                <text
                  x="15"
                  y={horizonYSvg - 4}
                  fill="#444444"
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  LH (LÍNEA DE HORIZONTE)
                </text>
              </g>
            )}

            {/* 2. Ejes de coordenadas rayados X, Y, Z si aplican */}
            {showAxes &&
              challenge.axes &&
              challenge.axes.map((axis) => {
                const ox = cx + (axis.origin.x - 150) * effectiveScale;
                const oy = cy + (axis.origin.y - 150) * effectiveScale;
                const rawFx = cx + (axis.farPoint.x - 150) * effectiveScale;
                const rawFy = cy + (axis.farPoint.y - 150) * effectiveScale;
                const pFar = clampRayToBox(
                  ox,
                  oy,
                  rawFx,
                  rawFy,
                  { left: 20, right: 550, top: 25, bottom: 555 },
                  16
                );
                const fx = pFar.x;
                const fy = pFar.y;
                const theta = Math.atan2(fy - oy, fx - ox);
                const aSz = 9;
                return (
                  <g key={axis.id}>
                    <line
                      x1={ox}
                      y1={oy}
                      x2={fx}
                      y2={fy}
                      stroke="#222"
                      strokeWidth="1.8"
                      strokeDasharray="6 4"
                    />
                    <line
                      x1={fx}
                      y1={fy}
                      x2={fx - aSz * Math.cos(theta - Math.PI / 6)}
                      y2={fy - aSz * Math.sin(theta - Math.PI / 6)}
                      stroke="#222"
                      strokeWidth="1.8"
                    />
                    <line
                      x1={fx}
                      y1={fy}
                      x2={fx - aSz * Math.cos(theta + Math.PI / 6)}
                      y2={fy - aSz * Math.sin(theta + Math.PI / 6)}
                      stroke="#222"
                      strokeWidth="1.8"
                    />
                    <text
                      x={fx + Math.cos(theta) * 14}
                      y={fy + Math.sin(theta) * 14 + 4}
                      textAnchor="middle"
                      fontSize="13"
                      fontWeight="bold"
                      fontFamily="monospace"
                      fill="#000"
                    >
                      {axis.label}
                    </text>
                  </g>
                );
              })}

            {/* 3. Cara dada inicial (4 aristas iniciales en negro técnico para verificar alineación perfecta) */}
            <g>
              <polygon
                points={givenPts}
                fill={viewMode === 'ideal-only' ? '#F0F0F0' : 'none'}
                stroke="#000000"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              {challenge.givenFace.vertices.map((idx) => {
                const pt = toSvg(challenge.vertices2D[idx]);
                return <circle key={idx} cx={pt.x} cy={pt.y} r="4.5" fill="#000000" />;
              })}
            </g>

            {/* 4. Aristas objetivo ideales de corrección (5 aristas restantes en rojo discontinuo con resalte blanco) */}
            {challenge.targetEdges.map((edge, eIdx) => {
              const p1 = toSvg(challenge.vertices2D[edge.start]);
              const p2 = toSvg(challenge.vertices2D[edge.end]);
              return (
                <g key={eIdx}>
                  {/* Resalte blanco de contraste para que la línea roja sea ultra legible sobre el grafito */}
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="#FFFFFF"
                    strokeWidth="6"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                  {/* Trazo rojo técnico de la arista ideal esperada */}
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="#DC2626"
                    strokeWidth="3.5"
                    strokeDasharray="9 6"
                    strokeLinecap="round"
                  />
                </g>
              );
            })}

            {/* 5. Vértices objetivo esperados marcados con aros rojos */}
            {Object.values(challenge.targetVertices2D).map((p, vIdx) => {
              const pt = toSvg(p);
              return (
                <g key={vIdx}>
                  <circle cx={pt.x} cy={pt.y} r="7" fill="#FFFFFF" stroke="#DC2626" strokeWidth="2.5" />
                  <circle cx={pt.x} cy={pt.y} r="2.5" fill="#DC2626" />
                </g>
              );
            })}
          </svg>
        )}

        {/* Indicador de modo en la esquina inferior */}
        <div className="absolute bottom-1.5 left-1.5 bg-black text-white text-[9px] font-mono font-bold px-2 py-0.5 pointer-events-none uppercase">
          {viewMode === 'overlay'
            ? 'Superposición: Recuadro + Solución 3D (9 Aristas)'
            : viewMode === 'scan-only'
            ? 'Tu dibujo escaneado'
            : 'Solución geométrica 3D Completa'}
        </div>
      </div>

      {/* Desglose didáctico y corrección técnica */}
      <div className="mt-3 bg-neutral-50 border-2 border-black p-2.5 flex flex-col gap-1 text-xs">
        <div className="font-bold font-display text-[12px] leading-tight text-black flex items-start gap-1.5">
          <span>{cell.message}</span>
        </div>

        {cell.tip && (
          <p className="text-[11px] font-sans text-neutral-600 leading-normal mt-0.5">
            <strong className="text-black font-mono uppercase text-[10px]">Corrección: </strong>
            {cell.tip}
          </p>
        )}

        <div className="flex items-center justify-between border-t border-neutral-300 pt-2 mt-1 font-mono text-[10px] text-neutral-600">
          <span>
            Aristas detectadas: <strong>{cell.detectedStrokesCount}/{cell.targetEdgesCount || 5}</strong>
            {cell.missingEdgesCount > 0 && (
              <span className="font-bold ml-1 text-black bg-neutral-200 border border-black px-1 py-0.2">
                (Faltan {cell.missingEdgesCount} aristas)
              </span>
            )}
          </span>
          {onPractice && (
            <button
              onClick={() => onPractice(cell.seed)}
              className="text-black font-bold uppercase hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Practicar en pantalla</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const AnalogDetailedView: React.FC<AnalogDetailedViewProps> = ({
  scanResult,
  lesson,
  onClose,
  onPracticeChallenge,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('overlay');
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.92);
  const [showHorizon, setShowHorizon] = useState<boolean>(true);
  const [showAxes, setShowAxes] = useState<boolean>(true);

  // Micro-calibrador interactivo para compensar distorsión óptica de cámara o ángulo de foto
  const [calibOffsetX, setCalibOffsetX] = useState<number>(0);
  const [calibOffsetY, setCalibOffsetY] = useState<number>(0);
  const [calibScale, setCalibScale] = useState<number>(1.0);
  const [showCalibrator, setShowCalibrator] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);

  const activeLessonCode = scanResult.detectedLessonCode || lesson.code;
  const activeSeed = scanResult.detectedSeed || 101;

  const resetCalibration = () => {
    setCalibOffsetX(0);
    setCalibOffsetY(0);
    setCalibScale(1.0);
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      await generateCorrectionReportPDF({
        scanResult,
        lesson,
        calibOffsetX,
        calibOffsetY,
        calibScale,
        showHorizon,
        showAxes,
      });
    } catch (err) {
      console.error('Error al generar el PDF de corrección:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-neutral-900/85 backdrop-blur-xs flex flex-col items-center justify-start p-2 sm:p-4 overflow-hidden">
      {/* Ventana principal max-w-7xl con estilo neo-brutalista oficial Paplitz */}
      <div className="w-full max-w-[1440px] h-full max-h-[96vh] bg-white border-4 border-black shadow-[8px_8px_0px_#000000] flex flex-col overflow-hidden">
        {/* BARRA SUPERIOR */}
        <div className="bg-white border-b-3 border-black p-3 sm:px-6 sm:py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="btn-ink-outline px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
              title="Volver a la vista previa de la hoja"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al Resumen</span>
            </button>

            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl uppercase tracking-tight leading-tight">
                VISTA DETALLADA DE CORRECCIÓN — HOJA A4
              </h2>
              <div className="text-[11px] font-mono text-neutral-600 flex items-center gap-2 flex-wrap">
                <span>Lección {activeLessonCode} · {lesson.title}</span>
                <span>•</span>
                <span>Serie #{activeSeed}</span>
                <span>•</span>
                <span className="font-bold text-black">12 Casillas (Matriz 3×4)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Botón Descargar PDF de Correcciones */}
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="btn-ink px-3.5 py-1.5 text-xs font-mono uppercase font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000] disabled:opacity-50"
              title="Descargar documento PDF con las correcciones completas sobre tu documento"
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generando PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Descargar PDF</span>
                </>
              )}
            </button>

            <div className="text-right pl-1">
              <div className="text-2xl font-bold font-display leading-none">
                {scanResult.overallScore}%
              </div>
              <div className="text-[9px] font-mono uppercase text-neutral-500 font-bold">
                Nota Media
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 border-2 border-black hover:bg-neutral-100 font-bold cursor-pointer shadow-[2px_2px_0px_#000000]"
              title="Cerrar vista detallada"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BARRA DE HERRAMIENTAS Y CONTROLES DIDÁCTICOS */}
        <div className="bg-neutral-50 border-b-2 border-black p-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Selector de modo de vista */}
          <div className="flex items-center gap-1 bg-white border-2 border-black p-0.5 shadow-[2px_2px_0px_#000000]">
            <button
              onClick={() => setViewMode('overlay')}
              className={`px-3 py-1 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === 'overlay' ? 'bg-black text-white' : 'text-black hover:bg-neutral-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Superposición de Corrección</span>
            </button>

            <button
              onClick={() => setViewMode('scan-only')}
              className={`px-3 py-1 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === 'scan-only' ? 'bg-black text-white' : 'text-black hover:bg-neutral-100'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Solo Mi Escaneo</span>
            </button>

            <button
              onClick={() => setViewMode('ideal-only')}
              className={`px-3 py-1 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === 'ideal-only' ? 'bg-black text-white' : 'text-black hover:bg-neutral-100'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Solo Solución Ideal 3D</span>
            </button>
          </div>

          {/* Opciones y Guías Didácticas */}
          <div className="flex items-center gap-3 flex-wrap text-xs font-mono">
            {viewMode === 'overlay' && (
              <div className="flex items-center gap-2 bg-white border border-black px-2.5 py-1">
                <Sliders className="w-3.5 h-3.5 text-neutral-500" />
                <span className="text-[11px] font-bold">Opacidad Guías:</span>
                <input
                  type="range"
                  min="0.3"
                  max="1.0"
                  step="0.05"
                  value={overlayOpacity}
                  onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                  className="w-20 accent-black cursor-pointer"
                />
                <span className="text-[10px] tabular-nums font-bold">
                  {Math.round(overlayOpacity * 100)}%
                </span>
              </div>
            )}

            <label className="flex items-center gap-1.5 bg-white border border-black px-2.5 py-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showHorizon}
                onChange={(e) => setShowHorizon(e.target.checked)}
                className="accent-black cursor-pointer"
              />
              <span className="text-[11px] font-bold">Línea de Horizonte (LH)</span>
            </label>

            <label className="flex items-center gap-1.5 bg-white border border-black px-2.5 py-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showAxes}
                onChange={(e) => setShowAxes(e.target.checked)}
                className="accent-black cursor-pointer"
              />
              <span className="text-[11px] font-bold">Ejes Guía (X, Y, Z)</span>
            </label>

            {/* Botón para alternar micro-calibrador */}
            <button
              onClick={() => setShowCalibrator(!showCalibrator)}
              className={`px-2.5 py-1 border border-black font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                showCalibrator || calibOffsetX !== 0 || calibOffsetY !== 0 || calibScale !== 1.0
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
              title="Ajustar manualmente el encuadre si la cámara de tu móvil tiene distorsión de lente"
            >
              <Move className="w-3.5 h-3.5" />
              <span>Ajuste Fino</span>
              {(calibOffsetX !== 0 || calibOffsetY !== 0 || calibScale !== 1.0) && (
                <span className="text-[10px] font-bold ml-0.5">•</span>
              )}
            </button>
          </div>
        </div>

        {/* PANEL DESPLEGABLE DE AJUSTE FINO (MICRO-CALIBRADOR) */}
        {showCalibrator && (
          <div className="bg-neutral-100 border-b-2 border-black px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs font-mono shrink-0 animate-fadeIn">
            <div className="flex items-center gap-2 text-neutral-600">
              <Move className="w-4 h-4 text-black shrink-0" />
              <span>
                <strong>Calibrador de Lente:</strong> Si tu foto fue tomada con ángulo o curvatura, ajusta el desfase de las guías:
              </span>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5 bg-white border border-black px-2 py-1">
                <span className="font-bold text-[10px] text-neutral-500">X:</span>
                <input
                  type="range"
                  min="-35"
                  max="35"
                  step="1"
                  value={calibOffsetX}
                  onChange={(e) => setCalibOffsetX(parseInt(e.target.value))}
                  className="w-18 accent-black cursor-pointer"
                />
                <span className="w-8 tabular-nums font-bold text-[10px] text-right">
                  {calibOffsetX > 0 ? `+${calibOffsetX}` : calibOffsetX}px
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-white border border-black px-2 py-1">
                <span className="font-bold text-[10px] text-neutral-500">Y:</span>
                <input
                  type="range"
                  min="-35"
                  max="35"
                  step="1"
                  value={calibOffsetY}
                  onChange={(e) => setCalibOffsetY(parseInt(e.target.value))}
                  className="w-18 accent-black cursor-pointer"
                />
                <span className="w-8 tabular-nums font-bold text-[10px] text-right">
                  {calibOffsetY > 0 ? `+${calibOffsetY}` : calibOffsetY}px
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-white border border-black px-2 py-1">
                <span className="font-bold text-[10px] text-neutral-500">Zoom:</span>
                <input
                  type="range"
                  min="0.85"
                  max="1.15"
                  step="0.01"
                  value={calibScale}
                  onChange={(e) => setCalibScale(parseFloat(e.target.value))}
                  className="w-18 accent-black cursor-pointer"
                />
                <span className="w-10 tabular-nums font-bold text-[10px] text-right">
                  {Math.round(calibScale * 100)}%
                </span>
              </div>

              <button
                onClick={resetCalibration}
                className="btn-ink-outline px-2 py-1 text-[11px] flex items-center gap-1 cursor-pointer bg-white"
                title="Restablecer calibración a 0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restablecer</span>
              </button>
            </div>
          </div>
        )}

        {/* CONTENEDOR DE LA MATRIZ 3x4 CON SCROLL VERTICAL */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-neutral-100">
          <div className="max-w-[1360px] mx-auto">
            {/* Mensaje didáctico */}
            <div className="mb-4 bg-white border-2 border-black p-3 text-xs font-mono flex items-center justify-between gap-2 shadow-[2px_2px_0px_#000000]">
              <span className="text-neutral-800 flex items-center gap-2">
                <span className="bg-black text-white px-1.5 py-0.5 text-[9px] font-bold uppercase shrink-0">
                  INFO
                </span>
                <span>
                  <strong>Matriz 3×4 (12 Recuadros Encuadrados):</strong> Cada casilla está encuadrada directamente con su recuadro negro impreso en papel. Las líneas rojas discontinuas marcan la perspectiva ideal exterior.
                </span>
              </span>
              <span className="font-bold text-neutral-500 uppercase shrink-0 hidden md:inline">
                Scroll vertical activo ↓
              </span>
            </div>

            {/* Cuadrícula 3x4: 3 columnas en desktop / 4 filas hacia abajo con scroll */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
              {scanResult.cells.map((cell) => (
                <DetailedMatrixCell
                  key={cell.cellIndex}
                  cell={cell}
                  lesson={lesson}
                  viewMode={viewMode}
                  overlayOpacity={overlayOpacity}
                  showHorizon={showHorizon}
                  showAxes={showAxes}
                  calibOffsetX={calibOffsetX}
                  calibOffsetY={calibOffsetY}
                  calibScale={calibScale}
                  onPractice={
                    onPracticeChallenge
                      ? (seedToPractice) => {
                          onPracticeChallenge(lesson, seedToPractice);
                          onClose();
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
