import React from 'react';
import { LessonNode } from '../lib/curriculumData';
import { LabExerciseDef } from '../lib/strokeTypes';
import { X, Check, Layers, Sparkles, Target } from 'lucide-react';

interface VariantSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeNode: LessonNode | null;
  activeVariants: LabExerciseDef[];
  currentVariantIndex: number;
  onSelectVariant: (variantIndex: number) => void;
}

export function getVariantGuideBadge(variant: LabExerciseDef): { label: string; isPointsOnly: boolean } {
  if (variant.singleStrokeConfig) {
    const { guideType, multiLineCount } = variant.singleStrokeConfig;
    if (multiLineCount && multiLineCount > 1) {
      return { label: `Multi-Línea (${multiLineCount} trazos)`, isPointsOnly: true };
    }
    if (guideType === 'points_only') {
      return { label: 'Sin Guía (Solo Dianas)', isPointsOnly: true };
    }
    if (guideType === 'gray_line') {
      return { label: 'Guía Gris Continua', isPointsOnly: false };
    }
  }
  if (variant.spacingTrackConfig) {
    const mult = variant.spacingTrackConfig.spacingMultiplier === 0.5 ? 'Paso x/2' : 'Paso normal';
    return { label: `Carril de Trazos (${mult})`, isPointsOnly: false };
  }
  return { label: 'Trazo Estándar', isPointsOnly: false };
}

export const VariantSelectorModal: React.FC<VariantSelectorModalProps> = ({
  isOpen,
  onClose,
  activeNode,
  activeVariants,
  currentVariantIndex,
  onSelectVariant,
}) => {
  if (!isOpen || !activeNode) return null;

  const currentDef = activeVariants[currentVariantIndex] || activeVariants[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none font-mono animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white border-2 border-black shadow-[6px_6px_0px_#000000] w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Neo-Brutalista */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b-2 border-black bg-neutral-50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="bg-black text-white px-2 py-0.5 text-xs font-bold shrink-0">
              {activeNode.code}
            </span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black font-display text-black truncate uppercase">
                {activeNode.title}
              </h2>
              <p className="text-[10px] text-neutral-500 font-sans truncate">
                Selector de versiones ({activeVariants.length} subniveles disponibles)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 border border-black bg-white hover:bg-neutral-200 cursor-pointer shadow-[1px_1px_0px_#000000] active:scale-95 transition-transform shrink-0"
            title="Cerrar ventana"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Contenido desplazable */}
        <div className="p-3.5 sm:p-4 overflow-y-auto space-y-3.5">
          {/* Tarjeta destacada de la versión activa actual */}
          {currentDef && (
            <div className="border-2 border-black bg-neutral-100 p-3 shadow-[3px_3px_0px_#000000]">
              <div className="flex items-center justify-between gap-2 text-[10px] mb-1">
                <span className="inline-flex items-center gap-1 bg-black text-white font-bold px-1.5 py-0.5">
                  <Sparkles className="w-3 h-3 text-white fill-white" />
                  <span>VERSIÓN EN CURSO: V{currentVariantIndex + 1}</span>
                </span>
                <span className="font-bold text-neutral-600 uppercase">
                  {currentDef.difficulty || 'Media'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-black font-display leading-snug">
                {currentDef.title}
              </h3>
              <p className="text-xs text-neutral-700 font-sans mt-1 leading-relaxed">
                {currentDef.desc || currentDef.instruction}
              </p>
              {currentDef.metrics && (
                <div className="text-[10px] text-neutral-600 bg-white border border-neutral-300 p-1.5 mt-2 flex items-start gap-1.5">
                  <Target className="w-3.5 h-3.5 text-black shrink-0 mt-0.5" />
                  <span><strong>Objetivo:</strong> {currentDef.metrics}</span>
                </div>
              )}
            </div>
          )}

          {/* Explicación de la progresión de versiones */}
          <div className="flex items-center gap-2 p-2 bg-neutral-50 border border-neutral-300 text-[11px] text-neutral-600">
            <Layers className="w-4 h-4 text-black shrink-0" />
            <span>
              Cada versión introduce un nuevo reto biomecánico: desde líneas fijas con guía gris hasta líneas libres sin guía y multi-trazos.
            </span>
          </div>

          {/* Lista de todas las versiones */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 flex items-center justify-between">
              <span>Todas las versiones ({activeVariants.length})</span>
              <span className="text-[10px] text-neutral-400 font-normal">Haz clic para elegir</span>
            </div>

            {activeVariants.map((variant, idx) => {
              const isSelected = idx === currentVariantIndex;
              const guideInfo = getVariantGuideBadge(variant);

              return (
                <div
                  key={variant.code || `var-${idx}`}
                  onClick={() => {
                    onSelectVariant(idx);
                    onClose();
                  }}
                  className={`border-2 border-black p-2.5 transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-white shadow-[3px_3px_0px_#000000] ring-2 ring-black/20'
                      : 'bg-neutral-50 hover:bg-white hover:shadow-[2px_2px_0px_#000000]'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span
                      className={`w-7 h-7 shrink-0 flex items-center justify-center font-bold text-xs border border-black ${
                        isSelected ? 'bg-black text-white shadow-[1px_1px_0px_#000000]' : 'bg-white text-black'
                      }`}
                    >
                      V{idx + 1}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-black leading-tight">
                          {variant.title}
                        </span>
                        {isSelected && (
                          <span className="bg-black text-white text-[9px] font-bold px-1 py-0.2 uppercase">
                            Activa
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-neutral-600 font-sans mt-0.5 line-clamp-2 leading-snug">
                        {variant.desc || variant.instruction}
                      </p>

                      <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-500 font-mono">
                        <span className={`px-1 py-0.2 border ${guideInfo.isPointsOnly ? 'border-black bg-neutral-200 text-black font-bold' : 'border-neutral-300 bg-neutral-100'}`}>
                          {guideInfo.label}
                        </span>
                        <span>•</span>
                        <span>{variant.difficulty || 'Media'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center self-center">
                    {isSelected ? (
                      <div className="w-5 h-5 bg-black text-white flex items-center justify-center border border-black">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="px-2 py-1 text-[10px] font-bold border border-black bg-white hover:bg-black hover:text-white transition-colors cursor-pointer"
                      >
                        Elegir
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pie de ventana */}
        <div className="p-3 border-t-2 border-black bg-neutral-50 flex items-center justify-between text-[11px] shrink-0">
          <span className="text-neutral-500">
            Fases: 1 (Precisión ≥80%) · 2 (Fluidez ≥85%) · 3 (Velocidad ≥90%)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn-ink px-4 py-1.5 text-xs font-bold cursor-pointer shadow-[2px_2px_0px_#000000]"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
