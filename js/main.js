// main.js – אתחול

window.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadQuestions();
  } catch (e) {
    alert("לא ניתן לטעון את questions.json: " + e.message);
    return;
  }

  GameState.currentIndex = 0;
  GameState.current = GameState.questions[0];
  GameState.hintLevel = 0;

  renderQuestion(GameState.current);
  resetButtons();

  document.getElementById("hintBtn").addEventListener("click", showHint);
  document.getElementById("resetBtn").addEventListener("click", resetPlacement);
  document.getElementById("nextBtn").addEventListener("click", () => {
    nextQuestion();
  });

  updateResetButtonState();
});
