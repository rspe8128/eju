"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/** 사용자가 고르는 값. auto는 화면 폭을 따라간다. */
export type LayoutMode = "auto" | "mobile" | "desktop";
/** 실제로 그려지는 껍데기. */
export type Layout = "mobile" | "desktop";

const STORAGE_KEY = "eju-layout-mode";
const DESKTOP_QUERY = "(min-width: 1024px)";

const LayoutContext = createContext<{
  mode: LayoutMode;
  layout: Layout;
  /** auto일 때 화면 폭이 알려주는 값(설정 화면에서 "현재 자동 → PC" 표시용). */
  autoLayout: Layout;
  setMode: (mode: LayoutMode) => void;
} | null>(null);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<LayoutMode>("auto");
  const [autoLayout, setAutoLayout] = useState<Layout>("desktop");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "mobile" || stored === "desktop" || stored === "auto") {
      setModeState(stored);
    }
    const mql = window.matchMedia(DESKTOP_QUERY);
    const sync = () => setAutoLayout(mql.matches ? "desktop" : "mobile");
    sync();
    // change 이벤트만으로는 놓치는 환경(기기 에뮬레이션 등)이 있어 resize도 같이 본다.
    mql.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    setMounted(true);
    return () => {
      mql.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  const setMode = useCallback((next: LayoutMode) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const layout: Layout = mode === "auto" ? autoLayout : mode;

  /**
   * localStorage를 읽기 전에는 어떤 껍데기를 그릴지 알 수 없다.
   * 서버 HTML과 다른 걸 그리면 깜빡이므로 마운트 전까지는 내용만 통과시킨다.
   */
  if (!mounted) return <>{children}</>;

  return (
    <LayoutContext.Provider value={{ mode, layout, autoLayout, setMode }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) {
    return {
      mode: "auto" as LayoutMode,
      layout: "desktop" as Layout,
      autoLayout: "desktop" as Layout,
      setMode: () => {},
    };
  }
  return ctx;
}
