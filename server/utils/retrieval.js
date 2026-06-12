function tokenize(value) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

export function retrieveRelevantChunks(chunks, query, limit = 5) {
  const keywords = tokenize(query);

  if (!keywords.length) {
    return chunks.slice(0, limit);
  }

  return chunks
    .map((chunk) => {
      const text = typeof chunk === "string" ? chunk : chunk.text;
      const haystack = text.toLowerCase();
      const score = keywords.reduce(
        (total, word) => total + (haystack.includes(word) ? 1 : 0),
        0
      );

      return { chunk, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ chunk }) => chunk);
}

export function formatChunkContext(chunks, fallbackName) {
  return chunks
    .map((chunk, index) => {
      if (typeof chunk === "string") {
        return `[${fallbackName} - chunk ${index + 1}]\n${chunk}`;
      }

      return `[${chunk.documentName} - chunk ${chunk.chunkIndex + 1}]\n${chunk.text}`;
    })
    .join("\n\n");
}
