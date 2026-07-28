"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, WifiOff, X } from "lucide-react";
import { useOnline } from "@/lib/useOnline";

/**
 * 서비스워커 등록 + "새 버전" 안내.
 *
 * 개발 중에는 등록하지 않는다. 캐시가 남아 있으면 코드를 고쳐도 반영이 안 돼서
 * 없는 버그를 몇 시간 쫓게 된다. localhost도 같이 걸러 둔다 (프로덕션 빌드를
 * 로컬에서 확인할 때도 캐시에 걸리지 않게).
 */
function shouldRegister(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (process.env.NODE_ENV !== "production") return false;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1";
}

export function ServiceWorkerRegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [offlineNoticeOpen, setOfflineNoticeOpen] = useState(true);
  const online = useOnline();
  // 새로고침은 딱 한 번만. 상태로 두면 갱신 함수 안에서 부수효과가 생긴다.
  const reloaded = useRef(false);

  useEffect(() => {
    if (!shouldRegister()) return;

    let cancelled = false;

    const track = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting) setWaiting(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const next = reg.installing;
        if (!next) return;
        next.addEventListener("statechange", () => {
          // 이미 제어 중인 워커가 있을 때만 "새 버전"이다.
          // 첫 설치에서는 알림을 띄우지 않는다.
          if (next.state === "installed" && navigator.serviceWorker.controller) {
            setWaiting(next);
          }
        });
      });
    };

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (!cancelled) track(reg);
      })
      .catch(() => {
        /* 등록 실패해도 앱은 그대로 동작한다 */
      });

    const onControllerChange = () => {
      // skipWaiting 이후 새 워커가 제어를 넘겨받으면 화면을 새로 그린다
      if (reloaded.current) return;
      reloaded.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  useEffect(() => {
    if (!online) setOfflineNoticeOpen(true);
  }, [online]);

  const applyUpdate = () => {
    if (!waiting) return;
    waiting.postMessage("SKIP_WAITING");
  };

  if (!waiting && (online || !offlineNoticeOpen)) return null;

  return (
    // 모바일에서는 하단 탭(약 3.5rem) 위에 띄운다. 두 배너가 같이 뜨면 세로로 쌓인다.
    <div className="fixed inset-x-3 bottom-20 z-50 mx-auto flex max-w-md flex-col gap-2 lg:bottom-6">
      {waiting && (
        <div className="rounded-xl border border-blue-300 bg-white p-3 shadow-lg dark:border-blue-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-4 w-4 shrink-0 text-blue-500" />
            <p className="min-w-0 flex-1 text-sm">
              새 버전이 있습니다.
              <span className="ml-1 text-zinc-500">새로고침하면 바로 적용됩니다.</span>
            </p>
            <button
              onClick={applyUpdate}
              className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              새로고침
            </button>
            <button
              onClick={() => setWaiting(null)}
              className="shrink-0 rounded-lg p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {!online && offlineNoticeOpen && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 shadow-lg dark:border-amber-800 dark:bg-amber-950">
          <div className="flex items-center gap-3">
            <WifiOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="min-w-0 flex-1 text-sm text-amber-900 dark:text-amber-200">
              오프라인입니다. 단어·문제 풀이는 그대로 되고, 번역과 AI 채점만 잠깁니다.
            </p>
            <button
              onClick={() => setOfflineNoticeOpen(false)}
              className="shrink-0 rounded-lg p-1 text-amber-700/70 hover:text-amber-900 dark:text-amber-400/70 dark:hover:text-amber-200"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
