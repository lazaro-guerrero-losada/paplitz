import React, { useState } from 'react';
import { AlertTriangle, Copy, Download, Check, X, Radio, ListFilter } from 'lucide-react';
import { SessionRecordItem, copyConsolidatedMarkdown, downloadConsolidatedJson } from '../lib/sessionRecorder';

interface SessionRecordLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  maxLimit: number;
  records: SessionRecordItem[];
  onOpenRecordPanel: () => void;
}

export const SessionRecordLimitModal: React.FC<SessionRecordLimitModalProps> = ({
  isOpen,
  onClose,
  maxLimit,
  records,
  onOpenRecordPanel,
}) => {
  const [copiedBatch, setCopiedBatch] = useState<boolean>(false);
  const [downloadedBatch, setDownloadedBatch] = useState<boolean>(false);

  if (!isOpen) return null;

  const totalExercises = records.length;
  const avgScore =
    totalExercises > 0
      ? Math.round(records.reduce((sum, r) => sum + r.score, 0) / totalExercises)
      : 0;
  const passedCount = records.filter((r) => r.passed).length;

  const handleCopy = async () => {
    const ok = await copyConsolidatedMarkdown(records);
    if (ok) {
      setCopiedBatch(true);
      setTimeout(() => setCopiedBatch(false), 2500);
    }
  };

  const handleDownload = () => {
    downloadConsolidatedJson(records);
    setDownloadedBatch(true);
    setTimeout(() => setDownloadedBatch(false), 2500);
  };

  const handleOpenPanelAndClose = () => {
    onClose();
    onOpenRecordPanel();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border-2 border-black shadow-[6px_6px_0px_#000000] max-w-md w-full p-4 sm:p-5 font-sans relative">
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 border border-black hover:bg-neutral-100 cursor-pointer shadow-[1px_1px_0px_#000000]"
          title="Cerrar aviso"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Encabezado con icono brutalista */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 border-2 border-black bg-amber-400 text-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000000]">
            <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-sm uppercase tracking-tight text-black">
                Límite de Grabación
              </span>
              <span className="px-1.5 py-0.2 border border-black bg-black text-white font-mono font-bold text-[9px] uppercase shadow-[1px_1px_0px_#000000] flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 text-red-400 animate-pulse" />
                REC MÁXIMO
              </span>
            </div>
            <span className="text-[10px] text-neutral-500 font-mono block">
              {maxLimit} de {maxLimit} ejercicios registrados
            </span>
          </div>
        </div>

        {/* Mensaje descriptivo */}
        <div className="text-xs text-neutral-800 space-y-2 mb-4 leading-relaxed">
          <p>
            Has alcanzado el límite máximo de <strong>{maxLimit} ejercicios</strong> guardados en esta sesión de Modo Récord.
          </p>
          <p className="text-[11px] text-neutral-600 bg-neutral-50 border border-neutral-300 p-2 font-mono">
            ℹ️ Para mantener la fluidez en el navegador, la sesión conserva hasta {maxLimit} ejercicios. Si sigues dibujando sin vaciar, los nuevos ejercicios reemplazarán a los más antiguos (conservando siempre los {maxLimit} más recientes).
          </p>
        </div>

        {/* Resumen rápido de la sesión */}
        <div className="grid grid-cols-3 gap-1.5 bg-neutral-100 border border-black p-2 font-mono text-[10px] mb-4 shadow-[1px_1px_0px_#000000]">
          <div className="text-center">
            <span className="text-neutral-500 block text-[9px] uppercase">Ejercicios</span>
            <span className="font-bold text-xs text-black">{totalExercises}</span>
          </div>
          <div className="text-center border-x border-neutral-300">
            <span className="text-neutral-500 block text-[9px] uppercase">Media</span>
            <span className="font-bold text-xs text-black">{avgScore}%</span>
          </div>
          <div className="text-center">
            <span className="text-neutral-500 block text-[9px] uppercase">Superados</span>
            <span className="font-bold text-xs text-black">{passedCount}</span>
          </div>
        </div>

        {/* Botones de acción rápida: Copiar, Descargar, Ver Panel */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="btn-ink py-2 px-2 text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
              title="Copiar todos los ejercicios en formato Markdown"
            >
              {copiedBatch ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Markdown</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="btn-ink-outline py-2 px-2 text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
              title="Descargar todos los ejercicios en un archivo JSON"
            >
              {downloadedBatch ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>¡Descargado!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar JSON</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleOpenPanelAndClose}
              className="py-1.5 px-2 text-[11px] font-mono font-bold border border-black bg-neutral-100 hover:bg-neutral-200 text-black flex items-center justify-center gap-1 cursor-pointer shadow-[1px_1px_0px_#000000]"
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Ver Lista Récord</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-1.5 px-2 text-[11px] font-mono font-bold border border-black bg-white hover:bg-neutral-100 text-black flex items-center justify-center cursor-pointer shadow-[1px_1px_0px_#000000]"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
