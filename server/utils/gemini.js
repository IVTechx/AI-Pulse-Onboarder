import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, streamText } from "ai";

const DEFAULT_MODEL = "gemini-2.5-flash";

function buildProvider() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY in the server environment.");
  }

  return createGoogleGenerativeAI({ apiKey });
}

function modelId() {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

export async function generateGeminiResponse({ systemInstruction, prompt }) {
  const google = buildProvider();
  const { text, finishReason } = await generateText({
    model: google(modelId()),
    system: systemInstruction,
    prompt
  });

  if (!text) {
    throw new Error(`Gemini returned an empty response (finishReason: ${finishReason}).`);
  }

  return text;
}

/**
 * Streams AI tokens to `res` as SSE. Resolves with the full accumulated text.
 * Caller is responsible for writing the final `[DONE]` or `session` event and
 * calling res.end() after this promise resolves.
 */
export async function streamGeminiResponse({ systemInstruction, prompt }, res) {
  const google = buildProvider();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const result = streamText({
    model: google(modelId()),
    system: systemInstruction,
    prompt
  });

  let fullText = "";

  for await (const delta of result.textStream) {
    fullText += delta;
    res.write(`data: ${JSON.stringify({ type: "delta", content: delta })}\n\n`);
  }

  if (!fullText) {
    throw new Error("Gemini returned an empty streaming response.");
  }

  return fullText;
}
