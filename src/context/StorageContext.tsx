"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadData, saveData, resetData } from "@/lib/storage";
import type {
  AnswerKey,
  AppData,
  AppSettings,
  Card,
  Deck,
  DictationEntry,
  ExamAttempt,
  ExamProfile,
  ExamRecord,
  FocusSession,
  Goal,
  Item,
  MistakeEntry,
  PlanTarget,
  Subject,
  Unit,
  WritingEntry,
} from "@/lib/types";
import { updateSRS } from "@/lib/srs";
import type { SRSRating } from "@/lib/types";
import { createDefaultSRS } from "@/lib/srs";
import { refreshPlanTarget } from "@/lib/plan";
import { generateId, getWeekStart, todayString } from "@/lib/utils";

type StorageContextValue = {
  data: AppData;
  ready: boolean;
  updateCard: (cardId: string, rating: SRSRating) => void;
  addMistake: (sourceType: "card" | "problem", sourceId: string) => void;
  resolveMistake: (sourceType: "card" | "problem", sourceId: string) => void;
  markProblemSolved: (itemId: string, correct: boolean) => void;
  addDeck: (deck: Omit<Deck, "id">) => string;
  addSubject: (subject: Omit<Subject, "id">) => void;
  addUnit: (unit: Omit<Unit, "id">) => void;
  addItem: (item: Omit<Item, "id">) => void;
  updateItem: (item: Item) => void;
  addDeadline: (label: string, date: string) => void;
  removeDeadline: (id: string) => void;
  setGoal: (subjectId: string, targetCount: number) => void;
  updateExamProfile: (profile: ExamProfile) => void;
  addExamRecord: (record: Omit<ExamRecord, "id">) => void;
  removeExamRecord: (id: string) => void;
  saveAnswerKey: (key: AnswerKey) => void;
  removeAnswerKey: (id: string) => void;
  addExamAttempt: (attempt: Omit<ExamAttempt, "id">) => void;
  removeExamAttempt: (id: string) => void;
  addPlanTarget: (target: Omit<PlanTarget, "id" | "totalUnits" | "completedUnits" | "dailyQuota">) => void;
  updatePlanTarget: (id: string, patch: Partial<PlanTarget>) => void;
  removePlanTarget: (id: string) => void;
  addFocusSession: (session: Omit<FocusSession, "id">) => void;
  addWritingEntry: (entry: Omit<WritingEntry, "id">) => void;
  removeWritingEntry: (id: string) => void;
  addDictationEntry: (entry: Omit<DictationEntry, "id" | "createdAt">) => void;
  removeDictationEntry: (id: string) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  addCards: (cards: Omit<Card, "id" | "srs">[]) => void;
  updateCardContent: (cardId: string, patch: Partial<Card>) => void;
  deleteCard: (cardId: string) => void;
  resetAll: () => void;
  getDecksBySubject: (subject: string) => Deck[];
  getCardsByDeck: (deckId: string) => Card[];
};

const StorageContext = createContext<StorageContextValue | null>(null);

function recordStudy(
  data: AppData,
  subjectId: string,
  result?: "correct" | "wrong"
): AppData {
  const today = todayString();
  const logs = data.studyLogs.map((l) => ({ ...l }));
  const existing = logs.find((l) => l.date === today && l.subjectId === subjectId);
  if (existing) {
    existing.count += 1;
    if (result === "correct") existing.correct += 1;
    if (result === "wrong") existing.wrong += 1;
  } else {
    logs.push({
      date: today,
      subjectId,
      count: 1,
      correct: result === "correct" ? 1 : 0,
      wrong: result === "wrong" ? 1 : 0,
    });
  }

  let streak = data.streak;
  const last = data.lastStudyDate;
  if (last !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    streak = last === yesterdayStr ? streak + 1 : 1;
  }

  const goals = data.goals.map((g) => {
    if (g.subjectId === subjectId && g.weekStart === getWeekStart()) {
      return { ...g, currentCount: g.currentCount + 1 };
    }
    return g;
  });

  const planTargets = data.planTargets.map((t) => refreshPlanTarget(t, { ...data, studyLogs: logs }));

  return {
    ...data,
    studyLogs: logs,
    streak,
    lastStudyDate: today,
    goals,
    planTargets,
  };
}

export function StorageProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setData(loadData());
    setReady(true);
  }, []);

  const persist = useCallback((updater: (prev: AppData) => AppData) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      saveData(next);
      return next;
    });
  }, []);

  const updateCard = useCallback(
    (cardId: string, rating: SRSRating) => {
      persist((prev) => {
        const card = prev.cards.find((c) => c.id === cardId);
        if (!card) return prev;

        const deck = prev.decks.find((d) => d.id === card.deckId);
        const subjectId = deck?.subject ?? "unknown";

        let mistakes = [...prev.mistakes];
        if (rating <= 2) {
          const exists = mistakes.find(
            (m) => m.sourceType === "card" && m.sourceId === cardId && !m.resolved
          );
          if (!exists) {
            mistakes.push({
              id: generateId(),
              sourceType: "card",
              sourceId: cardId,
              addedAt: new Date().toISOString(),
              resolved: false,
            });
          }
        } else {
          mistakes = mistakes.map((m) =>
            m.sourceType === "card" && m.sourceId === cardId ? { ...m, resolved: true } : m
          );
        }

        const cards = prev.cards.map((c) =>
          c.id === cardId ? { ...c, srs: updateSRS(c.srs, rating) } : c
        );

        return recordStudy(
          { ...prev, cards, mistakes },
          subjectId,
          rating >= 3 ? "correct" : "wrong"
        );
      });
    },
    [persist]
  );

  const addMistake = useCallback(
    (sourceType: "card" | "problem", sourceId: string) => {
      persist((prev) => {
        const exists = prev.mistakes.find(
          (m) => m.sourceType === sourceType && m.sourceId === sourceId && !m.resolved
        );
        if (exists) return prev;
        return {
          ...prev,
          mistakes: [
            ...prev.mistakes,
            {
              id: generateId(),
              sourceType,
              sourceId,
              addedAt: new Date().toISOString(),
              resolved: false,
            },
          ],
        };
      });
    },
    [persist]
  );

  const resolveMistake = useCallback(
    (sourceType: "card" | "problem", sourceId: string) => {
      persist((prev) => ({
        ...prev,
        mistakes: prev.mistakes.map((m) =>
          m.sourceType === sourceType && m.sourceId === sourceId ? { ...m, resolved: true } : m
        ),
      }));
    },
    [persist]
  );

  const markProblemSolved = useCallback(
    (itemId: string, correct: boolean) => {
      persist((prev) => {
        const item = prev.items.find((i) => i.id === itemId);
        if (!item || item.type !== "problem") return prev;

        const unit = prev.units.find((u) => u.id === item.unitId);
        const subjectId = unit?.subjectId ?? "unknown";

        let mistakes = [...prev.mistakes];
        if (!correct) {
          const exists = mistakes.find(
            (m) => m.sourceType === "problem" && m.sourceId === itemId && !m.resolved
          );
          if (!exists) {
            mistakes.push({
              id: generateId(),
              sourceType: "problem",
              sourceId: itemId,
              addedAt: new Date().toISOString(),
              resolved: false,
            });
          }
        } else {
          mistakes = mistakes.map((m) =>
            m.sourceType === "problem" && m.sourceId === itemId ? { ...m, resolved: true } : m
          );
        }

        const items = prev.items.map((i) =>
          i.id === itemId && i.type === "problem" ? { ...i, solved: correct } : i
        );

        return recordStudy(
          { ...prev, items, mistakes },
          subjectId,
          correct ? "correct" : "wrong"
        );
      });
    },
    [persist]
  );

  const addDeck = useCallback(
    (deck: Omit<Deck, "id">) => {
      const id = generateId();
      persist((prev) => ({
        ...prev,
        decks: [...prev.decks, { ...deck, id }],
      }));
      return id;
    },
    [persist]
  );

  const addSubject = useCallback(
    (subject: Omit<Subject, "id">) => {
      persist((prev) => ({
        ...prev,
        subjects: [...prev.subjects, { ...subject, id: generateId() }],
      }));
    },
    [persist]
  );

  const addUnit = useCallback(
    (unit: Omit<Unit, "id">) => {
      persist((prev) => ({
        ...prev,
        units: [...prev.units, { ...unit, id: generateId() }],
      }));
    },
    [persist]
  );

  const addItem = useCallback(
    (item: Omit<Item, "id">) => {
      persist((prev) => ({
        ...prev,
        items: [...prev.items, { ...item, id: generateId() } as Item],
      }));
    },
    [persist]
  );

  const updateItem = useCallback(
    (item: Item) => {
      persist((prev) => ({
        ...prev,
        items: prev.items.map((i) => (i.id === item.id ? item : i)),
      }));
    },
    [persist]
  );

  const addDeadline = useCallback(
    (label: string, date: string) => {
      persist((prev) => ({
        ...prev,
        deadlines: [...prev.deadlines, { id: generateId(), label, date }],
      }));
    },
    [persist]
  );

  const removeDeadline = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        deadlines: prev.deadlines.filter((d) => d.id !== id),
      }));
    },
    [persist]
  );

  const setGoal = useCallback(
    (subjectId: string, targetCount: number) => {
      persist((prev) => {
        const weekStart = getWeekStart();
        const existing = prev.goals.find(
          (g) => g.subjectId === subjectId && g.weekStart === weekStart
        );
        if (existing) {
          return {
            ...prev,
            goals: prev.goals.map((g) =>
              g.id === existing.id ? { ...g, targetCount } : g
            ),
          };
        }
        return {
          ...prev,
          goals: [
            ...prev.goals,
            { id: generateId(), subjectId, weekStart, targetCount, currentCount: 0 },
          ],
        };
      });
    },
    [persist]
  );

  const updateExamProfile = useCallback(
    (profile: ExamProfile) => {
      persist((prev) => ({ ...prev, examProfile: profile }));
    },
    [persist]
  );

  const addExamRecord = useCallback(
    (record: Omit<ExamRecord, "id">) => {
      persist((prev) => ({
        ...prev,
        examRecords: [...prev.examRecords, { ...record, id: generateId() }],
      }));
    },
    [persist]
  );

  const removeExamRecord = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        examRecords: prev.examRecords.filter((r) => r.id !== id),
      }));
    },
    [persist]
  );

  /** 같은 회차·과목의 정답표가 있으면 덮어쓴다. */
  const saveAnswerKey = useCallback(
    (key: AnswerKey) => {
      persist((prev) => ({
        ...prev,
        answerKeys: [...prev.answerKeys.filter((k) => k.id !== key.id), key],
      }));
    },
    [persist]
  );

  const removeAnswerKey = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        answerKeys: prev.answerKeys.filter((k) => k.id !== id),
      }));
    },
    [persist]
  );

  /** 기출 응시 결과를 저장하고, 과목별 학습 로그에도 정오답을 반영한다. */
  const addExamAttempt = useCallback(
    (attempt: Omit<ExamAttempt, "id">) => {
      persist((prev) => {
        const next: AppData = {
          ...prev,
          examAttempts: [...prev.examAttempts, { ...attempt, id: generateId() }],
        };
        const today = todayString();
        const logs = next.studyLogs.map((l) => ({ ...l }));
        const wrong = attempt.totalCount - attempt.correctCount;
        const existing = logs.find(
          (l) => l.date === today && l.subjectId === attempt.subjectCode
        );
        if (existing) {
          existing.count += attempt.totalCount;
          existing.correct += attempt.correctCount;
          existing.wrong += wrong;
        } else {
          logs.push({
            date: today,
            subjectId: attempt.subjectCode,
            count: attempt.totalCount,
            correct: attempt.correctCount,
            wrong,
          });
        }
        return { ...next, studyLogs: logs };
      });
    },
    [persist]
  );

  const removeExamAttempt = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        examAttempts: prev.examAttempts.filter((a) => a.id !== id),
      }));
    },
    [persist]
  );

  const addPlanTarget = useCallback(
    (target: Omit<PlanTarget, "id" | "totalUnits" | "completedUnits" | "dailyQuota">) => {
      persist((prev) => {
        const draft: PlanTarget = {
          ...target,
          id: generateId(),
          totalUnits: 0,
          completedUnits: 0,
          dailyQuota: 0,
        };
        const refreshed = refreshPlanTarget(draft, prev, {
          excludeWeekends: prev.settings.excludeWeekends,
          bufferDays: prev.settings.planBufferDays,
        });
        return { ...prev, planTargets: [...prev.planTargets, refreshed] };
      });
    },
    [persist]
  );

  const updatePlanTarget = useCallback(
    (id: string, patch: Partial<PlanTarget>) => {
      persist((prev) => ({
        ...prev,
        planTargets: prev.planTargets.map((t) => {
          if (t.id !== id) return t;
          return refreshPlanTarget(
            { ...t, ...patch },
            prev,
            {
              excludeWeekends: prev.settings.excludeWeekends,
              bufferDays: prev.settings.planBufferDays,
            }
          );
        }),
      }));
    },
    [persist]
  );

  const removePlanTarget = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        planTargets: prev.planTargets.filter((t) => t.id !== id),
      }));
    },
    [persist]
  );

  const addFocusSession = useCallback(
    (session: Omit<FocusSession, "id">) => {
      persist((prev) => ({
        ...prev,
        focusSessions: [...prev.focusSessions, { ...session, id: generateId() }],
      }));
    },
    [persist]
  );

  const addWritingEntry = useCallback(
    (entry: Omit<WritingEntry, "id">) => {
      persist((prev) => ({
        ...prev,
        writingEntries: [...prev.writingEntries, { ...entry, id: generateId() }],
      }));
    },
    [persist]
  );

  const removeWritingEntry = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        writingEntries: prev.writingEntries.filter((e) => e.id !== id),
      }));
    },
    [persist]
  );

  const addDictationEntry = useCallback(
    (entry: Omit<DictationEntry, "id" | "createdAt">) => {
      persist((prev) => ({
        ...prev,
        dictationEntries: [
          ...prev.dictationEntries,
          { ...entry, id: generateId(), createdAt: new Date().toISOString() },
        ],
      }));
    },
    [persist]
  );

  const removeDictationEntry = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        dictationEntries: prev.dictationEntries.filter((e) => e.id !== id),
      }));
    },
    [persist]
  );

  const updateSettings = useCallback(
    (patch: Partial<AppSettings>) => {
      persist((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...patch },
      }));
    },
    [persist]
  );

  const addCards = useCallback(
    (cards: Omit<Card, "id" | "srs">[]) => {
      persist((prev) => ({
        ...prev,
        cards: [
          ...prev.cards,
          ...cards.map((c) => ({
            ...c,
            id: generateId(),
            tags: c.tags ?? [],
            srs: createDefaultSRS(),
          })),
        ],
      }));
    },
    [persist]
  );

  const updateCardContent = useCallback(
    (cardId: string, patch: Partial<Card>) => {
      persist((prev) => ({
        ...prev,
        cards: prev.cards.map((c) => (c.id === cardId ? { ...c, ...patch, id: c.id } : c)),
      }));
    },
    [persist]
  );

  const deleteCard = useCallback(
    (cardId: string) => {
      persist((prev) => ({
        ...prev,
        cards: prev.cards.filter((c) => c.id !== cardId),
        mistakes: prev.mistakes.filter(
          (m) => !(m.sourceType === "card" && m.sourceId === cardId)
        ),
      }));
    },
    [persist]
  );

  const resetAll = useCallback(() => {
    resetData();
    setData(loadData());
  }, []);

  const getDecksBySubject = useCallback(
    (subject: string) => data?.decks.filter((d) => d.subject === subject) ?? [],
    [data]
  );

  const getCardsByDeck = useCallback(
    (deckId: string) => data?.cards.filter((c) => c.deckId === deckId) ?? [],
    [data]
  );

  const value = useMemo<StorageContextValue | null>(() => {
    if (!data) return null;
    return {
      data,
      ready,
      updateCard,
      addMistake,
      resolveMistake,
      markProblemSolved,
      addDeck,
      addSubject,
      addUnit,
      addItem,
      updateItem,
      addDeadline,
      removeDeadline,
      setGoal,
      updateExamProfile,
      addExamRecord,
      removeExamRecord,
      saveAnswerKey,
      removeAnswerKey,
      addExamAttempt,
      removeExamAttempt,
      addPlanTarget,
      updatePlanTarget,
      removePlanTarget,
      addFocusSession,
      addWritingEntry,
      removeWritingEntry,
      addDictationEntry,
      removeDictationEntry,
      updateSettings,
      addCards,
      updateCardContent,
      deleteCard,
      resetAll,
      getDecksBySubject,
      getCardsByDeck,
    };
  }, [
    data,
    ready,
    updateCard,
    addMistake,
    resolveMistake,
    markProblemSolved,
    addDeck,
    addSubject,
    addUnit,
    addItem,
    updateItem,
    addDeadline,
    removeDeadline,
    setGoal,
    updateExamProfile,
    addExamRecord,
    removeExamRecord,
    saveAnswerKey,
    removeAnswerKey,
    addExamAttempt,
    removeExamAttempt,
    addPlanTarget,
    updatePlanTarget,
    removePlanTarget,
    addFocusSession,
    addWritingEntry,
    removeWritingEntry,
    addDictationEntry,
    removeDictationEntry,
    updateSettings,
    addCards,
    updateCardContent,
    deleteCard,
    resetAll,
    getDecksBySubject,
    getCardsByDeck,
  ]);

  if (!value) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500">로딩 중...</p>
      </div>
    );
  }

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
}

export function useStorage() {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error("useStorage must be used within StorageProvider");
  return ctx;
}

export function useUnresolvedMistakes(): MistakeEntry[] {
  const { data } = useStorage();
  return data.mistakes.filter((m) => !m.resolved);
}

export function useDueCards() {
  const { data } = useStorage();
  const today = todayString();
  return data.cards.filter((c) => c.srs.nextReviewDate <= today);
}

export function useWeekGoals(): Goal[] {
  const { data } = useStorage();
  const weekStart = getWeekStart();
  return data.goals.filter((g) => g.weekStart === weekStart);
}
