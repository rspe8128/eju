"use client";

import { useEffect, useState } from "react";

/**
 * 온라인 여부.
 *
 * 초기값은 항상 true다. 서버 렌더 결과와 첫 클라이언트 렌더가 어긋나면
 * 하이드레이션 경고가 나므로, 실제 상태는 effect에서 한 번 맞춘다.
 *
 * navigator.onLine은 "랜선이 꽂혀 있는가"에 가깝다 — 연결돼 있어도 실제로는
 * 나가지 못하는 경우가 있으니, 이 값만 믿고 기능을 막지 말고 요청 실패
 * 메시지도 그대로 남겨 둘 것.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setOnline(navigator.onLine);

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}

export const OFFLINE_MESSAGE = "인터넷 연결이 필요합니다. 오프라인에서는 쓸 수 없어요.";
