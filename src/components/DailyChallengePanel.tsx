import React, { useState } from 'react';
import { LessonNode } from '../lib/curriculumData';
import { DailySetSession, DailySetHistoryItem } from '../lib/dailyChallenge';
import { Target, ChevronDown, ChevronUp, History, Play, X, Award, Sparkles, Layers } from 'lucide-react';

interface DailyChallengePanelProps {
  unlockedNodes: LessonNode[];
  activeSession: DailySetSession | null;
  onStartChallenge: (count: number, levelMode: 'random' | 'specific', selectedNodeIds: string[]) => void;
  onCancelChallenge: () => void;
  history: DailySetHistoryItem[];
  onClearHistory: () => void;
}

export const DailyChallengePanel: React.FC<DailyChallengePanelProps> = ({
  unlockedNodes,
  activeSession,
  onStartChallenge,
  onCancelChallenge,
  history,
  onClearHistory,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'challenge' | 'history'>('challenge');

  // Configuración de nuevo reto
  const [selectedCount, setSelectedCount] = useState<number>(12);
  const [customCountInput, setCustomCountInput] = useState<string>('12');
  const [isCustomCount, setIsCustomCount] = useState<boolean>(false);
  const [levelMode, setLevelMode] = useState<'random' | 'specific'>('random');
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(() => {
    return unlockedNodes.length > 0 ? [unlockedNodes[unlockedNodes.length - 1].id] : [];
  });
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const presets = [6, 12, 18, 24];

  const handleSelectPreset = (count: number) => {
    setSelectedCount(count);
    setCustomCountInput(count.toString());
    setIsCustomCount(false);
  };

  const handleCustomCountChange = (val: string) => {
    setCustomCountInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 30) {
      setSelectedCount(parsed);
      setIsCustomCount(true);
    }
  };

  const toggleNodeSelection = (nodeId: string) => {
    setSelectedNodeIds((prev) => {
      if (prev.includes(nodeId)) {
        if (prev.length === 1) return prev; // Mantener al menos uno seleccionado
        return prev.filter((id) => id !== nodeId);
      } else {
        return [...prev, nodeId];
      }
    });
  };

  const handleStart = () => {
    const finalCount = Math.max(1, Math.min(30, selectedCount));
    onStartChallenge(finalCount, levelMode, selectedNodeIds);
  };

  // Promedio actual de las puntuaciones validadas en el reto activo
  const scoredProblems = activeSession?.problems.filter((p) => p.score !== undefined) || [];
  const currentAverage = scoredProblems.length > 0
    ? Math.round(scoredProblems.reduce((sum, p) => sum + (p.score || 0), 0) / scoredProblems.length)
    : 0;

  return (
    <div className="w-full border-2 border-black bg-white shadow-[3px_3px_0px_#000000] font-sans text-xs">
      {/* 1. BARRA SUPERIOR DESPLEGABLE (SIEMPRE VISIBLE / DISCRETA) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full p-2.5 sm:p-3 flex items-center justify-between bg-white hover:bg-neutral-50 cursor-pointer transition-colors text-left select-none border-none outline-none"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 border border-black bg-black text-white flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#000000]">
            <Target className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-display font-bold text-xs uppercase tracking-tight text-black">
                Reto Diario
              </span>
              <span className="text-[10px] font-mono text-neutral-500 uppercase hidden xs:inline">
                · Hábito lámina
              </span>
            </div>
            {activeSession && !activeSession.isCompleted ? (
              <div className="text-[10px] font-mono font-bold text-black flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                <span>En curso: {activeSession.currentIndex + 1}/{activeSession.totalCount}</span>
                {scoredProblems.length > 0 && (
                  <span className="text-neutral-600">({currentAverage}% media)</span>
                )}
              </div>
            ) : (
              <span className="text-[10px] text-neutral-500 block truncate">
                Mini-set de práctica ({selectedCount} cubos)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {activeSession && !activeSession.isCompleted ? (
            <span className="bg-black text-white text-[10px] font-mono font-bold px-1.5 py-0.5 shadow-[1px_1px_0px_#000000]">
              {Math.round((activeSession.currentIndex / activeSession.totalCount) * 100)}%
            </span>
          ) : (
            <span className="border border-black bg-neutral-100 text-black text-[10px] font-mono font-bold px-1.5 py-0.5">
              {selectedCount} Ej.
            </span>
          )}
          <div className="p-1 border border-black bg-white shadow-[1px_1px_0px_#000000]">
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </div>
      </button>

      {/* 2. CONTENIDO DESPLEGABLE */}
      {isOpen && (
        <div className="border-t-2 border-black p-3 bg-neutral-50">
          {/* Pestañas internas: Configurar Reto vs Historial */}
          <div className="flex border-2 border-black mb-3 bg-white shadow-[2px_2px_0px_#000000]">
            <button
              type="button"
              onClick={() => setActiveTab('challenge')}
              className={`flex-1 py-1.5 text-center font-mono font-bold text-[11px] uppercase transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'challenge' ? 'bg-black text-white' : 'text-black hover:bg-neutral-100'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>{activeSession && !activeSession.isCompleted ? 'Reto en Curso' : 'Configurar'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-1.5 text-center font-mono font-bold text-[11px] uppercase transition-colors cursor-pointer flex items-center justify-center gap-1.5 border-l-2 border-black ${
                activeTab === 'history' ? 'bg-black text-white' : 'text-black hover:bg-neutral-100'
              }`}
            >
              <History className="w-3 h-3" />
              <span>Historial ({history.length})</span>
            </button>
          </div>

          {/* TAB 1: RETO DIARIO */}
          {activeTab === 'challenge' && (
            <div>
              {/* Si hay un reto activo */}
              {activeSession && !activeSession.isCompleted ? (
                <div className="space-y-3">
                  <div className="bg-white border-2 border-black p-2.5 shadow-[2px_2px_0px_#000000]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-bold text-xs uppercase">
                        Ejercicio {activeSession.currentIndex + 1} de {activeSession.totalCount}
                      </span>
                      <span className="font-mono font-bold text-[11px] bg-black text-white px-1.5 py-0.2">
                        {scoredProblems.length > 0 ? `${currentAverage}% media` : 'Iniciando'}
                      </span>
                    </div>

                    {/* Barra de progreso visual */}
                    <div className="w-full h-2.5 border border-black bg-neutral-100 overflow-hidden mb-2">
                      <div
                        className="h-full bg-black transition-all duration-300"
                        style={{
                          width: `${Math.round(
                            ((activeSession.currentIndex + (scoredProblems.length > activeSession.currentIndex ? 1 : 0)) /
                              activeSession.totalCount) *
                              100
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="text-[11px] font-sans text-neutral-600 mb-2">
                      Lección actual: <strong>{activeSession.problems[activeSession.currentIndex]?.node.code}</strong> · {activeSession.problems[activeSession.currentIndex]?.node.title}
                    </div>

                    {/* Rejilla de notas de cada ejercicio del lote actual (estilo lámina A4) */}
                    <div className="border border-black bg-neutral-50 p-1.5 mb-2">
                      <span className="text-[9px] font-mono text-neutral-500 uppercase font-bold block mb-1">
                        Puntuaciones del lote:
                      </span>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
                        {activeSession.problems.map((p, idx) => {
                          const isCurrent = idx === activeSession.currentIndex;
                          const hasScore = p.score !== undefined;
                          return (
                            <div
                              key={p.id}
                              className={`p-1 text-center border font-mono text-[9px] ${
                                isCurrent
                                  ? 'border-2 border-black bg-white font-bold ring-1 ring-black'
                                  : hasScore
                                  ? 'border-black bg-neutral-200 font-bold'
                                  : 'border-neutral-300 text-neutral-400 bg-white'
                              }`}
                              title={`Ejercicio #${idx + 1}: ${p.node.code}`}
                            >
                              <div className="text-[8px] text-neutral-500 leading-none">#{idx + 1}</div>
                              <div className="text-[10px] leading-tight font-bold">
                                {hasScore ? `${p.score}%` : isCurrent ? '✎' : '·'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <p className="text-[10px] text-neutral-500 font-sans leading-tight">
                      Dibuja en el lienzo y pulsa <strong>Comprobar</strong>. Al pulsar <strong>Siguiente</strong> pasarás al próximo ejercicio del lote hasta completar los {activeSession.totalCount}.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('¿Seguro que deseas cancelar el reto diario actual? Perderás el progreso de este lote.')) {
                        onCancelChallenge();
                      }
                    }}
                    className="btn-ink-outline w-full py-1.5 text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 text-neutral-600 hover:text-black cursor-pointer shadow-[1px_1px_0px_#000000]"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancelar Reto Diario</span>
                  </button>
                </div>
              ) : (
                /* Configuración para iniciar un nuevo lote */
                <div className="space-y-3">
                  <div>
                    <label className="font-mono font-bold text-[11px] uppercase block mb-1 text-black">
                      Número de Ejercicios:
                    </label>
                    <div className="grid grid-cols-5 gap-1 mb-1">
                      {presets.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          className={`py-1 text-center font-mono font-bold text-xs border border-black cursor-pointer transition-colors shadow-[1px_1px_0px_#000000] ${
                            selectedCount === preset && !isCustomCount
                              ? 'bg-black text-white'
                              : 'bg-white hover:bg-neutral-100 text-black'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={customCountInput}
                          onChange={(e) => handleCustomCountChange(e.target.value)}
                          placeholder="Otro"
                          className={`w-full py-1 px-1 text-center font-mono font-bold text-xs border border-black outline-none bg-white shadow-[1px_1px_0px_#000000] ${
                            isCustomCount ? 'bg-black text-white' : ''
                          }`}
                          title="Número personalizado (1 a 30)"
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-sans block">
                      Preset recomendado: <strong>12 ejercicios</strong> (igual que una lámina A4 analógica).
                    </span>
                  </div>

                  <div>
                    <label className="font-mono font-bold text-[11px] uppercase block mb-1 text-black">
                      Selección de Niveles:
                    </label>
                    <div className="grid grid-cols-2 gap-1 mb-2">
                      <button
                        type="button"
                        onClick={() => setLevelMode('random')}
                        className={`py-1.5 px-2 text-center font-mono font-bold text-[11px] border border-black cursor-pointer transition-colors shadow-[1px_1px_0px_#000000] flex items-center justify-center gap-1 ${
                          levelMode === 'random'
                            ? 'bg-black text-white'
                            : 'bg-white hover:bg-neutral-100 text-black'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Aleatorio ({unlockedNodes.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLevelMode('specific')}
                        className={`py-1.5 px-2 text-center font-mono font-bold text-[11px] border border-black cursor-pointer transition-colors shadow-[1px_1px_0px_#000000] flex items-center justify-center gap-1 ${
                          levelMode === 'specific'
                            ? 'bg-black text-white'
                            : 'bg-white hover:bg-neutral-100 text-black'
                        }`}
                      >
                        <span>Específicos</span>
                      </button>
                    </div>

                    {/* Selector de niveles específicos cuando está activado */}
                    {levelMode === 'specific' && (
                      <div className="border border-black bg-white p-2 max-h-36 overflow-y-auto space-y-1 mb-2 shadow-[1px_1px_0px_#000000]">
                        <span className="text-[9px] font-mono text-neutral-500 uppercase font-bold block mb-1">
                          Solo niveles superados o desbloqueados:
                        </span>
                        {unlockedNodes.map((node) => {
                          const isSelected = selectedNodeIds.includes(node.id);
                          return (
                            <label
                              key={node.id}
                              className={`flex items-center gap-2 p-1 border cursor-pointer select-none transition-colors ${
                                isSelected
                                  ? 'border-black bg-neutral-100 font-bold'
                                  : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleNodeSelection(node.id)}
                                className="accent-black w-3.5 h-3.5"
                              />
                              <span className="font-mono text-[10px] bg-black text-white px-1">
                                {node.code}
                              </span>
                              <span className="text-[11px] truncate flex-1">{node.title}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Botón de Iniciar Reto */}
                  <button
                    type="button"
                    onClick={handleStart}
                    className="btn-ink w-full py-2.5 text-xs font-mono uppercase font-bold flex items-center justify-center gap-2 cursor-pointer shadow-[2px_2px_0px_#000000]"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Comenzar Reto ({selectedCount} Ejercicios)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HISTORIAL DE RETOS DIARIOS */}
          {activeTab === 'history' && (
            <div>
              {history.length === 0 ? (
                <div className="p-4 text-center border border-dashed border-black bg-white">
                  <Award className="w-8 h-8 mx-auto mb-2 text-neutral-400 stroke-[1.5]" />
                  <p className="font-mono font-bold text-xs mb-1">Sin retos completados</p>
                  <p className="text-[10px] text-neutral-500 font-sans">
                    Completa tu primer lote de {selectedCount} ejercicios para ver aquí todas tus notas desglosadas, igual que en las láminas impresas.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 pb-1 border-b border-black">
                    <span>{history.length} lote(s) completado(s)</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('¿Deseas vaciar el historial de retos diarios?')) {
                          onClearHistory();
                        }
                      }}
                      className="hover:text-black underline cursor-pointer"
                    >
                      Limpiar historial
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 pr-0.5">
                    {history.map((item) => {
                      const isExpanded = expandedHistoryId === item.id;
                      const dateObj = new Date(item.date);
                      const formattedDate = dateObj.toLocaleDateString(undefined, {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <div
                          key={item.id}
                          className="border-2 border-black bg-white p-2 shadow-[2px_2px_0px_#000000]"
                        >
                          <div
                            onClick={() => setExpandedHistoryId(isExpanded ? null : item.id)}
                            className="flex items-center justify-between cursor-pointer"
                          >
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-bold text-xs">
                                  Lote de {item.totalCount} ej.
                                </span>
                                <span className="text-[9px] font-mono bg-neutral-100 border border-black px-1">
                                  {item.levelMode === 'random' ? 'Aleatorio' : item.levelSummary}
                                </span>
                              </div>
                              <span className="text-[9px] font-mono text-neutral-500">
                                {formattedDate} · {item.passedCount}/{item.totalCount} superados
                              </span>
                            </div>

                            <div className="text-right flex items-center gap-2">
                              <div>
                                <span
                                  className={`text-sm font-bold font-display px-1.5 py-0.5 border ${
                                    item.averageScore >= 75
                                      ? 'bg-black text-white border-black'
                                      : 'bg-white text-black border-black'
                                  }`}
                                >
                                  {item.averageScore}%
                                </span>
                                <span className="block text-[8px] font-mono uppercase text-neutral-500">
                                  Media
                                </span>
                              </div>
                              <div className="p-0.5 border border-black text-black">
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Desglose de cada casilla de la lámina */}
                          {isExpanded && (
                            <div className="mt-2.5 pt-2 border-t border-black bg-neutral-50 p-1.5">
                              <span className="text-[9px] font-mono text-neutral-500 uppercase font-bold block mb-1">
                                Calificaciones individuales por ejercicio:
                              </span>
                              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
                                {item.marks.map((m) => (
                                  <div
                                    key={m.index}
                                    className={`p-1 text-center border font-mono ${
                                      m.passed
                                        ? 'border-black bg-white'
                                        : 'border-neutral-300 bg-neutral-100 text-neutral-500'
                                    }`}
                                    title={`Casilla #${m.index}: ${m.nodeCode} (${m.nodeTitle})`}
                                  >
                                    <div className="text-[8px] text-neutral-500 leading-none">#{m.index}</div>
                                    <div className="text-[10px] font-bold leading-tight">{m.score}%</div>
                                    <div className="text-[7px] text-neutral-600 truncate">{m.nodeCode}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
