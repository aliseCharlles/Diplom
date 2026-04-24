import express from "express";
import pool from "../config/db.js";

const router = express.Router();

// Получение модулей и уроков для языка
// languageId как у фронта: slug ("javascript") совпадает с LOWER(name), или числовой id — см. tasks.js
router.get("/modules", async (req, res) => {
  const raw = req.query.languageId;
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return res.json([]);
  }
  const languageKey = String(raw).trim();

  try {
    const query = `
      SELECT 
        m.id,
        m.title,
        m.module_order,
        json_agg(
          json_build_object(
            'id', l.id,
            'title', l.title,
            'content', COALESCE(NULLIF(TRIM(COALESCE(l.description::text, '')), ''), 'Материал урока в разработке...'),
            'lesson_order', l.lesson_order
          ) ORDER BY l.lesson_order
        ) FILTER (WHERE l.id IS NOT NULL) as lessons
      FROM modules m
      JOIN languages lang ON m.language_id = lang.id
      LEFT JOIN lessons l ON m.id = l.module_id
      WHERE (
        LOWER(TRIM(lang.name)) = LOWER(TRIM($1::text))
        OR lang.id::text = $1::text
        OR m.language_id::text = $1::text
      )
      GROUP BY m.id, m.title, m.module_order
      ORDER BY m.module_order
    `;

    const result = await pool.query(query, [languageKey]);
    
    // Если нет модулей, возвращаем пустой массив
    const modules = result.rows.map(row => ({
      ...row,
      lessons: row.lessons || []
    }));
    
    res.json(modules);
  } catch (error) {
    console.error("Ошибка получения модулей:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Справочник достижений из БД (иконка, условие — для подсветки на клиенте)
router.get("/achievements", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, description, icon, condition_type, condition_value
       FROM achievements
       ORDER BY id`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Ошибка получения достижений:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;