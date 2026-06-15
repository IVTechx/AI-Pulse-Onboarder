import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import documentRoutes from "./routes/documents.js";
import chatRoutes from "./routes/chat.js";
import { initDb, pool } from "./db.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || "http://localhost:5173"
}));
app.use(express.json());

app.use("/api/documents", documentRoutes);
app.use("/api/chat", chatRoutes);

app.get("/", (_req, res) => {
  res.send("AI-Pulse Backend Running");
});

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await initDb();
    console.log("PostgreSQL connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

start();

process.on("SIGTERM", async () => {
  try {
    await pool.end();
  } catch (err) {
    console.error("Error during pool shutdown:", err.message);
  } finally {
    process.exit(0);
  }
});
