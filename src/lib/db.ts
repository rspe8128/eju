import { randomBytes } from "crypto";
import type { Client } from "@libsql/client";

export type ProgressRow = {
  sync_key: string;
  data: string;
  updated_at: string;
};

const globalForDb = globalThis as unknown as {
  __ejuLibsql?: Client;
  __ejuSqlJs?: LocalDbState;
};

type LocalDbState = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  path: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SQL: any;
};

function hasTurso() {
  return Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

async function getTursoClient(): Promise<Client> {
  if (globalForDb.__ejuLibsql) return globalForDb.__ejuLibsql;

  const { createClient } = await import("@libsql/client/web");
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  await client.execute(`
    CREATE TABLE IF NOT EXISTS progress (
      sync_key TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  globalForDb.__ejuLibsql = client;
  return client;
}

async function getLocalDb(): Promise<LocalDbState> {
  if (globalForDb.__ejuSqlJs) return globalForDb.__ejuSqlJs;

  const fs = await import("fs");
  const path = await import("path");
  const initSqlJs = (await import("sql.js")).default;

  const wasmDir = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "node_modules",
    "sql.js",
    "dist"
  );
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(wasmDir, file),
  });

  const dbPath =
    process.env.EJU_DB_PATH ??
    path.join(/* turbopackIgnore: true */ process.cwd(), "data", "eju.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = fs.existsSync(dbPath)
    ? new SQL.Database(fs.readFileSync(dbPath))
    : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS progress (
      sync_key TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const state: LocalDbState = { db, path: dbPath, SQL };
  persistLocal(state);
  globalForDb.__ejuSqlJs = state;
  return state;
}

function persistLocal(state: LocalDbState) {
  // dynamic require-style keep for node fs only
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("fs") as typeof import("fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("path") as typeof import("path");
  fs.mkdirSync(path.dirname(state.path), { recursive: true });
  fs.writeFileSync(state.path, Buffer.from(state.db.export()));
}

export function generateSyncKey() {
  return `eju-${randomBytes(8).toString("hex")}`;
}

export function getDbBackend(): "turso" | "local" {
  return hasTurso() ? "turso" : "local";
}

export async function getProgress(syncKey: string): Promise<ProgressRow | null> {
  if (hasTurso()) {
    const client = await getTursoClient();
    const result = await client.execute({
      sql: "SELECT sync_key, data, updated_at FROM progress WHERE sync_key = ?",
      args: [syncKey],
    });
    const row = result.rows[0];
    if (!row) return null;
    return {
      sync_key: String(row.sync_key),
      data: String(row.data),
      updated_at: String(row.updated_at),
    };
  }

  const { db } = await getLocalDb();
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
  if (hasTurso()) {
    const client = await getTursoClient();
    await client.execute({
      sql: `INSERT INTO progress (sync_key, data, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(sync_key) DO UPDATE SET
              data = excluded.data,
              updated_at = excluded.updated_at`,
      args: [syncKey, dataJson, updatedAt],
    });
    return { syncKey, updatedAt };
  }

  const state = await getLocalDb();
  state.db.run(
    `INSERT INTO progress (sync_key, data, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(sync_key) DO UPDATE SET
       data = excluded.data,
       updated_at = excluded.updated_at`,
    [syncKey, dataJson, updatedAt]
  );
  persistLocal(state);
  return { syncKey, updatedAt };
}

export async function createProgress(dataJson: string) {
  const syncKey = generateSyncKey();
  return saveProgress(syncKey, dataJson);
}
