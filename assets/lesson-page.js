import { sampleCourse } from '../content/course-data.js';
import { createProgressStore } from './progress-store.js';
import { gradeQuiz } from './quiz-engine.js';

export function formatQuizFeedback(result) {
  if (result.passed) {
    return `Верно: ${result.score}%. Прогресс этого урока сохранён только в этом браузере.`;
  }
  return `Результат: ${result.score}%. Вернись к материалу и попробуй ещё раз.`;
}

export function bindLessonPage({ document, window, course = sampleCourse, progressStore } = {}) {
  const store = progressStore ?? createProgressStore(window.localStorage, course.meta.id);
  for (const form of document.querySelectorAll('form[data-quiz-lesson]')) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const lesson = course.lessons.find((item) => item.id === form.dataset.quizLesson);
      if (!lesson) return;
      const answers = new FormData(form).getAll('answer');
      const result = gradeQuiz(lesson.quiz, answers);
      const status = form.querySelector('[data-quiz-status]');
      if (result.passed) store.recordCompletion(lesson.id, result.score);
      if (status) status.textContent = formatQuizFeedback(result);
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
