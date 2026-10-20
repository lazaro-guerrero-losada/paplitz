import React from 'react';
import { LessonNode } from '../lib/curriculumData';
import { Trophy, ArrowRight, RotateCcw, Check, Sparkles, Map, Lock, Award } from 'lucide-react';

export interface LevelCompletionModalProps {
  isOpen: boolean;
  completedNode: LessonNode;
  nextNode: LessonNode | null;
  score: number;
  masteryLevel?: 1 | 2 | 3;
  unitGateNotice?: string | null;
  onGoToNextNode: () => void;
  onStayAndPractice: () => void;
  onAdvanceToNextPhase?: () => void;
  onGoToCamino?: () => void;
}

export const LevelCompletionModal: React.FC<LevelCompletionModalProps> = ({
  isOpen,
  completedNode,
  nextNode,
  score,
  masteryLevel = 1,
  unitGateNotice,
  onGoToNextNode,
  onStayAndPractice,
  onAdvanceToNextPhase,
  onGoToCamino,
}) => {
  if (!isOpen) return null;

  const isMaxMastery = masteryLevel === 3;
  const isMastery2 = masteryLevel === 2;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-mono select-none">
      <div className="max-w-md w-full bg-white border-3 border-black p-5 sm:p-6 shadow-[8px_8px_0px_#000000] relative">
        {/* Banner superior con estilo dinámico de maestría */}
        <div className={`px-3 py-1.5 text-center text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 mb-4 border border-black shadow-[2px_2px_0px_#000000] ${
          isMaxMastery
            ? 'bg-amber-400 text-black'
            : isMastery2
            ? 'bg-neutral-800 text-white'
            : 'bg-black text-white'
        }`}>
          {isMaxMastery ? (
            <>
              <Trophy className="w-4 h-4 text-black" />
              <span>¡CORONA DE ORO · MAESTRÍA 3!</span>
              <Sparkles className="w-4 h-4 text-black" />
            </>
          ) : isMastery2 ? (
            <>
              <Award className="w-4 h-4 text-amber-400" />
              <span>¡MAESTRÍA 2 CONSEGUIDA (PLATA)!</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </>
          ) : (
            <>
              <Check className="w-4 h-4 text-white stroke-[3]" />
              <span>¡NIVEL SUPERADO · MAESTRÍA 1!</span>
              <Sparkles className="w-4 h-4 text-white" />
            </>
          )}
        </div>

        {/* Título del ejercicio, código y estrellas */}
        <div className="text-center space-y-1 mb-3">
          <div className="inline-block px-2.5 py-0.5 bg-neutral-100 border border-black text-xs font-bold">
            {completedNode.code}
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-display text-black">
            {completedNode.title}
          </h2>

          {/* Visualización grande de estrellas de maestría */}
          <div className="flex items-center justify-center gap-2 pt-1 text-2xl tracking-widest">
            <span className={masteryLevel >= 1 ? 'text-amber-500 scale-110 drop-shadow' : 'text-neutral-300'}>★</span>
            <span className={masteryLevel >= 2 ? 'text-amber-500 scale-110 drop-shadow' : 'text-neutral-300'}>★</span>
            <span className={masteryLevel >= 3 ? 'text-amber-500 scale-110 drop-shadow' : 'text-neutral-300'}>★</span>
          </div>

          <p className="text-xs text-neutral-600 pt-1">
            Precisión registrada: <strong className="text-black font-bold">{score}%</strong> · 3/3 aciertos por versión
          </p>
        </div>

        {/* Lista visual de las 3 fases biomecánicas dominadas */}
        <div className="p-3 bg-neutral-50 border-2 border-black shadow-[2px_2px_0px_#000000] space-y-2 mb-4">
          <div className="text-[11px] font-bold uppercase text-neutral-500 tracking-wider">
            Fases Biomecánicas del Nivel:
          </div>
          <div className="flex items-center gap-2.5 text-xs">
            <span className="w-5 h-5 bg-black text-white flex items-center justify-center font-bold text-[10px] shrink-0 border border-black">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </span>
            <span>
              <strong>Fase 1: Precisión</strong> — Control y fijación milimétrica de dianas
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-xs">
            <span className={`w-5 h-5 flex items-center justify-center font-bold text-[10px] shrink-0 border border-black ${
              masteryLevel >= 2 ? 'bg-black text-white' : 'bg-neutral-200 text-neutral-400'
            }`}>
              {masteryLevel >= 2 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '2'}
            </span>
            <span className={masteryLevel >= 2 ? 'text-black' : 'text-neutral-500'}>
              <strong>Fase 2: Fluidez</strong> {masteryLevel >= 2 ? '— Trazo continuo y homogéneo' : '— Opcional (Desbloquea Maestría 2 ★★☆)'}
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-xs">
            <span className={`w-5 h-5 flex items-center justify-center font-bold text-[10px] shrink-0 border border-black ${
              masteryLevel >= 3 ? 'bg-amber-400 text-black' : 'bg-neutral-200 text-neutral-400'
            }`}>
              {masteryLevel >= 3 ? '👑' : '3'}
            </span>
            <span className={masteryLevel >= 3 ? 'text-black' : 'text-neutral-500'}>
              <strong>Fase 3: Velocidad</strong> {masteryLevel >= 3 ? '— Impulso balístico rápido dominado' : '— Opcional (Desbloquea Corona ★★★)'}
            </span>
          </div>
        </div>

        {/* Notificación de barrera de unidad si el siguiente nivel pertenece a una unidad bloqueada */}
        {unitGateNotice && (
          <div className="p-3 bg-amber-50 border-2 border-amber-600 text-amber-900 text-xs font-sans mb-4 shadow-[2px_2px_0px_#b45309]">
            <div className="font-bold flex items-center gap-1.5 mb-1 font-mono uppercase text-amber-800">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Barrera de Unidad 2</span>
            </div>
            <p className="leading-snug">{unitGateNotice}</p>
          </div>
        )}

        {/* Pregunta clara */}
        <p className="text-center text-xs font-bold uppercase text-neutral-900 mb-3 tracking-wide">
          ¿Qué prefieres hacer ahora?
        </p>

        {/* Botones de acción */}
        <div className="flex flex-col gap-2">
          {nextNode && !unitGateNotice ? (
            <button
              type="button"
              onClick={onGoToNextNode}
              className="w-full btn-ink py-2.5 px-4 text-xs font-bold uppercase flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_#000000] hover:bg-neutral-900"
            >
              <span>Avanzar al siguiente nivel ({nextNode.code})</span>
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

          {masteryLevel < 3 && onAdvanceToNextPhase && (
            <button
              type="button"
              onClick={onAdvanceToNextPhase}
              className="w-full bg-neutral-900 text-white hover:bg-black py-2.5 px-4 text-xs font-bold uppercase flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_#000000] transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Perfeccionar a Maestría {masteryLevel + 1} (Fase {masteryLevel + 1})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onStayAndPractice}
            className="w-full btn-ink-outline py-2 px-4 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-[2px_2px_0px_#000000] hover:bg-neutral-100"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Seguir practicando en esta fase</span>
          </button>
        </div>
      </div>
    </div>
  );
};
