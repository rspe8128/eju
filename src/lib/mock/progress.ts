"use client";

import type { MockProgress } from "./types";

/**
 * 풀던 세션을 그대로 이어서 풀 수 있도록 localStorage에 저장한다.
 * StorageContext(AppData)에 넣지 않는 이유: 제출 전의 임시 상태라
 * 백업·초기화 대상에 섞이면 오히려 헷갈린다. 제출한 결과만 AppData로 간다.
 */

const KEY = "eju.mock.progress.v1";

type Store = Record<string, MockProgress>;

function progressKey(paperId: string, sectionId: string): string {
  return `${paperId}::${sectionId}`;
}

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function write(store: Store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* 용량 초과 등은 조용히 무시 — 진행 상황 저장은 부가 기능이다 */
  }
}

export function loadProgress(paperId: string, sectionId: string): MockProgress | null {
  return read()[progressKey(paperId, sectionId)] ?? null;
}

export function saveProgress(p: MockProgress) {
  const store = read();
  store[progressKey(p.paperId, p.sectionId)] = p;
  write(store);
}

export function clearProgress(paperId: string, sectionId: string) {
  const store = read();
  delete store[progressKey(paperId, sectionId)];
  write(store);
}

/** 페이퍼 하나에 속한 모든 세션의 진행 상황 */
export function loadPaperProgress(paperId: string): Record<string, MockProgress> {
  const store = read();
  const out: Record<string, MockProgress> = {};
  for (const [k, v] of Object.entries(store)) {
    if (v.paperId === paperId) out[v.sectionId] = v;
    else if (k.startsWith(`${paperId}::`)) out[k.split("::")[1]] = v;
  }
  return out;
}

/** 기술(記述) 답안 초안 저장 — 별도 키 */
const WRITING_KEY = "eju.mock.writing.v1";

export type WritingDraft = {
  paperId: string;
  promptId: string;
  body: string;
  updatedAt: string;
};

export function loadWritingDraft(paperId: string): WritingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WRITING_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as Record<string, WritingDraft>;
    return all[paperId] ?? null;
  } catch {
    return null;
  }
}

export function saveWritingDraft(draft: WritingDraft) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(WRITING_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, WritingDraft>) : {};
    all[draft.paperId] = draft;
    window.localStorage.setItem(WRITING_KEY, JSON.stringify(all));
  } catch {
    /* noop */
  }
}
