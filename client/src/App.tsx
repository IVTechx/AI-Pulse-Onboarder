import { useState } from "react";
import { BarChart3, FileText, LayoutDashboard, MessageSquareText } from "lucide-react";
import useDocuments from "./hooks/useDocuments";
import type { DocumentMeta } from "./services/api";
import "./App.css";

import FileUpload from "./components/FileUpload";
import DocumentList from "./components/DocumentList";
import ChatInterface from "./components/ChatInterface";
import GeneralChat from "./components/GeneralChat";

type ActiveView =
  | { type: "dashboard" }
  | { type: "general" }
  | { type: "document"; documentId: string };

export default function App() {
  const { docs, loading, refresh } = useDocuments();
  const [activeView, setActiveView] = useState<ActiveView>({ type: "dashboard" });
  const readyDocs = docs.filter((doc) => doc.status === "ready");
  const currentDoc =
    activeView.type === "document"
      ? docs.find((doc) => doc._id === activeView.documentId) || null
      : null;

  const openDocument = (doc: DocumentMeta) => {
    setActiveView({ type: "document", documentId: doc._id });
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <BarChart3 size={15} />
          </span>
          <span>
            <strong>AI-Pulse</strong>
            <small>Onboarder</small>
          </span>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          <button
            className={activeView.type === "dashboard" ? "active" : ""}
            onClick={() => setActiveView({ type: "dashboard" })}>
            <LayoutDashboard size={15} /> Dashboard
          </button>
          <button
            className={activeView.type === "general" ? "active" : ""}
            onClick={() => setActiveView({ type: "general" })}>
            <MessageSquareText size={15} /> All Documents Chat
          </button>
        </nav>

        <div className="sidebar-documents">
          <p>Documents</p>
          {loading && <span className="muted">Loading...</span>}
          {!readyDocs.length && !loading && (
            <div className="sidebar-empty">
              <FileText size={14} />
              <span>Upload documents to start chatting</span>
            </div>
          )}
          <DocumentList
            docs={readyDocs}
            selectedId={currentDoc?._id}
            onSelect={openDocument}
            onChange={() => refresh()}
            compact
          />
        </div>
      </aside>

      <section className="workspace">
        {activeView.type === "dashboard" && (
          <Dashboard
            docs={docs}
            loading={loading}
            refresh={() => refresh()}
            onUploaded={openDocument}
            onOpenDocument={openDocument}
          />
        )}

        {activeView.type === "general" && <GeneralChat documentCount={readyDocs.length} />}

        {activeView.type === "document" && <ChatInterface document={currentDoc} />}
      </section>
    </main>
  );
}

function Dashboard({
  docs,
  loading,
  refresh,
  onUploaded,
  onOpenDocument,
}: {
  docs: DocumentMeta[];
  loading: boolean;
  refresh: () => void | Promise<unknown>;
  onUploaded: (doc: DocumentMeta) => void;
  onOpenDocument: (doc: DocumentMeta) => void;
}) {
  return (
    <section className="dashboard-view">
      <div className="topbar">
        <span className="crumb">
          <LayoutDashboard size={14} /> Dashboard
        </span>
      </div>

      <div className="dashboard-content">
        <FileUpload onUpload={refresh} onUploaded={onUploaded} />
        {loading && <p className="muted">Loading documents...</p>}
        <DocumentList docs={docs} onSelect={onOpenDocument} onChange={refresh} />
      </div>
    </section>
  );
}
