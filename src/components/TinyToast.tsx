import React, { useEffect } from 'react';
import { X, ChevronRight } from 'lucide-react';

export interface ToastData {
  id: number;
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  type?: 'success' | 'info' | 'warning';
}

interface TinyToastProps {
  toast: ToastData | null;
  onClose: () => void;
}

export const TinyToast: React.FC<TinyToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast?.id, onClose]);

  if (!toast) return null;

  return (
    <div className="fixed top-14 right-3 sm:right-6 z-50 max-w-sm w-[calc(100vw-24px)] sm:w-84 animate-fade-in pointer-events-auto">
      <div className="border-2 border-black bg-white shadow-[4px_4px_0px_#000000] p-3 flex items-start gap-2.5 font-sans">
        {/* Icono Badge */}
        <div className="w-7 h-7 border border-black bg-black text-white flex items-center justify-center text-sm shrink-0 shadow-[1px_1px_0px_#000000] select-none">
          <span>{toast.icon}</span>
        </div>

        {/* Contenido */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-xs font-mono font-bold uppercase tracking-tight text-black truncate">
              {toast.title}
            </h4>
          </div>
          <p className="text-[11px] font-sans text-neutral-600 leading-tight mt-0.5">
            {toast.message}
          </p>

          {/* Botón de acción opcional (e.g. Ir al nuevo nivel) */}
          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                onClose();
              }}
              className="btn-ink text-[10px] font-mono py-1 px-2 mt-2 uppercase font-bold flex items-center gap-1 cursor-pointer shadow-[1px_1px_0px_#000000]"
            >
              <span>{toast.actionLabel}</span>
              <ChevronRight className="w-3 h-3 stroke-[3]" />
            </button>
          )}
        </div>

        {/* Botón de cierre */}
        <button
          type="button"
          onClick={onClose}
          className="p-1 border border-black hover:bg-neutral-100 text-black cursor-pointer shrink-0 shadow-[1px_1px_0px_#000000]"
          aria-label="Cerrar notificación"
        >
          <X className="w-3 h-3 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
