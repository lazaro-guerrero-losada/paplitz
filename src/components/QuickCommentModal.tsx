import React, { useState, useEffect } from 'react';
import { MessageSquare, X, Check, AlertCircle } from 'lucide-react';

interface QuickCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialComment: string;
  onSave: (comment: string) => void;
  nodeCode: string;
  nodeTitle?: string;
  score?: number;
  seed?: number;
  phase?: number;
  isRecording: boolean;
  onStartRecordingAndSave?: (comment: string) => void;
}

export const QuickCommentModal: React.FC<QuickCommentModalProps> = ({
  isOpen,
  onClose,
  initialComment,
  onSave,
  nodeCode,
  nodeTitle,
  score,
  seed,
  phase,
  isRecording,
  onStartRecordingAndSave,
}) => {
  const [commentText, setCommentText] = useState(initialComment);

  useEffect(() => {
    if (isOpen) {
      setCommentText(initialComment);
    }
  }, [isOpen, initialComment]);

  if (!isOpen) return null;

  const quickTags = [
    'Nota injusta',
    'Trazo tembloroso',
    'Fallo de velocidad',
    'Sentido invertido',
    'Dianas desalineadas',
    'Buena sensación',
    'Dificultad alta',
  ];

  const handleTagClick = (tag: string) => {
    if (commentText.includes(tag)) return;
    setCommentText((prev) => (prev.trim() ? `${prev.trim()} · ${tag}` : tag));
  };

  const handleSave = () => {
    if (!isRecording && onStartRecordingAndSave) {
      onStartRecordingAndSave(commentText.trim());
    } else {
      onSave(commentText.trim());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in font-sans">
      <div className="bg-white border-4 border-black p-4 sm:p-5 max-w-md w-full shadow-[8px_8px_0px_#000000] flex flex-col gap-3 max-h-[92vh] overflow-y-auto">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b-2 border-black pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-black text-white flex items-center justify-center font-mono font-bold text-xs">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm sm:text-base uppercase tracking-tight leading-none">
                Comentario del Ejercicio
              </h3>
              <span className="text-[10px] font-mono text-neutral-500">
                {nodeCode} {nodeTitle ? `· ${nodeTitle}` : ''}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 border border-black cursor-pointer shadow-[1px_1px_0px_#000000]"
            title="Cerrar (Esc)"
          >
            <X className="w-4 h-4 text-black stroke-[2.5]" />
          </button>
        </div>

        {/* Metadatos rápidos */}
        <div className="flex items-center justify-between bg-neutral-50 border border-black px-2.5 py-1.5 text-[11px] font-mono">
          <div className="flex items-center gap-2">
            {score !== undefined && (
              <span className="font-bold bg-black text-white px-1.5 py-0.2">
                {score}%
              </span>
            )}
            {phase && (
              <span className="text-neutral-600">
                Fase {phase}
              </span>
            )}
          </div>
          {seed && (
            <span className="text-neutral-400">
              Semilla #{seed}
            </span>
          )}
        </div>

        {/* Aviso si la grabación no está activa */}
        {!isRecording && (
          <div className="p-2.5 bg-neutral-100 border border-black text-[11px] font-mono flex items-start gap-2 shadow-[1px_1px_0px_#000000]">
            <AlertCircle className="w-4 h-4 shrink-0 text-black mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Modo Récord actualmente inactivo</span>
              <p className="text-[10px] text-neutral-600 font-sans mt-0.5">
                Al guardar este comentario, se activará automáticamente el Modo Récord para guardar este y tus siguientes ejercicios juntos.
              </p>
            </div>
          </div>
        )}

        {/* Textarea de comentario */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-mono font-bold uppercase text-neutral-700">
            Tu nota o apreciación sobre este ejercicio:
          </label>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Ej: El trazo empezó bien pero al final me tembló el pulso, o la nota me parece baja para lo recto que salió..."
            className="w-full h-24 p-2 text-xs font-mono bg-white border-2 border-black resize-none focus:outline-none focus:ring-2 focus:ring-black shadow-[2px_2px_0px_#000000]"
            autoFocus
          />
        </div>

        {/* Etiquetas rápidas para añadir en 1 clic */}
        <div>
          <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase block mb-1">
            Etiquetas rápidas:
          </span>
          <div className="flex flex-wrap gap-1">
            {quickTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagClick(tag)}
                className="text-[10px] font-mono bg-white hover:bg-neutral-100 border border-black px-1.5 py-0.5 cursor-pointer shadow-[1px_1px_0px_#000000] active:scale-95 transition-transform"
              >
                +{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-200 mt-1">
          {commentText && (
            <button
              type="button"
              onClick={() => setCommentText('')}
              className="text-[10px] font-mono text-neutral-500 hover:text-black underline cursor-pointer"
            >
              Borrar texto
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-mono font-bold border border-black bg-white hover:bg-neutral-100 cursor-pointer shadow-[1px_1px_0px_#000000]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn-ink px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Guardar Comentario</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
