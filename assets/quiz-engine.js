export function gradeQuiz(quiz, selectedAnswerIds) {
  const selected = new Set(selectedAnswerIds);
  const answers = quiz.answers;
  const correctIds = answers.filter((answer) => answer.correct).map((answer) => answer.id);
  const matchingChoices = answers.filter((answer) => selected.has(answer.id) === Boolean(answer.correct)).length;
  const score = answers.length === 0 ? 0 : Math.round((matchingChoices / answers.length) * 100);
  const passed = correctIds.length === selected.size && correctIds.every((id) => selected.has(id));
  return { score, correctIds, passed };
}
