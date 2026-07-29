"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useStorage } from "@/context/StorageContext";
import { deckStudyHref } from "@/lib/nav";
import { FlashcardSession } from "./FlashcardSession";

/**
 * 카드 한 장만 학습한다.
 *
 * 검색(⌘K)으로 카드를 찾았을 때 예전에는 그 카드가 든 덱 화면으로만 보내 줘서,
 * 정작 찾은 카드를 다시 찾아야 했다.
 */
export function SingleCardView({ cardId }: { cardId: string }) {
  const { data, updateCard } = useStorage();
  const card = data.cards.find((c) => c.id === cardId);
  const deck = card ? data.decks.find((d) => d.id === card.deckId) : null;

  if (!card) {
    return (
      <div className="py-20 text-center">
        <p className="mb-2 text-zinc-500">카드를 찾을 수 없다. 지워졌거나 덱을 뺀 것 같다.</p>
        <Link href="/study/japanese" className="text-sm text-blue-600 hover:underline">
          일본어 학습으로
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href={deckStudyHref(deck?.subject)}
        className="mb-4 flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        {deck?.title ?? "학습"}
      </Link>
      <FlashcardSession cards={[card]} onRate={updateCard} />
    </div>
  );
}
