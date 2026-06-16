import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const API = axios.create({ baseURL: BASE_URL });

export interface DocumentMeta {
  _id: string;
  name: string;
  originalName: string;
  type: string;
  size: number;
  chunkCount?: number;
  uploadedAt: string;
  status: "processing" | "ready" | "error";
  error?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

export interface ChatSession {
  _id?: string;
  documentId?: string;
  type?: "general";
  title: string;
  messages: ChatMessage[];
  createdAt?: string;
  updatedAt?: string;
}

export interface StreamCallbacks {
  onDelta: (delta: string) => void;
  onDone: (session: ChatSession) => void;
  onError: (message: string) => void;
}

// Documents
export const uploadDocument = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return API.post<DocumentMeta>("/api/documents", formData);
};

export const getDocuments = () => API.get<DocumentMeta[]>("/api/documents");

export const getDocument = (id: string) =>
  API.get<DocumentMeta>(`/api/documents/${id}`);

export const deleteDocument = (id: string) =>
  API.delete(`/api/documents/${id}`);

// Chat sessions (non-streaming reads)
export const getDocumentChatSession = (id: string) =>
  API.get<ChatSession>(`/api/chat/document/${id}/session`);

export const getGeneralChatSession = () =>
  API.get<ChatSession>(`/api/chat/general/session`);

// SSE streaming helpers
async function consumeStream(
  url: string,
  body: Record<string, unknown>,
  callbacks: StreamCallbacks
): Promise<void> {
  const response = await fetch(`${BASE_URL}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => ({})) as { error?: string };
    callbacks.onError(data.error || `Request failed (${response.status})`);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;

      try {
        const payload = JSON.parse(raw) as { type: string; content?: string; session?: ChatSession; error?: string };
        if (payload.type === "delta" && payload.content) {
          callbacks.onDelta(payload.content);
        } else if (payload.type === "done" && payload.session) {
          callbacks.onDone(payload.session);
        } else if (payload.type === "error") {
          callbacks.onError(payload.error || "Streaming error.");
        }
      } catch {
        // Malformed SSE line — skip.
      }
    }
  }
}

export function chatWithDocument(
  id: string,
  message: string,
  callbacks: StreamCallbacks
): Promise<void> {
  return consumeStream("/api/chat", { documentId: id, message }, callbacks);
}

export function generalChat(
  message: string,
  callbacks: StreamCallbacks
): Promise<void> {
  return consumeStream("/api/chat/general", { message }, callbacks);
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined;
    return data?.error || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
