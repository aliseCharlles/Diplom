import express from "express";
import pool from "../config/db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get("/users", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, level, experience, is_admin, created_at
       FROM users
       ORDER BY id ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("[admin] list users:", error);
    res.status(500).json({ message: "Не удалось загрузить пользователей" });
  }
});

router.patch("/users/:id/admin", async (req, res) => {
  const targetId = Number(req.params.id);
  const { is_admin } = req.body;

  if (!Number.isInteger(targetId) || targetId <= 0) {
    return res.status(400).json({ message: "Некорректный id пользователя" });
  }

  if (typeof is_admin !== "boolean") {
    return res.status(400).json({ message: "Поле is_admin должно быть boolean" });
  }

  if (targetId === req.user.id && is_admin === false) {
    return res.status(400).json({ message: "Нельзя снять админку у самого себя" });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET is_admin = $1
       WHERE id = $2
       RETURNING id, username, email, is_admin`,
      [is_admin, targetId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("[admin] update admin role:", error);
    res.status(500).json({ message: "Не удалось обновить роль" });
  }
});

export default router;
