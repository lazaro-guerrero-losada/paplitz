import React from 'react';
import { Unit, LessonNode } from '../lib/curriculumData';
import { Check, Lock, BookOpen } from 'lucide-react';

interface LearningPathProps {
  units: Unit[];
  onSelectNode: (node: LessonNode) => void;
  onOpenGuidebook: (unit: Unit) => void;
}

export const LearningPath: React.FC<LearningPathProps> = ({
  units,
  onSelectNode,
  onOpenGuidebook,
}) => {
  // Desplazamiento horizontal en zigzag tipo Duolingo
  const getOffsetClass = (index: number) => {
    const pattern = [0, 40, 80, 40, 0, -40, -80, -40];
    const offset = pattern[index % pattern.length];
    return { transform: `translateX(${offset}px)` };
  };

  return (
    <div className="w-full max-w-xl mx-auto py-8 px-4 flex flex-col items-center">
      {units.map((unit) => (
        <div key={unit.id} className="w-full mb-16">
          {/* Cabecera de la Unidad con estética de caja entintada */}
          <div className="card-ink p-5 mb-10 relative bg-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest bg-black text-white px-2 py-0.5 font-bold">
                  UNIDAD {unit.number}
                </span>
                <h3 className="text-xl font-bold font-display mt-2 leading-tight">
                  {unit.title}
                </h3>
                <p className="text-xs text-neutral-600 mt-1 font-sans">
                  {unit.description}
                </p>
                <div className="text-[10px] font-mono text-neutral-500 mt-2 flex items-center gap-1.5">
                  <BookOpen className="w-3 h-3 stroke-[2]" />
                  <span>{unit.bookChapter}</span>
                </div>
              </div>

              {/* Botón de Guía de Unidad (Guidebook) */}
              <button
                onClick={() => onOpenGuidebook(unit)}
                className="btn-ink-outline px-3 py-2 text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Ver teoría y reglas de Koos Eissen"
              >
                <BookOpen className="w-4 h-4" />
                <span>GUÍA</span>
              </button>
            </div>
          </div>

          {/* Nodos de la Unidad en el Camino */}
          <div className="flex flex-col items-center gap-6 relative">
            {/* Línea guía punteada vertical */}
            <div className="absolute top-6 bottom-6 w-0.5 border-l-2 border-dashed border-neutral-300 -z-0" />

            {unit.nodes.map((node, nodeIdx) => {
              const isCurrent = node.status === 'current';
              const isCompleted = node.status === 'completed';
              const isLocked = node.status === 'locked';

              return (
                <div
                  key={node.id}
                  className="flex flex-col items-center relative z-10 transition-all duration-200"
                  style={getOffsetClass(nodeIdx)}
                >
                  <button
                    onClick={() => !isLocked && onSelectNode(node)}
                    disabled={isLocked}
                    className={`w-18 h-18 rounded-2xl relative flex flex-col items-center justify-center transition-all cursor-pointer select-none ${
                      isCompleted
                        ? 'bg-black text-white border-4 border-black shadow-[4px_4px_0px_#000000] hover:scale-105'
                        : isCurrent
                        ? 'bg-white text-black border-4 border-black shadow-[5px_5px_0px_#000000] hover:scale-105 animate-pulse'
                        : 'bg-neutral-100 text-neutral-400 border-2 border-neutral-300 cursor-not-allowed'
                    }`}
                  >
                    <span className="font-mono font-extrabold text-xl tracking-tight leading-none">
                      {node.code}
                    </span>

                    {/* Badge de completado en la esquina superior derecha */}
                    {isCompleted && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-white text-black border-2 border-black rounded-full flex items-center justify-center shadow-[1px_1px_0px_#000000]">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}

                    {/* Icono de candado cuando está bloqueado */}
                    {isLocked && (
                      <Lock className="w-3.5 h-3.5 opacity-50 mt-1" />
                    )}
                  </button>

                  {/* Etiqueta con el número y nombre del ejercicio */}
                  <div className="mt-2 text-center max-w-[150px]">
                    <div className="text-xs font-bold font-display leading-tight">
                      {node.code} · {node.title}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-sans mt-0.5 leading-snug">
                      {node.subtitle}
                    </div>
                    {isCompleted && node.score && (
                      <span className="text-[10px] font-mono bg-neutral-100 border border-black px-1.5 py-0.2 mt-1 inline-block font-bold">
                        {node.score}% precisión
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
