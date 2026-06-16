# AI-Pulse Onboarder

AI-Pulse Onboarder is a document-powered AI chat assistant. Users upload company documents, the server extracts and chunks the text, stores it in PostgreSQL, and Gemini answers questions using the saved document context.

## Features

- Upload PDF, TXT, and Markdown documents.
- Extract text from uploaded files.
- Detect scanned PDFs that need OCR.
- Split extracted text into overlapping chunks using LangChain's RecursiveCharacterTextSplitter.
- Save documents, chunks, and chat history in PostgreSQL.
- Chat with one document at a time.
- Chat across all uploaded documents (Knowledge Base mode).
- Streaming AI responses via Server-Sent Events (SSE).
- Render AI answers with Markdown support.

## Tech Stack

- Frontend: React, TypeScript, Vite, SWR, lucide-react, react-markdown
- Backend: Express, Node.js, PostgreSQL, pg
- AI provider: Gemini API (`@ai-sdk/google`, `ai`)
- Document parsing: pdf-parse
- Text splitting: `@langchain/textsplitters` — RecursiveCharacterTextSplitter

## Chunk Settings

Document text is chunked in `server/utils/processDocument.js` using LangChain's `RecursiveCharacterTextSplitter`.

- Chunk size: `1000` characters
- Chunk overlap: `200` characters

## Environment

Copy the example file and fill in your values:

```bash
cp server/.env.example server/.env
```

`server/.env`:

```env
PORT=5000
DATABASE_URL="postgresql://your_user:your_password@localhost:5432/your_db"
DATABASE_SSL=false
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
ALLOWED_ORIGIN=http://localhost:5173
```

`client/.env` (optional — defaults to `http://localhost:5000`):

```env
VITE_API_URL=http://localhost:5000
```

## Run Locally

### 1. Prerequisites

- Node.js 18+
- PostgreSQL running locally

### 2. Create the database

```sql
CREATE DATABASE ai_pulse;
CREATE USER ai_pulse_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE ai_pulse TO ai_pulse_user;
```

Tables are created automatically on first start — no migration needed.

### 3. Install dependencies

```bash
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 4. Start the app

```bash
npm run dev
```

This starts both the backend and frontend concurrently.

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

> If port 5173 is already in use, Vite will pick the next available port (e.g. 5174). Update `ALLOWED_ORIGIN` in `server/.env` to match, then restart the server.

## API Summary

**Documents**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/documents` | List all documents (metadata only) |
| `GET` | `/api/documents/:id` | Get one document (metadata only) |
| `POST` | `/api/documents` | Upload and process a document |
| `DELETE` | `/api/documents/:id` | Delete document and all related chat sessions |

**Chat** (responses stream via SSE)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Chat with a specific document |
| `POST` | `/api/chat/general` | Chat across all documents |
| `GET` | `/api/chat/document/:id/session` | Load saved session for a document |
| `GET` | `/api/chat/general/session` | Load saved general chat session |

## Notes

- Chat history and documents persist in PostgreSQL. Sessions are restored when reopening a document or the Knowledge Base chat.
- Upload rate limit: 10 requests per minute.
- Chat rate limit: 30 requests per minute.
- No authentication — single-tenant app.
