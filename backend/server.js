import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/db.js";
import progressRoutes from "./routes/progress.js";
import usersRoutes from "./routes/users.js";
import tasksRoutes from "./routes/tasks.js";
import userTaskProgressRoutes from "./routes/userTaskProgress.js";
import theoryRoutes from "./routes/theory.js"; // <- добавить
import codeRoutes from "./routes/code.js"; // если есть
import aiRoutes from "./routes/ai.js"; // если есть
import adminRoutes from "./routes/admin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();

app.use(cors());
app.use(express.json());

// ROUTES
app.use("/api/users", usersRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/user-task", userTaskProgressRoutes);
app.use("/api/theory", theoryRoutes); // <- добавить
app.use("/api/code", codeRoutes); // если есть
app.use("/api/ai", aiRoutes); // если есть
app.use("/api/admin", adminRoutes);

// TEST
app.get("/", (req, res) => {
  res.send("API работает 🚀");
});

const PORT = Number(process.env.PORT) || 5001;

async function startServer() {
  try {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();