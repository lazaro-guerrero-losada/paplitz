import React, { useState, useMemo } from 'react';
import { generateA4PracticeSheet, generateCorrectionReportPDF } from '../lib/pdfGenerator';
import { processScannedSheet, SheetScanResult } from '../lib/sheetScanner';
import { generateCubeChallenge, clampRayToBox } from '../lib/geometry';
import { Unit, LessonNode } from '../lib/curriculumData';
import { createSheetQRPayload, generateQRCodeSVGData } from '../lib/qrHelper';
import { Printer, Upload, CheckCircle2, AlertCircle, RefreshCw, QrCode, Eye, Download, Loader2 } from 'lucide-react';
import { AnalogDetailedView } from './AnalogDetailedView';

interface AnalogSheetsModalProps {
  onClose: () => void;
  units: Unit[];
  activeNode: LessonNode | null;
  onPracticeChallenge?: (lesson: LessonNode, seed: number) => void;
}

/** Marcador fiducial técnico de esquina (diana blanco y negro) */
const CornerFiducial: React.FC = () => (
  <div className="w-4 h-4 bg-black p-0.5 flex items-center justify-center shrink-0">
    <div className="w-2.5 h-2.5 bg-white flex items-center justify-center">
      <div className="w-1 h-1 bg-black" />
    </div>
  </div>
);

/** Celda individual de la vista previa de la hoja A4 */
const PreviewCell: React.FC<{ cellIdx: number; seed: number; lesson: LessonNode }> = ({
  cellIdx,
  seed,
  lesson,
}) => {
  const cellSeed = seed * 100 + cellIdx;
  const challenge = useMemo(() => {
    return generateCubeChallenge(cellSeed, 300, 300, {
      mode: lesson.perspectiveMode,
      axesMode: lesson.axesMode,
      forceSide: lesson.forceSide,
      isShadowLevel: lesson.isShadowLevel,
      hasGroundGrid: lesson.hasGroundGrid,
    });
  }, [cellSeed, lesson]);

  const scale = 0.65;
  const cx = 150;
  const cy = 150;
  const pts = challenge.givenFace.vertices
    .map((idx) => {
      const p = challenge.vertices2D[idx];
      return `${cx + (p.x - 150) * scale},${cy + (p.y - 150) * scale}`;
    })
    .join(' ');

  return (
    <div className="border border-black bg-white p-1 flex flex-col justify-between h-24 relative overflow-hidden">
      <div className="flex justify-between items-center text-[7px] font-mono font-bold leading-none px-1 pt-0.5">
        <span>[C-{cellIdx.toString().padStart(2, '0')}]</span>
        <span className="text-neutral-400 pr-1">ID:{cellSeed}</span>
      </div>
      <div className="w-full flex-1 flex items-center justify-center">
        <svg viewBox="0 0 300 300" className="w-full h-full max-h-18">
          {/* Ejes de coordenadas rayados X, Y, Z si la lección los incluye */}
          {challenge.axes &&
            challenge.axes.map((axis) => {
              const ox = cx + (axis.origin.x - 150) * scale;
              const oy = cy + (axis.origin.y - 150) * scale;
              const rawFx = cx + (axis.farPoint.x - 150) * scale;
              const rawFy = cy + (axis.farPoint.y - 150) * scale;
              const pFar = clampRayToBox(
                ox,
                oy,
                rawFx,
                rawFy,
                { left: 22, right: 278, top: 22, bottom: 278 },
                16
              );
              const fx = pFar.x;
              const fy = pFar.y;
              const theta = Math.atan2(fy - oy, fx - ox);
              const aSz = 7;
              return (
                <g key={axis.id}>
                  <line
                    x1={ox}
                    y1={oy}
                    x2={fx}
                    y2={fy}
                    stroke="#444"
                    strokeWidth="1.2"
                    strokeDasharray="4 3"
                  />
                  <line
                    x1={fx}
                    y1={fy}
                    x2={fx - aSz * Math.cos(theta - Math.PI / 6)}
                    y2={fy - aSz * Math.sin(theta - Math.PI / 6)}
                    stroke="#444"
                    strokeWidth="1.2"
                  />
                  <line
                    x1={fx}
                    y1={fy}
                    x2={fx - aSz * Math.cos(theta + Math.PI / 6)}
                    y2={fy - aSz * Math.sin(theta + Math.PI / 6)}
                    stroke="#444"
                    strokeWidth="1.2"
                  />
                  <text
                    x={fx + Math.cos(theta) * 11}
                    y={fy + Math.sin(theta) * 11 + 3}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="monospace"
                    fill="#000"
                  >
                    {axis.label}
                  </text>
                </g>
              );
            })}

          {/* Cara dada entintada */}
          <polygon points={pts} fill="#F7F7F7" stroke="#000000" strokeWidth="2.5" />

          {/* Vértices marcados con puntos */}
          {challenge.givenFace.vertices.map((idx) => {
            const p = challenge.vertices2D[idx];
            return (
              <circle
                key={idx}
                cx={cx + (p.x - 150) * scale}
                cy={cy + (p.y - 150) * scale}
                r="3"
                fill="#000000"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export const AnalogSheetsModal: React.FC<AnalogSheetsModalProps> = ({
  onClose,
  units,
  activeNode,
  onPracticeChallenge,
}) => {
  const [activeTab, setActiveTab] = useState<'print' | 'scan'>('print');
  const [seed, setSeed] = useState(101);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<SheetScanResult | null>(null);
  const [showDetailedView, setShowDetailedView] = useState<boolean>(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState<boolean>(false);

  const allNodes = useMemo(() => units.flatMap((u) => u.nodes), [units]);
  const unlockedNodes = useMemo(() => allNodes.filter((n) => n.status !== 'locked'), [allNodes]);

  // Nivel seleccionado por defecto: el último desbloqueado o el activo
  const [selectedLessonId, setSelectedLessonId] = useState<string>(() => {
    return activeNode?.id || (unlockedNodes.length > 0 ? unlockedNodes[unlockedNodes.length - 1].id : allNodes[0].id);
  });

  const selectedLesson = useMemo(() => {
    return allNodes.find((n) => n.id === selectedLessonId) || activeNode || allNodes[0];
  }, [allNodes, selectedLessonId, activeNode]);

  // Lección real detectada por el QR o la seleccionada
  const activeCorrectionLesson = useMemo(() => {
    if (scanResult?.detectedLessonCode) {
      return allNodes.find((n) => n.code === scanResult.detectedLessonCode) || selectedLesson;
    }
    return selectedLesson;
  }, [scanResult, allNodes, selectedLesson]);

  const handleDownloadCorrectionPDF = async () => {
    if (!scanResult) return;
    setIsDownloadingPDF(true);
    try {
      await generateCorrectionReportPDF({
        scanResult,
        lesson: activeCorrectionLesson,
      });
    } catch (err) {
      console.error('Error al generar el PDF de corrección:', err);
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  // Generar código QR vectorial para la vista previa en pantalla
  const qrPreviewData = useMemo(() => {
    const payload = createSheetQRPayload(selectedLesson.code, seed, 12);
    return generateQRCodeSVGData(payload);
  }, [selectedLesson.code, seed]);

  const handleDownloadPDF = () => {
    generateA4PracticeSheet({
      title: 'Hoja de Práctica Paplitz',
      moduleName: 'Paralelepípedos & Cajas',
      seed,
      gridRows: 4,
      gridCols: 3,
      lesson: selectedLesson,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const result = await processScannedSheet(file, seed);
      setScanResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="card-ink bg-white max-w-3xl w-full p-6 relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-neutral-100 border border-black cursor-pointer font-bold"
        >
          ✕
        </button>

        {/* Pestañas de Modo Analógico */}
        <div className="flex border-b-2 border-black mb-5 gap-2">
          <button
            onClick={() => setActiveTab('print')}
            className={`px-4 py-2 text-xs font-mono uppercase font-bold border-t-2 border-x-2 border-black transition-all cursor-pointer ${
              activeTab === 'print' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5" /> 1. Imprimir Hoja A4
            </span>
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`px-4 py-2 text-xs font-mono uppercase font-bold border-t-2 border-x-2 border-black transition-all cursor-pointer ${
              activeTab === 'scan' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> 2. Validar Escaneo / Foto
            </span>
          </button>
        </div>

        {activeTab === 'print' ? (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-xl font-bold font-display leading-tight">Impresión de Cuadrícula A4</h3>
                <p className="text-xs text-neutral-600 font-sans mt-0.5">
                  Previsualiza y genera la plantilla lista para imprimir en folio A4 tradicional con lápiz.
                </p>
              </div>
            </div>

            {/* Selector de Nivel y Aleatorizador */}
            <div className="card-ink p-3.5 mb-4 bg-neutral-50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-[220px]">
                <label className="text-[11px] font-mono font-bold uppercase block mb-1">
                  Nivel / Lección a Practicar:
                </label>
                <select
                  value={selectedLessonId}
                  onChange={(e) => setSelectedLessonId(e.target.value)}
                  className="w-full border-2 border-black px-2.5 py-1.5 text-xs font-mono font-bold bg-white shadow-[2px_2px_0px_#000000] cursor-pointer"
                >
                  {unlockedNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.code} · {n.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <div>
                  <label className="text-[11px] font-mono font-bold uppercase block mb-1">
                    Semilla #{seed}
                  </label>
                  <button
                    onClick={() => setSeed(Math.floor(Math.random() * 900) + 100)}
                    className="btn-ink-outline px-3 py-1.5 text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
                    title="Generar nueva combinación aleatoria de cubos"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Aleatorizar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* VISTA PREVIA INTERACTIVA DE LA HOJA A4 */}
            <div className="border-2 border-black bg-neutral-100 p-3 sm:p-5 mb-5 flex flex-col items-center max-h-[50vh] overflow-y-auto">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-500 mb-2">
                VISTA PREVIA REALISTA (A4 — 12 CASILLAS)
              </div>

              {/* Hoja blanca A4 */}
              <div className="w-full max-w-md bg-white border-2 border-black shadow-[4px_4px_0px_#000000] p-4 relative select-none">
                {/* 4 Dianas Fiduciales en las esquinas */}
                <div className="flex justify-between items-start mb-2">
                  <CornerFiducial />

                  {/* Cabecera con Logo Paplitz */}
                  <div className="flex items-center gap-2 flex-1 px-2.5 min-w-0">
                    <img src="/paplitz-logo.svg" alt="Paplitz" className="w-7 h-7 shrink-0" />
                    <div className="overflow-hidden flex-1">
                      <div className="font-display font-bold text-[11px] uppercase tracking-tight leading-none truncate">
                        PAPLITZ — ENTRENAMIENTO ANALÓGICO
                      </div>
                      <div className="text-[7.5px] font-mono text-neutral-600 mt-0.5 truncate">
                        LECCIÓN: {selectedLesson.code} · {selectedLesson.title} | #{seed}
                      </div>
                    </div>
                  </div>

                  {/* Micro Código QR Vectorial de Validación */}
                  <div className="flex flex-col items-center shrink-0 mr-2.5">
                    <svg
                      viewBox={`0 0 ${qrPreviewData.size} ${qrPreviewData.size}`}
                      className="w-6 h-6 bg-white border border-neutral-300 p-0.5 shadow-[1px_1px_0px_#000000]"
                      shapeRendering="crispEdges"
                    >
                      <rect width={qrPreviewData.size} height={qrPreviewData.size} fill="#ffffff" />
                      <path d={qrPreviewData.path} fill="#000000" />
                    </svg>
                    <span className="text-[5px] font-mono font-bold tracking-tighter text-neutral-500 uppercase mt-0.5">
                      QR VALID
                    </span>
                  </div>

                  <CornerFiducial />
                </div>

                {/* Línea divisoria */}
                <div className="border-b border-black mb-3" />

                {/* Cuadrícula de 12 casillas (3 cols x 4 rows) */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {Array.from({ length: 12 }, (_, i) => (
                    <PreviewCell
                      key={i}
                      cellIdx={i + 1}
                      seed={seed}
                      lesson={selectedLesson}
                    />
                  ))}
                </div>

                {/* Línea divisoria inferior y fiduciales inferiores */}
                <div className="border-b border-black mt-3 mb-2" />
                <div className="flex justify-between items-center">
                  <CornerFiducial />
                  <div className="text-[7.5px] font-mono text-neutral-500 uppercase tracking-wider">
                    PAPLITZ A4 · SERIE #{seed}
                  </div>
                  <CornerFiducial />
                </div>
              </div>
            </div>

            <button
              onClick={handleDownloadPDF}
              className="btn-ink w-full py-3 text-sm uppercase flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_#000000]"
            >
              <Printer className="w-4 h-4" />
              Descargar PDF A4 para Imprimir ({selectedLesson.code} · {selectedLesson.title})
            </button>
          </div>
        ) : (
          <div>
            <h3 className="text-xl font-bold font-display mb-2">Validar Hoja Realizada a Mano</h3>
            <p className="text-xs text-neutral-600 mb-6 font-sans">
              Sube una foto o escaneo de tu hoja A4. El algoritmo offline rectifica la perspectiva con las 4 esquinas y puntúa tus trazos de grafito.
            </p>

            <label className="card-ink p-8 mb-6 border-dashed border-2 border-black flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-50 transition-colors">
              <Upload className="w-10 h-10 mb-3 stroke-[1.5]" />
              <span className="text-xs font-mono font-bold uppercase">
                {isScanning ? 'Procesando y renderizando archivo (PDF o Imagen)...' : 'Seleccionar PDF escaneado o foto de la hoja'}
              </span>
              <span className="text-[10px] text-neutral-500 mt-1">PDF (escaneo de impresora o app), PNG, JPG o WEBP</span>
              <input
                type="file"
                accept="application/pdf,.pdf,image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isScanning}
              />
            </label>

            {scanResult && (
              <div className="card-ink p-4 mb-6 bg-white">
                {/* Vista previa de la hoja escaneada procesada (sea PDF o foto) */}
                {scanResult.processedImageUrl && (
                  <div className="mb-4 flex flex-col items-center border border-black bg-neutral-100 p-2 overflow-hidden">
                    <span className="text-[9px] font-mono text-neutral-500 uppercase font-bold self-start mb-1">
                      Hoja procesada:
                    </span>
                    <img
                      src={scanResult.processedImageUrl}
                      alt="Hoja procesada"
                      className="max-h-48 border border-neutral-300 shadow-[2px_2px_0px_#000000] object-contain"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4 gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {scanResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-black shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-black shrink-0" />
                    )}
                    <span className="font-mono text-xs font-bold">{scanResult.message}</span>
                    {scanResult.qrDetected && (
                      <span className="bg-black text-white text-[9px] font-mono px-2 py-0.5 font-bold uppercase tracking-wider flex items-center gap-1 shadow-[1px_1px_0px_#000000]">
                        <QrCode className="w-3 h-3" /> QR Leído
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xl font-bold font-display">{scanResult.overallScore}%</span>
                    <span className="block text-[9px] font-mono uppercase text-neutral-500">Nota Media</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {scanResult.cells.map((cell) => (
                    <button
                      key={cell.cellIndex}
                      onClick={() => setShowDetailedView(true)}
                      className="p-2 border border-black text-center bg-neutral-50 hover:bg-neutral-200 cursor-pointer transition-colors"
                      title="Ver corrección detallada en grande"
                    >
                      <div className="text-[10px] font-mono font-bold">Casilla #{cell.cellIndex}</div>
                      <div className="text-sm font-bold font-display">{cell.score}%</div>
                    </button>
                  ))}
                </div>

                {/* Acciones principales: Ver en detalle o Descargar PDF */}
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <button
                    onClick={() => setShowDetailedView(true)}
                    className="btn-ink flex-1 py-3 text-xs sm:text-sm font-mono uppercase font-bold flex items-center justify-center gap-2 shadow-[3px_3px_0px_#000000] cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Ver Hoja y Correcciones en Detalle</span>
                  </button>

                  <button
                    onClick={handleDownloadCorrectionPDF}
                    disabled={isDownloadingPDF}
                    className="btn-ink-outline py-3 px-4 text-xs sm:text-sm font-mono uppercase font-bold flex items-center justify-center gap-2 shadow-[3px_3px_0px_#000000] cursor-pointer bg-white disabled:opacity-50 shrink-0"
                    title="Descargar documento PDF oficial con la hoja corregida y el desglose didáctico"
                  >
                    {isDownloadingPDF ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generando...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Descargar PDF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vista Detallada de Correcciones en Matriz 3x4 con Lienzos Grandes y Scroll */}
      {showDetailedView && scanResult && (
        <AnalogDetailedView
          scanResult={scanResult}
          lesson={
            (scanResult.detectedLessonCode &&
              allNodes.find((n) => n.code === scanResult.detectedLessonCode)) ||
            selectedLesson
          }
          onClose={() => setShowDetailedView(false)}
          onPracticeChallenge={onPracticeChallenge}
        />
      )}
    </div>
  );
};

