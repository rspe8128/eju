"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Library,
  Plus,
  Check,
  Loader2,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { useStorage } from "@/context/StorageContext";
import {
  libraryGroups,
  categoryOfGroup,
  LIBRARY_CATEGORIES,
  LIBRARY_TOTAL,
  APPROX_CHARS_PER_CARD,
  type LibraryDeck,
} from "@/lib/data/vocab/library";
import { StorageMeter } from "@/components/library/StorageMeter";
import { ConfirmRemoveModal } from "@/components/library/ConfirmRemoveModal";
import { FilterTabs } from "@/components/library/FilterTabs";
import { ReviewForecast } from "@/components/study/ReviewForecast";

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

/** 이 덱을 넣으면 저장 공간이 얼마나 늘어나는지 (UTF-16 기준 바이트) */
function estimatedBytes(count: number): number {
  return count * APPROX_CHARS_PER_CARD * 2;
}

function DeckRow({
  deck,
  added,
  cardCount,
  busy,
  onAdd,
  onRemove,
}: {
  deck: LibraryDeck;
  added: boolean;
  cardCount: number;
  busy: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-700">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{deck.title}</span>
        <span className="mt-0.5 block text-[11px] text-zinc-400">
          {added ? `${cardCount.toLocaleString()}장 학습 중` : `${deck.count.toLocaleString()}단어`}
          {" · 약 "}
          {mb(estimatedBytes(deck.count))}
          {deck.note && ` · ${deck.note}`}
        </span>
      </span>

      {added ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-lg bg-green-50 px-2 py-1 text-[11px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
            <Check className="h-3 w-3" />
            추가됨
          </span>
          <button
            onClick={onRemove}
            title="덱과 학습 기록을 지우고 저장 공간을 되돌린다"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={onAdd}
          disabled={busy}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-blue-400 hover:text-blue-600 disabled:opacity-50 dark:border-zinc-700"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          {busy ? "추가 중" : "추가"}
        </button>
      )}
    </li>
  );
}

/** 담은 덱만 모아 보는 탭. 빼거나 진행 상황을 볼 때 여기부터 본다. */
const ADDED_TAB = "added";

export function VocabLibraryView() {
  const { data, addLibraryDeck, removeDeck } = useStorage();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [tab, setTab] = useState<string>(LIBRARY_CATEGORIES[0].id);

  const groups = useMemo(() => libraryGroups(), []);
  const deckIds = useMemo(() => new Set(data.decks.map((d) => d.id)), [data.decks]);

  /**
   * 탭에 맞는 그룹만 남긴다. '담음' 탭은 그룹 구분은 그대로 두고 담은 덱만 남긴다.
   * total은 원래 그룹의 권수 — 걸러낸 뒤에도 "3/8권"처럼 전체 대비로 보여주기 위해서.
   */
  const visibleGroups = useMemo(() => {
    if (tab === ADDED_TAB) {
      return groups
        .map((g) => ({
          group: g.group,
          total: g.decks.length,
          decks: g.decks.filter((d) => deckIds.has(d.id)),
        }))
        .filter((g) => g.decks.length > 0);
    }
    return groups
      .filter((g) => categoryOfGroup(g.group) === tab)
      .map((g) => ({ group: g.group, total: g.decks.length, decks: g.decks }));
  }, [groups, tab, deckIds]);

  const addedCountByTab = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of groups) {
      const cat = categoryOfGroup(g.group);
      const added = g.decks.filter((d) => deckIds.has(d.id)).length;
      m.set(cat, (m.get(cat) ?? 0) + added);
    }
    return m;
  }, [groups, deckIds]);

  const totalAdded = useMemo(
    () => groups.reduce((n, g) => n + g.decks.filter((d) => deckIds.has(d.id)).length, 0),
    [groups, deckIds]
  );
  const cardCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of data.cards) m.set(c.deckId, (m.get(c.deckId) ?? 0) + 1);
    return m;
  }, [data.cards]);

  const addedCount = useMemo(
    () =>
      groups
        .flatMap((g) => g.decks)
        .filter((d) => deckIds.has(d.id))
        .reduce((n, d) => n + d.count, 0),
    [groups, deckIds]
  );

  const add = async (deck: LibraryDeck) => {
    setBusyId(deck.id);
    try {
      await addLibraryDeck(deck.id);
    } finally {
      setBusyId(null);
    }
  };

  const addGroup = async (decks: LibraryDeck[]) => {
    for (const d of decks) {
      if (deckIds.has(d.id)) continue;
      setBusyId(d.id);
      // 한 번에 여러 덱을 넣을 때도 순서대로 — 동시에 넣으면 상태 갱신이 서로를 덮어쓴다
      // eslint-disable-next-line no-await-in-loop
      await addLibraryDeck(d.id);
    }
    setBusyId(null);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Library className="h-6 w-6 text-blue-500" />
          단어장 보관함
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
          필요한 덱만 골라서 넣는다. 넣은 덱만 학습·복습 큐에 들어가고 저장 공간을 쓴다.
          안 쓰게 되면 언제든 빼면 된다.
        </p>
        <p className="mt-2 text-xs text-zinc-400">
          보유 {LIBRARY_TOTAL.toLocaleString()}단어 중 {addedCount.toLocaleString()}단어 추가함
        </p>
      </header>

      <div className="mb-5">
        <StorageMeter />
      </div>

      {/* 한 권 더 담아도 되는지 여기서 판단할 수 있게 */}
      <div className="mb-5">
        <ReviewForecast days={10} />
      </div>

      <p className="mb-5 rounded-xl bg-blue-50 p-3.5 text-xs leading-relaxed text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
        한 덱이 400단어 안팎인 이유는, 한 덱에 수천 장을 몰아넣으면 복습 큐가 하루 수백 장으로
        불어나서 감당이 안 되기 때문이다. 한 권씩 끝내고 다음 권을 넣는 쪽이 오래 간다.
        <b className="ml-1">JLPT N3부터 한 권씩 시작하는 걸 권한다.</b>
      </p>

      <div className="sticky top-[var(--app-header-h)] z-10 mb-5 bg-zinc-50 py-2 dark:bg-zinc-950">
        <FilterTabs
          tabs={[
            ...LIBRARY_CATEGORIES.map((c) => ({
              id: c.id,
              label: c.label,
              count: addedCountByTab.get(c.id) ?? 0,
              highlight: true,
            })),
            { id: ADDED_TAB, label: "담음", count: totalAdded, highlight: true },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === ADDED_TAB && visibleGroups.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <p className="font-medium">아직 담은 단어장이 없다</p>
          <p className="mt-1.5 text-sm text-zinc-500">
            위 탭에서 원하는 단어장을 골라 담으면 여기에 모인다.
          </p>
        </div>
      )}

      {visibleGroups.map((g) => {
        const inGroup = g.decks.filter((d) => deckIds.has(d.id)).length;
        const allAdded = inGroup === g.total;
        return (
          <section key={g.group} className="mb-7">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {g.group}
                <span className="ml-2 text-xs font-normal text-zinc-400">
                  {inGroup}/{g.total}권
                </span>
              </h2>
              {!allAdded && g.decks.length > 1 && (
                <button
                  onClick={() => addGroup(g.decks)}
                  disabled={busyId !== null}
                  className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                >
                  전체 추가 (
                  {mb(
                    estimatedBytes(
                      g.decks.filter((d) => !deckIds.has(d.id)).reduce((n, d) => n + d.count, 0)
                    )
                  )}
                  )
                </button>
              )}
            </div>
            <ul className="space-y-2">
              {g.decks.map((d) => (
                <DeckRow
                  key={d.id}
                  deck={d}
                  added={deckIds.has(d.id)}
                  cardCount={cardCounts.get(d.id) ?? 0}
                  busy={busyId === d.id}
                  onAdd={() => add(d)}
                  onRemove={() => setConfirmRemove(d.id)}
                />
              ))}
            </ul>
          </section>
        );
      })}

      <Link
        href="/study/japanese"
        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
      >
        일본어 학습으로 가기
        <ArrowRight className="h-4 w-4" />
      </Link>

      <ConfirmRemoveModal
        open={Boolean(confirmRemove)}
        title="이 덱을 뺄까요?"
        description={`이 덱의 카드 ${(cardCounts.get(confirmRemove ?? "") ?? 0).toLocaleString()}장과 그 복습 진행도(몇 번 맞혔는지, 다음 복습일)가 함께 지워집니다. 다시 추가하면 처음부터 시작합니다. 다른 덱의 기록에는 영향이 없습니다.`}
        onCancel={() => setConfirmRemove(null)}
        onConfirm={() => {
          if (!confirmRemove) return;
          removeDeck(confirmRemove);
          setConfirmRemove(null);
        }}
      />
    </div>
  );
}
