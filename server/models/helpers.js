export function mapDocument(row) {
  if (!row) {
    return null;
  }

  return {
    _id: row.id,
    name: row.name,
    originalName: row.original_name,
    type: row.type,
    size: row.size,
    extractedText: row.extracted_text,
    chunks: row.chunks || [],
    uploadedAt: row.uploaded_at,
    status: row.status,
    error: row.error || undefined
  };
}

export function mapDocumentMetadata(row) {
  const document = mapDocument(row);

  if (!document) {
    return null;
  }

  document.chunkCount = Number(row.chunk_count ?? document.chunks.length);
  delete document.extractedText;
  delete document.chunks;

  return document;
}

export function mapChatSession(row) {
  if (!row) {
    return null;
  }

  return {
    _id: row.id,
    documentId: row.document_id || undefined,
    type: row.type || undefined,
    title: row.title,
    messages: row.messages || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
