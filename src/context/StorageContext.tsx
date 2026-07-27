"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { loadData, saveData, resetData, exportData, importData } from "@/lib/storage";
import { fetchProgress, pushProgress } from "@/lib/sync";
import { migrate } from "@/lib/storage/migrate";
import type {
  AppData,
  AppSettings,
  Card,
  Deck,
  DictationEntry,
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
  syncStatus: "idle" | "syncing" | "ok" | "error";
  syncMessage: string;
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
  exportJson: () => string;
  importJson: (json: string) => void;
  resetAll: () => void;
  enableCloudSync: () => Promise<string>;
  connectCloudSync: (syncKey: string) => Promise<void>;
  pushCloudNow: () => Promise<void>;
  pullCloudNow: () => Promise<void>;
  disableCloudSync: () => void;
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
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "ok" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef<AppData | null>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    const local = loadData();
    setData(local);
    setReady(true);

    // 클라우드 동기화가 켜져 있으면 서버 데이터와 병합(더 최신 쪽 우선은 서버로 덮어씀 — 개인용 단순 동기화)
    if (local.settings.cloudSync && local.settings.syncKey) {
      void (async () => {
        try {
          setSyncStatus("syncing");
          const remote = await fetchProgress(local.settings.syncKey!);
          if (remote?.data) {
            const migrated = migrate(remote.data);
            saveData(migrated);
            setData(migrated);
            setSyncMessage(`서버에서 불러옴 · ${new Date(remote.updatedAt).toLocaleString()}`);
          } else {
            setSyncMessage("서버에 아직 데이터 없음 — 로컬을 업로드합니다.");
            await pushProgress(local, local.settings.syncKey);
          }
          setSyncStatus("ok");
        } catch (e) {
          setSyncStatus("error");
          setSyncMessage(e instanceof Error ? e.message : "동기화 실패");
        }
      })();
    }
  }, []);

  const scheduleCloudPush = useCallback((next: AppData) => {
    if (!next.settings.cloudSync || !next.settings.syncKey) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      void (async () => {
        try {
          setSyncStatus("syncing");
          const result = await pushProgress(next, next.settings.syncKey);
          setSyncStatus("ok");
          setSyncMessage(`자동 저장 · ${new Date(result.updatedAt).toLocaleString()}`);
        } catch (e) {
          setSyncStatus("error");
          setSyncMessage(e instanceof Error ? e.message : "자동 저장 실패");
        }
      })();
    }, 1200);
  }, []);

  const persist = useCallback(
    (updater: (prev: AppData) => AppData) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        saveData(next);
        scheduleCloudPush(next);
        return next;
      });
    },
    [scheduleCloudPush]
  );

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

  const exportJson = useCallback(() => {
    if (!data) return "{}";
    return exportData(data);
  }, [data]);

  const importJson = useCallback((json: string) => {
    const imported = importData(json);
    setData(imported);
  }, []);

  const resetAll = useCallback(() => {
    resetData();
    setData(loadData());
  }, []);

  const enableCloudSync = useCallback(async () => {
    const current = dataRef.current;
    if (!current) throw new Error("데이터가 아직 준비되지 않았습니다.");
    setSyncStatus("syncing");
    try {
      const result = await pushProgress(current, current.settings.syncKey);
      const next: AppData = {
        ...current,
        settings: {
          ...current.settings,
          syncKey: result.syncKey,
          cloudSync: true,
        },
      };
      saveData(next);
      setData(next);
      setSyncStatus("ok");
      setSyncMessage(`동기화 시작 · 키 ${result.syncKey}`);
      return result.syncKey;
    } catch (e) {
      setSyncStatus("error");
      const msg = e instanceof Error ? e.message : "동기화 실패";
      setSyncMessage(msg);
      throw e;
    }
  }, []);

  const connectCloudSync = useCallback(async (syncKey: string) => {
    const key = syncKey.trim();
    if (!key) throw new Error("동기화 키를 입력하세요.");
    setSyncStatus("syncing");
    try {
      const remote = await fetchProgress(key);
      if (!remote?.data) throw new Error("해당 키의 진행도가 없습니다.");
      const migrated = migrate(remote.data);
      const next: AppData = {
        ...migrated,
        settings: {
          ...migrated.settings,
          syncKey: key,
          cloudSync: true,
        },
      };
      saveData(next);
      setData(next);
      setSyncStatus("ok");
      setSyncMessage(`다른 기기 데이터 연결 · ${new Date(remote.updatedAt).toLocaleString()}`);
    } catch (e) {
      setSyncStatus("error");
      const msg = e instanceof Error ? e.message : "연결 실패";
      setSyncMessage(msg);
      throw e;
    }
  }, []);

  const pushCloudNow = useCallback(async () => {
    const current = dataRef.current;
    if (!current?.settings.syncKey) throw new Error("먼저 클라우드 동기화를 켜세요.");
    setSyncStatus("syncing");
    try {
      const result = await pushProgress(current, current.settings.syncKey);
      setSyncStatus("ok");
      setSyncMessage(`수동 저장 · ${new Date(result.updatedAt).toLocaleString()}`);
    } catch (e) {
      setSyncStatus("error");
      const msg = e instanceof Error ? e.message : "저장 실패";
      setSyncMessage(msg);
      throw e;
    }
  }, []);

  const pullCloudNow = useCallback(async () => {
    const current = dataRef.current;
    if (!current?.settings.syncKey) throw new Error("먼저 클라우드 동기화를 켜세요.");
    setSyncStatus("syncing");
    try {
      const remote = await fetchProgress(current.settings.syncKey);
      if (!remote?.data) throw new Error("서버에 데이터가 없습니다.");
      const migrated = migrate({
        ...remote.data,
        settings: {
          ...remote.data.settings,
          syncKey: current.settings.syncKey,
          cloudSync: true,
        },
      });
      saveData(migrated);
      setData(migrated);
      setSyncStatus("ok");
      setSyncMessage(`불러오기 완료 · ${new Date(remote.updatedAt).toLocaleString()}`);
    } catch (e) {
      setSyncStatus("error");
      const msg = e instanceof Error ? e.message : "불러오기 실패";
      setSyncMessage(msg);
      throw e;
    }
  }, []);

  const disableCloudSync = useCallback(() => {
    persist((prev) => ({
      ...prev,
      settings: { ...prev.settings, cloudSync: false },
    }));
    setSyncStatus("idle");
    setSyncMessage("클라우드 동기화를 껐습니다. (로컬 저장은 유지)");
  }, [persist]);

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
      syncStatus,
      syncMessage,
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
      exportJson,
      importJson,
      resetAll,
      enableCloudSync,
      connectCloudSync,
      pushCloudNow,
      pullCloudNow,
      disableCloudSync,
      getDecksBySubject,
      getCardsByDeck,
    };
  }, [
    data,
    ready,
    syncStatus,
    syncMessage,
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
    exportJson,
    importJson,
    resetAll,
    enableCloudSync,
    connectCloudSync,
    pushCloudNow,
    pullCloudNow,
    disableCloudSync,
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
