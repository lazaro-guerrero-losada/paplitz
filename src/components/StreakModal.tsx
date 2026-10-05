import React, { useEffect } from 'react';
import { Flame, Sparkles, X, Trophy, Check } from 'lucide-react';
import { getStoredActiveDates, getStreakWeekTimeline } from '../lib/streakSystem';

interface StreakModalProps {
  streak: number;
  isOpen: boolean;
  onClose: () => void;
  isNewDayAward?: boolean;
}

export const StreakModal: React.FC<StreakModalProps> = ({
  streak,
  isOpen,
  onClose,
  isNewDayAward = false,
}) => {
  // Allow closing with Escape or Enter key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeDates = getStoredActiveDates();
  const timeline = getStreakWeekTimeline(activeDates, streak);

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

        {/* Animated big flame */}
        <div className="relative mb-3 mt-1">
          <div className="w-20 h-20 bg-black text-white rounded-3xl flex items-center justify-center border-4 border-black shadow-[6px_6px_0px_#000000] animate-bounce">
            <Flame className="w-10 h-10 fill-white stroke-[2.5] text-white animate-pulse" />
          </div>
          <div className="absolute -top-1.5 -right-2 bg-white text-black border-2 border-black rounded-full px-2 py-0.5 font-mono text-[11px] font-bold shadow-[2px_2px_0px_#000000] flex items-center gap-1">
            <Sparkles className="w-3 h-3 fill-black text-black" />
            <span>+{streak} {streak === 1 ? 'DÍA' : 'DÍAS'}</span>
          </div>
        </div>

        {/* Tag header */}
        <span className="text-[10px] font-mono uppercase tracking-widest bg-black text-white px-2.5 py-0.5 font-bold shadow-[2px_2px_0px_#000000]">
          {isNewDayAward ? '¡NUEVO DÍA ALCANZADO!' : 'ESTADO DE TU RACHA'}
        </span>

        {/* Title */}
        <h2 className="font-display font-black text-3xl sm:text-4xl mt-2 text-black leading-tight">
          {streak} {streak === 1 ? 'DÍA' : 'DÍAS'} EN RACHA
        </h2>

        {/* Subtitle */}
        <p className="text-xs text-neutral-600 font-sans mt-1 max-w-xs leading-relaxed">
          {isNewDayAward
            ? `¡Genial! Has alcanzado ${streak} ${
                streak === 1 ? 'día' : 'días seguidos'
              } practicando. La constancia diaria es el secreto del dibujo técnico.`
            : `Tienes una racha activa de ${streak} ${
                streak === 1 ? 'día' : 'días seguidos'
              }. Sigue practicando a diario para que no se apague la llama.`}
        </p>

        {/* Visual 7-day timeline strip */}
        <div className="w-full bg-neutral-50 border-2 border-black p-3.5 my-4 flex flex-col gap-2 shadow-[3px_3px_0px_#000000]">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-neutral-700">
            <span>Últimos 7 días:</span>
            <span className="text-black font-extrabold flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-black text-black" />
              <span>{streak} seguidos</span>
            </span>
          </div>

          {/* 7 Columns for the week */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 pt-1">
            {timeline.map((day) => (
              <div
                key={day.dateString}
                className="flex flex-col items-center gap-1"
              >
                <span className="text-[9px] font-mono font-bold text-neutral-500 uppercase">
                  {day.dayNameShort}
                </span>

                <div
                  className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${
                    day.isActive
                      ? day.isToday
                        ? 'bg-black text-white border-2 border-black shadow-[2px_2px_0px_#000000] ring-4 ring-black/15 animate-bounce'
                        : 'bg-black text-white border-2 border-black shadow-[2px_2px_0px_#000000]'
                      : 'bg-white text-neutral-300 border-2 border-dashed border-neutral-300'
                  }`}
                  title={`${day.dateString}: ${day.isActive ? 'Completado' : 'Sin actividad'}`}
                >
                  {day.isActive ? (
                    <Flame className="w-4 h-4 fill-white stroke-[2] text-white" />
                  ) : (
                    <span className="text-[10px] font-mono font-bold text-neutral-300">
                      {day.dayNumber}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[9px] font-mono ${
                    day.isToday
                      ? 'font-bold bg-black text-white px-1'
                      : 'text-neutral-400 font-medium'
                  }`}
                >
                  {day.isToday ? 'HOY' : day.dayNumber}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Milestone info */}
        <div className="w-full mb-3 flex items-center justify-center gap-1.5 text-[11px] font-mono text-neutral-600 bg-neutral-100 p-2 border border-neutral-300">
          <Trophy className="w-3.5 h-3.5 text-black stroke-[2.5]" />
          <span>
            {streak < 3
              ? `Meta próxima: 3 días seguidos (${3 - streak} más)`
              : streak < 7
              ? `Meta próxima: 7 días seguidos (${7 - streak} más para Racha Semanal)`
              : streak < 14
              ? `Meta próxima: 14 días (2 semanas seguidas)`
              : `¡Racha maestra de ${streak} días! Sigue manteniendo el ritmo.`}
          </span>
        </div>

        {/* Action button */}
        <button
          onClick={onClose}
          className="w-full btn-ink py-2.5 text-xs font-mono uppercase font-bold flex items-center justify-center gap-2 shadow-[3px_3px_0px_#000000] cursor-pointer hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px] transition-transform"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>¡A por el siguiente reto!</span>
        </button>
      </div>
    </div>
  );
};
