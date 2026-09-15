import React, { useState } from 'react';
import { Flame, Trophy, RotateCcw, Award, CheckCircle, BarChart2, BookOpen, Unlock, Lock, Sparkles, ShoppingBag } from 'lucide-react';
import { calculatePlayerLevel } from '../lib/levelSystem';
import { DEFAULT_COSMETICS } from '../lib/avatarTypes';
import { Avatar } from '@bible-strong/avatar-react';
import type { AvatarDefinition } from '@bible-strong/avatar-core';
import cubeeDefinitionRaw from '../lib/cubee.avatar.json';

const cubeeDefinition = cubeeDefinitionRaw as unknown as AvatarDefinition;

interface ProfileViewProps {
  streak: number;
  xp: number;
  completedNodesCount: number;
  totalNodesCount: number;
  accuracyAverage: number;
  areAllNodesUnlocked: boolean;
  onUnlockAllNodes: () => void;
  onLockAllNodes?: () => void;
  onResetProgress: () => void;
  onOpenGuide?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  streak,
  xp,
  completedNodesCount,
  totalNodesCount,
  accuracyAverage,
  areAllNodesUnlocked,
  onUnlockAllNodes,
  onLockAllNodes,
  onResetProgress,
  onOpenGuide,
}) => {
  const levelInfo = calculatePlayerLevel(xp);
  const [testAnimation, setTestAnimation] = useState<string>('celebrate');

  return (
    <div className="max-w-2xl w-full mx-auto py-8 px-4">
      {/* Título de Perfil */}
      <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest bg-black text-white px-2 py-0.5 font-bold">
            CUADERNO DE DIBUJANTE
          </span>
          <h2 className="text-3xl font-bold font-display mt-1">Mi Perfil & Estadísticas</h2>
        </div>
        <div className="w-12 h-12 border-2 border-black pattern-dots-dense flex items-center justify-center">
          <Award className="w-6 h-6 stroke-[2]" />
        </div>
      </div>

      {/* Tarjeta de Rango & Nivel de Dibujante */}
      <div className="border-2 border-black p-4 mb-6 bg-white shadow-[3px_3px_0px_#000000]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-black text-white px-2 py-0.5 font-bold">
              NIVEL {levelInfo.level}
            </span>
            <span className="font-bold text-sm">{levelInfo.title}</span>
          </div>
          {onOpenGuide && (
            <button
              onClick={onOpenGuide}
              className="btn-ink-outline px-2.5 py-1 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Guía de Niveles</span>
            </button>
          )}
        </div>

        {/* Barra de progreso de XP */}
        <div className="w-full h-3 border-2 border-black bg-neutral-100 overflow-hidden relative mb-1.5">
          <div
            className="h-full bg-black transition-all duration-300"
            style={{ width: `${levelInfo.progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500">
          <span>
            {levelInfo.xpInCurrentLevel} / {levelInfo.xpNeededForCurrentLevel} XP ({levelInfo.progressPercent}%)
          </span>
          {levelInfo.xpRemaining > 0 ? (
            <span>Faltan {levelInfo.xpRemaining} XP para Nivel {levelInfo.level + 1}</span>
          ) : (
            <span className="font-bold text-black">¡Nivel Máximo de Maestro!</span>
          )}
        </div>
      </div>

      {/* Tarjetas de Estadísticas Principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {/* Racha */}
        <div className="card-ink p-4 text-center bg-white">
          <Flame className="w-6 h-6 mx-auto mb-1 text-black stroke-[2.5]" />
          <div className="text-2xl font-bold font-display">{streak}</div>
          <div className="text-[10px] font-mono uppercase text-neutral-500">Días de Racha</div>
        </div>

        {/* XP Total */}
        <div className="card-ink p-4 text-center bg-white">
          <Trophy className="w-6 h-6 mx-auto mb-1 text-black stroke-[2]" />
          <div className="text-2xl font-bold font-display">{xp}</div>
          <div className="text-[10px] font-mono uppercase text-neutral-500">XP Acumulado</div>
        </div>

        {/* Ejercicios Completados */}
        <div className="card-ink p-4 text-center bg-white">
          <CheckCircle className="w-6 h-6 mx-auto mb-1 text-black stroke-[2]" />
          <div className="text-2xl font-bold font-display">
            {completedNodesCount} / {totalNodesCount}
          </div>
          <div className="text-[10px] font-mono uppercase text-neutral-500">Niveles Superados</div>
        </div>

        {/* Precisión Media */}
        <div className="card-ink p-4 text-center bg-white">
          <BarChart2 className="w-6 h-6 mx-auto mb-1 text-black stroke-[2]" />
          <div className="text-2xl font-bold font-display">{accuracyAverage}%</div>
          <div className="text-[10px] font-mono uppercase text-neutral-500">Precisión Media</div>
        </div>
      </div>

      {/* Sección Didáctica: Consejos Personalizados de Koos Eissen */}
      <div className="card-ink p-6 mb-8 bg-white">
        <h3 className="text-lg font-bold font-display mb-3">Consejos para tu Memoria Muscular</h3>
        <ul className="space-y-3">
          <li className="text-xs font-sans p-3 border border-black bg-neutral-50 flex items-start gap-2">
            <span className="font-mono font-bold text-sm">01</span>
            <span>
              <strong>Técnica de Ghosting:</strong> Antes de apoyar la punta del lápiz o stylus, haz 2 pasadas rápidas en el aire siguiendo la trayectoria de la arista.
            </span>
          </li>
          <li className="text-xs font-sans p-3 border border-black bg-neutral-50 flex items-start gap-2">
            <span className="font-mono font-bold text-sm">02</span>
            <span>
              <strong>Dibuja con el Codo y Hombro:</strong> Bloquea la muñeca para trazos largos de perspectiva. La muñeca solo sirve para detalles diminutos.
            </span>
          </li>
          <li className="text-xs font-sans p-3 border border-black bg-neutral-50 flex items-start gap-2">
            <span className="font-mono font-bold text-sm">03</span>
            <span>
              <strong>Ejes de Perspectiva (X, Y, Z):</strong> La arista frontal más cercana es tu ancla (Eje Z). Las demás líneas deben converger hacia sus respectivos puntos de fuga en el horizonte sin abrirse en abanico.
            </span>
          </li>
        </ul>
      </div>

      {/* SECCIÓN DEL AVATAR COMPAÑERO: CUBITO */}
      <div className="card-ink p-6 mb-8 bg-white border-2 border-black shadow-[3px_3px_0px_#000000]">
        <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 stroke-[2.5]" />
            <h3 className="text-xl font-bold font-display">Compañero de Dibujo: Cubito</h3>
          </div>
          <span className="text-[10px] font-mono bg-black text-white px-2 py-0.5 font-bold">
            PROBADOR DE EMOCIONES
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
          {/* Vista previa de Cubito con el motor oficial */}
          <div className="w-36 h-36 border-2 border-black bg-neutral-900 flex items-center justify-center relative shadow-[3px_3px_0px_#000000] overflow-hidden p-1">
            <Avatar
              definition={cubeeDefinition}
              animation={testAnimation}
              size={135}
            />
            <div className="absolute bottom-1 right-2 text-[9px] font-mono font-bold bg-black text-white px-1 border border-white">
              {testAnimation}
            </div>
          </div>

          {/* Selector interactivo de animaciones */}
          <div className="flex-1">
            <span className="text-xs font-mono font-bold block mb-2">
              Probar animaciones nativas del motor (Cubo y ojos orgánicos):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'idle', label: 'Idle (Natural)' },
                { id: 'celebrate', label: '★ Aprobado (Celebrate)' },
                { id: 'sad', label: '🌀 Suspenso (Sad)' },
                { id: 'working', label: 'Concentrado (Working)' },
                { id: 'excited', label: '⚡ Rápido (Excited)' },
                { id: 'happy', label: 'Feliz (Happy)' },
                { id: 'sleeping', label: '💤 Dormido (Sleeping)' },
                { id: 'waking', label: 'Despertar (Waking)' },
                { id: 'surprised', label: 'Sorpresa (Surprised)' },
                { id: 'playful', label: 'Juguetón (Playful)' },
                { id: 'thinking', label: 'Pensativo (Thinking)' },
                { id: 'curious', label: 'Curioso (Curious)' },
                { id: 'angry', label: '😠 Cabreado (Angry)' },
                { id: 'scared', label: '😨 Miedo (Scared)' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setTestAnimation(m.id)}
                  className={`text-xs font-mono px-2.5 py-1 border border-black cursor-pointer transition-all ${
                    testAnimation === m.id
                      ? 'bg-black text-white font-bold shadow-[1px_1px_0px_#000000]'
                      : 'bg-white hover:bg-neutral-100 text-black'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Vitrina de Atuendos con XP (Preparación a Futuro) */}
        <div className="border-t border-black/20 pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4" />
              <span>Armario de Atuendos (Próximamente con XP)</span>
            </span>
            <span className="text-[10px] font-mono text-neutral-500">
              Tu saldo: <strong>{xp} XP</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {DEFAULT_COSMETICS.map((cosmetic) => (
              <div
                key={cosmetic.id}
                className="p-2.5 border border-black bg-neutral-50 flex items-center justify-between text-xs font-mono"
              >
                <div>
                  <div className="font-bold font-sans">{cosmetic.name}</div>
                  <div className="text-[10px] text-neutral-500 font-sans">{cosmetic.description}</div>
                </div>
                <span className="text-[11px] font-bold border border-black px-2 py-0.5 bg-white shrink-0 ml-2">
                  {cosmetic.priceXP} XP
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODO MAESTRO / DESBLOQUEO DE TODOS LOS NIVELES */}
      <div className="border-2 border-black p-5 mb-8 bg-white shadow-[3px_3px_0px_#000000]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 border-2 border-black bg-neutral-100 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000000]">
              <Unlock className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base">Desbloquear Todos los Niveles</h3>
                {areAllNodesUnlocked && (
                  <span className="text-[10px] font-mono uppercase bg-black text-white px-1.5 py-0.2 font-bold">
                    TODO DESBLOQUEADO
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-600 font-sans mt-1">
                Desbloquea al instante todas las lecciones del Camino y filtros de minijuegos para comprobar cualquier ejercicio o practicar libremente sin tener que superar cada nivel previo uno por uno.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {areAllNodesUnlocked ? (
              <button
                onClick={onLockAllNodes}
                className="btn-ink-outline px-3.5 py-2 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer hover:bg-black hover:text-white"
                title="Restablecer el bloqueo progresivo estándar"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Restablecer Bloqueo</span>
              </button>
            ) : (
              <button
                onClick={onUnlockAllNodes}
                className="btn-ink px-4 py-2 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
                title="Desbloquear todas las lecciones y exámenes"
              >
                <Unlock className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Desbloquear Todo</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Zona de peligro: Reiniciar progreso */}
      <div className="border-2 border-dashed border-neutral-400 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="font-display font-bold text-base">Reiniciar Progreso de la Cuenta</div>
          <div className="text-xs text-neutral-500 font-sans">
            Borra las estadísticas, racha, puntos XP y vuelve a bloquear los niveles del camino.
          </div>
        </div>

        <button
          onClick={() => {
            if (window.confirm('¿Seguro que quieres reiniciar todo tu progreso a 0?')) {
              onResetProgress();
            }
          }}
          className="btn-ink-outline px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer shrink-0 font-mono hover:bg-black hover:text-white"
        >
          <RotateCcw className="w-4 h-4" />
          Reiniciar Progreso
        </button>
      </div>
    </div>
  );
};
