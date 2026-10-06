import React from 'react';
import { LessonNode } from '../lib/curriculumData';
import { Trophy, ArrowRight, RotateCcw, Check, Sparkles, Map } from 'lucide-react';

export interface LevelCompletionModalProps {
  isOpen: boolean;
  completedNode: LessonNode;
  nextNode: LessonNode | null;
  score: number;
  onGoToNextNode: () => void;
  onStayAndPractice: () => void;
  onGoToCamino?: () => void;
}

export const LevelCompletionModal: React.FC<LevelCompletionModalProps> = ({
  isOpen,
  completedNode,
  nextNode,
  score,
  onGoToNextNode,
  onStayAndPractice,
  onGoToCamino,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-mono select-none">
      <div className="max-w-md w-full bg-white border-3 border-black p-5 sm:p-6 shadow-[8px_8px_0px_#000000] relative">
        {/* Banner superior negro con icono trofeo */}
        <div className="bg-black text-white px-3 py-1.5 text-center text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 mb-4 border border-black shadow-[2px_2px_0px_#000000]">
          <Trophy className="w-4 h-4 text-white" />
          <span>¡DOMINIO TOTAL ALCANZADO!</span>
          <Sparkles className="w-4 h-4 text-white" />
        </div>

        {/* Título del ejercicio y código */}
        <div className="text-center space-y-1 mb-4">
          <div className="inline-block px-2.5 py-0.5 bg-neutral-100 border border-black text-xs font-bold">
            {completedNode.code}
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-display text-black">
            {completedNode.title}
          </h2>
          <p className="text-xs text-neutral-600">
            Precisión consolidada: <strong className="text-black font-bold">{score}%</strong> · 3/3 aciertos seguidos
          </p>
        </div>

        {/* Lista visual de las 3 fases biomecánicas dominadas */}
        <div className="p-3 bg-neutral-50 border-2 border-black shadow-[2px_2px_0px_#000000] space-y-2 mb-5">
          <div className="text-[11px] font-bold uppercase text-neutral-500 tracking-wider">
            Fases Biomecánicas Superadas:
          </div>
          <div className="flex items-center gap-2.5 text-xs">
            <span className="w-5 h-5 bg-black text-white flex items-center justify-center font-bold text-[10px] shrink-0 border border-black">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </span>
            <span>
              <strong>Fase 1: Precisión</strong> — Control y fijación milimétrica de extremos
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-xs">
            <span className="w-5 h-5 bg-black text-white flex items-center justify-center font-bold text-[10px] shrink-0 border border-black">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </span>
            <span>
              <strong>Fase 2: Fluidez</strong> — Trazado continuo, homogéneo y sin titubeos
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-xs">
            <span className="w-5 h-5 bg-black text-white flex items-center justify-center font-bold text-[10px] shrink-0 border border-black">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </span>
            <span>
              <strong>Fase 3: Velocidad</strong> — Automatización refleja e inercia decidida
            </span>
          </div>
        </div>

        {/* Pregunta clara */}
        <p className="text-center text-xs font-bold uppercase text-neutral-900 mb-3 tracking-wide">
          ¿Qué prefieres hacer ahora?
        </p>

        {/* Botones de acción */}
        <div className="flex flex-col gap-2">
          {nextNode ? (
            <button
              type="button"
              onClick={onGoToNextNode}
              className="w-full btn-ink py-2.5 px-4 text-xs font-bold uppercase flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_#000000] hover:bg-neutral-900"
            >
              <span>Pasar al siguiente nivel ({nextNode.code})</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          ) : (
            onGoToCamino && (
              <button
                type="button"
                onClick={onGoToCamino}
                className="w-full btn-ink py-2.5 px-4 text-xs font-bold uppercase flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_#000000] hover:bg-neutral-900"
              >
                <span>Ver mapa en El Camino</span>
                <Map className="w-4 h-4 stroke-[3]" />
              </button>
            )
          )}

          <button
            type="button"
            onClick={onStayAndPractice}
            className="w-full btn-ink-outline py-2 px-4 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-[2px_2px_0px_#000000] hover:bg-neutral-100"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Seguir practicando este nivel</span>
          </button>
        </div>
      </div>
    </div>
  );
};
