import express from "express";
import rateLimit from "express-rate-limit";
import Document from "../models/Document.js";
import ChatSession from "../models/ChatSession.js";
import { streamGeminiResponse } from "../utils/gemini.js";
import { formatChunkContext, retrieveRelevantChunks } from "../utils/retrieval.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a minute and try again." }
});

const MAX_MESSAGE_LENGTH = 2000;

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
  const queryFilter = type === "general" ? { type: "general" } : { documentId };
  let session = await ChatSession.findOne(queryFilter);

  if (!session) {
    session = await ChatSession.createOrFind({
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
    if (!UUID_RE.test(req.params.id)) {
      return res.status(400).json({ error: "Invalid document ID." });
    }

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

  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: `Message must be at most ${MAX_MESSAGE_LENGTH} characters.` });
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
  const prompt = `<context>\n${formatChunkContext(contextChunks, doc.name)}\n</context>\n\n<question>${message}</question>`;

  const reply = await streamGeminiResponse({ systemInstruction: SYSTEM_PROMPT, prompt }, res);

  const session = await persistMessage({
    documentId: doc._id,
    title: doc.name,
    message,
    reply
  });

  res.write(`data: ${JSON.stringify({ type: "done", session })}\n\n`);
  res.end();
}

router.post("/", chatLimiter, async (req, res) => {
  try {
    await handleDocumentChat(req, res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", error: err.message })}\n\n`);
      res.end();
    }
  }
});

router.post("/document/:id", chatLimiter, async (req, res) => {
  try {
    await handleDocumentChat(req, res, req.params.id);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", error: err.message })}\n\n`);
      res.end();
    }
  }
});

router.post("/general", chatLimiter, async (req, res) => {
  try {
    const message = normalizeMessage(req);

    if (!message) {
      return res.status(400).json({ error: "A message is required." });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Message must be at most ${MAX_MESSAGE_LENGTH} characters.` });
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

    const prompt = `<context>\n${formatChunkContext(contextChunks)}\n</context>\n\n<question>${message}</question>`;

    const reply = await streamGeminiResponse({ systemInstruction: SYSTEM_PROMPT, prompt }, res);

    const session = await persistMessage({
      type: "general",
      title: "All Documents Chat",
      message,
      reply
    });

    res.write(`data: ${JSON.stringify({ type: "done", session })}\n\n`);
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", error: err.message })}\n\n`);
      res.end();
    }
  }
});

export default router;
