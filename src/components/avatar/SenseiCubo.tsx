import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Avatar } from '@bible-strong/avatar-react';
import type { AvatarDefinition } from '@bible-strong/avatar-core';
import '@bible-strong/avatar-react/styles.css';
import cubeeDefinitionRaw from '../../lib/cubee.avatar.json';
import { AvatarMood } from '../../lib/avatarTypes';

const cubeeDefinition = cubeeDefinitionRaw as unknown as AvatarDefinition;

export interface SenseiCuboProps {
  mood?: AvatarMood;
  isDrawing?: boolean;
  activeNodeTitle?: string;
  onPoke?: () => void;
  size?: number;
  className?: string;
}

/**
 * Resuelve la posición de Cubito garantizando que:
 * 1. No se salga de la ventana visible (viewport).
 * 2. No invada la barra superior de cabecera / navegación (header con botones y XP).
 * 3. No invada el área del lienzo de dibujo ni sus botones de acción (marcados con [data-canvas-zone="true"]).
 */
function clampAndResolvePosition(
  candidateLeft: number,
  candidateTop: number,
  width: number,
  height: number
): { x: number; y: number } {
  const pad = 12;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  // 1. Límite superior definido por la barra de navegación (header)
  const headerEl = document.querySelector('header');
  const headerBottom = headerEl ? headerEl.getBoundingClientRect().bottom : 56;
  const minY = headerBottom + pad;
  const maxY = Math.max(minY, viewportH - height - pad);
  const minX = pad;
  const maxX = Math.max(minX, viewportW - width - pad);

  let x = Math.max(minX, Math.min(maxX, candidateLeft));
  let y = Math.max(minY, Math.min(maxY, candidateTop));

  // 2. Obstáculos: lienzo de dibujo, controles de lección y botones de acción
  const obstacleElements = document.querySelectorAll(
    '[data-canvas-zone="true"], [data-no-cubito="true"]'
  );

  obstacleElements.forEach((el) => {
    const obs = el.getBoundingClientRect();
    if (obs.width <= 0 || obs.height <= 0) return;

    const oL = obs.left - pad;
    const oR = obs.right + pad;
    const oT = obs.top - pad;
    const oB = obs.bottom + pad;

    const cL = x;
    const cR = x + width;
    const cT = y;
    const cB = y + height;

    // Verificar si hay solapamiento
    if (cR > oL && cL < oR && cB > oT && cT < oB) {
      const candidates: { x: number; y: number; dist: number }[] = [];

      // Empujar a la izquierda del obstáculo
      const targetLeft = oL - width;
      if (targetLeft >= minX) {
        candidates.push({ x: targetLeft, y, dist: cR - oL });
      }

      // Empujar a la derecha del obstáculo
      const targetRight = oR;
      if (targetRight <= maxX) {
        candidates.push({ x: targetRight, y, dist: oR - cL });
      }

      // Empujar arriba del obstáculo
      const targetTop = oT - height;
      if (targetTop >= minY) {
        candidates.push({ x, y: targetTop, dist: cB - oT });
      }

      // Empujar abajo del obstáculo
      const targetBottom = oB;
      if (targetBottom <= maxY) {
        candidates.push({ x, y: targetBottom, dist: oB - cT });
      }

      if (candidates.length > 0) {
        // Elegir la expulsión con menor desplazamiento
        candidates.sort((a, b) => a.dist - b.dist);
        x = candidates[0].x;
        y = candidates[0].y;
      } else {
        // Si por tamaño no cabe en los márgenes, ubicar en el lado con más espacio
        if (oL - minX > maxX - oR) {
          x = Math.max(minX, oL - width);
        } else {
          x = Math.min(maxX, oR);
        }
      }
    }
  });

  return { x, y };
}

/**
 * Sensei Cubo ("Cubito"):
 * Renderizado directamente mediante el motor oficial de @bible-strong/avatar-react
 * utilizando la definición de "Cubee":
 * - Ojos 100% blancos (#ffffff) y cuerpo oscuro mate (#16171a) estilo manga técnico.
 * - Sin sombras flotantes fijas debajo.
 * - Sin etiquetas de texto ni bocadillos informativos sobre el cubo.
 * - Seguimiento continuo y dinámico del ratón: los ojos y la cabeza rotan y miran allá donde se mueva el cursor.
 * - DRAGGABLE: Arrastrable libremente por el espacio mediante ratón o táctil, respetando límites de colisión
 *   para no invadir el lienzo de dibujo ni interferir con botones ni cabecera.
 * - Doble clic para devolver a Cubito a su posición de inicio.
 * - Al dibujar en el lienzo: entra en modo concentración ('working') siguiendo la punta del lápiz.
 * - Al pasar el ratón por encima (hover): reacciona poniéndose cabreado ('angry') o temblando de miedo ('scared').
 */
export const SenseiCubo: React.FC<SenseiCuboProps> = ({
  mood: externalMood,
  isDrawing = false,
  onPoke,
  size = 270,
  className = '',
}) => {
  const [currentAnimation, setCurrentAnimation] = useState<string>('idle');
  const [isPoked, setIsPoked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverReaction, setHoverReaction] = useState<'angry' | 'scared'>('scared');

  // Estado del arrastre (drag)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastActiveRef = useRef<number>(Date.now());
  const isSleepingRef = useRef<boolean>(false);
  const hoverToggleRef = useRef<boolean>(false);

  // Refs para gestión de arrastre sin re-renders a 60/120 FPS
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef<boolean>(false);
  const isPointerDownRef = useRef<boolean>(false);
  const startPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const totalDragDistRef = useRef<number>(0);
  const baseOriginRef = useRef<{ left: number; top: number; width: number; height: number }>({
    left: 0,
    top: 0,
    width: size,
    height: size,
  });

  // Mapear los eventos de la aplicación al catálogo de animaciones de Cubee
  useEffect(() => {
    lastActiveRef.current = Date.now();

    if (isDragging) {
      setCurrentAnimation('playful');
      return;
    }

    if (isPoked) {
      setCurrentAnimation('playful');
      return;
    }

    if (isHovered) {
      // Reacción de hover interactiva: 'angry' (cabreado) o 'scared' (tiembla de miedo)
      setCurrentAnimation(hoverReaction);
      return;
    }

    if (externalMood === 'success-stars') {
      setCurrentAnimation('celebrate');
    } else if (externalMood === 'fail-spiral') {
      setCurrentAnimation('sad');
    } else if (externalMood === 'speed-lightning') {
      setCurrentAnimation('excited');
    } else if (externalMood === 'streak-fire') {
      setCurrentAnimation('happy');
    } else if (externalMood === 'surprised') {
      setCurrentAnimation('surprised');
    } else if (externalMood === 'sleepy') {
      setCurrentAnimation('sleeping');
      isSleepingRef.current = true;
    } else if (isDrawing) {
      // Cuando el usuario está dibujando trazos en el lienzo: animación de concentración
      setCurrentAnimation('working');
    } else {
      setCurrentAnimation('idle');
    }
  }, [externalMood, isDrawing, isPoked, isHovered, hoverReaction, isDragging]);

  // Detector de inactividad para entrar en animación de sueño ('sleeping')
  useEffect(() => {
    const interval = setInterval(() => {
      const idleTime = Date.now() - lastActiveRef.current;
      if (
        idleTime > 20000 &&
        !isDrawing &&
        !isHovered &&
        !isDragging &&
        currentAnimation !== 'sleeping'
      ) {
        isSleepingRef.current = true;
        setCurrentAnimation('sleeping');
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isDrawing, isHovered, isDragging, currentAnimation]);

  // Detección de actividad del usuario para despertar a Cubito si estaba dormido
  useEffect(() => {
    const handleActivity = () => {
      lastActiveRef.current = Date.now();

      // Si estaba dormido y el usuario interactúa, despertar inmediatamente
      if (isSleepingRef.current) {
        isSleepingRef.current = false;
        setCurrentAnimation('waking');
        setTimeout(() => {
          setCurrentAnimation('idle');
        }, 1600);
      }
    };

    window.addEventListener('pointermove', handleActivity, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handleActivity);
    };
  }, []);

  // Re-validar posición ante cambio de tamaño de ventana para que nunca quede fuera
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      if (dragOffsetRef.current.x === 0 && dragOffsetRef.current.y === 0) return;

      const rect = containerRef.current.getBoundingClientRect();
      const curLeft = rect.left;
      const curTop = rect.top;
      const width = rect.width || size;
      const height = rect.height || size;

      const resolved = clampAndResolvePosition(curLeft, curTop, width, height);
      const diffX = resolved.x - curLeft;
      const diffY = resolved.y - curTop;

      if (Math.abs(diffX) > 1 || Math.abs(diffY) > 1) {
        const newOffsetX = dragOffsetRef.current.x + diffX;
        const newOffsetY = dragOffsetRef.current.y + diffY;
        dragOffsetRef.current = { x: newOffsetX, y: newOffsetY };
        setDragOffset({ x: newOffsetX, y: newOffsetY });
        containerRef.current.style.transform = `translate3d(${newOffsetX.toFixed(1)}px, ${newOffsetY.toFixed(1)}px, 0)`;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [size]);

  // ==========================================
  // GESTIÓN DE ARRASTRE (DRAGGING)
  // ==========================================
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Solo botón principal del ratón o toque
    if (e.button !== 0) return;

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    baseOriginRef.current = {
      left: rect.left - dragOffsetRef.current.x,
      top: rect.top - dragOffsetRef.current.y,
      width: rect.width || size,
      height: rect.height || size,
    };

    startPointerRef.current = { x: e.clientX, y: e.clientY };
    startOffsetRef.current = { ...dragOffsetRef.current };
    totalDragDistRef.current = 0;
    isPointerDownRef.current = true;
    isDraggingRef.current = false;

    // Capturar puntero para seguimiento fiable
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignorar si el navegador no lo soporta
    }
  }, [size]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;

    const dx = e.clientX - startPointerRef.current.x;
    const dy = e.clientY - startPointerRef.current.y;
    totalDragDistRef.current = Math.hypot(dx, dy);

    // Umbral de 4px para distinguir entre clic / poke y arrastre deliberado
    if (totalDragDistRef.current > 4) {
      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
        setIsDragging(true);
        setCurrentAnimation('playful');
      }

      const candLeft = baseOriginRef.current.left + startOffsetRef.current.x + dx;
      const candTop = baseOriginRef.current.top + startOffsetRef.current.y + dy;

      const resolved = clampAndResolvePosition(
        candLeft,
        candTop,
        baseOriginRef.current.width,
        baseOriginRef.current.height
      );

      const newOffsetX = resolved.x - baseOriginRef.current.left;
      const newOffsetY = resolved.y - baseOriginRef.current.top;

      dragOffsetRef.current = { x: newOffsetX, y: newOffsetY };

      if (containerRef.current) {
        containerRef.current.style.transform = `translate3d(${newOffsetX.toFixed(1)}px, ${newOffsetY.toFixed(1)}px, 0)`;
      }
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignorar
    }

    if (isDraggingRef.current || totalDragDistRef.current > 4) {
      // Finalizar arrastre y consolidar en el estado de React
      isDraggingRef.current = false;
      setIsDragging(false);
      setDragOffset({ ...dragOffsetRef.current });
      setCurrentAnimation('idle');
    } else {
      // Fue un toque o clic breve (poke)
      setIsPoked(true);
      if (onPoke) onPoke();
      setTimeout(() => {
        setIsPoked(false);
      }, 1800);
    }
  }, [onPoke]);

  // Doble clic: devolver a Cubito inmediatamente a su posición de inicio con animación
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResetting(true);
    dragOffsetRef.current = { x: 0, y: 0 };
    setDragOffset({ x: 0, y: 0 });

    if (containerRef.current) {
      containerRef.current.style.transform = 'translate3d(0px, 0px, 0)';
    }

    setTimeout(() => {
      setIsResetting(false);
    }, 400);
  }, []);

  // Pasar el ratón: alternar entre cabreado ('angry') y temblando de miedo ('scared')
  const handleMouseEnter = () => {
    if (isDraggingRef.current) return;
    hoverToggleRef.current = !hoverToggleRef.current;
    setHoverReaction(hoverToggleRef.current ? 'scared' : 'angry');
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const isScaredHover = isHovered && hoverReaction === 'scared';

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative flex flex-col items-center justify-center select-none group ${className}`}
      style={{
        transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`,
        transition: isResetting ? 'transform 0.38s cubic-bezier(0.18, 0.89, 0.32, 1.28)' : 'none',
        touchAction: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isDragging ? 50 : 30,
      }}
      title="Cubito · ¡Arrástrame donde quieras! (Doble clic para volver a mi sitio)"
    >
      {/* Contenedor del Avatar oficial de Bible Strong con temblor al asustarse y elevación al arrastrar */}
      <div
        className={`transition-all duration-150 ease-out ${
          isScaredHover && !isDragging ? 'cubito-tremor' : ''
        } ${isDragging ? 'scale-105 drop-shadow-2xl' : 'group-hover:scale-105'}`}
      >
        <Avatar
          definition={cubeeDefinition}
          animation={currentAnimation}
          size={size}
          className="transition-transform duration-200"
        />
      </div>
    </div>
  );
};
