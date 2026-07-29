"use client";

import Link from "next/link";

const CONTACT_EMAIL = "marinekorea999@gmail.com";
const EFFECTIVE_DATE = "2026년 7월 29일";

export function PrivacyView() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold">개인정보처리방침</h1>
        <p className="mt-1.5 text-sm text-zinc-500">시행일: {EFFECTIVE_DATE}</p>
      </header>

      <div className="space-y-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <p>
          EJU Study(이하 &quot;서비스&quot;)는 이용자의 개인정보를 중요하게 여기며, 관련 법령에
          따라 아래와 같이 개인정보를 처리합니다. 본 방침은 서비스를 이용하는 모든
          이용자에게 적용됩니다.
        </p>

        <Section title="1. 수집하는 개인정보 항목">
          <p>서비스는 다음과 같은 정보를 수집·저장할 수 있습니다.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>계정 정보(Google 로그인)</strong>: 이메일, 이름, 프로필 사진
              (Google OAuth를 통해 Supabase Auth 경유로 제공받습니다)
            </li>
            <li>
              <strong>프로필 정보</strong>: 표시 이름, 아바타 URL, 목표 대학, 목표
              학과, 목표 시험일
            </li>
            <li>
              <strong>학습 기록</strong>: 단어장·카드·오답·성적·작문·딕테이션 등
              학습에 관련된 모든 기록
            </li>
            <li>
              <strong>기기 내 저장</strong>: 로그인하지 않아도 브라우저
              localStorage에 동일한 학습 데이터가 저장될 수 있습니다
            </li>
          </ul>
        </Section>

        <Section title="2. 개인정보의 수집·이용 목적">
          <ul className="list-disc space-y-1 pl-5">
            <li>회원 식별 및 로그인 상태 유지</li>
            <li>여러 기기 간 학습 기록 동기화</li>
            <li>프로필·학습 목표 표시 및 관리</li>
            <li>작문(記述) 답안의 AI 채점</li>
            <li>지문·문항·답안의 번역 제공</li>
            <li>서비스 운영·장애 대응·문의 응대</li>
          </ul>
        </Section>

        <Section title="3. 보유 및 이용 기간">
          <p>
            개인정보는 회원 탈퇴 시까지 보유·이용합니다. 계정 삭제 시 프로필 및
            학습 기록(profiles, study_data)는 함께 삭제됩니다. 관련 법령에 따라
            보관이 필요한 경우에는 해당 기간 동안 보관할 수 있습니다.
          </p>
          <p className="mt-2">
            브라우저 localStorage에 저장된 데이터는 이용자가 직접 삭제하거나
            브라우저 데이터를 지우기 전까지 해당 기기에 남을 수 있습니다.
          </p>
        </Section>

        <Section title="4. 개인정보 처리 위탁">
          <p>
            서비스 운영에 필요한 범위에서 아래 업체에 처리를 위탁합니다. 마케팅
            목적의 제공은 하지 않습니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Google</strong> — 로그인 인증
            </li>
            <li>
              <strong>Supabase</strong> — 인증·데이터베이스 호스팅
            </li>
            <li>
              <strong>Vercel</strong> — 웹사이트 호스팅
            </li>
            <li>
              <strong>OpenRouter</strong>(경유하여 Anthropic Claude 등 AI 모델)
              — 작문(記述) 답안 AI 채점. 이용자가 작성한 일본어 작문 원문이
              채점을 위해 전송됩니다
            </li>
            <li>
              <strong>DeepL</strong> — 지문·문항·답안 번역
            </li>
          </ul>
        </Section>

        <Section title="5. 쿠키의 사용">
          <p>
            서비스는 Supabase Auth의 세션 쿠키만 사용합니다. 광고·추적 목적의
            쿠키는 사용하지 않으며, 별도의 분석 도구·광고 트래커도 운영하지
            않습니다.
          </p>
        </Section>

        <Section title="6. 이용자의 권리">
          <p>이용자는 자신의 개인정보에 대해 다음을 요청할 수 있습니다.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>열람</li>
            <li>정정</li>
            <li>삭제(회원 탈퇴 포함)</li>
          </ul>
          <p className="mt-2">
            프로필 정보는 서비스 내 프로필 화면에서 수정할 수 있습니다. 계정
            삭제·기타 요청은 아래 문의처로 연락해 주세요. (탈퇴 전용 화면이
            아직 없는 경우 설정 또는 문의 메일로 요청하시면 처리합니다.)
          </p>
        </Section>

        <Section title="7. 안전성 확보 조치">
          <ul className="list-disc space-y-1 pl-5">
            <li>HTTPS를 통한 통신 암호화</li>
            <li>인증·DB 접근에 대한 권한 분리(본인 데이터만 접근 가능하도록
              설계)</li>
            <li>서비스 역할 키 등 민감 정보는 서버 환경에만 보관</li>
          </ul>
        </Section>

        <Section title="8. 만 14세 미만 이용 제한">
          <p>이 서비스는 만 14세 이상만 이용할 수 있습니다.</p>
        </Section>

        <Section title="9. 방침의 변경">
          <p>
            본 방침이 변경되는 경우 서비스 내 공지 또는 본 페이지 갱신을 통해
            안내합니다. 중요한 변경이 있을 경우 가능한 한 시행 전에 알리도록
            노력합니다.
          </p>
        </Section>

        <Section title="10. 문의처">
          <p>
            개인정보 관련 문의:{" "}
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
        <Link href="/terms" className="underline underline-offset-2">
          이용약관
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
