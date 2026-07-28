"use client";

import { useCallback, useState } from "react";
import type { GradeResult } from "@/app/api/grade-writing/route";
import type { WritingEntry } from "@/lib/types";
import { useOnline, OFFLINE_MESSAGE } from "@/lib/useOnline";

/**
 * /api/grade-writing 호출을 한 곳으로 모은 훅.
 *
 * /writing 과 모의고사 기술 세션이 같은 코드를 쓰게 하려고 뺐다. 예전에는 채점
 * 호출이 /writing 안에만 있었고 모의고사는 자가 채점뿐이어서, 같은 기능이 두 벌로
 * 갈라질 뻔했다. 글자 수 세는 법(analyze.ts의 countChars)도 이제 양쪽이 같다.
 */
export type WritingGradeState = {
  grade: GradeResult | null;
  grading: boolean;
  error: string | null;
  /** 오프라인이면 채점을 부를 수 없다 (OpenRouter가 필요하다) */
  offline: boolean;
  /** 버튼을 막아야 하는 이유. 없으면 null */
  blockedReason: string | null;
  runGrading: (promptJa: string, body: string) => Promise<void>;
  reset: () => void;
};

export function useWritingGrade(): WritingGradeState {
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const online = useOnline();

  const runGrading = useCallback(
    async (promptJa: string, body: string) => {
      if (!body.trim()) return;
      if (!online) {
        setError(OFFLINE_MESSAGE);
        return;
      }
      setGrading(true);
      setError(null);
      setGrade(null);
      try {
        const res = await fetch("/api/grade-writing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ promptJa, body }),
        });
        const json = await res.json();
        if (!res.ok) setError(json.error ?? "채점에 실패했습니다.");
        else setGrade(json as GradeResult);
      } catch {
        setError("채점 서버에 연결하지 못했습니다. 개발 서버가 켜져 있는지 확인하세요.");
      } finally {
        setGrading(false);
      }
    },
    [online]
  );

  const reset = useCallback(() => {
    setGrade(null);
    setError(null);
  }, []);

  return {
    grade,
    grading,
    error,
    offline: !online,
    blockedReason: online ? null : OFFLINE_MESSAGE,
    runGrading,
    reset,
  };
}

/**
 * 채점 결과를 writingEntries에 저장할 형태로 바꾼다.
 * 이걸 거쳐야 /writing 의 "과거 작성물"에서 모의고사 기술 답안의 채점 결과도 보인다.
 */
export function gradeToEntryFields(grade: GradeResult | null): Partial<WritingEntry> {
  if (!grade) return {};
  return {
    aiScore: grade.total,
    aiMax: grade.max,
    aiAxes: grade.axes.map((a) => ({
      label: a.label,
      score: a.score,
      max: a.max,
      comment: a.comment,
    })),
    aiStrengths: grade.strengths,
    aiImprovements: grade.improvements,
    aiFixes: grade.fixes,
    aiAdvice: grade.advice,
    aiModel: grade.model,
  };
}
