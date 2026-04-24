import {
  LESSONS_PER_MODULE,
  TASKS_PER_LESSON,
  computeLessonProgressPercent,
  computeModuleProgressPercent,
} from "../constants/curriculum.js";

const STORAGE_KEY = "itlingo_study_progress";

/**
 * Снимок прогресса (потом заменить данными с API).
 * В одном модуле 5 уроков, в уроке 10 заданий.
 */
function defaultProgress() {
  return {
    totalModules: 6,
    /** Текущий модуль (1..totalModules) */
    currentModule: 2,
    moduleTheme: "Основы",
    /** Текущий урок внутри модуля (1..LESSONS_PER_MODULE) */
    currentLessonInModule: 3,
    lessonTheme: "Функции",
    /** Завершённые уроки в модуле до текущего (0..4) */
    lessonsCompletedInModuleBeforeCurrent: 1,
    /** Выполнено заданий в текущем уроке (0..10), дробь допустима */
    tasksCompletedInCurrentLesson: 4.1,
    currentXp: 1650,
    maxXp: 4000,
    /**
     * Опционально: явные проценты для полос (пока нет API).
     * Если не заданы — считаются из полей выше.
     */
    moduleProgressPercent: 38,
    lessonProgressPercent: 41,
  };
}

export function getStudyProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { ...defaultProgress(), ...p };
    }
  } catch {
    /* ignore */
  }
  return defaultProgress();
}

export function saveStudyProgress(partial) {
  const next = { ...getStudyProgress(), ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

/** Для UI: проценты и подписи */
export function getProgressView(progress) {
  const p = progress || getStudyProgress();
  const computedModule = computeModuleProgressPercent(
    p.lessonsCompletedInModuleBeforeCurrent,
    p.tasksCompletedInCurrentLesson
  );
  const computedLesson = computeLessonProgressPercent(p.tasksCompletedInCurrentLesson);

  const taskNum = Math.min(
    TASKS_PER_LESSON,
    Math.max(1, Math.floor(p.tasksCompletedInCurrentLesson) + 1)
  );

  return {
    ...p,
    moduleProgressPercent:
      typeof p.moduleProgressPercent === "number" ? p.moduleProgressPercent : computedModule,
    lessonProgressPercent:
      typeof p.lessonProgressPercent === "number" ? p.lessonProgressPercent : computedLesson,
    lessonsPerModule: LESSONS_PER_MODULE,
    tasksPerLesson: TASKS_PER_LESSON,
    currentTaskLabel: taskNum,
  };
}
