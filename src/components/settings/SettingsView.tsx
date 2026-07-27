"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useStorage } from "@/context/StorageContext";
import type { ExamProfile, ScienceChoice } from "@/lib/types";
import { SCIENCE_SUBJECTS } from "@/lib/eju";

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
  } = useStorage();
  const [message, setMessage] = useState("");
  const tsvRef = useRef<HTMLInputElement>(null);

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
        <h2 className="mb-2 text-lg font-semibold">데이터 요약</h2>
        <div className="grid grid-cols-2 gap-2 text-sm text-zinc-500 sm:grid-cols-4">
          <p>버전: v{data.schemaVersion}</p>
          <p>카드: {data.cards.length}</p>
          <p>오답: {data.mistakes.filter((m) => !m.resolved).length}</p>
          <p>덱: {data.decks.length}</p>
        </div>
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
