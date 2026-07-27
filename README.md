# EJU Study

일본유학시험(EJU) 준비용 개인 학습 웹앱입니다.

- 로컬: `localStorage` + SQLite(`data/eju.db`)
- 배포: 진행도 클라우드 저장 (GitHub Gist / Turso)

## 라이브

https://eju-nu.vercel.app

## 실행

```bash
npm install
npm run dev
```

## 진행도 저장

1. 설정 → **진행도 클라우드 저장** → **클라우드 저장 켜기**
2. 발급된 `eju-…` 동기화 키를 메모
3. 다른 기기에서는 같은 키로 **키로 연결**

배포 환경에서는 `EJU_PROGRESS_GIST_ID` + `EJU_GITHUB_TOKEN` (또는 Turso)로 영구 저장됩니다.

## 기술 스택

Next.js 16 · TypeScript · Tailwind CSS v4 · sql.js · @libsql/client · Vercel
