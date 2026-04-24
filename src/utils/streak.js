/**
 * Стрик дней посещений: сбрасывается, если с последнего визита прошло больше 48 часов.
 * В пределах 48 ч при первом заходе в новый календарный день счётчик +1.
 */
const STORAGE_LAST = "itlingo_last_visit_ts";
const STORAGE_STREAK = "itlingo_visit_streak";
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

export function getVisitStreakDays() {
  const now = Date.now();
  const last = parseInt(localStorage.getItem(STORAGE_LAST) || "0", 10);
  let streak = parseInt(localStorage.getItem(STORAGE_STREAK) || "0", 10);

  if (!last || now - last > TWO_DAYS_MS) {
    streak = 1;
    localStorage.setItem(STORAGE_STREAK, String(streak));
    localStorage.setItem(STORAGE_LAST, String(now));
    return streak;
  }

  const lastDay = new Date(last).toDateString();
  const today = new Date().toDateString();

  if (lastDay === today) {
    return streak;
  }

  streak += 1;
  localStorage.setItem(STORAGE_STREAK, String(streak));
  localStorage.setItem(STORAGE_LAST, String(now));
  return streak;
}
