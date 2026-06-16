import { randomUUID } from "node:crypto";
import { query } from "../db.js";
import { mapDocument, mapDocumentMetadata } from "./helpers.js";

async function create(data) {
  const id = randomUUID();
  const result = await query(
    `
      INSERT INTO documents (id, name, original_name, type, size, extracted_text, chunks, status, error)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
    [
      id,
      data.name,
      data.originalName,
      data.type,
      data.size,
      data.extractedText || "",
      data.chunks || [],
      data.status || "processing",
      data.error || null
    ]
  );

  return mapDocument(result.rows[0]);
}

async function findAllMetadata() {
  const result = await query(
    `
      SELECT id, name, original_name, type, size, uploaded_at, status, error,
             cardinality(chunks) AS chunk_count
      FROM documents
      ORDER BY uploaded_at DESC
    `
  );

  return result.rows.map(mapDocumentMetadata);
}

async function findReady() {
  const result = await query(
    `
      SELECT id, name, original_name, type, size, chunks, uploaded_at, status, error
      FROM documents
      WHERE status = 'ready'
      ORDER BY uploaded_at DESC
    `
  );

  return result.rows.map(mapDocument);
}

async function findById(id) {
  const result = await query(
    `
      SELECT *
      FROM documents
      WHERE id = $1
    `,
    [id]
  );

  return mapDocument(result.rows[0]);
}

async function findMetadataById(id) {
  const result = await query(
    `
      SELECT id, name, original_name, type, size, uploaded_at, status, error,
             cardinality(chunks) AS chunk_count
      FROM documents
      WHERE id = $1
    `,
    [id]
  );

  return mapDocumentMetadata(result.rows[0]);
}

async function markReady(id, { extractedText, chunks }) {
  const result = await query(
    `
      UPDATE documents
      SET extracted_text = $2,
          chunks = $3,
          status = 'ready',
          error = NULL
      WHERE id = $1
      RETURNING id, name, original_name, type, size, uploaded_at, status, error,
                cardinality(chunks) AS chunk_count
    `,
    [id, extractedText, chunks]
  );

  if (!result.rows[0]) {
    return null;
  }

  return mapDocumentMetadata(result.rows[0]);
}

async function markError(id, error) {
  const result = await query(
    `
      UPDATE documents
      SET status = 'error',
          error = $2
      WHERE id = $1
      RETURNING *
    `,
    [id, error]
  );

  return mapDocument(result.rows[0]);
}

async function deleteById(id) {
  const result = await query(
    `
      DELETE FROM documents
      WHERE id = $1
      RETURNING *
    `,
    [id]
  );

  return mapDocument(result.rows[0]);
}

export default {
  create,
  findAllMetadata,
  findReady,
  findById,
  findMetadataById,
  markReady,
  markError,
  deleteById
};
