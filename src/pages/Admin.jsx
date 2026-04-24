import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom"; // Объединил импорты
import { useTheme } from "../context/ThemeContext.jsx"; // ДОБАВИЛ ЭТО
import "../styles/home.css";
import {
  getAdminUsers,
  setUserAdminRole,
  getAiSettings,
  updateAiModel,
} from "../services/api";

function Admin() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme(); // ДОБАВИЛ ЭТО (теперь theme определена)
  
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [aiModel, setAiModel] = useState("");
  const [inputModel, setInputModel] = useState("");
  const [savingModel, setSavingModel] = useState(false);

  const isAdmin = localStorage.getItem("userIsAdmin") === "true";

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/");
      return;
    }
    if (!isAdmin) {
      navigate("/home");
      return;
    }
    async function loadAdminData() {
      setLoadingUsers(true);
      try {
        const [usersRes, aiRes] = await Promise.all([getAdminUsers(), getAiSettings()]);
        setUsers(usersRes.data || []);
        setAiModel(aiRes.data?.model || "");
        setInputModel(aiRes.data?.model || "");
      } catch (error) {
        console.error(error);
        // Не всегда стоит делать alert, если данные просто не дошли, но оставим для отладки
      } finally {
        setLoadingUsers(false);
      }
    }
    loadAdminData();
  }, [isAdmin, navigate]);

  async function handleToggleAdmin(userId, nextValue) {
    try {
      const res = await setUserAdminRole(userId, nextValue);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_admin: res.data.is_admin } : u))
      );
    } catch (error) {
      alert(error.response?.data?.message || "Не удалось изменить роль");
    }
  }

  async function handleSaveModel() {
    const trimmed = inputModel.trim();
    if (!trimmed) {
      alert("Введите название модели");
      return;
    }
    setSavingModel(true);
    try {
      const res = await updateAiModel(trimmed);
      setAiModel(res.data.model);
      setInputModel(res.data.model);
      alert("Модель ИИ обновлена");
    } catch (error) {
      alert(error.response?.data?.message || "Не удалось обновить модель");
    } finally {
      setSavingModel(false);
    }
  }

  return (
    <div className={`home home--${theme}`}>
      <header className="home-header">
        <div className="home-brand">
          <span className="home-logo-mark" aria-hidden />
          <span className="home-logo-text">itlingo <small>(Admin)</small></span>
        </div>
        
        <nav className="home-nav">
          <Link to="/home" className="home-nav-link">Главная</Link>
          <Link to="/theory" className="home-nav-link">Теория</Link>
          <Link to="/practice" className="home-nav-link">Практика</Link>
          <Link to="/admin" className="home-nav-link active">Админ</Link>
        </nav>

        <div className="home-header-right">
          <button
            type="button"
            className="home-theme-toggle"
            onClick={toggleTheme}
            title={theme === "light" ? "Тёмная тема" : "Светлая тема"}
          >
            <span className="home-theme-toggle-icon">
              {theme === "light" ? "🌙" : "☀️"}
            </span>
          </button>
          
          <Link to="/profile" className="home-avatar-link">👤</Link>
          
          <button className="home-btn-logout" onClick={() => {
              localStorage.clear();
              navigate("/");
          }}>Выход</button>
        </div>
      </header>

      <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto", minHeight: "100vh" }}>
        <h1 className="home-greeting-title">Админ-панель</h1>
        <p className="home-greeting-sub">Управление пользователями и моделью ИИ</p>

        {/* Настройки ИИ */}
        <section className="home-info-card" style={{ marginTop: 24, padding: 20 }}>
          <div className="home-info-head">
            <span className="home-info-badge">AI Settings</span>
            <h3>Модель нейросети</h3>
          </div>
          <p className="home-info-text">Текущая модель: <b>{aiModel || "не задана"}</b></p>
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <input
              style={{ 
                flex: 1, 
                padding: "10px 15px", 
                borderRadius: "8px", 
                border: "1px solid rgba(0,0,0,0.1)",
                background: "var(--card-bg, #fff)",
                color: "inherit"
              }}
              value={inputModel}
              onChange={(e) => setInputModel(e.target.value)}
              placeholder="Например: gpt-4o"
            />
            <button 
              className="home-ai-btn"
              onClick={handleSaveModel} 
              disabled={savingModel}
            >
              {savingModel ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </section>

        {/* Список пользователей */}
        <section className="home-info-card" style={{ marginTop: 24, padding: 20 }}>
          <div className="home-info-head">
            <span className="home-info-badge">Users</span>
            <h3>Пользователи</h3>
          </div>
          
          {loadingUsers ? (
            <p className="home-info-text">Загрузка...</p>
          ) : (
            <div style={{ overflowX: "auto", marginTop: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.1)", textAlign: "left" }}>
                    <th style={{ padding: 12 }}>Имя</th>
                    <th style={{ padding: 12 }}>Email</th>
                    <th style={{ padding: 12 }}>Роль</th>
                    <th style={{ padding: 12 }}>Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                      <td style={{ padding: 12 }}>{user.username}</td>
                      <td style={{ padding: 12 }}>{user.email}</td>
                      <td style={{ padding: 12 }}>{user.is_admin ? "Админ" : "Юзер"}</td>
                      <td style={{ padding: 12 }}>
                        <button 
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            border: "1px solid #6366f1",
                            background: "transparent",
                            color: "#6366f1"
                          }}
                          onClick={() => handleToggleAdmin(user.id, !user.is_admin)}
                        >
                          {user.is_admin ? "Снять админ" : "Дать админ"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Admin;