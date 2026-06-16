import { PDFParse } from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

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
    const data = await parser.getText({ pageJoiner: "" });
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

export async function chunkText(text, size = 1000, overlap = 200) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: size,
    chunkOverlap: overlap
  });

  const docs = await splitter.createDocuments([text]);
  return docs.map((doc) => doc.pageContent);
}
