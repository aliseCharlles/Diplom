import express from "express";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

console.log("UserTaskProgress - JWT_SECRET:", JWT_SECRET ? "Loaded" : "MISSING!");

function getUserIdFromToken(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    console.log("No Authorization header");
    return null;
  }
  
  const token = authHeader.replace("Bearer ", "");
  console.log("Token received:", token.substring(0, 30) + "...");
  
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    console.log("Token verified! User ID:", payload.id);
    return payload.id;
  } catch (error) {
    console.error("JWT verification failed:", error.message);
    return null;
  }
}

router.post("/complete", async (req, res) => {
  const userId = getUserIdFromToken(req);
  
  if (!userId) {
    return res.status(401).json({ error: "Не авторизован" });
  }

  const { taskId } = req.body;
  if (!taskId) {
    return res.status(400).json({ error: "taskId обязателен" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Проверяем, не выполнено ли уже задание
    const existing = await client.query(
      `SELECT id FROM user_task_progress 
       WHERE user_id = $1 AND task_id = $2 AND status = 'completed'`,
      [userId, taskId]
    );

    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.json({ 
        message: "Задание уже выполнено", 
        alreadyCompleted: true 
      });
    }

    // Получаем XP за задание
    const taskRes = await client.query(
      "SELECT xp FROM tasks WHERE id = $1",
      [taskId]
    );
    
    const taskXp = taskRes.rows[0]?.xp || 10;

    // Записываем прогресс
    await client.query(
      `INSERT INTO user_task_progress (user_id, task_id, status, xp_earned, completed_at)
       VALUES ($1, $2, 'completed', $3, NOW())`,
      [userId, taskId, taskXp]
    );

    // Начисляем опыт (COALESCE: старые строки с experience = NULL иначе дают NULL + xp = NULL)
    await client.query(
      "UPDATE users SET experience = COALESCE(experience, 0) + $1 WHERE id = $2",
      [taskXp, userId]
    );

    const userRes = await client.query(
      "SELECT COALESCE(experience, 0) AS experience, COALESCE(level, 1) AS level FROM users WHERE id = $1",
      [userId]
    );

    if (!userRes.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    let { experience, level } = userRes.rows[0];

    // Проверяем повышение уровня (100 XP = 1 уровень)
    if (experience >= 100) {
      const newLevel = level + Math.floor(experience / 100);
      const remainingXp = experience % 100;
      
      await client.query(
        "UPDATE users SET level = $1, experience = $2 WHERE id = $3",
        [newLevel, remainingXp, userId]
      );
      
      level = newLevel;
      experience = remainingXp;
    }

    await client.query("COMMIT");

    res.json({
      success: true,
      xpEarned: taskXp,
      newExperience: experience,
      newLevel: level,
    });

  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("Rollback failed:", rollbackErr.message);
    }
    console.error("user-task/complete:", error);
    const msg = error.message || String(error);
    if (/permission denied for table/i.test(msg)) {
      return res.status(500).json({
        error:
          "Нет прав на запись в user_task_progress. Выполните GRANT для роли БД приложения (см. backend/sql/grant_user_task_progress.sql).",
        detail: msg,
      });
    }
    res.status(500).json({ error: msg });
  } finally {
    client.release();
  }
});

export default router;