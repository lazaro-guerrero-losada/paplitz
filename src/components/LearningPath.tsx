import React, { useState } from 'react';
import { Unit, LessonNode } from '../lib/curriculumData';
import { Check, Lock, BookOpen, FastForward, Sparkles, PenTool, Box, Play, X, Layers, Target, ChevronDown } from 'lucide-react';
import { getVariantGuideBadge } from './VariantSelectorModal';

interface LearningPathProps {
  units: Unit[];
  activeModuleId?: string;
  nodeVariantIndices?: Record<string, number>;
  onSelectModule?: (moduleId: string) => void;
  onSelectNode: (node: LessonNode, variantIndex?: number) => void;
  onOpenGuidebook: (unit: Unit) => void;
  onOpenPlacementModal?: () => void;
}

export const LearningPath: React.FC<LearningPathProps> = ({
  units,
  activeModuleId = 'module-calisthenics',
  nodeVariantIndices,
  onSelectModule,
  onSelectNode,
  onOpenGuidebook,
  onOpenPlacementModal,
}) => {
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, number>>({});

  // Desplazamiento horizontal en zigzag tipo Duolingo
  const getOffset = (index: number) => {
    const pattern = [0, 40, 80, 40, 0, -40, -80, -40];
    return pattern[index % pattern.length];
  };

  const getOffsetClass = (index: number) => {
    const offset = getOffset(index);
    return { transform: `translateX(${offset}px)` };
  };

  return (
    <div className="w-full max-w-xl mx-auto py-8 px-4 flex flex-col items-center">
      {/* Selector de Módulos del Camino */}
      {onSelectModule && (
        <div className="w-full mb-6 flex flex-col sm:flex-row items-stretch gap-2 border-2 border-black p-1 bg-neutral-100 shadow-[3px_3px_0px_#000000]">
          <button
            onClick={() => onSelectModule('module-calisthenics')}
            className={`flex-1 py-2 px-3 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border border-black ${
              activeModuleId === 'module-calisthenics'
                ? 'bg-black text-white shadow-[1px_1px_0px_#000000]'
                : 'bg-white text-black hover:bg-neutral-200'
            }`}
          >
            <PenTool className="w-4 h-4 shrink-0" />
            <span className="truncate">MÓDULO 1: LÍNEAS & TRAZOS</span>
          </button>
          <button
            onClick={() => onSelectModule('module-cubes')}
            className={`flex-1 py-2 px-3 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border border-black ${
              activeModuleId === 'module-cubes'
                ? 'bg-black text-white shadow-[1px_1px_0px_#000000]'
                : 'bg-white text-black hover:bg-neutral-200'
            }`}
          >
            <Box className="w-4 h-4 shrink-0" />
            <span className="truncate">MÓDULO 2: PARALELEPÍPEDOS</span>
          </button>
        </div>
      )}

      {/* Barra de acceso rápido superior: Recuperar nivel / Saltar camino */}
      {onOpenPlacementModal && (
        <div className="w-full mb-6 p-3 border-2 border-black bg-white shadow-[3px_3px_0px_#000000] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-black text-white flex items-center justify-center border border-black shrink-0">
              <FastForward className="w-3.5 h-3.5" />
            </div>
            <div className="leading-tight">
              <div className="text-xs font-bold font-display uppercase">¿Ya has practicado o perdiste tu cuenta?</div>
              <div className="text-[11px] text-neutral-500 font-sans hidden sm:block">Salta directamente a tu lección o haz un examen rápido de nivelación.</div>
            </div>
          </div>
          <button
            onClick={onOpenPlacementModal}
            className="btn-ink px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-[2px_2px_0px_#000000]"
            title="Saltar a tu nivel alcanzado"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>Saltar Nivel</span>
          </button>
        </div>
      )}

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
              const isExpanded = expandedNodeId === node.id;
              const nodeOffset = getOffset(nodeIdx);

              const activeVariantIdx =
                selectedVariants[node.id] ??
                ((nodeVariantIndices?.[node.id] || 0) % (node.variants?.length || 1));
              const activeVariant =
                node.variants && node.variants.length > 0
                  ? node.variants[activeVariantIdx] || node.variants[0]
                  : node.exerciseDef;

              return (
                <div
                  key={node.id}
                  className="flex flex-col items-center relative z-10 transition-all duration-200"
                  style={getOffsetClass(nodeIdx)}
                >
                  <button
                    onClick={() => !isLocked && setExpandedNodeId(isExpanded ? null : node.id)}
                    disabled={isLocked}
                    className={`w-18 h-18 rounded-2xl relative flex flex-col items-center justify-center transition-all cursor-pointer select-none ${
                      isCompleted
                        ? 'bg-black text-white border-4 border-black shadow-[4px_4px_0px_#000000] hover:scale-105'
                        : isCurrent
                        ? `bg-white text-black border-4 border-black shadow-[6px_6px_0px_#000000] hover:scale-105 ring-4 ${
                            isExpanded ? 'ring-black' : 'ring-black/15 animate-pulse'
                          }`
                        : 'bg-neutral-100 text-neutral-400 border-2 border-neutral-300 cursor-not-allowed'
                    }`}
                    title={isLocked ? 'Nivel bloqueado' : isExpanded ? 'Plegar detalles' : 'Ver qué hace este nivel y sus versiones'}
                  >
                    {/* Badge de nivel disponible / actual */}
                    {isCurrent && (
                      <div className="absolute -top-3.5 px-2 py-0.5 bg-black text-white text-[9px] font-mono font-bold uppercase rounded-full shadow-[2px_2px_0px_#000000] animate-bounce flex items-center gap-1 z-20">
                        <Sparkles className="w-2.5 h-2.5 fill-white text-white" />
                        <span>DISPONIBLE</span>
                      </div>
                    )}

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

                    {/* Indicador de desplegado */}
                    {!isLocked && (
                      <div className="absolute -bottom-2 bg-black text-white rounded-full p-0.5 border border-white shadow-[1px_1px_0px_#000000]">
                        <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    )}
                  </button>

                  {/* Etiqueta con el número y nombre del ejercicio */}
                  <div
                    onClick={() => !isLocked && setExpandedNodeId(isExpanded ? null : node.id)}
                    className={`mt-2.5 text-center max-w-[160px] ${!isLocked ? 'cursor-pointer' : ''}`}
                  >
                    <div className="text-xs font-bold font-display leading-tight flex items-center justify-center gap-1">
                      <span>{node.code} · {node.title}</span>
                    </div>
                    {node.variants && node.variants.length > 1 && (
                      <div className="mt-1">
                        <span className="text-[9px] font-mono uppercase bg-neutral-100 border border-black px-1.5 py-0.5 font-bold shadow-[1px_1px_0px_#000000] inline-block">
                          {node.variants.length} versiones {nodeVariantIndices?.[node.id] !== undefined ? `(V${((nodeVariantIndices[node.id] || 0) % node.variants.length) + 1})` : ''}
                        </span>
                      </div>
                    )}
                    <div className="text-[10px] text-neutral-500 font-sans mt-0.5 leading-snug">
                      {node.subtitle}
                    </div>
                    {isCompleted && node.score && (
                      <span className="text-[10px] font-mono bg-neutral-100 border border-black px-1.5 py-0.2 mt-1 inline-block font-bold">
                        {node.score}% precisión
                      </span>
                    )}
                  </div>

                  {/* Tarjeta Desplegada / Unfolded con la estética de Paplitz */}
                  {isExpanded && (
                    <div
                      style={{ transform: `translateX(${-nodeOffset}px)` }}
                      className="w-[calc(100vw-32px)] max-w-md bg-white border-2 border-black p-3.5 shadow-[4px_4px_0px_#000000] text-left font-mono my-3 animate-in fade-in zoom-in-95 duration-150 relative z-30"
                    >
                      {/* Cabecera del nivel desplegado */}
                      <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b-2 border-black bg-neutral-50 -mx-3.5 -mt-3.5 p-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="bg-black text-white px-2 py-0.5 text-xs font-bold shrink-0">
                            {node.code}
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-black font-display text-black truncate uppercase">
                              {node.title}
                            </h4>
                            <p className="text-[10px] text-neutral-500 font-sans truncate">
                              {node.subtitle}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedNodeId(null);
                          }}
                          className="p-1 border border-black bg-white hover:bg-neutral-200 cursor-pointer shadow-[1px_1px_0px_#000000] shrink-0"
                          title="Plegar detalles"
                        >
                          <X className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>

                      {/* Si tiene variantes (calistenia): Selector de versión y qué hace cada una */}
                      {node.variants && node.variants.length > 0 && activeVariant ? (
                        (() => {
                          const guideInfo = getVariantGuideBadge(activeVariant);

                          return (
                            <div className="space-y-3">
                              {/* Carrusel / Lista de pills de versiones */}
                              <div>
                                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-neutral-600 mb-1.5">
                                  <span className="flex items-center gap-1">
                                    <Layers className="w-3 h-3 stroke-[2.5]" />
                                    <span>Subniveles ({node.variants.length} versiones):</span>
                                  </span>
                                  <span className="text-neutral-400 font-normal">Toca para inspeccionar</span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {node.variants.map((v, vIdx) => {
                                    const isCurrentVar = vIdx === activeVariantIdx;
                                    return (
                                      <button
                                        key={v.code || vIdx}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedVariants((prev) => ({ ...prev, [node.id]: vIdx }));
                                        }}
                                        className={`px-2 py-1 text-[11px] font-bold border border-black cursor-pointer transition-all ${
                                          isCurrentVar
                                            ? 'bg-black text-white shadow-[2px_2px_0px_#000000] scale-105'
                                            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                                        }`}
                                        title={v.title}
                                      >
                                        V{vIdx + 1}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Tarjeta explicativa de la versión seleccionada: QUÉ HACE */}
                              <div className="p-2.5 border-2 border-black bg-neutral-100 shadow-[2px_2px_0px_#000000] space-y-1.5">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="bg-black text-white px-1.5 py-0.2 font-bold flex items-center gap-1">
                                    <Sparkles className="w-2.5 h-2.5 fill-white" />
                                    <span>VERSIÓN {activeVariantIdx + 1}</span>
                                  </span>
                                  <span className="font-bold text-neutral-600 uppercase">
                                    {activeVariant.difficulty || 'Media'}
                                  </span>
                                </div>

                                <div className="text-xs font-bold text-black font-display leading-tight">
                                  {activeVariant.title}
                                </div>

                                <p className="text-[11px] text-neutral-700 font-sans leading-relaxed">
                                  {activeVariant.desc || activeVariant.instruction}
                                </p>

                                {activeVariant.metrics && (
                                  <div className="flex items-center gap-1 text-[10px] text-neutral-600 bg-white border border-neutral-300 px-1.5 py-1">
                                    <Target className="w-3 h-3 text-black shrink-0" />
                                    <span><strong>Objetivo:</strong> {activeVariant.metrics}</span>
                                  </div>
                                )}

                                <div className="flex items-center gap-2 pt-1 border-t border-neutral-200 text-[10px]">
                                  <span className={`px-1 py-0.2 border ${guideInfo.isPointsOnly ? 'border-black bg-neutral-200 font-bold' : 'border-neutral-300 bg-white'}`}>
                                    {guideInfo.label}
                                  </span>
                                </div>
                              </div>

                              {/* Aviso de Fases de Motricidad */}
                              <div className="text-[10px] text-neutral-500 font-mono bg-neutral-50 border border-neutral-300 p-1.5 flex items-center justify-between">
                                <span>Progresión:</span>
                                <span className="font-bold text-neutral-700">F1 (≥80%) → F2 (≥85%) → F3 (≥90%)</span>
                              </div>

                              {/* Botón de acción principal: Lanzar práctica */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectNode(node, activeVariantIdx);
                                }}
                                className="w-full btn-ink py-2 text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_#000000] active:scale-98 transition-transform"
                              >
                                <Play className="w-3.5 h-3.5 fill-white stroke-none" />
                                <span>PRACTICAR {node.code} (V{activeVariantIdx + 1})</span>
                              </button>
                            </div>
                          );
                        })()
                      ) : (
                        /* Para lecciones de cubo o sin variantes */
                        <div className="space-y-3">
                          <div className="p-2.5 border-2 border-black bg-neutral-100 shadow-[2px_2px_0px_#000000] space-y-1">
                            <div className="text-xs font-bold text-black font-display">
                              {node.title}
                            </div>
                            <p className="text-[11px] text-neutral-700 font-sans leading-relaxed">
                              {node.subtitle}
                            </p>
                            {node.perspectiveMode && (
                              <div className="text-[10px] text-neutral-600 bg-white border border-neutral-300 p-1 mt-1">
                                <strong>Perspectiva:</strong> {node.perspectiveMode}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectNode(node);
                            }}
                            className="w-full btn-ink py-2 text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_#000000] active:scale-98 transition-transform"
                          >
                            <Play className="w-3.5 h-3.5 fill-white stroke-none" />
                            <span>PRACTICAR ESTE NIVEL</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
