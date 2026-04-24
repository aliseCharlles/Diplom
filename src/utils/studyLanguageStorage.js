import { getLanguageById } from "../constants/studyLanguages.js";

const KEY = "itlingo_study_language";

/** @returns {{ id: string, name: string, logo: string, monaco: string }} */
export function getStoredStudyLanguage() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return getLanguageById("javascript");
    const parsed = JSON.parse(raw);
    if (parsed?.id) return getLanguageById(parsed.id);
  } catch {
    /* ignore */
  }
  return getLanguageById("javascript");
}

/** @param {{ id: string }} lang */
export function setStoredStudyLanguage(lang) {
  const full = getLanguageById(lang.id);
  localStorage.setItem(
    KEY,
    JSON.stringify({ id: full.id, name: full.name, logo: full.logo, monaco: full.monaco })
  );
  return full;
}
