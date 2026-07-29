"use client";

import Link from "next/link";

const CONTACT_EMAIL = "marinekorea999@gmail.com";
const EFFECTIVE_DATE = "2026년 7월 29일";

export function TermsView() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold">이용약관</h1>
        <p className="mt-1.5 text-sm text-zinc-500">시행일: {EFFECTIVE_DATE}</p>
      </header>

      <div className="space-y-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <p>
          본 약관은 EJU Study(이하 &quot;서비스&quot;)의 이용 조건과 이용자·운영자의
          권리·의무를 정합니다. 서비스를 이용하면 본 약관에 동의한 것으로
          봅니다.
        </p>

        <Section title="1. 서비스의 성격">
          <p>
            서비스는 EJU·JLPT·TOEFL 등 학습을 돕기 위한 <strong>무료 개인 학습
            도구</strong>입니다. 공식 시험 주관 기관과 무관하며, 시험 합격·점수
            등 결과를 보장하지 않습니다. 모의고사·채점·환산 점수는 연습용
            추정치입니다.
          </p>
        </Section>

        <Section title="2. 이용 자격">
          <p>이 서비스는 만 14세 이상만 이용할 수 있습니다.</p>
          <p className="mt-2">
            Google 계정으로 로그인하여 이용할 수 있으며, 계정 정보의 정확성과
            보안에 대한 책임은 이용자에게 있습니다.
          </p>
        </Section>

        <Section title="3. 이용자의 의무">
          <ul className="list-disc space-y-1 pl-5">
            <li>법령 및 본 약관을 위반하지 않을 것</li>
            <li>타인의 계정을 무단으로 사용하지 않을 것</li>
            <li>서비스·서버에 과도한 부하를 주는 행위를 하지 않을 것</li>
            <li>
              작문 채점·번역 등 AI/외부 API 기능을 악용하거나 불법 콘텐츠를
              전송하지 않을 것
            </li>
            <li>저작권이 있는 자료를 무단으로 게시·배포하지 않을 것</li>
          </ul>
        </Section>

        <Section title="4. 데이터 저장과 동기화">
          <p>
            학습 데이터는 기본적으로 이용자 기기의 브라우저(localStorage)에도
            저장되며, 로그인 시 클라우드(DB)와 동기화될 수 있습니다.{" "}
            <strong>
              로컬 저장이 주된 즉시 저장 수단이고, DB 동기화는 보조 수단
            </strong>
            입니다. 브라우저 데이터 삭제, 기기 변경, 동기화 충돌·오류 등으로
            데이터가 손실될 수 있으며, 운영자는 이에 대해 최대한 노력하되 완전한
            보존을 보장하지는 않습니다. 중요한 기록은 이용자가 백업해 두시기
            바랍니다.
          </p>
        </Section>

        <Section title="5. 제3자 서비스">
          <p>
            로그인(Google), 호스팅(Vercel), 인증·DB(Supabase), 작문 채점(OpenRouter
            경유 AI), 번역(DeepL) 등 외부 서비스를 이용합니다. 해당 서비스의
            장애·정책 변경으로 기능이 제한될 수 있습니다. 개인정보 처리에
            대해서는{" "}
            <Link href="/privacy" className="text-blue-600 underline underline-offset-2 dark:text-blue-400">
              개인정보처리방침
            </Link>
            을 따릅니다.
          </p>
        </Section>

        <Section title="6. 책임의 제한">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              서비스는 &quot;있는 그대로(as is)&quot; 제공되며, 중단 없는 운영이나
              오류 없음을 보증하지 않습니다
            </li>
            <li>
              학습 결과·AI 채점·번역·모의고사 점수에 의존하여 발생한 불이익에
              대해 운영자는 책임지지 않습니다
            </li>
            <li>
              천재지변, 통신 장애, 제3자 서비스 장애 등 운영자가 통제할 수 없는
              사유로 인한 손해에 대해 책임지지 않습니다
            </li>
          </ul>
        </Section>

        <Section title="7. 약관의 변경">
          <p>
            운영자는 필요 시 본 약관을 변경할 수 있으며, 변경 내용은 본 페이지에
            게시합니다. 변경 후에도 서비스를 계속 이용하면 변경된 약관에 동의한
            것으로 봅니다.
          </p>
        </Section>

        <Section title="8. 문의">
          <p>
            약관·서비스 관련 문의:{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-blue-600 underline underline-offset-2 dark:text-blue-400"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>
      </div>

      <p className="text-xs text-zinc-400">
        <Link href="/privacy" className="underline underline-offset-2">
          개인정보처리방침
        </Link>
        도 함께 확인해 주세요.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800/60">
      <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h2>
      {children}
    </section>
  );
}
