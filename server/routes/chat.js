import express from "express";
import Document from "../models/Document.js";
import ChatSession from "../models/ChatSession.js";
import { generateGeminiResponse } from "../utils/gemini.js";
import { formatChunkContext, retrieveRelevantChunks } from "../utils/retrieval.js";

const router = express.Router();

const SYSTEM_PROMPT = `You are an AI Onboarding Assistant. Use only the provided context to answer. If the answer is not in the context, state that you don't know. Always cite the document name. Format answers in Markdown when it helps clarity.`;

function normalizeMessage(req) {
  const { message, messages } = req.body;

  if (typeof message === "string") {
    return message.trim();
  }

  if (Array.isArray(messages)) {
    const lastUserMessage = [...messages].reverse().find((item) => item.role === "user");
    return typeof lastUserMessage?.content === "string" ? lastUserMessage.content.trim() : "";
  }

  return "";
}

async function persistMessage({ documentId, type, title, message, reply }) {
  const query = type === "general" ? { type: "general" } : { documentId };
  let session = await ChatSession.findOne(query);

  if (!session) {
    session = await ChatSession.create({
      documentId,
      type,
      title,
      messages: []
    });
  }

  return ChatSession.appendMessages(session._id, [
    { role: "user", content: message, createdAt: new Date().toISOString() },
    { role: "assistant", content: reply, createdAt: new Date().toISOString() }
  ]);
}

router.get("/general/session", async (_req, res) => {
  try {
    const session = await ChatSession.findOne({ type: "general" });
    res.json(session || { type: "general", title: "All Documents Chat", messages: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/document/:id/session", async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ error: "Document not found." });
    }

    const session = await ChatSession.findOne({ documentId: req.params.id });
    res.json(session || { documentId: req.params.id, title: doc.name, messages: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function handleDocumentChat(req, res, explicitDocumentId) {
  const documentId = explicitDocumentId || req.body.documentId;
  const message = normalizeMessage(req);

  if (!documentId) {
    return res.status(400).json({ error: "documentId is required." });
  }

  if (!message) {
    return res.status(400).json({ error: "A message is required." });
  }

  const doc = await Document.findById(documentId);

  if (!doc) {
    return res.status(404).json({ error: "Document not found." });
  }

  if (doc.status !== "ready") {
    return res.status(409).json({ error: "Document is not ready for chat yet." });
  }

  const relevantChunks = retrieveRelevantChunks(doc.chunks, message, 5);
  const contextChunks = relevantChunks.length ? relevantChunks : doc.chunks.slice(0, 5);
  const prompt = `Context:\n${formatChunkContext(contextChunks, doc.name)}\n\nQuestion: ${message}`;

  const reply = await generateGeminiResponse({
    systemInstruction: SYSTEM_PROMPT,
    prompt
  });

  const session = await persistMessage({
    documentId: doc._id,
    title: doc.name,
    message,
    reply
  });

  res.json({ reply, session });
}

router.post("/", async (req, res) => {
  try {
    await handleDocumentChat(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Backward-compatible route for the existing UI.
router.post("/document/:id", async (req, res) => {
  try {
    await handleDocumentChat(req, res, req.params.id);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/general", async (req, res) => {
  try {
    const message = normalizeMessage(req);

    if (!message) {
      return res.status(400).json({ error: "A message is required." });
    }

    const docs = await Document.findReady();

    if (!docs.length) {
      return res.status(400).json({ error: "Upload a ready document before using Knowledge Base chat." });
    }

    const allChunks = docs.flatMap((doc) =>
      doc.chunks.map((chunk, chunkIndex) => ({
        documentName: doc.name,
        chunkIndex,
        text: chunk
      }))
    );
    const relevantChunks = retrieveRelevantChunks(allChunks, message, 8);
    const contextChunks = relevantChunks.length
      ? relevantChunks
      : docs.flatMap((doc) =>
          doc.chunks.slice(0, 2).map((chunk, chunkIndex) => ({
            documentName: doc.name,
            chunkIndex,
            text: chunk
          }))
        );

    const reply = await generateGeminiResponse({
      systemInstruction: SYSTEM_PROMPT,
      prompt: `Context:\n${formatChunkContext(contextChunks)}\n\nQuestion: ${message}`
    });

    const session = await persistMessage({
      type: "general",
      title: "All Documents Chat",
      message,
      reply
    });

    res.json({ reply, session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
