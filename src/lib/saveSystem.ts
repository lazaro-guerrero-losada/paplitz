import { Unit } from './curriculumData';

export interface PaplitzSaveData {
  appName: 'Paplitz';
  version: number;
  exportDate: string;
  streak: number;
  xp: number;
  scoresHistory: number[];
  units: Unit[];
  minigames?: Record<string, unknown>;
}

export const SAVE_SCHEMA_VERSION = 1;

/**
 * Recopila todo el estado actual del juego en una estructura de datos normalizada
 */
export function buildCurrentSaveData(
  units: Unit[],
  streak: number,
  xp: number,
  scoresHistory: number[]
): PaplitzSaveData {
  let minigames: Record<string, unknown> = {};
  try {
    const savedMinigames = localStorage.getItem('paplitz_minigame_records');
    if (savedMinigames) {
      minigames = JSON.parse(savedMinigames);
    }
  } catch (e) {
    console.warn('[SaveSystem] No se pudieron leer los récords de minijuegos:', e);
  }

  return {
    appName: 'Paplitz',
    version: SAVE_SCHEMA_VERSION,
    exportDate: new Date().toISOString(),
    streak: Math.max(0, streak || 0),
    xp: Math.max(0, xp || 0),
    scoresHistory: Array.isArray(scoresHistory) ? scoresHistory : [],
    units: units || [],
    minigames,
  };
}

/**
 * Valida minuciosamente si una estructura recibida es un guardado legítimo de Paplitz
 */
export function validateSaveData(data: unknown): { valid: boolean; error?: string; data?: PaplitzSaveData } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'El contenido del archivo no es un objeto válido.' };
  }

  const candidate = data as Partial<PaplitzSaveData>;

  if (candidate.appName !== 'Paplitz') {
    return { valid: false, error: 'El archivo no corresponde a una copia de seguridad de Paplitz.' };
  }

  if (typeof candidate.version !== 'number' || candidate.version < 1) {
    return { valid: false, error: 'Versión del archivo de guardado no compatible o corrupta.' };
  }

  if (!Array.isArray(candidate.units) || candidate.units.length === 0) {
    return { valid: false, error: 'El archivo no contiene información de lecciones (units).' };
  }

  // Comprobar que las unidades tienen estructura mínima
  for (const unit of candidate.units) {
    if (!unit || typeof unit.id !== 'string' || !Array.isArray(unit.nodes)) {
      return { valid: false, error: 'Estructura de lecciones dañada en el archivo de guardado.' };
    }
  }

  const cleanData: PaplitzSaveData = {
    appName: 'Paplitz',
    version: candidate.version,
    exportDate: typeof candidate.exportDate === 'string' ? candidate.exportDate : new Date().toISOString(),
    streak: typeof candidate.streak === 'number' ? Math.max(0, candidate.streak) : 0,
    xp: typeof candidate.xp === 'number' ? Math.max(0, candidate.xp) : 0,
    scoresHistory: Array.isArray(candidate.scoresHistory) ? candidate.scoresHistory : [],
    units: candidate.units,
    minigames: candidate.minigames && typeof candidate.minigames === 'object' ? candidate.minigames : {},
  };

  return { valid: true, data: cleanData };
}

/**
 * Descarga el archivo paplitz_progreso_YYYY-MM-DD.json en el dispositivo
 */
export function downloadSaveFile(saveData: PaplitzSaveData, customFilename?: string): void {
  const jsonString = JSON.stringify(saveData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = customFilename || `paplitz_progreso_${dateStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copia el archivo de guardado en formato JSON al portapapeles
 */
export async function copySaveToClipboard(saveData: PaplitzSaveData): Promise<boolean> {
  try {
    const compactString = JSON.stringify(saveData);
    await navigator.clipboard.writeText(compactString);
    return true;
  } catch (err) {
    console.error('[SaveSystem] Error al copiar al portapapeles:', err);
    return false;
  }
}

/**
 * Parsea e importa datos desde un string (JSON)
 */
export function parseSaveFromString(text: string): { valid: boolean; error?: string; data?: PaplitzSaveData } {
  try {
    const parsed = JSON.parse(text.trim());
    return validateSaveData(parsed);
  } catch {
    return { valid: false, error: 'El texto no tiene un formato JSON válido.' };
  }
}

/**
 * Aplica los datos de guardado directamente a localStorage
 */
export function applySaveDataToLocalStorage(data: PaplitzSaveData): void {
  localStorage.setItem('paplitz_units', JSON.stringify(data.units));
  localStorage.setItem('paplitz_streak', data.streak.toString());
  localStorage.setItem('paplitz_xp', data.xp.toString());
  localStorage.setItem('paplitz_scores', JSON.stringify(data.scoresHistory));
  if (data.minigames) {
    localStorage.setItem('paplitz_minigame_records', JSON.stringify(data.minigames));
  }
}

/**
 * Convalida y desbloquea el currículum hasta un nodo objetivo (Fast-Forward / Salto de Nivel).
 * Marca como 'completed' todas las lecciones previas al nodo objetivo (con la nota indicada),
 * coloca el nodo objetivo como 'current' (o 'completed' si ya lo estaba), y calcula los XP acumulados.
 */
export function fastForwardCurriculum(
  currentUnits: Unit[],
  targetNodeId: string,
  defaultScore: number = 80
): {
  updatedUnits: Unit[];
  addedXp: number;
  unlockedCount: number;
} {
  let passedTarget = false;
  let addedXp = 0;
  let unlockedCount = 0;

  const updatedUnits = currentUnits.map((unit) => ({
    ...unit,
    nodes: unit.nodes.map((node) => {
      if (passedTarget) {
        // Todo lo posterior al nodo objetivo se mantiene como bloqueado
        return {
          ...node,
          status: 'locked' as const,
        };
      }

      if (node.id === targetNodeId) {
        passedTarget = true;
        // El nodo objetivo se fija como el actual en curso
        return {
          ...node,
          status: 'current' as const,
        };
      }

      // Nodos anteriores al objetivo: convalidar como completados
      const wasCompleted = node.status === 'completed';
      if (!wasCompleted) {
        addedXp += node.xpReward || 15;
        unlockedCount++;
      }

      return {
        ...node,
        status: 'completed' as const,
        score: node.score || defaultScore,
      };
    }),
  }));

  return {
    updatedUnits,
    addedXp,
    unlockedCount,
  };
}

