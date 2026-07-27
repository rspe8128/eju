"use client";

type Props = {
  total: number;
  remembered: number;
  shaky: number;
  forgotten: number;
  correctRate: number;
  elapsedSec: number;
  onRetryWrong: () => void;
  onDone: () => void;
  hasWrong: boolean;
};

export function SessionSummary({
  total,
  remembered,
  shaky,
  forgotten,
  correctRate,
  elapsedSec,
  onRetryWrong,
  onDone,
  hasWrong,
}: Props) {
  const mm = Math.floor(elapsedSec / 60);
  const ss = elapsedSec % 60;

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-zinc-200 p-8 text-center dark:border-zinc-700">
      <h2 className="text-xl font-bold">세션 완료!</h2>
      <p className="mt-1 text-sm text-zinc-500">
        {total}개 · {mm}분 {ss}초 · 정답률 {correctRate}%
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-xl bg-green-50 p-3 dark:bg-green-900/20">
          <p className="text-2xl font-bold text-green-600">{remembered}</p>
          <p className="text-zinc-500">기억함</p>
        </div>
        <div className="rounded-xl bg-yellow-50 p-3 dark:bg-yellow-900/20">
          <p className="text-2xl font-bold text-yellow-600">{shaky}</p>
          <p className="text-zinc-500">헷갈림</p>
        </div>
        <div className="rounded-xl bg-red-50 p-3 dark:bg-red-900/20">
          <p className="text-2xl font-bold text-red-600">{forgotten}</p>
          <p className="text-zinc-500">모름</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {hasWrong && (
          <button
            onClick={onRetryWrong}
            className="rounded-xl bg-red-500 py-3 text-sm font-medium text-white hover:bg-red-600"
          >
            틀린 것만 다시 풀기
          </button>
        )}
        <button
          onClick={onDone}
          className="rounded-xl border border-zinc-200 py-3 text-sm font-medium dark:border-zinc-700"
        >
          돌아가기
        </button>
      </div>
    </div>
  );
}
