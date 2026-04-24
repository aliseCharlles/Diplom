import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getAchievements, getProgressOverview, getTasks } from "../services/api";
import { getVisitStreakDays } from "../utils/streak";
import { useTheme } from "../context/ThemeContext.jsx";
import LanguageModal from "../components/LanguageModal.jsx";
import { getStoredStudyLanguage, setStoredStudyLanguage } from "../utils/studyLanguageStorage.js";
import "../styles/home.css";

function buildCourse(lang) {
  return {
    language: lang.name,
    logo: lang.logo,
    moduleTitle: `Модуль 1: Основы ${lang.name}`,
    lessonTitle: `Урок 1: Введение в ${lang.name}`,
    currentXp: 0,
    maxXp: 4000,
  };
}

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 6 && h < 22) return "Добрый день";
  return "Доброй ночи";
}

/** Сопоставление condition_type из БД с локальной статистикой (регистр не важен) */
function isAchievementUnlocked(achievement, ctx) {
  const tRaw = achievement?.condition_type;
  const raw = achievement?.condition_value;
  if (
    (tRaw == null || String(tRaw).trim() === "") &&
    (raw == null || raw === "")
  ) {
    return true;
  }

  const need = raw === null || raw === undefined || raw === "" ? NaN : Number(raw);
  const t = String(tRaw || "").toLowerCase();

  if (Number.isNaN(need)) return false;

  if (t.includes("streak")) return ctx.streakDays >= need;
  if (t.includes("task") || t.includes("lesson")) return ctx.completedTasks >= need;
  if (t.includes("xp") || t.includes("score")) return ctx.totalXp >= need;
  if (t.includes("progress") || t.includes("percent") || t.includes("module"))
    return ctx.progressPercent >= need;

  return false;
}

function getAchievementHowToText(achievement, ctx) {
  const tRaw = achievement?.condition_type;
  const raw = achievement?.condition_value;
  if (
    (tRaw == null || String(tRaw).trim() === "") &&
    (raw == null || raw === "")
  ) {
    return "Особых условий нет — награда уже доступна.";
  }

  const need = raw === null || raw === undefined || raw === "" ? NaN : Number(raw);
  const t = String(tRaw || "").toLowerCase();

  if (Number.isNaN(need)) {
    const d = achievement?.description?.trim();
    return d || "Уточните условие в базе данных.";
  }

  if (t.includes("streak")) {
    return `Заходите в приложение несколько дней подряд: нужно ${need} дн., у вас сейчас ${ctx.streakDays}.`;
  }
  if (t.includes("task") || t.includes("lesson")) {
    return `Решите задания: нужно ${need}, выполнено ${ctx.completedTasks}.`;
  }
  if (t.includes("xp") || t.includes("score")) {
    return `Накопите опыт: нужно ${need} XP, у вас ${ctx.totalXp}.`;
  }
  if (t.includes("progress") || t.includes("percent") || t.includes("module")) {
    return `Прогресс модуля по текущему языку: нужно ${need}%, сейчас ${ctx.progressPercent}%.`;
  }

  return `Условие (${tRaw}): порог ${raw}.`;
}

function Home() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [streakDays, setStreakDays] = useState(1);
  const [studyLang, setStudyLang] = useState(() => getStoredStudyLanguage());
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [achievementsError, setAchievementsError] = useState("");
  const [totalXp, setTotalXp] = useState(0);

  const username = useMemo(
    () => localStorage.getItem("username") || "Ученик",
    []
  );

  const course = useMemo(() => buildCourse(studyLang), [studyLang]);

  const xpPercent = Math.round((course.currentXp / course.maxXp) * 100);
  const completedTasks = tasks.filter(
    (task) => task.completed || task.isCompleted || task.status === "completed"
  ).length;
  const totalTasks = tasks.length;

  const achievementCtx = { completedTasks, streakDays, progressPercent, totalXp };

  const isAdmin = localStorage.getItem("userIsAdmin") === "true";
  
  const loadTasks = useCallback(async () => {
    try {
      setAchievementsError("");
      const [tasksRes, progressRes, achievementsRes] = await Promise.allSettled([
        getTasks(studyLang.id),
        getProgressOverview({ languageId: studyLang.id }),
        getAchievements(),
      ]);

      if (tasksRes.status === "fulfilled") {
        setTasks(tasksRes.value.data);
      }

      if (achievementsRes.status === "fulfilled") {
        const rows = achievementsRes.value.data;
        setAchievements(Array.isArray(rows) ? rows : []);
      } else {
        setAchievements([]);
        setAchievementsError("Не удалось загрузить достижения");
      }

      if (progressRes.status === "fulfilled") {
        const data = progressRes.value.data || {};
        const langs = data.languages || [];
        const match = langs.find((l) => String(l.id) === String(studyLang.id));
        setProgressPercent(
          typeof match?.percent === "number" ? match.percent : data.modulePercent || 0
        );
        setTotalXp(data.userProgress?.totalXp ?? 0);
        return;
      }

      if (tasksRes.status === "fulfilled") {
        const completed = tasksRes.value.data.filter(
          (task) => task.completed || task.isCompleted || task.status === "completed"
        ).length;
        const total = Math.max(tasksRes.value.data.length, 1);
        setProgressPercent(Math.round((completed / total) * 100));
      } else {
        setProgressPercent(0);
      }
      setTotalXp(0);
    } catch (err) {
      console.error(err);
    }
  }, [studyLang.id]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- первичная загрузка главной (API + стрик) */
    const token = localStorage.getItem("token");
    if (!token) navigate("/");
    setStreakDays(getVisitStreakDays());
    void loadTasks();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [navigate, loadTasks]);

  function handleLanguagePicked(lang) {
    const full = setStoredStudyLanguage(lang);
    setStudyLang(full);
    setLangModalOpen(false);
  }

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/");
  };

  return (
    <div className={`home home--${theme}`}>
      <header className="home-header">
        <div className="home-brand">
          <span className="home-logo-mark" aria-hidden />
          <span className="home-logo-text">itlingo</span>
        </div>

        <nav className="home-nav" aria-label="Основное меню">
          <Link to="/home" className="home-nav-link active">
            Главная
          </Link>
          <Link to="/theory" className="home-nav-link">
            Теория
          </Link>
          <Link to="/practice" className="home-nav-link">
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

      <section className="home-greeting">
        <h1 className="home-greeting-title">
          {getGreeting()}, {username}!
        </h1>
        <p className="home-greeting-sub">Продолжим с того места, где остановились?</p>
      </section>

      <section className="home-progress-card" aria-label="Прогресс обучения">
        <div className="home-progress-top">
          <div className="home-lang">
            <img src={course.logo} alt="" className="home-lang-logo" />
            <div>
              <div className="home-lang-line">
                <strong>{course.language}</strong>
                <span className="home-dot">•</span>
                <span>{course.moduleTitle}</span>
              </div>
              <p className="home-lesson">{course.lessonTitle}</p>
            </div>
          </div>
          <div className="home-progress-meta">
            <span className="home-pct">{progressPercent}%</span>
            <span className="home-pct-label">модуль</span>
          </div>
        </div>

        <div className="home-xp-row">
          <div className="home-xp-bar-wrap">
            <div className="home-xp-labels">
              <span>Опыт</span>
              <span>
                {course.currentXp.toLocaleString("ru-RU")} / {course.maxXp.toLocaleString("ru-RU")} XP
              </span>
            </div>
            <div className="home-xp-bar">
              <div className="home-xp-fill" style={{ width: `${xpPercent}%` }} />
            </div>
          </div>
          <div className="home-xp-ring" aria-hidden>
            <span className="home-xp-ring-inner">{xpPercent}%</span>
          </div>
        </div>
      </section>

      <section className="home-dashboard-grid" aria-label="Достижения и статистика">
        <article className="home-info-card" aria-label="Достижения пользователя">
          <div className="home-info-head">
            <span className="home-info-badge">Награды</span>
          </div>
          <p className="home-info-text home-info-text--compact">
            Наведите на иконку или сфокусируйте клавишей Tab — подсказка, как получить награду.
          </p>
          {achievementsError ? (
            <p className="home-info-text home-info-text--warn" role="status">
              {achievementsError}
            </p>
          ) : null}
          <div className="home-achievements-strip" role="list">
            {achievements.length === 0 && !achievementsError ? (
              <p className="home-info-text">В таблице achievements пока нет записей.</p>
            ) : null}
            {achievements.map((a) => {
              const unlocked = isAchievementUnlocked(a, achievementCtx);
              const howTo = getAchievementHowToText(a, achievementCtx);
              const iconSrc =
                typeof a.icon === "string" && /^https?:\/\//i.test(a.icon.trim()) ? a.icon.trim() : "";
              const label = `${a.title}. ${unlocked ? "Получено" : "Не получено"}.`;
              return (
                <div
                  key={a.id}
                  className={`home-achievement-slot ${unlocked ? "home-achievement-slot--unlocked" : "home-achievement-slot--locked"}`}
                  role="listitem"
                  tabIndex={0}
                  aria-label={label}
                >
                  <div className="home-achievement-slot-face" aria-hidden="true">
                    {iconSrc ? (
                      <img src={iconSrc} alt="" className="home-achievement-slot-img" />
                    ) : (
                      <span className="home-achievement-slot-emoji">{a.icon?.trim() || "🏆"}</span>
                    )}
                  </div>
                  <div className="home-achievement-tip" role="tooltip">
                    <strong className="home-achievement-tip-title">{a.title}</strong>
                    {a.description ? (
                      <p className="home-achievement-tip-desc">{a.description}</p>
                    ) : null}
                    <p className="home-achievement-tip-how">
                      <span className="home-achievement-tip-label">Как получить</span>
                      {howTo}
                    </p>
                    <span className={`home-achievement-tip-status ${unlocked ? "is-on" : ""}`}>
                      {unlocked ? "Получено" : "В процессе"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="home-info-card" aria-label="Статистика обучения">
          <div className="home-info-head">
            <span className="home-info-badge">Статистика</span>
          </div>
          <div className="home-stats-grid">
            <div className="home-stat-tile">
              <span className="home-stat-value">{completedTasks}</span>
              <span className="home-stat-label">выполнено заданий</span>
            </div>
            <div className="home-stat-tile">
              <span className="home-stat-value">{streakDays}</span>
              <span className="home-stat-label">дней подряд</span>
            </div>
            <div className="home-stat-tile">
              <span className="home-stat-value">{totalTasks}</span>
              <span className="home-stat-label">доступно задач</span>
            </div>
            <div className="home-stat-tile">
              <span className="home-stat-value">{progressPercent}%</span>
              <span className="home-stat-label">прогресс модуля</span>
            </div>
          </div>
        </article>
      </section>

      <LanguageModal isOpen={langModalOpen} onSelect={handleLanguagePicked} />
    </div>
  );
}

export default Home;
