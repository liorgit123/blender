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

  const solved = GameState.solved[GameState.language] || [];
  const unsolvedQuestions = GameState.questions.filter(q => !solved.includes(q.id));

  if (unsolvedQuestions.length === 0) {
    // Should be caught by checkWinCondition, but good to be safe
    return;
  }
  GameState.currentIndex = Math.floor(Math.random() * unsolvedQuestions.length);
  GameState.current = unsolvedQuestions[GameState.currentIndex];
  GameState.currentIndex = GameState.questions.findIndex(q => q.id === GameState.current.id);
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

  const logo = document.querySelector(".logo");
  if (logo) {
    let timer;
    logo.addEventListener("mousedown", () => {
      timer = setTimeout(resetProgress, 3000);
    });
    logo.addEventListener("mouseup", () => clearTimeout(timer));
    logo.addEventListener("mouseleave", () => clearTimeout(timer));
    logo.addEventListener("touchstart", () => {
      timer = setTimeout(resetProgress, 3000);
    });
    logo.addEventListener("touchend", () => clearTimeout(timer));
  }

  updateResetButtonState();
});

