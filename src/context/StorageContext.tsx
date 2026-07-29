"use client";

import {
  createContext,
  useRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadData, saveData, resetData, measureUsage, exportData, importData } from "@/lib/storage";
import type { StorageUsage } from "@/lib/storage";
import { getLibraryDeck } from "@/lib/data/vocab/library";
import { getStudyModule, unitIdOf } from "@/lib/data/subjects/modules";
import { useOnline } from "@/lib/useOnline";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createDefaultSRS as makeSRS } from "@/lib/srs";
import type {
  AnswerKey,
  AppData,
  AppSettings,
  Card,
  CardSRS,
  Deck,
  DictationEntry,
  ExamAttempt,
  ExamProfile,
  ExamRecord,
  FocusSession,
  Goal,
  Item,
  MistakeEntry,
  MistakeSourceType,
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
import { encodeData, decodeData } from "@/lib/storage/codec";
import { migrate } from "@/lib/storage/migrate";

type StorageContextValue = {
  data: AppData;
  ready: boolean;
  updateCard: (cardId: string, rating: SRSRating) => void;
  addMistake: (sourceType: MistakeSourceType, sourceId: string) => void;
  resolveMistake: (sourceType: MistakeSourceType, sourceId: string) => void;
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
  addPlanTarget: (
    target: Pick<PlanTarget, "kind" | "refId" | "dueDate"> &
      Partial<Pick<PlanTarget, "dailyQuota" | "quotaMode">>
  ) => void;
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
  /** 지운 카드를 원래 자리에 되돌린다 */
  restoreCard: (card: Card, index: number) => void;
  /** 방금 매긴 평가를 무른다 (SRS·오답·학습로그 되돌리기) */
  undoCardRating: (
    cardId: string,
    previous: CardSRS,
    wasCorrect: boolean,
    hadMistake: boolean
  ) => void;
  /** 덱을 목록 맨 위에 고정 */
  toggleDeckPinned: (deckId: string) => void;
  resetAll: () => void;
  /** JSON 백업 문자열 생성 (다운로드용) */
  exportBackup: () => string;
  /** 백업 JSON 복원. 실패 시 throw */
  importBackup: (json: string) => void;
  getDecksBySubject: (subject: string) => Deck[];
  getCardsByDeck: (deckId: string) => Card[];
  /** 단어장 보관함에서 덱을 가져온다. 단어 파일은 이때 처음 내려받는다. */
  addLibraryDeck: (libraryDeckId: string) => Promise<void>;
  /** 덱과 그 카드·플랜·오답 기록을 통째로 제거한다 (저장 공간 회수용) */
  removeDeck: (deckId: string) => void;
  addStudyModule: (moduleId: string) => void;
  removeStudyModule: (moduleId: string) => void;
  /** 마지막 저장이 실패했다면 그 사유. 정상이면 null */
  storageError: string | null;
  /** 현재 localStorage 사용량 */
  storageUsage: StorageUsage;
  syncInfo: {
    enabled: boolean;
    loggedIn: boolean;
    status: "idle" | "syncing" | "synced" | "offline" | "error" | "conflict";
    pendingCount: number;
    lastSyncedAt: string | null;
    error: string | null;
  };
  resetLocalOnly: () => void;
  resetWithServerDelete: () => Promise<boolean>;
};

const StorageContext = createContext<StorageContextValue | null>(null);

const SYNC_META_KEY = "eju-sync-meta-v1";
type SyncMeta = Record<string, { lastPulledVersion: number; lastPulledAt: string }>;

function loadSyncMeta(): SyncMeta {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    return raw ? (JSON.parse(raw) as SyncMeta) : {};
  } catch {
    return {};
  }
}

function saveSyncMeta(meta: SyncMeta) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
}

function setLastPulledVersion(userId: string, version: number) {
  const meta = loadSyncMeta();
  meta[userId] = {
    lastPulledVersion: version,
    lastPulledAt: new Date().toISOString(),
  };
  saveSyncMeta(meta);
}

function getLastPulledVersion(userId: string): number {
  return loadSyncMeta()[userId]?.lastPulledVersion ?? 0;
}

function hasMeaningfulData(data: AppData): boolean {
  return (
    data.cards.length > 0 ||
    data.decks.length > 0 ||
    data.items.length > 0 ||
    data.units.length > 0 ||
    data.mistakes.length > 0 ||
    data.examRecords.length > 0 ||
    data.examAttempts.length > 0 ||
    data.writingEntries.length > 0
  );
}

function lastStudyStamp(data: AppData): string {
  const times: string[] = [];
  if (data.lastStudyDate) times.push(data.lastStudyDate);
  for (const w of data.writingEntries) times.push(w.date);
  for (const a of data.examAttempts) times.push(a.date);
  for (const r of data.examRecords) times.push(r.date);
  return times.sort().at(-1) ?? "-";
}

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
  const [storageError, setStorageError] = useState<string | null>(null);
  const [pendingPushCount, setPendingPushCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "synced" | "offline" | "error" | "conflict"
  >("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncUserId, setSyncUserId] = useState<string | null>(null);
  const [conflictState, setConflictState] = useState<{
    serverVersion: number;
    serverLabel: string | null;
    serverUpdatedAt: string | null;
    serverData: AppData;
  } | null>(null);
  const online = useOnline();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const pushTimerRef = useRef<number | null>(null);
  const applyingRemoteRef = useRef(false);
  /** 로그인 직후 1회만 서버/로컬 초기 맞춤을 돌린다 (data 변경마다 돌리면 안 됨) */
  const bootstrappedUserRef = useRef<string | null>(null);
  const dataRef = useRef<AppData | null>(null);
  const pendingPushCountRef = useRef(0);
  const skipNextPushRef = useRef(false);

  useEffect(() => {
    setData(loadData());
    setReady(true);
  }, []);

  /**
   * 저장은 여기 한 곳에서만 한다.
   *
   * 예전에는 setData의 갱신 함수 안에서 saveData를 불렀는데, 두 가지가 문제였다.
   *  1) 갱신 함수는 순수해야 하는데 부수효과가 들어갔다 (StrictMode에서 두 번 저장)
   *  2) 용량 초과로 저장이 실패하면 그 예외가 상태 갱신 도중에 터져 화면이 죽었다
   * 이제 data가 바뀔 때마다 이 effect가 저장하고, 실패 사유만 상태로 남긴다.
   */
  useEffect(() => {
    if (!ready || !data) return;
    dataRef.current = data;
    setStorageError(saveData(data));
  }, [data, ready]);

  useEffect(() => {
    pendingPushCountRef.current = pendingPushCount;
  }, [pendingPushCount]);

  useEffect(() => {
    if (!supabase) return;
    const boot = async () => {
      const { data: auth } = await supabase.auth.getUser();
      setSyncUserId(auth.user?.id ?? null);
    };
    void boot();
    const { data: listener } = supabase.auth.onAuthStateChange((_evt, session) => {
      const nextId = session?.user?.id ?? null;
      if (!nextId) bootstrappedUserRef.current = null;
      setSyncUserId(nextId);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  const persist = useCallback((updater: (prev: AppData) => AppData) => {
    setData((prev) => (prev ? updater(prev) : prev));
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
    (sourceType: MistakeSourceType, sourceId: string) => {
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
    (sourceType: MistakeSourceType, sourceId: string) => {
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
    (
      target: Pick<PlanTarget, "kind" | "refId" | "dueDate"> &
        Partial<Pick<PlanTarget, "dailyQuota" | "quotaMode">>
    ) => {
      persist((prev) => {
        const draft: PlanTarget = {
          ...target,
          id: generateId(),
          totalUnits: 0,
          completedUnits: 0,
          dailyQuota: target.dailyQuota ?? 0,
          quotaMode: target.quotaMode ?? "auto",
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

  /** 지운 카드를 원래 자리에 되돌린다 (삭제 되돌리기용). */
  const restoreCard = useCallback(
    (card: Card, index: number) => {
      persist((prev) => {
        if (prev.cards.some((c) => c.id === card.id)) return prev;
        const cards = [...prev.cards];
        cards.splice(Math.min(Math.max(index, 0), cards.length), 0, card);
        return { ...prev, cards };
      });
    },
    [persist]
  );

  /**
   * 평가 되돌리기 — 방금 매긴 평가 이전의 SRS 값으로 돌려놓는다.
   *
   * updateCard는 SRS·오답노트·학습로그·스트릭을 한꺼번에 건드리므로, 되돌릴 때도
   * 같이 되돌린다. 스트릭은 손대지 않는다 — 오늘 이미 다른 카드도 공부했을 수 있고,
   * 오답 하나 무르자고 연속 일수를 깎는 건 사용자가 기대하는 동작이 아니다.
   */
  const undoCardRating = useCallback(
    (cardId: string, previous: CardSRS, wasCorrect: boolean, hadMistake: boolean) => {
      persist((prev) => {
        const card = prev.cards.find((c) => c.id === cardId);
        if (!card) return prev;
        const deck = prev.decks.find((d) => d.id === card.deckId);
        const subjectId = deck?.subject ?? "unknown";

        const cards = prev.cards.map((c) => (c.id === cardId ? { ...c, srs: previous } : c));

        // 이 평가 때문에 새로 생긴 오답만 지운다. 원래 있던 오답은 그대로 둔다.
        let mistakes = prev.mistakes;
        if (!hadMistake) {
          mistakes = mistakes.filter(
            (m) => !(m.sourceType === "card" && m.sourceId === cardId && !m.resolved)
          );
        } else {
          mistakes = mistakes.map((m) =>
            m.sourceType === "card" && m.sourceId === cardId ? { ...m, resolved: false } : m
          );
        }

        const today = todayString();
        const studyLogs = prev.studyLogs.map((l) => {
          if (l.date !== today || l.subjectId !== subjectId) return l;
          return {
            ...l,
            count: Math.max(0, l.count - 1),
            correct: Math.max(0, l.correct - (wasCorrect ? 1 : 0)),
            wrong: Math.max(0, l.wrong - (wasCorrect ? 0 : 1)),
          };
        });

        return { ...prev, cards, mistakes, studyLogs };
      });
    },
    [persist]
  );

  /** 덱 고정 토글 — 지금 도는 덱을 목록 맨 위로. */
  const toggleDeckPinned = useCallback(
    (deckId: string) => {
      persist((prev) => ({
        ...prev,
        decks: prev.decks.map((d) => (d.id === deckId ? { ...d, pinned: !d.pinned } : d)),
      }));
    },
    [persist]
  );

  const resetAll = useCallback(() => {
    resetData();
    setData(loadData());
  }, []);

  /**
   * 백업 JSON 문자열.
   *
   * 내보낸 날짜를 settings.lastBackupAt에 같이 남긴다 — 대시보드가 "30일 넘게
   * 백업 안 했다"는 알림을 띄우는 근거가 이 값이다. 백업 파일 안에도 같은
   * 날짜가 들어가므로, 복원한 뒤에도 마지막 백업 시점을 잃지 않는다.
   */
  const exportBackup = useCallback(() => {
    if (!data) return "";
    const stamp = todayString();
    const snapshot: AppData = {
      ...data,
      settings: { ...data.settings, lastBackupAt: stamp },
    };
    persist((prev) => ({
      ...prev,
      settings: { ...prev.settings, lastBackupAt: stamp },
    }));
    return exportData(snapshot);
  }, [data, persist]);

  const importBackup = useCallback((json: string) => {
    const imported = importData(json);
    setData(imported);
    setStorageError(null);
  }, []);

  /**
   * 보관함 덱 가져오기.
   * 단어 파일은 여기서 처음 동적 import 되므로, 목록만 보고 있을 때는 내려받지 않는다.
   */
  const addLibraryDeck = useCallback(
    async (libraryDeckId: string) => {
      const meta = getLibraryDeck(libraryDeckId);
      if (!meta) return;
      const words = await meta.load();
      persist((prev) => {
        // 이미 있으면 아무것도 하지 않는다 (버튼 연타·새로고침 대비)
        if (prev.decks.some((d) => d.id === meta.id)) return prev;
        const deck: Deck = {
          id: meta.id,
          subject: meta.subject,
          title: meta.title,
          type: meta.type,
        };
        const cards: Card[] = words.map(([front, reading, back, example, notes, tags]) => ({
          id: generateId(),
          deckId: meta.id,
          front,
          back,
          reading: reading || undefined,
          exampleSentence: example || undefined,
          notes: notes || undefined,
          tags: tags ?? [],
          srs: makeSRS(),
        }));
        // 학습 플랜에도 목표를 하나 만들어 둔다. 예전에는 시드가 이걸 같이 넣어 줬다.
        const planTarget: PlanTarget = {
          id: `plan-${meta.id}`,
          kind: "deck",
          refId: meta.id,
          totalUnits: cards.length,
          completedUnits: 0,
          dueDate: "2028-11-05",
          dailyQuota: 5,
        };
        return {
          ...prev,
          decks: [...prev.decks, deck],
          cards: [...prev.cards, ...cards],
          planTargets: prev.planTargets.some((p) => p.id === planTarget.id)
            ? prev.planTargets
            : [...prev.planTargets, planTarget],
        };
      });
    },
    [persist]
  );

  /** 덱을 통째로 뺀다. 딸린 카드·오답·플랜 목표까지 같이 지워야 공간이 실제로 회수된다. */
  const removeDeck = useCallback(
    (deckId: string) => {
      persist((prev) => {
        const cardIds = new Set(
          prev.cards.filter((c) => c.deckId === deckId).map((c) => c.id)
        );
        return {
          ...prev,
          decks: prev.decks.filter((d) => d.id !== deckId),
          cards: prev.cards.filter((c) => c.deckId !== deckId),
          mistakes: prev.mistakes.filter(
            (m) => !(m.sourceType === "card" && cardIds.has(m.sourceId))
          ),
          planTargets: prev.planTargets.filter(
            (p) => !(p.kind === "deck" && p.refId === deckId)
          ),
        };
      });
    },
    [persist]
  );

  const addStudyModule = useCallback(
    (moduleId: string) => {
      const module = getStudyModule(moduleId);
      if (!module) return;
      persist((prev) => {
        const { unit, items } = module.build();
        if (prev.units.some((u) => u.id === unit.id)) return prev;
        return {
          ...prev,
          units: [...prev.units, unit],
          items: [...prev.items, ...items],
        };
      });
    },
    [persist]
  );

  const removeStudyModule = useCallback(
    (moduleId: string) => {
      const targetUnitId = unitIdOf(moduleId);
      persist((prev) => {
        if (!prev.units.some((u) => u.id === targetUnitId)) return prev;
        const itemIds = new Set(prev.items.filter((i) => i.unitId === targetUnitId).map((i) => i.id));
        return {
          ...prev,
          units: prev.units.filter((u) => u.id !== targetUnitId),
          items: prev.items.filter((i) => i.unitId !== targetUnitId),
          mistakes: prev.mistakes.filter(
            (m) => !(m.sourceType === "problem" && itemIds.has(m.sourceId))
          ),
        };
      });
    },
    [persist]
  );

  const applyServerData = useCallback((next: AppData, version: number) => {
    applyingRemoteRef.current = true;
    setData(next);
    setLastPulledVersion(syncUserId ?? "", version);
    setLastSyncedAt(new Date().toISOString());
    setPendingPushCount(0);
    setSyncStatus("synced");
    setSyncError(null);
    window.setTimeout(() => {
      applyingRemoteRef.current = false;
    }, 0);
  }, [syncUserId]);

  const fetchServerRow = useCallback(async () => {
    if (!supabase || !syncUserId) return null;
    const { data: row, error } = await supabase
      .from("study_data")
      .select("payload, version, device_label, updated_at")
      .eq("user_id", syncUserId)
      .maybeSingle();
    if (error) throw error;
    return row;
  }, [supabase, syncUserId]);

  const pushLocalToServer = useCallback(
    async (opts?: { forceOverwrite?: boolean; snapshot?: AppData }) => {
      const local = opts?.snapshot ?? dataRef.current;
      if (!supabase || !syncUserId || !local) return;
      if (!online) {
        setSyncStatus("offline");
        return;
      }
      setSyncStatus("syncing");
      setSyncError(null);
      try {
        const row = await fetchServerRow();
        const knownVersion = getLastPulledVersion(syncUserId);
        const pending = pendingPushCountRef.current;
        if (!opts?.forceOverwrite && row && row.version > knownVersion && pending > 0) {
          const decoded = migrate(decodeData(row.payload));
          setConflictState({
            serverVersion: row.version,
            serverLabel: row.device_label,
            serverUpdatedAt: row.updated_at,
            serverData: decoded,
          });
          setSyncStatus("conflict");
          return;
        }

        const nextVersion = Math.max(row?.version ?? 0, knownVersion) + 1;
        const payload = encodeData(local) as unknown as Record<string, unknown>;
        const deviceLabel =
          typeof navigator !== "undefined"
            ? `${navigator.userAgent.includes("Windows") ? "Windows" : "Browser"} · ${navigator.userAgent.includes("Chrome") ? "Chrome" : "Web"}`
            : "Browser";
        const { error: upsertError } = await supabase.from("study_data").upsert(
          {
            user_id: syncUserId,
            payload,
            version: nextVersion,
            device_label: deviceLabel,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
        if (upsertError) throw upsertError;
        setLastPulledVersion(syncUserId, nextVersion);
        setPendingPushCount(0);
        setLastSyncedAt(new Date().toISOString());
        setSyncStatus("synced");
      } catch (e) {
        setSyncStatus("error");
        setSyncError(e instanceof Error ? e.message : "동기화에 실패했습니다.");
      }
    },
    [supabase, syncUserId, online, fetchServerRow]
  );

  const pullIfServerNewer = useCallback(async () => {
    if (!supabase || !syncUserId || !online) return;
    try {
      const row = await fetchServerRow();
      if (!row) return;
      const knownVersion = getLastPulledVersion(syncUserId);
      if (row.version <= knownVersion) return;

      const decoded = migrate(decodeData(row.payload));
      if (pendingPushCountRef.current > 0) {
        setConflictState({
          serverVersion: row.version,
          serverLabel: row.device_label,
          serverUpdatedAt: row.updated_at,
          serverData: decoded,
        });
        setSyncStatus("conflict");
        return;
      }
      applyServerData(decoded, row.version);
    } catch (e) {
      setSyncStatus("error");
      setSyncError(e instanceof Error ? e.message : "서버 데이터를 확인하지 못했습니다.");
    }
  }, [supabase, syncUserId, online, fetchServerRow, applyServerData]);

  /** 로컬 변경 → 3초 디바운스 후 업로드 */
  useEffect(() => {
    if (!ready || !data || !syncUserId || !supabase) return;
    if (applyingRemoteRef.current) return;
    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }
    setPendingPushCount((n) => n + 1);
    if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
    pushTimerRef.current = window.setTimeout(() => {
      void pushLocalToServer();
    }, 3000);
    return () => {
      if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
    };
  }, [data, ready, syncUserId, supabase, pushLocalToServer]);

  /** 로그인 직후 1회: 서버/로컬 초기 맞춤 */
  useEffect(() => {
    if (!ready || !syncUserId || !supabase || !online) return;
    if (bootstrappedUserRef.current === syncUserId) return;
    bootstrappedUserRef.current = syncUserId;
    // 초기 맞춤이 끝날 때까지는 "로드"를 push로 취급하지 않는다
    skipNextPushRef.current = true;

    const run = async () => {
      const local = dataRef.current;
      if (!local) return;
      try {
        const row = await fetchServerRow();
        if (!row) {
          if (hasMeaningfulData(local)) {
            await pushLocalToServer({ forceOverwrite: true, snapshot: local });
          } else {
            setSyncStatus("synced");
          }
          return;
        }
        const knownVersion = getLastPulledVersion(syncUserId);
        if (!hasMeaningfulData(local)) {
          applyServerData(migrate(decodeData(row.payload)), row.version);
          return;
        }
        if (knownVersion === 0) {
          setConflictState({
            serverVersion: row.version,
            serverLabel: row.device_label,
            serverUpdatedAt: row.updated_at,
            serverData: migrate(decodeData(row.payload)),
          });
          setSyncStatus("conflict");
          return;
        }
        if (row.version > knownVersion) {
          await pullIfServerNewer();
        } else {
          setSyncStatus("synced");
        }
      } catch (e) {
        setSyncStatus("error");
        setSyncError(e instanceof Error ? e.message : "동기화 초기화에 실패했습니다.");
      }
    };
    void run();
  }, [
    ready,
    syncUserId,
    supabase,
    online,
    fetchServerRow,
    pushLocalToServer,
    applyServerData,
    pullIfServerNewer,
  ]);

  /** 오프라인 → 온라인 복귀 시 대기분 올리기 */
  useEffect(() => {
    if (!online || !syncUserId || !supabase) return;
    if (pendingPushCountRef.current <= 0) return;
    void pushLocalToServer();
  }, [online, syncUserId, supabase, pushLocalToServer]);

  useEffect(() => {
    if (!syncUserId || !online || !supabase) return;
    const onFocus = () => {
      void pullIfServerNewer();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [syncUserId, online, supabase, pullIfServerNewer]);

  const resetLocalOnly = useCallback(() => {
    resetData();
    setData(loadData());
    setPendingPushCount(0);
  }, []);

  const resetWithServerDelete = useCallback(async () => {
    if (!supabase || !syncUserId) {
      resetLocalOnly();
      return false;
    }
    const { error } = await supabase.from("study_data").delete().eq("user_id", syncUserId);
    if (error) {
      setSyncStatus("error");
      setSyncError(error.message);
      return false;
    }
    resetLocalOnly();
    setLastPulledVersion(syncUserId, 0);
    return true;
  }, [supabase, syncUserId, resetLocalOnly]);

  const storageUsage = useMemo(
    () =>
      data
        ? measureUsage(data)
        : { chars: 0, bytes: 0, limitBytes: 5 * 1024 * 1024, ratio: 0 },
    [data]
  );

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
      restoreCard,
      undoCardRating,
      toggleDeckPinned,
      resetAll,
      resetLocalOnly,
      resetWithServerDelete,
      exportBackup,
      importBackup,
      getDecksBySubject,
      getCardsByDeck,
      addLibraryDeck,
      removeDeck,
      addStudyModule,
      removeStudyModule,
      storageError,
      storageUsage,
      syncInfo: {
        enabled: Boolean(supabase),
        loggedIn: Boolean(syncUserId),
        status: syncStatus,
        pendingCount: pendingPushCount,
        lastSyncedAt,
        error: syncError,
      },
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
    restoreCard,
    undoCardRating,
    toggleDeckPinned,
    resetAll,
    resetLocalOnly,
    resetWithServerDelete,
    exportBackup,
    importBackup,
    getDecksBySubject,
    getCardsByDeck,
    addLibraryDeck,
    removeDeck,
    addStudyModule,
    removeStudyModule,
    storageError,
    storageUsage,
    supabase,
    syncUserId,
    syncStatus,
    pendingPushCount,
    lastSyncedAt,
    syncError,
  ]);

  if (!value) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <StorageContext.Provider value={value}>
      {children}
      {conflictState && data && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 dark:bg-zinc-800">
            <h3 className="text-base font-semibold">동기화 충돌</h3>
            <p className="mt-1 text-xs text-zinc-500">
              서버가 더 최신이지만 이 기기에도 아직 올리지 않은 변경이 있습니다.
            </p>
            <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
              <p>
                이 기기: 카드 {data.cards.length.toLocaleString()}장 · 마지막 학습{" "}
                {lastStudyStamp(data)}
              </p>
              <p className="mt-1">
                서버: 카드 {conflictState.serverData.cards.length.toLocaleString()}장 · 마지막 학습{" "}
                {lastStudyStamp(conflictState.serverData)}{" "}
                {conflictState.serverLabel ? `(${conflictState.serverLabel})` : ""}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  const blob = new Blob([exportData(data)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `eju-backup-before-conflict-${todayString()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
              >
                먼저 백업받기
              </button>
              <button
                onClick={() => {
                  void pushLocalToServer({ forceOverwrite: true });
                  setConflictState(null);
                }}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white"
              >
                이 기기 것으로 덮어쓰기
              </button>
              <button
                onClick={() => {
                  applyServerData(conflictState.serverData, conflictState.serverVersion);
                  setConflictState(null);
                }}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
              >
                서버 것 내려받기
              </button>
            </div>
          </div>
        </div>
      )}
    </StorageContext.Provider>
  );
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
