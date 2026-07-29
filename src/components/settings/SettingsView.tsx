"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  Download,
  MonitorSmartphone,
  Plus,
  RotateCcw,
  ShieldAlert,
  Upload,
} from "lucide-react";
import { useStorage } from "@/context/StorageContext";
import { LayoutModePicker } from "@/components/layout/LayoutModePicker";
import type { ExamProfile, ScienceChoice } from "@/lib/types";
import { SCIENCE_SUBJECTS } from "@/lib/eju";
import { summarizeBackup, type BackupSummary } from "@/lib/storage";
import { todayString } from "@/lib/utils";

function parseDelimited(text: string) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const delim = lines[0].includes("\t") ? "\t" : ",";
  return lines.map((line) => {
    const parts = line.split(delim).map((p) => p.trim());
    // JLPT_N5 원본 형식: 번호\t단어\t읽기\t뜻(\t예문)
    if (/^\d+$/.test(parts[0] ?? "") && parts.length >= 4) {
      return {
        front: parts[1] ?? "",
        reading: parts[2] ?? "",
        back: parts[3] ?? "",
        exampleSentence: parts[4] || undefined,
      };
    }
    // 한자 원본 형식: 번호\t한자\t뜻
    if (/^\d+$/.test(parts[0] ?? "") && parts.length === 3) {
      return {
        front: parts[1] ?? "",
        reading: "",
        back: parts[2] ?? "",
        exampleSentence: undefined,
      };
    }
    return {
      front: parts[0] ?? "",
      reading: parts[1] ?? "",
      back: parts[2] ?? "",
      exampleSentence: parts[3] || undefined,
    };
  });
}

export function SettingsView() {
  const {
    data,
    addDeck,
    addSubject,
    addCards,
    updateExamProfile,
    updateSettings,
    updateCardContent,
    exportBackup,
    importBackup,
    resetLocalOnly,
    resetWithServerDelete,
    syncInfo,
  } = useStorage();
  const [message, setMessage] = useState("");
  const tsvRef = useRef<HTMLInputElement>(null);
  const backupRef = useRef<HTMLInputElement>(null);

  /**
   * 전체 초기화 확인 단계.
   * 되돌릴 수 없는 조작이라 버튼 한 번으로는 실행하지 않는다.
   * "초기화"라고 직접 입력받아야 버튼이 열린다.
   */
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");

  /** 복원 대기 중인 파일. 확인을 받기 전에는 절대 덮어쓰지 않는다. */
  const [pending, setPending] = useState<{ json: string; summary: BackupSummary } | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);

  const [deckTitle, setDeckTitle] = useState("");
  const [deckSubject, setDeckSubject] = useState("japanese");
  const [deckType, setDeckType] = useState<"vocab" | "grammar" | "kanji">("vocab");

  const [subjectName, setSubjectName] = useState("");
  const [subjectColor, setSubjectColor] = useState("#6366f1");

  const profile = data.examProfile!;
  const [csvText, setCsvText] = useState("");
  const [csvDeckId, setCsvDeckId] = useState(data.decks[0]?.id ?? "");
  const [dupMode, setDupMode] = useState<"skip" | "overwrite">("skip");
  const csvPreview = csvText ? parseDelimited(csvText).slice(0, 5) : [];

  const handleTsvUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result ?? ""));
      setMessage("JLPT TSV 파일을 불러왔습니다. 미리보기 확인 후 일괄 등록을 누르세요.");
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    setBackupError(null);
    try {
      const json = exportBackup();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `eju-backup-${todayString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage(`백업 파일을 내보냈습니다. (eju-backup-${todayString()}.json)`);
    } catch {
      setBackupError("백업 파일을 만들지 못했습니다. 브라우저 다운로드 설정을 확인하세요.");
    }
  };

  /** 파일을 읽어 요약만 만든다. 실제 덮어쓰기는 확인 버튼에서 한다. */
  const handleBackupFile = (file: File) => {
    setBackupError(null);
    setMessage("");
    const reader = new FileReader();
    reader.onload = () => {
      const json = String(reader.result ?? "");
      try {
        setPending({ json, summary: summarizeBackup(json) });
      } catch {
        setPending(null);
        setBackupError(
          "이 파일은 EJU Study 백업이 아닌 것 같습니다. 덱과 카드 목록을 찾지 못했습니다. 기존 데이터는 그대로 있습니다."
        );
      }
    };
    reader.onerror = () => {
      setPending(null);
      setBackupError("파일을 읽지 못했습니다.");
    };
    reader.readAsText(file);
  };

  const confirmRestore = () => {
    if (!pending) return;
    try {
      importBackup(pending.json);
      setPending(null);
      setMessage("백업을 복원했습니다.");
    } catch {
      setBackupError("복원에 실패했습니다. 파일이 손상됐을 수 있습니다. 기존 데이터는 그대로 있습니다.");
    }
  };

  const patchProfile = (patch: Partial<ExamProfile>) => {
    let next: ExamProfile = { ...profile, ...patch };
    if (patch.track === "humanities") {
      next = { ...next, scienceChoices: [] };
    }
    if (patch.track === "science" && next.scienceChoices.length !== 2) {
      next = { ...next, scienceChoices: ["physics", "chemistry"] };
    }
    updateExamProfile(next);
  };

  const toggleScience = (code: ScienceChoice) => {
    const set = new Set(profile.scienceChoices);
    if (set.has(code)) set.delete(code);
    else if (set.size < 2) set.add(code);
    updateExamProfile({ ...profile, scienceChoices: Array.from(set) as ScienceChoice[] });
  };

  const handleCsvImport = () => {
    const rows = parseDelimited(csvText).filter((r) => r.front && r.back);
    if (!csvDeckId || rows.length === 0) return;

    const existing = data.cards.filter((c) => c.deckId === csvDeckId);
    const toAdd: typeof rows = [];
    let overwritten = 0;

    for (const row of rows) {
      const dup = existing.find((c) => c.front === row.front);
      if (dup) {
        if (dupMode === "overwrite") {
          updateCardContent(dup.id, {
            front: row.front,
            back: row.back,
            reading: row.reading || undefined,
            exampleSentence: row.exampleSentence,
          });
          overwritten += 1;
        }
      } else {
        toAdd.push(row);
      }
    }

    if (toAdd.length) {
      addCards(
        toAdd.map((r) => ({
          deckId: csvDeckId,
          front: r.front,
          back: r.back,
          reading: r.reading || undefined,
          exampleSentence: r.exampleSentence,
          tags: [],
        }))
      );
    }

    setMessage(`${toAdd.length}개 추가, ${overwritten}개 덮어쓰기 완료.`);
    setCsvText("");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="text-sm text-zinc-500">시험 프로필 · 데이터 · 콘텐츠</p>
      </div>

      {message && (
        <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
          {message}
        </div>
      )}

      <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-700">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <MonitorSmartphone className="h-5 w-5 text-zinc-400" />
          화면 UI
        </h2>
        <p className="mb-4 text-sm text-zinc-500">
          PC UI는 왼쪽에 메뉴가 항상 붙어 있고, 모바일 UI는 ☰ 메뉴와 하단 탭을 쓴다. 자동은 창
          크기를 따라간다.
        </p>
        <LayoutModePicker />
      </section>

      <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-700">
        <h2 className="mb-2 text-lg font-semibold">데이터 요약</h2>
        <div className="grid grid-cols-2 gap-2 text-sm text-zinc-500 sm:grid-cols-4">
          <p>버전: v{data.schemaVersion}</p>
          <p>카드: {data.cards.length}</p>
          <p>오답: {data.mistakes.filter((m) => !m.resolved).length}</p>
          <p>덱: {data.decks.length}</p>
        </div>
      </section>

      <section className="rounded-xl border border-amber-300 p-6 dark:border-amber-800">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          백업 · 복원
        </h2>
        {syncInfo.loggedIn ? (
          <p className="mb-4 text-sm leading-relaxed text-amber-800 dark:text-amber-300">
            지금은 계정 동기화가 켜져 있어 여러 기기에서 같은 기록을 쓸 수 있다. 그래도 파일 백업은
            별개의 안전장치다. 실수로 초기화하거나 충돌 정리 전에 스냅샷을 남겨 두면 복구가 쉽다.
          </p>
        ) : (
          <p className="mb-4 text-sm leading-relaxed text-amber-800 dark:text-amber-300">
            이 앱의 <strong>유일한 저장소는 이 브라우저의 localStorage</strong>다. 서버에 사본이
            없다. 브라우저 데이터(쿠키·사이트 데이터)를 지우거나, 시크릿 모드로 열거나, 다른 기기·
            다른 브라우저로 옮기면 학습 기록은 <strong>복구할 방법이 없다</strong>. 정기적으로
            파일로 내보내 두는 것이 유일한 대비책이다.
          </p>
        )}

        <p className="mb-4 text-xs text-zinc-500">
          마지막 백업:{" "}
          {data.settings.lastBackupAt ? (
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {data.settings.lastBackupAt}
            </span>
          ) : (
            <span className="font-medium text-red-600 dark:text-red-400">아직 없음</span>
          )}
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            <Download className="h-4 w-4" />
            백업 파일 내보내기
          </button>
          <button
            onClick={() => backupRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium dark:border-zinc-700"
          >
            <Upload className="h-4 w-4" />
            백업 파일 불러오기
          </button>
          <input
            ref={backupRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleBackupFile(f);
              // 같은 파일을 다시 고를 수 있게 값을 비운다
              e.target.value = "";
            }}
          />
        </div>

        {backupError && (
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm leading-relaxed text-red-700 dark:bg-red-900/20 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {backupError}
          </p>
        )}

        {pending && (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="flex items-start gap-2 text-sm font-semibold text-red-800 dark:text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              복원하면 지금 이 브라우저의 데이터가 전부 사라진다. 되돌릴 수 없다.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[320px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-zinc-500">
                    <th className="py-1 pr-3 font-medium">항목</th>
                    <th className="py-1 pr-3 font-medium">지금 (사라짐)</th>
                    <th className="py-1 font-medium">백업 파일 (덮어씀)</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {[
                    ["덱", data.decks.length, pending.summary.decks],
                    ["카드", data.cards.length, pending.summary.cards],
                    ["오답", data.mistakes.length, pending.summary.mistakes],
                    ["시험 기록", data.examRecords.length, pending.summary.examRecords],
                    ["작문", data.writingEntries.length, pending.summary.writingEntries],
                  ].map(([label, now, next]) => (
                    <tr key={String(label)} className="border-t border-red-200 dark:border-red-900">
                      <td className="py-1.5 pr-3">{label}</td>
                      <td className="py-1.5 pr-3 text-red-700 line-through dark:text-red-400">
                        {now}
                      </td>
                      <td className="py-1.5 font-medium text-green-700 dark:text-green-400">
                        {next}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              백업 파일 버전 v{pending.summary.schemaVersion ?? "?"}
              {pending.summary.backedUpAt && ` · ${pending.summary.backedUpAt}에 내보낸 파일`}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={confirmRestore}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                덮어쓰고 복원
              </button>
              <button
                onClick={() => setPending(null)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600"
              >
                취소
              </button>
              <button
                onClick={handleExport}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600"
              >
                먼저 지금 데이터 백업
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── 전체 초기화 ─────────────────────────────────────────
          되돌릴 수 없으므로 (1) 지워질 것을 숫자로 보여주고
          (2) "초기화"를 직접 입력받고 (3) 먼저 백업할 길을 옆에 둔다. */}
      <section className="rounded-xl border border-red-300 p-6 dark:border-red-900">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-red-600 dark:text-red-400">
          <RotateCcw className="h-5 w-5" />
          전체 초기화
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-zinc-500">
          이 브라우저에 저장된 학습 기록을 전부 지우고 처음 상태로 되돌린다. 담아 둔 단어장과
          학습 모듈, 복습 진행도, 모의고사 응시 기록, 작문, 오답노트가 모두 사라진다.
          <b className="text-red-600 dark:text-red-400"> 되돌릴 수 없다.</b>
        </p>

        {!resetOpen ? (
          <button
            onClick={() => {
              setResetOpen(true);
              setResetConfirmText("");
            }}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            전체 초기화…
          </button>
        ) : (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="mb-3 flex items-start gap-2 text-sm font-medium text-red-700 dark:text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              아래 기록이 지워진다
            </p>
            <div className="mb-4 grid grid-cols-2 gap-2 text-sm text-zinc-600 dark:text-zinc-300 sm:grid-cols-3">
              <p>단어장 {data.decks.length}개</p>
              <p>카드 {data.cards.length.toLocaleString()}장</p>
              <p>학습 모듈 {data.units.length}개</p>
              <p>모의고사 기록 {data.examAttempts.length}개</p>
              <p>작문 {data.writingEntries.length}편</p>
              <p>오답 {data.mistakes.filter((m) => !m.resolved).length}개</p>
            </div>

            <label className="mb-1.5 block text-xs text-zinc-600 dark:text-zinc-400">
              계속하려면 <b>초기화</b> 라고 입력하세요
            </label>
            <input
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="초기화"
              className="mb-3 w-full max-w-xs rounded-lg border border-red-300 px-3 py-2 text-sm dark:border-red-800 dark:bg-zinc-800"
            />

            <div className="flex flex-wrap gap-2">
              <button
                disabled={resetConfirmText.trim() !== "초기화"}
                onClick={() => {
                  resetLocalOnly();
                  setResetOpen(false);
                  setResetConfirmText("");
                  setMessage("전체 초기화가 끝났습니다. 보관함에서 단어장과 학습 모듈을 다시 담으세요.");
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                전부 지우고 초기화
              </button>
              <button
                onClick={() => {
                  setResetOpen(false);
                  setResetConfirmText("");
                }}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-700"
              >
                취소
              </button>
              {syncInfo.loggedIn && (
                <button
                  onClick={async () => {
                    const ok = await resetWithServerDelete();
                    if (ok) {
                      setResetOpen(false);
                      setResetConfirmText("");
                      setMessage("이 기기와 서버 데이터를 함께 초기화했습니다.");
                    } else {
                      setMessage("서버 초기화에 실패했습니다. 네트워크/권한을 확인하세요.");
                    }
                  }}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 dark:border-red-800 dark:text-red-400"
                >
                  서버 데이터까지 삭제
                </button>
              )}
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-700"
              >
                <Download className="h-4 w-4" />
                먼저 지금 데이터 백업
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-700">
        <h2 className="mb-2 text-lg font-semibold">동기화 상태</h2>
        <p className="mb-4 text-sm text-zinc-500">
          {syncInfo.enabled
            ? syncInfo.loggedIn
              ? syncInfo.status === "offline"
                ? `오프라인 - 대기 중 ${syncInfo.pendingCount}건`
                : syncInfo.status === "synced"
                  ? `동기화됨 · ${syncInfo.lastSyncedAt ? new Date(syncInfo.lastSyncedAt).toLocaleString() : "방금 전"}`
                  : syncInfo.status === "syncing"
                    ? "동기화 중..."
                    : syncInfo.status === "conflict"
                      ? "동기화 충돌 - 선택 필요"
                      : syncInfo.status === "error"
                        ? `동기화 실패: ${syncInfo.error ?? "알 수 없는 오류"}`
                        : "대기 중"
              : "로그인하면 여러 기기 동기화를 사용할 수 있습니다."
            : "Supabase 환경변수가 없어 동기화가 비활성화되어 있습니다."}
        </p>
      </section>

      <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-700">
        <h2 className="mb-4 text-lg font-semibold">시험 프로필</h2>
        <div className="space-y-4">
          <div className="flex gap-3">
            <button
              onClick={() => patchProfile({ track: "humanities" })}
              className={`rounded-lg px-4 py-2 text-sm ${
                profile.track === "humanities"
                  ? "bg-amber-500 text-white"
                  : "border border-zinc-200 dark:border-zinc-700"
              }`}
            >
              문과 (종합과목)
            </button>
            <button
              onClick={() => patchProfile({ track: "science" })}
              className={`rounded-lg px-4 py-2 text-sm ${
                profile.track === "science"
                  ? "bg-cyan-600 text-white"
                  : "border border-zinc-200 dark:border-zinc-700"
              }`}
            >
              이과 (이과 2과목)
            </button>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            수학 코스
            <select
              value={profile.mathCourse}
              onChange={(e) =>
                patchProfile({ mathCourse: e.target.value as "course1" | "course2" })
              }
              className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <option value="course1">코스1</option>
              <option value="course2">코스2</option>
            </select>
          </label>

          {profile.track === "science" && (
            <div>
              <p className="mb-2 text-sm">이과 과목 (2개 선택)</p>
              <div className="flex flex-wrap gap-2">
                {SCIENCE_SUBJECTS.map((code) => (
                  <label key={code} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={profile.scienceChoices.includes(code)}
                      onChange={() => toggleScience(code)}
                    />
                    {code === "physics" ? "물리" : code === "chemistry" ? "화학" : "생물"}
                  </label>
                ))}
              </div>
            </div>
          )}

          <label className="flex flex-col gap-1 text-sm">
            목표 시험일
            <input
              type="date"
              value={profile.examDate}
              onChange={(e) => patchProfile({ examDate: e.target.value })}
              className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            {["japanese", "japaneseWriting", profile.mathCourse === "course1" ? "math1" : "math2"]
              .concat(profile.track === "humanities" ? ["sogo"] : profile.scienceChoices)
              .map((code) => (
                <label key={code} className="flex flex-col gap-1 text-sm">
                  목표 점수 · {code}
                  <input
                    type="number"
                    value={profile.targetScores[code] ?? 0}
                    onChange={(e) =>
                      patchProfile({
                        targetScores: {
                          ...profile.targetScores,
                          [code]: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </label>
              ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-700">
        <h2 className="mb-4 text-lg font-semibold">학습 설정</h2>
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={data.settings.showReading}
            onChange={(e) => updateSettings({ showReading: e.target.checked })}
          />
          플래시카드에 후리가나(읽기) 표시
        </label>
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={data.settings.autoSpeak ?? false}
            onChange={(e) => updateSettings({ autoSpeak: e.target.checked })}
          />
          카드를 뒤집을 때 발음 자동 재생
        </label>
        <label className="mb-4 flex flex-col gap-1 text-sm">
          <span>
            발음 속도{" "}
            <span className="text-zinc-400">×{(data.settings.speechRate ?? 1).toFixed(1)}</span>
          </span>
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.1}
            value={data.settings.speechRate ?? 1}
            onChange={(e) => updateSettings({ speechRate: parseFloat(e.target.value) })}
            className="w-56 max-w-full"
          />
          <span className="text-xs text-zinc-500">
            딕테이션을 뺀 모든 발음 재생(플래시카드 · S 키)에 적용된다.
          </span>
        </label>
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={data.settings.excludeWeekends}
            onChange={(e) => updateSettings({ excludeWeekends: e.target.checked })}
          />
          플랜 계산 시 주말 제외
        </label>
        <label className="flex flex-col gap-1 text-sm">
          시험 N일 전 완료 버퍼
          <input
            type="number"
            min={0}
            value={data.settings.planBufferDays}
            onChange={(e) =>
              updateSettings({ planBufferDays: parseInt(e.target.value) || 0 })
            }
            className="w-24 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>
      </section>

      <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-700">
        <h2 className="mb-4 text-lg font-semibold">CSV/TSV 대량 입력</h2>
        <p className="mb-2 text-xs text-zinc-500">
          형식: 단어[탭]읽기[탭]뜻[탭]예문 (또는 JLPT_N5 형식: 번호[탭]단어[탭]읽기[탭]뜻)
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            onClick={() => tsvRef.current?.click()}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium dark:border-zinc-700"
          >
            JLPT TSV 파일 불러오기
          </button>
          <input
            ref={tsvRef}
            type="file"
            accept=".tsv,.txt,text/tab-separated-values,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleTsvUpload(f);
            }}
          />
          <button
            onClick={() => setDeckTitle("JLPT N5 단어장")}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium dark:border-zinc-700"
          >
            덱 이름 N5로 설정
          </button>
        </div>
        <select
          value={csvDeckId}
          onChange={(e) => setCsvDeckId(e.target.value)}
          className="mb-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        >
          {data.decks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={5}
          placeholder={"私\tわたし\t나\t私は学生です。"}
          className="mb-2 w-full rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
        {csvPreview.length > 0 && (
          <div className="mb-2 overflow-x-auto text-xs">
            <table className="w-full">
              <thead>
                <tr className="text-left text-zinc-500">
                  <th className="p-1">단어</th>
                  <th className="p-1">읽기</th>
                  <th className="p-1">뜻</th>
                </tr>
              </thead>
              <tbody>
                {csvPreview.map((r, i) => (
                  <tr key={i}>
                    <td className="p-1">{r.front}</td>
                    <td className="p-1">{r.reading}</td>
                    <td className="p-1">{r.back}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mb-2 flex gap-3 text-sm">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              checked={dupMode === "skip"}
              onChange={() => setDupMode("skip")}
            />
            중복 건너뛰기
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              checked={dupMode === "overwrite"}
              onChange={() => setDupMode("overwrite")}
            />
            중복 덮어쓰기
          </label>
        </div>
        <button
          onClick={handleCsvImport}
          disabled={!csvText}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          일괄 등록
        </button>
      </section>

      <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-700">
        <h2 className="mb-4 text-lg font-semibold">새 덱 추가</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            placeholder="덱 이름"
            value={deckTitle}
            onChange={(e) => setDeckTitle(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          <select
            value={deckSubject}
            onChange={(e) => setDeckSubject(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="japanese">일본어</option>
            <option value="toefl">TOEFL</option>
          </select>
          <select
            value={deckType}
            onChange={(e) => setDeckType(e.target.value as typeof deckType)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="vocab">단어</option>
            <option value="grammar">문법</option>
            <option value="kanji">한자</option>
          </select>
          <button
            onClick={() => {
              if (!deckTitle) return;
              addDeck({ subject: deckSubject, title: deckTitle, type: deckType });
              setDeckTitle("");
              setMessage("덱이 추가되었습니다.");
            }}
            className="flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            덱 추가
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-700">
        <h2 className="mb-4 text-lg font-semibold">새 교과목 추가</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            type="text"
            placeholder="과목 이름"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          <input
            type="color"
            value={subjectColor}
            onChange={(e) => setSubjectColor(e.target.value)}
            className="h-10 rounded-lg border border-zinc-200 dark:border-zinc-700"
          />
          <button
            onClick={() => {
              if (!subjectName) return;
              addSubject({ name: subjectName, icon: "book", color: subjectColor });
              setSubjectName("");
              setMessage("과목이 추가되었습니다.");
            }}
            className="flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            과목 추가
          </button>
        </div>
      </section>
    </div>
  );
}
