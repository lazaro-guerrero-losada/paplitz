import React from 'react';
import { Unit } from '../lib/curriculumData';
import { X, BookOpen, Lightbulb } from 'lucide-react';

interface GuidebookModalProps {
  unit: Unit;
  onClose: () => void;
}

export const GuidebookModal: React.FC<GuidebookModalProps> = ({ unit, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="card-ink bg-white max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Botón de cierre */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-neutral-100 border border-black cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-5 h-5" />
          <span className="text-xs font-mono uppercase tracking-widest font-bold">
            GUÍA DE LA UNIDAD {unit.number}
          </span>
        </div>

        <h2 className="text-2xl font-bold font-display mb-1">{unit.guidebookContent.title}</h2>
        <p className="text-xs font-mono text-neutral-500 mb-6">{unit.bookChapter}</p>

        {/* Diagrama conceptual con tramas de cómic */}
        <div className="border-2 border-black p-4 mb-6 bg-neutral-50 flex flex-col items-center justify-center text-center">
          <div className="w-32 h-32 border-2 border-black pattern-dots-fine mb-3 relative flex items-center justify-center">
            <span className="bg-white px-2 py-1 border border-black text-[10px] font-mono font-bold">
              PLANO FRONTAL
            </span>
          </div>
          <p className="text-xs font-mono text-neutral-700 max-w-xs">
            {unit.guidebookContent.diagramNotes}
          </p>
        </div>

        {/* Axiomas de Koos Eissen */}
        <div className="space-y-3 mb-6">
          <h4 className="text-xs font-mono uppercase tracking-wider font-bold flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4" /> Reglas Fundamentales:
          </h4>
          <ul className="space-y-2">
            {unit.guidebookContent.axioms.map((axiom, idx) => (
              <li key={idx} className="text-sm font-sans flex items-start gap-2 bg-neutral-50 p-2.5 border border-black">
                <span className="font-mono font-bold">{idx + 1}.</span>
                <span>{axiom}</span>
              </li>
            ))}
          </ul>
        </div>

        <button onClick={onClose} className="btn-ink w-full py-2.5 text-sm uppercase cursor-pointer">
          Entendido, Volver al Camino
        </button>
      </div>
    </div>
  );
};
