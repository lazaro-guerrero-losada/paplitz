import React from 'react';
import { DailySetHistoryItem } from '../lib/dailyChallenge';
import { Award, Zap, CheckCircle2, X, Flame } from 'lucide-react';

interface DailySetCompletedModalProps {
  completedSet: DailySetHistoryItem;
  onClose: () => void;
  onViewHistory?: () => void;
}

export const DailySetCompletedModal: React.FC<DailySetCompletedModalProps> = ({
  completedSet,
  onClose,
  onViewHistory,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs font-sans animate-fade-in">
      <div className="relative w-full max-w-md bg-white border-2 sm:border-[3px] border-black shadow-[6px_6px_0px_#000000] p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        {/* Botón cerrar esquina */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 border border-black hover:bg-neutral-100 cursor-pointer shadow-[1px_1px_0px_#000000]"
          aria-label="Cerrar modal"
        >
          <X className="w-4 h-4 text-black stroke-[2.5]" />
        </button>

        {/* Encabezado con medalla/trofeo */}
        <div className="text-center mb-4 sm:mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 border-2 border-black bg-neutral-100 mb-2.5 shadow-[3px_3px_0px_#000000]">
            <Award className="w-8 h-8 text-black stroke-[2]" />
          </div>
          <span className="text-[10px] font-mono uppercase tracking-widest bg-black text-white px-2 py-0.5 font-bold inline-block mb-1">
            Hábito Diario Consolidado
          </span>
          <h2 className="text-xl sm:text-2xl font-display font-bold tracking-tight">
            ¡Reto Diario Completado!
          </h2>
          <p className="text-xs text-neutral-600 font-sans mt-1">
            Has completado tu sesión de {completedSet.totalCount} ejercicios, igual que una lámina A4 de taller.
          </p>
        </div>

        {/* Métricas destacadas */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="border-2 border-black p-2 text-center bg-neutral-50 shadow-[2px_2px_0px_#000000]">
            <span className="text-[9px] font-mono text-neutral-500 uppercase font-bold block">
              Nota Media
            </span>
            <span className="text-xl sm:text-2xl font-display font-bold">
              {completedSet.averageScore}%
            </span>
          </div>
          <div className="border-2 border-black p-2 text-center bg-neutral-50 shadow-[2px_2px_0px_#000000]">
            <span className="text-[9px] font-mono text-neutral-500 uppercase font-bold block">
              Superados
            </span>
            <span className="text-xl sm:text-2xl font-display font-bold">
              {completedSet.passedCount}/{completedSet.totalCount}
            </span>
          </div>
          <div className="border-2 border-black p-2 text-center bg-black text-white shadow-[2px_2px_0px_#000000]">
            <span className="text-[9px] font-mono text-neutral-300 uppercase font-bold block flex items-center justify-center gap-1">
              <Zap className="w-2.5 h-2.5 text-white" /> Bonus Hábito
            </span>
            <span className="text-xl sm:text-2xl font-display font-bold text-white">
              +50 XP
            </span>
          </div>
        </div>

        {/* Rejilla de notas individuales estilo Lámina A4 */}
        <div className="border-2 border-black p-3 bg-neutral-50 mb-4 shadow-[2px_2px_0px_#000000]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase font-bold text-black flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Calificación por Casilla ({completedSet.totalCount} Ejercicios)
            </span>
            <span className="text-[9px] font-mono text-neutral-500">
              {completedSet.levelMode === 'random' ? 'Aleatorio' : completedSet.levelSummary}
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
            {completedSet.marks.map((m) => (
              <div
                key={m.index}
                className={`p-1.5 text-center border font-mono ${
                  m.passed
                    ? 'border-2 border-black bg-white shadow-[1px_1px_0px_#000000]'
                    : 'border-black bg-neutral-200 text-neutral-600'
                }`}
                title={`Casilla #${m.index}: ${m.nodeCode} (${m.nodeTitle})`}
              >
                <div className="text-[8px] text-neutral-500 font-bold">#{m.index}</div>
                <div className="text-xs font-bold leading-tight">{m.score}%</div>
                <div className="text-[7px] text-neutral-500 truncate">{m.nodeCode}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Mensaje de motivación sobre el hábito diario */}
        <div className="bg-neutral-100 border border-black p-2.5 text-xs text-neutral-700 font-sans mb-4 flex items-center gap-2">
          <Flame className="w-4 h-4 text-black shrink-0 stroke-[2.5]" />
          <span>
            Hacer este lote de forma consistente cada día es la forma más rápida de dominar la perspectiva espacial.
          </span>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-2">
          {onViewHistory && (
            <button
              onClick={() => {
                onClose();
                onViewHistory();
              }}
              className="btn-ink-outline flex-1 py-2 text-xs font-mono font-bold uppercase cursor-pointer shadow-[2px_2px_0px_#000000]"
            >
              Ver Historial
            </button>
          )}
          <button
            onClick={onClose}
            className="btn-ink flex-1 py-2 text-xs font-mono font-bold uppercase cursor-pointer shadow-[2px_2px_0px_#000000]"
          >
            Aceptar & Continuar
          </button>
        </div>
      </div>
    </div>
  );
};
