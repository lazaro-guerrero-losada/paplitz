import React, { useEffect } from 'react';
import { X, BookOpen, Zap, Gamepad2, Award, CheckCircle, Target, ArrowRight } from 'lucide-react';
import { calculatePlayerLevel } from '../lib/levelSystem';

interface LevelGuideModalProps {
  xp: number;
  completedNodesCount: number;
  totalNodesCount: number;
  onClose: () => void;
  onGoToPractice?: () => void;
  onGoToMinigames?: () => void;
}

export const LevelGuideModal: React.FC<LevelGuideModalProps> = ({
  xp,
  completedNodesCount,
  totalNodesCount,
  onClose,
  onGoToPractice,
  onGoToMinigames,
}) => {
  const levelInfo = calculatePlayerLevel(xp);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="bg-white border-4 border-black w-full max-w-2xl max-h-[90vh] flex flex-col shadow-[8px_8px_0px_#000000] animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* CABECERA DEL MODAL */}
        <div className="p-3 sm:p-4 border-b-2 border-black flex items-center justify-between bg-neutral-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center shadow-[2px_2px_0px_#000000]">
              <BookOpen className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono uppercase bg-black text-white px-1.5 py-0.2 font-bold tracking-wider">
                  MANUAL DEL SISTEMA
                </span>
                <span className="text-[10px] font-mono text-neutral-500 font-bold">
                  · PROGRESIÓN Y EXÁMENES
                </span>
              </div>
              <h2 className="text-xl font-bold font-display leading-tight">
                Guía de Niveles, XP y Exámenes
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[2px_2px_0px_#000000]"
            title="Cerrar (Esc)"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* CONTENIDO CON SCROLL INTERNO LIMPIO */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 font-sans text-xs sm:text-sm">
          {/* BARRA DE PROGRESO DEL JUGADOR EN VIVO */}
          <div className="border-2 border-black p-3.5 bg-neutral-50 shadow-[3px_3px_0px_#000000]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 font-mono">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-black text-white px-2 py-0.5 font-bold">
                  NIVEL {levelInfo.level}
                </span>
                <span className="font-bold text-sm text-black">{levelInfo.title}</span>
              </div>
              <div className="text-xs text-neutral-600 font-bold">
                <span className="text-black font-bold">{levelInfo.currentXp} XP</span>
                {levelInfo.xpRemaining > 0 ? (
                  <span> · Faltan {levelInfo.xpRemaining} XP para Nivel {levelInfo.level + 1}</span>
                ) : (
                  <span> · ¡Nivel Máximo Alcanzado!</span>
                )}
              </div>
            </div>

            {/* Barra gráfica */}
            <div className="w-full h-3 border-2 border-black bg-white overflow-hidden relative">
              <div
                className="h-full bg-black transition-all duration-300"
                style={{ width: `${levelInfo.progressPercent}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500 mt-1.5">
              <span>{levelInfo.xpInCurrentLevel} / {levelInfo.xpNeededForCurrentLevel} XP de este nivel</span>
              <span className="font-bold text-black">{levelInfo.progressPercent}% completado</span>
            </div>
          </div>

          {/* CUADRÍCULA 2 COLUMNAS DE EXPLICACIÓN CONCISA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* BLOQUE 1: ¿CÓMO PASAR DE NIVEL? */}
            <div className="border-2 border-black p-3 bg-white shadow-[2px_2px_0px_#000000]">
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-black">
                <Target className="w-4 h-4 stroke-[2.5]" />
                <h3 className="font-display font-bold text-xs uppercase tracking-wide">
                  1. ¿Cuántos cubos para pasar de nivel?
                </h3>
              </div>
              <ul className="space-y-1.5 text-xs text-neutral-700 font-sans">
                <li>
                  • <strong>En El Camino (1.1, 1.2...):</strong> Basta con <strong>1 solo cubo aprobado</strong> (nota &ge; 70%) para desbloquear de inmediato el siguiente nivel.
                </li>
                <li>
                  • <strong>En la Barra de Nivel (XP):</strong> Cada nivel requiere entre 100 y 300 XP. Como un cubo da entre 15 y 40 XP, subirás de nivel cada <strong>3 a 5 cubos bien hechos</strong>.
                </li>
              </ul>
            </div>

            {/* BLOQUE 2: BENEFICIOS DE LA PRÁCTICA */}
            <div className="border-2 border-black p-3 bg-white shadow-[2px_2px_0px_#000000]">
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-black">
                <Zap className="w-4 h-4 stroke-[2.5]" />
                <h3 className="font-display font-bold text-xs uppercase tracking-wide">
                  2. ¿Cómo beneficia la Práctica?
                </h3>
              </div>
              <ul className="space-y-1.5 text-xs text-neutral-700 font-sans">
                <li>
                  • <strong>XP Base:</strong> Cada cubo aprobado en Práctica te otorga la recompensa fija de la lección (<strong>+15 a +70 XP</strong>).
                </li>
                <li>
                  • <strong>Bonus de Rapidez:</strong> Resolver el cubo con agilidad suma hasta <strong>+10% de nota</strong> y más XP.
                </li>
                <li>
                  • <strong>Memoria Muscular:</strong> Cuenta con ejes asistidos y corrección milimétrica de fuga.
                </li>
              </ul>
            </div>

            {/* BLOQUE 3: BENEFICIOS DE LOS MINIJUEGOS */}
            <div className="border-2 border-black p-3 bg-white shadow-[2px_2px_0px_#000000]">
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-black">
                <Gamepad2 className="w-4 h-4 stroke-[2.5]" />
                <h3 className="font-display font-bold text-xs uppercase tracking-wide">
                  3. ¿Cómo benefician los Minijuegos?
                </h3>
              </div>
              <ul className="space-y-1.5 text-xs text-neutral-700 font-sans">
                <li>
                  • <strong>Acelerador de XP:</strong> Cada cubo aprobado en un minijuego te suma entre <strong>+20 y +25 XP directos</strong> a tu barra global.
                </li>
                <li>
                  • <strong>Cubos Estrella:</strong> En Fiebre de Tiempo, clavarlos suma <strong>+20s y +15 XP extra</strong>.
                </li>
                <li>
                  • <strong>Misma Barra:</strong> Todo lo que consigues en arcade llena tu barra de nivel al instante.
                </li>
              </ul>
            </div>

            {/* BLOQUE 4: LOS EXÁMENES DE NIVEL */}
            <div className="border-2 border-black p-3 bg-white shadow-[2px_2px_0px_#000000]">
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-black">
                <Award className="w-4 h-4 stroke-[2.5]" />
                <h3 className="font-display font-bold text-xs uppercase tracking-wide">
                  4. Exámenes de Nivel (Ej: 2.4)
                </h3>
              </div>
              <ul className="space-y-1.5 text-xs text-neutral-700 font-sans">
                <li>
                  • <strong>Sin asistencia:</strong> Cero ejes, cero líneas de ayuda. Debes fugar en el espacio vacío a mano alzada.
                </li>
                <li>
                  • <strong>Puerta de Unidad:</strong> Es obligatorio aprobar con <strong>&ge; 70%</strong> para desbloquear las unidades de perspectiva dinámica.
                </li>
                <li>
                  • <strong>Recompensa Mayor:</strong> Otorgan la mayor inyección de XP del juego (<strong>+60 a +70 XP</strong>).
                </li>
              </ul>
            </div>
          </div>

          {/* TARJETA RESUMEN TÉCNICA (SÍNTESIS ULTRA-CONCISA) */}
          <div className="border-2 border-black p-3 bg-neutral-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 stroke-[2.5] shrink-0" />
              <span>
                <strong>Regla de Oro:</strong> 1 cubo aprobado pasa de nivel en el camino; 3-5 cubos (en práctica o arcade) llenan la barra de XP.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <span className="font-bold bg-white border border-black px-2 py-0.5 text-[11px]">
                {completedNodesCount}/{totalNodesCount} lecciones
              </span>
            </div>
          </div>
        </div>

        {/* PIE DEL MODAL CON ACCIONES DIRECTAS */}
        <div className="p-3 border-t-2 border-black bg-neutral-50 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[10px] font-mono text-neutral-500 hidden sm:block">
            Estilo técnico manga · Sistema progresivo de perspectiva
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {onGoToMinigames && (
              <button
                onClick={() => {
                  onClose();
                  onGoToMinigames();
                }}
                className="btn-ink-outline px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>Ir a Minijuegos</span>
              </button>
            )}
            {onGoToPractice && (
              <button
                onClick={() => {
                  onClose();
                  onGoToPractice();
                }}
                className="btn-ink px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Ir a Práctica</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="btn-ink px-4 py-1.5 text-xs font-mono font-bold cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
