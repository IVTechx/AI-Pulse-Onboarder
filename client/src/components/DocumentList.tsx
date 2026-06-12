import { MessageSquare, FileText, FileType, Loader2, Trash2, TriangleAlert } from "lucide-react";
import { deleteDocument, type DocumentMeta } from "../services/api";

interface DocumentListProps {
  docs: DocumentMeta[];
  selectedId?: string;
  onSelect: (doc: DocumentMeta) => void;
  onChange: () => void;
  compact?: boolean;
}

function formatSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function FileIcon({ type }: { type: string }) {
  return type.includes("markdown") ? <FileType size={19} /> : <FileText size={19} />;
}

export default function DocumentList({ docs, selectedId, onSelect, onChange, compact = false }: DocumentListProps) {
  const handleDelete = async (id: string) => {
    await deleteDocument(id);
    onChange();
  };

  if (compact && !docs.length) {
    return null;
  }

  return (
    <section className={`document-list ${compact ? "compact" : ""}`} aria-label="Uploaded documents">
      {!docs.length && (
        <div className="empty-state">
          <FileText size={32} aria-hidden="true" />
          <h2>No documents yet</h2>
          <p>Upload a company PDF, TXT, or Markdown file to start onboarding chat.</p>
        </div>
      )}

      {!!docs.length && !compact && (
        <div className="list-heading">
          <h3>Your Documents</h3>
          <span>{docs.length} document{docs.length === 1 ? "" : "s"}</span>
        </div>
      )}

      {docs.map((doc) => (
        <article
          className={`doc-row ${selectedId === doc._id ? "selected" : ""}`}
          key={doc._id}
        >
          <button
            className="doc-main"
            onClick={() => onSelect(doc)}
            disabled={doc.status !== "ready"}
            title={doc.status !== "ready" ? doc.error || doc.status : doc.originalName}
          >
            <span className="doc-icon" aria-hidden="true">
              {doc.status === "processing" ? <Loader2 className="spin" size={19} /> : <FileIcon type={doc.type} />}
            </span>
            <span className="doc-copy">
              <strong>{doc.name}</strong>
              <small>
                {formatSize(doc.size)} · {doc.status}
                {doc.chunkCount ? ` · ${doc.chunkCount} chunks` : ""}
              </small>
            </span>
            {doc.status === "error" && <TriangleAlert className="status-error" size={18} aria-label="Upload error" />}
          </button>

          {!compact && (
            <div className="doc-actions">
              <button
                className="icon-button"
                onClick={() => onSelect(doc)}
                disabled={doc.status !== "ready"}
                title="Open chat"
                aria-label={`Open chat for ${doc.name}`}
              >
                <MessageSquare size={16} aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                onClick={() => handleDelete(doc._id)}
                title="Delete document"
                aria-label={`Delete ${doc.name}`}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}
