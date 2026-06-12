import { randomUUID } from "node:crypto";
import { query } from "../db.js";
import { mapChatSession } from "./helpers.js";

async function findOne({ documentId, type }) {
  const result = await query(
    `
      SELECT *
      FROM chat_sessions
      WHERE document_id IS NOT DISTINCT FROM $1
        AND type IS NOT DISTINCT FROM $2
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    [documentId || null, type]
  );

  return result.rows[0] ? mapChatSession(result.rows[0]) : null;
}

async function create({ documentId, type, title, messages = [] }) {
  const id = randomUUID();
  const result = await query(
    `
      INSERT INTO chat_sessions (id, document_id, type, title, messages)
      VALUES ($1, $2, $3, $4, $5::jsonb)
      RETURNING *
    `,
    [
      id,
      documentId || null,
      type,
      title || "New Chat Session",
      JSON.stringify(Array.isArray(messages) ? messages : [messages])
    ]
  );

  return mapChatSession(result.rows[0]);
}

async function appendMessages(id, messages) {
  const messagesArray = Array.isArray(messages) ? messages : [messages];

  const result = await query(
    `
      UPDATE chat_sessions
      SET messages = messages || $2::jsonb,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [id, JSON.stringify(messagesArray)]
  );

  return result.rows[0] ? mapChatSession(result.rows[0]) : null;
}

async function deleteMany({ documentId }) {
  await query(
    `
      DELETE FROM chat_sessions
      WHERE document_id = $1
    `,
    [documentId]
  );
}

export default {
  findOne,
  create,
  appendMessages,
  deleteMany
};
