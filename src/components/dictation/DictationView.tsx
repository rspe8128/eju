"use client";

import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { useStorage } from "@/context/StorageContext";
import { normalizeAnswer } from "@/lib/progress";

/** 브라우저 내장 Web Speech API로 일본어 음성을 재생한다. 별도 API 키·비용 없이 클라이언트에서만 동작. */
function speakJapanese(text: string, rate: number) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = rate;
  const voices = window.speechSynthesis.getVoices();
  const jaVoice = voices.find((v) => v.lang === "ja-JP") ?? voices.find((v) => v.lang.startsWith("ja"));
  if (jaVoice) utterance.voice = jaVoice;
  window.speechSynthesis.speak(utterance);
}

function useSpeechSupport() {
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);
  return supported;
}

export function DictationView() {
  const { data, addDictationEntry, removeDictationEntry } = useStorage();
  const [title, setTitle] = useState("");
  const [answer, setAnswer] = useState("");
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [rate, setRate] = useState(1);
  const speechSupported = useSpeechSupport();

  const entry = data.dictationEntries.find((e) => e.id === practiceId);
  const correct =
    entry && revealed ? normalizeAnswer(input) === normalizeAnswer(entry.answer) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">청해 딕테이션</h1>
        <p className="text-sm text-zinc-500">
          정답 문장을 저장해 두고, 브라우저 음성 합성(Web Speech API)으로 들으며 받아쓰기 연습
        </p>
      </div>

      {practiceId && entry ? (
        <div className="space-y-4 rounded-xl border border-zinc-200 p-6 dark:border-zinc-700">
          <button
            onClick={() => {
              setPracticeId(null);
              setInput("");
              setRevealed(false);
            }}
            className="text-sm text-zinc-500"
          >
            ← 목록
          </button>
          <h2 className="font-semibold">{entry.title}</h2>
          <p className="text-sm text-zinc-500">들은 내용을 입력하세요</p>

          {speechSupported ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
              <button
                onClick={() => speakJapanese(entry.answer, rate)}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-700"
              >
                <Volume2 className="h-4 w-4" />
                재생
              </button>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <span>속도</span>
                {[0.75, 1, 1.25].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRate(r)}
                    className={`rounded-full px-2 py-1 ${
                      rate === r
                        ? "bg-cyan-600 text-white"
                        : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {r}x
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              이 브라우저는 음성 재생(Web Speech API)을 지원하지 않는다. 최신 Chrome·Edge·Safari에서
              이용하거나, 텍스트를 눈으로 가리고 받아쓰기 연습을 하는 방식으로 대체할 수 있다.
            </p>
          )}

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            disabled={revealed}
          />
          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
            >
              정답 확인
            </button>
          ) : (
            <div>
              <p className={`mb-2 text-sm font-medium ${correct ? "text-green-600" : "text-red-500"}`}>
                {correct ? "정답!" : "오답"}
              </p>
              <p className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-800">{entry.answer}</p>
            </div>
          )}
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-700">
            <h2 className="mb-3 font-semibold">새 문장 등록</h2>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목 (예: 강의 메모 1)"
              className="mb-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="정답 문장 (일본어)"
              rows={3}
              className="mb-3 w-full rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
            <button
              onClick={() => {
                if (!title || !answer) return;
                addDictationEntry({ title, answer });
                setTitle("");
                setAnswer("");
              }}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white"
            >
              등록
            </button>
          </section>

          <section>
            <h2 className="mb-3 font-semibold">연습 목록</h2>
            {data.dictationEntries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
                등록된 문장이 없습니다. 위에서 추가하세요.
              </div>
            ) : (
              <div className="space-y-2">
                {data.dictationEntries.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-700"
                  >
                    <button
                      onClick={() => {
                        setPracticeId(e.id);
                        setInput("");
                        setRevealed(false);
                      }}
                      className="text-sm font-medium hover:underline"
                    >
                      {e.title}
                    </button>
                    <div className="flex items-center gap-3">
                      {speechSupported && (
                        <button
                          onClick={() => speakJapanese(e.answer, 1)}
                          className="text-zinc-400 hover:text-cyan-600"
                          aria-label="미리듣기"
                          title="미리듣기"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => removeDictationEntry(e.id)}
                        className="text-xs text-red-500"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
