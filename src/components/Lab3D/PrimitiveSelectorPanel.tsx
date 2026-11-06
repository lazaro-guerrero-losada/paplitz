import React, { useState } from 'react';
import { PrimitiveType } from '../../lib/perspective3d/types';
import { ALL_PRIMITIVES } from '../../lib/perspective3d/primitives';
import { Check, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';

interface PrimitiveSelectorPanelProps {
  selectedTypes: PrimitiveType[];
  onChangeSelectedTypes: (types: PrimitiveType[]) => void;
  onSelectImmediate?: (type: PrimitiveType) => void;
  currentType?: PrimitiveType;
}

const PRIMITIVE_LABELS: Record<PrimitiveType, { name: string; tag: string }> = {
  SPHERE: { name: 'Esfera', tag: '3D Sphere' },
  RING: { name: 'Toro / Anillo', tag: 'Torus' },
  CUBE: { name: 'Cubo', tag: 'Hexahedron' },
  CYLINDER: { name: 'Cilindro', tag: 'Cylinder' },
  CONE: { name: 'Cono', tag: 'Cone' },
  PYRAMID: { name: 'Pirámide', tag: 'Pyramid' },
  CAPSULE: { name: 'Cápsula', tag: 'Capsule' },
  PRISM: { name: 'Prisma Triangular', tag: 'Prism' },
};

export const PrimitiveSelectorPanel: React.FC<PrimitiveSelectorPanelProps> = ({
  selectedTypes,
  onChangeSelectedTypes,
  onSelectImmediate,
  currentType,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const toggleType = (type: PrimitiveType) => {
    if (selectedTypes.includes(type)) {
      // No permitir deseleccionar todas (debe quedar al menos 1 activa)
      if (selectedTypes.length <= 1) return;
      onChangeSelectedTypes(selectedTypes.filter((t) => t !== type));
    } else {
      onChangeSelectedTypes([...selectedTypes, type]);
    }
  };

  const handleSelectAll = () => {
    onChangeSelectedTypes([...ALL_PRIMITIVES]);
  };

  const handleSelectOnlyCurrent = () => {
    if (currentType) {
      onChangeSelectedTypes([currentType]);
    }
  };

  // Modo Colapsado / Pestaña Flotante
  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="card-ink bg-white px-2.5 py-1.5 flex items-center gap-1.5 cursor-pointer shadow-[3px_3px_0px_#000000] hover:-translate-y-0.5 transition-all text-xs font-mono font-bold uppercase"
        title="Desplegar selector de formas 3D"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 stroke-[2.2]" />
        <span>Formas</span>
        <span className="bg-black text-white px-1.5 py-0.2 text-[10px] leading-tight">
          {selectedTypes.length}/{ALL_PRIMITIVES.length}
        </span>
        <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>
    );
  }

  return (
    <div className="card-ink bg-white p-3 w-56 sm:w-60 shadow-[4px_4px_0px_#000000] flex flex-col gap-2 select-none">
      {/* Encabezado del Panel */}
      <div className="flex items-center justify-between border-b-2 border-black pb-2">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-4 h-4 stroke-[2.5]" />
          <h3 className="font-mono font-black text-xs uppercase tracking-wider">Formas 3D</h3>
        </div>

        <div className="flex items-center gap-1">
          <span className="bg-black text-white px-1.5 py-0.5 text-[10px] font-mono font-black leading-none shadow-[1px_1px_0px_#000000]">
            {selectedTypes.length}/{ALL_PRIMITIVES.length}
          </span>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 hover:bg-neutral-100 border border-black cursor-pointer shadow-[1px_1px_0px_#000000] ml-1"
            title="Minimizar panel"
          >
            <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div className="flex items-center gap-1 text-[10px] font-mono font-bold">
        <button
          onClick={handleSelectAll}
          className="btn-ink-outline flex-1 py-1 px-1 text-center cursor-pointer shadow-[1px_1px_0px_#000000] hover:bg-neutral-100"
          title="Seleccionar todas las formas"
        >
          Todas
        </button>
        <button
          onClick={handleSelectOnlyCurrent}
          disabled={!currentType || (selectedTypes.length === 1 && selectedTypes.includes(currentType))}
          className="btn-ink-outline flex-1 py-1 px-1 text-center cursor-pointer shadow-[1px_1px_0px_#000000] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-100"
          title="Solo la forma actual"
        >
          Solo Actual
        </button>
      </div>

      {/* Lista de Primitivas con Checkbox Neobrutalista */}
      <div className="flex flex-col gap-1 max-h-[48vh] overflow-y-auto pr-0.5">
        {ALL_PRIMITIVES.map((prim) => {
          const isChecked = selectedTypes.includes(prim);
          const isCurrent = currentType === prim;
          const info = PRIMITIVE_LABELS[prim];

          return (
            <div
              key={prim}
              className={`flex items-center justify-between p-1.5 border border-black transition-all ${
                isCurrent ? 'bg-amber-100/70 border-2' : isChecked ? 'bg-neutral-50' : 'bg-white opacity-60'
              }`}
            >
              {/* Checkbox y Nombre */}
              <button
                type="button"
                onClick={() => toggleType(prim)}
                className="flex items-center gap-2 flex-1 text-left cursor-pointer select-none"
              >
                <div
                  className={`w-4 h-4 border-2 border-black flex items-center justify-center transition-colors shadow-[1px_1px_0px_#000000] ${
                    isChecked ? 'bg-black text-white' : 'bg-white'
                  }`}
                >
                  {isChecked && <Check className="w-3 h-3 stroke-[3.5]" />}
                </div>

                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-mono font-bold text-black uppercase">
                    {prim}
                  </span>
                  <span className="text-[9px] font-sans text-neutral-500">
                    {info.name}
                  </span>
                </div>
              </button>

              {/* Botón Probar Ahora (si se proporciona callback) */}
              {onSelectImmediate && (
                <button
                  type="button"
                  onClick={() => onSelectImmediate(prim)}
                  className={`text-[9px] font-mono font-bold px-1 py-0.5 border border-black shadow-[1px_1px_0px_#000000] cursor-pointer uppercase ${
                    isCurrent ? 'bg-black text-white' : 'bg-white hover:bg-neutral-100 text-neutral-700'
                  }`}
                  title={`Cargar reto de ${prim} inmediatamente`}
                >
                  {isCurrent ? 'Actual' : 'Reto'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Nota inferior si solo hay 1 seleccionada */}
      {selectedTypes.length === 1 && (
        <div className="text-[9px] font-mono text-neutral-500 text-center border-t border-neutral-300 pt-1">
          Solo 1 forma seleccionada
        </div>
      )}
    </div>
  );
};
