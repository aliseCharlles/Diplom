import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { executeCode, getTasks, completeTask, aiTutorCheck } from "../services/api";
import CodeEditor from "../components/CodeEditor";
import LanguageModal from "../components/LanguageModal.jsx";
import { getStoredStudyLanguage, setStoredStudyLanguage } from "../utils/studyLanguageStorage.js";
import { getDefaultCodeForLanguageId } from "../utils/defaultCodeByLanguage.js";
import { useTheme } from "../context/ThemeContext.jsx";
import { getVisitStreakDays } from "../utils/streak";
import "../styles/home.css";
import "../styles/practice.css";

function Practice() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [code, setCode] = useState(() => getDefaultCodeForLanguageId(getStoredStudyLanguage().id));
  const [output, setOutput] = useState("");
  const [studyLang, setStudyLang] = useState(() => getStoredStudyLanguage());
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [streakDays, setStreakDays] = useState(1);
  
  const [completingTask, setCompletingTask] = useState(false);

  const username = useMemo(() => localStorage.getItem("username") || "Ученик", []);

  const isAdmin = localStorage.getItem("userIsAdmin") === "true";
  
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await getTasks(studyLang.id);
        setTasks(res.data);
      } catch (err) {
        console.error("Ошибка API:", err);
      }
    };
  
    if (studyLang?.id) {
      fetchTasks();
    }
  }, [studyLang.id]);

  const currentTask = useMemo(
    () => tasks.find((t) => !t.completed) ?? null,
    [tasks]
  );

  useEffect(() => {
    if (!currentTask) return;
    setCode(getDefaultCodeForLanguageId(studyLang.id));
    setOutput("");
  }, [currentTask?.id, studyLang.id]);

  const runCode = async () => {
    setRunLoading(true);
    setOutput("Выполнение...");
  
    try {
      if (studyLang.id === 'javascript' || studyLang.name?.toLowerCase() === 'javascript') {
        let logs = [];
        const customConsole = {
          log: (...args) => {
            logs.push(args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' '));
          },
          error: (...args) => logs.push("Ошибка: " + args.join(' ')),
        };
  
        try {
          const runUserCode = new Function('console', code);
          runUserCode(customConsole);
          
          setOutput(logs.length > 0 ? logs.join('\n') : "(Код выполнен успешно, но вывода нет)");
        } catch (err) {
          setOutput(`Ошибка выполнения:\n${err.message}`);
        }
        
        setRunLoading(false);
        return; 
      }
      const response = await executeCode({
        code,
        language: studyLang.id,
        stdin: "",
      });
  
      const runOut = response.data?.run?.output || "(нет вывода)";
      setOutput(`Вывод (Piston):\n${runOut}`);
  
    } catch (error) {
      setOutput("Ошибка запуска: " + (error?.response?.data?.error || error.message));
    } finally {
      setRunLoading(false);
    }
  };

  const resetCode = () => {
    setCode(getDefaultCodeForLanguageId(studyLang.id));
    setOutput("");
  };

  const handleAIRequest = async (mode) => {
    if (!currentTask) return;
    setAiLoading(true);
    setAiResponse("");
    try {
      const res = await aiTutorCheck({
        code,
        language: studyLang.name,
        task: currentTask.description || currentTask.title,
        mode,
      });
      setAiResponse(res.data.result || res.data.error || "");
    } catch (err) {
      console.error(err);
      setAiResponse(
        err.response?.data?.error || err.message || "Ошибка при обращении к ИИ"
      );
    } finally {
      setAiLoading(false);
    }
  };

  // Новая функция для отметки выполнения задания
  const handleCompleteTask = async () => {
    if (!currentTask) return;
    
    setCompletingTask(true);
    try {
      const res = await completeTask(currentTask.id);

      if (res.data.alreadyCompleted) {
        alert("Вы уже выполнили это задание!");
        const tasksRes = await getTasks(studyLang.id);
        setTasks(tasksRes.data);
        return;
      }

      alert(`🎉 Задание выполнено! +${res.data.xpEarned} XP`);

      if (res.data.newAchievements?.length > 0) {
        res.data.newAchievements.forEach((ach) => {
          alert(`🏆 Получено достижение: ${ach.title}!`);
        });
      }

      if (res.data.newLevel > 1) {
        alert(`⭐ Поздравляем! Вы достигли уровня ${res.data.newLevel}!`);
      }

      const tasksRes = await getTasks(studyLang.id);
      setTasks(tasksRes.data);
      setAiResponse("");
      
    } catch (err) {
      console.error("Ошибка при завершении задания:", err);
      alert(err.response?.data?.error || "Не удалось отметить задание");
    } finally {
      setCompletingTask(false);
    }
  };

  function handleLanguagePicked(lang) {
    const full = setStoredStudyLanguage(lang);
    setStudyLang(full);
    setCode(getDefaultCodeForLanguageId(full.id));
    setOutput("");
    setLangModalOpen(false);
  }

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/");
  };

  return (
    <div className={`home home--${theme} practice practice--${theme}`}>
      <header className="home-header">
        <div className="home-brand">
          <span className="home-logo-mark" aria-hidden />
          <span className="home-logo-text">itlingo</span>
        </div>
        <nav className="home-nav" aria-label="Основное меню">
          <Link to="/home" className="home-nav-link">
            Главная
         </Link>
          <Link to="/theory" className="home-nav-link">
          Теория  
          </Link>
          <Link to="/practice" className="home-nav-link active">
          Практика
          </Link>
          {isAdmin && (
            <Link to="/admin" className="home-nav-link">Админ</Link>
          )}
        </nav>

        <button
          type="button"
          className="home-lang-picker"
          onClick={() => setLangModalOpen(true)}
          title="Сменить язык обучения"
        >
          <img src={studyLang.logo} alt="" className="home-lang-picker-icon" />
          <span className="home-lang-picker-text">{studyLang.name}</span>
        </button>

        <div className="home-header-right">
          <button
            type="button"
            className="home-theme-toggle"
            onClick={toggleTheme}
            title={theme === "light" ? "Тёмная тема" : "Светлая тема"}
            aria-label={theme === "light" ? "Включить тёмную тему" : "Включить светлую тему"}
          >
            <span className="home-theme-toggle-icon" aria-hidden>
              {theme === "light" ? "🌙" : "☀️"}
            </span>
          </button>
          <div className="home-streak" title="Дни активности">
            <span className="home-streak-icon" aria-hidden>
              🔥
            </span>
            <span className="home-streak-num">{streakDays}</span>
            <span className="home-streak-label">дн.</span>
          </div>
          <Link to="/profile" className="home-avatar-link" aria-label="Профиль" title="Профиль">
            👤
          </Link>
          <button type="button" className="home-btn-logout" onClick={logout}>
            Выход
          </button>
        </div>
      </header>

      <section className="home-greeting practice-greeting">
        <h1 className="home-greeting-title">Практика, {username}</h1>
        <p className="home-greeting-sub">
          Закрепим теорию на практике?
        </p>
      </section>

      <section className="home-ai" aria-label="ИИ помощник">
        <div className="home-ai-inner">
          <div className="home-ai-head">
            <span className="home-ai-badge">ИИ</span>
            <h3>Помощник</h3>
          </div>

          <div className="home-ai-actions">
            <button
              className="home-ai-btn"
              onClick={() => handleAIRequest("check")}
              disabled={aiLoading}
            >
              ✔ Проверить код
            </button>
            <button
              className="home-ai-btn secondary"
              onClick={() => handleAIRequest("hint")}
              disabled={aiLoading}
            >
              💡 Подсказка
            </button>
          </div>

          <div className="home-ai-output">
            {aiLoading ? (
              <p>ИИ думает...</p>
            ) : aiResponse ? (
              <pre>{aiResponse}</pre>
            ) : (
              <p className="home-ai-placeholder-text">
                Нажми «Проверить код» или «Подсказка»
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="home-workspace">
        <div className="home-workspace-main">
          <div className="home-editor-head">
            <h2 className="home-editor-title">Редактор</h2>
            <span className="home-editor-lesson">Текущий язык: {studyLang.name}</span>
          </div>

          <CodeEditor
            code={code}
            setCode={setCode}
            language={studyLang.monaco}
            editorTheme={theme === "dark" ? "vs-dark" : "vs"}
          />

          <div className="home-editor-actions">
            <button type="button" className="home-btn-run" onClick={runCode} disabled={runLoading}>
              {runLoading ? "⏳ Выполняем..." : "▶ Запустить код"}
            </button>
            <button type="button" className="home-btn-reset" onClick={resetCode}>
              Сбросить
            </button>
          </div>

          <div className="home-console">
            <div className="home-console-head">Консоль</div>
            <pre className="home-console-out">{output || "Нажми «Запустить код»"}</pre>
          </div>
        </div>
        
        <aside className="home-task-panel">
          <h3 className="home-task-title">Задание</h3>
          {tasks.length > 0 ? (
            currentTask ? (
              <>
                <p className="home-task-name">{currentTask.title}</p>
                <p className="home-task-desc">
                  {currentTask.description || "Выполните задание в редакторе."}
                </p>
                <div className="home-task-meta">
                  <span>Сложность: {currentTask.difficulty}</span>
                  <span>+{currentTask.xp} XP</span>
                </div>
                <button
                  type="button"
                  className="home-btn-complete"
                  onClick={handleCompleteTask}
                  disabled={completingTask}
                  style={{
                    marginTop: "16px",
                    width: "100%",
                    padding: "12px",
                    background: "#6366f1",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: completingTask ? "wait" : "pointer",
                    fontSize: "16px",
                    fontWeight: "500",
                    opacity: completingTask ? 0.7 : 1,
                  }}
                >
                  {completingTask ? "Отправка..." : "Завершить задание"}
                </button>
              </>
            ) : (
              <div className="home-task-empty">
                <p>Все задания по этому языку выполнены.</p>
                <p className="home-task-desc" style={{ marginTop: "8px" }}>
                  Можно сменить язык или повторить теорию.
                </p>щ
              </div>
            )
          ) : (
            <div className="home-task-empty">
              <p>Задач для этого языка пока нет.</p>
              <small style={{opacity: 0.6}}>Проверьте связи lesson_id в БД</small>
            </div>
          )}
        </aside>
      </div>

      <LanguageModal isOpen={langModalOpen} onSelect={handleLanguagePicked} />
    </div>
  );
}

export default Practice;