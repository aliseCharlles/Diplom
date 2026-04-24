/** Структура программы обучения по языку */
export const LESSONS_PER_MODULE = 5;
export const TASKS_PER_LESSON = 10;

/**
 * Прогресс текущего модуля: сколько «уроковых единиц» пройдено из 5
 * (завершённые уроки + доля текущего урока по заданиям).
 */
export function computeModuleProgressPercent(lessonsCompletedInModule, tasksCompletedInCurrentLesson) {
  const raw =
    (lessonsCompletedInModule + tasksCompletedInCurrentLesson / TASKS_PER_LESSON) / LESSONS_PER_MODULE;
  return Math.min(100, Math.round(raw * 100));
}

/** Прогресс текущего урока по числу выполненных заданий из 10 */
export function computeLessonProgressPercent(tasksCompletedInCurrentLesson) {
  return Math.min(100, Math.round((tasksCompletedInCurrentLesson / TASKS_PER_LESSON) * 100));
}
