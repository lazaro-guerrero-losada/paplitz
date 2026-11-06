import React from 'react';
import { LessonNode } from '../lib/curriculumData';
import { MinigameLiveStats } from './CubeMinigamePractice';
import {
  Gamepad2,
  Clock,
  Heart,
  Flame,
  Trophy,
  RotateCcw,
  Hourglass,
  Zap,
  Map,
} from 'lucide-react';

export interface MinigameSidebarPanelProps {
  mode: 'blitz' | 'fever' | 'survival' | 'sprint' | 'ghost' | 'rush';
  lesson?: LessonNode;
  liveStats: MinigameLiveStats | null;
  onRestart?: () => void;
  onSwitchMinigame: () => void;
  onBackToPractice: () => void;
}

export const MinigameSidebarPanel: React.FC<MinigameSidebarPanelProps> = ({
  mode,
  lesson,
  liveStats,
  onRestart,
  onSwitchMinigame,
  onBackToPractice,
}) => {
  const getModeTitle = () => {
    switch (mode) {
      case 'fever':
        return 'Fiebre de Tiempo';
      case 'blitz':
        return 'Cubo Blitz 60s';
      case 'survival':
        return 'Supervivencia';
      case 'sprint':
        return 'Sprint 5 Cubos';
      case 'ghost':
        return 'Trazo Fantasma';
      case 'rush':
        return 'Calistenia Rush';
      default:
        return 'Minijuego Arcade';
    }
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'fever':
        return <Hourglass className="w-4 h-4 stroke-[2.5]" />;
      case 'blitz':
        return <Clock className="w-4 h-4 stroke-[2.5]" />;
      case 'survival':
        return <Heart className="w-4 h-4 stroke-[2.5]" />;
      case 'sprint':
        return <Zap className="w-4 h-4 stroke-[2.5]" />;
      case 'ghost':
        return <Flame className="w-4 h-4 stroke-[2.5]" />;
      case 'rush':
        return <Zap className="w-4 h-4 stroke-[2.5]" />;
      default:
        return <Gamepad2 className="w-4 h-4 stroke-[2.5]" />;
    }
  };

  return (
    <div className="space-y-3 font-mono text-xs select-none">
      {/* Cabecera del Minijuego */}
      <div className="card-ink bg-white p-3 border-2 border-black shadow-[3px_3px_0px_#000000]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] uppercase font-bold tracking-widest bg-black text-white px-1.5 py-0.5">
            MODO ARCADE
          </span>
          <span className="text-[10px] font-bold text-neutral-500">
            {lesson ? `Nivel ${lesson.code}` : 'Entrenamiento'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 border-2 border-black flex items-center justify-center bg-neutral-100 shadow-[1px_1px_0px_#000000]">
            {getModeIcon()}
          </div>
          <div>
            <h3 className="text-base font-bold font-display leading-tight">{getModeTitle()}</h3>
            <span className="text-[10px] text-neutral-600 block truncate max-w-[200px]">
              {lesson?.title || 'Perspectiva y Motricidad'}
            </span>
          </div>
        </div>
      </div>

      {/* Estadísticas en vivo */}
      {liveStats && (
        <div className="border-2 border-black bg-neutral-50 p-2.5 shadow-[2px_2px_0px_#000000] space-y-2">
          <div className="text-[10px] font-bold uppercase text-neutral-500 border-b border-black/20 pb-1 flex items-center justify-between">
            <span>Estado de la Partida</span>
            <span className="text-neutral-400">En curso</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            {/* Reloj o Cronómetro */}
            <div className="bg-white border border-black p-1.5">
              <span className="text-[9px] text-neutral-500 uppercase block">
                {mode === 'sprint' ? 'Tiempo' : 'Restante'}
              </span>
              <span
                className={`text-lg font-black tabular-nums leading-tight ${
                  (mode === 'blitz' && liveStats.timerValue <= 10) ||
                  (mode === 'fever' && liveStats.timerValue <= 6)
                    ? 'text-red-600 animate-pulse'
                    : 'text-black'
                }`}
              >
                {liveStats.timerValue.toFixed(1)}s
              </span>
            </div>

            {/* Aprobados / Vidas */}
            <div className="bg-white border border-black p-1.5">
              <span className="text-[9px] text-neutral-500 uppercase block">
                {mode === 'survival' ? 'Vidas' : 'Aprobados'}
              </span>
              {mode === 'survival' ? (
                <div className="flex items-center justify-center gap-1 mt-1">
                  {[1, 2, 3].map((h) => (
                    <Heart
                      key={h}
                      className={`w-4 h-4 ${
                        h <= liveStats.survivalLives
                          ? 'fill-black text-black stroke-[2]'
                          : 'fill-none text-neutral-300 stroke-[1.5]'
                      }`}
                    />
                  ))}
                </div>
              ) : (
                <span className="text-lg font-black leading-tight">
                  {mode === 'sprint' ? `${liveStats.cubesCompleted}/5` : liveStats.cubesCompleted}
                </span>
              )}
            </div>
          </div>

          {/* Racha / Estrellas */}
          <div className="flex items-center justify-between text-[11px] bg-white border border-black px-2 py-1">
            <span className="text-neutral-600 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" />
              Racha Combo:
            </span>
            <span className="font-bold">{liveStats.streakCombo} seguidos</span>
          </div>

          {/* Récord guardado */}
          <div className="flex items-center justify-between text-[11px] bg-white border border-black px-2 py-1">
            <span className="text-neutral-600 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" />
              Mejor Récord:
            </span>
            <span className="font-bold">
              {liveStats.highScore > 0
                ? mode === 'sprint'
                  ? `${liveStats.highScore.toFixed(1)}s`
                  : `${liveStats.highScore} ${mode === 'survival' ? 'combo' : 'cubos'}`
                : '—'}
            </span>
          </div>
        </div>
      )}

      {/* Reglas resumidas */}
      <div className="border border-black bg-white p-2.5 space-y-1">
        <span className="text-[10px] font-bold uppercase text-neutral-700 block">Reglas del Modo:</span>
        <p className="text-[10px] text-neutral-600 leading-relaxed font-sans">
          {mode === 'fever' && (
            <>
              Arrancas con 25s. Cada cubo aprobado suma <strong>+8s</strong>. Los cubos con estrella{' '}
              <strong>(★)</strong> suman <strong>+20s</strong>. Deshacer penaliza -2s.
            </>
          )}
          {mode === 'blitz' && (
            <>
              60 segundos puros. Cada cubo aprobado suma <strong>+1</strong>. Los fallos penalizan{' '}
              <strong>-3s</strong>.
            </>
          )}
          {mode === 'survival' && (
            <>
              3 vidas máximas. Tienes <strong>20s</strong> por cubo. Cada fallo o tiempo agotado cuesta{' '}
              <strong>1 corazón</strong>.
            </>
          )}
          {mode === 'sprint' && (
            <>
              Time attack contra reloj. Completa <strong>5 cubos aprobados</strong> en el menor tiempo
              posible.
            </>
          )}
          {mode === 'ghost' && (
            <>
              Entrena la sincronía motriz y memoria muscular calzando el trazo fantasma guía.
            </>
          )}
          {mode === 'rush' && (
            <>
              Supera las líneas en cascada con trazos ágiles y precisos antes de que colapsen el
              lienzo.
            </>
          )}
        </p>
      </div>

      {/* Botones de acción */}
      <div className="space-y-1.5 pt-1">
        {onRestart && (
          <button
            type="button"
            onClick={onRestart}
            className="btn-ink w-full py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reiniciar Partida</span>
          </button>
        )}

        <button
          type="button"
          onClick={onSwitchMinigame}
          className="btn-ink-outline w-full py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-[1px_1px_0px_#000000] hover:bg-neutral-100"
        >
          <Gamepad2 className="w-3.5 h-3.5" />
          <span>Cambiar Minijuego</span>
        </button>

        <button
          type="button"
          onClick={onBackToPractice}
          className="w-full py-1.5 text-xs font-bold text-neutral-600 hover:text-black flex items-center justify-center gap-1 cursor-pointer hover:underline"
        >
          <Map className="w-3 h-3" />
          <span>Volver a El Camino</span>
        </button>
      </div>
    </div>
  );
};
