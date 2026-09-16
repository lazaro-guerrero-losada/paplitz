import { useState, useEffect } from 'react';
import { MODULE_PARALLELEPIPEDS, LessonNode, Unit } from './lib/curriculumData';
import { generateCubeChallenge, CubeChallenge } from './lib/geometry';
import { validateCubeDrawing, ValidationFeedback, UserStroke } from './lib/validation';
import { DrawingCanvas } from './components/DrawingCanvas';
import { LearningPath } from './components/LearningPath';
import { GuidebookModal } from './components/GuidebookModal';
import { AnalogSheetsModal } from './components/AnalogSheetsModal';
import { ProfileView } from './components/ProfileView';
import { MinigamesView } from './components/MinigamesView';
import { LevelGuideModal } from './components/LevelGuideModal';
import { PlacementModal } from './components/PlacementModal';
import { calculatePlayerLevel } from './lib/levelSystem';
import { SenseiCubo } from './components/avatar/SenseiCubo';
import { AvatarMood } from './lib/avatarTypes';
import { Flame, Printer, Compass, Map, User, RefreshCw, Filter, PenTool, Gamepad2, BookOpen, Zap, Menu, X, ChevronRight } from 'lucide-react';
import { PaplitzSaveData, applySaveDataToLocalStorage, fastForwardCurriculum } from './lib/saveSystem';

function GithubIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export function App() {
  // Pestañas principales: 'practice' (Home / Práctica Rápida), 'path' (El Camino), 'minigames' (Minijuegos), 'profile' (Perfil)
  const [activeTab, setActiveTab] = useState<'practice' | 'path' | 'minigames' | 'profile'>('practice');

  // Estado del Menú Lateral Móvil (Drawer) y Detección de Orientación
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showRotatePrompt, setShowRotatePrompt] = useState<boolean>(true);
  const [isPortraitMobile, setIsPortraitMobile] = useState<boolean>(false);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);

  // Estado del Avatar Acompañante Cúbico ("Cubito")
  const [avatarMood, setAvatarMood] = useState<AvatarMood>('neutral');
  const [isUserDrawing, setIsUserDrawing] = useState<boolean>(false);

  // Estado del Currículum / Camino
  // Estado del Currículum / Camino (fusionando progreso guardado con la estructura actual)
  const [units, setUnits] = useState<Unit[]>(() => {
    const saved = localStorage.getItem('paplitz_units');
    if (!saved) return MODULE_PARALLELEPIPEDS.units;
    try {
      const parsed: Unit[] = JSON.parse(saved);
      return MODULE_PARALLELEPIPEDS.units.map((defaultUnit) => {
        const savedUnit = parsed.find((u) => u.id === defaultUnit.id);
        if (!savedUnit) return defaultUnit;
        return {
          ...defaultUnit,
          nodes: defaultUnit.nodes.map((defaultNode) => {
            const savedNode = savedUnit.nodes.find((n) => n.id === defaultNode.id);
            return savedNode
              ? { ...defaultNode, status: savedNode.status, score: savedNode.score }
              : defaultNode;
          }),
        };
      });
    } catch {
      return MODULE_PARALLELEPIPEDS.units;
    }
  });

  // Lista aplanada de todos los nodos del camino
  const allNodes = units.flatMap((u) => u.nodes);
  const unlockedNodes = allNodes.filter((n) => n.status !== 'locked');

  // Nodo activo seleccionado
  const [activeNode, setActiveNode] = useState<LessonNode>(() => {
    return allNodes.find((n) => n.status === 'current') || allNodes[0];
  });

  // Modales
  const [guidebookUnit, setGuidebookUnit] = useState<Unit | null>(null);
  const [showAnalogModal, setShowAnalogModal] = useState(false);

  // Desafío de Dibujo actual
  const [challenge, setChallenge] = useState<CubeChallenge>(() => {
    const initial = allNodes.find((n) => n.status === 'current') || allNodes[0];
    return generateCubeChallenge(101, 600, 540, {
      mode: initial.perspectiveMode,
      axesMode: initial.axesMode,
      forceSide: initial.forceSide,
      isShadowLevel: initial.isShadowLevel,
      hasGroundGrid: initial.hasGroundGrid,
    });
  });
  const [strokes, setStrokes] = useState<UserStroke[]>([]);
  const [feedback, setFeedback] = useState<ValidationFeedback | null>(null);
  const [showSolution, setShowSolution] = useState(false);

  // Gamificación y Progreso
  const [streak, setStreak] = useState<number>(() => {
    const saved = localStorage.getItem('paplitz_streak');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [xp, setXp] = useState<number>(() => {
    const saved = localStorage.getItem('paplitz_xp');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [scoresHistory, setScoresHistory] = useState<number[]>(() => {
    const saved = localStorage.getItem('paplitz_scores');
    return saved ? JSON.parse(saved) : [];
  });
  const [showLevelGuide, setShowLevelGuide] = useState<boolean>(false);
  const [isPlacementModalOpen, setIsPlacementModalOpen] = useState<boolean>(false);
  const [placementTestNode, setPlacementTestNode] = useState<LessonNode | null>(null);
  const playerLevel = calculatePlayerLevel(xp);

  // Guardar en LocalStorage
  useEffect(() => {
    localStorage.setItem('paplitz_units', JSON.stringify(units));
    localStorage.setItem('paplitz_streak', streak.toString());
    localStorage.setItem('paplitz_xp', xp.toString());
    localStorage.setItem('paplitz_scores', JSON.stringify(scoresHistory));
  }, [units, streak, xp, scoresHistory]);

  // Detección de tamaño de pantalla y orientación para móvil
  useEffect(() => {
    const handleDimensions = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setWindowWidth(w);
      setIsPortraitMobile(w <= 768 && h > w);
    };
    handleDimensions();
    window.addEventListener('resize', handleDimensions);
    window.addEventListener('orientationchange', handleDimensions);
    return () => {
      window.removeEventListener('resize', handleDimensions);
      window.removeEventListener('orientationchange', handleDimensions);
    };
  }, []);

  // Intento de bloqueo a horizontal mediante API de orientación
  const tryLockLandscape = async () => {
    try {
      const anyScreen = window.screen as unknown as { orientation?: { lock?: (o: string) => Promise<void> } };
      if (anyScreen.orientation?.lock) {
        await anyScreen.orientation.lock('landscape');
      }
    } catch {
      // Ignorar restricciones en navegadores móviles estándar
    }
  };

  // Generar nuevo cubo de práctica basado en la lección activa
  const handleNewPracticeCube = (nodeToUse?: LessonNode) => {
    const targetNode = nodeToUse || activeNode || allNodes[0];
    const newSeed = Math.floor(Math.random() * 100000);
    setChallenge(
      generateCubeChallenge(newSeed, 600, 540, {
        mode: targetNode.perspectiveMode,
        axesMode: targetNode.axesMode,
        forceSide: targetNode.forceSide,
        isShadowLevel: targetNode.isShadowLevel,
        hasGroundGrid: targetNode.hasGroundGrid,
      })
    );
    setFeedback(null);
    setShowSolution(false);
    setStrokes([]);
    setAvatarMood('neutral');
  };

  // Convalidación directa de niveles (Fast-Forward)
  const handleDirectPlacement = (targetNodeId: string) => {
    const result = fastForwardCurriculum(units, targetNodeId, 80);
    setUnits(result.updatedUnits);
    if (result.addedXp > 0) {
      setXp((prev) => prev + result.addedXp);
    }
    const all = result.updatedUnits.flatMap((u) => u.nodes);
    const target = all.find((n) => n.id === targetNodeId) || all[0];
    setPlacementTestNode(null);
    setActiveNode(target);
    handleNewPracticeCube(target);
    setAvatarMood('success-stars');
    setTimeout(() => setAvatarMood('neutral'), 3000);
  };

  // Iniciar reto de examen de nivelación
  const handleStartPlacementTest = (targetNode: LessonNode) => {
    setPlacementTestNode(targetNode);
    setActiveNode(targetNode);
    handleNewPracticeCube(targetNode);
    setActiveTab('practice');
    setAvatarMood('speed-lightning');
    setTimeout(() => setAvatarMood('neutral'), 2500);
  };

  // Al seleccionar una lección desde el filtro desplegable
  const handleSelectLessonById = (nodeId: string) => {
    const node = allNodes.find((n) => n.id === nodeId);
    if (node) {
      setPlacementTestNode(null);
      setActiveNode(node);
      handleNewPracticeCube(node);
    }
  };

  // Al hacer clic en un nodo del Camino
  const handleSelectNode = (node: LessonNode) => {
    setPlacementTestNode(null);
    setActiveNode(node);
    handleNewPracticeCube(node);
    setActiveTab('practice');
  };

  // Practicar un reto específico (por ejemplo desde la vista detallada de hojas A4)
  const handlePracticeSpecificChallenge = (lesson: LessonNode, specificSeed: number) => {
    setActiveNode(lesson);
    setChallenge(
      generateCubeChallenge(specificSeed, 600, 540, {
        mode: lesson.perspectiveMode,
        axesMode: lesson.axesMode,
        forceSide: lesson.forceSide,
        isShadowLevel: lesson.isShadowLevel,
        hasGroundGrid: lesson.hasGroundGrid,
      })
    );
    setFeedback(null);
    setShowSolution(false);
    setStrokes([]);
    setAvatarMood('neutral');
    setActiveTab('practice');
    setShowAnalogModal(false);
  };

  // Validar dibujo
  const handleValidate = (timeRemainingSeconds?: number) => {
    const res = validateCubeDrawing(challenge, strokes, timeRemainingSeconds);
    setFeedback(res);
    setShowSolution(true);

    if (res.passed) {
      // Reacción del Avatar: Éxito con ojos de estrella o bonus de rayo
      if (res.speedBonus && res.speedBonus > 0) {
        setAvatarMood('speed-lightning');
        setTimeout(() => {
          setAvatarMood('success-stars');
          setTimeout(() => setAvatarMood('neutral'), 3500);
        }, 2200);
      } else {
        setAvatarMood('success-stars');
        setTimeout(() => setAvatarMood('neutral'), 4000);
      }

      const baseReward = activeNode?.xpReward || 15;
      const speedXpBonus = res.speedBonus ? Math.round(res.speedBonus * 0.6) : 0;
      const totalXp = baseReward + speedXpBonus;
      const recordedScore = res.totalScore ?? res.score;

      setXp((prev) => prev + totalXp);
      setStreak((prev) => (prev === 0 ? 1 : prev));
      setScoresHistory((prev) => [...prev, recordedScore]);

      // Si se estaba realizando un examen de nivelación y se ha aprobado
      if (placementTestNode && placementTestNode.id === activeNode?.id) {
        const ffResult = fastForwardCurriculum(units, placementTestNode.id, Math.round(recordedScore));
        setUnits(ffResult.updatedUnits);
        const placementBonusXp = 50 + ffResult.addedXp;
        setXp((prev) => prev + placementBonusXp);
        setPlacementTestNode(null);
        setActiveNode((prev) => (prev ? { ...prev, status: 'current' } : prev));
        return;
      }

      // Desbloquear siguiente nodo en el camino si el actual estaba en curso
      if (activeNode) {
        setUnits((prevUnits) => {
          let foundCurrent = false;
          return prevUnits.map((unit) => ({
            ...unit,
            nodes: unit.nodes.map((n) => {
              if (n.id === activeNode.id) {
                foundCurrent = true;
                return { ...n, status: 'completed' as const, score: Math.max(n.score || 0, recordedScore) };
              }
              if (foundCurrent && n.status === 'locked') {
                foundCurrent = false;
                return { ...n, status: 'current' as const };
              }
              return n;
            }),
          }));
        });

        // Actualizar el estado de la lección activa
        setActiveNode((prev) => (prev ? { ...prev, status: 'completed', score: Math.max(prev.score || 0, recordedScore) } : prev));
      }
    } else {
      // Suspenso: avatar con espirales y sudor
      setAvatarMood('fail-spiral');
      setTimeout(() => setAvatarMood('neutral'), 3500);
    }
  };

  // Reiniciar todo el progreso
  const handleResetProgress = () => {
    localStorage.clear();
    setUnits(MODULE_PARALLELEPIPEDS.units);
    setStreak(0);
    setXp(0);
    setScoresHistory([]);
    const firstNode = MODULE_PARALLELEPIPEDS.units[0].nodes[0];
    setActiveNode(firstNode);
    handleNewPracticeCube(firstNode);
  };

  // Restaurar progreso desde copia de seguridad o desde la nube
  const handleRestoreSave = (saveData: PaplitzSaveData) => {
    applySaveDataToLocalStorage(saveData);
    setUnits(saveData.units);
    setStreak(saveData.streak);
    setXp(saveData.xp);
    setScoresHistory(saveData.scoresHistory);

    const unlocked = saveData.units.flatMap((u) => u.nodes).filter((n) => n.status !== 'locked');
    const currentOrLast =
      unlocked.find((n) => n.status === 'current') ||
      unlocked[unlocked.length - 1] ||
      saveData.units[0]?.nodes[0] ||
      MODULE_PARALLELEPIPEDS.units[0].nodes[0];

    setActiveNode(currentOrLast);
    handleNewPracticeCube(currentOrLast);
  };

  // Comprobar si todos los nodos están desbloqueados
  const areAllNodesUnlocked = units.every((u) => u.nodes.every((n) => n.status !== 'locked'));

  // Desbloquear todos los niveles inmediatamente
  const handleUnlockAllNodes = () => {
    setUnits((prevUnits) =>
      prevUnits.map((unit) => ({
        ...unit,
        nodes: unit.nodes.map((n) => ({
          ...n,
          status: 'completed' as const,
          score: n.score || 100,
        })),
      }))
    );
  };

  // Restablecer bloqueo progresivo (solo el primer nivel desbloqueado)
  const handleLockAllExceptFirst = () => {
    setUnits((prevUnits) =>
      prevUnits.map((unit, uIdx) => ({
        ...unit,
        nodes: unit.nodes.map((n, nIdx) => {
          if (uIdx === 0 && nIdx === 0) {
            return { ...n, status: 'current' as const };
          }
          return { ...n, status: 'locked' as const, score: undefined };
        }),
      }))
    );
    const firstNode = MODULE_PARALLELEPIPEDS.units[0].nodes[0];
    setActiveNode(firstNode);
    handleNewPracticeCube(firstNode);
  };

  // Estadísticas calculadas
  const completedNodesCount = units.reduce(
    (acc, u) => acc + u.nodes.filter((n) => n.status === 'completed').length,
    0
  );
  const totalNodesCount = units.reduce((acc, u) => acc + u.nodes.length, 0);
  const accuracyAverage =
    scoresHistory.length > 0
      ? Math.round(scoresHistory.reduce((a, b) => a + b, 0) / scoresHistory.length)
      : 0;

  return (
    <div className="min-h-screen bg-white text-black flex flex-col antialiased">
      {/* 1. BARRA SUPERIOR CON PESTAÑAS PRINCIPALES */}
      <header className="sticky top-0 z-40 bg-white border-b-2 border-black">
        <div className="max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo Paplitz */}
          <div
            onClick={() => { setActiveTab('practice'); setMobileMenuOpen(false); }}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group select-none shrink-0"
          >
            <img
              src="/paplitz-logo.svg"
              alt="Paplitz Logo"
              className="w-8 h-8 sm:w-10 sm:h-10 group-hover:scale-105 transition-transform"
            />
            <div>
              <span className="text-lg sm:text-2xl font-bold font-display tracking-tight block leading-none">
                Paplitz
              </span>
              <span className="text-[7px] sm:text-[9px] font-mono tracking-widest uppercase text-neutral-500 block">
                Drawing Practice
              </span>
            </div>
          </div>

          {/* Selector de Pestañas Principales en Desktop (>= lg) */}
          <nav className="hidden lg:flex shrink-0 items-center gap-0.5 sm:gap-1 border-2 border-black p-0.5 sm:p-1 bg-white shadow-[2px_2px_0px_#000000]">
            <button
              onClick={() => setActiveTab('practice')}
              className={`px-2 sm:px-3 py-1.5 text-xs font-mono uppercase font-bold flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'practice' ? 'bg-black text-white' : 'hover:bg-neutral-100 text-black'
              }`}
            >
              <Compass className="w-4 h-4 shrink-0" />
              <span>Práctica</span>
            </button>
            <button
              onClick={() => setActiveTab('minigames')}
              className={`px-2 sm:px-3 py-1.5 text-xs font-mono uppercase font-bold flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'minigames' ? 'bg-black text-white' : 'hover:bg-neutral-100 text-black'
              }`}
            >
              <Gamepad2 className="w-4 h-4 stroke-[2.5] shrink-0" />
              <span>Minijuegos</span>
            </button>
            <button
              onClick={() => setActiveTab('path')}
              className={`px-2 sm:px-3 py-1.5 text-xs font-mono uppercase font-bold flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'path' ? 'bg-black text-white' : 'hover:bg-neutral-100 text-black'
              }`}
            >
              <Map className="w-4 h-4 shrink-0" />
              <span>El Camino</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-2 sm:px-3 py-1.5 text-xs font-mono uppercase font-bold flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'profile' ? 'bg-black text-white' : 'hover:bg-neutral-100 text-black'
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              <span>Perfil</span>
            </button>
          </nav>

          {/* Estadísticas de Gamificación & Hojas A4 en Desktop (>= lg) */}
          <div className="hidden lg:flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setShowAnalogModal(true)}
              className="btn-ink-outline px-2 sm:px-2.5 py-1 text-xs flex items-center gap-1 cursor-pointer font-mono"
              title="Descargar plantillas A4 o validar escaneos"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">A4</span>
            </button>

            {/* Racha */}
            <div className="flex items-center gap-1 border-2 border-black px-2 py-1 text-xs font-mono font-bold shadow-[2px_2px_0px_#000000]">
              <Flame className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{streak}</span>
            </div>

            {/* XP y Nivel con Barrita de Progreso */}
            <div
              onClick={() => setShowLevelGuide(true)}
              className="flex items-center gap-1 sm:gap-1.5 border-2 border-black px-1.5 sm:px-2 py-1 text-xs font-mono font-bold shadow-[2px_2px_0px_#000000] bg-white cursor-pointer hover:bg-neutral-100 transition-colors"
              title={`Nivel ${playerLevel.level}: ${playerLevel.title} (${playerLevel.progressPercent}% hacia Nivel ${playerLevel.level + 1}) — Clic para abrir guía`}
            >
              <span className="bg-black text-white px-1 text-[10px]">NV.{playerLevel.level}</span>
              <div className="w-6 sm:w-10 h-2 border border-black bg-neutral-100 overflow-hidden relative" title={`${playerLevel.progressPercent}% completado`}>
                <div
                  className="h-full bg-black transition-all duration-300"
                  style={{ width: `${playerLevel.progressPercent}%` }}
                />
              </div>
              <span className="text-[10px] sm:text-[11px] tabular-nums hidden xs:inline">{xp} XP</span>
            </div>

            {/* Botón de Guía a la derecha de XP */}
            <button
              onClick={() => setShowLevelGuide(true)}
              className="btn-ink-outline px-2 sm:px-2.5 py-1 text-xs flex items-center gap-1 cursor-pointer font-mono font-bold shadow-[2px_2px_0px_#000000] hover:bg-neutral-100"
              title="Guía: cómo funcionan los niveles, exámenes y XP"
            >
              <BookOpen className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden lg:inline">Guía</span>
            </button>

            {/* Enlace al repositorio de GitHub */}
            <a
              href="https://github.com/lazaro-guerrero-losada/paplitz"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ink-outline p-1.5 sm:px-2.5 sm:py-1 text-xs flex items-center gap-1 font-mono font-bold shadow-[2px_2px_0px_#000000] hover:bg-black hover:text-white transition-colors"
              title="Ver código abierto en GitHub"
            >
              <GithubIcon className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">GitHub</span>
            </a>
          </div>

          {/* Barra de Acciones Móvil (< lg): Racha + Nivel + Botón Hamburguesa */}
          <div className="flex lg:hidden items-center gap-1.5 shrink-0">
            {/* Racha compacta */}
            <div className="flex items-center gap-0.5 border-2 border-black px-1.5 py-1 text-[11px] font-mono font-bold shadow-[1px_1px_0px_#000000]">
              <Flame className="w-3 h-3 stroke-[2.5]" />
              <span>{streak}</span>
            </div>

            {/* Nivel compacto */}
            <div
              onClick={() => setShowLevelGuide(true)}
              className="flex items-center gap-1 border-2 border-black px-1.5 py-1 text-[11px] font-mono font-bold shadow-[1px_1px_0px_#000000] bg-white cursor-pointer"
            >
              <span className="bg-black text-white px-1 text-[9px]">NV.{playerLevel.level}</span>
            </div>

            {/* Botón Menú Lateral (Drawer) */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="btn-ink-outline p-1.5 text-xs font-mono font-bold flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_#000000] hover:bg-black hover:text-white"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. MENÚ LATERAL DESPLEGABLE (INK DRAWER MÓVIL) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end lg:hidden">
          {/* Backdrop oscuro translúcido */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Panel Lateral Drawer */}
          <div className="relative w-[85vw] max-w-xs bg-white border-l-[3px] border-black shadow-[-6px_0px_0px_#000000] h-full flex flex-col justify-between p-4 z-10 overflow-y-auto font-sans">
            <div>
              {/* Cabecera del Menú Lateral */}
              <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <img src="/paplitz-logo.svg" alt="Paplitz" className="w-6 h-6" />
                  <div>
                    <h2 className="font-display font-bold text-base tracking-tight leading-none">
                      Paplitz
                    </h2>
                    <span className="text-[9px] font-mono uppercase text-neutral-500 tracking-wider">
                      Menú Principal
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 border border-black hover:bg-neutral-100 cursor-pointer shadow-[1px_1px_0px_#000000]"
                  aria-label="Cerrar menú"
                >
                  <X className="w-4 h-4 text-black stroke-[2.5]" />
                </button>
              </div>

              {/* Lista de Pestañas de Navegación */}
              <div className="space-y-2 mb-6">
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold block mb-1">
                  Secciones
                </span>

                <button
                  onClick={() => { setActiveTab('practice'); setMobileMenuOpen(false); }}
                  className={`w-full p-2.5 text-xs font-mono font-bold flex items-center justify-between border-2 border-black shadow-[2px_2px_0px_#000000] transition-colors cursor-pointer ${
                    activeTab === 'practice' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Compass className="w-4 h-4 stroke-[2.5]" />
                    <span className="uppercase">Práctica Rápida</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => { setActiveTab('minigames'); setMobileMenuOpen(false); }}
                  className={`w-full p-2.5 text-xs font-mono font-bold flex items-center justify-between border-2 border-black shadow-[2px_2px_0px_#000000] transition-colors cursor-pointer ${
                    activeTab === 'minigames' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Gamepad2 className="w-4 h-4 stroke-[2.5]" />
                    <span className="uppercase">Minijuegos</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => { setActiveTab('path'); setMobileMenuOpen(false); }}
                  className={`w-full p-2.5 text-xs font-mono font-bold flex items-center justify-between border-2 border-black shadow-[2px_2px_0px_#000000] transition-colors cursor-pointer ${
                    activeTab === 'path' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Map className="w-4 h-4 stroke-[2.5]" />
                    <span className="uppercase">El Camino</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }}
                  className={`w-full p-2.5 text-xs font-mono font-bold flex items-center justify-between border-2 border-black shadow-[2px_2px_0px_#000000] transition-colors cursor-pointer ${
                    activeTab === 'profile' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 stroke-[2.5]" />
                    <span className="uppercase">Perfil & Nube</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Herramientas y Acciones Didácticas */}
              <div className="space-y-2 mb-6">
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold block mb-1">
                  Herramientas
                </span>

                <button
                  onClick={() => { setShowAnalogModal(true); setMobileMenuOpen(false); }}
                  className="btn-ink-outline w-full p-2 text-xs font-mono flex items-center gap-2 justify-start cursor-pointer shadow-[2px_2px_0px_#000000]"
                >
                  <Printer className="w-4 h-4" />
                  <span>Plantillas A4 & Escaneo</span>
                </button>

                <button
                  onClick={() => { setShowLevelGuide(true); setMobileMenuOpen(false); }}
                  className="btn-ink-outline w-full p-2 text-xs font-mono flex items-center gap-2 justify-start cursor-pointer shadow-[2px_2px_0px_#000000]"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Guía de Niveles y Exámenes</span>
                </button>

                <a
                  href="https://github.com/lazaro-guerrero-losada/paplitz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ink-outline w-full p-2 text-xs font-mono flex items-center gap-2 justify-start cursor-pointer shadow-[2px_2px_0px_#000000]"
                >
                  <GithubIcon className="w-4 h-4" />
                  <span>Repositorio GitHub</span>
                </a>
              </div>
            </div>

            {/* Resumen Inferior del Jugador */}
            <div className="border-t-2 border-black pt-3 bg-neutral-50 p-2.5 border-2 border-black shadow-[2px_2px_0px_#000000]">
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="font-bold">Nivel {playerLevel.level}: {playerLevel.title}</span>
                <span className="font-mono text-[11px] font-bold">{xp} XP</span>
              </div>
              <div className="w-full h-2 border border-black bg-white overflow-hidden mb-2">
                <div
                  className="h-full bg-black transition-all duration-300"
                  style={{ width: `${playerLevel.progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-600">
                <span className="flex items-center gap-1 font-bold text-black">
                  <Flame className="w-3 h-3 text-black stroke-[2.5]" />
                  Racha: {streak} días
                </span>
                <span>{playerLevel.progressPercent}% progreso</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CONTENIDO SEGÚN LA PESTAÑA ACTIVA */}
      <main className="flex-1 flex flex-col overflow-x-hidden">
        {/* Banner Didáctico: Sugerencia de Modo Horizontal en Móviles */}
        {isPortraitMobile && showRotatePrompt && (
          <div className="w-full bg-neutral-100 border-b-2 border-black px-3 py-1.5 flex items-center justify-between text-xs font-mono shadow-[0_2px_0px_#000000] z-20">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-sm shrink-0">🔄</span>
              <span className="text-[11px] leading-tight font-sans truncate">
                <strong>Gira tu pantalla:</strong> Se recomienda dibujar en horizontal.
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <button
                onClick={tryLockLandscape}
                className="btn-ink px-2 py-0.5 text-[10px] uppercase font-bold cursor-pointer"
                title="Intentar cambiar a horizontal"
              >
                Girar
              </button>
              <button
                onClick={() => setShowRotatePrompt(false)}
                className="p-1 hover:bg-neutral-200 border border-black cursor-pointer text-[10px] font-bold"
                title="Descartar"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* PESTAÑA 1: HOME / PRÁCTICA RÁPIDA (TODO AL ALCANCE, SIN SCROLL) */}
        {activeTab === 'practice' && (
          <div className="flex-1 w-full practice-grid px-4 py-2 sm:py-3">
            {/* Columna izquierda espaciadora para centrar matemáticamente el lienzo en el centro de la pantalla */}
            <div className="hidden lg:block w-full min-w-0" aria-hidden="true" />

            {/* Columna central: Lienzo 100% centrado con la pantalla */}
            <div
              className="w-full min-w-0 flex flex-col items-center shrink-0 justify-self-center"
              style={{
                width: 'min(100%, 600px, max(280px, calc((100vh - 330px) * 600 / 540)))',
              }}
            >
              {/* Barra superior compacta con Selector de Lección alineado 1:1 con el Camino */}
              <div className="w-full flex items-center justify-between gap-2 mb-2 border-b-2 border-black pb-2 flex-nowrap">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <Filter className="w-4 h-4 text-black shrink-0" />
                  <span className="text-xs font-mono uppercase font-bold shrink-0 hidden xs:inline">Lección:</span>
                  <select
                    value={activeNode?.id || ''}
                    onChange={(e) => handleSelectLessonById(e.target.value)}
                    className="border-2 border-black px-2 py-1 text-xs font-mono font-bold bg-white shadow-[2px_2px_0px_#000000] cursor-pointer min-w-0 w-full truncate"
                  >
                    {unlockedNodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.code} · {n.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {activeNode && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 font-bold border shrink-0 ${
                        activeNode.status === 'completed'
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-black border-black'
                      }`}
                    >
                      <span className="hidden xs:inline">{activeNode.status === 'completed' ? 'Superado ✓' : 'En curso ★'}</span>
                      <span className="xs:hidden">{activeNode.status === 'completed' ? '✓' : '★'}</span>
                    </span>
                  )}
                  <button
                    onClick={() => handleNewPracticeCube()}
                    className="btn-ink-outline px-2.5 py-1 text-xs font-mono flex items-center gap-1 cursor-pointer shrink-0"
                    title="Generar otro cubo aleatorio con la misma lección"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Nuevo</span>
                  </button>
                </div>
              </div>

              {/* Banner de Examen de Nivelación Activo */}
              {placementTestNode && placementTestNode.id === activeNode?.id && (
                <div className="w-full mb-2 px-3 py-1.5 border-2 border-black bg-neutral-100 flex items-center justify-between text-xs shadow-[2px_2px_0px_#000000]">
                  <div className="flex items-center gap-2">
                    <span className="bg-black text-white px-1.5 py-0.2 font-mono font-bold text-[10px] flex items-center gap-1">
                      <Zap className="w-3 h-3" /> EXAMEN
                    </span>
                    <span className="font-mono font-bold text-xs">
                      Supera este reto (≥75%) para convalidar lecciones anteriores (+50 XP bonus).
                    </span>
                  </div>
                  <button
                    onClick={() => setPlacementTestNode(null)}
                    className="text-[10px] font-mono uppercase font-bold text-neutral-600 hover:text-black underline cursor-pointer"
                  >
                    Cancelar Examen
                  </button>
                </div>
              )}

              {/* Banner de Guía Activa compacto */}
              {activeNode && (
                <div className="w-full mb-2 px-3 py-1.5 border border-black bg-neutral-50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-mono font-bold bg-black text-white px-1.5 py-0.2 text-[10px]">
                      {activeNode.code}
                    </span>
                    <span className="font-display font-bold text-xs truncate">
                      {activeNode.title}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-sans hidden sm:inline truncate">
                      — {activeNode.subtitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {activeNode.axesMode === 'xyz' && (
                      <span className="text-[10px] font-mono bg-white text-black border border-black px-2 py-0.5 font-bold shrink-0 flex items-center gap-1 shadow-[1px_1px_0px_#000000]">
                        <Compass className="w-3 h-3 stroke-[2.5]" />
                        <span>Ejes X, Y, Z</span>
                      </span>
                    )}
                    {activeNode.axesMode === 'base_axes' && (
                      <span className="text-[10px] font-mono bg-white text-black border border-black px-2 py-0.5 font-bold shrink-0 flex items-center gap-1 shadow-[1px_1px_0px_#000000]">
                        <Compass className="w-3 h-3 stroke-[2.5]" />
                        <span>Ejes X e Y</span>
                      </span>
                    )}
                    {activeNode.axesMode === 'none' && (
                      <span className="text-[10px] font-mono bg-white text-black border border-black px-2 py-0.5 font-bold shrink-0 flex items-center gap-1 shadow-[1px_1px_0px_#000000]">
                        <PenTool className="w-3 h-3 stroke-[2.5]" />
                        <span>Reto Libre</span>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Lienzo de dibujo responsivo con controles unificados inmediatamente al alcance */}
              <DrawingCanvas
                challenge={challenge}
                feedback={feedback}
                onStrokesChange={setStrokes}
                showSolution={showSolution}
                onValidate={handleValidate}
                onNextCube={() => handleNewPracticeCube()}
                onDrawingStateChange={setIsUserDrawing}
                activeLesson={activeNode}
              />
            </div>

            {/* Columna Lateral Derecha: Cubito (en el lateral derecho sin empujar el centro del lienzo) */}
            <div className="w-full min-w-0 flex flex-col items-center justify-center shrink-0 pt-4 sm:pt-6 lg:pt-20">
              <SenseiCubo
                mood={avatarMood}
                isDrawing={isUserDrawing}
                size={windowWidth < 640 ? 140 : 185}
                onPoke={() => {
                  setAvatarMood('poked');
                  setTimeout(() => setAvatarMood('neutral'), 1800);
                }}
              />
            </div>
          </div>
        )}

        {/* PESTAÑA 2: MINIJUEGOS */}
        {activeTab === 'minigames' && (
          <MinigamesView
            unlockedNodes={unlockedNodes}
            activeNode={activeNode}
            onAwardXP={(amount) => setXp((prev) => prev + amount)}
            onAvatarMoodChange={(mood) => {
              setAvatarMood(mood);
              setTimeout(() => setAvatarMood('neutral'), 3500);
            }}
            onDrawingStateChange={setIsUserDrawing}
          />
        )}

        {/* PESTAÑA 3: EL CAMINO */}
        {activeTab === 'path' && (
          <div className="flex-1 bg-white">
            <div className="text-center pt-8 pb-4">
              <span className="text-xs font-mono uppercase tracking-widest bg-black text-white px-2 py-0.5 font-bold">
                MÓDULO 1
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold font-display mt-2">
                {MODULE_PARALLELEPIPEDS.name}
              </h1>
              <p className="text-sm text-neutral-600 font-sans max-w-md mx-auto mt-1">
                {MODULE_PARALLELEPIPEDS.subtitle}
              </p>
            </div>

            <LearningPath
              units={units}
              onSelectNode={handleSelectNode}
              onOpenGuidebook={(unit) => setGuidebookUnit(unit)}
              onOpenPlacementModal={() => setIsPlacementModalOpen(true)}
            />
          </div>
        )}

        {/* PESTAÑA 3: PERFIL */}
        {activeTab === 'profile' && (
          <ProfileView
            units={units}
            scoresHistory={scoresHistory}
            streak={streak}
            xp={xp}
            completedNodesCount={completedNodesCount}
            totalNodesCount={totalNodesCount}
            accuracyAverage={accuracyAverage}
            areAllNodesUnlocked={areAllNodesUnlocked}
            onUnlockAllNodes={handleUnlockAllNodes}
            onLockAllNodes={handleLockAllExceptFirst}
            onResetProgress={handleResetProgress}
            onOpenGuide={() => setShowLevelGuide(true)}
            onRestoreSave={handleRestoreSave}
            onOpenPlacementModal={() => setIsPlacementModalOpen(true)}
          />
        )}
      </main>

      {/* MODALES */}
      <PlacementModal
        isOpen={isPlacementModalOpen}
        onClose={() => setIsPlacementModalOpen(false)}
        units={units}
        onDirectUnlock={handleDirectPlacement}
        onStartPlacementTest={handleStartPlacementTest}
      />
      {guidebookUnit && (
        <GuidebookModal unit={guidebookUnit} onClose={() => setGuidebookUnit(null)} />
      )}
      {showAnalogModal && (
        <AnalogSheetsModal
          onClose={() => setShowAnalogModal(false)}
          units={units}
          activeNode={activeNode}
          onPracticeChallenge={handlePracticeSpecificChallenge}
        />
      )}
      {showLevelGuide && (
        <LevelGuideModal
          xp={xp}
          completedNodesCount={completedNodesCount}
          totalNodesCount={totalNodesCount}
          onClose={() => setShowLevelGuide(false)}
          onGoToPractice={() => {
            setShowLevelGuide(false);
            setActiveTab('practice');
          }}
          onGoToMinigames={() => {
            setShowLevelGuide(false);
            setActiveTab('minigames');
          }}
        />
      )}
    </div>
  );
}

export default App;
