import { PDFParse } from "pdf-parse";

const SUPPORTED_TEXT_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "application/markdown",
  "text/x-markdown"
]);

function normalizeText(text) {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function extractText(file) {
  if (!file) {
    throw new Error("No file uploaded.");
  }

  if (file.mimetype === "application/pdf") {
    const parser = new PDFParse({ data: file.buffer });
    const data = await parser.getText();
    await parser.destroy();
    const text = normalizeText(data.text || "");

    if (!text) {
      const err = new Error("OCR Required: this PDF does not contain selectable text.");
      err.code = "OCR_REQUIRED";
      throw err;
    }

    return text;
  }

  if (SUPPORTED_TEXT_TYPES.has(file.mimetype) || /\.(txt|md|markdown)$/i.test(file.originalname)) {
    const text = normalizeText(file.buffer.toString("utf8"));

    if (!text) {
      throw new Error("The uploaded text document is empty.");
    }

    return text;
  }

  throw new Error("Unsupported file type. Upload a PDF, TXT, or Markdown file.");
}

function splitRecursively(text, size, separators) {
  if (text.length <= size) {
    return [text];
  }

  const [separator, ...rest] = separators;
  if (!separator) {
    return text.match(new RegExp(`.{1,${size}}`, "gs")) || [];
  }

  const pieces = text.split(separator);
  if (pieces.length === 1) {
    return splitRecursively(text, size, rest);
  }

  const chunks = [];
  let current = "";

  for (const piece of pieces) {
    const next = current ? `${current}${separator}${piece}` : piece;

    if (next.length > size) {
      if (current) {
        chunks.push(current);
      }
      if (piece.length > size) {
        chunks.push(...splitRecursively(piece, size, rest));
        current = "";
      } else {
        current = piece;
      }
    } else {
      current = next;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

export function chunkText(text, size = 1000, overlap = 200) {
  const cleanText = normalizeText(text);
  const baseChunks = splitRecursively(cleanText, size, ["\n\n", "\n", ". ", " ", ""]);
  const chunks = [];

  for (const chunk of baseChunks) {
    const previous = chunks[chunks.length - 1];
    const prefix = previous ? previous.slice(-overlap) : "";
    const merged = `${prefix}${prefix ? "\n" : ""}${chunk}`.trim();
    chunks.push(merged.slice(0, size + overlap));
  }

  return chunks.filter(Boolean);
}
