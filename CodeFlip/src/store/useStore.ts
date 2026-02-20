import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, Problem, ExecutionResult } from '../types';
import { executeCode } from '../services/pistonApi';
import {
  PYTHON_TEMPLATE,
  TYPESCRIPT_TEMPLATE,
  PYTHON_BLANK,
  TYPESCRIPT_BLANK,
} from '../constants/templates';

const STORAGE_KEY = '@codeflip_problems';

const DEFAULT_PROBLEM: Problem = {
  id: 'two-sum',
  title: 'Two Sum',
  python: PYTHON_TEMPLATE,
  typescript: TYPESCRIPT_TEMPLATE,
  createdAt: Date.now(),
};

interface AppState {
  // Problems
  problems: Problem[];
  currentProblemId: string;

  // Editor state
  activeLanguage: Language;

  // Compare mode
  compareMode: boolean;

  // Execution
  isRunning: boolean;
  results: Record<string, ExecutionResult | null>; // keyed by problemId_language

  // Actions
  setActiveLanguage: (lang: Language) => void;
  setCurrentProblem: (id: string) => void;
  toggleCompareMode: () => void;

  updateCode: (code: string) => void;
  runCode: () => Promise<void>;
  runBothLanguages: () => Promise<void>;

  addProblem: (title: string) => void;
  deleteProblem: (id: string) => void;
  renameProblem: (id: string, title: string) => void;

  loadProblems: () => Promise<void>;
  saveProblems: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  problems: [DEFAULT_PROBLEM],
  currentProblemId: DEFAULT_PROBLEM.id,
  activeLanguage: 'typescript',
  compareMode: false,
  isRunning: false,
  results: {},

  // ── Selectors (derived) ─────────────────────────────────────────────
  get currentProblem() {
    const { problems, currentProblemId } = get();
    return problems.find((p) => p.id === currentProblemId) ?? problems[0];
  },

  // ── Language / Problem ──────────────────────────────────────────────
  setActiveLanguage: (lang) => set({ activeLanguage: lang }),

  setCurrentProblem: (id) => set({ currentProblemId: id }),

  toggleCompareMode: () => set((s) => ({ compareMode: !s.compareMode })),

  // ── Code editing ────────────────────────────────────────────────────
  updateCode: (code) => {
    const { problems, currentProblemId, activeLanguage } = get();
    const updated = problems.map((p) => {
      if (p.id !== currentProblemId) return p;
      return activeLanguage === 'python'
        ? { ...p, python: code }
        : { ...p, typescript: code };
    });
    set({ problems: updated });
    // Debounce save handled externally; call saveProblems when editor blurs
  },

  // ── Execution ───────────────────────────────────────────────────────
  runCode: async () => {
    const { problems, currentProblemId, activeLanguage } = get();
    const problem = problems.find((p) => p.id === currentProblemId);
    if (!problem) return;

    const code =
      activeLanguage === 'python' ? problem.python : problem.typescript;

    set({ isRunning: true });
    try {
      const result = await executeCode(activeLanguage, code);
      const key = `${currentProblemId}_${activeLanguage}`;
      set((s) => ({
        results: { ...s.results, [key]: result },
        isRunning: false,
      }));
    } catch {
      set({ isRunning: false });
    }
  },

  runBothLanguages: async () => {
    const { problems, currentProblemId } = get();
    const problem = problems.find((p) => p.id === currentProblemId);
    if (!problem) return;

    set({ isRunning: true });
    try {
      const [pyResult, tsResult] = await Promise.all([
        executeCode('python', problem.python),
        executeCode('typescript', problem.typescript),
      ]);

      set((s) => ({
        isRunning: false,
        results: {
          ...s.results,
          [`${currentProblemId}_python`]: pyResult,
          [`${currentProblemId}_typescript`]: tsResult,
        },
      }));
    } catch {
      set({ isRunning: false });
    }
  },

  // ── Problem management ──────────────────────────────────────────────
  addProblem: (title) => {
    const id = title.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    const newProblem: Problem = {
      id,
      title,
      python: PYTHON_BLANK,
      typescript: TYPESCRIPT_BLANK,
      createdAt: Date.now(),
    };
    set((s) => ({
      problems: [...s.problems, newProblem],
      currentProblemId: id,
    }));
    get().saveProblems();
  },

  deleteProblem: (id) => {
    const { problems } = get();
    if (problems.length <= 1) return; // keep at least one
    const remaining = problems.filter((p) => p.id !== id);
    set({
      problems: remaining,
      currentProblemId: remaining[0].id,
    });
    get().saveProblems();
  },

  renameProblem: (id, title) => {
    set((s) => ({
      problems: s.problems.map((p) => (p.id === id ? { ...p, title } : p)),
    }));
    get().saveProblems();
  },

  // ── Persistence ─────────────────────────────────────────────────────
  loadProblems: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const problems: Problem[] = JSON.parse(raw);
        if (problems.length > 0) {
          set({ problems, currentProblemId: problems[0].id });
        }
      }
    } catch {
      // Use defaults on parse failure
    }
  },

  saveProblems: async () => {
    try {
      const { problems } = get();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(problems));
    } catch {
      // Silently fail — in-memory state is still valid
    }
  },
}));

// Convenience selector: get the ExecutionResult for the active problem+language
export function useCurrentResult() {
  return useStore((s) => {
    const key = `${s.currentProblemId}_${s.activeLanguage}`;
    return s.results[key] ?? null;
  });
}

export function useCurrentProblem() {
  return useStore((s) => s.problems.find((p) => p.id === s.currentProblemId) ?? s.problems[0]);
}
