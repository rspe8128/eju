import type { AppData } from "../types";
import { getSeedData } from "../seed";
import { migrate } from "./migrate";
import { encodeData, decodeData } from "./codec";

const STORAGE_KEY = "eju-study-data";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * 브라우저마다 다른 localStorage 한도.
 *
 *   Chrome/Edge 약 10MB · Firefox 약 10MB · Safari 약 5MB
 *
 * 게다가 문자열은 UTF-16으로 저장되므로 **문자 하나가 2바이트**다.
 * 한글·일본어가 대부분인 이 앱에서는 "문자 수 × 2"를 실제 사용량으로 보면 된다.
 * 가장 빡빡한 Safari를 기준으로 잡아 두고, 넘길 것 같으면 미리 경고한다.
 */
export const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024;

export type StorageUsage = {
  /** JSON 문자 수 */
  chars: number;
  /** UTF-16 기준 바이트 (문자 수 × 2) */
  bytes: number;
  limitBytes: number;
  /** 0~1. 1을 넘으면 저장이 실패할 수 있다. */
  ratio: number;
};

function usageFromChars(chars: number): StorageUsage {
  return {
    chars,
    bytes: chars * 2,
    limitBytes: STORAGE_LIMIT_BYTES,
    ratio: (chars * 2) / STORAGE_LIMIT_BYTES,
  };
}

/** 실제로 저장되는 형태(압축본) 기준으로 잰다. 화면에 보여줄 값이므로 압축 후가 맞다. */
export function measureUsage(data: AppData): StorageUsage {
  return usageFromChars(JSON.stringify(encodeData(data)).length);
}

function isQuotaError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  // 브라우저마다 이름이 다르다. DOMException.code 22/1014도 같이 본다.
  const code = (e as unknown as { code?: number }).code;
  return (
    e.name === "QuotaExceededError" ||
    e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    code === 22 ||
    code === 1014
  );
}

export function loadData(): AppData {
  if (!isBrowser()) return getSeedData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = getSeedData();
      saveData(seed);
      return seed;
    }
    // 압축 해제 → 마이그레이션 순서를 지킬 것.
    // migrate()는 cards 배열이 있다고 가정하므로 반드시 먼저 풀어야 한다.
    const migrated = migrate(decodeData(JSON.parse(raw)));
    saveData(migrated);
    return migrated;
  } catch {
    return getSeedData();
  }
}

/**
 * 저장. **절대 예외를 던지지 않는다.**
 *
 * 예전에는 setItem을 그냥 불렀는데, 용량을 넘기면 여기서 예외가 나고 그게
 * React 상태 갱신 함수 안에서 터져 화면이 통째로 죽었다. 지금은 실패 사유를
 * 문자열로 돌려주고 화면에서 안내만 띄운다. 메모리에 있는 데이터는 그대로
 * 쓸 수 있으므로 학습 자체는 계속된다.
 *
 * @returns 성공하면 null, 실패하면 사용자에게 보여줄 메시지
 */
export function saveData(data: AppData): string | null {
  if (!isBrowser()) return null;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(encodeData(data)));
    return null;
  } catch (e) {
    if (isQuotaError(e)) {
      const usage = measureUsage(data);
      return (
        `저장 공간이 가득 찼습니다 (약 ${(usage.bytes / 1024 / 1024).toFixed(1)}MB). ` +
        `방금까지의 기록이 저장되지 않았습니다. ` +
        `단어장 보관함에서 쓰지 않는 덱을 빼면 공간이 생깁니다.`
      );
    }
    return "저장에 실패했습니다. 브라우저의 시크릿 모드에서는 저장이 안 될 수 있습니다.";
  }
}

export function resetData(): void {
  if (!isBrowser()) return;
  saveData(getSeedData());
}

/** 백업 파일은 사람이 읽을 수 있도록 압축하지 않은 원래 모양으로 내보낸다. */
export function exportData(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

/** 복원 확인 화면에 "무엇으로 덮어쓰는지"를 보여주기 위한 요약 */
export type BackupSummary = {
  schemaVersion: number | null;
  decks: number;
  cards: number;
  mistakes: number;
  examRecords: number;
  writingEntries: number;
  /** 백업 파일에 적힌 마지막 백업 날짜 */
  backedUpAt: string | null;
};

/**
 * 백업 파일을 **저장하지 않고** 훑어본다.
 * 덮어쓰기 전에 숫자를 보여줘야 하므로, importData와 분리해 뒀다.
 * 형식이 다르면 throw 한다.
 */
export function summarizeBackup(json: string): BackupSummary {
  const parsed = decodeData(JSON.parse(json)) as Partial<AppData> | null;
  if (!parsed || !Array.isArray(parsed.decks) || !Array.isArray(parsed.cards)) {
    throw new Error("Invalid data format");
  }
  const len = (v: unknown) => (Array.isArray(v) ? v.length : 0);
  return {
    schemaVersion: typeof parsed.schemaVersion === "number" ? parsed.schemaVersion : null,
    decks: parsed.decks.length,
    cards: parsed.cards.length,
    mistakes: len(parsed.mistakes),
    examRecords: len(parsed.examRecords),
    writingEntries: len(parsed.writingEntries),
    backedUpAt: parsed.settings?.lastBackupAt ?? null,
  };
}

export function importData(json: string): AppData {
  // 압축본으로 저장된 파일을 그대로 가져오는 경우도 받아준다.
  const parsed = decodeData(JSON.parse(json)) as { decks?: unknown; cards?: unknown };
  if (!parsed.decks || !parsed.cards) {
    throw new Error("Invalid data format");
  }
  const migrated = migrate(parsed);
  saveData(migrated);
  return migrated;
}
