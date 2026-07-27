/**
 * 시험 타이머용 시간 표기.
 *
 * 예전에는 여기에 "실전 시간표 타이머"(MOCK_PLANS)가 들어 있었지만,
 * 이제 타이머는 모의고사 세션(MockSection.minutes)이 직접 들고 있으므로
 * 공용으로 남는 것은 이 포맷 함수뿐이다.
 */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
