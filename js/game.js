// game.js – לוגיקת משחק בסיסית

const GameState = {
  questions: [],
  currentIndex: 0,
  current: null,
  hintLevel: 0
};

async function loadQuestions() {
  const res = await fetch("data/questions.json");
  if (!res.ok) {
    throw new Error("Failed to load questions.json");
  }
  const data = await res.json();
  GameState.questions = data;
}

function nextQuestion() {
  if (GameState.questions.length === 0) return;

  GameState.currentIndex =
    (GameState.currentIndex + 1) % GameState.questions.length;

  GameState.current = GameState.questions[GameState.currentIndex];
  GameState.hintLevel = 0;

  renderQuestion(GameState.current);
}

function checkAnswer() {
  const user = getUserAnswer();
  const target = GameState.current.answer.replace(/\s+/g, "");

  const msgEl = document.getElementById("message");

  if (!user || user.length !== target.length) {
    msgEl.textContent = "לא כל האותיות הונחו במקומן.";
    return;
  }

  if (user === target) {
    msgEl.textContent = "מעולה! תשובה נכונה.";
  } else {
    msgEl.textContent = "לא מדויק, נסה שוב.";
  }
}

function showHint() {
  GameState.hintLevel++;

  const factBox = document.getElementById("fact");

  if (GameState.hintLevel === 1) {
    // כבר הצגנו את התיבות (hint 1) בתחילת השאלה
    factBox.textContent = GameState.current.fact;
  } else if (GameState.hintLevel === 2) {
    revealRandomLetter();
  } else if (GameState.hintLevel === 3) {
    revealAllLetters();
    document.getElementById("hintBtn").disabled = true;
  }
}
