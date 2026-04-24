import express from "express";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

const router = express.Router();

function getUserIdFromToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    const payload = jwt.verify(token, secret);
    return payload?.id ?? null;
  } catch {
    return null;
  }
}

router.get("/", async (req, res) => {
  try {
    const raw = req.query.language_id;
    const userId = getUserIdFromToken(req);

    const params = [];
    let langClause = "TRUE";
    if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
      const s = String(raw).trim();
      params.push(s);
      langClause = `(
        LOWER(TRIM(lang.name)) = LOWER(TRIM($${params.length}::text))
        OR lang.id::text = $${params.length}
        OR m.language_id::text = $${params.length}
      )`;
    }

    const userParam = userId != null ? userId : -1;
    const userIdx = params.push(userParam);

    const sql = `
      SELECT
        t.*,
        EXISTS (
          SELECT 1 FROM user_task_progress utp
          WHERE utp.task_id = t.id
            AND utp.user_id = $${userIdx}
            AND utp.status = 'completed'
        ) AS completed
      FROM tasks t
      JOIN lessons l ON t.lesson_id = l.id
      JOIN modules m ON l.module_id = m.id
      JOIN languages lang ON m.language_id = lang.id
      WHERE ${langClause}
      ORDER BY l.id ASC, t.task_order ASC NULLS LAST, t.id ASC
    `;

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;