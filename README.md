# AI-Pulse Onboarder

AI-Pulse Onboarder is a document-powered AI chat assistant. Users upload company documents, the server extracts and chunks the text, stores it in PostgreSQL, and Gemini answers questions using the saved document context.

## Features

- Upload PDF, TXT, and Markdown documents.
- Extract text from uploaded files.
- Detect scanned PDFs that need OCR.
- Split extracted text into reusable RAG chunks.
- Save documents, chunks, and chat history in PostgreSQL.
- Chat with one document at a time.
- Chat across all uploaded documents.
- Render AI answers with Markdown support.

## Chunk Settings

Document text is chunked in `server/utils/processDocument.js`.

- Chunk size: `1000` characters
- Chunk overlap: `200` characters
- Stored chunk max length: about `1200` characters, because each chunk may include the previous chunk overlap

The upload route calls:

```js
chunkText(text, 1000, 200)
```

## Tech Stack

- Frontend: React, TypeScript, Vite, SWR, lucide-react, react-markdown
- Backend: Express, Node.js, PostgreSQL, pg
- AI provider: Gemini API
- Document parsing: pdf-parse

## Environment

Create `server/.env`:

```env
PORT=5000
DATABASE_URL="postgresql://postgres:password@localhost:5432/ai_pulse"
DATABASE_SSL=false
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

Create `client/.env` if needed:

```env
VITE_API_URL=http://localhost:5000
```

## Run Locally

Install dependencies from the root, client, and server folders if needed:

```bash
npm install
cd server && npm install
cd ../client && npm install
```

Start the app from the root:

```bash
npm run dev
```

Default URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## API Summary

Documents:

- `GET /api/documents`
- `GET /api/documents/:id`
- `POST /api/documents`
- `DELETE /api/documents/:id`

Chat:

- `POST /api/chat`
- `POST /api/chat/general`
- `GET /api/chat/document/:id/session`
- `GET /api/chat/general/session`

## Notes

Chat history and documents remain saved in the database. The frontend loads saved chat sessions when opening All Documents Chat or an individual document chat.
