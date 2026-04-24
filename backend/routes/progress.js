import express from "express";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

const router = express.Router();

// Функция для извлечения ID пользователя из токена
function getUserIdFromToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "SECRET_KEY");
    return payload?.id ?? null;
  } catch {
    return null;
  }
}

// Функция подсчета статистики для конкретного языка
async function getTaskStats({ userId, languageId }) {
  // Считаем общее кол-во задач для этого языка через цепочку связей: tasks -> lessons -> modules -> languages
  const totalRes = await pool.query(
    `SELECT COUNT(t.id)::int AS total 
     FROM tasks t
     JOIN lessons les ON t.lesson_id = les.id
     JOIN modules m ON les.module_id = m.id
     WHERE m.language_id = $1`,
    [languageId]
  );
  const total = totalRes.rows[0]?.total || 0;

  if (!userId || total === 0) return { total, completed: 0 };

  const completedRes = await pool.query(
    `SELECT COUNT(DISTINCT utp.task_id)::int AS completed
     FROM user_task_progress utp
     JOIN tasks t ON utp.task_id = t.id
     JOIN lessons les ON t.lesson_id = les.id
     JOIN modules m ON les.module_id = m.id
     WHERE utp.user_id = $1 AND m.language_id = $2 AND utp.status = 'completed'`,
    [userId, languageId]
  );

  return { total, completed: completedRes.rows[0]?.completed || 0 };
}

// Тот самый роут /overview
router.get("/overview", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    const languagesRes = await pool.query("SELECT id, name FROM languages ORDER BY id");
    const languages = languagesRes.rows;

    let userProgress = null;
    if (userId) {
      const u = await pool.query(
        `SELECT COALESCE(experience, 0) AS experience, COALESCE(level, 1) AS level
         FROM users WHERE id = $1`,
        [userId]
      );
      if (u.rows[0]) {
        const { experience, level } = u.rows[0];
        const totalXp = (Number(level) - 1) * 100 + Number(experience);
        userProgress = { experience, level, totalXp };
      }
    }

    const progressData = [];
    for (const lang of languages) {
      const stats = await getTaskStats({ userId, languageId: lang.id });
      const percent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

      progressData.push({
        id: lang.id,
        name: lang.name,
        totalTasks: stats.total,
        completedTasks: stats.completed,
        percent: percent
      });
    }

    res.json({ languages: progressData, userProgress });
  } catch (error) {
    console.error("Progress error:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;