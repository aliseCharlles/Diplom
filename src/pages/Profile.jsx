import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getVisitStreakDays } from "../utils/streak";
import { useTheme } from "../context/ThemeContext.jsx";
import LanguageModal from "../components/LanguageModal.jsx";
import { getStoredStudyLanguage, setStoredStudyLanguage } from "../utils/studyLanguageStorage.js";
import { STUDY_LANGUAGES } from "../constants/studyLanguages.js";
import { getProgressOverview } from "../services/api";
import "../styles/home.css";
import "../styles/profile.css";

const PROFILE_STORAGE_KEY = "itlingo_user_profile";

function getStoredProfile() {

  try {
    const raw = localStorage.getItem("itlingo_user_profile");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.username && parsed.username !== "undefined") {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Ошибка чтения профиля:", e);
  }

  const localName = localStorage.getItem("username");
  const localEmail = localStorage.getItem("userEmail");

  const validName = (localName && localName !== "undefined" && localName !== "null") 
    ? localName 
    : "Ученик";

  const validEmail = (localEmail && localEmail !== "undefined" && localEmail !== "null") 
    ? localEmail 
    : "Почта не указана";

  return {
    username: validName,
    email: validEmail
  };
}
function saveProfile(profile) {
  // Сохраняем и как объект, и как отдельные строки для совместимости
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  localStorage.setItem("username", profile.username);
  localStorage.setItem("userEmail", profile.email);
}

function getRankByXp(xp) {
  if (xp <= 1000) return "Новичок";
  if (xp <= 3000) return "Ученик";
  if (xp <= 6000) return "Практик";
  if (xp <= 10000) return "Продвинутый";
  if (xp <= 15000) return "Эксперт";
  return "Мастер";
}

function Profile() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [streak, setStreak] = useState(0);
  const [studyLang, setStudyLang] = useState(() => getStoredStudyLanguage());
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  
  const [serverLanguages, setServerLanguages] = useState([]);
  const [userProgress, setUserProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = localStorage.getItem("userIsAdmin") === "true";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    const profile = getStoredProfile();
    setUsername(profile.username);
    setEmail(profile.email);
    setEditName(profile.username);
    setEditEmail(profile.email);
    setStreak(getVisitStreakDays());
    
    fetchProgress();
  }, [navigate]);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const res = await getProgressOverview();
      setServerLanguages(res.data.languages || []);
      setUserProgress(res.data.userProgress ?? null);
    } catch (err) {
      console.error("Ошибка при получении прогресса:", err);
    } finally {
      setLoading(false);
    }
  };

  function handleLanguagePicked(lang) {
    const full = setStoredStudyLanguage(lang);
    setStudyLang(full);
    setLangModalOpen(false);
  }

  const logout = () => {
    localStorage.clear(); // Очищаем всё при выходе
    navigate("/");
  };

  const totalXp = userProgress?.totalXp ?? 0;
  const currentRank = getRankByXp(totalXp);

  const rankScale = [
    { name: "Новичок", range: "0 - 1000 XP" },
    { name: "Ученик", range: "1001 - 3000 XP" },
    { name: "Практик", range: "3001 - 6000 XP" },
    { name: "Продвинутый", range: "6001 - 10000 XP" },
    { name: "Эксперт", range: "10001 - 15000 XP" },
    { name: "Мастер", range: "15001+ XP" },
  ];

  const saveProfileChanges = () => {
    const nextName = editName.trim() || "Ученик";
    const nextEmail = editEmail.trim() || "email@not.found";
    const profile = { username: nextName, email: nextEmail };
    
    saveProfile(profile);
    setUsername(nextName);
    setEmail(nextEmail);
    setEditOpen(false);
  };

  return (
    <div className={`home home--${theme} profile-page profile-page--${theme}`}>
      <header className="home-header">
        <div className="home-brand">
          <span className="home-logo-mark" aria-hidden />
          <span className="home-logo-text">itlingo</span>
        </div>

        <nav className="home-nav">
          <Link to="/home" className="home-nav-link">Главная</Link>
          <Link to="/theory" className="home-nav-link">Теория</Link>
          <Link to="/practice" className="home-nav-link">Практика</Link>
          {isAdmin && <Link to="/admin" className="home-nav-link">Админ</Link>}
        </nav>

        <button type="button" className="home-lang-picker" onClick={() => setLangModalOpen(true)}>
          <img src={studyLang.logo} alt="" className="home-lang-picker-icon" />
          <span className="home-lang-picker-text">{studyLang.name}</span>
        </button>

        <div className="home-header-right">
          <button type="button" className="home-theme-toggle" onClick={toggleTheme}>
            <span className="home-theme-toggle-icon">{theme === "light" ? "🌙" : "☀️"}</span>
          </button>
          <div className="home-streak">
            <span className="home-streak-icon">🔥</span>
            <span className="home-streak-num">{streak}</span>
            <span className="home-streak-label">дн.</span>
          </div>
          <button type="button" className="home-btn-logout" onClick={logout}>Выход</button>
        </div>
      </header>

      <main className="profile-content">
        <section className="profile-user-card">
          <div className="profile-avatar">👤</div>
          <h2 className="profile-user-name">{username}</h2>
          <p className="profile-user-email">{email}</p>
          <p className="profile-rank-chip">Звание: <strong>{currentRank}</strong></p>
          <button type="button" className="profile-edit-btn" onClick={() => setEditOpen(true)}>
            Редактировать
          </button>
        </section>

        <section className="profile-progress-section">
          <h3 className="profile-section-title">Ваш прогресс</h3>
          <div className="profile-language-list">
            {loading ? (
              <p>Загрузка...</p>
            ) : serverLanguages.length > 0 ? (
              serverLanguages.map((lang) => {
                // Ищем логотип в STUDY_LANGUAGES по ID
                const langConfig = STUDY_LANGUAGES.find(l => String(l.id) === String(lang.id));
                return (
                  <article key={lang.id} className="profile-language-item">
                    <div className="profile-language-head">
                      <div className="profile-language-meta">
                        {langConfig?.logo && <img src={langConfig.logo} alt="" style={{width: '20px', marginRight: '8px'}} />}
                        <span>{lang.name}</span>
                      </div>
                      <span className="profile-language-xp">
                        {lang.percent}% ({lang.completedTasks}/{lang.totalTasks})
                      </span>
                    </div>
                    <div className="profile-language-bar">
                      <div className="profile-language-fill" style={{ width: `${lang.percent}%` }} />
                    </div>
                  </article>
                );
              })
            ) : (
              <p>Здесь появится ваш прогресс после прохождения уроков.</p>
            )}
          </div>
        </section>

        <section className="profile-ranks-section">
          <h3 className="profile-section-title">Система званий</h3>
          <div className="profile-ranks-grid">
            {rankScale.map((rank) => (
              <div key={rank.name} className={`profile-rank-item ${rank.name === currentRank ? "active" : ""}`}>
                <span className="profile-rank-name">{rank.name}</span>
                <span className="profile-rank-range">{rank.range}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      {editOpen && (
        <div className="profile-modal-overlay" onClick={() => setEditOpen(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Настройки профиля</h4>
            <label className="profile-modal-label">
              Имя
              <input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </label>
            <label className="profile-modal-label">
              Email
              <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </label>
            <div className="profile-modal-actions">
              <button className="profile-modal-cancel" onClick={() => setEditOpen(false)}>Отмена</button>
              <button className="profile-modal-save" onClick={saveProfileChanges}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      <LanguageModal isOpen={langModalOpen} onSelect={handleLanguagePicked} />
    </div>
  );
}

export default Profile;