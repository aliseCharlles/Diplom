import express from "express";
import pool from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

console.log("Users route - JWT_SECRET:", JWT_SECRET ? "Loaded" : "MISSING!");

// REGISTER
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    if (!password) {
      return res.status(400).json({ message: "Пароль не получен сервером" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, experience, level, is_admin)
       VALUES ($1,$2,$3,0,1,FALSE) RETURNING id, username, email, is_admin`,
      [username, email, hashed]
    );

    const user = result.rows[0];
    
    const token = jwt.sign(
      { id: user.id, is_admin: user.is_admin },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    console.log("User registered:", user.id, user.username);

    res.json({ 
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_admin: user.is_admin
      }
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ 
      message: "Ошибка регистрации", 
      detail: err.message 
    });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Пользователь не найден" });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({ message: "Неверный пароль" });
    }

    const token = jwt.sign(
      { id: user.id, is_admin: user.is_admin },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    console.log("User logged in:", user.id, user.username);
    console.log("Token generated with secret:", JWT_SECRET.substring(0, 5) + "...");

    res.json({ 
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_admin: user.is_admin
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Ошибка входа" });
  }
});

export default router;