import React, { useState } from 'react';
import { Unit, LessonNode } from '../lib/curriculumData';
import { X, CheckCircle, Zap, FastForward, Award, ArrowRight } from 'lucide-react';

interface PlacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: Unit[];
  onDirectUnlock: (targetNodeId: string) => void;
  onStartPlacementTest: (targetNode: LessonNode) => void;
}

export const PlacementModal: React.FC<PlacementModalProps> = ({
  isOpen,
  onClose,
  units,
  onDirectUnlock,
  onStartPlacementTest,
}) => {
  const allNodes = units.flatMap((u) => u.nodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    allNodes[1]?.id || allNodes[0]?.id || ''
  );

  if (!isOpen) return null;

  const selectedNode = allNodes.find((n) => n.id === selectedNodeId) || allNodes[0];
  const selectedIndex = allNodes.findIndex((n) => n.id === selectedNodeId);
  const priorNodesCount = Math.max(0, selectedIndex);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
      <div className="bg-white border-3 border-black p-4 sm:p-6 max-w-xl w-full shadow-[6px_6px_0px_#000000] flex flex-col gap-4 font-sans max-h-[92vh] overflow-y-auto">
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 border-2 border-black bg-black text-white flex items-center justify-center shadow-[1px_1px_0px_#000000]">
              <FastForward className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] font-mono uppercase bg-neutral-200 text-black px-1.5 py-0.2 font-bold">
                RECUPERACIÓN DE PROGRESO
              </span>
              <h3 className="font-display font-bold text-base sm:text-lg uppercase tracking-tight leading-tight mt-0.5">
                Saltar a mi Nivel / Nivelación
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 border border-black cursor-pointer shadow-[1px_1px_0px_#000000]"
            title="Cerrar modal"
          >
            <X className="w-4 h-4 text-black" />
          </button>
        </div>

        {/* Explicación didáctica */}
        <div className="text-xs text-neutral-600 bg-neutral-50 p-3 border border-neutral-300 leading-relaxed">
          <p>
            ¿Has cambiado de dispositivo, se borró tu cuenta o ya tienes experiencia dibujando perspectiva? No hace falta que repitas todas las lecciones desde cero una a una. Elige la lección a la que deseas saltar.
          </p>
        </div>

        {/* Selector de lección destino */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono font-bold uppercase text-neutral-700 flex items-center justify-between">
            <span>Selecciona hasta qué lección quieres convalidar:</span>
            <span className="text-[10px] text-neutral-500 font-normal">
              {priorNodesCount} lecciones previas
            </span>
          </label>
          <select
            value={selectedNodeId}
            onChange={(e) => setSelectedNodeId(e.target.value)}
            className="border-2 border-black p-2 text-xs font-mono font-bold bg-white shadow-[2px_2px_0px_#000000] cursor-pointer"
          >
            {units.map((u) => (
              <optgroup key={u.id} label={`UNIDAD ${u.number} · ${u.title}`}>
                {u.nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.code} · {n.title} ({n.subtitle})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Ficha de la lección seleccionada */}
        {selectedNode && (
          <div className="border-2 border-black bg-neutral-100 p-3 flex items-center justify-between gap-3 shadow-[2px_2px_0px_#000000]">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-xs bg-black text-white px-1.5 py-0.5">
                  {selectedNode.code}
                </span>
                <span className="font-display font-bold text-sm">
                  {selectedNode.title}
                </span>
              </div>
              <p className="text-[11px] text-neutral-600 font-sans mt-1">
                {selectedNode.subtitle} · Recompensa: +{selectedNode.xpReward} XP
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-mono uppercase border border-black bg-white px-2 py-0.5 font-bold shadow-[1px_1px_0px_#000000]">
                {priorNodesCount > 0 ? `Saltarás ${priorNodesCount} nivel(es)` : 'Nivel inicial'}
              </span>
            </div>
          </div>
        )}

        {/* Las 2 opciones de desbloqueo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
          {/* Opción A: Desbloquear directamente */}
          <div className="border-2 border-black p-3.5 bg-white shadow-[3px_3px_0px_#000000] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 font-mono font-bold text-xs mb-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>Desbloquear Directamente</span>
              </div>
              <p className="text-[11px] text-neutral-600 leading-snug mb-3">
                Si ya sabes que lo has superado y no quieres perder tiempo repitiendo pruebas, convalida y desbloquea el camino al instante hasta esta lección.
              </p>
            </div>

            <button
              onClick={() => {
                onDirectUnlock(selectedNodeId);
                onClose();
              }}
              className="btn-ink w-full py-2 text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
            >
              <span>Estoy seguro, desbloquear</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Opción B: Examen de nivelación */}
          <div className="border-2 border-black p-3.5 bg-neutral-50 shadow-[3px_3px_0px_#000000] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 font-mono font-bold text-xs mb-1.5">
                <Zap className="w-4 h-4" />
                <span>Examen de Nivelación</span>
              </div>
              <p className="text-[11px] text-neutral-600 leading-snug mb-3">
                Dibuja un cubo de esta lección para certificar tu destreza. Si sacas un 75% o más, se convalidará todo lo anterior y ganarás una bonificación de XP.
              </p>
            </div>

            <button
              onClick={() => {
                onStartPlacementTest(selectedNode);
                onClose();
              }}
              className="btn-ink-outline w-full py-2 text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-black hover:text-white transition-colors"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Hacer Examen de Nivelación</span>
            </button>
          </div>
        </div>

        {/* Pie */}
        <div className="flex justify-end pt-2 border-t border-neutral-200">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-mono text-neutral-600 hover:text-black border border-neutral-300 hover:border-black cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
