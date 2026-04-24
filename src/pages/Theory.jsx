import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext.jsx";
import LanguageModal from "../components/LanguageModal.jsx";
import { getStoredStudyLanguage, setStoredStudyLanguage } from "../utils/studyLanguageStorage.js";
import { getVisitStreakDays } from "../utils/streak";
import { getTheoryModules } from "../services/api";
import "../styles/home.css";
import "../styles/theory.css";

function sanitizeModules(data) {
  const rows = Array.isArray(data) ? data : [];
  return rows.map((m) => {
    let lessons = m.lessons;
    if (typeof lessons === "string") {
      try {
        lessons = JSON.parse(lessons);
      } catch {
        lessons = [];
      }
    }
    if (!Array.isArray(lessons)) lessons = [];
    lessons = lessons.filter((l) => l != null && l.id != null);
    return { ...m, lessons };
  });
}

function Theory() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [studyLang, setStudyLang] = useState(() => getStoredStudyLanguage());
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [streakDays, setStreakDays] = useState(1);
  const [modules, setModules] = useState([]);
  const [activeModuleId, setActiveModuleId] = useState("");
  const [openLessonId, setOpenLessonId] = useState("");
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [theoryNotice, setTheoryNotice] = useState("");

  function handleLanguagePicked(lang) {
    const full = setStoredStudyLanguage(lang);
    setStudyLang(full);
    setLangModalOpen(false);
  }

  useEffect(() => {
    loadTheoryModules(studyLang.id, studyLang.name);
  }, [studyLang.id, studyLang.name]);

  async function loadTheoryModules(languageId, languageName) {
    setIsLoading(true);
    setTheoryNotice("");
    try {
      const res = await getTheoryModules(languageId);
      const data = sanitizeModules(res.data);
      setModules(data);
      setActiveModuleId(data[0]?.id || "");
      setOpenLessonId("");
      if (data.length === 0) {
        setTheoryNotice(
          `Для «${languageName}» в базе нет модулей. Проверьте: в таблице languages поле name должно совпадать с языком (например JavaScript), либо передайте id языка как в БД.`
        );
      }
    } catch (error) {
      console.error(error);
      setModules([]);
      setActiveModuleId("");
      setOpenLessonId("");
      const code = error?.code;
      const status = error?.response?.status;
      const serverMsg = error?.response?.data?.error;
      const msg = String(error?.message || "");
      const looksOffline =
        code === "ERR_NETWORK" ||
        code === "ECONNREFUSED" ||
        /network error|failed to fetch|load failed/i.test(msg);
      const hint = looksOffline
        ? "Сервер API не отвечает. В отдельном терминале: npm run server (порт из .env), либо одной командой: npm run dev:full."
        : status
          ? serverMsg || `Ответ сервера: ${status}. Смотрите лог терминала с backend.`
          : msg || "Неизвестная ошибка сети.";
      setTheoryNotice(`Не удалось загрузить теорию. ${hint}`);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!localStorage.getItem("token")) navigate("/");
    setStreakDays(getVisitStreakDays());
  }, [navigate]);

  const activeModule = modules.find((module) => module.id === activeModuleId) || modules[0];
  const lessons = activeModule?.lessons || [];
  const isAdmin = localStorage.getItem("userIsAdmin") === "true";

  return (
    <div className={`home theory-page home--${theme}`}>
      <header className="home-header">
        <div className="home-brand">
          <span className="home-logo-mark" aria-hidden />
          <span className="home-logo-text">itlingo</span>
        </div>
        <nav className="home-nav">
          <Link to="/home" className="home-nav-link">
            Главная
          </Link>
          <Link to="/theory" className="home-nav-link active">
            Теория
          </Link>
          <Link to="/practice" className="home-nav-link">
            Практика
          </Link>
          {isAdmin && (
          <Link to="/admin" className="home-nav-link">Админ</Link>
        )}
          
        </nav>
        <div className="theory-header-actions">
          <button
            type="button"
            className="home-lang-picker"
            onClick={() => setLangModalOpen(true)}
            title="Язык обучения"
          >
            <img src={studyLang.logo} alt="" className="home-lang-picker-icon" />
            <span>{studyLang.name}</span>
          </button>
        </div>
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
          <button
            type="button"
            className="home-btn-logout"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("username");
              navigate("/");
            }}
          >
            Выход
          </button>
        </div>
      </header>

      <main className="theory-main">
        <section className="home-greeting theory-greeting">
          <h1 className="home-greeting-title">Теория</h1>
          <p className="home-greeting-sub">
            {isLoading
              ? "Загружаем модули и уроки..."
              : theoryNotice || "Выбирай модуль слева и открывай нужный урок."}
          </p>
        </section>

        <section className="theory-layout">
          {isSidebarVisible ? (
            <aside className="theory-sidebar home-info-card">
              <div className="theory-sidebar-head">
                <h3>Модули</h3>
                <button
                  type="button"
                  className="theory-sidebar-toggle"
                  onClick={() => setIsSidebarVisible(false)}
                >
                  Скрыть
                </button>
              </div>

              <div className="theory-modules-list">
                {modules.map((module) => (
                  <button
                    key={module.id}
                    type="button"
                    className={`theory-module-btn ${module.id === activeModule?.id ? "active" : ""}`}
                    onClick={() => {
                      setActiveModuleId(module.id);
                      setOpenLessonId("");
                    }}
                  >
                    <span className="theory-module-title">{module.title}</span>
                    <ul className="theory-module-lessons-preview">
                      {(module.lessons || []).slice(0, 5).map((lesson) => (
                        <li key={lesson.id}>* {lesson.title}</li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            </aside>
          ) : (
            <div className="theory-sidebar-head">
              <button
                type="button"
                className="theory-sidebar-tab"
                onClick={() => setIsSidebarVisible(true)}
                aria-label="Показать панель модулей"
                title="Показать модули"
              >
                Модули
              </button>
            </div>
          )}

          <div className="theory-lessons-panel home-info-card">
            <div className="home-info-head">
              <span className="home-info-badge">Уроки</span>
              <h3>{activeModule?.title || "Модуль не выбран"}</h3>
            </div>

            {lessons.length ? (
              <div className="theory-lessons-list">
                {lessons.map((lesson) => {
                  const opened = lesson.id === openLessonId;
                  return (
                    <article
                      key={lesson.id}
                      className={`theory-lesson-card ${opened ? "open" : ""}`}
                      onClick={() => setOpenLessonId(opened ? "" : lesson.id)}
                    >
                      <div className="theory-lesson-title">{lesson.title}</div>
                      {opened ? (
                        <p className="theory-lesson-content">
                          {lesson.content ?? lesson.description ?? ""}
                        </p>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="home-info-text">У выбранного модуля пока нет уроков.</p>
            )}
          </div>
        </section>
      </main>

      <LanguageModal isOpen={langModalOpen} onSelect={handleLanguagePicked} />
    </div>
  );
}

export default Theory;
