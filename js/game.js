// game.js – לוגיקת משחק בסיסית

function normalizeHebrewText(text) {
  return Array.from(text).map(toBaseHebrew).join("");
}

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
  resetButtons();
}

function resetButtons() {
  const hintBtn = document.getElementById("hintBtn");
  const resetBtn = document.getElementById("resetBtn");
  const nextBtn = document.getElementById("nextBtn");

  hintBtn.disabled = false;
  hintBtn.textContent = "רמז";
  hintBtn.style.visibility = "visible";
  resetBtn.disabled = true;
  nextBtn.textContent = "דלג";
}

function checkAnswer() {
  const user = getUserAnswer();
  const target = normalizeHebrewText(GameState.current.answer.replace(/\s+/g, ""));

  const factBox = document.getElementById("fact");
  const hintBtn = document.getElementById("hintBtn");

  if (!user || user.length !== target.length) {
    factBox.textContent = "לא כל האותיות הונחו במקומן.";
    return;
  }

  if (user === target) {
    factBox.textContent = "מעולה! תשובה נכונה.";
    hintBtn.disabled = true;
    document.getElementById("resetBtn").disabled = true;
    document.getElementById("nextBtn").textContent = "הבא";
    document.querySelectorAll(".letter").forEach(tile => {
      tile.style.cursor = "default";
      tile.classList.add("disabled");
      tile.removeEventListener("click", onLetterClick);
    });
  } else {
    factBox.textContent = "לא מדויק, המשיכו לנסות.";
  }
}

function showHint() {
  GameState.hintLevel++;

  const factBox = document.getElementById("fact");
  const hintBtn = document.getElementById("hintBtn");

  if (GameState.hintLevel === 1) {
    factBox.textContent = `רמז: ${GameState.current.fact}`;
  } else if (GameState.hintLevel === 2) {
    clearBoardForHint();
    revealRandomLetter();
    hintBtn.textContent = "גלה";
  } else if (GameState.hintLevel === 3) {
    revealAllLetters();
    const resetBtn = document.getElementById("resetBtn");
    const nextBtn = document.getElementById("nextBtn");
    resetBtn.disabled = true;
    resetBtn.style.visibility = "hidden";
    nextBtn.textContent = "הבא";
    hintBtn.disabled = true;
  }
}
