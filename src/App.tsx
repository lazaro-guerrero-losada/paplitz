import { useState, useEffect, useRef } from 'react';
import {
  MODULE_CALISTHENICS,
  MODULE_PARALLELEPIPEDS,
  LessonNode,
  Unit,
} from './lib/curriculumData';
import {
  ALL_SINGLE_STROKE_EXERCISES,
  StrokeEvaluation,
} from './lib/strokeTypes';
import { generateCubeChallenge, CubeChallenge } from './lib/geometry';
import { validateCubeDrawing, ValidationFeedback, UserStroke, countDetectedAristas } from './lib/validation';
import { DrawingCanvas, DrawingCanvasRef } from './components/DrawingCanvas';
import { StrokePracticeCanvas, StrokePracticeCanvasRef } from './components/StrokePracticeCanvas';
import { MasteryStreakInfoModal, KinematicPhasesInfoModal } from './components/PracticeInfoModals';
import { LearningPath } from './components/LearningPath';
import { GuidebookModal } from './components/GuidebookModal';
import { AnalogSheetsModal } from './components/AnalogSheetsModal';
import { ProfileView } from './components/ProfileView';
import { MinigamesView } from './components/MinigamesView';
import { LevelGuideModal } from './components/LevelGuideModal';
import { PlacementModal } from './components/PlacementModal';
import { TinyToast, ToastData } from './components/TinyToast';
import { StreakModal } from './components/StreakModal';
import { DailyChallengePanel } from './components/DailyChallengePanel';
import { DailySetCompletedModal } from './components/DailySetCompletedModal';
import { calculatePlayerLevel } from './lib/levelSystem';
import { SenseiCubo } from './components/avatar/SenseiCubo';
import { AvatarMood } from './lib/avatarTypes';
import {
  Flame,
  Printer,
  Compass,
  Map,
  User,
  RefreshCw,
  Gamepad2,
  BookOpen,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  Target,
  Undo2,
  Trash2,
  Eye,
  EyeOff,
  Check,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { PaplitzSaveData, applySaveDataToLocalStorage, fastForwardCurriculum } from './lib/saveSystem';
import { recordDailyPractice } from './lib/streakSystem';
import {
  DailySetSession,
  DailySetHistoryItem,
  createDailyChallenge,
  loadActiveDailySet,
  saveActiveDailySet,
  loadDailyChallengeHistory,
  recordCompletedDailySet,
} from './lib/dailyChallenge';

function GithubIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function loadAndSanitizeUnits(savedKey: string, defaultUnits: Unit[]): Unit[] {
  const saved = localStorage.getItem(savedKey);
  let loadedUnits = defaultUnits;
  if (saved) {
    try {
      const parsed: Unit[] = JSON.parse(saved);
      loadedUnits = defaultUnits.map((defaultUnit) => {
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
      loadedUnits = defaultUnits;
    }
  }

  let foundFirstUncompleted = false;
  return loadedUnits.map((u) => ({
    ...u,
    nodes: u.nodes.map((n) => {
      if (n.status === 'completed') {
        return n;
      }
      if (!foundFirstUncompleted) {
        foundFirstUncompleted = true;
        return { ...n, status: 'current' as const };
      }
      return { ...n, status: 'locked' as const };
    }),
  }));
}

export function App() {
  // Pestañas principales: 'practice' (Home / Práctica Rápida), 'path' (El Camino), 'minigames' (Minijuegos), 'profile' (Perfil)
  const [activeTab, setActiveTab] = useState<'practice' | 'path' | 'minigames' | 'profile'>('practice');

  // Estado del Menú Lateral Móvil (Drawer) y Detección de Orientación
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showRotatePrompt, setShowRotatePrompt] = useState<boolean>(true);
  const [isPortraitMobile, setIsPortraitMobile] = useState<boolean>(false);
  const [, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);

  // Estado del Avatar Acompañante Cúbico ("Cubito")
  const [avatarMood, setAvatarMood] = useState<AvatarMood>('neutral');
  const [isUserDrawing, setIsUserDrawing] = useState<boolean>(false);

  // Módulo activo del Camino: 'module-calisthenics' (Líneas y Trazos) vs 'module-cubes' (Paralelepípedos)
  const [activeModuleId, setActiveModuleId] = useState<'module-calisthenics' | 'module-cubes'>(() => {
    return (localStorage.getItem('paplitz_active_module') as any) || 'module-calisthenics';
  });

  // Estado de Unidades por módulo
  const [calisthenicsUnits, setCalisthenicsUnits] = useState<Unit[]>(() =>
    loadAndSanitizeUnits('paplitz_calisthenics_units', MODULE_CALISTHENICS.units)
  );
  const [cubeUnits, setCubeUnits] = useState<Unit[]>(() =>
    loadAndSanitizeUnits('paplitz_units', MODULE_PARALLELEPIPEDS.units)
  );

  const units = activeModuleId === 'module-calisthenics' ? calisthenicsUnits : cubeUnits;
  const setUnits = (newUnits: Unit[] | ((prev: Unit[]) => Unit[])) => {
    if (activeModuleId === 'module-calisthenics') {
      setCalisthenicsUnits(newUnits);
    } else {
      setCubeUnits(newUnits);
    }
  };

  // Lista aplanada de todos los nodos del camino activo
  const allNodes = units.flatMap((u) => u.nodes);
  const unlockedNodes = allNodes.filter((n) => n.status !== 'locked');

  // Nodo activo seleccionado
  const [activeNode, setActiveNode] = useState<LessonNode>(() => {
    const initialUnits = (localStorage.getItem('paplitz_active_module') as any) === 'module-cubes'
      ? cubeUnits
      : calisthenicsUnits;
    const all = initialUnits.flatMap((u) => u.nodes);
    return all.find((n) => n.status === 'current') || all[0];
  });

  // Fase cinemática activa (1: Precisión, 2: Fluidez, 3: Velocidad) - SOLO para calistenia
  const [currentPhase, setCurrentPhase] = useState<1 | 2 | 3>(1);

  // Modo de práctica en la barra lateral: 'camino' (por defecto) o 'daily' (reto diario)
  const [practiceMode, setPracticeMode] = useState<'camino' | 'daily'>('camino');
  // Colapso de la barra lateral izquierda
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  // Visibilidad de trazos de usuario y soluciones/guías
  const [showUserStrokes, setShowUserStrokes] = useState<boolean>(true);
  const [showSolution, setShowSolution] = useState<boolean>(true);
  // Modales de información didáctica
  const [showMasteryStreakInfo, setShowMasteryStreakInfo] = useState<boolean>(false);
  const [showKinematicPhasesInfo, setShowKinematicPhasesInfo] = useState<boolean>(false);

  // Refs de lienzos de dibujo
  const strokeCanvasRef = useRef<StrokePracticeCanvasRef | null>(null);
  const cubeCanvasRef = useRef<DrawingCanvasRef | null>(null);

  // Semilla y evaluación para calistenia
  const [calisthenicsSeed, setCalisthenicsSeed] = useState<number>(() => Math.floor(Math.random() * 90000 + 10000));
  const [strokeEvaluation, setStrokeEvaluation] = useState<StrokeEvaluation | null>(null);

  // Control de versiones/variantes activas por nivel de calistenia
  const [nodeVariantIndices, setNodeVariantIndices] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('paplitz_node_variant_indices');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('paplitz_node_variant_indices', JSON.stringify(nodeVariantIndices));
  }, [nodeVariantIndices]);

  // Variantes del nivel actual
  const activeVariants = activeNode?.variants || (activeNode?.exerciseDef ? [activeNode.exerciseDef] : []);
  const currentVariantIndex = activeVariants.length > 0
    ? (nodeVariantIndices[activeNode?.id || ''] || 0) % activeVariants.length
    : 0;
  const currentExerciseDef = activeVariants[currentVariantIndex] || activeNode?.exerciseDef || ALL_SINGLE_STROKE_EXERCISES[0];

  // Modales
  const [guidebookUnit, setGuidebookUnit] = useState<Unit | null>(null);
  const [showAnalogModal, setShowAnalogModal] = useState(false);

  // Desafío de Cubo 3D actual
  const [challenge, setChallenge] = useState<CubeChallenge>(() => {
    const initial = cubeUnits.flatMap((u) => u.nodes).find((n) => n.status === 'current') || cubeUnits[0].nodes[0];
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
  // Sistema de Notificaciones Ligeras (Tiny Toast no intrusivo)
  const [toast, setToast] = useState<ToastData | null>(null);
  const showToast = (
    icon: string,
    title: string,
    message: string,
    actionLabel?: string,
    onAction?: () => void,
    type?: 'success' | 'info' | 'warning'
  ) => {
    setToast({
      id: Date.now(),
      icon,
      title,
      message,
      actionLabel,
      onAction,
      type,
    });
  };

  // Racha de maestría por nivel (se requieren al menos 3 cubos seguidos con nota ≥90% para superar el nivel actual)
  const [masteryStreaks, setMasteryStreaks] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('paplitz_mastery_streaks');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('paplitz_mastery_streaks', JSON.stringify(masteryStreaks));
  }, [masteryStreaks]);

  const currentMasteryStreak = activeNode ? (masteryStreaks[activeNode.id] || 0) : 0;

  const [streakModalState, setStreakModalState] = useState<{
    isOpen: boolean;
    isNewDayAward: boolean;
  }>({ isOpen: false, isNewDayAward: false });
  const playerLevel = calculatePlayerLevel(xp);

  // Reto Diario / Lote de ejercicios (hábito diario de 12 ejercicios)
  const [dailySetSession, setDailySetSession] = useState<DailySetSession | null>(() => {
    return loadActiveDailySet(allNodes);
  });
  const [dailySetHistory, setDailySetHistory] = useState<DailySetHistoryItem[]>(() => {
    return loadDailyChallengeHistory();
  });
  const [completedDailySetForModal, setCompletedDailySetForModal] = useState<DailySetHistoryItem | null>(null);

  // Guardar en LocalStorage
  useEffect(() => {
    localStorage.setItem('paplitz_calisthenics_units', JSON.stringify(calisthenicsUnits));
    localStorage.setItem('paplitz_units', JSON.stringify(cubeUnits));
    localStorage.setItem('paplitz_active_module', activeModuleId);
    localStorage.setItem('paplitz_streak', streak.toString());
    localStorage.setItem('paplitz_xp', xp.toString());
    localStorage.setItem('paplitz_scores', JSON.stringify(scoresHistory));
  }, [calisthenicsUnits, cubeUnits, activeModuleId, streak, xp, scoresHistory]);


  // Persistir estado de reto diario activo
  useEffect(() => {
    saveActiveDailySet(dailySetSession);
  }, [dailySetSession]);

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

    // Si hay un reto diario activo, actualizar la semilla del ejercicio actual
    if (dailySetSession && !dailySetSession.isCompleted) {
      const updatedProblems = [...dailySetSession.problems];
      updatedProblems[dailySetSession.currentIndex] = {
        ...updatedProblems[dailySetSession.currentIndex],
        seed: newSeed,
      };
      setDailySetSession({
        ...dailySetSession,
        problems: updatedProblems,
      });
    }

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

  // Pasar al siguiente problema del lote diario o nuevo cubo de práctica libre
  const handleNextCubeOrProblem = () => {
    if (dailySetSession && !dailySetSession.isCompleted) {
      const nextIndex = dailySetSession.currentIndex + 1;
      if (nextIndex < dailySetSession.totalCount) {
        const nextProblem = dailySetSession.problems[nextIndex];
        setDailySetSession({
          ...dailySetSession,
          currentIndex: nextIndex,
        });
        setActiveNode(nextProblem.node);
        setChallenge(
          generateCubeChallenge(nextProblem.seed, 600, 540, {
            mode: nextProblem.node.perspectiveMode,
            axesMode: nextProblem.node.axesMode,
            forceSide: nextProblem.node.forceSide,
            isShadowLevel: nextProblem.node.isShadowLevel,
            hasGroundGrid: nextProblem.node.hasGroundGrid,
          })
        );
        setFeedback(null);
        setShowSolution(false);
        setStrokes([]);
        setAvatarMood('neutral');
        return;
      }
    }
    handleNewPracticeCube();
  };

  // Iniciar un nuevo reto diario de N ejercicios
  const handleStartDailyChallenge = (
    count: number,
    levelMode: 'random' | 'specific',
    selectedNodeIds: string[]
  ) => {
    const newSession = createDailyChallenge(count, levelMode, selectedNodeIds, unlockedNodes);
    setDailySetSession(newSession);

    const firstProblem = newSession.problems[0];
    if (firstProblem) {
      setActiveNode(firstProblem.node);
      setChallenge(
        generateCubeChallenge(firstProblem.seed, 600, 540, {
          mode: firstProblem.node.perspectiveMode,
          axesMode: firstProblem.node.axesMode,
          forceSide: firstProblem.node.forceSide,
          isShadowLevel: firstProblem.node.isShadowLevel,
          hasGroundGrid: firstProblem.node.hasGroundGrid,
        })
      );
      setFeedback(null);
      setShowSolution(false);
      setStrokes([]);
      setAvatarMood('speed-lightning');
      setTimeout(() => setAvatarMood('neutral'), 2200);
    }
    setActiveTab('practice');
  };

  // Cancelar reto diario en curso
  const handleCancelDailyChallenge = () => {
    setDailySetSession(null);
    saveActiveDailySet(null);
  };

  // Limpiar el historial de retos diarios completados
  const handleClearDailyHistory = () => {
    setDailySetHistory([]);
    localStorage.removeItem('paplitz_daily_challenge_history');
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
      setStrokeEvaluation(null);
      if (!node.isCalisthenics) {
        handleNewPracticeCube(node);
      } else {
        setCalisthenicsSeed(Math.floor(Math.random() * 90000 + 10000));
      }
    }
  };

  // Al hacer clic en un nodo del Camino
  const handleSelectNode = (node: LessonNode) => {
    setPlacementTestNode(null);
    setActiveNode(node);
    setCurrentPhase(1);
    setFeedback(null);
    setShowSolution(false);
    setStrokes([]);
    setStrokeEvaluation(null);
    if (!node.isCalisthenics) {
      handleNewPracticeCube(node);
    } else {
      setCalisthenicsSeed(Math.floor(Math.random() * 90000 + 10000));
    }
    setActiveTab('practice');
  };

  const handleSelectModule = (modId: string) => {
    const validModId = modId === 'module-cubes' ? 'module-cubes' : 'module-calisthenics';
    setActiveModuleId(validModId);
    setStrokeEvaluation(null);
    const targetUnits = validModId === 'module-calisthenics' ? calisthenicsUnits : cubeUnits;
    const targetAll = targetUnits.flatMap((u) => u.nodes);
    const nextNode = targetAll.find((n) => n.status === 'current') || targetAll[0];
    handleSelectNode(nextNode);
  };

  const handleSidebarUndo = () => {
    if (activeNode?.isCalisthenics) {
      strokeCanvasRef.current?.undo();
    } else {
      cubeCanvasRef.current?.undo();
    }
  };

  const handleSidebarClear = () => {
    setStrokeEvaluation(null);
    if (activeNode?.isCalisthenics) {
      strokeCanvasRef.current?.clear();
    } else {
      cubeCanvasRef.current?.clear();
    }
  };

  const handleSidebarEvaluate = () => {
    if (activeNode?.isCalisthenics) {
      strokeCanvasRef.current?.evaluate();
    } else {
      handleValidate();
    }
  };

  const handleSidebarNext = () => {
    setStrokeEvaluation(null);
    if (activeNode?.isCalisthenics) {
      if (activeVariants.length > 1) {
        const nextVariantIdx = (currentVariantIndex + 1) % activeVariants.length;
        setNodeVariantIndices((prev) => ({
          ...prev,
          [activeNode.id]: nextVariantIdx,
        }));
      }
      setCalisthenicsSeed(Math.floor(Math.random() * 90000 + 10000));
    } else {
      handleNextCubeOrProblem();
    }
  };

  // Evaluación de trazos de calistenia completada
  const handleCalisthenicsEvaluationComplete = (evalResult: StrokeEvaluation | null) => {
    setStrokeEvaluation(evalResult);
    if (!evalResult) return;

    const recordedScore = Math.round(evalResult.overallScore);
    setScoresHistory((prev) => [...prev.slice(-19), recordedScore]);

    if (evalResult.passed && recordedScore >= 90) {
      setAvatarMood('success-stars');
      setTimeout(() => setAvatarMood('neutral'), 2600);
      setXp((prev) => prev + 25);

      const currentStreak = masteryStreaks[activeNode.id] || 0;
      const newStreak = currentStreak + 1;
      setMasteryStreaks((prev) => ({ ...prev, [activeNode.id]: newStreak }));

      if (currentPhase < 3) {
        setCurrentPhase((prev) => (prev + 1) as 1 | 2 | 3);
      }

      // "pero tiene que cambiar" -> Avanzar automáticamente a la siguiente versión del ejercicio!
      if (activeVariants.length > 1) {
        const nextVariantIdx = (currentVariantIndex + 1) % activeVariants.length;
        setNodeVariantIndices((prev) => ({
          ...prev,
          [activeNode.id]: nextVariantIdx,
        }));
        setCalisthenicsSeed(Math.floor(Math.random() * 90000 + 10000));
      }

      if (newStreak < 3) {
        const nextVariantIdx = activeVariants.length > 1 ? (currentVariantIndex + 1) % activeVariants.length : 0;
        const nextVariant = activeVariants[nextVariantIdx];
        showToast(
          '🎯',
          `Racha: ${newStreak}/3 (≥90%)`,
          activeVariants.length > 1
            ? `¡Versión ${currentVariantIndex + 1}/${activeVariants.length} superada (${recordedScore}%)! Cambiando a: ${nextVariant.title}.`
            : `¡Gran precisión con ${recordedScore}%! Necesitas ${3 - newStreak} más seguidos ≥90% para superar ${activeNode.code}.`
        );
      } else {
        // Superado 3/3!
        setMasteryStreaks((prev) => ({ ...prev, [activeNode.id]: 0 }));

        const currentIndexInAll = allNodes.findIndex((n) => n.id === activeNode.id);
        const immediateNextNode =
          currentIndexInAll >= 0 && currentIndexInAll < allNodes.length - 1
            ? allNodes[currentIndexInAll + 1]
            : null;

        const nextUnits = units.map((unit) => ({
          ...unit,
          nodes: unit.nodes.map((n) => {
            if (n.id === activeNode.id) {
              return { ...n, status: 'completed' as const, score: Math.max(n.score || 0, recordedScore) };
            }
            if (immediateNextNode && n.id === immediateNextNode.id && n.status === 'locked') {
              return { ...n, status: 'current' as const };
            }
            return n;
          }),
        }));

        setUnits(nextUnits);
        setActiveNode((prev) =>
          prev ? { ...prev, status: 'completed', score: Math.max(prev.score || 0, recordedScore) } : prev
        );

        showToast(
          '✨',
          `¡Nivel ${activeNode.code} Superado! (3/3)`,
          immediateNextNode
            ? `Has dominado ${activeNode.code}. Nuevo nivel desbloqueado: ${immediateNextNode.code}`
            : `¡Maestría demostrada con 3 aciertos seguidos ≥90%!`,
          immediateNextNode ? `Ir a ${immediateNextNode.code}` : undefined,
          immediateNextNode ? () => handleSelectNode(immediateNextNode) : undefined
        );
      }
    } else {
      setAvatarMood('fail-spiral');
      setTimeout(() => setAvatarMood('neutral'), 3000);

      const prevStreak = masteryStreaks[activeNode.id] || 0;
      setMasteryStreaks((prev) => ({ ...prev, [activeNode.id]: 0 }));
      showToast(
        '⚠️',
        prevStreak > 0 ? `Racha reiniciada (${recordedScore}%)` : `Precisión: ${recordedScore}% (Requiere ≥90%)`,
        `Reintenta la Versión ${currentVariantIndex + 1} para dominarla con nota ≥90%.`
      );
      setCalisthenicsSeed(Math.floor(Math.random() * 90000 + 10000));
    }
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
    if (countDetectedAristas(strokes) === 0) return;
    const res = validateCubeDrawing(challenge, strokes, timeRemainingSeconds);
    setFeedback(res);
    setShowSolution(true);

    const currentScore = res.totalScore ?? res.score;

    // Registrar puntuación en el reto diario activo si existe
    if (dailySetSession && !dailySetSession.isCompleted) {
      const updatedProblems = [...dailySetSession.problems];
      updatedProblems[dailySetSession.currentIndex] = {
        ...updatedProblems[dailySetSession.currentIndex],
        score: currentScore,
        passed: res.passed,
      };

      const isLastProblem = dailySetSession.currentIndex >= dailySetSession.totalCount - 1;
      if (isLastProblem) {
        const completedSession: DailySetSession = {
          ...dailySetSession,
          problems: updatedProblems,
          isCompleted: true,
          completedAt: new Date().toISOString(),
        };
        const historyItem = recordCompletedDailySet(completedSession);
        setDailySetHistory((prev) => [historyItem, ...prev]);
        setDailySetSession(null);
        // Bonus de Hábito Diario por completar el lote de ejercicios (+50 XP)
        setXp((prev) => prev + 50);
        setCompletedDailySetForModal(historyItem);
      } else {
        setDailySetSession({
          ...dailySetSession,
          problems: updatedProblems,
        });
      }
    }

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

      // Actualizar racha diaria
      const streakResult = recordDailyPractice(streak);
      setStreak(streakResult.newStreak);
      if (streakResult.isNewDay) {
        showToast('🔥', `¡Racha Diaria: ${streakResult.newStreak} días!`, 'Has registrado tu práctica de hoy. Haz clic en la llama del menú superior para ver tu historial.');
      }

      setScoresHistory((prev) => [...prev, recordedScore]);

      // Si se estaba realizando un examen de nivelación y se ha aprobado
      if (placementTestNode && placementTestNode.id === activeNode?.id) {
        const ffResult = fastForwardCurriculum(units, placementTestNode.id, Math.round(recordedScore));
        setUnits(ffResult.updatedUnits);
        const placementBonusXp = 50 + ffResult.addedXp;
        setXp((prev) => prev + placementBonusXp);
        setPlacementTestNode(null);
        setActiveNode((prev) => (prev ? { ...prev, status: 'current' } : prev));
        showToast('⚡', '¡Examen Convalidado!', `Has saltado hasta el nivel ${placementTestNode.code} (+50 XP).`);
        return;
      }

      // GESTIÓN DE NIVELES Y PROGRESIÓN SECUENCIAL
      if (activeNode) {
        // CASO A: Nivel inferior ya superado ('completed')
        // Regla estricta: Practicar un nivel inferior NUNCA desbloquea niveles futuros. Solo actualiza su récord.
        if (activeNode.status === 'completed') {
          if (recordedScore > (activeNode.score || 0)) {
            setUnits((prevUnits) =>
              prevUnits.map((unit) => ({
                ...unit,
                nodes: unit.nodes.map((n) =>
                  n.id === activeNode.id
                    ? { ...n, score: Math.max(n.score || 0, recordedScore) }
                    : n
                ),
              }))
            );
            setActiveNode((prev) => (prev ? { ...prev, score: Math.max(prev.score || 0, recordedScore) } : prev));
          }
          return;
        }

        // CASO B: Nivel activo actual ('current')
        // Regla pedagógica: Se requieren AL MENOS 3 CUBOS SEGUIDOS CON NOTA ≥90% para superar el nivel
        if (activeNode.status === 'current') {
          if (recordedScore >= 90) {
            const currentStreak = masteryStreaks[activeNode.id] || 0;
            const newStreak = currentStreak + 1;
            setMasteryStreaks((prev) => ({ ...prev, [activeNode.id]: newStreak }));

            if (newStreak < 3) {
              // Aún no ha alcanzado los 3 cubos seguidos
              showToast(
                '🎯',
                `Racha de Maestría: ${newStreak}/3 (≥90%)`,
                newStreak === 1
                  ? `¡Gran cubo con ${recordedScore}%! Necesitas 2 cubos más seguidos ≥90% para superar ${activeNode.code}.`
                  : `¡Excelente precisión (${recordedScore}%)! Solo te falta 1 cubo más para superar ${activeNode.code}.`
              );
            } else {
              // ¡HA COMPLETADO 3 CUBOS SEGUIDOS CON ≥90%! Supera el nivel
              setMasteryStreaks((prev) => ({ ...prev, [activeNode.id]: 0 }));

              // Buscar estrictamente el SIGUIENTE nodo inmediato en la lista secuencial
              const currentIndexInAll = allNodes.findIndex((n) => n.id === activeNode.id);
              const immediateNextNode =
                currentIndexInAll >= 0 && currentIndexInAll < allNodes.length - 1
                  ? allNodes[currentIndexInAll + 1]
                  : null;

              const nextUnits = units.map((unit) => ({
                ...unit,
                nodes: unit.nodes.map((n) => {
                  if (n.id === activeNode.id) {
                    return { ...n, status: 'completed' as const, score: Math.max(n.score || 0, recordedScore) };
                  }
                  // Solo se desbloquea el nodo inmediatamente siguiente si estaba bloqueado
                  if (immediateNextNode && n.id === immediateNextNode.id && n.status === 'locked') {
                    return { ...n, status: 'current' as const };
                  }
                  return n;
                }),
              }));

              setUnits(nextUnits);
              setActiveNode((prev) => (prev ? { ...prev, status: 'completed', score: Math.max(prev.score || 0, recordedScore) } : prev));

              if (immediateNextNode && immediateNextNode.status === 'locked') {
                showToast(
                  '✨',
                  `¡Nivel ${activeNode.code} Superado! (3/3)`,
                  `Has dominado ${activeNode.code}. Nuevo nivel desbloqueado: ${immediateNextNode.code} ${immediateNextNode.title}`,
                  `Ir a ${immediateNextNode.code}`,
                  () => handleSelectNode(immediateNextNode)
                );
              } else {
                showToast(
                  '✨',
                  `¡Nivel ${activeNode.code} Superado! (3/3)`,
                  `¡Maestría demostrada con 3 cubos seguidos ≥90%!`
                );
              }
            }
          } else {
            // La nota fue < 90%: la racha consecutiva se rompe y reinicia a 0
            const prevStreak = masteryStreaks[activeNode.id] || 0;
            setMasteryStreaks((prev) => ({ ...prev, [activeNode.id]: 0 }));
            if (prevStreak > 0) {
              showToast(
                '⚠️',
                `Racha reiniciada (${recordedScore}%)`,
                `Para superar ${activeNode.code} necesitas 3 cubos consecutivos con nota ≥90%. ¡Sigue practicando!`
              );
            }
          }
        }
      }
    } else {
      // Suspenso: avatar con espirales y sudor
      setAvatarMood('fail-spiral');
      setTimeout(() => setAvatarMood('neutral'), 3500);

      // Si estaba en el nivel actual, romper la racha de maestría
      if (activeNode && activeNode.status === 'current') {
        const prevStreak = masteryStreaks[activeNode.id] || 0;
        setMasteryStreaks((prev) => ({ ...prev, [activeNode.id]: 0 }));
        if (prevStreak > 0) {
          showToast(
            '⚠️',
            `Racha reiniciada`,
            `Para superar ${activeNode.code} necesitas 3 cubos seguidos con nota ≥90%.`
          );
        }
      }
    }
  };

  // Reiniciar todo el progreso
  const handleResetProgress = () => {
    localStorage.clear();
    setUnits(MODULE_PARALLELEPIPEDS.units);
    setStreak(0);
    setXp(0);
    setScoresHistory([]);
    setMasteryStreaks({});
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
            <div
              onClick={() => setStreakModalState({ isOpen: true, isNewDayAward: false })}
              className="flex items-center gap-1 border-2 border-black px-2 py-1 text-xs font-mono font-bold shadow-[2px_2px_0px_#000000] cursor-pointer hover:bg-neutral-100 transition-colors"
              title={`Racha: ${streak} días seguidos — Clic para ver historial semanal`}
            >
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
            <div
              onClick={() => setStreakModalState({ isOpen: true, isNewDayAward: false })}
              className="flex items-center gap-0.5 border-2 border-black px-1.5 py-1 text-[11px] font-mono font-bold shadow-[1px_1px_0px_#000000] cursor-pointer active:scale-95"
              title={`Racha: ${streak} días seguidos — Clic para ver historial`}
            >
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

        {/* PESTAÑA 1: HOME / PRÁCTICA RÁPIDA (CON BARRA LATERAL ORGANIZADA Y LIENZO AGRANDADO) */}
        {activeTab === 'practice' && (
          <div className="flex-1 w-full flex flex-col md:flex-row overflow-hidden relative min-h-[calc(100vh-64px)] bg-neutral-100">
            {/* BARRA LATERAL IZQUIERDA (COLLAPSIBLE SIDEBAR) */}
            <aside
              className={`bg-white border-r-2 border-black transition-all duration-200 flex flex-col z-20 shrink-0 select-none ${
                isSidebarCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-full md:w-80 shadow-[4px_0px_0px_#000000]'
              }`}
            >
              <div className="w-full md:w-80 flex flex-col h-full overflow-y-auto p-3 sm:p-4 space-y-3 font-sans">
                {/* 1. SELECTOR SUPERIOR: [ EL CAMINO ] vs [ RETO DIARIO ] */}
                <div className="grid grid-cols-2 gap-1.5 p-1 border-2 border-black bg-neutral-100 shadow-[2px_2px_0px_#000000]">
                  <button
                    onClick={() => setPracticeMode('camino')}
                    className={`py-1.5 px-2 text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-black transition-colors ${
                      practiceMode === 'camino'
                        ? 'bg-black text-white shadow-[1px_1px_0px_#000000]'
                        : 'bg-white text-black hover:bg-neutral-200'
                    }`}
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>El Camino</span>
                  </button>
                  <button
                    onClick={() => setPracticeMode('daily')}
                    className={`py-1.5 px-2 text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-black transition-colors ${
                      practiceMode === 'daily'
                        ? 'bg-black text-white shadow-[1px_1px_0px_#000000]'
                        : 'bg-white text-black hover:bg-neutral-200'
                    }`}
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>Reto Diario</span>
                  </button>
                </div>

                {/* 2. SI MODO ES "EL CAMINO": CONTROLES DEL CAMINO */}
                {practiceMode === 'camino' && (
                  <div className="space-y-3">
                    {/* Selector de Módulo (desplegable compacto) */}
                    <div className="flex items-center gap-1.5 border-2 border-black px-2 py-1 bg-neutral-50 shadow-[2px_2px_0px_#000000]">
                      <span className="text-[10px] font-mono uppercase font-bold text-neutral-500 shrink-0">
                        Módulo:
                      </span>
                      <select
                        value={activeModuleId}
                        onChange={(e) => handleSelectModule(e.target.value)}
                        className="flex-1 bg-white border border-black px-1.5 py-0.5 text-xs font-mono font-bold cursor-pointer truncate"
                      >
                        <option value="module-calisthenics">1. Trazos & Calistenia</option>
                        <option value="module-cubes">2. Paralelepípedos & Cajas</option>
                      </select>
                    </div>

                    {/* Selector de Nivel / Lección */}
                    <div className="border-2 border-black p-2 bg-white shadow-[2px_2px_0px_#000000]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold">
                          Lección:
                        </span>
                        {activeNode?.status === 'completed' && (
                          <span className="text-[9px] font-mono px-1 py-0.2 bg-black text-white font-bold">
                            Superado ✓
                          </span>
                        )}
                      </div>
                      <select
                        value={activeNode?.id || ''}
                        onChange={(e) => handleSelectLessonById(e.target.value)}
                        className="w-full border-2 border-black px-2 py-1.5 text-xs font-mono font-bold bg-white cursor-pointer truncate"
                      >
                        {unlockedNodes.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.code} · {n.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* SELECTOR DE VERSIONES DEL NIVEL (PARA CALISTENIA) */}
                    {activeNode?.isCalisthenics && activeVariants.length > 1 && (
                      <div className="border-2 border-black p-2 bg-neutral-50 shadow-[2px_2px_0px_#000000] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 font-bold">
                            Versiones a Superar:
                          </span>
                          <span className="text-[11px] font-mono font-bold bg-black text-white px-1.5 py-0.2">
                            {currentVariantIndex + 1} / {activeVariants.length}
                          </span>
                        </div>

                        {/* Botones de versiones con scroll horizontal */}
                        <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-thin">
                          {activeVariants.map((v, idx) => (
                            <button
                              key={v.id || idx}
                              onClick={() => {
                                setNodeVariantIndices((prev) => ({ ...prev, [activeNode.id]: idx }));
                                setCalisthenicsSeed(Math.floor(Math.random() * 90000 + 10000));
                              }}
                              className={`w-6 h-6 shrink-0 border-2 border-black text-xs font-mono font-bold flex items-center justify-center cursor-pointer transition-colors ${
                                currentVariantIndex === idx
                                  ? 'bg-black text-white shadow-[1px_1px_0px_#000000]'
                                  : 'bg-white text-black hover:bg-neutral-200'
                              }`}
                              title={`Versión ${idx + 1}: ${v.title}`}
                            >
                              {idx + 1}
                            </button>
                          ))}
                        </div>

                        {/* Nombre de la versión activa */}
                        <div className="text-[11px] font-sans text-neutral-800 leading-tight border-t border-neutral-300 pt-1.5">
                          <span className="font-mono font-bold">V{currentVariantIndex + 1}: </span>
                          <span className="font-semibold">{currentExerciseDef.title}</span>
                          {currentExerciseDef.desc && (
                            <p className="text-[10px] text-neutral-500 font-sans mt-0.5 leading-snug">
                              {currentExerciseDef.desc}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* INDICADORES COMPACTOS: MAESTRÍA (3 CUBOS) + FASES (3 BOTONES) EN 1 SOLA LÍNEA */}
                    <div className="border-2 border-black px-2 py-1 bg-neutral-50 shadow-[2px_2px_0px_#000000] flex items-center justify-between gap-1 text-xs font-mono">
                      {/* Racha de Maestría */}
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] font-bold uppercase text-neutral-500">Maestría:</span>
                        <div className="flex items-center gap-0.5">
                          {[0, 1, 2].map((i) => (
                            <span
                              key={i}
                              className={`w-3.5 h-3.5 border border-black flex items-center justify-center text-[8px] font-bold ${
                                i < currentMasteryStreak
                                  ? 'bg-black text-white'
                                  : 'bg-white text-transparent'
                              }`}
                            >
                              ✓
                            </span>
                          ))}
                        </div>
                        <span className="text-[10px] font-bold tabular-nums">
                          {currentMasteryStreak}/3
                        </span>
                        <button
                          onClick={() => setShowMasteryStreakInfo(true)}
                          className="w-4 h-4 border border-black flex items-center justify-center text-[9px] font-bold hover:bg-black hover:text-white transition-colors cursor-pointer ml-0.5"
                          title="Información sobre la Racha de Maestría"
                        >
                          i
                        </button>
                      </div>

                      {/* Fases Cinemáticas (SOLO EN TRAZOS) */}
                      {activeNode?.isCalisthenics && (
                        <div className="flex items-center gap-1 pl-1.5 border-l border-neutral-300 shrink-0">
                          <span className="text-[10px] font-bold uppercase text-neutral-500">Fase:</span>
                          <div className="flex items-center gap-0.5">
                            {[
                              { num: 1 as const, label: '1', title: 'Fase 1: Precisión' },
                              { num: 2 as const, label: '2', title: 'Fase 2: Fluidez' },
                              { num: 3 as const, label: '3', title: 'Fase 3: Velocidad' },
                            ].map((f) => (
                              <button
                                key={f.num}
                                onClick={() => setCurrentPhase(f.num)}
                                className={`w-4 h-4 border border-black text-[9px] font-bold flex items-center justify-center cursor-pointer transition-colors ${
                                  currentPhase === f.num
                                    ? 'bg-black text-white shadow-[1px_1px_0px_#000000]'
                                    : 'bg-white text-black hover:bg-neutral-200'
                                }`}
                                title={f.title}
                              >
                                {f.label}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => setShowKinematicPhasesInfo(true)}
                            className="w-4 h-4 border border-black flex items-center justify-center text-[9px] font-bold hover:bg-black hover:text-white transition-colors cursor-pointer ml-0.5"
                            title="Información sobre las 3 Fases Cinemáticas"
                          >
                            i
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. SI MODO ES "RETO DIARIO": CONTROLES DE DAILY CHALLENGE */}
                {practiceMode === 'daily' && (
                  <DailyChallengePanel
                    unlockedNodes={unlockedNodes}
                    activeSession={dailySetSession}
                    onStartChallenge={handleStartDailyChallenge}
                    onCancelChallenge={handleCancelDailyChallenge}
                    history={dailySetHistory}
                    onClearHistory={handleClearDailyHistory}
                  />
                )}

                {/* 3. BOTONES DE ACCIÓN DEL LIENZO (Corregir, Deshacer, Borrar, Siguiente, etc.) */}
                <div className="border-2 border-black p-2 bg-white shadow-[2px_2px_0px_#000000] space-y-1.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold">
                      Acciones:
                    </span>
                  </div>

                  {/* Botón Principal Destacado: Corregir / Validar */}
                  <button
                    onClick={handleSidebarEvaluate}
                    className="btn-ink w-full py-1.5 px-2 text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
                    title={activeNode?.isCalisthenics ? "Corregir trazo y ver nota (Enter)" : "Validar perspectiva (Enter)"}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{activeNode?.isCalisthenics ? "Corregir Trazo" : "Validar Dibujo"}</span>
                  </button>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={handleSidebarUndo}
                      className="btn-ink-outline py-1 px-2 text-xs font-mono font-bold flex items-center justify-center gap-1 cursor-pointer"
                      title="Deshacer último trazo (Ctrl+Z)"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Deshacer</span>
                    </button>
                    <button
                      onClick={handleSidebarClear}
                      className="btn-ink-outline py-1 px-2 text-xs font-mono font-bold flex items-center justify-center gap-1 cursor-pointer hover:bg-red-50 hover:text-red-700"
                      title="Borrar todo el lienzo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Borrar</span>
                    </button>
                  </div>

                  <button
                    onClick={handleSidebarNext}
                    className="btn-ink-outline w-full py-1 px-2 text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Generar nuevo reto con la misma lección o pasar al siguiente"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Siguiente / Nuevo</span>
                  </button>

                  <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-neutral-200">
                    <button
                      onClick={() => setShowUserStrokes((prev) => !prev)}
                      className={`py-1 px-1.5 text-[11px] font-mono font-bold flex items-center justify-center gap-1 border border-black cursor-pointer transition-colors ${
                        showUserStrokes ? 'bg-neutral-100 text-black' : 'bg-neutral-200 text-neutral-500 line-through'
                      }`}
                      title="Ocultar o mostrar trazo dibujado"
                    >
                      {showUserStrokes ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span className="truncate">Trazo</span>
                    </button>
                    <button
                      onClick={() => setShowSolution((prev) => !prev)}
                      className={`py-1 px-1.5 text-[11px] font-mono font-bold flex items-center justify-center gap-1 border border-black cursor-pointer transition-colors ${
                        showSolution ? 'bg-neutral-100 text-black' : 'bg-neutral-200 text-neutral-500 line-through'
                      }`}
                      title="Ocultar o mostrar guías y solución"
                    >
                      {showSolution ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span className="truncate">Solución</span>
                    </button>
                  </div>
                </div>

                {/* NOTA Y EVALUACIÓN EN LA BARRA LATERAL (SI SE HA EVALUADO EN TRAZOS) */}
                {activeNode?.isCalisthenics && strokeEvaluation && (
                  <div className="border-2 border-black p-2 bg-neutral-50 shadow-[2px_2px_0px_#000000] text-xs space-y-1">
                    <div className="flex items-center justify-between font-mono font-bold">
                      <span className="flex items-center gap-1">
                        {strokeEvaluation.passed ? (
                          <CheckCircle className="w-3.5 h-3.5 text-black" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-black" />
                        )}
                        <span>NOTA: {Math.round(strokeEvaluation.overallScore)}%</span>
                      </span>
                      <span
                        className={`text-[9px] px-1 py-0.2 uppercase font-bold ${
                          strokeEvaluation.passed && strokeEvaluation.overallScore >= 90
                            ? 'bg-black text-white'
                            : strokeEvaluation.passed
                            ? 'bg-neutral-200 text-black border border-black'
                            : 'bg-white text-black border border-black'
                        }`}
                      >
                        {strokeEvaluation.passed && strokeEvaluation.overallScore >= 90
                          ? 'Excelente'
                          : strokeEvaluation.passed
                          ? 'Aprobado'
                          : 'Reintentar'}
                      </span>
                    </div>
                    <p className="text-[11px] font-sans text-neutral-700 leading-snug">
                      {strokeEvaluation.feedbackTitle}
                    </p>
                  </div>
                )}

                {/* 4. DETALLES Y GUÍA DE LA LECCIÓN ACTIVA */}
                {activeNode && (
                  <div className="border border-black p-2.5 bg-neutral-50 text-xs">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-mono font-bold bg-black text-white px-1.5 py-0.2 text-[10px]">
                        {activeNode.code}
                      </span>
                      <span className="font-display font-bold truncate">
                        {activeNode.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-600 font-sans leading-snug">
                      {activeNode.subtitle}
                    </p>
                  </div>
                )}

                {/* Sensei Cubo opcional al fondo del sidebar */}
                <div className="pt-2 flex justify-center">
                  <SenseiCubo
                    mood={avatarMood}
                    isDrawing={isUserDrawing}
                    size={110}
                    onPoke={() => {
                      setAvatarMood('poked');
                      setTimeout(() => setAvatarMood('neutral'), 1800);
                    }}
                  />
                </div>
              </div>
            </aside>

            {/* BOTÓN LATERAL PARA OCULTAR / DESPLEGAR LA BARRA */}
            <div className="relative z-30">
              <button
                onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                className="absolute top-3 left-1 bg-black text-white p-2 border-2 border-black shadow-[2px_2px_0px_#ffffff] cursor-pointer hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                title={isSidebarCollapsed ? "Mostrar panel lateral" : "Ocultar panel lateral (maximizar lienzo)"}
              >
                {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>

            {/* ÁREA CENTRAL: LIENZO 100% CENTRADO Y MÁS GRANDE */}
            <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 overflow-hidden min-h-0">
              <div className="w-full flex flex-col items-center justify-center max-w-2xl lg:max-w-3xl">
                {activeNode?.isCalisthenics ? (
                  <StrokePracticeCanvas
                    ref={strokeCanvasRef}
                    exerciseDef={currentExerciseDef}
                    currentPhase={currentPhase}
                    showSolution={showSolution}
                    showUserStrokes={showUserStrokes}
                    seed={calisthenicsSeed}
                    onNewSeed={setCalisthenicsSeed}
                    onDrawingStateChange={setIsUserDrawing}
                    onPhaseAdvance={(nextPhase) => setCurrentPhase(nextPhase)}
                    onEvaluationComplete={handleCalisthenicsEvaluationComplete}
                    onNext={handleSidebarNext}
                  />
                ) : (
                  <DrawingCanvas
                    ref={cubeCanvasRef}
                    challenge={challenge}
                    feedback={feedback}
                    onStrokesChange={setStrokes}
                    showSolution={showSolution}
                    showUserDrawing={showUserStrokes}
                    showParametricSolution={showSolution}
                    onValidate={handleValidate}
                    onNextCube={handleNextCubeOrProblem}
                    onDrawingStateChange={setIsUserDrawing}
                    activeLesson={activeNode}
                  />
                )}
              </div>
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
                {activeModuleId === 'module-calisthenics' ? 'MÓDULO 1' : 'MÓDULO 2'}
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold font-display mt-2">
                {activeModuleId === 'module-calisthenics' ? MODULE_CALISTHENICS.name : MODULE_PARALLELEPIPEDS.name}
              </h1>
              <p className="text-sm text-neutral-600 font-sans max-w-md mx-auto mt-1">
                {activeModuleId === 'module-calisthenics' ? MODULE_CALISTHENICS.subtitle : MODULE_PARALLELEPIPEDS.subtitle}
              </p>
            </div>

            <LearningPath
              units={units}
              activeModuleId={activeModuleId}
              onSelectModule={handleSelectModule}
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
      <TinyToast toast={toast} onClose={() => setToast(null)} />
      <StreakModal
        streak={streak}
        isOpen={streakModalState.isOpen}
        isNewDayAward={streakModalState.isNewDayAward}
        onClose={() => setStreakModalState({ isOpen: false, isNewDayAward: false })}
      />
      {completedDailySetForModal && (
        <DailySetCompletedModal
          completedSet={completedDailySetForModal}
          onClose={() => setCompletedDailySetForModal(null)}
        />
      )}
      <MasteryStreakInfoModal
        isOpen={showMasteryStreakInfo}
        onClose={() => setShowMasteryStreakInfo(false)}
      />
      <KinematicPhasesInfoModal
        isOpen={showKinematicPhasesInfo}
        onClose={() => setShowKinematicPhasesInfo(false)}
      />
    </div>
  );
}

export default App;
