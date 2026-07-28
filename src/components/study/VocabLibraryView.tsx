"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Library,
  Plus,
  Check,
  Loader2,
  Trash2,
  HardDrive,
  TriangleAlert,
  ArrowRight,
} from "lucide-react";
import { useStorage } from "@/context/StorageContext";
import {
  libraryGroups,
  LIBRARY_TOTAL,
  APPROX_CHARS_PER_CARD,
  type LibraryDeck,
} from "@/lib/data/vocab/library";
import { cn } from "@/lib/utils";

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

/** 이 덱을 넣으면 저장 공간이 얼마나 늘어나는지 (UTF-16 기준 바이트) */
function estimatedBytes(count: number): number {
  return count * APPROX_CHARS_PER_CARD * 2;
}

function StorageMeter() {
  const { storageUsage, storageError } = useStorage();
  const pct = Math.min(100, Math.round(storageUsage.ratio * 100));
  const tight = storageUsage.ratio > 0.8;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          <HardDrive className="h-4 w-4 text-zinc-400" />
          브라우저 저장 공간
        </span>
        <span className={cn("tabular-nums", tight ? "text-red-500" : "text-zinc-500")}>
          {mb(storageUsage.bytes)} / {mb(storageUsage.limitBytes)} ({pct}%)
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-blue-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
        학습 기록은 이 브라우저 안에만 저장된다. 기준은 가장 빡빡한 Safari(5MB)로 잡았다.
        Chrome·Firefox는 10MB 정도라 더 여유가 있다.
      </p>
      {storageError && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs leading-relaxed text-red-700 dark:bg-red-900/20 dark:text-red-300">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {storageError}
        </p>
      )}
    </section>
  );
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

export function VocabLibraryView() {
  const { data, addLibraryDeck, removeDeck } = useStorage();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const groups = useMemo(() => libraryGroups(), []);
  const deckIds = useMemo(() => new Set(data.decks.map((d) => d.id)), [data.decks]);
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

      <p className="mb-6 rounded-xl bg-blue-50 p-3.5 text-xs leading-relaxed text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
        한 덱이 400단어 안팎인 이유는, 한 덱에 수천 장을 몰아넣으면 복습 큐가 하루 수백 장으로
        불어나서 감당이 안 되기 때문이다. 한 권씩 끝내고 다음 권을 넣는 쪽이 오래 간다.
        <b className="ml-1">JLPT N3부터 한 권씩 시작하는 걸 권한다.</b>
      </p>

      {groups.map((g) => {
        const inGroup = g.decks.filter((d) => deckIds.has(d.id)).length;
        const allAdded = inGroup === g.decks.length;
        return (
          <section key={g.group} className="mb-7">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {g.group}
                <span className="ml-2 text-xs font-normal text-zinc-400">
                  {inGroup}/{g.decks.length}권
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

      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 dark:bg-zinc-800">
            <h3 className="text-sm font-semibold">이 덱을 뺄까요?</h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              이 덱의 카드 {(cardCounts.get(confirmRemove) ?? 0).toLocaleString()}장과 그 복습
              진행도(몇 번 맞혔는지, 다음 복습일)가 함께 지워집니다. 다시 추가하면 처음부터
              시작합니다. 다른 덱의 기록에는 영향이 없습니다.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirmRemove(null)}
                className="flex-1 rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-700"
              >
                취소
              </button>
              <button
                onClick={() => {
                  removeDeck(confirmRemove);
                  setConfirmRemove(null);
                }}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                빼기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
