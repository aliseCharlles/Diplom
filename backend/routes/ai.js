import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import pool from "../config/db.js";

dotenv.config();

const router = express.Router();

const OLLAMA_BASE = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
let currentModel = process.env.OLLAMA_MODEL || "deepseek-r1:8b";
let settingsBootstrapped = false;

async function ensureAiSettings() {
  if (settingsBootstrapped) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  const fallbackModel = process.env.OLLAMA_MODEL || "deepseek-r1:8b";
  await pool.query(
    `INSERT INTO app_settings(key, value)
     VALUES ('ollama_model', $1)
     ON CONFLICT (key) DO NOTHING`,
    [fallbackModel]
  );
  const row = await pool.query(
    "SELECT value FROM app_settings WHERE key = 'ollama_model' LIMIT 1"
  );
  currentModel = row.rows[0]?.value || fallbackModel;
  settingsBootstrapped = true;
}

const TUTOR_HINT_PROMPT = `Ты — ИИ-тьютор платформы программирования. Помогаешь студенту с практическим заданием.

ПРАВИЛА:
1. Объясняй понятно, задавай наводящие вопросы.
2. НИКОГДА не давай готовый код и полное решение. Только подсказки и направление мысли.
3. Отвечай на русском языке.
4. Будь дружелюбным и поддерживающим.

ЗАДАНИЕ:
{task}

Язык: {language}

КОД СТУДЕНТА:
---
{code}
---
Дай КРАТКУЮ подсказку: на что обратить внимание, возможная ошибка, следующий шаг — без готового решения.`;

const TUTOR_CHECK_PROMPT = `Ты — ИИ-тьютор. Проверяешь код студента по заданию — строго, но по делу.

ПРАВИЛА:
1. Укажи, есть ли логические/синтаксические проблемы относительно задания.
2. НЕ приводи готовое исправленное решение целиком; можно процитировать 1 короткую строку для ориентира.
3. Отвечай на русском.
4. Структурируй ответ: краткий вывод, затем замечания по пунктам.

ЗАДАНИЕ:
{task}

Язык: {language}

КОД:
---
{code}
---`;

const ANALYSIS_JSON_PROMPT = `Ты — ассистент для проверки практических заданий по программированию.
Проанализируй код студента объективно.

Верни ответ ТОЛЬКО в виде JSON (без markdown), формат:
{"verdict":"looks_correct"|"critical_error"|"needs_review","analysis":"текст на русском","issues":[],"recommendations":[]}

ЗАДАНИЕ:
{task}

Язык: {language}

КОД СТУДЕНТА:
---
{code}
---`;

function clip(s, max) {
  if (s == null) return "";
  const t = String(s);
  return t.length <= max ? t : t.slice(0, max) + "\n…";
}

function buildCheckPrompt(mode, { task, language, code }) {
  const ctx = {
    task: clip(task, 2000),
    language: clip(language, 80),
    code: clip(code, 12000),
  };
  if (mode === "hint") {
    return TUTOR_HINT_PROMPT.replace("{task}", ctx.task)
      .replace("{language}", ctx.language)
      .replace("{code}", ctx.code);
  }
  return TUTOR_CHECK_PROMPT.replace("{task}", ctx.task)
    .replace("{language}", ctx.language)
    .replace("{code}", ctx.code);
}

/**
 * @param {string} prompt
 * @param {{ temperature?: number, num_predict?: number }} [opts]
 */
async function generateOllama(prompt, opts = {}) {
  const { temperature = 0.5, num_predict = 1024 } = opts;

  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: currentModel,
      prompt,
      stream: false,
      options: {
        temperature,
        num_predict,
      },
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(
      `Ollama HTTP ${res.status}: ${raw.slice(0, 300)}. Убедитесь, что сервер запущен и модель есть: ollama pull ${currentModel}`
    );
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Ollama: некорректный JSON в ответе");
  }

  const text = data.response;
  if (!text) {
    throw new Error(
      `Ollama: пустой ответ. Проверьте модель: ollama pull ${currentModel}`
    );
  }
  return String(text).trim();
}

router.get("/settings", requireAuth, requireAdmin, async (_req, res) => {
  try {
    await ensureAiSettings();
    res.json({
      ollama_url: OLLAMA_BASE,
      model: currentModel,
    });
  } catch (error) {
    console.error("[ai] load settings:", error);
    res.status(500).json({ message: "Не удалось загрузить настройки ИИ" });
  }
});

router.patch("/settings/model", requireAuth, requireAdmin, async (req, res) => {
  const nextModel = String(req.body?.model || "").trim();
  if (!nextModel) {
    return res.status(400).json({ message: "Передайте непустое поле model" });
  }
  try {
    await ensureAiSettings();
    await pool.query(
      `UPDATE app_settings
       SET value = $1, updated_at = NOW()
       WHERE key = 'ollama_model'`,
      [nextModel]
    );
    currentModel = nextModel;
    res.json({
      message: "Модель обновлена",
      model: currentModel,
    });
  } catch (error) {
    console.error("[ai] update model:", error);
    res.status(500).json({ message: "Не удалось обновить модель ИИ" });
  }
});

/** Подсказка или текстовая проверка кода */
router.post("/check", async (req, res) => {
  const { code, language, task, mode } = req.body;

  if (code == null || String(code).trim() === "") {
    return res.status(400).json({ error: "Передайте поле code" });
  }

  const prompt = buildCheckPrompt(mode, {
    task: task || "Практическое задание",
    language: language || "не указан",
    code,
  });

  const temperature = mode === "hint" ? 0.7 : 0.45;
  const num_predict = mode === "hint" ? 800 : 1200;

  try {
    await ensureAiSettings();
    const text = await generateOllama(prompt, { temperature, num_predict });
    res.json({ result: text, provider: "ollama" });
  } catch (error) {
    console.error("[ai] /check:", error);
    res.status(503).json({ error: error.message || "Ollama недоступна" });
  }
});

/** Структурированный JSON-разбор */
router.post("/analyze", async (req, res) => {
  const { code, language, task } = req.body;

  if (code == null || String(code).trim() === "") {
    return res.status(400).json({ error: "Передайте поле code" });
  }

  const prompt =
    ANALYSIS_JSON_PROMPT.replace("{task}", clip(task || "Задание", 2000))
      .replace("{language}", clip(language || "—", 80))
      .replace("{code}", clip(code, 12000)) +
    "\n\nВерни ТОЛЬКО JSON одной строкой, без пояснений и без markdown.";

  try {
    await ensureAiSettings();
    const text = await generateOllama(prompt, { temperature: 0.3, num_predict: 900 });

    let jsonStr = text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.split("```")[1] || jsonStr;
      if (jsonStr.startsWith("json")) jsonStr = jsonStr.slice(4);
    }
    const parsed = JSON.parse(jsonStr);
    res.json(parsed);
  } catch (error) {
    console.error("[ai] /analyze:", error);
    res.status(503).json({
      verdict: "needs_review",
      analysis:
        "ИИ-анализ временно недоступен. Запустите Ollama и проверьте OLLAMA_MODEL в .env.",
      issues: [],
      recommendations: [],
      detail: error.message,
    });
  }
});

export default router;
