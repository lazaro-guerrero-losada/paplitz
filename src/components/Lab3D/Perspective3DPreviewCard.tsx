import React, { useRef, useEffect, useState } from 'react';
import { WireframeModel3D, PrimitiveType, Vector3D } from '../../lib/perspective3d/types';
import { vRotateX, vRotateY } from '../../lib/perspective3d/math3d';

interface Perspective3DPreviewCardProps {
  model: WireframeModel3D;
  primitiveType: PrimitiveType | string;
  title: string;
}

export const Perspective3DPreviewCard: React.FC<Perspective3DPreviewCardProps> = ({
  model,
  primitiveType,
  title,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rotation, setRotation] = useState<{ x: number; y: number }>({ x: 0.35, y: -0.45 });
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Auto-rotación sutil cuando el usuario no está arrastrando
  useEffect(() => {
    let animId: number;
    const animate = () => {
      if (!isDraggingRef.current) {
        setRotation((prev) => ({
          x: prev.x,
          y: prev.y + 0.008,
        }));
      }
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Dibujar el modelo 3D en el mini canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const scale = width * 0.34;

    const project = (v: Vector3D) => {
      let r = vRotateY(v, rotation.y);
      r = vRotateX(r, rotation.x);
      return {
        x: cx + r.x * scale,
        y: cy - r.y * scale, // Invertir Y
        z: r.z,
      };
    };

    ctx.strokeStyle = '#1e293b'; // Tinta oscura de dibujo técnico
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Dibujar aristas de mallas con vértices
    if (model.vertices && model.edges) {
      model.edges.forEach(([i1, i2]) => {
        const p1 = project(model.vertices[i1]);
        const p2 = project(model.vertices[i2]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });
    }

    // 2. Dibujar bucles y anillos curvos (Esferas, Toroides, Cilindros)
    if (model.rings) {
      model.rings.forEach((ring, ringIdx) => {
        if (ring.length < 2) return;
        ctx.beginPath();
        ring.forEach((pt, idx) => {
          const proj = project(pt);
          if (idx === 0) ctx.moveTo(proj.x, proj.y);
          else ctx.lineTo(proj.x, proj.y);
        });
        // Si el primer anillo es el ecuador o contorno principal, se acentúa
        ctx.lineWidth = ringIdx === 0 ? 2.0 : 1.4;
        ctx.strokeStyle = ringIdx === 0 ? '#0f172a' : '#475569';
        ctx.stroke();
      });
    }

    // 3. Dibujar aristas y siluetas tangenciales diferenciadas (más grises con trazo técnico)
    if (model.tangentRings) {
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = '#94a3b8'; // Visiblemente más gris (Slate-400)
      ctx.setLineDash([8, 3, 2, 3]); // Trazo cadena diferenciado
      model.tangentRings.forEach((ring) => {
        if (ring.length < 2) return;
        ctx.beginPath();
        ring.forEach((pt, idx) => {
          const proj = project(pt);
          if (idx === 0) ctx.moveTo(proj.x, proj.y);
          else ctx.lineTo(proj.x, proj.y);
        });
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }
  }, [model, rotation]);

  // Manejo de interacción de arrastre para rotar 360° libremente
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    setRotation((prev) => ({
      x: Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, prev.x + dy * 0.02)),
      y: prev.y + dx * 0.02,
    }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div
      className="bg-white border-2 border-black p-2 sm:p-2.5 shadow-[3px_3px_0px_#000000] flex flex-col items-center select-none cursor-grab active:cursor-grabbing transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
      title="Modelo 3D objetivo. Arrastra con el ratón para inspeccionar la figura en 360°"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={120}
          height={120}
          className="w-full h-full block"
        />
        <span className="absolute top-0 right-0 text-[9px] font-mono font-bold text-neutral-400 bg-neutral-100 border border-black px-1 leading-none shadow-[1px_1px_0px_#000000]">
          3D
        </span>
      </div>

      {/* Badge negro inferior con el nombre exacto de la figura al estilo Paplitz */}
      <div className="mt-1.5 w-full bg-black text-white text-center py-0.5 px-2 border border-black text-[10px] sm:text-xs font-mono font-black tracking-widest uppercase shadow-[1px_1px_0px_#000000]">
        {title || primitiveType}
      </div>
    </div>
  );
};
