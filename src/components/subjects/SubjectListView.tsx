"use client";

import Link from "next/link";
import { Atom, Calculator, FlaskConical, BookOpen, Globe, Leaf, Library } from "lucide-react";
import { useStorage } from "@/context/StorageContext";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  calculator: Calculator,
  flask: FlaskConical,
  book: BookOpen,
  globe: Globe,
  atom: Atom,
  leaf: Leaf,
};

export function SubjectListView() {
  const { data } = useStorage();
  const hasAnyModule = data.units.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">교과목</h1>
          <p className="text-sm text-zinc-500">수학, 종합과목 등 개념·문제 학습</p>
        </div>
        <Link
          href="/study/modules"
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
        >
          <Library className="h-4 w-4" />
          모듈 보관함
        </Link>
      </div>

      {!hasAnyModule && (
        <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="font-medium">보관함에서 학습 모듈을 담으세요</p>
          <p className="mt-1.5 text-sm text-zinc-500">
            단원은 기본으로 모두 켜지지 않는다. 필요한 모듈만 담아 학습 목록을 구성한다.
          </p>
          <Link
            href="/study/modules"
            className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            학습 모듈 보관함 열기
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.subjects.map((subject) => {
          const Icon = iconMap[subject.icon] ?? BookOpen;
          const unitCount = data.units.filter((u) => u.subjectId === subject.id).length;
          const itemCount = data.items.filter((item) => {
            const unit = data.units.find((u) => u.id === item.unitId);
            return unit?.subjectId === subject.id;
          }).length;

          return (
            <Link
              key={subject.id}
              href={`/study/subjects/${subject.id}`}
              className="flex items-center gap-4 rounded-xl border border-zinc-200 p-5 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: subject.color }}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">{subject.name}</p>
                <p className="text-sm text-zinc-500">
                  {unitCount}단원 · {itemCount}항목
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {data.subjects.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
          <p className="text-zinc-500">과목이 없습니다. 설정에서 추가하세요.</p>
        </div>
      )}
    </div>
  );
}
