import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { loginUser, registerUser } from "../services/api";
import LanguageModal from "../components/LanguageModal.jsx";
import { setStoredStudyLanguage } from "../utils/studyLanguageStorage.js";

function Login() {
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [showLangModal, setShowLangModal] = useState(false);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: ""
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async () => {
    const username = form.username.trim();
    const email = form.email.trim();
    const password = form.password.trim();
  
    if (!email || !password || (!isLogin && !username)) {
      alert("Заполните все поля");
      return;
    }
  
    try {
      // Выполняем запрос в зависимости от режима (вход или регистрация)
      const res = await (isLogin 
        ? loginUser({ email, password }) 
        : registerUser({ username, email, password })
      );
      
      console.log("Ответ от сервера:", res.data); // ДОБАВЬТЕ ЭТО
      
      // 1. Сохраняем токен
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        console.log("Токен сохранен:", res.data.token); // ДОБАВЬТЕ ЭТО
      } else {
        console.error("Токен не получен от сервера!");
      }
      
      // 2. Определяем, где лежат данные пользователя 
      const userData = res.data.user || res.data;
      
      // 3. Извлекаем значения, подстраховываясь от undefined
      const finalName = userData.username || (isLogin ? "" : username) || "Ученик";
      const finalEmail = userData.email || email || "email@not.found";
      const isAdmin = Boolean(userData.is_admin);
  
      // 4. Сохраняем по отдельным ключам (для простых проверок)
      localStorage.setItem("username", finalName);
      localStorage.setItem("userEmail", finalEmail);
      localStorage.setItem("userIsAdmin", String(isAdmin));
      
      // 5. Сохраняем в общий объект профиля
      const profileData = {
        username: finalName,
        email: finalEmail,
        is_admin: isAdmin,
      };
      localStorage.setItem("itlingo_user_profile", JSON.stringify(profileData));
      
      console.log("Данные сохранены в localStorage:", {
        token: localStorage.getItem("token"),
        username: localStorage.getItem("username"),
        userEmail: localStorage.getItem("userEmail")
      }); // ДОБАВЬТЕ ЭТО
      
      if (isLogin) {
        navigate("/home");
      } else {
        // Если это регистрация, сначала выбираем язык
        setShowLangModal(true);
      }
    } catch (err) {
      console.error("Ошибка аутентификации:", err);
      alert(err.response?.data?.message || "Ошибка входа. Проверьте данные.");
    }
  };

  function handleLanguageSelected(lang) {
    setStoredStudyLanguage(lang);
    setShowLangModal(false);
    // После выбора языка при регистрации отправляем на главную
    navigate("/home");
  }

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-logo">itlingo</div>
        <h1 className="auth-title">Обучение программированию быстрее с ИИ</h1>
        <ul className="auth-list">
          <li><span>✦</span> Интерактивные задания</li>
          <li><span>✦</span> Анализ ошибок через ИИ</li>
          <li><span>✦</span> Прокачка навыков 24/7</li>
        </ul>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <h2>{isLogin ? "Войти" : "Создать аккаунт"}</h2>
          <p className="auth-subtitle">
            {isLogin ? "С возвращением! Введите данные" : "Начните путь в IT прямо сейчас"}
          </p>

          <div className="auth-form-group">
            {!isLogin && (
              <input
                className="auth-input"
                placeholder="Ваше имя"
                name="username"
                value={form.username}
                onChange={handleChange}
                autoComplete="off"
              />
            )}

            <input
              className="auth-input"
              placeholder="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
            />

            <input
              className="auth-input"
              placeholder="Пароль"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
            />

            <button className="auth-btn" onClick={handleSubmit}>
              {isLogin ? "Войти" : "Зарегистрироваться"}
            </button>
          </div>

          <div className="auth-footer">
            {isLogin ? (
              <>
                Нет аккаунта?{" "}
                <span onClick={() => setIsLogin(false)}>Зарегистрироваться</span>
              </>
            ) : (
              <>
                Уже есть аккаунт?{" "}
                <span onClick={() => setIsLogin(true)}>Войти</span>
              </>
            )}
          </div>
        </div>
      </div>

      <LanguageModal isOpen={showLangModal} onSelect={handleLanguageSelected} />
    </div>
  );
}

export default Login;