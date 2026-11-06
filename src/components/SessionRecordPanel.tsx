import React, { useState } from 'react';
import {
  SessionRecordItem,
  MAX_SESSION_RECORDS,
  updateSessionRecordComment,
  deleteSessionRecord,
  clearSessionRecords,
  copyConsolidatedMarkdown,
  downloadConsolidatedJson,
} from '../lib/sessionRecorder';
import {
  Copy,
  Download,
  Trash2,
  Check,
  MessageSquare,
  MessageSquarePlus,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Edit2,
  Radio,
  Info,
  AlertTriangle,
} from 'lucide-react';

interface SessionRecordPanelProps {
  records: SessionRecordItem[];
  onRecordsChange: (records: SessionRecordItem[]) => void;
  onClearRecords: () => void;
  isRecording?: boolean;
  onToggleRecording?: () => void;
  onClose?: () => void;
}

export const SessionRecordPanel: React.FC<SessionRecordPanelProps> = ({
  records,
  onRecordsChange,
  onClearRecords,
  isRecording = false,
  onToggleRecording,
  onClose,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [copiedBatch, setCopiedBatch] = useState<boolean>(false);
  const [downloadedBatch, setDownloadedBatch] = useState<boolean>(false);
  const [copiedSingleId, setCopiedSingleId] = useState<string | null>(null);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  const totalExercises = records.length;
  const avgScore =
    totalExercises > 0
      ? Math.round(records.reduce((sum, r) => sum + r.score, 0) / totalExercises)
      : 0;
  const passedCount = records.filter((r) => r.passed).length;
  const commentedCount = records.filter((r) => r.userComment && r.userComment.trim().length > 0).length;

  const handleStartEdit = (record: SessionRecordItem) => {
    setEditingId(record.id);
    setEditingText(record.userComment || '');
  };

  const handleSaveEdit = (recordId: string) => {
    const updated = updateSessionRecordComment(recordId, editingText, records);
    onRecordsChange(updated);
    setEditingId(null);
    setEditingText('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const handleDeleteItem = (recordId: string) => {
    const updated = deleteSessionRecord(recordId, records);
    onRecordsChange(updated);
  };

  const handleCopyBatch = async () => {
    const ok = await copyConsolidatedMarkdown(records);
    if (ok) {
      setCopiedBatch(true);
      setTimeout(() => setCopiedBatch(false), 2500);
    }
  };

  const handleDownloadBatch = () => {
    downloadConsolidatedJson(records);
    setDownloadedBatch(true);
    setTimeout(() => setDownloadedBatch(false), 2500);
  };

  const handleCopySingle = async (record: SessionRecordItem) => {
    const textToCopy = record.userComment
      ? `### NOTA DEL USUARIO:\n> ${record.userComment}\n\n${record.reportMarkdown}`
      : record.reportMarkdown;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedSingleId(record.id);
      setTimeout(() => setCopiedSingleId(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full border-2 border-black bg-white shadow-[3px_3px_0px_#000000] font-sans text-xs">
      {/* 1. ENCABEZADO Y CONTROL DE GRABACIÓN */}
      <div className="p-3 border-b-2 border-black bg-neutral-50">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 border border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#000000] ${
                isRecording ? 'bg-black text-white' : 'bg-neutral-200 text-black'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-xs uppercase tracking-tight text-black">
                  Modo Récord
                </span>
                <span
                  className={`px-1.5 py-0.2 border border-black font-mono font-bold text-[9px] uppercase shadow-[1px_1px_0px_#000000] flex items-center gap-1 ${
                    isRecording ? 'bg-black text-white' : 'bg-white text-neutral-600'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isRecording ? 'bg-red-500 animate-pulse' : 'bg-neutral-400'
                    }`}
                  />
                  {isRecording ? (totalExercises >= MAX_SESSION_RECORDS ? `REC (${totalExercises}/${MAX_SESSION_RECORDS} MÁX)` : `REC (${totalExercises})`) : 'PAUSADO'}
                </span>
              </div>
              <span className="text-[10px] text-neutral-500 font-mono block">
                Sesión temporal en memoria
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onToggleRecording && (
              <button
                type="button"
                onClick={onToggleRecording}
                className={`px-2 py-1 border border-black text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer shadow-[1px_1px_0px_#000000] transition-colors ${
                  isRecording
                    ? 'bg-neutral-200 hover:bg-neutral-300 text-black'
                    : 'bg-black hover:bg-neutral-800 text-white'
                }`}
                title={isRecording ? 'Pausar grabación' : 'Activar grabación'}
              >
                <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-600' : 'bg-white'}`} />
                <span>{isRecording ? 'Pausar' : 'Grabar'}</span>
              </button>
            )}

            {totalExercises > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('¿Deseas vaciar todos los ejercicios registrados de esta sesión?')) {
                    clearSessionRecords();
                    onClearRecords();
                  }
                }}
                className="p-1.5 border border-black text-neutral-500 hover:text-black hover:bg-neutral-200 transition-colors cursor-pointer shadow-[1px_1px_0px_#000000]"
                title="Vaciar registro de sesión"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 border border-black hover:bg-neutral-200 cursor-pointer shadow-[1px_1px_0px_#000000]"
                title="Cerrar panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Resumen rápido de métricas */}
        {totalExercises > 0 ? (
          <div className="grid grid-cols-3 gap-1.5 bg-white border border-black p-2 font-mono text-[10px] shadow-[1px_1px_0px_#000000]">
            <div className="text-center">
              <span className="text-neutral-500 block text-[9px] uppercase">Media</span>
              <span className="font-bold text-xs text-black">{avgScore}%</span>
            </div>
            <div className="text-center border-x border-neutral-200">
              <span className="text-neutral-500 block text-[9px] uppercase">Superados</span>
              <span className="font-bold text-xs text-black">
                {passedCount}/{totalExercises}
              </span>
            </div>
            <div className="text-center">
              <span className="text-neutral-500 block text-[9px] uppercase">Con Nota</span>
              <span className="font-bold text-xs text-black">{commentedCount}</span>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-dashed border-neutral-300 p-2.5 text-center text-[10px] text-neutral-600 font-sans">
            {isRecording
              ? '🔴 Grabación activa: cada ejercicio que dibujes y compruebes se guardará aquí automáticamente. ¡Dibuja tranquilamente!'
              : 'Pulsa el botón "Grabar" para activar el Modo Récord. Cuando acabes, expórtalos todos juntos sin ir uno a uno.'}
          </div>
        )}

        {/* Nota informativa de límite y no-persistencia al reiniciar */}
        <div className="mt-2 text-[9px] font-mono text-neutral-500 flex items-center justify-between gap-1 flex-wrap">
          <div className="flex items-center gap-1">
            <Info className="w-3 h-3 shrink-0" />
            <span>La sesión se limpia automáticamente si recargas la web sin exportar.</span>
          </div>
          <span className="font-bold text-neutral-700 shrink-0">
            {totalExercises}/{MAX_SESSION_RECORDS} máx
          </span>
        </div>

        {/* Banner de advertencia si se alcanza el máximo */}
        {totalExercises >= MAX_SESSION_RECORDS && (
          <div className="mt-2 bg-amber-50 border border-amber-600 text-amber-950 p-2 font-mono text-[10px] flex items-start gap-1.5 shadow-[1px_1px_0px_#b45309]">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">¡Límite máximo alcanzado ({MAX_SESSION_RECORDS} ejercicios)!</span>
              <span>Los nuevos ejercicios reemplazarán a los más antiguos. Te recomendamos copiar o descargar tu sesión ahora.</span>
            </div>
          </div>
        )}

        {/* Botones de Exportación Consolidada */}
        {totalExercises > 0 && (
          <div className="grid grid-cols-2 gap-1.5 mt-2.5">
            <button
              type="button"
              onClick={handleCopyBatch}
              className="btn-ink py-2 text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-[1px_1px_0px_#000000]"
              title="Copiar reporte Markdown completo con todos los ejercicios y comentarios"
            >
              {copiedBatch ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>¡Copiado Todo!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Exportar Sesión</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadBatch}
              className="btn-ink-outline py-2 text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-[1px_1px_0px_#000000]"
              title="Descargar archivo JSON con todos los ejercicios y notas"
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
        )}
      </div>

      {/* 2. LISTA DE EJERCICIOS REGISTRADOS */}
      <div className="p-2 space-y-2 max-h-[480px] overflow-y-auto">
        {records.length === 0 ? (
          <div className="p-6 text-center text-neutral-400 font-mono text-[11px]">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-neutral-300 stroke-[1.5]" />
            <p className="font-bold text-neutral-600 mb-1">Sin ejercicios en esta sesión</p>
            <p className="text-[10px] text-neutral-500 font-sans">
              {isRecording
                ? 'Dibuja en El Camino, Práctica o Lab 3D para que tus ejercicios aparezcan aquí.'
                : 'Activa la grabación (REC) para empezar a guardar tus ejercicios.'}
            </p>
          </div>
        ) : (
          records.map((item, index) => {
            const isEditing = editingId === item.id;
            const isExpandedReport = expandedReportId === item.id;
            const itemNumber = totalExercises - index;

            return (
              <div
                key={item.id}
                className="bg-white border-2 border-black p-2.5 shadow-[2px_2px_0px_#000000] font-sans"
              >
                {/* Cabecera del ítem */}
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-[9px] text-neutral-500 font-bold shrink-0">
                      #{itemNumber}
                    </span>
                    <span className="font-mono text-[10px] font-bold bg-black text-white px-1.5 py-0.2 shrink-0">
                      {item.nodeCode}
                    </span>
                    <span className="font-bold text-[11px] truncate text-black" title={item.nodeTitle}>
                      {item.nodeTitle}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[9px] font-mono text-neutral-400 mr-1">
                      {item.displayTime}
                    </span>
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.2 border ${
                        item.passed
                          ? 'border-black bg-neutral-100 text-black'
                          : 'border-neutral-400 text-neutral-600 bg-neutral-50'
                      }`}
                    >
                      {item.score}%
                    </span>
                  </div>
                </div>

                {/* Subinfo y métricas */}
                <div className="text-[10px] text-neutral-500 font-mono mb-2 flex items-center justify-between flex-wrap gap-1">
                  <span>
                    Semilla #{item.seed} {item.phase ? `· Fase ${item.phase}` : ''}
                  </span>
                  {item.metricsSummary && (
                    <span className="text-neutral-600 text-[9px] truncate max-w-[200px]" title={item.metricsSummary}>
                      {item.metricsSummary}
                    </span>
                  )}
                </div>

                {/* Zona de Comentario del Usuario */}
                {isEditing ? (
                  <div className="border border-black bg-neutral-50 p-2 mb-2">
                    <label className="block text-[9px] font-mono uppercase font-bold text-black mb-1">
                      Comentario para el ejercicio #{itemNumber} [{item.nodeCode}]:
                    </label>
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      placeholder="Ej: El trazo se torció al final, la velocidad fue lenta..."
                      className="w-full text-xs font-mono p-1.5 border border-black bg-white outline-none resize-none h-16 shadow-[1px_1px_0px_#000000]"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-1.5 mt-1.5">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-2 py-1 text-[10px] font-mono font-bold border border-black bg-white hover:bg-neutral-100 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(item.id)}
                        className="px-2 py-1 text-[10px] font-mono font-bold border border-black bg-black text-white hover:bg-neutral-800 cursor-pointer shadow-[1px_1px_0px_#000000]"
                      >
                        Guardar Nota
                      </button>
                    </div>
                  </div>
                ) : item.userComment && item.userComment.trim().length > 0 ? (
                  <div className="border-l-2 border-black bg-neutral-50 p-2 mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[9px] font-mono uppercase font-bold text-neutral-500 block mb-0.5 flex items-center gap-1">
                        <MessageSquare className="w-2.5 h-2.5" />
                        <span>Tu comentario:</span>
                      </span>
                      <p className="text-[11px] font-mono text-black whitespace-pre-wrap break-words">
                        "{item.userComment}"
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      className="p-1 text-neutral-400 hover:text-black shrink-0 cursor-pointer"
                      title="Editar comentario"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartEdit(item)}
                    className="w-full py-1 px-2 border border-dashed border-neutral-300 hover:border-black text-neutral-500 hover:text-black text-[10px] font-mono flex items-center justify-center gap-1.5 mb-2 transition-colors cursor-pointer bg-neutral-50 hover:bg-white"
                  >
                    <MessageSquarePlus className="w-3 h-3" />
                    <span>+ Añadir comentario a este ejercicio</span>
                  </button>
                )}

                {/* Vista previa desplegable del reporte técnico individual */}
                {isExpandedReport && (
                  <div className="border border-black bg-neutral-900 text-neutral-100 p-2 font-mono text-[9px] mb-2 max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {item.reportMarkdown}
                  </div>
                )}

                {/* Barra de acciones del ítem */}
                <div className="flex items-center justify-between pt-1 border-t border-neutral-200 text-[10px] font-mono">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setExpandedReportId(isExpandedReport ? null : item.id)}
                      className="text-neutral-500 hover:text-black flex items-center gap-1 px-1 py-0.5 cursor-pointer"
                    >
                      {isExpandedReport ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      <span>{isExpandedReport ? 'Ocultar diagnóstico' : 'Ver diagnóstico'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopySingle(item)}
                      className="p-1 border border-black hover:bg-neutral-100 cursor-pointer shadow-[1px_1px_0px_#000000]"
                      title="Copiar reporte individual de este ejercicio"
                    >
                      {copiedSingleId === item.id ? (
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 text-neutral-400 hover:text-black cursor-pointer"
                      title="Eliminar del registro de sesión"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
