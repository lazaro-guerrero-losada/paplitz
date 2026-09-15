import React from 'react';
import { AvatarMood } from '../../lib/avatarTypes';

interface EyeRenderProps {
  mood: AvatarMood;
  pupilX: number; // -1 to 1
  pupilY: number; // -1 to 1
  isBlinking: boolean;
  time: number;
}

/**
 * Renderiza los ojos del avatar según el estado de ánimo (mood).
 * IMPORTANTE: Por indicación de diseño y estilo técnico manga,
 * TODOS los ojos y efectos (estrellas, espirales, rayos, fuego) son SIEMPRE BLANCOS (#FFFFFF).
 */
export const AvatarEyes: React.FC<EyeRenderProps> = ({
  mood,
  pupilX,
  pupilY,
  isBlinking,
  time,
}) => {
  // Coordenadas base de los ojos dentro de la cara frontal (centrada en 0,0)
  const eyeSpacing = 16;
  const eyeBaseY = -2;

  // Si está parpadeando naturalmente (en moods que lo permiten)
  if (isBlinking && mood !== 'sleepy' && mood !== 'success-stars' && mood !== 'fail-spiral') {
    return (
      <g stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" fill="none">
        <line x1={-eyeSpacing - 6} y1={eyeBaseY} x2={-eyeSpacing + 6} y2={eyeBaseY} />
        <line x1={eyeSpacing - 6} y1={eyeBaseY} x2={eyeSpacing + 6} y2={eyeBaseY} />
      </g>
    );
  }

  // 1. ÉXITO: Ojos de Estrella blancos (★ ★) con giro suave
  if (mood === 'success-stars') {
    const starRotation = (time * 90) % 360;
    const starPath =
      'M 0 -8 L 2.4 -2.4 L 8 0 L 2.4 2.4 L 0 8 L -2.4 2.4 L -8 0 L -2.4 -2.4 Z';

    return (
      <g>
        {/* Ojo izquierdo: Estrella blanca */}
        <g transform={`translate(${-eyeSpacing}, ${eyeBaseY}) rotate(${starRotation})`}>
          <path d={starPath} fill="#FFFFFF" />
        </g>
        {/* Ojo derecho: Estrella blanca rotando al revés */}
        <g transform={`translate(${eyeSpacing}, ${eyeBaseY}) rotate(${-starRotation})`}>
          <path d={starPath} fill="#FFFFFF" />
        </g>

        {/* Destellos / Chispas blancas de celebración flotantes */}
        <g fill="#FFFFFF" opacity="0.9">
          <circle cx={-24 + Math.sin(time * 4) * 3} cy={-22 + Math.cos(time * 3) * 2} r="1.5" />
          <circle cx={24 + Math.cos(time * 4) * 3} cy={-24 + Math.sin(time * 3) * 2} r="2" />
          <path
            d="M 0 -26 L 1 -23 L 4 -22 L 1 -21 L 0 -18 L -1 -21 L -4 -22 L -1 -23 Z"
            transform={`rotate(${time * 45} 0 -22)`}
          />
        </g>
      </g>
    );
  }

  // 2. SUSPENSO: Ojos de Torbellino / Espiral blancos (🌀 🌀) giratorios
  if (mood === 'fail-spiral' || mood === 'poked') {
    const spiralRotation = (time * 180) % 360;

    return (
      <g>
        {/* Espiral izquierda blanca */}
        <g
          transform={`translate(${-eyeSpacing}, ${eyeBaseY}) rotate(${spiralRotation})`}
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        >
          <path d="M 0,0 A 2,2 0 0,1 2,2 A 4,4 0 0,1 -2,4 A 6,6 0 0,1 -6,-2 A 8,8 0 0,1 2,-6" />
        </g>
        {/* Espiral derecha blanca */}
        <g
          transform={`translate(${eyeSpacing}, ${eyeBaseY}) rotate(${-spiralRotation})`}
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        >
          <path d="M 0,0 A 2,2 0 0,1 2,2 A 4,4 0 0,1 -2,4 A 6,6 0 0,1 -6,-2 A 8,8 0 0,1 2,-6" />
        </g>

        {/* Gota de sudor manga blanca estilizada en la sien derecha */}
        <path
          d="M 28 -12 C 28 -16, 32 -20, 32 -20 C 32 -20, 36 -16, 36 -12 C 36 -9.8, 34.2 -8, 32 -8 C 29.8 -8, 28 -9.8, 28 -12 Z"
          fill="#FFFFFF"
          stroke="#000000"
          strokeWidth="0.8"
        />
      </g>
    );
  }

  // 3. CONCENTRACIÓN AL DIBUJAR: Ojos rasgados e intensos inclinados hacia el centro
  if (mood === 'drawing') {
    const px = pupilX * 3;
    const py = pupilY * 3;
    return (
      <g>
        {/* Ojo izquierdo: Rectángulo/rombo afilado blanco inclinado hacia abajo-adentro */}
        <g transform={`translate(${-eyeSpacing + px}, ${eyeBaseY + py}) rotate(14)`}>
          <polygon points="-7,-4 7,-1 6,2 -7,1" fill="#FFFFFF" />
          <circle cx={2} cy={0} r="1.4" fill="#000000" />
        </g>
        {/* Ojo derecho: Inclinado simétricamente */}
        <g transform={`translate(${eyeSpacing + px}, ${eyeBaseY + py}) rotate(-14)`}>
          <polygon points="-7,-1 7,-4 7,1 -6,2" fill="#FFFFFF" />
          <circle cx={-2} cy={0} r="1.4" fill="#000000" />
        </g>
      </g>
    );
  }

  // 4. VELOCIDAD: Ojos de Rayo blanco (⚡ ⚡)
  if (mood === 'speed-lightning') {
    const pulseScale = 1 + Math.sin(time * 15) * 0.12;
    const lightningPath = 'M -2 -8 L 3 -3 L 0 -2 L 3 6 L -3 1 L 0 0 Z';

    return (
      <g>
        <g
          transform={`translate(${-eyeSpacing}, ${eyeBaseY}) scale(${pulseScale})`}
          fill="#FFFFFF"
        >
          <path d={lightningPath} />
        </g>
        <g transform={`translate(${eyeSpacing}, ${eyeBaseY}) scale(${pulseScale})`} fill="#FFFFFF">
          <path d={lightningPath} />
        </g>
      </g>
    );
  }

  // 5. RACHA DE FUEGO: Ojos de Fuego estrictamente BLANCOS (🔥)
  if (mood === 'streak-fire') {
    const flameWiggle = Math.sin(time * 10) * 1.5;
    // Silueta de llama blanca
    const flameLeft = `M 0 7 C -4 7, -6 3, -6 0 C -6 -3, -3 -6, -1 -9 C -1 -7, 1 -6, 1 -5 C 2 -6, 4 -4, 4 -1 C 4 3, 3 7, 0 7 Z`;
    const flameRight = `M 0 7 C -4 7, -6 3, -6 0 C -6 -3, -3 -6, 0 -9 C 1 -7, 2 -6, 3 -5 C 4 -6, 5 -4, 5 -1 C 5 3, 3 7, 0 7 Z`;

    return (
      <g fill="#FFFFFF">
        <g transform={`translate(${-eyeSpacing}, ${eyeBaseY + flameWiggle}) scale(1.15)`}>
          <path d={flameLeft} />
        </g>
        <g transform={`translate(${eyeSpacing}, ${eyeBaseY - flameWiggle}) scale(1.15)`}>
          <path d={flameRight} />
        </g>
      </g>
    );
  }

  // 6. INACTIVIDAD / SUEÑO: Ojos cerrados relajados y "Zzz" flotante blanco
  if (mood === 'sleepy') {
    const zOffset1 = (time * 8) % 24;
    const zOffset2 = ((time * 8) + 12) % 24;

    return (
      <g>
        {/* Curvas de ojos cerrados descansando */}
        <path
          d={`M ${-eyeSpacing - 6} ${eyeBaseY + 1} Q ${-eyeSpacing} ${eyeBaseY + 5} ${-eyeSpacing + 6} ${eyeBaseY + 1}`}
          stroke="#FFFFFF"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M ${eyeSpacing - 6} ${eyeBaseY + 1} Q ${eyeSpacing} ${eyeBaseY + 5} ${eyeSpacing + 6} ${eyeBaseY + 1}`}
          stroke="#FFFFFF"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />

        {/* Letras Z blancas flotantes */}
        <g fill="#FFFFFF" fontFamily="monospace" fontWeight="bold" opacity="0.85">
          <text
            x={18 + Math.sin(time * 2) * 3}
            y={-14 - zOffset1}
            fontSize="8"
            textAnchor="middle"
          >
            z
          </text>
          <text
            x={24 + Math.cos(time * 2) * 3}
            y={-14 - zOffset2}
            fontSize="11"
            textAnchor="middle"
          >
            Z
          </text>
        </g>
      </g>
    );
  }

  // 7. SORPRESA: Ojos redondos abiertos de par en par (O O)
  if (mood === 'surprised') {
    return (
      <g>
        <circle cx={-eyeSpacing} cy={eyeBaseY} r="7.5" fill="#FFFFFF" />
        <circle cx={-eyeSpacing + pupilX * 2} cy={eyeBaseY + pupilY * 2} r="2.8" fill="#000000" />
        <circle cx={eyeSpacing} cy={eyeBaseY} r="7.5" fill="#FFFFFF" />
        <circle cx={eyeSpacing + pupilX * 2} cy={eyeBaseY + pupilY * 2} r="2.8" fill="#000000" />
        {/* Signo de admiración blanco */}
        <text
          x="0"
          y="-22"
          fill="#FFFFFF"
          fontFamily="monospace"
          fontWeight="bold"
          fontSize="14"
          textAnchor="middle"
        >
          !
        </text>
      </g>
    );
  }

  // 8. GUIÑO / ÁNIMO: Ojo izquierdo `^` y ojo derecho abierto
  if (mood === 'wink') {
    return (
      <g>
        {/* Guiño izquierdo: arco alegre */}
        <path
          d={`M ${-eyeSpacing - 6} ${eyeBaseY + 3} L ${-eyeSpacing} ${eyeBaseY - 3} L ${-eyeSpacing + 6} ${eyeBaseY + 3}`}
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Ojo derecho: píldora blanca alegre */}
        <rect
          x={eyeSpacing - 5}
          y={eyeBaseY - 7}
          width="10"
          height="14"
          rx="5"
          fill="#FFFFFF"
        />
        <circle cx={eyeSpacing} cy={eyeBaseY} r="2" fill="#000000" />
      </g>
    );
  }

  // 9. CURIOSO: Ojos amplios siguiendo activamente al puntero
  if (mood === 'curious') {
    const px = pupilX * 4.5;
    const py = pupilY * 4.5;
    return (
      <g>
        {/* Ojo izquierdo */}
        <rect
          x={-eyeSpacing - 6}
          y={eyeBaseY - 8}
          width="12"
          height="16"
          rx="6"
          fill="#FFFFFF"
        />
        <circle cx={-eyeSpacing + px} cy={eyeBaseY + py} r="2.6" fill="#000000" />
        <circle cx={-eyeSpacing + px - 1} cy={eyeBaseY + py - 1} r="1" fill="#FFFFFF" />

        {/* Ojo derecho */}
        <rect
          x={eyeSpacing - 6}
          y={eyeBaseY - 8}
          width="12"
          height="16"
          rx="6"
          fill="#FFFFFF"
        />
        <circle cx={eyeSpacing + px} cy={eyeBaseY + py} r="2.6" fill="#000000" />
        <circle cx={eyeSpacing + px - 1} cy={eyeBaseY + py - 1} r="1" fill="#FFFFFF" />
      </g>
    );
  }

  // 10. NEUTRAL (POR DEFECTO): Píldoras blancas clásicas con pupila negra que sigue al ratón
  const px = pupilX * 3.5;
  const py = pupilY * 3.5;
  return (
    <g>
      {/* Ojo izquierdo */}
      <rect
        x={-eyeSpacing - 5}
        y={eyeBaseY - 7}
        width="10"
        height="14"
        rx="5"
        fill="#FFFFFF"
      />
      <circle cx={-eyeSpacing + px} cy={eyeBaseY + py} r="2.2" fill="#000000" />
      <circle cx={-eyeSpacing + px - 0.8} cy={eyeBaseY + py - 0.8} r="0.8" fill="#FFFFFF" />

      {/* Ojo derecho */}
      <rect
        x={eyeSpacing - 5}
        y={eyeBaseY - 7}
        width="10"
        height="14"
        rx="5"
        fill="#FFFFFF"
      />
      <circle cx={eyeSpacing + px} cy={eyeBaseY + py} r="2.2" fill="#000000" />
      <circle cx={eyeSpacing + px - 0.8} cy={eyeBaseY + py - 0.8} r="0.8" fill="#FFFFFF" />
    </g>
  );
};
