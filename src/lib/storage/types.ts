import type { AppData } from "../types";

export interface StorageRepository {
  load(): AppData;
  save(data: AppData): void;
  reset(): void;
}
