// main.js – אתחול

window.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadQuestions();
  } catch (e) {
    alert("לא ניתן לטעון את questions.json: " + e.message);
    return;
  }

  if (GameState.questions.length === 0) return;

  setLayoutDirection();
  GameState.currentIndex = Math.floor(Math.random() * GameState.questions.length);
  GameState.current = GameState.questions[GameState.currentIndex];
  GameState.hintLevel = 0;

  renderQuestion(GameState.current);
  resetButtons();

  document.getElementById("hintBtn").addEventListener("click", showHint);
  document.getElementById("resetBtn").addEventListener("click", resetPlacement);
  document.getElementById("nextBtn").addEventListener("click", () => {
    nextQuestion();
  });

  const langBtn = document.getElementById("langBtn");
  if (langBtn) {
    langBtn.addEventListener("click", onLanguageButtonTap);
  }

  updateResetButtonState();
});
