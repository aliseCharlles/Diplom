import { STUDY_LANGUAGES } from "../constants/studyLanguages.js";
import { useTheme } from "../context/ThemeContext.jsx";
import "../styles/language-modal.css";

function LanguageModal({ isOpen, onSelect }) {
  const { theme } = useTheme();

  if (!isOpen) return null;

  function handlePick(lang) {
    onSelect(lang);
  }

  return (
    <div
      className="lang-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lang-modal-title"
    >
      <div className={`lang-modal lang-modal--${theme}`}>
        <h2 id="lang-modal-title" className="lang-modal-title">
          Выберите язык для изучения
        </h2>
        <p className="lang-modal-hint">Нажми на логотип языка</p>
        <div className="lang-modal-grid">
          {STUDY_LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              type="button"
              className="lang-modal-item"
              onClick={() => handlePick(lang)}
              title={lang.name}
            >
              <img src={lang.logo} alt="" className="lang-modal-logo" />
              <span className="lang-modal-name">{lang.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LanguageModal;
