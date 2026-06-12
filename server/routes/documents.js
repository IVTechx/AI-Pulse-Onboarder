import express from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import path from "node:path";
import Document from "../models/Document.js";
import ChatSession from "../models/ChatSession.js";
import { extractText, chunkText } from "../utils/processDocument.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many uploads. Please wait a minute and try again." }
});

function documentName(originalName) {
  return path.basename(originalName, path.extname(originalName));
}

async function uploadHandler(req, res) {
  let doc;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    doc = await Document.create({
      name: documentName(req.file.originalname),
      originalName: req.file.originalname,
      type: req.file.mimetype || "application/octet-stream",
      size: req.file.size,
      status: "processing"
    });

    const text = await extractText(req.file);
    const chunks = chunkText(text, 1000, 200);

    const readyDoc = await Document.markReady(doc._id, {
      extractedText: text,
      chunks
    });

    res.status(201).json(readyDoc);
  } catch (err) {
    if (doc) {
      await Document.markError(doc._id, err.message);
    }

    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : err.code === "OCR_REQUIRED" ? 422 : 400;
    res.status(status).json({ error: err.message });
  }
}

// Upload document. The /upload alias keeps the existing client contract working.
router.post("/", uploadLimiter, upload.single("file"), uploadHandler);
router.post("/upload", uploadLimiter, upload.single("file"), uploadHandler);

// Get all documents
router.get("/", async (_req, res) => {
  const docs = await Document.findAllMetadata();
  res.json(docs);
});

// Get one document
router.get("/:id", async (req, res) => {
  const doc = await Document.findMetadataById(req.params.id);

  if (!doc) {
    return res.status(404).json({ error: "Document not found." });
  }

  res.json(doc);
});

router.delete("/:id", async (req, res) => {
  const doc = await Document.deleteById(req.params.id);

  if (!doc) {
    return res.status(404).json({ error: "Document not found." });
  }

  await ChatSession.deleteMany({ documentId: doc._id });

  res.json({ ok: true });
});

export default router;
