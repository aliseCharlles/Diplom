import jwt from "jsonwebtoken";
import pool from "../config/db.js";

function getToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return "";
  return auth.slice(7);
}

export function requireAuth(req, res, next) {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ message: "Требуется авторизация" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: "JWT_SECRET не настроен" });
  }

  try {
    const payload = jwt.verify(token, secret);
    req.user = { id: payload.id };
    next();
  } catch {
    return res.status(401).json({ message: "Невалидный токен" });
  }
}

export async function requireAdmin(req, res, next) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Требуется авторизация" });
  }

  try {
    const result = await pool.query(
      "SELECT id, is_admin FROM users WHERE id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Пользователь не найден" });
    }

    if (!result.rows[0].is_admin) {
      return res.status(403).json({ message: "Доступ только для админов" });
    }

    next();
  } catch (error) {
    console.error("[auth] requireAdmin:", error);
    return res.status(500).json({ message: "Ошибка проверки прав" });
  }
}
