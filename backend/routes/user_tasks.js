import express from "express";
import pool from "../config/db.js";

const router = express.Router();

router.post("/complete", async (req, res) => {

  const { user_id, task_id } = req.body;

  try {

    await pool.query(
      "INSERT INTO user_tasks_progress (user_id,task_id,status) VALUES ($1,$2,'completed')",
      [user_id, task_id]
    );

    await pool.query(
      "UPDATE users SET experience = experience + 10 WHERE id=$1",
      [user_id]
    );

    const user = await pool.query(
      "SELECT experience,level FROM users WHERE id=$1",
      [user_id]
    );

    if (user.rows[0].experience >= 100) {

      await pool.query(
        "UPDATE users SET level = level + 1, experience = 0 WHERE id=$1",
        [user_id]
      );

    }

    res.json({ message: "Task completed" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }

});

export default router;