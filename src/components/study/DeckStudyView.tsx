"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  Play,
  HelpCircle,
  Pencil,
  Pin,
  Repeat,
  Trash2,
  Search,
  Shuffle,
  Undo2,
  Library,
} from "lucide-react";
import { useStorage } from "@/context/StorageContext";
import { FlashcardSession } from "./FlashcardSession";
import { QuizSession } from "./QuizSession";
import { getDueCards, getLeechCards, LEECH_LAPSES } from "@/lib/srs";
import { cn, shuffle as shuffleArray } from "@/lib/utils";
import type { Card, SessionSize } from "@/lib/types";
import { getSubjectColor } from "@/lib/types";
import {
  getMasteryDistribution,
  MASTERY_COLORS,
  MASTERY_LABELS,
  type MasteryLevel,
} from "@/lib/progress";

type Props = {
  subject: string;
  subjectLabel: string;
  tabs?: { key: string; label: string; type: string }[];
};

type Mode = "select" | "flashcard" | "quiz" | "tag-flash" | "tag-quiz" | "leech";

/** 한 번에 학습할 카드 수. 덱이 수백 장이어도 한 세션은 짧게 끊어야 실제로 외워진다. */
const SESSION_SIZES: SessionSize[] = [20, 50, 100, "all"];

export function DeckStudyView({ subject, subjectLabel, tabs }: Props) {
  const {
    data,
    getDecksBySubject,
    getCardsByDeck,
    updateCard,
    updateCardContent,
    deleteCard,
    restoreCard,
    toggleDeckPinned,
    updateSettings,
  } = useStorage();
  const [activeTab, setActiveTab] = useState(tabs?.[0]?.type ?? "vocab");
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("select");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [editReading, setEditReading] = useState("");
  const [editTags, setEditTags] = useState("");
  const [sessionCards, setSessionCards] = useState<Card[]>([]);
  const [deleted, setDeleted] = useState<{ card: Card; index: number } | null>(null);

  // 세션 분량과 섞기는 설정에 저장한다 — 화면에 들어올 때마다 다시 고르지 않도록.
  const sessionSize = data.settings.sessionSize ?? 20;
  const shuffleOn = data.settings.sessionShuffle ?? true;
  const setSessionSize = (v: SessionSize) => updateSettings({ sessionSize: v });
  const setShuffleOn = (v: boolean) => updateSettings({ sessionShuffle: v });

  const accent = getSubjectColor(subject, data.subjects);
  // 고정한 덱을 맨 위로. 그 안에서는 원래 순서를 지킨다.
  const filteredDecks = (
    tabs
      ? getDecksBySubject(subject).filter((d) => d.type === activeTab)
      : getDecksBySubject(subject)
  )
    .map((deck, i) => ({ deck, i }))
    .sort((a, b) => Number(Boolean(b.deck.pinned)) - Number(Boolean(a.deck.pinned)) || a.i - b.i)
    .map(({ deck }) => deck);

  const selectedDeck = filteredDecks.find((d) => d.id === selectedDeckId);
  const allCards = selectedDeckId ? getCardsByDeck(selectedDeckId) : [];
  const dueCards = getDueCards(allCards);
  const mastery = useMemo(() => getMasteryDistribution(allCards), [allCards]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    allCards.forEach((c) => c.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [allCards]);

  const visibleCards = allCards.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      c.front.toLowerCase().includes(q) ||
      c.back.toLowerCase().includes(q) ||
      c.reading?.toLowerCase().includes(q) ||
      c.notes?.toLowerCase().includes(q);
    const matchTag = !tagFilter || c.tags.includes(tagFilter);
    return matchSearch && matchTag;
  });

  const tagCards = tagFilter ? allCards.filter((c) => c.tags.includes(tagFilter)) : [];
  const leechCards = useMemo(() => getLeechCards(allCards), [allCards]);

  /** 복습 대상(없으면 전체)에서 옵션대로 섞고 잘라 한 세션 분량을 만든다. */
  const buildSession = (): Card[] => {
    const base = dueCards.length > 0 ? dueCards : allCards;
    const ordered = shuffleOn ? shuffleArray(base) : base;
    return sessionSize === "all" ? ordered : ordered.slice(0, sessionSize);
  };

  const startFlashcards = () => {
    setSessionCards(buildSession());
    setMode("flashcard");
  };

  const startLeechSession = () => {
    const ordered = shuffleOn ? shuffleArray(leechCards) : leechCards;
    setSessionCards(sessionSize === "all" ? ordered : ordered.slice(0, sessionSize));
    setMode("leech");
  };

  const sessionCount =
    sessionSize === "all"
      ? dueCards.length > 0
        ? dueCards.length
        : allCards.length
      : Math.min(sessionSize, dueCards.length > 0 ? dueCards.length : allCards.length);

  if ((mode === "flashcard" || mode === "leech") && selectedDeckId) {
    return (
      <div>
        <button onClick={() => setMode("select")} className="mb-4 text-sm text-zinc-500">
          ← 돌아가기
        </button>
        {mode === "leech" && (
          <p className="mb-3 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            {LEECH_LAPSES}번 이상 틀린 카드만 모았다. 뜻을 외우려 하지 말고 예문이나 나만의 힌트를
            붙여 두면 이 고리에서 빠져나오기 쉽다.
          </p>
        )}
        <FlashcardSession
          cards={sessionCards.length > 0 ? sessionCards : allCards}
          onRate={updateCard}
          onComplete={() => setMode("select")}
        />
      </div>
    );
  }

  if (mode === "quiz" && selectedDeckId) {
    return (
      <div>
        <button onClick={() => setMode("select")} className="mb-4 text-sm text-zinc-500">
          ← 돌아가기
        </button>
        <QuizSession
          cards={allCards}
          poolCards={allCards}
          onComplete={() => setMode("select")}
        />
      </div>
    );
  }

  if ((mode === "tag-flash" || mode === "tag-quiz") && tagCards.length > 0) {
    return (
      <div>
        <button onClick={() => setMode("select")} className="mb-4 text-sm text-zinc-500">
          ← 돌아가기
        </button>
        {mode === "tag-flash" ? (
          <FlashcardSession
            cards={tagCards}
            onRate={updateCard}
            onComplete={() => setMode("select")}
          />
        ) : (
          <QuizSession cards={tagCards} poolCards={allCards} onComplete={() => setMode("select")} />
        )}
      </div>
    );
  }

  // ── 단어장 목록 ──────────────────────────────────────────
  // 덱을 고르면 목록을 접고 학습 화면으로 넘어간다. 예전처럼 목록 아래에
  // 시작 버튼이 붙어 나오면, 덱이 많을수록 버튼을 찾아 스크롤해야 했다.
  if (!selectedDeck) {
    return (
      <div>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: accent }}>
              {subjectLabel}
            </h1>
            <p className="text-sm text-zinc-500">플래시카드와 퀴즈로 암기 학습</p>
          </div>
          {/* 단어장을 담고 빼는 곳은 여기서 항상 한 번에 갈 수 있어야 한다.
              예전에는 담은 덱이 하나도 없을 때만 링크가 보였다. */}
          <a
            href="/study/library"
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
          >
            <Library className="h-4 w-4" />
            단어장 보관함
          </a>
        </div>

        {tabs && (
          <div className="mb-6 flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.type);
                  setSelectedDeckId(null);
                }}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === tab.type
                    ? "text-white"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                )}
                style={activeTab === tab.type ? { backgroundColor: accent } : undefined}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {filteredDecks.map((deck) => {
            const cards = getCardsByDeck(deck.id);
            const due = getDueCards(cards).length;

            return (
              <div
                key={deck.id}
                className={cn(
                  "flex items-center gap-2 rounded-xl border pr-2 transition-colors",
                  deck.pinned
                    ? "border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800/50"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
                )}
              >
                <button
                  onClick={() => setSelectedDeckId(deck.id)}
                  className="flex min-w-0 flex-1 items-center gap-4 p-5 text-left"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                    <Layers className="h-5 w-5" style={{ color: accent }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{deck.title}</span>
                    <span className="mt-1 block text-sm text-zinc-500">
                      {cards.length}장 · 오늘 복습 {due}장
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                </button>
                <button
                  onClick={() => toggleDeckPinned(deck.id)}
                  title={deck.pinned ? "고정 해제" : "맨 위에 고정"}
                  aria-label={deck.pinned ? "고정 해제" : "맨 위에 고정"}
                  aria-pressed={Boolean(deck.pinned)}
                  className={cn(
                    "shrink-0 rounded-lg p-2 transition-colors",
                    deck.pinned
                      ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                      : "text-zinc-300 hover:bg-zinc-100 hover:text-zinc-500 dark:text-zinc-600 dark:hover:bg-zinc-800"
                  )}
                >
                  <Pin className={cn("h-4 w-4", deck.pinned && "fill-current")} />
                </button>
              </div>
            );
          })}
        </div>

        {filteredDecks.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
            <Library className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="mt-3 font-medium">아직 담은 단어장이 없다</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-zinc-500">
              단어는 이미 앱 안에 들어 있다. 보관함에서 원하는 단어장을 담으면 여기에 나타난다.
              한 권(400단어 안팎)씩 담아서 끝내는 걸 권한다.
            </p>
            <a
              href="/study/library"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Library className="h-4 w-4" />
              단어장 보관함 열기
            </a>
          </div>
        )}
      </div>
    );
  }

  // ── 고른 단어장의 학습 화면 ──────────────────────────────
  return (
    <div>
      <button
        onClick={() => setSelectedDeckId(null)}
        className="mb-4 flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        {subjectLabel} 단어장 목록
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{selectedDeck.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {allCards.length}장 · 오늘 복습 {dueCards.length}장
        </p>
      </div>

      {/* 학습 시작 — 이 화면의 본론이므로 맨 위에 둔다 */}
      <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-700">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500">한 세션 분량</span>
          {SESSION_SIZES.map((s) => (
            <button
              key={String(s)}
              onClick={() => setSessionSize(s)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                sessionSize === s
                  ? "text-white"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              )}
              style={sessionSize === s ? { backgroundColor: accent } : undefined}
            >
              {s === "all" ? "전체" : `${s}장`}
            </button>
          ))}
          <button
            onClick={() => setShuffleOn(!shuffleOn)}
            className={cn(
              "ml-1 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              shuffleOn
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            )}
          >
            <Shuffle className="h-3 w-3" />
            섞기 {shuffleOn ? "ON" : "OFF"}
          </button>
        </div>

        <div className="mt-3 flex gap-3">
          <button
            onClick={startFlashcards}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-white"
            style={{ backgroundColor: accent }}
          >
            <Play className="h-4 w-4" />
            플래시카드 ({sessionCount}장)
          </button>
          <button
            onClick={() => setMode("quiz")}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 py-3 text-sm font-medium dark:border-zinc-700"
          >
            <HelpCircle className="h-4 w-4" />
            퀴즈 모드
          </button>
        </div>

        {/* 간격 반복만으로는 안 빠져나오는 카드들 — 따로 돌릴 수 있게 */}
        {leechCards.length > 0 && (
          <button
            onClick={startLeechSession}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/20"
          >
            <Repeat className="h-4 w-4" />
            자주 틀린 {leechCards.length}장만 학습
          </button>
        )}
      </div>

      <div className="mt-6">
        <p className="mb-2 text-xs font-medium text-zinc-500">숙련도 분포</p>
        <div className="flex h-4 overflow-hidden rounded-full">
          {(Object.keys(mastery) as MasteryLevel[]).map((level) => {
            const n = mastery[level];
            if (!n) return null;
            const pct = (n / allCards.length) * 100;
            return (
              <div
                key={level}
                style={{ width: `${pct}%`, backgroundColor: MASTERY_COLORS[level] }}
                title={`${MASTERY_LABELS[level]}: ${n}`}
              />
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
          {(Object.keys(mastery) as MasteryLevel[]).map((level) => (
            <span key={level} className="flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: MASTERY_COLORS[level] }}
              />
              {MASTERY_LABELS[level]} {mastery[level]}
            </span>
          ))}
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500">태그:</span>
          <button
            onClick={() => setTagFilter("")}
            className={cn(
              "rounded-full px-3 py-1 text-xs",
              !tagFilter
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "bg-zinc-100 dark:bg-zinc-800"
            )}
          >
            전체
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(t === tagFilter ? "" : t)}
              className={cn(
                "rounded-full px-3 py-1 text-xs",
                tagFilter === t
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-zinc-100 dark:bg-zinc-800"
              )}
            >
              {t}
            </button>
          ))}
          {tagFilter && (
            <>
              <button onClick={() => setMode("tag-flash")} className="text-xs text-blue-600">
                태그 플래시
              </button>
              <button onClick={() => setMode("tag-quiz")} className="text-xs text-blue-600">
                태그 퀴즈
              </button>
            </>
          )}
        </div>
      )}

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <Search className="h-4 w-4 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="카드 검색..."
            className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {visibleCards.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700"
            >
              {editingId === c.id ? (
                <div className="space-y-2">
                  <input
                    value={editFront}
                    onChange={(e) => setEditFront(e.target.value)}
                    className="w-full rounded border px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    placeholder="앞면"
                  />
                  <input
                    value={editReading}
                    onChange={(e) => setEditReading(e.target.value)}
                    className="w-full rounded border px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    placeholder="읽기"
                  />
                  <input
                    value={editBack}
                    onChange={(e) => setEditBack(e.target.value)}
                    className="w-full rounded border px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    placeholder="뒷면"
                  />
                  <input
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    className="w-full rounded border px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    placeholder="태그 (쉼표 구분)"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        updateCardContent(c.id, {
                          front: editFront,
                          back: editBack,
                          reading: editReading || undefined,
                          tags: editTags
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean),
                        });
                        setEditingId(null);
                      }}
                      className="rounded bg-blue-600 px-3 py-1 text-xs text-white"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded px-3 py-1 text-xs text-zinc-500"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {c.front}
                      {c.reading && (
                        <span className="ml-2 text-zinc-400">({c.reading})</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-zinc-500">{c.back}</p>
                    {c.notes && (
                      <p className="truncate text-[11px] italic text-zinc-400">{c.notes}</p>
                    )}
                    {c.tags.length > 0 && (
                      <p className="mt-0.5 text-[10px] text-zinc-400">{c.tags.join(", ")}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => {
                        setEditingId(c.id);
                        setEditFront(c.front);
                        setEditBack(c.back);
                        setEditReading(c.reading ?? "");
                        setEditTags(c.tags.join(", "));
                      }}
                      className="p-1 text-zinc-400 hover:text-blue-500"
                      aria-label="편집"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        // confirm으로 한 번 더 묻는 것보다, 지우고 무를 수 있는 편이 빠르다.
                        setDeleted({ card: c, index: allCards.findIndex((x) => x.id === c.id) });
                        deleteCard(c.id);
                      }}
                      className="p-1 text-zinc-400 hover:text-red-500"
                      aria-label="삭제"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {deleted && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800">
            <span className="min-w-0 truncate text-zinc-500">
              <span className="font-medium text-zinc-700 dark:text-zinc-200">
                {deleted.card.front}
              </span>
              {" 삭제함"}
            </span>
            <button
              onClick={() => {
                restoreCard(deleted.card, deleted.index);
                setDeleted(null);
              }}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-700"
            >
              <Undo2 className="h-3.5 w-3.5" />
              되돌리기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
