import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";

export type ProgressRow = {
  sync_key: string;
  data: string;
  updated_at: string;
};

type DbState = {
  db: SqlJsDatabase;
  path: string;
};

const globalForDb = globalThis as unknown as { __ejuSqlJs?: DbState };

function resolveDbPath() {
  const custom = process.env.EJU_DB_PATH;
  if (custom) return custom;
  // turbopackIgnore: keep NFT scoped to ./data
  return path.join(/* turbopackIgnore: true */ process.cwd(), "data", "eju.db");
}

function persistToDisk(state: DbState) {
  const data = state.db.export();
  fs.mkdirSync(path.dirname(state.path), { recursive: true });
  fs.writeFileSync(state.path, Buffer.from(data));
}

async function openDb(): Promise<DbState> {
  if (globalForDb.__ejuSqlJs) return globalForDb.__ejuSqlJs;

  const wasmDir = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "node_modules",
    "sql.js",
    "dist"
  );
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(wasmDir, file),
  });

  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  let db: SqlJsDatabase;
  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS progress (
      sync_key TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const state = { db, path: dbPath };
  persistToDisk(state);
  globalForDb.__ejuSqlJs = state;
  return state;
}

export function generateSyncKey() {
  return `eju-${randomBytes(8).toString("hex")}`;
}

export async function getProgress(syncKey: string): Promise<ProgressRow | null> {
  const { db } = await openDb();
  const stmt = db.prepare(
    "SELECT sync_key, data, updated_at FROM progress WHERE sync_key = ?"
  );
  stmt.bind([syncKey]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const row = stmt.getAsObject() as ProgressRow;
  stmt.free();
  return row;
}

export async function saveProgress(
  syncKey: string,
  dataJson: string,
  updatedAt = new Date().toISOString()
) {
  const state = await openDb();
  state.db.run(
    `INSERT INTO progress (sync_key, data, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(sync_key) DO UPDATE SET
       data = excluded.data,
       updated_at = excluded.updated_at`,
    [syncKey, dataJson, updatedAt]
  );
  persistToDisk(state);
  return { syncKey, updatedAt };
}

export async function createProgress(dataJson: string) {
  const syncKey = generateSyncKey();
  return saveProgress(syncKey, dataJson);
}
