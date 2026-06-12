import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
});

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

// Chat
export const chatWithDocument = (id: string, message: string) =>
  API.post<{ reply: string; session: ChatSession }>(`/api/chat`, { documentId: id, message });

export const generalChat = (message: string) =>
  API.post<{ reply: string; session: ChatSession }>(`/api/chat/general`, { message });

export const getDocumentChatSession = (id: string) =>
  API.get<ChatSession>(`/api/chat/document/${id}/session`);

export const getGeneralChatSession = () =>
  API.get<ChatSession>(`/api/chat/general/session`);

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined;
    return data?.error || fallback;
  }

  return fallback;
}
