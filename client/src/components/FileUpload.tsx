import { useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import { getApiErrorMessage, uploadDocument, type DocumentMeta } from "../services/api";

interface FileUploadProps {
  onUpload: () => void | Promise<unknown>;
  onUploaded?: (doc: DocumentMeta) => void;
}

function formatSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function FileUpload({ onUpload, onUploaded }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  
  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const res = await uploadDocument(file);
      await onUpload();
      onUploaded?.(res.data);
      setFile(null);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Upload failed."));
    } finally {
      setUploading(false);
    }
  };
  
    const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }

  const handleDragLeave = () => {
  setIsDragging(false);
};

const handleDrop = (e: React.DragEvent<HTMLElement>) => {
  e.preventDefault();
  setIsDragging(false);

  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const droppedFile = e.dataTransfer.files[0];
    
    const acceptedExtensions = [".pdf", ".txt", ".md", ".markdown"];
    const fileExtension = "." + droppedFile.name.split(".").pop().toLowerCase();
    const isAcceptedMime = ["application/pdf", "text/plain", "text/markdown"].includes(droppedFile.type);

    if (isAcceptedMime || acceptedExtensions.includes(fileExtension)) {
      setFile(droppedFile);
      setError(""); 
    } else {
      setError("Unsupported file format. Please drop a PDF, TXT, or Markdown file.");
    }
  }
};
  
  return (
    <section className="upload-panel">
      <div className="section-title">
        <h2>Upload Documents</h2>
        <p>Drop your company handbooks, guides, or policies to enable AI-powered Q&A.</p>
      </div>

      <label className={`file-picker ${isDragging ? "dragging" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}>
        <UploadCloud size={22} aria-hidden="true" />
        <strong>Drop your documents here</strong>
        <span>PDF, TXT, or Markdown up to 10MB</span>
        <em>Browse files</em>
        <input
          type="file"
          accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </label>

      {file && (
        <div className="selected-file">
          <span className="doc-icon" aria-hidden="true">
            <FileText size={17} />
          </span>
          <span>
            <strong>{file.name}</strong>
            <small>{formatSize(file.size)}</small>
          </span>
          <button className="icon-button" onClick={() => setFile(null)} title="Remove file" aria-label="Remove file">
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      )}

      <button className="primary-button full-width" onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? "Uploading..." : file ? "Upload 1 file" : "Upload"}
      </button>

      {error && <p className="error-text">{error}</p>}
    </section>
  );
}
