import type { AppData } from "@/lib/types";

export type SyncResult = {
  syncKey: string;
  updatedAt: string;
  data?: AppData;
};

export async function fetchProgress(syncKey: string): Promise<SyncResult | null> {
  const res = await fetch(`/api/progress?key=${encodeURIComponent(syncKey)}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "진행도를 불러오지 못했습니다.");
  }
  return res.json();
}

export async function pushProgress(data: AppData, syncKey?: string | null): Promise<SyncResult> {
  const res = await fetch("/api/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(syncKey ? { key: syncKey, data } : { data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "진행도 저장에 실패했습니다.");
  }
  return res.json();
}
