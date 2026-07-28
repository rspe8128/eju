"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookPlus, Check, Library, Trash2, ArrowRight } from "lucide-react";
import { useStorage } from "@/context/StorageContext";
import { MODULE_TOTALS, modulesBySubject, type StudyModule } from "@/lib/data/subjects/modules";
import { ConfirmRemoveModal } from "@/components/library/ConfirmRemoveModal";
import { StorageMeter } from "@/components/library/StorageMeter";

type PendingRemove = {
  moduleId: string;
  title: string;
  solvedCount: number;
};

function ModuleRow({
  module,
  added,
  solvedCount,
  onAdd,
  onRemove,
}: {
  module: StudyModule;
  added: boolean;
  solvedCount: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-700">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{module.title}</span>
        <span className="mt-0.5 block text-[11px] text-zinc-400">
          {module.goal} · 개념 {module.conceptCount} · 문제 {module.problemCount}
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
            title="모듈과 문제 풀이 기록을 지운다"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {solvedCount > 0 && <span className="text-[10px] text-zinc-400">풀이 {solvedCount}</span>}
        </div>
      ) : (
        <button
          onClick={onAdd}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-zinc-700"
        >
          <BookPlus className="h-3.5 w-3.5" />
          추가
        </button>
      )}
    </li>
  );
}

export function ModulesLibraryView() {
  const { data, addStudyModule, removeStudyModule } = useStorage();
  const [pendingRemove, setPendingRemove] = useState<PendingRemove | null>(null);
  const groups = useMemo(() => modulesBySubject(), []);
  const unitIds = useMemo(() => new Set(data.units.map((u) => u.id)), [data.units]);
  const subjectNames = useMemo(
    () => new Map(data.subjects.map((subject) => [subject.id, subject.name])),
    [data.subjects]
  );
  const solvedByUnit = useMemo(() => {
    const m = new Map<string, number>();
    for (const item of data.items) {
      if (item.type !== "problem" || !item.solved) continue;
      m.set(item.unitId, (m.get(item.unitId) ?? 0) + 1);
    }
    return m;
  }, [data.items]);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Library className="h-6 w-6 text-blue-500" />
          학습 모듈 보관함
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
          필요한 단원만 담아 교과목 목록에 넣는다. 담지 않은 모듈은 학습 화면에 보이지 않는다.
        </p>
        <p className="mt-2 text-xs text-zinc-400">
          보유 {MODULE_TOTALS.modules}모듈 · 개념 {MODULE_TOTALS.concepts} · 문제 {MODULE_TOTALS.problems}
        </p>
      </header>

      <div className="mb-5">
        <StorageMeter />
      </div>

      {groups.map((group) => {
        const addedCount = group.modules.filter((mod) => unitIds.has(`unit-${mod.id}`)).length;
        const allAdded = addedCount === group.modules.length;
        return (
          <section key={group.subjectId} className="mb-7">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {subjectNames.get(group.subjectId) ?? group.subjectId}
                <span className="ml-2 text-xs font-normal text-zinc-400">
                  {addedCount}/{group.modules.length}모듈
                </span>
              </h2>
              {!allAdded && group.modules.length > 1 && (
                <button
                  onClick={() => {
                    for (const mod of group.modules) addStudyModule(mod.id);
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  전체 추가
                </button>
              )}
            </div>
            <ul className="space-y-2">
              {group.modules.map((mod) => {
                const unitId = `unit-${mod.id}`;
                const added = unitIds.has(unitId);
                const solvedCount = solvedByUnit.get(unitId) ?? 0;
                return (
                  <ModuleRow
                    key={mod.id}
                    module={mod}
                    added={added}
                    solvedCount={solvedCount}
                    onAdd={() => addStudyModule(mod.id)}
                    onRemove={() =>
                      setPendingRemove({
                        moduleId: mod.id,
                        title: mod.title,
                        solvedCount,
                      })
                    }
                  />
                );
              })}
            </ul>
          </section>
        );
      })}

      <Link
        href="/study/subjects"
        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
      >
        교과목 학습으로 가기
        <ArrowRight className="h-4 w-4" />
      </Link>

      <ConfirmRemoveModal
        open={Boolean(pendingRemove)}
        title="이 모듈을 뺄까요?"
        description={
          pendingRemove
            ? `${pendingRemove.title}의 문제 풀이 기록 ${pendingRemove.solvedCount}개가 함께 사라집니다. 다시 추가하면 문제는 처음 상태(미해결)로 시작합니다.`
            : ""
        }
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => {
          if (!pendingRemove) return;
          removeStudyModule(pendingRemove.moduleId);
          setPendingRemove(null);
        }}
      />
    </div>
  );
}
