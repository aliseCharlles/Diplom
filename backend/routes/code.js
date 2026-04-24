import express from "express";
import fetch from "node-fetch";

const router = express.Router();

const LANGUAGE_ALIASES = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  cpp: "c++",
  java: "java",
  csharp: "csharp",
  php: "php",
  go: "go",
  rust: "rust",
  swift: "swift",
  kotlin: "kotlin",
  ruby: "ruby",
};

function normalizeLanguage(language) {
  if (!language) return "javascript";
  const key = String(language).trim().toLowerCase();
  return LANGUAGE_ALIASES[key] || key;
}

router.post("/execute", async (req, res) => {
  const { code, language, stdin = "" } = req.body || {};

  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Код обязателен" });
  }

  const normalized = normalizeLanguage(language);

  try {
    const pistonRes = await fetch("https://emkc.org/api/v2/piston/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: normalized,
        version: "*",
        files: [{ name: "main", content: code }],
        stdin: String(stdin),
        compile_timeout: 10000,
        run_timeout: 5000,
        compile_memory_limit: -1,
        run_memory_limit: -1,
      }),
    });

    if (!pistonRes.ok) {
      const text = await pistonRes.text();
      return res.status(502).json({
        error: "Piston API error",
        details: text,
      });
    }

    const data = await pistonRes.json();
    return res.json({
      language: data.language || normalized,
      version: data.version || "*",
      run: data.run || null,
      compile: data.compile || null,
    });
  } catch (error) {
    console.error("Piston execute error:", error);
    return res.status(500).json({ error: "Ошибка выполнения кода" });
  }
});

export default router;
