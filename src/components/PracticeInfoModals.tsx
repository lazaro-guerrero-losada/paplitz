import React from 'react';
import { X, Award, Zap } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal explicativo para la Racha de Maestría (3 Cubos / 3 Aciertos Seguidos ≥90%)
 */
export const MasteryStreakInfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-md bg-white border-3 border-black shadow-[6px_6px_0px_#000000] p-6 text-black">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-neutral-100 border border-black cursor-pointer font-bold"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 bg-black text-white flex items-center justify-center border border-black shadow-[2px_2px_0px_#000000]">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-display uppercase tracking-tight">
              Racha de Maestría
            </h3>
            <span className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase block">
              Superación de Niveles del Camino
            </span>
          </div>
        </div>

        {/* Contenido didáctico */}
        <div className="space-y-3 text-xs font-sans text-neutral-700 leading-relaxed border-t-2 border-black pt-3">
          <p>
            Para avanzar de fase de motricidad y superar un nivel en el <strong>Camino</strong>, debes
            demostrar maestría logrando <strong>3 aciertos seguidos</strong> superando el umbral exigido.
          </p>

          <div className="p-3 border-2 border-black bg-neutral-50 space-y-2">
            <div className="flex items-center gap-2 font-mono font-bold text-[11px] text-black">
              <div className="flex items-center gap-1">
                <span className="w-4 h-4 border border-black bg-black text-white flex items-center justify-center text-[9px]">
                  ✓
                </span>
                <span className="w-4 h-4 border border-black bg-black text-white flex items-center justify-center text-[9px]">
                  ✓
                </span>
                <span className="w-4 h-4 border border-black bg-black text-white flex items-center justify-center text-[9px]">
                  ✓
                </span>
              </div>
              <span>Regla del 3/3 Progresivo:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-neutral-600">
              <li><strong>Fase 1 (Precisión):</strong> 3 aciertos seguidos con nota <strong>≥80%</strong> para pasar a Fase 2.</li>
              <li><strong>Fase 2 (Fluidez):</strong> 3 aciertos seguidos con nota <strong>≥85%</strong> a velocidad continua para pasar a Fase 3.</li>
              <li><strong>Fase 3 (Velocidad):</strong> 3 aciertos seguidos con nota <strong>≥90%</strong> en disparo balístico para dominar la versión o nivel.</li>
              <li><strong>Módulo de Cajas 3D:</strong> 3 cubos seguidos con nota <strong>≥90%</strong>.</li>
              <li>Si la nota baja del umbral de la fase activa, la racha se reinicia a 0.</li>
            </ul>
          </div>
        </div>

        {/* Pie */}
        <div className="mt-5 pt-3 border-t-2 border-black flex justify-end">
          <button
            onClick={onClose}
            className="btn-ink px-4 py-2 text-xs font-mono uppercase font-bold cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Modal explicativo para las 3 Fases Cinemáticas (Precisión, Fluidez, Velocidad)
 */
export const KinematicPhasesInfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-lg bg-white border-3 border-black shadow-[6px_6px_0px_#000000] p-6 text-black">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-neutral-100 border border-black cursor-pointer font-bold"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 bg-black text-white flex items-center justify-center border border-black shadow-[2px_2px_0px_#000000]">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-display uppercase tracking-tight">
              Fases Cinemáticas del Trazo
            </h3>
            <span className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase block">
              Metodología de Calistenia Paplitz
            </span>
          </div>
        </div>

        {/* Contenido didáctico */}
        <div className="space-y-3 text-xs font-sans text-neutral-700 leading-relaxed border-t-2 border-black pt-3">
          <p>
            El control profesional de pluma no se adquiere de golpe: se construye en <strong>3 fases biomecánicas consecutivas</strong> para liberar la mano del titubeo:
          </p>

          <div className="space-y-2">
            {/* Fase 1 */}
            <div className="p-2.5 border-2 border-black bg-neutral-50 flex items-start gap-2.5">
              <span className="w-6 h-6 border-2 border-black bg-black text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <div className="font-bold font-display text-black text-xs uppercase">
                  Fase 1: Precisión (Lento & Guiado)
                </div>
                <p className="text-[11px] text-neutral-600 mt-0.5">
                  Concéntrate en la geometría y en conectar exactamente los puntos ① y ② sin desviarte. La velocidad es baja y el control es total.
                </p>
              </div>
            </div>

            {/* Fase 2 */}
            <div className="p-2.5 border-2 border-black bg-neutral-50 flex items-start gap-2.5">
              <span className="w-6 h-6 border-2 border-black bg-white text-black font-mono font-bold text-xs flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <div className="font-bold font-display text-black text-xs uppercase">
                  Fase 2: Fluidez (Ritmo & Movimiento)
                </div>
                <p className="text-[11px] text-neutral-600 mt-0.5">
                  Aumenta el ritmo usando el antebrazo o el hombro de forma continua y sin titubeos. El trazo no debe frenarse a mitad de camino.
                </p>
              </div>
            </div>

            {/* Fase 3 */}
            <div className="p-2.5 border-2 border-black bg-neutral-50 flex items-start gap-2.5">
              <span className="w-6 h-6 border-2 border-black bg-white text-black font-mono font-bold text-xs flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <div className="font-bold font-display text-black text-xs uppercase">
                  Fase 3: Velocidad (Disparo Rápido / Flick)
                </div>
                <p className="text-[11px] text-neutral-600 mt-0.5">
                  Lanza el trazo con velocidad balística, soltando el miedo a fallar y manteniendo la dirección con agilidad de pluma y despegue limpio.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pie */}
        <div className="mt-5 pt-3 border-t-2 border-black flex justify-end">
          <button
            onClick={onClose}
            className="btn-ink px-4 py-2 text-xs font-mono uppercase font-bold cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
