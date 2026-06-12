import { useState } from "react";
import ReactMarkdown from "react-markdown";
import useSWR from "swr";
import { Bot, SendHorizonal } from "lucide-react";
import {
  chatWithDocument,
  getDocumentChatSession,
  getApiErrorMessage,
  type ChatMessage,
  type DocumentMeta
} from "../services/api";

export default function ChatInterface({ document }: { document: DocumentMeta | null }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { data: session, mutate } = useSWR(
    document ? ["document-chat", document._id] : null,
    async ([, id]) => {
      const res = await getDocumentChatSession(id);
      return res.data;
    }
  );
  const messages = session?.messages || [];

  const sendMessage = async () => {
    if (!input.trim() || !document || loading) return;

    const nextInput = input.trim();
    const userMsg: ChatMessage = { role: "user", content: nextInput };

    mutate(
      {
        ...(session || { title: document.name, documentId: document._id }),
        messages: [...messages, userMsg]
      },
      { revalidate: false }
    );
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await chatWithDocument(document._id, nextInput);
      mutate(res.data.session, { revalidate: false });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "The assistant could not answer."));
    } finally {
      setLoading(false);
    }
  };

  if (!document) {
    return null;
  }

  return (
    <section className="chat-view">
      <div className="topbar">
        <span className="crumb"><FileTitle name={document.name} /> {document.chunkCount || 0} chunks</span>
      </div>

      <div className="messages">
        {!messages.length && (
          <div className="chat-empty">
            <span className="chat-empty-icon"><Bot size={22} /></span>
            <h2>Chat with {document.name}</h2>
            <p>Ask questions grounded in this document.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div className={`message ${m.role}`} key={`${m.role}-${i}`}>
            <strong>{m.role === "user" ? "You" : "AI-Pulse"}</strong>
            <ReactMarkdown>{m.content}</ReactMarkdown>
          </div>
        ))}
        {loading && <div className="message assistant pending">Thinking...</div>}
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="composer">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          placeholder="Ask about this document..."
        />

        <button className="icon-button send-button" onClick={sendMessage} disabled={loading || !input.trim()}>
          <SendHorizonal size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function FileTitle({ name }: { name: string }) {
  return <><span className="crumb-file">{name}</span></>;
}
