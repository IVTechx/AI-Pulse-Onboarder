import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function initDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Missing DATABASE_URL in the server environment.");
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY in the server environment.");
  }

  await query(`
    CREATE TABLE IF NOT EXISTS documents (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      type TEXT NOT NULL,
      size INTEGER NOT NULL,
      extracted_text TEXT NOT NULL DEFAULT '',
      chunks TEXT[] NOT NULL DEFAULT '{}',
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
      error TEXT
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id UUID PRIMARY KEY,
      document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
      type TEXT CHECK (type IN ('general')),
      title TEXT NOT NULL,
      messages JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_documents_status_uploaded_at
    ON documents (status, uploaded_at DESC);
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_document_id
    ON chat_sessions (document_id);
  `);

  // Partial unique index used by ChatSession.createOrFind ON CONFLICT inference.
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_sessions_general_singleton
    ON chat_sessions (type)
    WHERE type = 'general';
  `);
}
