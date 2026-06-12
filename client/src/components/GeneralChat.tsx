import { useState } from "react";
import ReactMarkdown from "react-markdown";
import useSWR from "swr";
import { Bot, SendHorizonal, Sparkles } from "lucide-react";
import { generalChat, getApiErrorMessage, getGeneralChatSession, type ChatMessage } from "../services/api";

export default function GeneralChat({ documentCount }: { documentCount: number }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { data: session, mutate } = useSWR("general-chat-session", async () => {
    const res = await getGeneralChatSession();
    return res.data;
  });
  const messages = session?.messages || [];

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const nextInput = input.trim();
    const userMsg: ChatMessage = { role: "user", content: nextInput };
    mutate(
      {
        ...(session || { type: "general", title: "All Documents Chat" }),
        messages: [...messages, userMsg]
      },
      { revalidate: false }
    );
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await generalChat(nextInput);
      mutate(res.data.session, { revalidate: false });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Knowledge Base chat is not available."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="chat-view">
      <div className="topbar">
        <span className="crumb"><Sparkles size={14} /> All Documents Chat <b>{documentCount} document{documentCount === 1 ? "" : "s"}</b></span>
      </div>

      <div className="messages">
        {!messages.length && (
          <div className="chat-empty">
            <span className="chat-empty-icon"><Bot size={22} /></span>
            <h2>Chat with all your documents</h2>
            <p>Ask questions across all uploaded documents. The AI will search through everything and cross-reference information for you.</p>
            <div className="prompt-grid">
              <button onClick={() => setInput("What documents are available?")}>What documents are available?</button>
              <button onClick={() => setInput("Summarize all documents briefly.")}>Summarize all documents briefly</button>
              <button onClick={() => setInput("What are the key policies across all documents?")}>What are the key policies?</button>
              <button onClick={() => setInput("Are there any conflicting information between documents?")}>Any conflicting information?</button>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div className={`message ${m.role}`} key={`${m.role}-${i}`}>
            <strong>{m.role === "user" ? "You" : "AI-Pulse"}</strong>
            <ReactMarkdown>{m.content}</ReactMarkdown>
          </div>
        ))}
        {loading && <div className="message assistant pending">Searching documents...</div>}
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="composer">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          placeholder="Ask across all documents..."
        />

        <button className="icon-button send-button" onClick={sendMessage} disabled={loading || !input.trim()}>
          <SendHorizonal size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
