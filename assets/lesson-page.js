import { sampleCourse } from '../content/course-data.js';
import { createProgressStore } from './progress-store.js';
import { gradeQuiz } from './quiz-engine.js';
import { createProgressRuntime } from './progress-runtime.js';

export function formatQuizFeedback(result, saveState = 'local') {
  if (result.passed) {
    if (saveState === 'saved') return `Верно: ${result.score}%. Прогресс этого урока сохранён на устройстве и в облаке.`;
    if (saveState === 'saving') return `Верно: ${result.score}%. Прогресс этого урока сохранён на устройстве; облако синхронизируется.`;
    if (saveState === 'retry') return `Верно: ${result.score}%. Прогресс этого урока сохранён на устройстве; облако недоступно, повторите сохранение позже.`;
    return `Верно: ${result.score}%. Прогресс этого урока сохранён на устройстве.`;
  }
  return `Результат: ${result.score}%. Вернись к материалу и попробуй ещё раз.`;
}

export function bindLessonPage({ document, window, course = sampleCourse, progressStore, progressController, progressRuntime } = {}) {
  const store = progressStore ?? createProgressStore(window.localStorage, course.meta.id);
  const runtime = progressRuntime ?? (progressController ? null : createProgressRuntime({ window, courseId: course.meta.id, progressStore: store }));
  const recordCompletion = progressController
    ? (lessonId, score) => progressController.recordCompletion(lessonId, score)
    : (lessonId, score) => runtime.recordCompletion(lessonId, score);
  const getSaveState = () => progressController?.getState?.().status ?? runtime?.getSnapshot().state.status ?? 'local';
  for (const form of document.querySelectorAll('form[data-quiz-lesson]')) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const lesson = course.lessons.find((item) => item.id === form.dataset.quizLesson);
      if (!lesson) return;
      const answers = new FormData(form).getAll('answer');
      const result = gradeQuiz(lesson.quiz, answers);
      const status = form.querySelector('[data-quiz-status]');
      if (result.passed) {
        try {
          await recordCompletion(lesson.id, result.score);
        } catch {
          // The local record is intentionally kept if cloud backup is unavailable.
        }
      }
      if (status) status.textContent = formatQuizFeedback(result, getSaveState());
    });
  }
  return store;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  bindLessonPage({ document, window });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('../../service-worker.js').catch(() => undefined);
  }
}
