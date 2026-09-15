export interface PlayerLevelInfo {
  level: number;
  title: string;
  currentXp: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  xpInCurrentLevel: number;
  xpNeededForCurrentLevel: number;
  progressPercent: number;
  xpRemaining: number;
}

const LEVEL_THRESHOLDS = [
  { level: 1, xpRequired: 0, title: 'Bocetista Inicial' },
  { level: 2, xpRequired: 100, title: 'Aprendiz de Perspectiva' },
  { level: 3, xpRequired: 250, title: 'Trazador Angular' },
  { level: 4, xpRequired: 450, title: 'Geómetra de Líneas' },
  { level: 5, xpRequired: 700, title: 'Entintador Técnico' },
  { level: 6, xpRequired: 1000, title: 'Maestro del Escorzo' },
  { level: 7, xpRequired: 1400, title: 'Arquitecto Espacial' },
  { level: 8, xpRequired: 1900, title: 'Virtuoso de la Perspectiva' },
  { level: 9, xpRequired: 2500, title: 'Gran Maestro del 3D' },
  { level: 10, xpRequired: 3200, title: 'Leyenda de la Perspectiva' },
];

export function calculatePlayerLevel(xp: number): PlayerLevelInfo {
  const safeXp = Math.max(0, Math.floor(xp));

  let currentTier = LEVEL_THRESHOLDS[0];
  let nextTier = LEVEL_THRESHOLDS[1];

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (safeXp >= LEVEL_THRESHOLDS[i].xpRequired) {
      currentTier = LEVEL_THRESHOLDS[i];
      nextTier = LEVEL_THRESHOLDS[i + 1] ?? null;
      break;
    }
  }

  // Si ya superó el nivel máximo
  if (!nextTier) {
    return {
      level: currentTier.level,
      title: currentTier.title,
      currentXp: safeXp,
      xpForCurrentLevel: currentTier.xpRequired,
      xpForNextLevel: currentTier.xpRequired,
      xpInCurrentLevel: safeXp - currentTier.xpRequired,
      xpNeededForCurrentLevel: 1,
      progressPercent: 100,
      xpRemaining: 0,
    };
  }

  const xpInCurrentLevel = safeXp - currentTier.xpRequired;
  const xpNeededForCurrentLevel = nextTier.xpRequired - currentTier.xpRequired;
  const progressPercent = Math.min(100, Math.max(0, Math.round((xpInCurrentLevel / xpNeededForCurrentLevel) * 100)));
  const xpRemaining = Math.max(0, nextTier.xpRequired - safeXp);

  return {
    level: currentTier.level,
    title: currentTier.title,
    currentXp: safeXp,
    xpForCurrentLevel: currentTier.xpRequired,
    xpForNextLevel: nextTier.xpRequired,
    xpInCurrentLevel,
    xpNeededForCurrentLevel,
    progressPercent,
    xpRemaining,
  };
}
