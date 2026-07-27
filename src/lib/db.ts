import { randomBytes } from "crypto";
import type { Client } from "@libsql/client";

export type ProgressRow = {
  sync_key: string;
  data: string;
  updated_at: string;
};

export type DbBackend = "turso" | "gist" | "local";

const globalForDb = globalThis as unknown as {
  __ejuLibsql?: Client;
  __ejuSqlJs?: LocalDbState;
};

type LocalDbState = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  path: string;
};

function hasTurso() {
  return Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

function hasGist() {
  return Boolean(process.env.EJU_PROGRESS_GIST_ID && process.env.EJU_GITHUB_TOKEN);
}

export function getDbBackend(): DbBackend {
  if (hasTurso()) return "turso";
  if (hasGist()) return "gist";
  return "local";
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

function gistHeaders() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${process.env.EJU_GITHUB_TOKEN}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "eju-study-app",
  };
}

function gistFileName(syncKey: string) {
  const safe = syncKey.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${safe}.json`;
}

async function getProgressFromGist(syncKey: string): Promise<ProgressRow | null> {
  const id = process.env.EJU_PROGRESS_GIST_ID!;
  const res = await fetch(`https://api.github.com/gists/${id}`, {
    headers: gistHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GitHub Gist 조회 실패 (${res.status})`);
  }
  const gist = (await res.json()) as {
    files: Record<string, { content?: string; truncated?: boolean; raw_url?: string }>;
  };
  const file = gist.files[gistFileName(syncKey)];
  if (!file) return null;

  let content = file.content ?? "";
  if (file.truncated && file.raw_url) {
    const raw = await fetch(file.raw_url, { headers: gistHeaders(), cache: "no-store" });
    content = await raw.text();
  }
  if (!content) return null;

  const parsed = JSON.parse(content) as { data: string; updated_at: string };
  return {
    sync_key: syncKey,
    data: parsed.data,
    updated_at: parsed.updated_at,
  };
}

async function saveProgressToGist(
  syncKey: string,
  dataJson: string,
  updatedAt: string
) {
  const id = process.env.EJU_PROGRESS_GIST_ID!;
  const body = {
    files: {
      [gistFileName(syncKey)]: {
        content: JSON.stringify({ data: dataJson, updated_at: updatedAt }),
      },
    },
  };
  const res = await fetch(`https://api.github.com/gists/${id}`, {
    method: "PATCH",
    headers: { ...gistHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub Gist 저장 실패 (${res.status}): ${text.slice(0, 200)}`);
  }
  return { syncKey, updatedAt };
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

  const state: LocalDbState = { db, path: dbPath };
  persistLocal(state);
  globalForDb.__ejuSqlJs = state;
  return state;
}

async function persistLocal(state: LocalDbState) {
  const fs = await import("fs");
  const path = await import("path");
  fs.mkdirSync(path.dirname(state.path), { recursive: true });
  fs.writeFileSync(state.path, Buffer.from(state.db.export()));
}

export function generateSyncKey() {
  return `eju-${randomBytes(8).toString("hex")}`;
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

  if (hasGist()) {
    return getProgressFromGist(syncKey);
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

  if (hasGist()) {
    return saveProgressToGist(syncKey, dataJson, updatedAt);
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
  await persistLocal(state);
  return { syncKey, updatedAt };
}

export async function createProgress(dataJson: string) {
  const syncKey = generateSyncKey();
  return saveProgress(syncKey, dataJson);
}
