// main.js – אתחול

window.addEventListener("DOMContentLoaded", async () => {
  // Prevent context menu on long press
  document.addEventListener("contextmenu", (e) => e.preventDefault());
  try {
    setLayoutDirection();
    await loadQuestions();
  } catch (e) {
    alert("לא ניתן לטעון את השאלות: " + e.message);
    return;
  }

  if (checkWinCondition()) return;

  if (GameState.questions.length === 0) return;

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
    langBtn.addEventListener("click", switchLanguage);
  }

  updateResetButtonState();
});

