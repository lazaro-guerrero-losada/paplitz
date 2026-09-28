import React, { useEffect } from 'react';
import { LessonNode } from '../lib/curriculumData';
import { Unlock, Sparkles, ArrowRight, Map, X, Award } from 'lucide-react';

interface LevelUnlockedModalProps {
  unlockedNode: LessonNode;
  unitTitle?: string;
  onClose: () => void;
  onStartLevel: (node: LessonNode) => void;
  onViewPath: () => void;
}

export const LevelUnlockedModal: React.FC<LevelUnlockedModalProps> = ({
  unlockedNode,
  unitTitle,
  onClose,
  onStartLevel,
  onViewPath,
}) => {
  // Allow closing with Escape key or starting with Enter key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onStartLevel(unlockedNode);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [unlockedNode, onClose, onStartLevel]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white border-4 border-black p-5 sm:p-6 max-w-sm sm:max-w-md w-full shadow-[8px_8px_0px_#000000] flex flex-col items-center text-center relative animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-neutral-400 hover:text-black border border-transparent hover:border-black transition-colors cursor-pointer"
          title="Cerrar (Esc)"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Animated celebration icon */}
        <div className="relative mb-3 mt-1">
          <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center border-3 border-black shadow-[4px_4px_0px_#000000] animate-bounce">
            <Unlock className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="absolute -top-1 -right-2 bg-white text-black border-2 border-black rounded-full p-1 shadow-[2px_2px_0px_#000000] animate-pulse">
            <Sparkles className="w-4 h-4 fill-black text-black" />
          </div>
        </div>

        {/* Tag header */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-widest bg-black text-white px-2.5 py-0.5 font-bold shadow-[2px_2px_0px_#000000]">
            ¡NUEVO NIVEL DISPONIBLE!
          </span>
          <span className="text-[10px] font-mono uppercase font-bold text-neutral-500 hidden sm:inline">
            NEW LEVEL UNLOCKED
          </span>
        </div>

        {/* Title and code */}
        <h3 className="font-display font-extrabold text-2xl sm:text-3xl mt-2 text-black leading-tight">
          Nivel {unlockedNode.code}
        </h3>
        <div className="font-display font-bold text-base sm:text-lg text-neutral-800">
          {unlockedNode.title}
        </div>
        <p className="text-xs text-neutral-600 font-sans mt-1 max-w-xs leading-relaxed">
          {unlockedNode.subtitle}
        </p>

        {/* Level meta preview box */}
        <div className="w-full bg-neutral-50 border-2 border-black p-3 my-4 flex items-center justify-around font-mono text-xs shadow-[2px_2px_0px_#000000]">
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-neutral-500 uppercase font-bold">Dificultad</span>
            <span className="font-bold uppercase text-[11px]">
              {unlockedNode.difficulty === 'easy'
                ? 'Fácil'
                : unlockedNode.difficulty === 'medium'
                ? 'Media'
                : 'Avanzada'}
            </span>
          </div>
          <div className="w-px h-7 bg-neutral-300" />
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-neutral-500 uppercase font-bold">Recompensa</span>
            <span className="font-bold flex items-center gap-1 text-[11px]">
              <Award className="w-3 h-3 stroke-[2.5]" />
              <span>+{unlockedNode.xpReward} XP</span>
            </span>
          </div>
          {unitTitle && (
            <>
              <div className="w-px h-7 bg-neutral-300" />
              <div className="flex flex-col items-center max-w-[110px]">
                <span className="text-[9px] text-neutral-500 uppercase font-bold">Unidad</span>
                <span className="font-bold truncate text-[11px] w-full text-center" title={unitTitle}>
                  {unitTitle}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Primary Action Button: Play New Level */}
        <button
          onClick={() => onStartLevel(unlockedNode)}
          className="w-full btn-ink py-2.5 text-xs font-mono uppercase font-bold flex items-center justify-center gap-2 shadow-[3px_3px_0px_#000000] cursor-pointer hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px] transition-transform"
        >
          <span>Jugar Nivel {unlockedNode.code} Ahora</span>
          <ArrowRight className="w-4 h-4 stroke-[3]" />
        </button>

        {/* Secondary Buttons */}
        <div className="w-full flex items-center gap-2 mt-2">
          <button
            onClick={onViewPath}
            className="flex-1 btn-ink-outline py-2 text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
          >
            <Map className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Ver en Camino</span>
          </button>
          <button
            onClick={onClose}
            className="px-3 py-2 text-xs font-mono text-neutral-600 hover:text-black border border-neutral-300 hover:border-black cursor-pointer shadow-[1px_1px_0px_#000000] transition-colors"
          >
            Seguir practicando
          </button>
        </div>
      </div>
    </div>
  );
};
