import type { AppData } from "../types";
import { getSeedData } from "../seed";
import { migrate } from "./migrate";

const STORAGE_KEY = "eju-study-data";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadData(): AppData {
  if (!isBrowser()) return getSeedData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = getSeedData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const migrated = migrate(JSON.parse(raw));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return getSeedData();
  }
}

export function saveData(data: AppData): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetData(): void {
  if (!isBrowser()) return;
  const seed = getSeedData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
}

export function exportData(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function importData(json: string): AppData {
  const parsed = JSON.parse(json);
  if (!parsed.decks || !parsed.cards) {
    throw new Error("Invalid data format");
  }
  const migrated = migrate(parsed);
  saveData(migrated);
  return migrated;
}
