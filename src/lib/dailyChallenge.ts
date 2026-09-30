import { LessonNode } from './curriculumData';

export interface DailyProblem {
  id: number; // 1-indexed (1..N)
  seed: number;
  node: LessonNode;
  score?: number;
  passed?: boolean;
}

export interface DailySetSession {
  id: string;
  createdAt: string;
  completedAt?: string;
  totalCount: number;
  currentIndex: number; // 0-indexed
  levelMode: 'random' | 'specific';
  selectedNodeIds: string[];
  problems: DailyProblem[];
  isCompleted: boolean;
  averageScore?: number;
}

export interface DailySetHistoryMark {
  index: number;
  score: number;
  passed: boolean;
  nodeCode: string;
  nodeTitle: string;
}

export interface DailySetHistoryItem {
  id: string;
  date: string;
  totalCount: number;
  averageScore: number;
  passedCount: number;
  levelMode: 'random' | 'specific';
  levelSummary: string;
  marks: DailySetHistoryMark[];
}

const STORAGE_KEY_ACTIVE = 'paplitz_active_daily_set';
const STORAGE_KEY_HISTORY = 'paplitz_daily_challenge_history';

/**
 * Creates a new Daily Challenge session with N exercises.
 */
export function createDailyChallenge(
  totalCount: number,
  levelMode: 'random' | 'specific',
  selectedNodeIds: string[],
  unlockedNodes: LessonNode[]
): DailySetSession {
  const safeCount = Math.max(1, Math.min(30, totalCount || 12));
  const fallbackNodes = unlockedNodes.length > 0 ? unlockedNodes : [];

  let candidateNodes = fallbackNodes;
  if (levelMode === 'specific' && selectedNodeIds.length > 0) {
    const filtered = fallbackNodes.filter((n) => selectedNodeIds.includes(n.id));
    if (filtered.length > 0) {
      candidateNodes = filtered;
    }
  }

  const problems: DailyProblem[] = [];
  for (let i = 1; i <= safeCount; i++) {
    // Pick node for this problem
    const nodeIndex =
      levelMode === 'random'
        ? Math.floor(Math.random() * candidateNodes.length)
        : (i - 1) % candidateNodes.length;
    const chosenNode = candidateNodes[nodeIndex] || fallbackNodes[0];

    const seed = Math.floor(Math.random() * 900000) + 100000;
    problems.push({
      id: i,
      seed,
      node: chosenNode,
    });
  }

  return {
    id: `daily-set-${Date.now()}`,
    createdAt: new Date().toISOString(),
    totalCount: safeCount,
    currentIndex: 0,
    levelMode,
    selectedNodeIds,
    problems,
    isCompleted: false,
  };
}

/**
 * Loads the active daily set from localStorage, re-binding node references.
 */
export function loadActiveDailySet(allNodes: LessonNode[]): DailySetSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE);
    if (!raw) return null;
    const parsed: DailySetSession = JSON.parse(raw);
    if (!parsed || !parsed.problems || parsed.isCompleted) return null;

    // Re-link node references so they have proper lesson definitions
    const rehydratedProblems: DailyProblem[] = parsed.problems.map((p) => {
      const matchedNode = allNodes.find((n) => n.id === p.node?.id) || p.node;
      return {
        ...p,
        node: matchedNode,
      };
    });

    return {
      ...parsed,
      problems: rehydratedProblems,
    };
  } catch (err) {
    console.error('Failed to load active daily set:', err);
    return null;
  }
}

/**
 * Saves the active daily set to localStorage.
 */
export function saveActiveDailySet(session: DailySetSession | null): void {
  try {
    if (!session || session.isCompleted) {
      localStorage.removeItem(STORAGE_KEY_ACTIVE);
    } else {
      localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(session));
    }
  } catch (err) {
    console.error('Failed to save active daily set:', err);
  }
}

/**
 * Loads the history of completed daily sets from localStorage.
 */
export function loadDailyChallengeHistory(): DailySetHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load daily challenge history:', err);
    return [];
  }
}

/**
 * Saves the daily challenge history list to localStorage.
 */
export function saveDailyChallengeHistory(history: DailySetHistoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
  } catch (err) {
    console.error('Failed to save daily challenge history:', err);
  }
}

/**
 * Converts a finished DailySetSession into a DailySetHistoryItem and persists it.
 */
export function recordCompletedDailySet(session: DailySetSession): DailySetHistoryItem {
  const marks: DailySetHistoryMark[] = session.problems.map((p, idx) => ({
    index: idx + 1,
    score: p.score ?? 0,
    passed: p.passed ?? (p.score !== undefined ? p.score >= 70 : false),
    nodeCode: p.node.code || `L${idx + 1}`,
    nodeTitle: p.node.title || 'Ejercicio',
  }));

  const totalScoreSum = marks.reduce((acc, m) => acc + m.score, 0);
  const averageScore = marks.length > 0 ? Math.round(totalScoreSum / marks.length) : 0;
  const passedCount = marks.filter((m) => m.passed).length;

  let levelSummary = 'Aleatorio (Varios niveles)';
  if (session.levelMode === 'specific') {
    const uniqueCodes = Array.from(new Set(session.problems.map((p) => p.node.code)));
    levelSummary = uniqueCodes.join(', ');
  }

  const historyItem: DailySetHistoryItem = {
    id: session.id,
    date: new Date().toISOString(),
    totalCount: session.totalCount,
    averageScore,
    passedCount,
    levelMode: session.levelMode,
    levelSummary,
    marks,
  };

  const currentHistory = loadDailyChallengeHistory();
  const nextHistory = [historyItem, ...currentHistory].slice(0, 50); // Keep last 50 sets
  saveDailyChallengeHistory(nextHistory);
  saveActiveDailySet(null); // Clear active session

  return historyItem;
}
