# EJU Study

일본유학시험(EJU) 준비용 개인 학습 웹앱입니다.
로컬(localStorage) + 서버 SQLite(`data/eju.db`)에 진행도를 저장할 수 있습니다.

## 실행

```bash
npm install
npm run dev
```

`http://localhost:3000` 에서 확인합니다.

## 진행도 저장 (SQLite)

1. 설정 → **진행도 클라우드 저장** → **클라우드 저장 켜기**
2. 발급된 `eju-…` 동기화 키를 메모해 두세요.
3. 다른 기기/브라우저에서는 같은 키로 **키로 연결**하면 진행도를 이어갑니다.
4. 학습할 때마다 약 1초 후 서버 DB에 자동 저장됩니다.

DB 파일 경로: `data/eju.db` (또는 환경변수 `EJU_DB_PATH`)

## 주요 기능

- **EJU 가이드** (`/guide`): EJU가 뭔지, 문과/이과별 응시 과목, 제출 서류, 영어(TOEFL·IELTS) 요구사항
- **오늘의 학습** (`/study/today`): 오늘 볼 카드만 모아 학습
- **일본어 / 과목 용어 / 토플**: 플래시카드 + 퀴즈 (SM-2)
- **토플** (`/study/toefl`): 아카데믹 단어 259 + Writing/Speaking 표현 40 (EJU 과목 아님 · 대학 영어용)
- **학습 플랜 / 모의고사 / 약점 분석 / 성적 / 작문 / 딕테이션**

## 수록 콘텐츠 (시드)

| 덱 | 개수 |
|---|---|
| TOEFL 아카데믹 단어 | 259 |
| TOEFL 작문·스피킹 표현 | 40 |
| JLPT N5 / N4 단어 | 574 / 868 |
| JLPT N5 한자 | 775 |
| 기타 EJU·용어 덱 | README 이전 버전 참고 |

## 기술 스택

Next.js 16 · TypeScript · Tailwind CSS v4 · sql.js (SQLite) · lucide-react · recharts

