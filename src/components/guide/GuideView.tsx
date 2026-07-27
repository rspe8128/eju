"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BookMarked,
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileText,
  FlaskConical,
  Globe,
  GraduationCap,
  Info,
  Languages,
  ListChecks,
  Sigma,
  Sparkles,
  Timer,
} from "lucide-react";
import { useStorage } from "@/context/StorageContext";
import { cn, daysUntil, formatDate } from "@/lib/utils";
import {
  EJU_STRUCTURE,
  ENGLISH_STRUCTURE,
  ENGLISH_FAQ,
  KEY_RULES,
  TRACK_SUBJECTS,
  TRACK_FAQ,
  GRADE_TIMELINE,
  SUBJECT_GUIDES,
  ROADMAP,
  DOCUMENT_CHECKLIST,
  RELATED_PREP,
  TARGET_UNIVERSITIES,
  OFFICIAL_LINKS,
} from "@/lib/data/guideContent";

const SUBJECT_ICONS: Record<string, typeof Languages> = {
  japanese: Languages,
  math: Sigma,
  sogo: BookMarked,
  science: FlaskConical,
  english: Globe,
};

export function GuideView() {
  const { data } = useStorage();
  const [activeSubject, setActiveSubject] = useState(SUBJECT_GUIDES[0].code);

  const upcoming = [...data.deadlines]
    .filter((d) => daysUntil(d.date) >= 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const urgent = upcoming.filter((d) => daysUntil(d.date) <= 14);
  const activeGuide = SUBJECT_GUIDES.find((g) => g.code === activeSubject) ?? SUBJECT_GUIDES[0];

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold">EJU 가이드</h1>
        <p className="mt-1 text-sm text-zinc-500">
          EJU(日本留学試験)가 뭔지, 무엇을 얼마나 준비해야 하는지 한 곳에 정리했다.
        </p>
      </header>

      {/* 다가오는 마감 경고 */}
      {urgent.length > 0 && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/50 dark:bg-red-900/10">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-red-700 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            임박한 일정
          </h2>
          <div className="space-y-2">
            {urgent.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-sm">
                <span>{d.label}</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  D-{daysUntil(d.date)} · {formatDate(d.date)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* EJU란? */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Info className="h-5 w-5" />
          EJU란?
        </h2>
        <p className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          日本留学試験(EJU)은 외국인 유학생으로서 일본 대학(학부) 등 입학을 희망하는 사람의 일본어력과
          기초학력을 평가하는 시험이다. JASSO(일본학생지원기구)가 문부과학성·외무성·대학 및
          국내외 관계기관의 협력을 받아 실시한다. 대부분의 국공립·사립대학이 학부 지원 시 EJU
          성적을 요구하거나 참고하므로, 유학 준비의 핵심 관문이라고 볼 수 있다.
        </p>
      </section>

      {/* 시험 구조 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">시험 구조 한눈에</h2>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-800/60">
              <tr>
                <th className="px-4 py-2.5 text-left">과목</th>
                <th className="px-4 py-2.5 text-left">시간</th>
                <th className="px-4 py-2.5 text-left">배점</th>
                <th className="px-4 py-2.5 text-left">비고</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {EJU_STRUCTURE.map((row) => (
                <tr key={row.label} className="bg-white dark:bg-zinc-900/40">
                  <td className="px-4 py-3 font-medium">{row.label}</td>
                  <td className="px-4 py-3 text-zinc-500">{row.time}</td>
                  <td className="px-4 py-3 text-zinc-500">{row.score}</td>
                  <td className="px-4 py-3 text-zinc-500">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-2">
          {KEY_RULES.map((rule, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
              <span>{rule}</span>
            </div>
          ))}
        </div>

        <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          참고: 영어 (EJU 과목 아님)
        </p>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-800/60">
              <tr>
                <th className="px-4 py-2.5 text-left">시험</th>
                <th className="px-4 py-2.5 text-left">시간</th>
                <th className="px-4 py-2.5 text-left">점수 구성</th>
                <th className="px-4 py-2.5 text-left">비고</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {ENGLISH_STRUCTURE.map((row) => (
                <tr key={row.label} className="bg-white dark:bg-zinc-900/40">
                  <td className="px-4 py-3 font-medium">{row.label}</td>
                  <td className="px-4 py-3 text-zinc-500">{row.time}</td>
                  <td className="px-4 py-3 text-zinc-500">{row.score}</td>
                  <td className="px-4 py-3 text-zinc-500">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          EJU 시험 자체와는 별개로, 대학이 학부 출원 서류로 요구하는 영어 성적이다. 자세한 내용은
          아래 '과목별로 무엇을 공부해야 하나'의 영어 탭 참고.
        </p>
      </section>

      {/* 계열별 응시 과목 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">문과 · 이과 계열별 응시 과목</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {TRACK_SUBJECTS.map((t) => (
            <div
              key={t.track}
              className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <h3 className="mb-3 font-semibold">{t.label}</h3>
              <ul className="mb-3 space-y-1.5">
                {t.subjects.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-zinc-500">{t.note}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          위는 일반적인 조합이고, 실제 응시 과목은 지망 대학·학부가 모집요강에서 지정한다. 대학마다
          다르므로 반드시 개별 확인할 것.
        </p>

        <div className="mt-4 space-y-3">
          {TRACK_FAQ.map((f, i) => (
            <div
              key={i}
              className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-900/10"
            >
              <p className="mb-1.5 flex items-start gap-2 text-sm font-semibold text-blue-800 dark:text-blue-300">
                <span className="flex-shrink-0">Q.</span>
                <span>{f.q}</span>
              </p>
              <p className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <span className="flex-shrink-0 font-semibold text-zinc-400">A.</span>
                <span>{f.a}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 다가오는 일정 전체 */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Calendar className="h-5 w-5" />
            다가오는 일정
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                <span>{d.label}</span>
                <span className="font-medium text-zinc-500">
                  D-{daysUntil(d.date)}
                </span>
              </div>
            ))}
          </div>
          <Link href="/schedule" className="mt-3 inline-block text-xs text-blue-500 hover:underline">
            일정 페이지에서 관리하기 →
          </Link>
        </section>
      )}

      {/* 고1 → 고3 학년별 타임라인 */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <GraduationCap className="h-5 w-5" />
          고1 → 고3 학년별 타임라인
        </h2>
        <p className="mb-4 text-xs text-zinc-500">
          현재 고1이라면 고3(2028.3~2029.2) 재학 중 EJU를 응시하게 된다. JASSO는 정확한 시험일을
          보통 1년 전에 공식 발표하므로, 아래 날짜는 최근 시행 패턴(1차: 6월 셋째 일요일 · 2차: 11월
          둘째 일요일)에 기반한 추정치다. 발표되는 대로 설정에서 정확한 날짜로 갱신하자.
        </p>
        <ol className="space-y-2">
          {GRADE_TIMELINE.map((g, i) => (
            <li
              key={i}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{g.period}</span>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  {g.label}
                </span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">{g.task}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 과목별 무엇을 공부해야 하나 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">과목별로 무엇을 공부해야 하나</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {SUBJECT_GUIDES.map((g) => {
            const Icon = SUBJECT_ICONS[g.code] ?? Info;
            const isActive = g.code === activeSubject;
            return (
              <button
                key={g.code}
                onClick={() => setActiveSubject(g.code)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border-transparent bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
                )}
              >
                <Icon className="h-4 w-4" />
                {g.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">{activeGuide.label}</h3>
            <span className="text-xs text-zinc-500">
              {activeGuide.time} · {activeGuide.score}
            </span>
          </div>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">{activeGuide.summary}</p>
          <ul className="mb-4 space-y-2">
            {activeGuide.points.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-400" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            <strong>공부법: </strong>
            {activeGuide.studyTip}
          </div>
        </div>

        {activeGuide.code === "english" && (
          <div className="mt-4 space-y-3">
            {ENGLISH_FAQ.map((f, i) => (
              <div
                key={i}
                className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-900/10"
              >
                <p className="mb-1.5 flex items-start gap-2 text-sm font-semibold text-blue-800 dark:text-blue-300">
                  <span className="flex-shrink-0">Q.</span>
                  <span>{f.q}</span>
                </p>
                <p className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                  <span className="flex-shrink-0 font-semibold text-zinc-400">A.</span>
                  <span>{f.a}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 로드맵 */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <ListChecks className="h-5 w-5" />
          준비 로드맵 (역산 예시)
        </h2>
        <ol className="space-y-2">
          {ROADMAP.map((r, i) => (
            <li
              key={i}
              className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-800 sm:flex-row sm:items-center sm:gap-4"
            >
              <span className="w-32 flex-shrink-0 font-semibold text-blue-600 dark:text-blue-400">
                {r.period}
              </span>
              <span className="text-zinc-600 dark:text-zinc-300">{r.task}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* 제출 서류 체크리스트 */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <FileText className="h-5 w-5" />
          대학 출원 제출 서류 체크리스트
        </h2>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-800/60">
              <tr>
                <th className="px-4 py-2.5 text-left">서류</th>
                <th className="px-4 py-2.5 text-left">비고</th>
                <th className="px-4 py-2.5 text-left">시점</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {DOCUMENT_CHECKLIST.map((doc) => (
                <tr key={doc.label} className="bg-white dark:bg-zinc-900/40">
                  <td className="px-4 py-3 font-medium">{doc.label}</td>
                  <td className="px-4 py-3 text-zinc-500">{doc.note}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        doc.when === "출원 시"
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                      )}
                    >
                      {doc.when}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          위는 일반적으로 요구되는 서류 예시다. 대학마다 요구 서류·형식·번역 여부가 다르므로 반드시
          지망 대학의 모집요강(募集要項)을 개별 확인할 것.
        </p>
      </section>

      {/* 지망 대학 */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Building2 className="h-5 w-5" />
          지망 대학 출원 요건
        </h2>
        <p className="mb-4 text-xs text-zinc-500">
          도쿄대·와세다·게이오 3개 대학의 최신 공식 모집요강을 직접 확인해 정리했다. 요강은 매년
          갱신되고 모집 정지·조건 변경도 실제로 일어나므로(아래 게이오 SFC 사례 참고), 출원 학년도가
          가까워지면 반드시 각 대학 공식 링크에서 그 해 요강으로 재확인할 것.
        </p>
        <div className="space-y-4">
          {TARGET_UNIVERSITIES.map((u) => (
            <div
              key={u.id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{u.name}</h3>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300">
                  {u.track}
                </span>
              </div>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    EJU 요구 과목
                  </dt>
                  <dd className="text-zinc-600 dark:text-zinc-300">{u.ejuRequirement}</dd>
                </div>
                <div>
                  <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    영어 성적 요건
                  </dt>
                  <dd className="text-zinc-600 dark:text-zinc-300">{u.englishRequirement}</dd>
                </div>
                <div>
                  <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    2차 전형
                  </dt>
                  <dd className="text-zinc-600 dark:text-zinc-300">{u.secondStage}</dd>
                </div>
                <div>
                  <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    일정
                  </dt>
                  <dd className="text-zinc-600 dark:text-zinc-300">{u.scheduleNote}</dd>
                </div>
                <div>
                  <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    주의사항
                  </dt>
                  <dd>
                    <ul className="space-y-1">
                      {u.cautions.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-zinc-600 dark:text-zinc-300">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              </dl>
              <a
                href={u.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                공식 입시 안내 페이지
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* 같이 준비해야 하는 것 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">EJU 외에 같이 준비해야 하는 것</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {RELATED_PREP.map((r) => (
            <div
              key={r.title}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <p className="mb-1 text-sm font-semibold">{r.title}</p>
              <p className="text-xs text-zinc-500">{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 이 사이트 활용법 */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5" />
          이 사이트 활용법
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <GuideLink href="/study/japanese" label="일본어 문법·어휘" desc="문법 50개 + EJU 독해 아카데믹 어휘 80개" />
          <GuideLink href="/study/terms" label="과목 일본어 용어" desc="수학·종합·이과 전문용어부터 외우기" />
          <GuideLink href="/study/toefl" label="TOEFL 단어" desc="영어 성적이 필요한 대학 지망생용" />
          <GuideLink href="/study/today" label="오늘의 학습" desc="복습 대상 + 신규 카드를 한 세션으로" />
          <GuideLink href="/mock" label="모의고사 타이머" desc="EJU 실전 시간표대로 연습" />
          <GuideLink href="/writing" label="기술(작문) 연습" desc="30분 타이머 + 400~500자 카운터" />
          <GuideLink href="/plan" label="학습 플랜" desc="시험일 기준 하루 할당량 자동 계산" />
          <GuideLink href="/stats" label="약점 분석" desc="정답률 낮은 덱, 자주 틀리는 카드" />
        </div>
      </section>

      {/* 공식 링크 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">공식 자료</h2>
        <div className="space-y-2">
          {OFFICIAL_LINKS.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm hover:border-blue-300 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <span>{l.label}</span>
              <ExternalLink className="h-4 w-4 text-zinc-400" />
            </a>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          기준: JASSO 공식 2026년도 실시요항(가장 최근 공표본). 2026년도부터 이과·종합과목·수학은
          개정 실러버스가 적용되니 옛 교재를 쓸 때 범위 차이를 확인할 것. 이 사이트의 2028년 일정은
          최근 패턴 기반 추정치이며, 실제 2028년도 실시요항이 공표되면(대개 1년 전) 위 링크에서
          확인 후 설정에서 갱신할 것.
        </p>
      </section>
    </div>
  );
}

function GuideLink({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-blue-300 dark:border-zinc-700 dark:bg-zinc-800"
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-900/30">
        <Timer className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-zinc-500">{desc}</p>
      </div>
    </Link>
  );
}
